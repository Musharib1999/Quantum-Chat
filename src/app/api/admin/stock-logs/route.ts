import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChatLog from '@/models/ChatLog';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        // Fetch logs where mode is 'market' or ticker is present
        const logs = await ChatLog.find({
            $or: [
                { mode: 'market' },
                { ticker: { $exists: true, $ne: 'NULL' } }
            ]
        }).sort({ timestamp: -1 }).limit(50).lean();

        return NextResponse.json(logs);
    } catch (error: any) {
        console.error('Fetch Stock Logs Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
