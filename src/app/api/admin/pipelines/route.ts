import { NextRequest, NextResponse } from 'next/server';
import DataPipeline from '@/models/DataPipeline';
import dbConnect from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const pipelines = await DataPipeline.find().sort({ createdAt: -1 });
        return NextResponse.json({ success: true, pipelines });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch pipelines', message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        
        // Ensure problem mapping and URL exist
        if (!body.enterpriseName || !body.problemId || !body.webhookUrl) {
            return NextResponse.json({ error: 'Missing required fields (enterpriseName, problemId, webhookUrl)' }, { status: 400 });
        }

        const pipeline = await DataPipeline.create({
            enterpriseName: body.enterpriseName,
            description: body.description || '',
            problemId: body.problemId,
            webhookUrl: body.webhookUrl,
            status: body.status || 'draft',
            apiKeyPreview: body.apiKeyPreview || '****' // Admin manually links or records key suffix
        });

        return NextResponse.json({ success: true, pipeline });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to create pipeline', message: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        
        if (!body.pipelineId || !body.status) {
            return NextResponse.json({ error: 'Missing required fields (pipelineId, status)' }, { status: 400 });
        }

        const pipeline = await DataPipeline.findById(body.pipelineId);
        if (!pipeline) {
            return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
        }

        pipeline.status = body.status;
        await pipeline.save();

        return NextResponse.json({ success: true, pipeline });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to update pipeline status', message: error.message }, { status: 500 });
    }
}
