import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AcademySection from '@/models/AcademySection';
import User from '@/models/User';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();

        // Auth: email passed as query param from session (no API key needed for web users)
        const email = req.nextUrl.searchParams.get('email');
        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await User.findOne({ email, isApproved: true });
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized or not approved' }, { status: 401 });
        }

        const { id } = await params;
        const sections = await AcademySection.find({ courseId: id }).sort({ order: 1 });

        // Strip targetAnswer for non-admins to prevent cheating
        const safeSections = sections.map(s => {
            const section = s.toObject();
            if (user.role !== 'admin') {
                delete section.targetAnswer;
            }
            return section;
        });

        return NextResponse.json(safeSections);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
