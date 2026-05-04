import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { authenticateApiKey } from '@/lib/api-auth';

function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'pb_';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

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
        
        const student = await User.findById(id);
        if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

        const updateData: any = { isApproved };

        // When approving: generate an API key and enable API access
        if (isApproved === true && !student.apiKey) {
            updateData.apiKey = generateApiKey();
            updateData.apiEnabled = true;
        }

        // When denying: disable API access
        if (isApproved === false) {
            updateData.apiEnabled = false;
        }

        const updated = await User.findByIdAndUpdate(id, updateData, { new: true });
        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
