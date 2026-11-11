import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';
import { gatewayAuth } from '@/lib/gatewayAuth';
import Hardware from '@/models/Hardware';

export const dynamic = 'force-dynamic';

/**
 * Proxies code execution requests from CodeBlockRunner to the Python backend sandbox
 * (/v2/execute) with authenticated gateway headers and sandbox guardrails.
 */
export async function POST(req: NextRequest) {
    try {
        const authRes = await gatewayAuth(req);
        if (!authRes.ok) {
            return authRes.response;
        }

        const { code } = await req.json();
        if (!code || !code.trim()) {
            return NextResponse.json({ success: false, error: "No code provided for execution." }, { status: 400 });
        }

        // Introspect code to determine the target provider
        const isDWave = code.includes('dwave') || code.includes('neal') || code.includes('dimod');
        
        try {
            if (isDWave) {
                const dwaveService = await Hardware.findOne({ provider: 'dwave' });
                if (dwaveService && (dwaveService.status === 'Offline' || dwaveService.status === 'Maintenance')) {
                    return NextResponse.json({
                        success: false,
                        output: "",
                        error: `D-Wave solver service is currently disabled by administrator (status: ${dwaveService.status}).`
                    }, { status: 503 });
                }
            } else {
                const qiskitService = await Hardware.findOne({ provider: 'ibm' });
                if (qiskitService && (qiskitService.status === 'Offline' || qiskitService.status === 'Maintenance')) {
                    return NextResponse.json({
                        success: false,
                        output: "",
                        error: `Qiskit simulation service is currently disabled by administrator (status: ${qiskitService.status}).`
                    }, { status: 503 });
                }
            }
        } catch (dbErr) {
            // Non-fatal if DB check glitches
        }

        const backendUrl = getBackendUrl();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...authRes.headers
        };

        const res = await fetch(`${backendUrl}/v2/execute`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                code,
                email: authRes.identity?.email || null
            }),
            signal: AbortSignal.timeout(45000),
        });

        if (!res.ok) {
            const errText = await res.text();
            return NextResponse.json(
                { success: false, output: "", error: `Execution engine error (${res.status}): ${errText}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json({
            success: data.success ?? true,
            output: data.output || "",
            error: data.error || null
        });

    } catch (e: any) {
        console.error("[/api/developer/execute] Proxy error:", e);
        return NextResponse.json({
            success: false,
            output: "",
            error: e.message || "Failed to reach execution backend"
        }, { status: 500 });
    }
}
