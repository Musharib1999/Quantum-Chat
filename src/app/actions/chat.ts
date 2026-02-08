"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function checkGeminiConnection() {
    return !!API_KEY;
}

export async function chatWithGemini(prompt: string, type: 'chat' | 'draft' = 'chat', lang: 'en' | 'hi' = 'en') {
    if (!API_KEY) {
        return { error: "API Key missing. Please set GEMINI_API_KEY in environment variables." };
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemInstructions = type === 'draft'
        ? `You are an expert legal aide for the Bihar Panchayati Raj Department. 
       Task: Draft a formal grievance letter to the "Block Panchayat Raj Officer (BPRO)" or "Sarpanch" based on the user's input.
       Format: Formal letter format with Subject, Salutation, Body, and Placeholder for Signature.
       Language: ${lang === 'hi' ? 'Hindi (Devanagari)' : 'English'}.
       Keep it professional, concise, and legally sound.`
        : `You are Sahayak AI, an AI assistant for the Bihar Panchayati Raj Department.
       Language: ${lang === 'hi' ? 'Hindi (Mix of formal and conversational)' : 'English'}.
       Tone: Helpful, official, polite, and accessible to rural citizens.
       Knowledge: You know about Gram Katchry, Nal Jal Yojana, Gali-Nali Yojana, and Panchayat Sarkar Bhawan.
       Constraint: Keep answers concise (under 3-4 sentences) unless asked to explain in detail.
       Note: If the user asks about specific application status, acknowledge that you don't have access to the live database yet, but explain the process to check it.`;

    try {
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: `System Instruction: ${systemInstructions}` }],
                },
                {
                    role: "model",
                    parts: [{ text: "Understood. I am ready to assist as Sahayak AI." }],
                },
            ],
        });

        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        return { text: response.text() };
    } catch (error: any) {
        console.error("Gemini Server Error:", error);
        return { error: "Failed to process request. Please try again later." };
    }
}
