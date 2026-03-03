import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import News from '@/models/News';

import { automateNewsSummarization } from '@/app/actions/news-automation';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        await dbConnect();

        console.log("[Admin API] Triggering automated news scraping and summarization...");

        // This handles fetching, deduplication, and LLM summarization
        const result = await automateNewsSummarization();

        if (!result.success) {
            return NextResponse.json({
                error: result.error || result.message || 'Scraping failed'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: result.message,
            totalProcessed: result.total
        });

    } catch (error: any) {
        console.error("Scraping route error:", error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
