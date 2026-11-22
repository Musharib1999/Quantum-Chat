import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';
import { verifyUserSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const verifiedEmail = await verifyUserSession(req);
    if (!verifiedEmail) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please sign in to use data connectors.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action } = body; // 'ingress_csv' or 'egress_export'
    const backendUrl = getBackendUrl();

    if (action === 'ingress_csv') {
      const resp = await fetch(`${backendUrl}/v3/enterprise/connectors/ingress/csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.payload),
      });
      const data = await resp.json();
      return NextResponse.json(data, { status: resp.status });
    } else if (action === 'egress_export') {
      const resp = await fetch(`${backendUrl}/v3/enterprise/connectors/egress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
