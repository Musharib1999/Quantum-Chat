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
import { buildMarketContext } from './market-pipeline';
import { buildArticleContext } from './article-pipeline';
import { buildAssistantContext } from './assistant-pipeline';
import { executeIndustryWorkflow } from './industry-pipeline';
import { getDynamicPrompt } from './prompt-utils';
import QuantumForm from '@/models/QuantumForm';
import { getStockPrice, getLatestNews } from './market';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const API_KEY = process.env.GROQ_API_KEY;
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-lite";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");



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
export async function scrapeUrl(url: string) {
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

// Dynamic prompt utility is now imported from prompt-utils.ts

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
    let activeModel = 'gemini-2.0-flash-lite';

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
            // Use activeModel if it's Gemini, otherwise fallback to default for tools
            const toolModelName = activeProvider === 'gemini' ? activeModel : GEMINI_MODEL;
            const model = genAI.getGenerativeModel({ model: toolModelName, tools: [geminiTools] as any });
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
            const pipelineDeps = {
                activeProvider: activeProvider as 'groq' | 'gemini',
                activeModel,
                genAI,
                groq: new Groq({ apiKey: process.env.GROQ_API_KEY }),
                getDynamicPrompt,
                scrapeUrl
            };

            const marketResult = await buildMarketContext(prompt, contextConfig, pipelineDeps);
            systemInstructions = marketResult.systemInstructions;
            logTicker = marketResult.logTicker;
            logRawData = marketResult.logRawData;
        }
        // Mode: Article & Learn
        else if (contextConfig.mode === 'article') {
            const articleDeps = {
                getDynamicPrompt,
                scrapeUrl
            };
            const articleResult = await buildArticleContext(contextConfig, articleDeps);
            systemInstructions = articleResult.systemInstructions;
        }
        // Mode: Quantum Assistant
        else if (contextConfig.mode === 'assistant') {
            const assistantResult = await buildAssistantContext({ getDynamicPrompt });
            systemInstructions = assistantResult.systemInstructions;
        }
        // Mode: Industry (Modular / Robust)
        else if (contextConfig.mode === 'industry') {
            const industryDeps = {
                genAI,
                GEMINI_MODEL,
                getDynamicPrompt,
                QuantumForm,
                Experiment
            };
            const industryResult = await executeIndustryWorkflow(contextConfig, ruleTexts, industryDeps);

            if (industryResult.returnMode === 'direct') {
                return industryResult.data;
            } else {
                systemInstructions = industryResult.data;
            }
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

export async function debugStockFetch(prompt: string) {
    await dbConnect();
    const steps: any[] = [];
    let ticker = "NULL";
    let tickerPrompt = "";
    let rawMarketData = null;
    let enrichedPrompt = "";
    let finalOutput = "";

    try {
        // Step 1: Ticker Extraction
        steps.push({ name: "Ticker Extraction", status: "processing" });
        const tickerInstruction = await getDynamicPrompt('ticker_extraction', { prompt }, "Identify the stock ticker symbol from the user's text. Return ONLY the ticker (e.g., AAPL, TSLA, BTC-USD). If no specific public company or asset is mentioned, return 'NULL'.");
        tickerPrompt = tickerInstruction;
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const extraction = await model.generateContent([
            tickerInstruction,
            prompt
        ]);
        ticker = extraction.response.text().trim().replace(/[^a-zA-Z0-9.-]/g, ''); // Allow dots and hyphens
        if (ticker.length > 10) ticker = "NULL"; // Safety check for runaway text

        steps[0] = { name: "Ticker Extraction", status: "completed", result: ticker || "NULL" };

        if (ticker && ticker !== 'NULL') {
            // Step 2: Fetching Market Data
            steps.push({ name: "Market Data Fetch", status: "processing" });
            rawMarketData = await getStockPrice(ticker);
            steps[steps.length - 1] = { name: "Market Data Fetch", status: rawMarketData ? "completed" : "failed", result: rawMarketData ? `${rawMarketData.symbol} ($${rawMarketData.price})` : "FETCH_FAILED" };

            // Step 3: Prompt Enrichment
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
                enrichedPrompt = await getDynamicPrompt('market_news_fallback', {
                    targetSymbol: ticker,
                    scrapedData: ""
                }, "Fallback news template");
            }
            steps[steps.length - 1] = { name: "Prompt Enrichment", status: enrichedPrompt ? "completed" : "failed", result: enrichedPrompt ? "ENRICHED_PROMPT_READY" : "ENRICHMENT_FAILED" };

            // Step 4: Final Summarization
            steps.push({ name: "Final Summarization", status: "processing" });
            const chatModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
            const finalResult = await chatModel.generateContent([
                { role: "system", text: enrichedPrompt } as any,
                { role: "user", text: prompt } as any
            ]);
            finalOutput = finalResult.response.text();
            steps[steps.length - 1] = { name: "Final Summarization", status: "completed", result: "RESPONSE_GENERATED" };
        } else {
            steps.push({ name: "Process Halted", status: "info", result: "No valid ticker found" });

            // Reprompt Fallback for Debugger
            const repromptInstruction = `I noticed you're asking about a company or stock, but I couldn't identify the specific ticker symbol. Do NOT make up data. Instead, politely apologize and ask the user to provide the ticker (e.g., AAPL) or the full company name so you can fetch the latest data for them.`;
            const chatModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
            const finalResult = await chatModel.generateContent([
                { role: "system", text: repromptInstruction } as any,
                { role: "user", text: prompt } as any
            ]);
            finalOutput = finalResult.response.text();
        }

        // --- Persist Debug Log ---
        try {
            const logEntry = await ChatLog.create({
                userQuery: prompt,
                aiResponse: finalOutput || "No AI response generated in debug mode.",
                source: 'stock_debugger',
                ticker: ticker,
                rawData: rawMarketData,
                systemPrompt: enrichedPrompt,
                tickerPrompt: tickerPrompt,
                mode: 'market',
                guardrailsStatus: 'passed'
            });
            steps.push({ name: "Persistent Log Captured", status: "completed", result: new Date(logEntry.timestamp).toLocaleString() });
        } catch (logErr) {
            console.error("Debug Logging Failed:", logErr);
            steps.push({ name: "Logging Failed", status: "failed", result: "DB_ERROR" });
        }

        return {
            ticker,
            tickerPrompt,
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
