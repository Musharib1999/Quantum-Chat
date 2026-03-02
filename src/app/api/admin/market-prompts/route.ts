import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import MarketPrompt from '@/models/MarketPrompt';

export async function GET() {
    try {
        await dbConnect();
        const prompts = await MarketPrompt.find().sort({ order: 1, createdAt: -1 });
        return NextResponse.json(prompts);
    } catch (error) {
        console.error('Error fetching market prompts:', error);
        return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const data = await req.json();

        // Basic validation
        if (!data.label || !data.query) {
            return NextResponse.json({ error: 'Label and Query are required' }, { status: 400 });
        }

        const newPrompt = await MarketPrompt.create({
            label: data.label,
            query: data.query,
            isActive: data.isActive !== undefined ? data.isActive : true,
            order: data.order || 0
        });

        return NextResponse.json(newPrompt, { status: 201 });
    } catch (error) {
        console.error('Error creating market prompt:', error);
        return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
    }
}
