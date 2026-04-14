import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import dbConnect from '@/lib/db';
import DataPipeline from '@/models/DataPipeline';
import QuantumForm from '@/models/QuantumForm';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const user = await authenticateApiKey(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const pipeline = await DataPipeline.findById('69c9a27442bd8056c04b7133').lean() as any;
        if (!pipeline) return NextResponse.json({ error: 'Pipeline not found' });

        const blueprint = await QuantumForm.findById(pipeline.problemId).lean() as any;
        if (!blueprint) return NextResponse.json({ error: 'Blueprint not found' });
        
        const hardware = blueprint.hardware || 'Universal';
        const template = blueprint.codeTemplates?.find((t: any) => 
            t.hardware?.toLowerCase().replace(/[-_\s]/g, '') === hardware.toLowerCase().replace(/[-_\s]/g, '')
        )?.code;

        return NextResponse.json({
            pipelineId: pipeline._id,
            problemId: pipeline.problemId,
            blueprintHardware: hardware,
            blueprintEnv: blueprint.executionEnvironment,
            templateFirstLines: template?.split('\n').slice(0, 20).join('\n') || 'NO TEMPLATE FOUND',
            isDWaveRouted: blueprint.executionEnvironment === 'python-dwave' || hardware.toLowerCase().includes('dwave')
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}
