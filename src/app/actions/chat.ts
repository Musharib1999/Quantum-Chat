"use server";

import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';
import * as cheerio from 'cheerio';
import dbConnect from '@/lib/db';
import QaPair from '@/models/QaPair';
import Guardrail from '@/models/Guardrail';
import ChatLog from '@/models/ChatLog';
import Experiment from '@/models/Experiment';
import News from '@/models/News';
import User from '@/models/User';
import SystemPrompt from '@/models/SystemPrompt';
import LLMSetting from '@/models/LLMSetting';
import { execSync } from 'child_process';
import path from 'path';
import crypto from 'crypto';
import { getStockPrice, getLatestNews } from './market';
import QuantumForm from '@/models/QuantumForm';

const API_KEY = process.env.GROQ_API_KEY;
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-lite";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

const QISKIT_SERVICE_URL = process.env.QISKIT_SERVICE_URL || "http://127.0.0.1:8001";
const DWAVE_SERVICE_URL = process.env.DWAVE_SERVICE_URL || "http://127.0.0.1:8002";

// --- Quantum Execution Helper ---
async function executeQuantumCircuit(circuitCode: string) {
    try {
        console.log(`[Quantum Sim] Sending request to: ${QISKIT_SERVICE_URL}/execute`);

        const response = await axios.post(`${QISKIT_SERVICE_URL}/execute`, {
            code: circuitCode
        }, {
            timeout: 20000
        });

        return response.data; // Expecting { output: "...", error: str | null }
    } catch (e: any) {
        console.error("Simulator Execution Fail:", e.message);
        if (e.code === 'ECONNREFUSED') {
            return { error: "Qiskit Simulator is offline. Please ensure the Python service is running on Port 8001." };
        }
        return { error: `Quantum Service Error: ${e.message}` };
    }
}

async function executeDWaveAnnealer(code: string) {
    try {
        console.log(`[DWave Sim] Sending request to: ${DWAVE_SERVICE_URL}/execute`);

        const response = await axios.post(`${DWAVE_SERVICE_URL}/execute`, {
            code: code
        }, {
            timeout: 60000  // 60s — annealing can be slow for large BQMs
        });

        return response.data; // Expecting { output: "...", error: str | null }
    } catch (e: any) {
        console.error("D-Wave Execution Fail:", e.message);
        if (e.code === 'ECONNREFUSED') {
            return { error: "D-Wave Simulator is offline. Please ensure the Python service is running on Port 8002." };
        }
        return { error: `Quantum Service Error: ${e.message}` };
    }
}

// --- Robustness Helpers ---

/**
 * Layer 1 & 2 Validation: Security & Quantum Constraints
 */
async function validateQuantumCode(code: string, hardware: string): Promise<{ valid: boolean; error?: string }> {
    // 1. Static Security Check (Layer 1)
    const bannedPatterns = [
        /import\s+os/i, /from\s+os/i,
        /import\s+subprocess/i, /from\s+subprocess/i,
        /import\s+sys/i, /from\s+sys/i,
        /import\s+requests/i, /import\s+socket/i,
        /eval\(/i, /exec\(/i, /getattr\(/i
    ];

    for (const pattern of bannedPatterns) {
        if (pattern.test(code)) {
            return { valid: false, error: "Security Violation: Unauthorized module import detected." };
        }
    }

    // 2. Hardware Constraint Check (Layer 2)
    if (hardware.toLowerCase().includes('qiskit')) {
        const qubitMatch = code.match(/QuantumCircuit\((\d+)\)/);
        if (qubitMatch && parseInt(qubitMatch[1]) > 32) {
            return { valid: false, error: `Hardware Violation: Requested ${qubitMatch[1]} qubits exceeds simulator limit of 32.` };
        }
        // Simple depth proxy: count gate applications
        const gateCount = (code.match(/circuit\.[a-z0-9]+\(/gi) || []).length;
        if (gateCount > 100) {
            return { valid: false, error: `Complexity Violation: Circuit contains ${gateCount} operations, exceeding local limit of 100.` };
        }
    }

    if (hardware.toLowerCase().includes('d-wave') || hardware.toLowerCase().includes('annealer')) {
        // Look for common variable patterns: linear={...} or BinaryQuadraticModel(...)
        const varMatch = code.match(/linear\s*=\s*\{([^}]+)\}/);
        if (varMatch) {
            const keys = varMatch[1].split(',').length;
            if (keys > 30) {
                return { valid: false, error: `Hardware Violation: Requested ${keys} variables exceeds local annealing limit of 30.` };
            }
        }
    }

    // 3. Syntax Pre-check via Service (Layer 3)
    try {
        const endpoint = hardware.toLowerCase().includes('d-wave') ? `${DWAVE_SERVICE_URL}/validate` : `${QISKIT_SERVICE_URL}/validate`;
        const verify = await axios.post(endpoint, { code });
        if (!verify.data.valid) {
            return { valid: false, error: `Syntax Error: ${verify.data.error}` };
        }
    } catch (e) {
        console.warn("Validation service unreachable, skipping Step 3.");
    }

    return { valid: true };
}

/**
 * Result Caching (SHA-256)
 */
function getWorkflowCacheKey(problem: string, service: string, hardware: string, params: any) {
    const data = JSON.stringify({ problem, service, hardware, params });
    return crypto.createHash('sha256').update(data).digest('hex');
}

// --- Types ---
export interface AIResponse {
    text: string;
    sourceUrl?: string;
    form?: {
        id: string;
        title: string;
        fields: Array<{
            label: string;
            type: 'text' | 'number' | 'email' | 'select';
            options?: string[];
        }>;
    };
    source?: string;
    error?: string;
    guardrailsStatus?: string;
    activeGuardrails?: string[];
    tokensUsed?: number;
    sessionTokenLimit?: number;
    tokenLimitExceeded?: boolean;
}

// --- Connection Check ---
export async function checkGeminiConnection() {
    return !!GEMINI_API_KEY;
}

// --- Guardrails ---
const getActiveGuardrails = async () => {
    await dbConnect();
    const rules = await Guardrail.find({ active: true }).lean();
    return rules as any[];
};

const checkGuardrails = (prompt: string, rules: any[]): string | null => {
    for (const r of rules) {
        if (r.type === 'banned_topic' && prompt.toLowerCase().includes(r.rule.toLowerCase())) {
            return "I cannot answer this question due to safety guidelines regarding: " + r.rule;
        }
    }
    return null;
};

// --- Web Scraping Helper ---
async function scrapeUrl(url: string) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        $('script, style, nav, footer, iframe, ads').remove();
        const pageText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 10000); // Increased limit
        return pageText;
    } catch (e) {
        console.error("Failed to fetch URL:", url);
        return null;
    }
}

