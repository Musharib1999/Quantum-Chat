import { NextResponse } from 'next/server';
import { automateNewsSummarization } from '@/app/actions/news-automation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 1. Simple Security Check (Optional: add a secret token for CRON)
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // In production, compare with environment variable NEWS_REFRESH_TOKEN
    // if (token !== process.env.NEWS_REFRESH_TOKEN) {
    //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    try {
        console.log("[API] Starting manual news refresh...");
        const result = await automateNewsSummarization();

        return NextResponse.json({
            success: true,
            message: result.message,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("[API] Failed to refresh news:", error);
        return NextResponse.json({
            success: false,
            error: String(error)
        }, { status: 500 });
    }
}
