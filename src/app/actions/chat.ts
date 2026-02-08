"use server";

import Groq from "groq-sdk";
import axios from 'axios';
import * as cheerio from 'cheerio';
import dbConnect from '@/lib/db';
import QaPair from '@/models/QaPair';
import Guardrail from '@/models/Guardrail';
import ChatLog from '@/models/ChatLog';

const API_KEY = process.env.GROQ_API_KEY;
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

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
            try {
                const { data } = await axios.get(match.answer);
                const $ = cheerio.load(data);
                $('script, style, nav, footer').remove();
                const pageText = $('body').text().replace(/\s+/g, ' ').substring(0, 5000);
                return { type: 'context', text: pageText, source: match.answer };
            } catch (e) {
                console.error("Failed to fetch URL:", match.answer);
                return null;
            }
        }
    }
    return null;
};

export async function chatWithGemini(prompt: string, type: 'chat' | 'draft' = 'chat', lang: 'en' | 'hi' = 'en') {
    // Keeping name for frontend compatibility
    await dbConnect(); // Ensure connection early

    if (!API_KEY) {
        return { error: "Groq API Key is missing. Please add GROQ_API_KEY to environment variables." };
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
        return { text: violation };
    }

    // 2. KB / RAG Check
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
        return { text };
    }

    // 3. Main LLM Logic
    let systemInstructions = `You are Sahayak, an AI assistant for the Bihar Government. Be helpful, professional, and answer in a way that citizens can understand.
    
    CRITICAL SAFETY RULES:
    ${ruleTexts.length > 0 ? "You MUST NOT discuss or provide information about: " + ruleTexts.join(", ") : "Follow general government safety guidelines."}
    If a user asks about these topics, politely decline to answer.`;

    let finalPrompt = prompt;

    if (kbResult?.type === 'context') {
        systemInstructions += "\n\nUse the following official context to answer the user's question accurately. If the answer is not in the context, say you don't know and advise checking official sources.";
        finalPrompt = `Context: ${kbResult.text}\n\nUser Question: ${prompt}`;
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

        return { text };
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

        return { error: errorMsg };
    }
}
