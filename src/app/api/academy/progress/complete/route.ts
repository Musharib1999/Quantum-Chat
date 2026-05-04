import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AcademyProgress from '@/models/AcademyProgress';
import AcademySection from '@/models/AcademySection';
import AcademyCourse from '@/models/AcademyCourse';
import { authenticateApiKey } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const user = await authenticateApiKey(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { courseId, sectionId } = await req.json();

        const progress = await AcademyProgress.findOneAndUpdate(
            { userId: user.email, courseId },
            { $addToSet: { completedSections: sectionId }, $set: { lastAccessed: new Date() } },
            { new: true, upsert: true }
        );

        // Check if course is fully completed
        const totalSections = await AcademySection.countDocuments({ courseId });
        if (progress.completedSections.length === totalSections) {
            progress.isCompleted = true;
            progress.earnedBadge = true;
            await progress.save();
        }

        return NextResponse.json(progress);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
