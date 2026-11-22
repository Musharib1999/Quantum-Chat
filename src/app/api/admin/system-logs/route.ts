import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SystemLog from '@/models/SystemLog';
import { verifyAdminCookies } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        if (!(await verifyAdminCookies())) {
            return NextResponse.json({ error: 'Unauthorized — admin session required.' }, { status: 401 });
        }
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const limitParam = searchParams.get('limit') || '100';
        const service = searchParams.get('service');
        const logType = searchParams.get('logType');

        const limit = parseInt(limitParam, 10) || 100;
        const query: any = {};

        if (service && service !== 'all') {
            query.service = service;
        }
        if (logType && logType !== 'all') {
            query.logType = logType;
        }

        // Incremental fetch: if a "since" cursor is provided, only return
        // logs newer than that timestamp (avoids re-fetching the full list)
        const since = searchParams.get("since");
        if (since) {
            query.timestamp = { $gt: new Date(since) };
        }

        const logs = await SystemLog.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        return NextResponse.json(logs);

    } catch (error: any) {
        console.error('[Admin System Logs API Error]:', error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
