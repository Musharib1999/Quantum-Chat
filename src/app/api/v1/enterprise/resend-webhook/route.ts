import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';

/**
 * Proxies a webhook resend request from the frontend to the target webhook URL.
 * This bypasses CORS restrictions since server-to-server calls are not subject to browser CORS policy.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await authenticateApiKey(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { webhookUrl, payload } = await req.json();

        if (!webhookUrl || !payload) {
            return NextResponse.json({ error: 'webhookUrl and payload are required' }, { status: 400 });
        }

        console.log(`[ResendProxy] Forwarding to ${webhookUrl} for Call ID: ${payload.callId}`);

        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000)
        });

        const responseText = await res.text();

        if (res.ok) {
            console.log(`[ResendProxy] Successfully delivered to ${webhookUrl}`);
            return NextResponse.json({ success: true, status: res.status });
        } else {
            console.error(`[ResendProxy] Target responded with ${res.status}: ${responseText}`);
            return NextResponse.json({ success: false, status: res.status, details: responseText }, { status: 502 });
        }

    } catch (error: any) {
        console.error('[ResendProxy] Error:', error.message);
        return NextResponse.json({ error: 'Proxy request failed', details: error.message }, { status: 500 });
    }
}
