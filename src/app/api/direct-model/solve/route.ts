import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Next.js API proxy for the Direct Optimization Model solving step.
 * Forces run_solver: true to solve the compiled QUBO on D-Wave simulator.
 */
export async function POST(req: NextRequest) {
    try {
        const { verifyUserSession } = await import('@/lib/auth');
        const verifiedEmail = await verifyUserSession(req);
        if (!verifiedEmail) {
            return NextResponse.json({ error: "Unauthorized - user session required" }, { status: 401 });
        }

        // Check D-Wave service status
        const { default: Hardware } = await import('@/models/Hardware');
        const dwaveService = await Hardware.findOne({ provider: 'dwave' });
        if (dwaveService && (dwaveService.status === 'Offline' || dwaveService.status === 'Maintenance')) {
            return NextResponse.json({ error: `D-Wave solver service is currently disabled by administrator (status: ${dwaveService.status}).` }, { status: 503 });
        }

        const body = await req.json();
        const { model_text, penalty_choice, num_reads, session_id } = body;
        const email = verifiedEmail;

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8002";

        const response = await fetch(`${backendUrl}/v3/direct-model/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model_text,
                penalty_choice: penalty_choice ?? 3,
                num_reads: num_reads ?? 5000,
                email: email ?? null,
                session_id: session_id ?? null,
                run_solver: true, // Solve the model!
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            return NextResponse.json({ error: `Backend error: ${errText}` }, { status: response.status });
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        const customStream = new ReadableStream({
            async start(controller) {
                if (!reader) { controller.close(); return; }
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) { controller.close(); break; }
                    controller.enqueue(encoder.encode(decoder.decode(value)));
                }
            }
        });

        return new Response(customStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('[/api/direct-model/solve] Error:', error);
        return NextResponse.json({ error: error.message || 'Direct model solve failed' }, { status: 500 });
    }
}