// --- Knowledge Base ---
const queryKnowledgeBase = async (prompt: string) => {
    await dbConnect();
    const kbs = await QaPair.find({}).lean();

    const match = (kbs as any[]).find(kb =>
        prompt.toLowerCase().includes(kb.question.toLowerCase()) ||
        kb.question.toLowerCase().includes(prompt.toLowerCase())
    );

    if (match) {
        if (match.type === 'text') {
            return { type: 'direct', text: match.answer };
        }
        if (match.type === 'url') {
            const pageText = await scrapeUrl(match.answer);
            if (pageText) {
                return { type: 'context', text: pageText, source: match.answer };
            } else {
                return { type: 'url_only', sourceUrl: match.answer };
            }
        }
        if (match.type === 'form') {
            return {
                type: 'form',
                text: match.answer,
                form: match.formConfig
            };
        }
    }
    return null;
};

// --- Dynamic Prompt Parsing Helper ---
/**
 * Fetches the prompt template from DB and replaces {{tags}} with the provided runtime values.
 * Falls back to a string default if DB fetch fails.
 */
export async function getDynamicPrompt(category: string, replacements: Record<string, any>, fallback: string): Promise<string> {
    try {
        const promptDoc = await SystemPrompt.findOne({ category }).lean();
        let template = promptDoc ? promptDoc.template : fallback;

        // Replace all {{key}} with their corresponding value from the replacements object
        Object.keys(replacements).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            let val = replacements[key];
            if (val === undefined || val === null) val = '';
            template = template.replace(regex, typeof val === 'object' ? JSON.stringify(val) : String(val));
        });

        return template;
    } catch (error) {
        console.error(`Failed to load dynamic prompt for ${category}`, error);
        return fallback; // Safety fallback 
    }
}

