import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AcademySection from '@/models/AcademySection';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        const section = await AcademySection.create(body);
        return NextResponse.json(section);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
