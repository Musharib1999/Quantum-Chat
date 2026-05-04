import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AcademySection from '@/models/AcademySection';
import { authenticateApiKey } from '@/lib/api-auth';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        
        // Ensure user is authenticated (Student or Admin)
        const user = await authenticateApiKey(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        
        // Fetch sections for the course
        const sections = await AcademySection.find({ courseId: id }).sort({ order: 1 });
        
        // Filter out sensitive validation data for non-admins (optional but good practice)
        const safeSections = sections.map(s => {
            const section = s.toObject();
            if (user.role !== 'admin') {
                // We keep targetAnswer because it's needed for the exact match logic on client if we validate there
                // BUT we usually validate on server. In our case, we validate on server.
                // So we can hide targetAnswer to prevent cheating via DevTools.
                delete section.targetAnswer;
            }
            return section;
        });

        return NextResponse.json(safeSections);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
