import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import QuantumForm from '@/models/QuantumForm';

// GET: Fetch mapped form
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const industry = searchParams.get('industry');
        const service = searchParams.get('service');
        const problem = searchParams.get('problem');

        if (!industry || !service || !problem) {
            return NextResponse.json({ error: 'Missing mapping parameters' }, { status: 400 });
        }

        const form = await QuantumForm.findOne({
            industry,
            service,
            problem,
            active: true
        });

        if (!form) {
            return NextResponse.json({ error: 'No form mapped for this configuration' }, { status: 404 });
        }

        return NextResponse.json(form);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Admin Create/Update form
export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const { industry, service, problem } = body;

        const updatedForm = await QuantumForm.findOneAndUpdate(
            { industry, service, problem },
            body,
            { upsert: true, new: true, runValidators: true }
        );

        return NextResponse.json(updatedForm);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

