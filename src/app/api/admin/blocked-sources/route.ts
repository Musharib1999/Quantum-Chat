import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BlockedSource from '@/models/BlockedSource';

export async function GET() {
    try {
        await dbConnect();
        const sources = await BlockedSource.find().sort({ createdAt: -1 });
        return NextResponse.json(sources);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name } = await req.json();
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        await dbConnect();
        const source = await BlockedSource.create({ name });
        return NextResponse.json(source);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
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
