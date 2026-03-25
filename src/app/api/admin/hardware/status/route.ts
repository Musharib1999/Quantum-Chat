import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Performs a real-time connectivity check (ping) on a backend service URL.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { serviceUrl } = body;

        if (!serviceUrl) {
            return NextResponse.json({ 
                success: false, 
                status: 'Offline', 
                error: 'No Service URL configured for this node.' 
            }, { status: 200 }); // Status 200 so UI can handle the message
        }

        // Implementation of a short-timeout "ping" using fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout

        try {
            // We just need to see if the server responds at all
            const response = await fetch(serviceUrl, {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-store'
            });

            clearTimeout(timeoutId);

            // Even if it returns 401/404, the server is "Online" (Reachable)
            // Error codes like 500+ or network errors denote "Offline"
            if (response.status < 500) {
                return NextResponse.json({ success: true, status: 'Online' });
            } else {
                return NextResponse.json({ success: false, status: 'Offline', error: `Server error: ${response.status}` });
            }
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            const isTimeout = fetchError.name === 'AbortError';
            return NextResponse.json({ 
                success: false, 
                status: 'Offline', 
                error: isTimeout ? 'Connection timed out after 5s' : 'Network unreachable'
            });
        }

    } catch (error: any) {
        return NextResponse.json({ 
            success: false, 
            status: 'Offline', 
            error: 'Internal Request Error' 
        }, { status: 500 });
    }
}
