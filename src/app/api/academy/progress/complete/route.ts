import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AcademyProgress from '@/models/AcademyProgress';
import AcademySection from '@/models/AcademySection';
import User from '@/models/User';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { courseId, sectionId, email } = await req.json();

        if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await User.findOne({ email, isApproved: true });
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const progress = await AcademyProgress.findOneAndUpdate(
            { userId: email, courseId },
            { $addToSet: { completedSections: sectionId }, $set: { lastAccessed: new Date() } },
            { new: true, upsert: true }
        );

        // Check if course is fully completed
        const totalSections = await AcademySection.countDocuments({ courseId });
        if (progress.completedSections.length >= totalSections) {
            progress.isCompleted = true;
            progress.earnedBadge = true;
            await progress.save();
        }

        return NextResponse.json(progress);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