export async function chatWithGroq(
    prompt: string,
    type: 'chat' | 'draft' = 'chat',
    lang: 'en' | 'hi' = 'en',
    contextConfig?: any // Flexible context for Industry, Market, or Article modes
): Promise<AIResponse> {
    // Keeping name for frontend compatibility
    await dbConnect(); // Ensure connection early

    // 0. Fetch Global LLM Settings
    let activeProvider = 'gemini';
    let activeModel = 'gemini-2.0-flash-lite-preview';

    try {
        const settings = await LLMSetting.findOne({ key: "global_llm_settings" }).lean();
        if (settings) {
            activeProvider = settings.activeProvider as 'groq' | 'gemini';
            activeModel = settings.activeModel;
        }
    } catch (e) {
        console.error("Failed to fetch LLM settings, falling back to Gemini");
    }

    // Sanitization: Prevent prompt injection in the main prompt string
    const sanitizedPrompt = prompt.replace(/[{}]/g, ''); // Simple bracket stripping

    let responseText = "";
    let tokensUsed = 0;

    // 0. Fetch Active Rules for both logging and prompt injection
    const activeRules = await getActiveGuardrails();
    const ruleTexts = activeRules.map(r => r.rule);

    // Fetch user from DB to enforce strict server-side token limits
    let dbUser = null;
    if (contextConfig?.userEmail) {
        dbUser = await User.findOne({ email: contextConfig.userEmail });
    }

    let logTicker = contextConfig?.symbol || null;
    let logRawData: any = contextConfig?.realTimeData || null;

    // Session Token Limit Enforcement
    const SESSION_TOKEN_LIMIT = dbUser ? (dbUser.tokenLimit || 100000) : 100000;
    const isGuest = !contextConfig?.isAuthenticated;
    const accumulatedTokens = dbUser ? (dbUser.tokensUsed || 0) : (contextConfig?.accumulatedTokens || 0);

    if (accumulatedTokens >= SESSION_TOKEN_LIMIT) {
        const authAction = isGuest ? "**[Login or Sign Up](/login)** to securely save your progress and access unlimited features." : "contact your administrator to upgrade your plan.";
        const limitMsg = `🔒 **Session Limit Reached**\n\nThank you for exploring Quantum Guru! You have reached your allocated limit of **${SESSION_TOKEN_LIMIT.toLocaleString()} QG Tokens**.\n\nTo continue using our advanced quantum intelligence without interruption, please ${authAction}`;

        return {
            text: limitMsg,
            source: 'token_limit',
            tokenLimitExceeded: true,
            tokensUsed: 0, // 0 for this specific blocked request
            sessionTokenLimit: SESSION_TOKEN_LIMIT,
            guardrailsStatus: 'passed',
            activeGuardrails: ruleTexts
        };
    }

    // 1. Guardrails Pre-Check (Hard Block)
    const violation = checkGuardrails(prompt, activeRules);
    if (violation) {
        await ChatLog.create({
            userQuery: prompt,
            aiResponse: violation,
            source: 'blocked',
            guardrailsStatus: 'violated',
            activeGuardrails: ruleTexts
        });
        return { text: violation, guardrailsStatus: 'violated', activeGuardrails: ruleTexts };
    }

    // 2. KB / RAG Check (Standard for all modes, but could be scoped later)
    const kbResult = await queryKnowledgeBase(prompt);


    // 2.5 Autonomous Market Data Fetch via LLM Tool Calling
    let autonomousMarketData = null;
    let autonomousNewsData = null;

    if (!contextConfig?.realTimeData && !kbResult) {
        /* GROQ_FALLBACK:
        // Define our available native tools
        const tools = [
            ...
        ];

        try {
            // First pass: Ask the LLM if it wants to use a tool based on the user's prompt
            const initialToolCheck = await groq.chat.completions.create({
                ...
            });
            ...
        } catch (toolError) {
            console.error("[Groq Tool Calling Error] - Proceeding without tools:", toolError);
        }
        */

        const geminiTools = {
            functionDeclarations: [
                {
                    name: "get_stock_price",
                    description: "Gets the real-time stock price and market data for a given company ticker symbol. Use exactly when the user asks for financial data on a specific company.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            ticker: { type: "STRING", description: "The official abbreviated stock ticker symbol (e.g., AAPL for Apple, TSLA for Tesla)" }
                        },
                        required: ["ticker"]
                    }
                },
                {
                    name: "get_market_news",
                    description: "Fetches recent news headlines for a given company or generic topic.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            topic: { type: "STRING", description: "The topic or company name to get news for (e.g., 'Apple' or 'Quantum Computing')." }
                        },
                        required: ["topic"]
                    }
                }
            ]
        };

        try {
            const routerInstruction = await getDynamicPrompt('ai_router', { prompt }, "You are an AI router. Decide if you need to fetch live data using your tools based on the user prompt.");
            const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, tools: [geminiTools] as any });
            const result = await model.generateContent([
                routerInstruction,
                prompt
            ]);

            const call = result.response.functionCalls()?.[0];
            if (call) {
                if (call.name === 'get_stock_price') {
                    const args: any = call.args;
                    console.log(`[Gemini Tool] Triggered get_stock_price for: ${args.ticker}`);
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 5000);
                        autonomousMarketData = await getStockPrice(args.ticker);
                        logTicker = args.ticker;
                        logRawData = autonomousMarketData;
                        clearTimeout(timeoutId);
                    } catch (e: any) {
                        console.error("[Gemini Tool] get_stock_price failed:", e.message);
                    }
                }

                if (call.name === 'get_market_news') {
                    const args: any = call.args;
                    console.log(`[Gemini Tool] Triggered get_market_news for: ${args.topic}`);
                    try {
                        const newsResult = await getLatestNews(args.topic);
                        autonomousNewsData = newsResult.news;
                    } catch (e: any) {
                        console.error("[Gemini Tool] get_market_news failed:", e.message);
                    }
                }
            }
        } catch (toolError) {
            console.error("[Gemini Tool Calling Error] - Proceeding without tools:", toolError);
        }
    }

    if (kbResult?.type === 'direct') {
        const text = kbResult.text;
        await ChatLog.create({
            userQuery: prompt,
            aiResponse: text,
            source: 'kb_direct',
            guardrailsStatus: 'passed',
            activeGuardrails: ruleTexts
        });
        return { text, source: 'kb_direct', guardrailsStatus: 'passed', activeGuardrails: ruleTexts };
    }

    if (kbResult?.type === 'form') {
        await ChatLog.create({
            userQuery: prompt,
            aiResponse: kbResult.text,
            source: 'kb_form',
            guardrailsStatus: 'passed',
            activeGuardrails: ruleTexts
        });
        return {
            text: kbResult.text,
            form: kbResult.form,
            source: 'kb_form',
            guardrailsStatus: 'passed',
            activeGuardrails: ruleTexts
        };
    }

    if (kbResult?.type === 'url_only') {
        const text = "I found an official portal that might help you.";
        return {
            text,
            sourceUrl: kbResult.sourceUrl,
            source: 'kb_url',
            guardrailsStatus: 'passed',
            activeGuardrails: ruleTexts
        };
    }


    // 3. Main LLM Logic
    // We already have kbResult, autonomousMarketData, and autonomousNewsData from the checks above
    const timeStringVal = new Date().toLocaleString();
    const langStringVal = lang === 'hi' ? 'Hindi' : 'English';

    // Base System Prompt (General)
    let systemInstructions = await getDynamicPrompt(
        'general_conversation',
        { time: timeStringVal, language: langStringVal },
        `You are Quantum AI, a futuristic and highly capable AI assistant. Be helpful, professional, and efficient.\nCurrent Time: ${timeStringVal}\nLanguage: ${langStringVal}`
    );

    // Inject Autonomous Market/News context if fetched
    if (autonomousMarketData) {
        systemInstructions += `\n\nAUTONOMOUS MARKET DATA (YAHOO FINANCE):
        - Symbol: ${autonomousMarketData.symbol}
        - Price: $${autonomousMarketData.price}
        - Change: ${autonomousMarketData.change} (${autonomousMarketData.changePercent})
        - Volume: ${autonomousMarketData.volume}
        - Day Close: ${autonomousMarketData.previousClose}`;
    }
    if (autonomousNewsData && autonomousNewsData.length > 0) {
        systemInstructions += `\n\nAUTONOMOUS MARKET NEWS:
        ${autonomousNewsData.slice(0, 5).map((n: any) => `- ${n.title} (${n.source})`).join('\n')}`;
    }

    // --- Dynamic Context Injection ---
    let autonomousContext = "";
    if (contextConfig) {
        // Mode: Market Intelligence

        if (contextConfig.mode === 'market') {
            const now = new Date();
            const timeString = now.toLocaleString('en-US', {
                timeZone: 'America/New_York',
                dateStyle: 'full',
                timeStyle: 'long'
            });

            // 1. Ticker Extraction Layer (The Intermediate Layer)
            let targetSymbol = contextConfig.symbol; // Start with explicit selection if any

            // If no symbol selected, try to extract from prompt
            if (!targetSymbol) {
                /* GROQ_FALLBACK:
                try {
                    const extraction = await groq.chat.completions.create({
                        messages: [
                            { role: "system", content: "Identify the stock ticker symbol from the user's text. Return ONLY the ticker (e.g., AAPL, TSLA, BTC-USD). If no specific public company or asset is mentioned, return 'NULL'." },
                            { role: "user", content: prompt }
                        ],
                        model: "llama-3.3-70b-versatile",
                        temperature: 0
                    });
                    const extracted = extraction.choices[0]?.message?.content?.trim();
                    if (extracted && extracted !== 'NULL' && extracted.length < 10) {
                        targetSymbol = extracted.replace(/[^a-zA-Z0-9-]/g, ''); // Clean it
                    }
                } catch (e) {
                    console.error("Ticker extraction failed:", e);
                }
                */
                try {
                    const tickerInstruction = await getDynamicPrompt('ticker_extraction', { prompt }, "Identify the stock ticker symbol from the user's text. Return ONLY the ticker (e.g., AAPL, TSLA, BTC-USD). If no specific public company or asset is mentioned, return 'NULL'.");
                    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
                    const extraction = await model.generateContent([
                        tickerInstruction,
                        prompt
                    ]);
                    const extracted = extraction.response.text().trim();
                    if (extracted && extracted !== 'NULL' && extracted.length < 10) {
                        targetSymbol = extracted.replace(/[^a-zA-Z0-9-]/g, ''); // Clean it
                    }
                } catch (e) {
                    console.error("Gemini Ticker extraction failed:", e);
                }
            }

            // 2. Data Fetching Layer
            let realTimeData = contextConfig.realTimeData;
            if (targetSymbol && !realTimeData) {
                realTimeData = await getStockPrice(targetSymbol);
                logTicker = targetSymbol;
                logRawData = realTimeData;
            }

            systemInstructions += `\n\nMODE: MARKET INTELLIGENCE`;
            systemInstructions += `\nCURRENT SYSTEM TIME (NY): ${timeString}`;

            // 3. Inject Data into Context
            if (realTimeData) {
                const rt = realTimeData;
                systemInstructions += `\n\nREAL-TIME DATA (ALPHA VANTAGE):
                - Symbol: ${rt.symbol}
                - Price: $${rt.price}
                - Change: ${rt.change} (${rt.changePercent})
                - Volume: ${rt.volume}
                - Latest Trading Day: ${rt.latestTradingDay}
                - Previous Close: ${rt.previousClose}
                
                IMPORTANT: Use this REAL-TIME data as the primary source.`;
            } else if (targetSymbol) {
                systemInstructions += `\nFOCUS ASSET: ${targetSymbol} (Real-time data unavailable, use general knowledge)`;
            }

            if (contextConfig.stockName && !targetSymbol) systemInstructions += `\nFOCUS ASSET: ${contextConfig.stockName}`;

            if (contextConfig.stockUrl) {
                systemInstructions += `\nREFERENCE URL: ${contextConfig.stockUrl}`;
                const scrapedData = await scrapeUrl(contextConfig.stockUrl);
                if (scrapedData) autonomousContext = scrapedData;
            }

            // Inject Real-Time Data if available
            if (realTimeData || contextConfig.realTimeData) {
                const rt = realTimeData || contextConfig.realTimeData;
                systemInstructions = await getDynamicPrompt('market_inquiry', {
                    time: timeString,
                    symbol: rt.symbol,
                    price: rt.price,
                    change: rt.change,
                    changePercent: rt.changePercent,
                    volume: rt.volume,
                    date: rt.latestTradingDay,
                    close: rt.previousClose,
                    scrapedData: autonomousContext ? `\nREFERENCE CONTEXT:\n${autonomousContext}\n` : ''
                }, systemInstructions); // fallback to what we had
            } else {
                systemInstructions = await getDynamicPrompt('market_news_fallback', {
                    targetSymbol: targetSymbol || (contextConfig.stockName ? contextConfig.stockName : "N/A"),
                    scrapedData: autonomousContext ? `\nREFERENCE CONTEXT:\n${autonomousContext}\n` : ''
                }, systemInstructions); // fallback to what we had
            }
        }
        // Mode: Article & Learn
        else if (contextConfig.mode === 'article') {
            if (contextConfig.articleUrl) {
                const scrapedData = await scrapeUrl(contextConfig.articleUrl);
                if (scrapedData) autonomousContext = scrapedData;
            }

            // Override ALL system instructions with the Article mode prompt (which is how the original worked)
            systemInstructions = await getDynamicPrompt('article_inquiry', {
                title: contextConfig.articleTitle || 'Provided Context',
                category: contextConfig.articleCategory || 'General',
                url: contextConfig.articleUrl || 'N/A',
                scrapedData: autonomousContext ? `\nREFERENCE CONTEXT:\n${autonomousContext}\n` : ''
            }, systemInstructions); // fallback
        }
        // Mode: Quantum Assistant
        else if (contextConfig.mode === 'assistant') {
            systemInstructions = await getDynamicPrompt('assistant_mode', {}, `MODE: GENERAL CHAT AND ASSISTANCE CONTEXT\nTASK: You are providing general chat and assistance. Answer the user's questions to the best of your ability. Keep responses helpful and professional.`);
        }
        // Mode: Industry (Modular / Robust)
        else if (contextConfig.mode === 'industry') {
            const { industry, service, problem, hardware, formData, userEmail } = contextConfig;

            if (formData && Object.keys(formData).length > 0) {
                // --- STEP 0: FETCH FORM DEF ---
                const formDef = await QuantumForm.findOne({ industry, service, problem });

                // --- STEP 1: DETERMINISTIC GUARDRAILS (Pre-LLM) ---
                if (formDef) {
                    const allFields = [...(formDef.fields || []), ...(formDef.sections?.flatMap((s: any) => s.fields) || [])];
                    for (const field of allFields) {
                        const val = formData[field.key];
                        if (field.required && (val === undefined || val === '')) {
                            return { text: `Error: Required parameter "${field.label}" is missing.`, source: 'guardrail' };
                        }
                        // Type Validation
                        if (val !== undefined && val !== '') {
                            if (field.type === 'number' && isNaN(Number(val))) {
                                return { text: `Error: Parameter "${field.label}" must be a number.`, source: 'guardrail' };
                            }
                        }
                    }
                }

                // --- STEP 1.5: SHA-256 RESULT CACHING ---
                const cacheKey = getWorkflowCacheKey(problem, service, hardware, formData);
                const cachedResult = await Experiment.findOne({ cacheKey }).sort({ timestamp: -1 }).lean();

                if (cachedResult) {
                    console.log(`[Quantum Workflow] CACHE_HIT | Problem: ${problem} | Key: ${cacheKey}`);
                    return {
                        text: cachedResult.analysis,
                        source: 'quantum_cache',
                        guardrailsStatus: 'passed',
                        activeGuardrails: ruleTexts
                    };
                }

                // --- STEP 1.6: LOGGING & SANITIZATION ---
                console.log(`[Quantum Workflow] START | Industry: ${industry} | Service: ${service} | Problem: ${problem} | Hardware: ${hardware}`);
                const sanitizedFormData: Record<string, any> = {};
                Object.keys(formData).forEach(key => {
                    const val = formData[key];
                    sanitizedFormData[key] = typeof val === 'string' ? val.replace(/[{}]/g, '') : val;
                });

                // --- STEP 2: TEMPLATE LOOKUP ---
                let templateCode = "";
                if (formDef?.codeTemplates) {
                    const matched = formDef.codeTemplates.find((t: any) =>
                        hardware.toLowerCase().includes(t.hardware.toLowerCase()) ||
                        t.hardware.toLowerCase().includes(hardware.toLowerCase())
                    );
                    templateCode = matched?.code || "";
                }

                // --- STEP 3: MULTI-PASS GENERATION (Structured JSON) ---
                const isDWave = hardware.toLowerCase().includes('d-wave') || hardware.toLowerCase().includes('annealer');
                let generatedCode = "";
                let explanation = "";
                let attempts = 0;
                const MAX_ATTEMPTS = 3;
                let lastError = "";
                let finalExecutionResult: any = {};

                while (attempts < MAX_ATTEMPTS) {
                    attempts++;
                    console.log(`[Quantum Workflow] Attempt ${attempts} for ${problem}`);

                    const genPrompt = await getDynamicPrompt(isDWave ? 'industry_dwave' : 'industry_qiskit', {
                        industry, service, problem, hardware,
                        parameters: JSON.stringify(sanitizedFormData),
                        template: templateCode || "None (Generate from scratch)",
                        lastError: lastError ? `PREVIOUS_ERROR: ${lastError}` : ""
                    }, `You are a Quantum Expert. ${templateCode ? "Use the provided template and fill placeholders." : "Generate a complete script."} 
                    STRICT RULES:
                    - Use a fixed seed (e.g., 42) for all simulators/samplers to ensure reproducibility.
                    - Do NOT include any explanations in the code block.
                    Return a JSON object with "code" and "explanation" keys.`);

                    const jsonWrapperInstruction = await getDynamicPrompt('industry_json_wrapper', {
                        prompt: genPrompt,
                        templateCode: templateCode ? "Use the provided template and fill placeholders." : "Generate a complete script."
                    }, `You are a Quantum Expert. ${templateCode ? "Use the provided template and fill placeholders." : "Generate a complete script."} 
                    STRICT RULES:
                    - Use a fixed seed (e.g., 42) for all simulators/samplers to ensure reproducibility.
                    - Do NOT include any explanations in the code block.
                    Return a JSON object with "code" and "explanation" keys.`);

                    const model = genAI.getGenerativeModel({
                        model: GEMINI_MODEL,
                        generationConfig: { responseMimeType: "application/json" }
                    });
                    const result = await model.generateContent([
                        "You are a Quantum Workflow Engine. Always return valid JSON with 'code' and 'explanation' fields.",
                        jsonWrapperInstruction
                    ]);

                    try {
                        const content = result.response.text() || "{}";
                        const parsed = JSON.parse(content);
                        generatedCode = parsed.code || "";
                        explanation = parsed.explanation || "";

                        console.log(`[Quantum Workflow] GENERATED | Attempt: ${attempts} | Code Length: ${generatedCode.length}`);

                        // --- STEP 4: THREE-LAYER VALIDATION ---
                        const validation = await validateQuantumCode(generatedCode, hardware);
                        if (!validation.valid) {
                            console.warn(`[Quantum Workflow] VALIDATION_FAILED | Error: ${validation.error}`);
                            lastError = `Validation failed: ${validation.error}`;
                            continue;
                        }

                        console.log(`[Quantum Workflow] VALIDATED | Proceeding to execution.`);

                        // --- STEP 5: EXECUTION ---
                        finalExecutionResult = isDWave
                            ? await executeDWaveAnnealer(generatedCode)
                            : await executeQuantumCircuit(generatedCode);

                        if (finalExecutionResult.error) {
                            console.error(`[Quantum Workflow] EXECUTION_ERROR | Error: ${finalExecutionResult.error}`);
                            lastError = `Runtime error: ${finalExecutionResult.error}`;
                            continue;
                        }

                        console.log(`[Quantum Workflow] EXECUTED | Output length: ${finalExecutionResult.output?.length || 0}`);
                        // SUCCESS
                        break;

                    } catch (e: any) {
                        lastError = `Processing error: ${e.message}`;
                        if (attempts >= MAX_ATTEMPTS) {
                            return { text: `Error: Critical failure in quantum workflow after ${MAX_ATTEMPTS} attempts. Last Error: ${lastError}`, source: 'quantum_workflow_error' };
                        }
                    }
                }

                // --- STEP 6: FORMAT & SAVE ---
                const rawOutput = (finalExecutionResult.output || finalExecutionResult.error || 'No output.').trim();

                const parseAnyAssignmentTable = (out: string): string | null => {
                    const bestMatch = out.match(/Best(?:\s+solution)?:\s*\{([^}]+)\}/i);
                    if (!bestMatch) return null;
                    const allPairs = [...bestMatch[1].matchAll(/'?([^':,\s]+)'?\s*:\s*([\w.+-]+)/g)];
                    if (allPairs.length === 0) return null;
                    const rows = allPairs.map(([, key, val]) => {
                        const pilotFlight = key.match(/pilot[_\s]?(\w+)[_\s]flight[_\s]?(\w+)/i);
                        const displayKey = pilotFlight ? `Pilot ${pilotFlight[1]} → Flight ${pilotFlight[2]}` : key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        const numVal = parseFloat(val);
                        const displayVal = isNaN(numVal) ? val : numVal === 1 ? '✅ Assigned' : numVal === 0 ? '⬜ Not Assigned' : numVal.toFixed(4);
                        return `| ${displayKey} | ${displayVal} |`;
                    });
                    const header = `| Variable | Value |\n|---|---|\n`;
                    return `**⚙️ Simulator Output**\n\n${header}${rows.join('\n')}`;
                };

                const tableOutput = parseAnyAssignmentTable(rawOutput);
                const energyMatch = rawOutput.match(/Energy:\s*([-\d.]+)/i);
                const energyLine = energyMatch ? `\n\n> **Lowest Energy:** \`${energyMatch[1]}\`` : '';

                const formattedOutput = tableOutput
                    ? `${tableOutput}${energyLine}\n\n---\n\n`
                    : `**⚙️ Raw Simulator Output**\n\`\`\`\n${rawOutput}\n\`\`\`\n\n---\n\n`;

                const finalDisplay = `[STEP_CODE]${generatedCode}[/STEP_CODE]` +
                    `[STEP_SIM]${rawOutput}[/STEP_SIM]` +
                    formattedOutput +
                    explanation;

                try {
                    await Experiment.create({
                        userId: userEmail,
                        industry,
                        service,
                        problem,
                        hardware,
                        parameters: formData,
                        qiskitCode: generatedCode,
                        results: finalExecutionResult,
                        analysis: finalDisplay,
                        cacheKey: cacheKey, // Store the hash for future reuse
                        chartData: finalExecutionResult.counts ? {
                            type: "bar",
                            data: Object.entries(finalExecutionResult.counts).map(([k, v]) => ({ name: k, value: v }))
                        } : null,
                        timestamp: new Date()
                    });
                } catch (saveError) {
                    console.error("Failed to save experiment history:", saveError);
                }

                return {
                    text: finalDisplay,
                    source: 'quantum_workflow',
                    guardrailsStatus: 'passed',
                    activeGuardrails: ruleTexts
                };
            }

            // Normal Industry Context (Existing logic if no formData)
            if (industry) systemInstructions += `\n\nINDUSTRY CONTEXT: You are assisting a user in the ${industry} sector.`;
            if (service) systemInstructions += `\nSERVICE CONTEXT: The user is focused on ${service}.`;
            if (problem) systemInstructions += `\nPROBLEM CONTEXT: The specific problem being addressed is ${problem}.`;
            if (hardware) systemInstructions += `\nHARDWARE CONTEXT: The target quantum hardware is ${hardware}. Optimize your responses for this architecture.`;
        }
    }

    systemInstructions += `\n\nCRITICAL SAFETY RULES:
    ${ruleTexts.length > 0 ? "You MUST NOT discuss or provide information about: " + ruleTexts.join(", ") : "Follow general safety guidelines."}
    If a user asks about these topics, politely decline to answer.`;

    let finalPrompt = prompt;
    let integratedContext = null;
    let contextSource = null;

    if (kbResult?.type === 'context') {
        integratedContext = kbResult.text;
        contextSource = kbResult.source;
    } else if (autonomousContext) {
        integratedContext = autonomousContext;
        contextSource = contextConfig?.stockUrl || contextConfig?.articleUrl || "Autonomous Scrape";
    }

    if (integratedContext) {
        systemInstructions += "\n\nUse the following official context to answer the user's question accurately. Provide summaries of trends, market news, and stock prices if applicable. If information is missing, state what is available.";
        finalPrompt = `Web-Scraped Context from ${contextSource}: ${integratedContext}\n\nUser Question/Request: ${prompt}`;
    }

    try {
        if (activeProvider === 'groq') {
            if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemInstructions },
                    { role: "user", content: finalPrompt }
                ],
                model: activeModel,
                temperature: 0.7,
            });
            responseText = completion.choices[0]?.message?.content || "";
            tokensUsed = completion.usage?.total_tokens || 0;
        } else {
            const model = genAI.getGenerativeModel({ model: activeModel || GEMINI_MODEL });
            const result = await model.generateContent([
                { text: systemInstructions },
                { text: finalPrompt }
            ]);

            responseText = result.response.text() || "I'm sorry, I couldn't generate a response.";
            tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;
        }

        // --- Log Interaction ---
        await ChatLog.create({
            userQuery: prompt,
            aiResponse: responseText,
            source: kbResult?.type === 'context' ? 'kb_context' : activeProvider,
            context: kbResult?.type === 'context' ? kbResult.source : undefined,
            guardrailsStatus: 'passed',
            activeGuardrails: ruleTexts,
            ticker: logTicker,
            rawData: logRawData,
            systemPrompt: systemInstructions,
            mode: contextConfig?.mode || 'assistant'
        });

        // --- Update DB Token Usage ---
        if (dbUser) {
            dbUser.tokensUsed = (dbUser.tokensUsed || 0) + tokensUsed;
            await dbUser.save();
        }

        return {
            text: responseText,
            source: kbResult?.type === 'context' ? 'kb_context' : activeProvider,
            sourceUrl: kbResult?.type === 'context' ? kbResult.source : undefined,
            guardrailsStatus: 'passed',
            activeGuardrails: ruleTexts,
            tokensUsed,
            sessionTokenLimit: SESSION_TOKEN_LIMIT,
        };

    } catch (error: any) {
        console.error("LLM Server Error:", error);

        // Basic offline fallback (Strict Maintenance Mode)
        const errorMsg = "I am currently undergoing maintenance and cannot process complex requests right now. However, you can still ask me questions from our official Knowledge Base, or try again in a few minutes.";

        await ChatLog.create({
            userQuery: prompt,
            aiResponse: errorMsg,
            source: 'error',
            guardrailsStatus: 'passed', // Logic still passed guardrails
            activeGuardrails: ruleTexts
        });

        return {
            text: errorMsg,
            error: "LLM_OFFLINE",
            source: 'error',
            guardrailsStatus: 'passed',
            activeGuardrails: ruleTexts
        };
    }
}

