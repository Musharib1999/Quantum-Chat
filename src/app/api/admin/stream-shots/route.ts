import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Shot from '@/models/Shot';

export const dynamic = 'force-dynamic';

/**
 * Dedicated API route for fetching live Enterprise Stream shots.
 * This is intentionally a REST endpoint (NOT a Server Action) to bypass
 * Next.js caching and ensure the Live Visualizer always gets fresh data.
 */
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '5');

        const shots = await Shot.find(
            { source: 'Enterprise-Stream' },
            {
                _id: 1,
                userId: 1,
                industry: 1,
                service: 1,
                problem: 1,
                hardware: 1,
                parameters: 1,
                results: 1,
                timestamp: 1,
                source: 1,
            }
        )
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        const formatted = shots.map((s: any) => ({
            ...s,
            _id: s._id.toString(),
            timestamp: s.timestamp.toISOString(),
        }));

        return NextResponse.json(
            { success: true, shots: formatted },
            {
                headers: {
                    'Cache-Control': 'no-store, max-age=0',
                    'CDN-Cache-Control': 'no-store',
                },
            }
        );
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
