import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { authenticateApiKey } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const admin = await authenticateApiKey(req);
        if (!admin || admin.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch students who are not yet approved
        const pendingStudents = await User.find({ role: 'student', isApproved: false }).sort({ createdAt: -1 });
        return NextResponse.json(pendingStudents);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