export async function getMarketNews() {
    try {
        await dbConnect();

        // Fetch latest 10 news items from MongoDB
        const newsDocs = await News.find({}).sort({ publishedAt: -1 }).limit(10).lean();

        if (!newsDocs || newsDocs.length === 0) {
            return [];
        }

        // Map them to the format expected by the frontend component
        return newsDocs.map((item: any, index: number) => ({
            id: index + 1,
            title: item.title,
            source: item.source,
            time: new Date(item.publishedAt || item.createdAt).toLocaleDateString(),
            impact: item.impact,
            trend: item.trend
        }));
    } catch (error) {
        console.error("Failed to fetch market news from database:", error);
        return [];
    }
}

// ============================================================
// STEP-BY-STEP QUANTUM WORKFLOW ACTIONS
// ============================================================

export async function generateQuantumCode(config: {
    problem: string; industry: string; service: string; hardware: string; formData: any;
}): Promise<{ code: string; error?: string }> {
    // const groq = new Groq({ apiKey: API_KEY });
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");
    const { problem, industry, service, hardware, formData } = config;

    if (!GEMINI_API_KEY) {
        return { code: "", error: "Gemini API Key is missing. Please add GEMINI_API_KEY to environment variables." };
    }
    const isDWave = hardware?.toLowerCase().includes('d-wave') || hardware?.toLowerCase().includes('annealing');

    try {
        let codePrompt = '';
        if (isDWave) {
            codePrompt = `You are a Python expert using dimod 0.12.21. Generate a complete runnable script.
CRITICAL: The ONLY valid BinaryQuadraticModel constructor is:
  BinaryQuadraticModel(linear: dict, quadratic: dict, offset: float, vartype: str)
  DO NOT pass num_variables or any other argument.
Problem: ${problem} | Industry: ${industry} | Service: ${service}
Parameters: ${JSON.stringify(formData)}
Write a script that:
1. from dimod import BinaryQuadraticModel, SimulatedAnnealingSampler
2. Define linear={} and quadratic={} dicts. You may use UP TO 30 VARIABLES.
3. bqm = BinaryQuadraticModel(linear, quadratic, 0.0, 'BINARY')
   sampler = SimulatedAnnealingSampler(); sampleset = sampler.sample(bqm, num_reads=50)
   best = sampleset.first; print(f'Best: {best.sample}'); print(f'Energy: {best.energy:.4f}')
Return ONLY the Python code. No markdown. No backticks. No explanation.`;
        } else {
            codePrompt = `Generate a complete, self-contained Python Qiskit script.
Industry: ${industry} | Service: ${service} | Problem: ${problem} | Hardware: ${hardware}
Parameters: ${JSON.stringify(formData)}
Rules: Use qiskit and qiskit_aer. Build QuantumCircuit, add gates and measurements.
Run: from qiskit_aer import AerSimulator; sim=AerSimulator(); job=sim.run(circuit,shots=1024); result=job.result(); counts=result.get_counts(); print(f"Results: {counts}")
Return ONLY the Python code. No markdown. No explanation.`;
        }

        /* GROQ_FALLBACK:
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'system', content: 'You are a Quantum Expert. Return only Python code.' }, { role: 'user', content: codePrompt }],
            model: DEFAULT_MODEL,
        });

        let code = completion.choices[0]?.message?.content?.replace(/```python|```/g, '').trim() || '';
        */

        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent([
            "You are a Quantum Expert. Return only Python code. No markdown. No explanation.",
            codePrompt
        ]);

        let code = result.response.text().replace(/```python|```/g, '').trim() || '';

        // Always force correct dimod imports for D-Wave
        if (isDWave) {
            const correctImports = `from dimod import BinaryQuadraticModel, SimulatedAnnealingSampler\nimport numpy as np\n\n`;
            code = code.split('\n').filter((l: string) => !l.trim().startsWith('from dimod import') && !l.trim().startsWith('import dimod')).join('\n').trim();
            code = correctImports + code;
        }

        return { code };
    } catch (e: any) {
        return { code: '', error: e.message };
    }
}

