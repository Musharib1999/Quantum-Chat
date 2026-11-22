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
    const { action } = body; // 'ingress_csv' or 'egress_export'
    const backendUrl = getBackendUrl();
    const headers = { 'Content-Type': 'application/json', ...authRes.headers };

    if (action === 'ingress_csv') {
      const resp = await fetch(`${backendUrl}/v3/enterprise/connectors/ingress/csv`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body.payload),
      });
      const data = await resp.json();
      return NextResponse.json(data, { status: resp.status });
    } else if (action === 'egress_export') {
      const resp = await fetch(`${backendUrl}/v3/enterprise/connectors/egress`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body.payload),
      });
      const data = await resp.json();
      return NextResponse.json(data, { status: resp.status });
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
