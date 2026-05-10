import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import Shot from '@/models/Shot';
import DataPipeline from '@/models/DataPipeline';
import QuantumForm from '@/models/QuantumForm';
import dbConnect from '@/lib/db';

/**
 * API Route to clear all telemetry data for a specific pipeline.
 * It deletes all Shot records associated with the pipeline's mapped problem.
 */
export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        // 1. Authenticate Request
        const user = await authenticateApiKey(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { pipelineId } = body;

        if (!pipelineId) {
            return NextResponse.json({ error: 'Pipeline ID is required' }, { status: 400 });
        }

        // 2. Find the Pipeline
        const pipeline = await DataPipeline.findOne({ _id: pipelineId, userId: user._id.toString() });
        if (!pipeline) {
            return NextResponse.json({ error: 'Pipeline not found or unauthorized' }, { status: 404 });
        }

        // 3. Find the associated QuantumForm (Blueprint) to get the problem name
        const blueprint = await QuantumForm.findById(pipeline.problemId);
        if (!blueprint) {
            return NextResponse.json({ error: 'Linked blueprint not found' }, { status: 404 });
        }

        // 4. Delete all matching shots
        const deleteResult = await Shot.deleteMany({
            userId: user._id.toString(),
            problem: blueprint.problem,
            source: { $in: ['API', 'Enterprise-Stream'] }
        });

        return NextResponse.json({
            success: true,
            message: `Cleared telemetry for ${blueprint.problem}. Total records removed: ${deleteResult.deletedCount}`,
            deletedCount: deleteResult.deletedCount
        });

    } catch (error: any) {
        console.error('Clear Telemetry Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Internal Gateway Error',
            message: error.message 
        }, { status: 500 });
    }
}
