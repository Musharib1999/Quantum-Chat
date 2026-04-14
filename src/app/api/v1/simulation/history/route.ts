import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import Shot from '@/models/Shot';
import dbConnect from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        // 1. Authenticate Request via API Key
        const user = await authenticateApiKey(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Invalid or missing API Key' }, { status: 401 });
        }

        // 2. Parse Query Parameters
        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

        // 3. Fetch user's simulation experiments (API and Enterprise Streams)
        const total = await Shot.countDocuments({ 
            userId: user._id, 
            source: { $in: ['API', 'Enterprise-Stream'] } 
        });

        const shots = await Shot.find({ 
            userId: user._id, 
            source: { $in: ['API', 'Enterprise-Stream'] } 
        })
        .sort({ timestamp: -1 })
        .limit(limit);

        return NextResponse.json({
            success: true,
            total,
            data: shots.map(shot => ({
                id: shot._id,
                timestamp: shot.timestamp,
                provider: shot.service,
                problem: shot.problem,
                hardware: shot.hardware,
                source: shot.source,
                parameters: shot.parameters,
                results: shot.results,
                status: 'completed'
            }))
        });

    } catch (error: any) {
        console.error('API History Error:', error);
        return NextResponse.json({ 
            error: 'Internal Gateway Error',
            message: error.message 
        }, { status: 500 });
    }
}
