import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import DataPipeline from '@/models/DataPipeline';
import dbConnect from '@/lib/db';
import { processEnterpriseStream } from '@/lib/enterprise/queue-handler';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        // 1. Authenticate the Enterprise Client
        const user = await authenticateApiKey(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Invalid or missing API Key' }, { status: 401 });
        }

        if (user.role !== 'enterprise' && user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Streaming API requires Enterprise permissions' }, { status: 403 });
        }

        // 2. Parse payload
        const body = await req.json();
        const { pipelineId, payload } = body;

        if (!pipelineId || !payload || typeof payload !== 'object') {
            return NextResponse.json({ 
                error: 'Bad Request: Requires pipelineId and payload (JSON object)' 
            }, { status: 400 }); // Immediate rejection of bad data (Requirement from Business Rules)
        }

        // 3. Validate Pipeline Status
        const pipeline = await DataPipeline.findById(pipelineId).lean() as any;
        if (!pipeline) {
            return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
        }

        if (pipeline.status !== 'active') {
            return NextResponse.json({ error: `Pipeline is currently ${pipeline.status}. Must be active to accept streams.` }, { status: 403 });
        }

        // 4. Synchronous Execution & Outbound Push
        // In a true decoupled Redis environment, we would dump to queue here and return 202.
        // For Vercel Serverless, we await execution to prevent the Lambda from terminating prematurely.
        console.log(`[Stream-API] Received payload for pipeline ${pipelineId}`);
        
        try {
            // Unpack execution
            const result = await processEnterpriseStream(payload, pipeline, user._id.toString());
            
            return NextResponse.json({
                success: true,
                message: 'Payload processed and webhook dispatched successfully',
                shotId: result.shotId,
                durationMs: result.durationMs,
                queueStatus: 'Synchronous delivery'
            }, { status: 200 });

        } catch (execError: any) {
             return NextResponse.json({ 
                error: 'Simulation/Embedding Failure', 
                details: execError.message 
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Enterprise Stream Error:', error);
        return NextResponse.json({ 
            error: 'Internal Gateway Error', 
            message: error.message 
        }, { status: 500 });
    }
}
