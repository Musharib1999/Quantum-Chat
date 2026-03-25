import { NextRequest, NextResponse } from 'next/server';
import Hardware from '@/models/Hardware';
import dbConnect from '@/lib/db';
import { executeQuantumCircuit, executeDWaveAnnealer, executeORTools } from '@/lib/quantum-simulator';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        const { code, hardwareId, hardwareName } = body;

        if (!code || !hardwareId) {
            return NextResponse.json({ error: "Missing required fields (code or hardwareId)." }, { status: 400 });
        }

        // Fetch hardware details to determine the execution path
        const hardware = await Hardware.findById(hardwareId);
        if (!hardware) {
            return NextResponse.json({ error: "Selected hardware mapping not found in the platform registry." }, { status: 404 });
        }

        const provider = (hardware.provider || 'ibm').toLowerCase();
        const name = (hardware.name || '').toLowerCase();
        let result;

        // Routing to the correct simulator based on provider and name
        if (provider === 'dwave' || name.includes('annealer')) {
            result = await executeDWaveAnnealer(code, hardware.serviceUrl);
        } else if (name.includes('or-tools') || name.includes('solver')) {
            result = await executeORTools(code, hardware.serviceUrl);
        } else {
            // Default to Qiskit/Quantum Circuit path for ibm, ionq, rigetti, or other general simulators
            result = await executeQuantumCircuit(code, hardware.serviceUrl);
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Developer Console Execution Error:", error);
        return NextResponse.json({ 
            error: "Execution Bridge Failure",
            details: error.message 
        }, { status: 500 });
    }
}
