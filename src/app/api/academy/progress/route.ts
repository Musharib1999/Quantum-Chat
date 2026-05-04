import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AcademyProgress from '@/models/AcademyProgress';
import User from '@/models/User';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const email = req.nextUrl.searchParams.get('email');
        if (!email) return NextResponse.json([], { status: 200 });

        const user = await User.findOne({ email, isApproved: true });
        if (!user) return NextResponse.json([], { status: 200 });

        const progress = await AcademyProgress.find({ userId: email });
        return NextResponse.json(progress);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
