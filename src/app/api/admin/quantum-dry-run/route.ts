import { NextResponse } from 'next/server';
import { executeQuantumCircuit, executeDWaveAnnealer } from '@/lib/quantum-simulator';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { code, hardware, mockParams } = await req.json();

        if (!code) {
            return NextResponse.json({ error: 'No code provided' }, { status: 400 });
        }

        const isDWave = hardware?.toLowerCase().includes('d-wave') || hardware?.toLowerCase().includes('annealer');
        
        // --- DRY RUN EXECUTION ---
        const result = isDWave 
            ? await executeDWaveAnnealer(code) 
            : await executeQuantumCircuit(code);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // --- COLUMN DISCOVERY ---
        // Look for common data keys in the result
        const suggestions: string[] = [];
        
        if (result.results && Array.isArray(result.results)) {
            // If it returns a list of results (standard for our tables)
            const firstRow = result.results[0];
            if (firstRow && typeof firstRow === 'object') {
                suggestions.push(...Object.keys(firstRow));
            }
        } else if (typeof result === 'object') {
            // General object discovery
            suggestions.push(...Object.keys(result).filter(k => k !== 'error' && k !== 'executionTimeMs'));
        }

        return NextResponse.json({
            rawResult: result,
            suggestions: [...new Set(suggestions)], // Unique suggestions
            executionTimeMs: result.executionTimeMs
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
