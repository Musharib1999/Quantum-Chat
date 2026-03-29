import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import DataPipeline from '@/models/DataPipeline';
import dbConnect from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        
        // Use API Key authentication since Enterprise Users have active API keys
        const user = await authenticateApiKey(req);
        if (!user || user.role !== 'enterprise') {
            return NextResponse.json({ error: 'Unauthorized: Enterprise API access required' }, { status: 401 });
        }

        // Fetch pipelines scoped ONLY to this exact enterprise user
        // We link via company name, or if we introduce linkedEmail later
        const pipelines = await DataPipeline.find({ 
            enterpriseName: new RegExp(`^${user.company}$`, 'i') 
        }).sort({ createdAt: -1 });

        return NextResponse.json({ success: true, pipelines });

    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch pipelines', message: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await dbConnect();
        const user = await authenticateApiKey(req);
        if (!user || user.role !== 'enterprise') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { pipelineId, webhookUrl } = body;

        if (!pipelineId || !webhookUrl) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        // Ensure this pipeline actually belongs to the user's company
        const pipeline = await DataPipeline.findOne({ 
            _id: pipelineId,
            enterpriseName: new RegExp(`^${user.company}$`, 'i') 
        });

        if (!pipeline) {
             return NextResponse.json({ error: 'Pipeline not found or permission denied' }, { status: 403 });
        }

        pipeline.webhookUrl = webhookUrl;
        await pipeline.save();

        return NextResponse.json({ success: true, pipeline });
    } catch (error: any) {
         return NextResponse.json({ error: 'Failed to update webhook URL', message: error.message }, { status: 500 });
    }
}
