import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';
import { gatewayAuth } from '@/lib/gatewayAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authRes = await gatewayAuth(req);
    if (!authRes.ok) {
      return authRes.response;
    }

    const body = await req.json();
    const backendUrl = getBackendUrl();

    const res = await fetch(`${backendUrl}/v3/enterprise/ide/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authRes.headers,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000), // 90-second timeout to allow queued simulator jobs to finish
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('[/api/ide/execute] Proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to connect to execution engine',
        stderr: `Execution Engine Notice: ${error.message || 'Service temporarily unavailable'}`
      },
      { status: 500 }
    );
  }
}
