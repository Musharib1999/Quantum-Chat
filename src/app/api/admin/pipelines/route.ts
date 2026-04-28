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
            userId: body.userId, // Save the linked Enterprise User ID
            description: body.description || '',
            problemId: body.problemId,
            webhookUrl: body.webhookUrl,
            status: body.status || 'draft',
            apiKeyPreview: body.apiKeyPreview || '****'
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
        const { pipelineId, ...updates } = body;
        
        if (!pipelineId) {
            return NextResponse.json({ error: 'Missing pipelineId' }, { status: 400 });
        }

        const pipeline = await DataPipeline.findByIdAndUpdate(
            pipelineId,
            { ...updates, updatedAt: new Date() },
            { new: true }
        );

        if (!pipeline) {
            return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, pipeline });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to update pipeline', message: error.message }, { status: 500 });
    }
}
