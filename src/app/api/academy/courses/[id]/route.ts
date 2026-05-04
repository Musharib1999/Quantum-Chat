import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AcademyCourse from '@/models/AcademyCourse';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const course = await AcademyCourse.findById(id);
        if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        return NextResponse.json(course);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
