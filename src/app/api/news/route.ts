import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import News from '@/models/News';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();
    try {
        const news = await News.find({}).sort({ createdAt: -1 }).limit(50);
        return NextResponse.json(news);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    await dbConnect();
    try {
        const body = await req.json();
        const news = await News.create(body);
        return NextResponse.json(news);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create news' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const body = await req.json();
        const news = await News.findByIdAndUpdate(id, body, { new: true });
        return NextResponse.json(news);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update news' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await News.findByIdAndDelete(id);
        return NextResponse.json({ message: 'News deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete piece of news' }, { status: 500 });
    }
}
