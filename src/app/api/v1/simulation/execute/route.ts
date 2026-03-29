import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateApiKey } from '@/lib/api-auth';
import { executeQuantumCircuit, executeDWaveAnnealer, executeORTools } from '@/lib/quantum-simulator';
import Shot from '@/models/Shot';
import User from '@/models/User';
import dbConnect from '@/lib/db';

// Strict validation schema using Zod as requested
const executeSchema = z.object({
    provider: z.enum(['dwave', 'qiskit', 'ortools']),
    hardware: z.enum(['simulator', 'qpu', 'hybrid']),
    code: z.string().min(1),
    metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        // 1. Authenticate Request via API Key
        const user = await authenticateApiKey(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Invalid or missing API Key' }, { status: 401 });
        }

        // 2. Validate Input Schema (Strict Zod)
        const body = await req.json();
        const result = executeSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ 
                error: 'Validation failed', 
                details: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`) 
            }, { status: 400 });
        }

        const { provider, hardware, code, metadata } = result.data;

        // 3. Check Usage Limits
        if (user.simMinutesUsed >= user.simMinutesLimit) {
            return NextResponse.json({ 
                error: 'Usage limit reached. Please contact administration to upgrade your plan.',
                usage: { limit: user.simMinutesLimit, used: user.simMinutesUsed }
            }, { status: 403 });
        }

        const startTime = Date.now();
        let executionResult: any;

        // 4. Dispatch to the corresponding microservice
        console.log(`[API-Gateway] Routing ${provider.toUpperCase()} execution for user: ${user.email}`);
        
        if (provider === 'qiskit') {
            executionResult = await executeQuantumCircuit(code);
        } else if (provider === 'dwave') {
            executionResult = await executeDWaveAnnealer(code);
        } else if (provider === 'ortools') {
            executionResult = await executeORTools(code);
        }

        const durationMs = Date.now() - startTime;
        const durationMin = durationMs / 60000;

        // 5. Update User Usage Statistics
        await User.findByIdAndUpdate(user._id, {
            $inc: { simMinutesUsed: durationMin }
        });

        // 6. Log the shot for Administrative Auditing
        const shot = await Shot.create({
            userId: user._id,
            timestamp: new Date(),
            industry: 'API-External',
            service: provider.toUpperCase(),
            problem: (metadata?.label as string) || 'External API Execution',
            hardware: hardware,
            parameters: metadata || {},
            qiskitCode: code,
            results: executionResult,
            analysis: 'External API Execution - Automated Result Synthesis',
            source: 'API' // Specifically tagged for admin filtering
        });

        return NextResponse.json({
            success: true,
            shotId: shot._id,
            provider,
            hardware,
            results: executionResult,
            usage: {
                incrementMin: parseFloat(durationMin.toFixed(5)),
                totalUsedMin: parseFloat((user.simMinutesUsed + durationMin).toFixed(5)),
                limitMin: user.simMinutesLimit
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('API-Gateway Error:', error);
        return NextResponse.json({ 
            error: 'Internal Gateway Error', 
            message: error.message 
        }, { status: 500 });
    }
}
