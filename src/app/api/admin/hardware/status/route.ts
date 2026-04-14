import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Performs a real-time connectivity check (ping) on a backend service URL.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { serviceUrl, provider, testCode, testOutput } = body;

        if (!serviceUrl) {
            return NextResponse.json({ 
                success: false, 
                status: 'Offline', 
                error: 'No Service URL configured for this node.' 
            }, { status: 200 }); // Status 200 so UI can handle the message
        }

        // Implementation of a short-timeout "ping" using fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sec timeout for actual code execution

        try {
            let baseUrl = serviceUrl.replace(/\/+$/, '');
            
            // Auto-prepend protocol if missing (common cause of "Network unreachable")
            if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
                baseUrl = `https://${baseUrl}`;
            }

            // Authentication selection: Prefer provider-specific keys if configured
            let API_SECRET = process.env.API_SECRET_KEY || "dev_secret_key_123";
            if (provider === 'dwave' && process.env.DWAVE_API_KEY) {
                API_SECRET = process.env.DWAVE_API_KEY;
            }
            
            let response;
            if (testCode && testCode.trim().length > 0) {
                // Perform a robust dry-run execution check
                response = await fetch(`${baseUrl}/execute`, {
                    method: 'POST',
                    headers: { 'X-API-Key': API_SECRET, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: testCode }),
                    signal: controller.signal,
                    cache: 'no-store'
                });
            } else {
                // Fallback to basic ping if no test code is provided
                response = await fetch(serviceUrl, {
                    method: 'GET',
                    headers: { 'X-API-Key': API_SECRET },
                    signal: controller.signal,
                    cache: 'no-store'
                });
            }

            clearTimeout(timeoutId);

            // Granular status interpretation
            if (response.status === 401) {
                return NextResponse.json({ 
                    success: false, 
                    status: 'Unauthorized', 
                    error: 'Authentication failed. Check your API_SECRET_KEY settings.' 
                });
            }

            if (response.status >= 500) {
                 return NextResponse.json({ 
                    success: false, 
                    status: 'Offline', 
                    error: `Server reported error: ${response.status}` 
                });
            }

            // If we ran a test code, validate the output
            if (testCode && testCode.trim().length > 0) {
                const result = await response.json();
                if (!result.success && result.error) {
                    return NextResponse.json({
                        success: false,
                        status: 'Offline',
                        error: `Execution Failed: ${result.error}`
                    });
                }

                // If admin provided expected output, strictly match it
                if (testOutput && testOutput.trim().length > 0) {
                    const actualOut = (result.output || '').trim();
                    if (actualOut.includes(testOutput.trim())) {
                        return NextResponse.json({ success: true, status: 'Online' });
                    } else {
                        return NextResponse.json({
                            success: false,
                            status: 'Offline',
                            error: `Output Mismatch. Expected '${testOutput}' but got '${actualOut}'`
                        });
                    }
                }
            }

            return NextResponse.json({ success: true, status: 'Online' });

        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            const isTimeout = fetchError.name === 'AbortError';
            return NextResponse.json({ 
                success: false, 
                status: 'Offline', 
                error: isTimeout ? 'Connection timed out after 10s' : 'Network unreachable'
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
