import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * API route to execute python code locally on the server.
 * Used by CodeBlockRunner when users click "Execute Code" in the chat interface.
 */
export async function POST(req: NextRequest) {
    try {
        const { verifyUserSession } = await import('@/lib/auth');
        const email = await verifyUserSession(req);
        if (!email) {
            return NextResponse.json({ success: false, error: "Unauthorized - user session required" }, { status: 401 });
        }

        const { code } = await req.json();

        // Introspect code to determine the target provider
        const isDWave = code.includes('dwave') || code.includes('neal') || code.includes('dimod');
        const { default: Hardware } = await import('@/models/Hardware');
        
        if (isDWave) {
            // Check D-Wave service status
            const dwaveService = await Hardware.findOne({ provider: 'dwave' });
            if (dwaveService && (dwaveService.status === 'Offline' || dwaveService.status === 'Maintenance')) {
                return NextResponse.json({
                    success: false,
                    output: "",
                    error: `D-Wave solver service is currently disabled by administrator (status: ${dwaveService.status}).`
                }, { status: 503 });
            }
        } else {
            // Check Qiskit service status
            const qiskitService = await Hardware.findOne({ provider: 'ibm' });
            if (qiskitService && (qiskitService.status === 'Offline' || qiskitService.status === 'Maintenance')) {
                return NextResponse.json({
                    success: false,
                    output: "",
                    error: `Qiskit simulation service is currently disabled by administrator (status: ${qiskitService.status}).`
                }, { status: 503 });
            }
        }
        if (!code) {
            return NextResponse.json({ success: false, error: "No code provided" }, { status: 400 });
        }

        // Create a temporary file name in the project scratch directory
        const tempDir = path.join(process.cwd(), 'scratch');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempFile = path.join(tempDir, `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.py`);
        
        // Write the code to the temp file
        fs.writeFileSync(tempFile, code);

        // Run python3 on the temp file
        return new Promise<NextResponse>((resolve) => {
            exec(`python3 ${tempFile}`, (error, stdout, stderr) => {
                // Delete the temp file
                try {
                    if (fs.existsSync(tempFile)) {
                        fs.unlinkSync(tempFile);
                    }
                } catch (e) {
                    console.error("Failed to delete temp file:", e);
                }

                if (error) {
                    resolve(NextResponse.json({
                        success: false,
                        output: stdout,
                        error: stderr || error.message
                    }));
                } else {
                    resolve(NextResponse.json({
                        success: true,
                        output: stdout,
                        error: stderr || ""
                    }));
                }
            });
        });

    } catch (e: any) {
        console.error("[/api/developer/execute] Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
