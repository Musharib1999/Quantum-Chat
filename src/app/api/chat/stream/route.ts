import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { verifyUserSession } = await import('@/lib/auth');
        const verifiedEmail = await verifyUserSession(req);
        if (!verifiedEmail) {
            return NextResponse.json({ error: "Unauthorized - user session required" }, { status: 401 });
        }

        const body = await req.json();
        const { unstructured_problem, mode, session_id, penalty_choice } = body;
        const email = verifiedEmail; // Force verified email from HttpOnly session cookie

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8002";

        const response = await fetch(`${backendUrl}/v3/enterprise/pipeline/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                unstructured_problem,
                mode: mode || 'auto',
                session_id,
                email: email || null,
                penalty_choice: penalty_choice ?? 3
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            return NextResponse.json({ error: `Backend streaming error: ${errText}` }, { status: response.status });
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        const customStream = new ReadableStream({
            async start(controller) {
                if (!reader) {
                    controller.close();
                    return;
                }
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                        break;
                    }
                    const chunk = decoder.decode(value);
                    controller.enqueue(encoder.encode(chunk));
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
        console.error("[Next.js Chat Stream Route Exception]:", error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
