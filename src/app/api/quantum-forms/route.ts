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
        const userEmail = searchParams.get('userEmail');
        const userRole = searchParams.get('userRole');

        // If no params, return all for Admin/Builder Overview
        if (!industry && !service && !problem) {
            let query: any = {};
            if (userRole === 'builder' && userEmail) {
                query.createdBy = userEmail;
            }
            const allForms = await QuantumForm.find(query).sort({ createdAt: -1 });
            return NextResponse.json(allForms);
        }

        if (!industry || !service || !problem || !hardware) {
            return NextResponse.json({ error: 'Missing mapping parameters (industry, service, problem, hardware)' }, { status: 400 });
        }

        // Fetch all active forms for this industry/service/problem
        const forms = await QuantumForm.find({
            industry: new RegExp(`^${industry}$`, 'i'),
            service: new RegExp(`^${service}$`, 'i'),
            problem: new RegExp(`^${problem}$`, 'i'),
            active: true
        });

        // Normalize hardware name for comparison: lowercase and remove symbols
        const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetHwNorm = normalize(hardware || '');

        // 1. Try to find an exact (normalized) match
        let form = forms.find(f => normalize(f.hardware) === targetHwNorm);

        // 2. Fallback to Universal if no specific match found
        if (!form && targetHwNorm !== 'universal') {
            form = forms.find(f => normalize(f.hardware) === 'universal' || !f.hardware);
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
            { ...body, updatedAt: new Date() },
            { upsert: true, new: true, runValidators: true }
        );

        return NextResponse.json(updatedForm);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

