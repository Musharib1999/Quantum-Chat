import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AcademyProgress from '@/models/AcademyProgress';
import { authenticateApiKey } from '@/lib/api-auth';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const user = await authenticateApiKey(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let progress = await AcademyProgress.findOne({ 
            userId: user.email, 
            courseId: id 
        });

        if (!progress) {
            progress = await AcademyProgress.create({
                userId: user.email,
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
