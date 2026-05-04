import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AcademyCourse from '@/models/AcademyCourse';
import { authenticateApiKey } from '@/lib/api-auth';

export async function GET() {
    try {
        await dbConnect();
        const courses = await AcademyCourse.find({}).sort({ order: 1 });
        return NextResponse.json(courses);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        const course = await AcademyCourse.create(body);
        return NextResponse.json(course);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
