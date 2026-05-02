import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import DataPipeline from '@/models/DataPipeline';
import dbConnect from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        
        const user = await authenticateApiKey(req);
        if (!user || (user.role !== 'enterprise' && user.role !== 'admin')) {
            return NextResponse.json({ error: 'Unauthorized: Access denied' }, { status: 401 });
        }

        // 2. Build Query based on Role
        const query: any = {};
        if (user.role !== 'admin') {
            query.$or = [
                { userId: user._id.toString() },
                { enterpriseName: user.company ? new RegExp(`^${user.company}$`, 'i') : { $exists: false } },
                { enterpriseName: user.email ? new RegExp(`^${user.email}$`, 'i') : { $exists: false } }
            ];
        }

        // 3. Fetch pipelines
        const pipelines = await DataPipeline.find(query).sort({ createdAt: -1 });

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
        const { pipelineId, webhookUrl, status } = body;

        if (!pipelineId) return NextResponse.json({ error: 'Missing pipelineId' }, { status: 400 });

        // Ensure this pipeline actually belongs to the user
        const pipeline = await DataPipeline.findOne({ 
            _id: pipelineId,
            $or: [
                { userId: user._id.toString() },
                { enterpriseName: user.company ? new RegExp(`^${user.company}$`, 'i') : { $exists: false } },
                { enterpriseName: user.email ? new RegExp(`^${user.email}$`, 'i') : { $exists: false } }
            ]
        });

        if (!pipeline) {
             return NextResponse.json({ error: 'Pipeline not found or permission denied' }, { status: 403 });
        }

        if (webhookUrl !== undefined) pipeline.webhookUrl = webhookUrl;
        if (status !== undefined) pipeline.status = status;
        await pipeline.save();

        return NextResponse.json({ success: true, pipeline });
    } catch (error: any) {
         return NextResponse.json({ error: 'Failed to update webhook URL', message: error.message }, { status: 500 });
    }
}
