import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BlockedSource from '@/models/BlockedSource';
import { verifyAdminCookies } from '@/lib/auth';

export async function GET() {
    try {
        if (!(await verifyAdminCookies())) {
            return NextResponse.json({ error: 'Unauthorized — admin session required.' }, { status: 401 });
        }
        await dbConnect();
        const sources = await BlockedSource.find().sort({ createdAt: -1 });
        return NextResponse.json(sources);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        if (!(await verifyAdminCookies())) {
            return NextResponse.json({ error: 'Unauthorized — admin session required.' }, { status: 401 });
        }
        const { name } = await req.json();
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        await dbConnect();
        const source = await BlockedSource.create({ name });
        return NextResponse.json(source);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        if (!(await verifyAdminCookies())) {
            return NextResponse.json({ error: 'Unauthorized — admin session required.' }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const { name } = await req.json();
        await dbConnect();
        const source = await BlockedSource.findByIdAndUpdate(id, { name }, { new: true });
        return NextResponse.json(source);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        if (!(await verifyAdminCookies())) {
            return NextResponse.json({ error: 'Unauthorized — admin session required.' }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await dbConnect();
        await BlockedSource.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
