"use server";

import dbConnect from '@/lib/db';
import SystemPrompt from '@/models/SystemPrompt';

/**
 * Common utility to fetch a dynamic system prompt from the database
 * and replace {{placeholders}} with actual values.
 */
export async function getDynamicPrompt(
    category: string,
    replacements: Record<string, any>,
    fallback: string
): Promise<string> {
    try {
        await dbConnect();
        const promptDoc = await SystemPrompt.findOne({ category }).lean();
        let template = promptDoc ? promptDoc.template : fallback;

        Object.keys(replacements).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            let val = replacements[key];
            if (val === undefined || val === null) val = '';

            // Handle objects by stringifying, otherwise use string conversion
            const replacementValue = typeof val === 'object' ? JSON.stringify(val) : String(val);
            template = template.replace(regex, replacementValue);
        });

        return template;
    } catch (error) {
        console.error(`Failed to load dynamic prompt for category: ${category}`, error);
        return fallback;
    }
}
