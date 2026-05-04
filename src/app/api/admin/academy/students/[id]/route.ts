import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { authenticateApiKey } from '@/lib/api-auth';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const admin = await authenticateApiKey(req);
        if (!admin || admin.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { isApproved } = await req.json();
        
        const student = await User.findByIdAndUpdate(id, { isApproved }, { new: true });
        if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

        return NextResponse.json(student);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
