import { NextRequest, NextResponse } from 'next/server';
import { debugStockFetch } from '@/app/actions/chat';

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();
        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const result = await debugStockFetch(prompt);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Stock Debug API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
