import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import QuantumForm from '@/models/QuantumForm';

export const dynamic = 'force-dynamic';

// GET: Fetch mapped form(s)
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const industry = searchParams.get('industry');
        const service = searchParams.get('service');
        const problem = searchParams.get('problem');
        const hardware = searchParams.get('hardware');

        // If no params, return all for Admin Overview
        if (!industry && !service && !problem) {
            const allForms = await QuantumForm.find({}).sort({ createdAt: -1 });
            return NextResponse.json(allForms);
        }

        if (!industry || !service || !problem || !hardware) {
            return NextResponse.json({ error: 'Missing mapping parameters (industry, service, problem, hardware)' }, { status: 400 });
        }

        let form = await QuantumForm.findOne({
            industry: new RegExp(`^${industry}$`, 'i'),
            service: new RegExp(`^${service}$`, 'i'),
            problem: new RegExp(`^${problem}$`, 'i'),
            hardware,
            active: true
        });

        // Fallback to Universal if specific hardware form is not found
        if (!form && hardware !== 'Universal') {
            form = await QuantumForm.findOne({
                industry: new RegExp(`^${industry}$`, 'i'),
                service: new RegExp(`^${service}$`, 'i'),
                problem: new RegExp(`^${problem}$`, 'i'),
                $or: [{ hardware: 'Universal' }, { hardware: { $exists: false } }],
                active: true
            });
        }

        if (!form) {
            return NextResponse.json({
                error: 'No form mapped for this configuration',
                debug: { industry, service, problem, hardware }
            }, { status: 404 });
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
        const { _id, industry, service, problem, hardware } = body;

        // Determine filter: Prefer _id if editing, fallback to composite key for new/upsert
        const filter = _id ? { _id } : { industry, service, problem, hardware };

        const updatedForm = await QuantumForm.findOneAndUpdate(
            filter,
            body,
            { upsert: true, new: true, runValidators: true }
        );

        return NextResponse.json(updatedForm);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

