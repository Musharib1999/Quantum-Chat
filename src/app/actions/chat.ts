"use server";

import Groq from "groq-sdk";
import axios from 'axios';
import * as cheerio from 'cheerio';
import dbConnect from '@/lib/db';
import QaPair from '@/models/QaPair';
import Guardrail from '@/models/Guardrail';
import ChatLog from '@/models/ChatLog';
import Experiment from '@/models/Experiment';
import { execSync } from 'child_process';
import path from 'path';

const API_KEY = process.env.GROQ_API_KEY;
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

// --- Quantum Execution Helper ---
async function executeQuantumCircuit(circuitCode: string) {
    try {
        const scriptPath = path.join(process.cwd(), 'scripts', 'quantum_simulator.py');
        const escapedCode = circuitCode.replace(/"/g, '\\"').replace(/\n/g, ' ');
        // Use absolute path to ensure python3 is found
        const pythonPath = '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3';
        const cmd = `"${pythonPath}" "${scriptPath}" "${escapedCode}"`;
        const output = execSync(cmd).toString();
        return JSON.parse(output);
    } catch (e: any) {
        console.error("Simulator Execution Fail:", e);
        return { success: false, error: e.message };
    }
}

async function executeDWaveAnnealer(code: string) {
    try {
        const scriptPath = path.join(process.cwd(), 'scripts', 'dwave_simulator.py');
        const escapedCode = code.replace(/"/g, '\\"').replace(/\n/g, ' ');
        const pythonPath = '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3';
        const cmd = `"${pythonPath}" "${scriptPath}" "${escapedCode}"`;
        const output = execSync(cmd).toString();
        return JSON.parse(output);
    } catch (e: any) {
        console.error("D-Wave Execution Fail:", e);
        return { success: false, error: e.message };
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
    let systemInstructions = `You are Quantum AI, a futuristic and highly capable AI assistant. Be helpful, professional, and efficient.`;

    // --- Dynamic Context Injection ---
    let autonomousContext = "";
    if (contextConfig) {
        // Mode: Market Intelligence
        if (contextConfig.mode === 'market') {
            systemInstructions += `\n\nMODE: MARKET INTELLIGENCE`;
            if (contextConfig.stockName) systemInstructions += `\nFOCUS ASSET: ${contextConfig.stockName}`;
            if (contextConfig.stockUrl) {
                systemInstructions += `\nREFERENCE URL: ${contextConfig.stockUrl}`;
                const scrapedData = await scrapeUrl(contextConfig.stockUrl);
                if (scrapedData) autonomousContext = scrapedData;
            }
            systemInstructions += `\nTASK: Provide financial analysis, market trends, and investment insights related to the selected asset.`;
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
                    codePrompt = `Generate a Python script using 'dimod' for D-Wave Quantum Annealing for the following problem:
Industry: ${industry}
Service: ${service}
Problem: ${problem}
Parameters: ${JSON.stringify(formData)}

Requirements:
1. Define a BinaryQuadraticModel (BQM) representing the problem.
2. Store the BQM in a variable named 'bqm'.
3. Do NOT run the sampler yourself; just define 'bqm'.
4. Do NOT use 'dwave.system' or cloud samplers; use 'dimod'.
5. Return ONLY the Python code.`;

                    const completion1 = await groq.chat.completions.create({
                        messages: [{ role: "system", content: "You are a D-Wave/Ocean Expert. Return only code." }, { role: "user", content: codePrompt }],
                        model: DEFAULT_MODEL,
                    });

                    generatedCode = completion1.choices[0]?.message?.content?.replace(/```python|```/g, '').trim() || "";

                    // Execute D-Wave Simulator
                    executionResult = await executeDWaveAnnealer(generatedCode);

                } else {
                    // --- QISKIT WORKFLOW (Default) ---
                    codePrompt = `Generate a Python Qiskit circuit for the following problem:
Industry: ${industry}
Service: ${service}
Problem: ${problem}
Hardware: ${hardware}
Parameters: ${JSON.stringify(formData)}

Return ONLY the Python code. Define a variable 'circuit' which is the QuantumCircuit object. Do not include any other text.`;

                    const completion1 = await groq.chat.completions.create({
                        messages: [{ role: "system", content: "You are a Qiskit Expert. Return only code." }, { role: "user", content: codePrompt }],
                        model: DEFAULT_MODEL,
                    });

                    generatedCode = completion1.choices[0]?.message?.content?.replace(/```python|```/g, '').trim() || "";

                    // Execute Qiskit Simulator
                    executionResult = await executeQuantumCircuit(generatedCode);
                }

                // Pass 2: Interpret and Format
                const interpretPrompt = `Analyze these Quantum Execution results (${isDWave ? 'D-Wave Annealing' : 'Gate-Model Circuit'}):
Problem: ${problem}
Results: ${JSON.stringify(executionResult)}
Success: ${executionResult.success}

1. Provide a professional, human-friendly explanation of these results in the context of ${industry}.
2. Generate a JSON block for a chart like this:
[CHART_DATA]
{
  "type": "bar",
  "data": [ {"name": "Solution A", "value": 450}, {"name": "Solution B", "value": 574} ]
}
[/CHART_DATA]`;

                const completion2 = await groq.chat.completions.create({
                    messages: [
                        { role: "system", content: "You are a Quantum Analysis expert." },
                        { role: "user", content: interpretPrompt }
                    ],
                    model: DEFAULT_MODEL,
                });

                const finalExplanation = completion2.choices[0]?.message?.content || "Simulation complete.";

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

        // Log the error response as well
        const errorMsg = "Failed to process request with Groq. Please try again later.";
        await ChatLog.create({
            userQuery: prompt,
            aiResponse: error.message || errorMsg,
            source: 'error',
            guardrailsStatus: 'passed', // Logic still passed guardrails
            activeGuardrails: ruleTexts
        });

        return { text: "", error: errorMsg };
    }
}
