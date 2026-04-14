import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import QuantumForm from '@/models/QuantumForm';

export const dynamic = 'force-dynamic';

// FETCH: Metadata for Wizard (Robustly filtered)
export async function GET() {
    try {
        await dbConnect();

        // 1. Fetch all active problems that are NOT pending approval
        const allActiveForms = await QuantumForm.find({ 
            active: true,
            status: { $ne: 'pending_approval' } 
        }, 'industry service problem hardware codeTemplates');

        // 2. Derive unique industries and services only from these active problem records
        const uniqueIndustries = [...new Set(allActiveForms.map(f => f.industry))].sort();
        const uniqueServices = [...new Set(allActiveForms.map(f => f.service))].sort();

        // 3. Build the problem mapping
        const problemMapping = allActiveForms.reduce((acc: any, form: any) => {
            const { industry, problem, service, hardware, codeTemplates } = form;

            if (!acc[industry]) acc[industry] = {};
            if (!acc[industry][problem]) acc[industry][problem] = {};
            if (!acc[industry][problem][service]) acc[industry][problem][service] = [];

            // If hardware is 'Universal', expose the specific templates as options
            if (hardware === 'Universal' && codeTemplates && codeTemplates.length > 0) {
                codeTemplates.forEach((template: any) => {
                    if (template.hardware && !acc[industry][problem][service].includes(template.hardware)) {
                        acc[industry][problem][service].push(template.hardware);
                    }
                });
            } else if (hardware && hardware !== 'Universal') {
                if (!acc[industry][problem][service].includes(hardware)) {
                    acc[industry][problem][service].push(hardware);
                }
            }
            
            return acc;
        }, {});

        const metadata = {
            industries: uniqueIndustries.map(name => ({ 
                id: name.toLowerCase().replace(/ /g, '_'), 
                label: name 
            })),
            services: uniqueServices.map(name => ({ 
                id: name.toLowerCase().replace(/ /g, '_'), 
                label: name 
            })),
            problemMapping
        };

        return NextResponse.json(metadata, {
            headers: { 
                'Cache-Control': 'no-store, max-age=0',
                'CDN-Cache-Control': 'no-store'
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
