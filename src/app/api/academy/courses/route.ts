import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AcademyCourse from '@/models/AcademyCourse';

export async function GET() {
    try {
        await dbConnect();
        // Students only see published courses
        const courses = await AcademyCourse.find({ isPublished: true }).sort({ order: 1 });
        return NextResponse.json(courses);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
