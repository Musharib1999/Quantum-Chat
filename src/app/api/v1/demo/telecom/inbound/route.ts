import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import dbConnect from '@/lib/db';
import Shot from '@/models/Shot';
import mongoose from 'mongoose';

// A simple schema for Classical Demo calls (kept for backward compatibility with POST requests if any)
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

        // Fetch recent shots from the Telecom industry calculations performed by Prime Blazar
        const shots = await Shot.find({ industry: 'Telecom' })
            .sort({ timestamp: -1 })
            .limit(limit);

        // Map the shots to the format expected by the TelecomAssignmentDashboard
        const mappedCalls = shots.map(shot => {
            const callParams = shot.parameters?.call || {};
            return {
                _id: shot._id,
                callId: callParams.call_id || `CALL-${shot._id.toString().slice(-6)}`,
                customer: `${callParams.domain || 'Telecom'} Customer`, // Using domain as there's no name in payload
                phone: callParams.call_id || 'N/A', // Using call_id as phone placeholder
                domain: callParams.domain || 'General',
                language: callParams.language || 'English',
                timestamp: callParams.timestamp || shot.timestamp,
                status: 'Pending'
            };
        });

        return NextResponse.json({
            success: true,
            data: mappedCalls
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
