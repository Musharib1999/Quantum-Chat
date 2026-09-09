import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = getBackendUrl();

    const res = await fetch(`${backendUrl}/v3/enterprise/ide/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('[/api/ide/agent/chat] Proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        response_text: "AI is under maintenance, will be working shortly.",
        error: error.message
      },
      { status: 500 }
    );
  }
}
