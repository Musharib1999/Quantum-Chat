import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import Shot from '@/models/Shot';
import DataPipeline from '@/models/DataPipeline';
import dbConnect from '@/lib/db';
import axios from 'axios';

/**
 * Self-Healing Dead Letter Queue (DLQ) Processor
 * Finds all Enterprise stream executions where the webhook delivery failed,
 * and automatically attempts to resend them to the current pipeline URL.
 */
export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        // 1. Authenticate Request
        const user = await authenticateApiKey(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Find all failed webhooks for this user's streams
        const failedShots = await Shot.find({
            userId: user._id.toString(),
            webhookStatus: 'failed',
            source: 'Enterprise-Stream'
        }).limit(50); // Process in batches to avoid timeout

        if (failedShots.length === 0) {
            return NextResponse.json({ success: true, message: 'No failed webhooks found. System is healthy.' });
        }

        const pipelines = await DataPipeline.find({ userId: user._id.toString(), status: 'active' });
        let successCount = 0;
        let failCount = 0;

        // 3. Process the Dead Letter Queue
        for (const shot of failedShots) {
            try {
                // Find the associated pipeline (using enterprise name matching or just fallback to active)
                const pipeline = pipelines.find(p => p.enterpriseName === shot.parameters?.enterprise) || pipelines[0];
                
                if (!pipeline || !pipeline.webhookUrl) {
                    continue; // Skip if pipeline is gone or has no URL
                }

                // Reconstruct Payload
                const callId = shot.parameters?.call?.call_id || shot.parameters?.callId || shot.parameters?.id || 'N/A';
                const payload = {
                    callId,
                    enterprise: pipeline.enterpriseName || 'Unknown Enterprise',
                    status: shot.results?.error ? 'failed' : 'success',
                    solutions: [{
                        hardware: shot.hardware,
                        shotId: shot._id.toString(),
                        status: shot.results?.error ? 'failed' : 'success',
                        results: shot.results,
                        executionTimeMs: shot.executionTimeMs || 0
                    }],
                    totalExecutionTimeMs: shot.executionTimeMs || 0,
                    timestamp: new Date().toISOString(),
                    isRetry: true // Flag to tell receiver this is a self-healed payload
                };

                // Attempt Delivery
                await axios.post(pipeline.webhookUrl, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 5000
                });

                // Update Database on Success
                await Shot.findByIdAndUpdate(shot._id, { 
                    $set: { webhookStatus: 'success' },
                    $inc: { webhookRetries: 1 }
                });
                successCount++;

            } catch (error) {
                // Keep it failed, but increment retry count
                await Shot.findByIdAndUpdate(shot._id, { 
                    $inc: { webhookRetries: 1 }
                });
                failCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed DLQ. Successfully healed ${successCount} webhooks. Failed to heal ${failCount} webhooks.`,
            stats: { healed: successCount, stillFailed: failCount }
        });

    } catch (error: any) {
        console.error('Webhook Healing API Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Internal Gateway Error' 
        }, { status: 500 });
    }
}
