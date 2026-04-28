import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Shot from '@/models/Shot';
import { authenticateApiKey } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Simple security check using admin api key or session (though api-auth is safer for heavy tasks)
        const user = await authenticateApiKey(req);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Fetch all shots (limit to 1000 for safety in demo, can be removed for full production)
        const shots = await Shot.find({})
            .sort({ timestamp: -1 })
            .limit(1000)
            .lean();

        // Define CSV headers
        const headers = [
            'Shot ID',
            'Timestamp',
            'User ID',
            'Industry',
            'Service',
            'Problem',
            'Hardware',
            'Source',
            'Execution Time (ms)',
            'Input Parameters',
            'Quantum Results'
        ];

        // Format rows
        const rows = shots.map((s: any) => [
            s._id.toString(),
            s.timestamp.toISOString(),
            s.userId || 'Guest',
            s.industry,
            s.service,
            s.problem,
            s.hardware,
            s.source || 'Web',
            s.executionTimeMs || 'N/A',
            `"${JSON.stringify(s.parameters || {}).replace(/"/g, '""')}"`,
            `"${JSON.stringify(s.results || {}).replace(/"/g, '""')}"`
        ]);

        // Construct CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Return as a downloadable file
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="quantum-shots-export-${new Date().toISOString().split('T')[0]}.csv"`,
                'Cache-Control': 'no-cache'
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