export async function runQuantumSimulator(config: {
    code: string; hardware: string;
}): Promise<{ output: string; error?: string }> {
    const { code, hardware } = config;
    const isDWave = hardware?.toLowerCase().includes('d-wave') || hardware?.toLowerCase().includes('annealing');

    try {
        const result = isDWave
            ? await executeDWaveAnnealer(code)
            : await executeQuantumCircuit(code);
        return { output: result.output || result.error || 'No output returned.', error: result.error };
    } catch (e: any) {
        return { output: '', error: e.message };
    }
}

export async function interpretQuantumResults(config: {
    problem: string; industry: string; hardware: string; rawOutput: string;
}): Promise<{ text: string; chartData?: any }> {
    // const groq = new Groq({ apiKey: API_KEY });
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");
    const { problem, industry, hardware, rawOutput } = config;

    if (!GEMINI_API_KEY) {
        return { text: "Analysis unavailable: Gemini API Key is missing.", chartData: null };
    }
    const isDWave = hardware?.toLowerCase().includes('d-wave') || hardware?.toLowerCase().includes('annealing');

    try {
        const prompt = `You are a Quantum Computing analyst. Analyze the following ACTUAL simulator output ONLY.
Problem: ${problem} | Industry: ${industry} | Simulator: ${isDWave ? 'D-Wave Annealing' : 'Qiskit Gate-Model'}
Raw Output: ${rawOutput}
STRICT RULES:
- Write exactly ONE paragraph of 5-6 lines maximum.
- Only describe what the ACTUAL output data shows. Do NOT assume, speculate, or explain theory.
- If the output is an error, state only what the error was and what it means technically.
- Be direct and data-driven.
After the paragraph, generate a chart:
[CHART_DATA]
{ "type": "bar", "data": [ {"name": "Label from output", "value": 123} ] }
[/CHART_DATA]`;

        /* GROQ_FALLBACK:
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'system', content: 'You are a Quantum Analysis expert.' }, { role: 'user', content: prompt }],
            model: DEFAULT_MODEL,
        });

        let text = completion.choices[0]?.message?.content || 'Analysis complete.';
        */

        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent([
            "You are a Quantum Analysis expert.",
            prompt
        ]);

        let text = result.response.text() || 'Analysis complete.';
        let chartData = null;
        const chartMatch = text.match(/\[CHART_DATA\]([\s\S]*?)\[\/CHART_DATA\]/);
        if (chartMatch) {
            try { chartData = JSON.parse(chartMatch[1]); } catch { }
            text = text.replace(/\[CHART_DATA\][\s\S]*?\[\/CHART_DATA\]/, '').trim();
        }

        return { text, chartData };
    } catch (e: any) {
        return { text: `Interpretation failed: ${e.message}` };
    }
}

