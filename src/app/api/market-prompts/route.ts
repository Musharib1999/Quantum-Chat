import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import MarketPrompt from '@/models/MarketPrompt';

export async function GET() {
    try {
        await dbConnect();
        // Only fetch active prompts for the public frontend
        const prompts = await MarketPrompt.find({ isActive: true })
            .sort({ order: 1, createdAt: -1 })
            .select('label query'); // Only send necessary data to frontend

        return NextResponse.json(prompts);
    } catch (error) {
        console.error('Error fetching public market prompts:', error);
        return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
    }
}
