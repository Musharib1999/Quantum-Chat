"use server";

import dbConnect from '@/lib/db';
import SystemPrompt from '@/models/SystemPrompt';

async function inspectPrompts() {
    await dbConnect();
    const prompts = await SystemPrompt.find({
        category: { $in: ['industry_template_fill', 'industry_json_wrapper'] }
    }).lean();

    console.log("--- DATABASE PROMPT INSPECTION ---");
    console.log(JSON.stringify(prompts, null, 2));
    console.log("----------------------------------");
    process.exit(0);
}

inspectPrompts();
