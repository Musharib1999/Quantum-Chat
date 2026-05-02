import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import Shot from '@/models/Shot';
import dbConnect from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        // 1. Authenticate Request
        const user = await authenticateApiKey(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user._id.toString();

        // 2. Aggregate Metrics
        // Total Executed Requests (API + Stream)
        const totalExecuted = await Shot.countDocuments({ 
            userId, 
            source: { $in: ['API', 'Enterprise-Stream'] } 
        });

        // Average Execution Time (Successful shots only)
        const avgResult = await Shot.aggregate([
            { $match: { userId, results: { $exists: true }, 'results.error': null } },
            { $group: { _id: null, avgTime: { $avg: '$results.executionTimeMs' } } }
        ]);

        const avgTime = avgResult.length > 0 ? Math.round(avgResult[0].avgTime * 10) / 10 : 0;

        // Success Rate
        const successfulShots = await Shot.countDocuments({ 
            userId, 
            'results.error': null 
        });
        const successRate = totalExecuted > 0 ? Math.round((successfulShots / totalExecuted) * 1000) / 10 : 100;

        // Simulated Request Queue (Since it's synchronous right now)
        // In a real production system, this would query Redis or a Message Queue
        const simulatedQueue = 0; 

        return NextResponse.json({
            success: true,
            metrics: {
                totalRequests: totalExecuted,
                avgExecutionTime: avgTime,
                requestQueue: simulatedQueue,
                successRate: successRate,
                monthlyLimit: 10000, // Hardcoded for now
                lastUpdated: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Metrics API Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Internal Gateway Error' 
        }, { status: 500 });
    }
}
