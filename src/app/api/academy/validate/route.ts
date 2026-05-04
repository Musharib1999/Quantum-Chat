import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AcademySection from '@/models/AcademySection';
import AcademyProgress from '@/models/AcademyProgress';
import User from '@/models/User';
import { authenticateApiKey } from '@/lib/api-auth';
import { executeQuantumCircuit, executeDWaveAnnealer, executeORTools } from '@/lib/quantum-simulator';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const user = await authenticateApiKey(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { courseId, sectionId, code, provider } = await req.json();

        // 1. Check compute credits
        const dbUser = await User.findOne({ email: user.email });
        if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        if ((dbUser.simMinutesUsed || 0) >= (dbUser.simMinutesLimit || 5)) {
            return NextResponse.json({ 
                success: false, 
                error: 'Compute credit limit reached. Please contact admin for more simulator minutes.',
                creditsExhausted: true
            }, { status: 403 });
        }

        const section = await AcademySection.findById(sectionId);
        if (!section || section.type !== 'question') {
            return NextResponse.json({ error: 'Invalid challenge section' }, { status: 400 });
        }

        // 2. Check attempts
        const progress = await AcademyProgress.findOne({ userId: user.email, courseId });
        const currentAttempts = (progress?.attempts?.[sectionId] || 0);
        
        if (currentAttempts >= 3) {
            return NextResponse.json({ 
                success: false, 
                error: 'Maximum attempts reached for this challenge.',
                attemptsLeft: 0
            }, { status: 403 });
        }

        // 3. Execute with Timeout and Time Tracking
        const startTime = Date.now();
        const executionPromise = (async () => {
            if (provider === 'qiskit') return await executeQuantumCircuit(code);
            if (provider === 'dwave') return await executeDWaveAnnealer(code);
            if (provider === 'ortools') return await executeORTools(code);
            throw new Error('Unsupported provider');
        })();

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT')), 30000)
        );

        let result: any;
        try {
            result = await Promise.race([executionPromise, timeoutPromise]);
        } catch (e: any) {
            const endTime = Date.now();
            const durationMin = (endTime - startTime) / 60000;
            await User.findOneAndUpdate({ email: user.email }, { $inc: { simMinutesUsed: durationMin } });

            if (e.message === 'TIMEOUT') {
                return NextResponse.json({ success: false, timeout: true, error: 'Execution timed out (30s limit)' });
            }
            throw e;
        }

        const endTime = Date.now();
        const durationMin = (endTime - startTime) / 60000;
        
        // Deduct time
        await User.findOneAndUpdate({ email: user.email }, { $inc: { simMinutesUsed: durationMin } });

        // 4. Validation Logic (Exact Match)
        const cleanJson = (val: any) => JSON.stringify(val).replace(/\s/g, '');
        
        let actualOutput = result;
        if (result.results) actualOutput = result.results;
        else if (result.output && !result.error) {
            const jsonMatch = result.output.match(/\[QUANTUM_JSON\]([\s\S]*?)\[\/QUANTUM_JSON\]/);
            if (jsonMatch) {
                try { actualOutput = JSON.parse(jsonMatch[1]); } catch(e) {}
            }
        }
        
        let target;
        try {
            target = typeof section.targetAnswer === 'string' ? JSON.parse(section.targetAnswer) : section.targetAnswer;
        } catch (e) {
            target = section.targetAnswer;
        }

        const isMatch = cleanJson(actualOutput) === cleanJson(target);

        // 5. Update attempts in DB
        await AcademyProgress.findOneAndUpdate(
            { userId: user.email, courseId },
            { $inc: { [`attempts.${sectionId}`]: 1 } }
        );

        return NextResponse.json({
            success: isMatch,
            output: JSON.stringify(actualOutput, null, 2),
            error: result.error,
            attemptsLeft: 3 - (currentAttempts + 1),
            computeUsed: durationMin.toFixed(4)
        });

    } catch (error: any) {
        console.error("[Academy-Validate] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
