import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import QuantumForm from '@/models/QuantumForm';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();

        // Aggregate unique Industries, Services, and Problems
        const industries = await QuantumForm.distinct('industry', { active: true });
        const services = await QuantumForm.distinct('service', { active: true });

        const allForms = await QuantumForm.find({ active: true }, 'industry service problem');

        const metadata = {
            industries: industries.map(name => ({ id: name.toLowerCase().replace(/ /g, '_'), label: name })),
            services: services.map(name => ({ id: name.toLowerCase().replace(/ /g, '_'), label: name })),
            problemMapping: allForms.reduce((acc: any, form) => {
                const industry = form.industry;
                const service = form.service;

                if (!acc[industry]) acc[industry] = {};
                if (!acc[industry][service]) acc[industry][service] = [];

                // Avoid duplicates
                const exists = acc[industry][service].some((p: any) => p.label === form.problem);
                if (!exists) {
                    acc[industry][service].push({ id: form.problem.toLowerCase().replace(/ /g, '_'), label: form.problem });
                }
                return acc;
            }, {})
        };

        return NextResponse.json(metadata);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
