import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';

// A simple schema for Classical Demo calls
const ClassicalCallSchema = new mongoose.Schema({
    callId: String,
    customer: String,
    phone: String,
    domain: String,
    language: String,
    timestamp: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' }
});

const ClassicalCall = mongoose.models.ClassicalCall || mongoose.model('ClassicalCall', ClassicalCallSchema);

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        // 1. Authenticate
        const user = await authenticateApiKey(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Payload
        const body = await req.json();
        const { payload } = body;
        const callData = payload?.call || payload;

        // 3. Store for Classical Dashboard
        const newCall = await ClassicalCall.create({
            callId: callData.call_id,
            customer: callData.customer,
            phone: callData.phone,
            domain: callData.domain,
            language: callData.language,
            timestamp: callData.timestamp || new Date()
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Call received by Classical Engine',
            id: newCall._id 
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        const calls = await ClassicalCall.find()
            .sort({ timestamp: -1 })
            .limit(limit);

        return NextResponse.json({
            success: true,
            data: calls
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
