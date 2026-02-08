"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const KB_FILE = path.join(process.cwd(), 'data/knowledge_base.json');
const GUARD_FILE = path.join(process.cwd(), 'data/guardrails.json');

// --- Helper Types ---
type QaPair = { id: string; question: string; answer: string; type: 'text' | 'url'; tags: string[] };
type Guardrail = { id: string; rule: string; type: 'banned_topic' | 'safety_check'; active: boolean };

// --- Connection Check ---
export async function checkGeminiConnection() {
    return !!API_KEY;
}

// --- Guardrails ---
const checkGuardrails = (prompt: string): string | null => {
    if (!fs.existsSync(GUARD_FILE)) return null;
    const rules: Guardrail[] = JSON.parse(fs.readFileSync(GUARD_FILE, 'utf-8'));

    const activeRules = rules.filter(r => r.active);
    for (const r of activeRules) {
        // Simple keyword blocking for demo (production would use semantic classifer)
        if (r.type === 'banned_topic' && prompt.toLowerCase().includes(r.rule.toLowerCase())) {
            return "I cannot answer this question due to safety guidelines regarding: " + r.rule;
        }
    }
    return null;
};

// --- Knowledge Base ---
const queryKnowledgeBase = async (prompt: string) => {
    if (!fs.existsSync(KB_FILE)) return null;
    const kbs: QaPair[] = JSON.parse(fs.readFileSync(KB_FILE, 'utf-8'));

    // 1. Exact/Fuzzy Match (Simple keyword overlap for now)
    const match = kbs.find(kb =>
        prompt.toLowerCase().includes(kb.question.toLowerCase()) ||
        kb.question.toLowerCase().includes(prompt.toLowerCase())
    );

    if (match) {
        if (match.type === 'text') {
            return { type: 'direct', text: match.answer };
        }
        if (match.type === 'url') {
            try {
                // Fetch URL content
                const { data } = await axios.get(match.answer);
                const $ = cheerio.load(data);

                // Extract main text (simplified)
                $('script, style, nav, footer').remove();
                const pageText = $('body').text().replace(/\s+/g, ' ').substring(0, 5000); // Limit context

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
    if (!API_KEY) {
        return { error: "API Key missing. Please set GEMINI_API_KEY in environment variables." };
    }

    // 1. Guardrails Check
    const violation = checkGuardrails(prompt);
    if (violation) return { text: `🛡️ **Safety Alert**: ${violation}` };

    // 2. Knowledge Base Check
    const kbResult = await queryKnowledgeBase(prompt);

    // Setup Gemini
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let systemInstructions = type === 'draft'
        ? `You are an expert legal aide for the Bihar Panchayati Raj Department. 
       Task: Draft a formal grievance letter. Language: ${lang === 'hi' ? 'Hindi' : 'English'}.`
        : `You are Sahayak AI, assistant for the Bihar Panchayati Raj Department.
       Language: ${lang === 'hi' ? 'Hindi' : 'English'}.
       Tone: Official, polite, concise.`;

    let finalPrompt = prompt;

    // 3. Inject Context if URL Match found
    if (kbResult?.type === 'context') {
        systemInstructions += `\n\nSOURCE MATERIAL: The user is asking about a topic found in official records. 
        Use the following scraped text to answer: "${kbResult.text}"
        
        Cite the source: ${kbResult.source}`;
        finalPrompt = `Based on the source material provided, answer: ${prompt}`;
    }
    // 4. Return Direct Answer if Text Match found (Skip Gemini Generation for speed/cost?)
    // Actually, let's have Gemini rephrase it nicely so it feels like a conversation.
    else if (kbResult?.type === 'direct') {
        systemInstructions += `\n\nOFFICIAL ANSWER: The database has a direct answer for this: "${kbResult.text}". 
        Restate this answer politely to the user.`;
    }

    try {
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: `System: ${systemInstructions}` }] },
                { role: "model", parts: [{ text: "Understood. Ready." }] },
            ],
        });

        const result = await chat.sendMessage(finalPrompt);
        const response = await result.response;
        return { text: response.text() };
    } catch (error: any) {
        console.error("Gemini Server Error:", error);
        return { error: "Failed to process request. Please try again later." };
    }
}
