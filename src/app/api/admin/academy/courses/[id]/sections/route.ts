import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AcademySection from '@/models/AcademySection';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const sections = await AcademySection.find({ courseId: id }).sort({ order: 1 });
        return NextResponse.json(sections);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
