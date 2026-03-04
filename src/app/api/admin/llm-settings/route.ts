import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LLMSetting from '@/models/LLMSetting';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();
    try {
        let setting = await LLMSetting.findOne({ key: "global_llm_settings" });
        if (!setting) {
            setting = await LLMSetting.create({
                key: "global_llm_settings",
                activeProvider: 'gemini',
                activeModel: 'gemini-2.0-flash-lite'
            });
        }
        return NextResponse.json(setting);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch LLM settings' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    await dbConnect();
    try {
        const body = await req.json();
        const { activeProvider, activeModel } = body;

        let setting = await LLMSetting.findOneAndUpdate(
            { key: "global_llm_settings" },
            {
                activeProvider,
                activeModel,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        return NextResponse.json(setting);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update LLM settings' }, { status: 500 });
    }
}
