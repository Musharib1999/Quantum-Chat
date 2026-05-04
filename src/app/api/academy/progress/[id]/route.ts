import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AcademyProgress from '@/models/AcademyProgress';
import User from '@/models/User';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const email = req.nextUrl.searchParams.get('email');
        if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await User.findOne({ email, isApproved: true });
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let progress = await AcademyProgress.findOne({ userId: email, courseId: id });

        if (!progress) {
            progress = await AcademyProgress.create({
                userId: email,
                courseId: id,
                completedSections: [],
                attempts: {}
            });
        }

        return NextResponse.json(progress);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
