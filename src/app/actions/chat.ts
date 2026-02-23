"use server";

import Groq from "groq-sdk";
import axios from 'axios';
import * as cheerio from 'cheerio';
import dbConnect from '@/lib/db';
import QaPair from '@/models/QaPair';
import Guardrail from '@/models/Guardrail';
import ChatLog from '@/models/ChatLog';
import Experiment from '@/models/Experiment';
import News from '@/models/News';
import { execSync } from 'child_process';
import path from 'path';
import { getStockPrice, getLatestNews } from './market';

const API_KEY = process.env.GROQ_API_KEY;
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

// --- Quantum Execution Helper ---
async function executeQuantumCircuit(circuitCode: string) {
    try {
        console.log(`[Quantum Sim] Sending request to: http://127.0.0.1:8001/execute`);

        const response = await axios.post(`http://127.0.0.1:8001/execute`, {
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
        console.log(`[DWave Sim] Sending request to: http://127.0.0.1:8002/execute`);

        const response = await axios.post(`http://127.0.0.1:8002/execute`, {
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
}

// --- Connection Check ---
export async function checkGeminiConnection() {
    // Keeping function name for compatibility, but checking Groq key
    return !!API_KEY;
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

export async function chatWithGroq(
    prompt: string,
    type: 'chat' | 'draft' = 'chat',
    lang: 'en' | 'hi' = 'en',
    contextConfig?: any // Flexible context for Industry, Market, or Article modes
): Promise<AIResponse> {
    // Keeping name for frontend compatibility
    await dbConnect(); // Ensure connection early

    if (!API_KEY) {
        return { text: "", error: "Groq API Key is missing. Please add GROQ_API_KEY to environment variables." };
    }

    const groq = new Groq({ apiKey: API_KEY });

    // 0. Fetch Active Rules for both logging and prompt injection
    const activeRules = await getActiveGuardrails();
    const ruleTexts = activeRules.map(r => r.rule);

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

    // 2.5 Autonomous Market Data Fetch (If finance-related and no context provided)
    let autonomousMarketData = null;
    let autonomousNewsData = null;

    const lowerPrompt = prompt.toLowerCase();
    const isMarketQuery = ["price", "stock", "market", "share", "dividend", "financial", "nasdaq", "nyse", "ticker"].some(kw => lowerPrompt.includes(kw));
    const isNewsQuery = ["news", "latest", "headline", "happening", "report", "update"].some(kw => lowerPrompt.includes(kw));

    if ((isMarketQuery || isNewsQuery) && !contextConfig?.realTimeData && !kbResult) {
        // Detect potential ticker
        const commonTickers = ["AAPL", "GOOGL", "MSFT", "AMZN", "META", "TSLA", "NFLX", "NVDA", "BTC", "ETH", "IBM", "IONQ", "RGTI", "QBTS"];
        const foundTicker = contextConfig?.symbol || commonTickers.find(t => lowerPrompt.includes(t.toLowerCase())) ||
            (lowerPrompt.match(/\$([a-z]{1,5})/i)?.[1].toUpperCase());

        if (foundTicker) {
            autonomousMarketData = await getStockPrice(foundTicker);
        }

        if (isNewsQuery || (isMarketQuery && !foundTicker)) {
            const newsResult = await getLatestNews(foundTicker || "quantum computing market");
            autonomousNewsData = newsResult.news;
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
    let systemInstructions = `You are Quantum AI, a futuristic and highly capable AI assistant. Be helpful, professional, and efficient.
    Current Time: ${new Date().toLocaleString()}
    Language: ${lang === 'hi' ? 'Hindi' : 'English'}`;

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
            }

            // 2. Data Fetching Layer
            let realTimeData = contextConfig.realTimeData;
            if (targetSymbol && !realTimeData) {
                realTimeData = await getStockPrice(targetSymbol);
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
            if (contextConfig.realTimeData) {
                const rt = contextConfig.realTimeData;
                systemInstructions += `\n\nREAL-TIME DATA (ALPHA VANTAGE):
                - Symbol: ${rt.symbol}
                - Price: $${rt.price}
                - Change: ${rt.change} (${rt.changePercent})
                - Volume: ${rt.volume}
                - Latest Trading Day: ${rt.latestTradingDay}
                - Previous Close: ${rt.previousClose}
                
                IMPORTANT: Use this REAL-TIME data as the primary source for price and movement. Do NOT rely on potential hallucinations or old training data.`;
            }
            systemInstructions += `\nTASK: Provide financial analysis, market trends, and investment insights related to the selected asset or news topic.`;

            // Conditional Response Structure
            let responseStructure = "";
            if (contextConfig.realTimeData || (targetSymbol && !contextConfig.newsTitle)) {
                // Case A: Stock Data is available OR we are analyzing a specific ticker
                responseStructure = `
                1. **## Stocks Prices and Movements Numbers**
                   - Provide Current price, day's change, percentage change, and key volume data.
                2. **## News**
                   - Recent headlines and relevant news events affecting the stock.
                3. **## Analysis**
                   - Technical and fundamental analysis based on the data.
                4. **## Conclusion**
                   - A final summary and potential outlook.`;
            } else {
                // Case B: News-Only Analysis (No specific stock data focus)
                responseStructure = `
                1. **## News Analysis**
                   - Detailed breakdown of the specific news story or headline provided.
                2. **## Market Implications**
                   - How this news impacts the broader market or specific sectors.
                3. **## Key Takeaways**
                   - The most important points for investors to know.
                4. **## Outlook**
                   - Potential future developments based on this news.`;
            }

            systemInstructions += `\n\nCRITICAL RESPONSE STRUCTURE:
            You must provide your response in the following strict order using Markdown:
            ${responseStructure}
            
            STYLING RULES:
            - Use '##' for main section headers.
            - Do NOT use decorative symbols like '|' or '---' at the start of headers.
            - Use bullet points for lists.`;
        }
        // Mode: Article & Learn
        else if (contextConfig.mode === 'article') {
            systemInstructions += `\n\nMODE: ARTICLE & LEARN`;
            if (contextConfig.articleTitle) systemInstructions += `\nCURRENT PAPER/ARTICLE: ${contextConfig.articleTitle}`;
            if (contextConfig.articleCategory) systemInstructions += `\nCATEGORY: ${contextConfig.articleCategory}`;
            if (contextConfig.articleUrl) {
                systemInstructions += `\nSOURCE URL: ${contextConfig.articleUrl}`;
                const scrapedData = await scrapeUrl(contextConfig.articleUrl);
                if (scrapedData) autonomousContext = scrapedData;
            }
            systemInstructions += `\nTASK: Summarize, analyze, or answer questions based on the specific research article provided.`;
            systemInstructions += `\n\nCRITICAL RESPONSE STRUCTURE:
            You must provide your response in the following strict order using Markdown:
            1. **## Executive Summary**
               - A concise overview of the article's main purpose.
            2. **## Key Findings**
               - The most important results or discoveries.
            3. **## Analysis & Implications**
               - What this means for the field of Quantum Computing.
            4. **## Conclusion**
               - Final thoughts or future outlook.

            STYLING RULES:
            - Use '##' for main section headers.
            - Do NOT use decorative symbols like '|' or '---' at the start of headers.`;
        }
        // Mode: Industry (Modular / Robust)
        else if (contextConfig.mode === 'industry') {
            const { industry, service, problem, hardware, formData } = contextConfig;

            if (formData && Object.keys(formData).length > 0) {
                // --- SPECIAL: MULTI-PASS QUANTUM WORKFLOW ---

                // Determine Backend Type
                const isDWave = hardware.toLowerCase().includes('d-wave') || hardware.toLowerCase().includes('annealer');
                let codePrompt = "";
                let executionResult: any = {};
                let generatedCode = "";

                if (isDWave) {
                    // --- D-WAVE WORKFLOW ---
                    codePrompt = `You are a Python expert using dimod 0.12.21. Generate a complete runnable script.

CRITICAL: The ONLY valid BinaryQuadraticModel constructor is:
  BinaryQuadraticModel(linear: dict, quadratic: dict, offset: float, vartype: str)
  - linear = {'var': bias_float, ...}
  - quadratic = {('var1','var2'): coupling_float, ...}
  - vartype = 'BINARY' or 'SPIN'
  DO NOT pass num_variables or any other argument.

Problem: ${problem} | Industry: ${industry} | Service: ${service}
Parameters: ${JSON.stringify(formData)}

Write a script that:
1. from dimod import BinaryQuadraticModel, SimulatedAnnealingSampler
2. Define linear={} and quadratic={} dicts to encode the problem. You may use UP TO 30 VARIABLES.
3. If the problem requires more than 30 variables, split into 2 BATCHES of ≤15 variables each:
   - Define bqm_batch1 and bqm_batch2 separately
   - Run each independently: sampleset1 = sampler.sample(bqm_batch1, num_reads=50)
   - Combine and print: print(f'Batch 1: {sampleset1.first.sample}, Energy: {sampleset1.first.energy:.4f}')
4. If ≤30 variables, use a single BQM: bqm = BinaryQuadraticModel(linear, quadratic, 0.0, 'BINARY')
   - sampler = SimulatedAnnealingSampler(); sampleset = sampler.sample(bqm, num_reads=50)
   - best = sampleset.first; print(f'Best: {best.sample}'); print(f'Energy: {best.energy:.4f}')

Return ONLY the Python code. No markdown. No backticks. No explanation.`;

                    const completion1 = await groq.chat.completions.create({
                        messages: [{ role: "system", content: "You are a D-Wave/Ocean Expert. Return only code." }, { role: "user", content: codePrompt }],
                        model: DEFAULT_MODEL,
                    });

                    generatedCode = completion1.choices[0]?.message?.content?.replace(/```python|```/g, '').trim() || "";

                    // Strip any LLM-generated dimod imports (they may be misspelled/hallucinated)
                    // Always force the correct verified imports at the top
                    const correctDwaveImports = `from dimod import BinaryQuadraticModel, SimulatedAnnealingSampler\nimport numpy as np\n\n`;
                    generatedCode = generatedCode
                        .split('\n')
                        .filter(line => !line.trim().startsWith('from dimod import') && !line.trim().startsWith('import dimod'))
                        .join('\n')
                        .trim();
                    generatedCode = correctDwaveImports + generatedCode;

                    // Execute D-Wave Simulator
                    executionResult = await executeDWaveAnnealer(generatedCode);

                } else {
                    // --- QISKIT WORKFLOW (Default) ---
                    codePrompt = `Generate a complete, self-contained Python Qiskit script for the following quantum computing problem:
Industry: ${industry}
Service: ${service}
Problem: ${problem}
Hardware: ${hardware}
Parameters: ${JSON.stringify(formData)}

Rules (VERY IMPORTANT):
1. Use qiskit and qiskit_aer for simulation
2. Build a QuantumCircuit, add gates, add measurements
3. Run with AerSimulator: from qiskit_aer import AerSimulator; sim = AerSimulator(); job = sim.run(circuit, shots=1024); result = job.result(); counts = result.get_counts(); print(f"Results: {counts}")
4. Print the measurement counts clearly
5. Return ONLY the Python code, no markdown, no explanation`;

                    const completion1 = await groq.chat.completions.create({
                        messages: [{ role: "system", content: "You are a Qiskit Expert. Return only code." }, { role: "user", content: codePrompt }],
                        model: DEFAULT_MODEL,
                    });

                    generatedCode = completion1.choices[0]?.message?.content?.replace(/```python|```/g, '').trim() || "";

                    // Execute Qiskit Simulator
                    executionResult = await executeQuantumCircuit(generatedCode);
                }

                // Pass 2: Interpret and Format
                const interpretPrompt = `You are a Quantum Computing analyst. Analyze the following ACTUAL simulator output ONLY.

Problem: ${problem} | Industry: ${industry} | Simulator: ${isDWave ? 'D-Wave Annealing' : 'Qiskit Gate-Model'}
Raw Output: ${executionResult.output || executionResult.error}

STRICT RULES:
- Write exactly ONE paragraph of 5-6 lines maximum.
- Only describe what the ACTUAL output data shows. Do NOT assume, speculate, or explain theory.
- If the output is an error, state only what the error was and what it means technically.
- Do not add introductions, conclusions, or generic quantum computing background.
- Be direct and data-driven.

After the paragraph, generate a chart from the actual data:
[CHART_DATA]
{
  "type": "bar",
  "data": [ {"name": "Label from output", "value": 123} ]
}
[/CHART_DATA]`;

                const completion2 = await groq.chat.completions.create({
                    messages: [
                        { role: "system", content: "You are a Quantum Analysis expert." },
                        { role: "user", content: interpretPrompt }
                    ],
                    model: DEFAULT_MODEL,
                });

                const rawOutput = executionResult.output || executionResult.error || 'No output returned.';

                // Universal table formatter — converts any key:value assignments into a clean markdown table
                const parseAnyAssignmentTable = (output: string): string | null => {
                    const bestMatch = output.match(/Best(?:\s+solution)?:\s*\{([^}]+)\}/i);
                    if (!bestMatch) return null;

                    const allPairs = [...bestMatch[1].matchAll(/'?([^':,\s]+)'?\s*:\s*([\w.+-]+)/g)];
                    if (allPairs.length === 0) return null;

                    const rows = allPairs.map(([, key, val]) => {
                        // Format variable name: pilot_1_flight_a → Pilot 1 → Flight a
                        const pilotFlight = key.match(/pilot[_\s]?(\w+)[_\s]flight[_\s]?(\w+)/i);
                        const displayKey = pilotFlight
                            ? `Pilot ${pilotFlight[1]} → Flight ${pilotFlight[2]}`
                            : key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                        const numVal = parseFloat(val);
                        const displayVal = isNaN(numVal) ? val
                            : numVal === 1 ? '✅ Assigned'
                                : numVal === 0 ? '⬜ Not Assigned'
                                    : numVal.toFixed(4);

                        return `| ${displayKey} | ${displayVal} |`;
                    });

                    const header = `| Variable | Value |\n|---|---|\n`;
                    return `**⚙️ Simulator Output**\n\n${header}${rows.join('\n')}`;
                };

                const energyMatch = rawOutput.match(/Energy:\s*([-\d.]+)/i);
                const energyLine = energyMatch ? `\n\n> **Lowest Energy:** \`${energyMatch[1]}\`` : '';

                const tableOutput = parseAnyAssignmentTable(rawOutput);
                const formattedOutput = tableOutput
                    ? `${tableOutput}${energyLine}\n\n---\n\n`
                    : `**⚙️ Raw Simulator Output**\n\`\`\`\n${rawOutput.trim()}\n\`\`\`\n\n---\n\n`;

                const finalExplanation =
                    `[STEP_CODE]${generatedCode}[/STEP_CODE]` +
                    `[STEP_SIM]${rawOutput.trim()}[/STEP_SIM]` +
                    formattedOutput +
                    (completion2.choices[0]?.message?.content || "Simulation complete.");

                // --- SAVE EXPERIMENT TO HISTORY ---
                try {
                    await Experiment.create({
                        industry,
                        service,
                        problem,
                        hardware,
                        parameters: formData,
                        qiskitCode: generatedCode,
                        results: executionResult, // Simulation output
                        analysis: finalExplanation,
                        chartData: executionResult.counts ? {
                            type: "bar",
                            data: Object.entries(executionResult.counts).map(([k, v]) => ({ name: k, value: v }))
                        } : null,
                        timestamp: new Date()
                    });
                } catch (saveError) {
                    console.error("Failed to save experiment history:", saveError);
                    // Don't block the response, just log the error
                }

                await ChatLog.create({
                    userQuery: prompt,
                    aiResponse: finalExplanation,
                    source: 'quantum_workflow',
                    guardrailsStatus: 'passed',
                    activeGuardrails: ruleTexts
                });

                return {
                    text: finalExplanation,
                    source: 'quantum_workflow',
                    guardrailsStatus: 'passed',
                    activeGuardrails: ruleTexts
                };
            }

            // Normal Industry Context (Existing logic)
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

    // Integrate KB or Autonomous Context if found
    const integratedContext = kbResult?.type === 'context' ? kbResult.text : autonomousContext;
    const contextSource = kbResult?.type === 'context' ? kbResult.source : (contextConfig?.stockUrl || contextConfig?.articleUrl);

    if (integratedContext) {
        systemInstructions += "\n\nUse the following official context to answer the user's question accurately. Provide summaries of trends, market news, and stock prices if applicable. If information is missing, state what is available.";
        finalPrompt = `Web-Scraped Context from ${contextSource}: ${integratedContext}\n\nUser Question/Request: ${prompt}`;
    }

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemInstructions },
                { role: "user", content: finalPrompt },
            ],
            model: DEFAULT_MODEL,
        });

        const text = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

        // --- Log Interaction ---
        await ChatLog.create({
            userQuery: prompt,
            aiResponse: text,
            source: kbResult?.type === 'context' ? 'kb_context' : 'groq',
            context: kbResult?.type === 'context' ? kbResult.source : undefined,
            guardrailsStatus: 'passed',
            activeGuardrails: ruleTexts
        });

        return {
            text,
            source: kbResult?.type === 'context' ? 'kb_context' : 'groq',
            sourceUrl: kbResult?.type === 'context' ? kbResult.source : undefined,
            guardrailsStatus: 'passed',
            activeGuardrails: ruleTexts
        };
    } catch (error: any) {
        console.error("Groq Server Error:", error);

        // Fallback: If we hit a rate limit but we successfully fetched market data, return that data directly.
        let fallbackText = "";
        if (autonomousMarketData) {
            fallbackText += `⚠️ **Notice: Deep AI Analysis is currently unavaliable.**\n\nHowever, I retrieved the raw market data you requested:\n\n**${autonomousMarketData.symbol}**\n- **Price:** $${autonomousMarketData.price}\n- **Change:** ${autonomousMarketData.change} (${autonomousMarketData.changePercent})\n- **Volume:** ${autonomousMarketData.volume}\n- **Previous Close:** $${autonomousMarketData.previousClose}\n\n`;
        }

        if (autonomousNewsData && autonomousNewsData.length > 0) {
            fallbackText += `**Latest Headlines:**\n`;
            autonomousNewsData.slice(0, 3).forEach((n: any) => {
                fallbackText += `- [${n.title}](${n.url || '#'}) (${n.source})\n`;
            });
        }

        if (fallbackText) {
            // We have fallback data to show
            return {
                text: fallbackText,
                source: 'fallback_market_data',
                guardrailsStatus: 'passed',
                activeGuardrails: ruleTexts
            };
        }

        // Log the error response if no fallback data exists
        const errorMsg = "Failed to process request with Groq API (Rate limit or server error). Please try again later.";
        await ChatLog.create({
            userQuery: prompt,
            aiResponse: error.message || errorMsg,
            source: 'error',
            guardrailsStatus: 'passed', // Logic still passed guardrails
            activeGuardrails: ruleTexts
        });

        return { text: errorMsg, error: error.message };
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
    const groq = new Groq({ apiKey: API_KEY });
    const { problem, industry, service, hardware, formData } = config;
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

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'system', content: 'You are a Quantum Expert. Return only Python code.' }, { role: 'user', content: codePrompt }],
            model: DEFAULT_MODEL,
        });

        let code = completion.choices[0]?.message?.content?.replace(/```python|```/g, '').trim() || '';

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
    const groq = new Groq({ apiKey: API_KEY });
    const { problem, industry, hardware, rawOutput } = config;
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

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'system', content: 'You are a Quantum Analysis expert.' }, { role: 'user', content: prompt }],
            model: DEFAULT_MODEL,
        });

        let text = completion.choices[0]?.message?.content || 'Analysis complete.';
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
