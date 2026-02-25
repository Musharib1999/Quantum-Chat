import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SystemPrompt from '@/models/SystemPrompt';
import { seedSystemPrompts } from '@/lib/seed-prompts';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();

        // Auto-seed if empty to prevent UI crashing on first load
        await seedSystemPrompts();

        const prompts = await SystemPrompt.find({}).sort({ title: 1 }).lean();
        return NextResponse.json({ success: true, count: prompts.length, data: prompts });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();

        const { category, template } = body;

        if (!category || !template) {
            return NextResponse.json({ success: false, error: 'Category and template are required' }, { status: 400 });
        }

        const updatedPrompt = await SystemPrompt.findOneAndUpdate(
            { category },
            { template },
            { new: true, runValidators: true }
        );

        if (!updatedPrompt) {
            return NextResponse.json({ success: false, error: 'Prompt category not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedPrompt });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
