import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import QuantumForm from '@/models/QuantumForm';

export const dynamic = 'force-dynamic';

// Module-level cache — persists across requests on the same Vercel instance
// TTL: 5 minutes (forms almost never change at runtime)
let _metadataCache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
    try {
        // Return cached result if still fresh
        if (_metadataCache && Date.now() < _metadataCache.expiresAt) {
            return NextResponse.json(_metadataCache.data);
        }

        await dbConnect();

        // Aggregate unique Industries, Services, and Problems
        const [industries, services, allForms] = await Promise.all([
            QuantumForm.distinct('industry', { active: true }),
            QuantumForm.distinct('service', { active: true }),
            QuantumForm.find({ active: true }, 'industry service problem')
        ]);

        const metadata = {
            industries: industries.map((name: string) => ({ id: name.toLowerCase().replace(/ /g, '_'), label: name })),
            services: services.map((name: string) => ({ id: name.toLowerCase().replace(/ /g, '_'), label: name })),
            problemMapping: allForms.reduce((acc: any, form) => {
                const industry = form.industry;
                const problem = form.problem;
                const service = form.service;
                const hardware = form.codeTemplates?.map((t: any) => t.hardware) || [];

                if (!acc[industry]) acc[industry] = {};
                if (!acc[industry][problem]) acc[industry][problem] = {};

                // Map services to their hardware
                if (!acc[industry][problem][service]) {
                    acc[industry][problem][service] = hardware;
                } else {
                    // Merge hardware lists if needed (though usually 1:1 problem:service:form)
                    hardware.forEach((hw: string) => {
                        if (!acc[industry][problem][service].includes(hw)) {
                            acc[industry][problem][service].push(hw);
                        }
                    });
                }
                return acc;
            }, {})
        };

        // Store in cache
        _metadataCache = { data: metadata, expiresAt: Date.now() + CACHE_TTL_MS };

        return NextResponse.json(metadata, {
            headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
