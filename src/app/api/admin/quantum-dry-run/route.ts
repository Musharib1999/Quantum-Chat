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
        
        // --- PLACEHOLDER REPLACEMENT ---
        // For dry runs, we need to replace {{key}} with mock values so the code doesn't crash
        let processedCode = code;
        const placeholderRegex = /\{\{([^}]+)\}\}/g;
        processedCode = processedCode.replace(placeholderRegex, (_match: string, key: string) => {
            // Check if user provided a mock value, otherwise use a sensible default
            if (mockParams && mockParams[key] !== undefined) return String(mockParams[key]);
            
            const lowKey = key.toLowerCase();
            // Sensible defaults based on common keys
            if (lowKey.includes('penalty') || lowKey.includes('factor')) return "20";
            if (lowKey.includes('energies')) return "-5.2, -8.1, -2.4, -6.5";
            if (lowKey.includes('count') || lowKey.includes('iterations') || lowKey.includes('n_')) return "10";
            if (lowKey.includes('assets') || lowKey.includes('tickers')) return "AAPL, MSFT, GOOGL";
            if (lowKey.includes('risk') || lowKey.includes('alpha')) return "0.5";
            
            return "1.0"; // Generic fallback
        });

        // --- DRY RUN EXECUTION ---
        const result = isDWave 
            ? await executeDWaveAnnealer(processedCode) 
            : await executeQuantumCircuit(processedCode);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // --- COLUMN DISCOVERY ---
        // Look for common data keys in the result, especially in structured [QUANTUM_JSON]
        const suggestions: string[] = ["variable", "value", "assignment", "status"];
        const rawOutput = (result.output || "");
        
        // 1. Try robust tagged extraction first (Standard format)
        const jsonMatch = rawOutput.match(/\[QUANTUM_JSON\]([\s\S]*?)\[\/QUANTUM_JSON\]/);
        if (jsonMatch) {
            try {
                const data = JSON.parse(jsonMatch[1]);
                
                // If it has a table, the keys of the FIRST row are the best suggestions
                if (data.assignmentsTable && Array.isArray(data.assignmentsTable) && data.assignmentsTable.length > 0) {
                    const firstRow = data.assignmentsTable[0];
                    if (firstRow && typeof firstRow === 'object') {
                        suggestions.push(...Object.keys(firstRow));
                    }
                }
                
                // Also suggest top-level data keys (excluding big ones)
                suggestions.push(...Object.keys(data).filter(k => 
                    !['assignmentsTable', 'plotly_chart', 'chartData', 'best_solution'].includes(k)
                ));
            } catch (e) {
                console.error("Dry run JSON parsing failed:", e);
            }
        }

        // 2. Fallback to general object discovery from the raw result
        if (result.results && Array.isArray(result.results)) {
            const firstRow = result.results[0];
            if (firstRow && typeof firstRow === 'object') {
                suggestions.push(...Object.keys(firstRow));
            }
        } else if (typeof result === 'object') {
            suggestions.push(...Object.keys(result).filter(k => !['error', 'executionTimeMs', 'output', 'success'].includes(k)));
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