export async function debugStockFetch(prompt: string) {
    const steps: any[] = [];
    let ticker = "NULL";
    let rawMarketData = null;
    let enrichedPrompt = "";
    let finalOutput = "";

    try {
        // Step 1: Ticker Extraction
        steps.push({ name: "Ticker Extraction", status: "processing" });
        const tickerInstruction = await getDynamicPrompt('ticker_extraction', { prompt }, "Identify the stock ticker symbol from the user's text. Return ONLY the ticker (e.g., AAPL, TSLA, BTC-USD). If no specific public company or asset is mentioned, return 'NULL'.");
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const extraction = await model.generateContent([
            tickerInstruction,
            prompt
        ]);
        ticker = extraction.response.text().trim().replace(/[^a-zA-Z0-9-]/g, '');
        steps[0] = { name: "Ticker Extraction", status: "completed", result: ticker };

        if (ticker && ticker !== 'NULL') {
            // Step 2: Fetching Market Data
            steps.push({ name: "Market Data Fetch", status: "processing" });
            rawMarketData = await getStockPrice(ticker);
            steps[1] = { name: "Market Data Fetch", status: rawMarketData ? "completed" : "failed", result: rawMarketData };

            // Step 3: Prompt Enrichement
            steps.push({ name: "Prompt Enrichment", status: "processing" });
            const timeString = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
            if (rawMarketData) {
                enrichedPrompt = await getDynamicPrompt('market_inquiry', {
                    time: timeString,
                    symbol: rawMarketData.symbol,
                    price: rawMarketData.price,
                    change: rawMarketData.change,
                    changePercent: rawMarketData.changePercent,
                    volume: rawMarketData.volume,
                    date: rawMarketData.latestTradingDay,
                    close: rawMarketData.previousClose,
                    scrapedData: ""
                }, "Fallback template");
            } else {
                // FALLBACK for debugger if market data fails
                enrichedPrompt = await getDynamicPrompt('market_news_fallback', {
                    targetSymbol: ticker,
                    scrapedData: ""
                }, "Fallback news template");
            }
            steps[2] = { name: "Prompt Enrichment", status: enrichedPrompt ? "completed" : "failed", result: enrichedPrompt };

            // Step 4: Final Summarization
            steps.push({ name: "Final Summarization", status: "processing" });
            const chatModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
            const finalResult = await chatModel.generateContent([
                { role: "system", text: enrichedPrompt } as any,
                { role: "user", text: prompt } as any
            ]);
            finalOutput = finalResult.response.text();
            steps[3] = { name: "Final Summarization", status: "completed", result: finalOutput };
        } else {
            steps.push({ name: "Process Halted", status: "info", result: "No ticker detected. Generic flow would trigger." });
        }

        return {
            ticker,
            rawMarketData,
            enrichedPrompt,
            finalOutput,
            steps
        };

    } catch (error: any) {
        console.error("Debug Flow Error:", error);
        return {
            error: error.message,
            steps
        };
    }
}
