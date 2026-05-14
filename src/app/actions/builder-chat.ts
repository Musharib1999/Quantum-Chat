'use server';

import Groq from 'groq-sdk';
import LLMSetting from '@/models/LLMSetting';
import dbConnect from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Dedicated chat action for the Pipeline Builder's Optimization Coach.
 * Takes a fully custom system prompt and bypasses the full chatWithGroq pipeline
 * (no guardrails, no KB lookup, no mode routing) for fast, direct LLM access.
 */
export async function builderChat(
  userMessage: string,
  systemPrompt: string
): Promise<{ text: string; error?: string }> {
  try {
    await dbConnect();

    // Fetch the active LLM provider from DB
    let activeProvider = 'groq';
    let activeModel = 'llama-3.1-8b-instant';

    try {
      const settings = await LLMSetting.findOne({ isDefault: true }).lean();
      if (settings) {
        activeProvider = settings.activeProvider as string;
        activeModel = settings.activeModel as string;
      }
    } catch (e) {
      console.warn('[builderChat] Could not fetch LLM settings, defaulting to Groq.');
    }

    let responseText = '';

    if (activeProvider === 'groq' && process.env.GROQ_API_KEY) {
      const completion = await groqClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        model: activeModel,
        temperature: 0.5,
        max_tokens: 800,
      });
      responseText = completion.choices[0]?.message?.content || '';
    } else if (process.env.GEMINI_API_KEY) {
      const model = genAI.getGenerativeModel({ model: activeModel || 'gemini-2.0-flash-lite' });
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: userMessage },
      ]);
      responseText = result.response.text();
    } else {
      throw new Error('No LLM provider configured.');
    }

    return { text: responseText };
  } catch (error: any) {
    console.error('[builderChat] Error:', error.message);
    return { text: '', error: error.message };
  }
}
