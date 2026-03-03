'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import dbConnect from '@/lib/db';
import Stock from '@/models/Stock';
import News from '@/models/News';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Calculates or retrieves the Quantum Exposure Score (0-5) for a company.
 * 0: No involvement
 * 5: Maximum involvement
 */
export async function getQuantumExposureScore(name: string, type: 'stock' | 'news' = 'stock', id?: string) {
    if (!GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is missing, returning 0");
        return 0;
    }

    try {
        await dbConnect();

        // 1. Check if ID is provided and try to find in DB first
        if (id) {
            const Model = type === 'stock' ? Stock : News;
            const item = await Model.findById(id);
            if (item && item.quantumExposureScore !== undefined && item.quantumExposureScore > 0) {
                return item.quantumExposureScore;
            }
        }

        // 2. If not found or score is 0/missing, calculate via LLM
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

        const prompt = `Evaluate the "Quantum Exposure Score" for the following company or entity: "${name}".
        Quantum Exposure refers to how much a company's business, research, and future value are tied to Quantum Computing technology.
        
        Score Scale (Integer 0 to 5):
        0: No detectable involvement or mention in the quantum ecosystem.
        1: Minimal involvement (occasional mentions, extremely early exploration).
        2: Moderate involvement (using quantum cloud services, small research group).
        3: Significant involvement (dedicated quantum software teams, active partnerships).
        4: High involvement (developing significant quantum software/hardware, major player).
        5: Maximum involvement (Quantum Computing is the core focus, industry leader like IBM, Google, Rigetti).

        Rules:
        - Return ONLY the integer score (0, 1, 2, 3, 4, or 5).
        - No explanation or text.
        
        Entity: ${name}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        const scoreMatch = responseText.match(/\d+/);
        const score = scoreMatch ? parseInt(scoreMatch[0]) : 0;
        const finalScore = Math.max(0, Math.min(5, score));

        // 3. Update DB if ID was provided
        if (id) {
            const Model = type === 'stock' ? Stock : News;
            await Model.findByIdAndUpdate(id, { $set: { quantumExposureScore: finalScore } });
        }

        return finalScore;
    } catch (error) {
        console.error(`Error calculating Quantum Exposure Score for ${name}:`, error);
        return 0;
    }
}
