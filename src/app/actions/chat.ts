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
const checkGuardrails = async (prompt: string): Promise<string | null> => {
    await dbConnect();
    const rules = await Guardrail.find({ active: true }).lean();

    for (const r of rules as any[]) {
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
    if (!API_KEY) {
        return { error: "Groq API Key is missing. Please add GROQ_API_KEY to environment variables." };
    }

    const groq = new Groq({ apiKey: API_KEY });

    // 1. Guardrails Check
    const violation = await checkGuardrails(prompt);
    if (violation) {
        await ChatLog.create({
            userQuery: prompt,
            aiResponse: violation,
            source: 'blocked'
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
            source: 'kb_direct'
        });
        return { text };
    }

    // 3. Main LLM Logic
    let systemInstructions = "You are Sahayak, an AI assistant for the Bihar Government. Be helpful, professional, and answer in a way that citizens can understand.";
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
            context: kbResult?.type === 'context' ? kbResult.source : undefined
        });

        return { text };
    } catch (error: any) {
        console.error("Groq Server Error:", error);
        return { error: "Failed to process request with Groq. Please try again later." };
    }
}
