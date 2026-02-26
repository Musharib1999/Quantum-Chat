import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UseCase from '@/models/UseCase';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();
    try {
        const useCases = await UseCase.find({}).sort({ createdAt: -1 });
        return NextResponse.json(useCases);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch use cases' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    await dbConnect();
    try {
        const body = await req.json();
        const useCase = await UseCase.create(body);
        return NextResponse.json(useCase, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create use case' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await UseCase.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Use case deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete use case' }, { status: 500 });
    }
}
