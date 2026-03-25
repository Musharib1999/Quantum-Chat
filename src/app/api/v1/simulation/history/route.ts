import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import Experiment from '@/models/Experiment';
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

        // 3. Fetch user's simulation experiments from the API source
        const experiments = await Experiment.find({ 
            userId: user._id, 
            source: 'API' 
        })
        .sort({ timestamp: -1 })
        .limit(limit);

        return NextResponse.json({
            success: true,
            total: experiments.length,
            experiments: experiments.map(exp => ({
                id: exp._id,
                timestamp: exp.timestamp,
                provider: exp.service,
                problem: exp.problem,
                hardware: exp.hardware,
                energy: exp.results?.energy || null,
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
