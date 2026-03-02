import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import MarketPrompt from '@/models/MarketPrompt';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const params = await props.params;
        const id = params.id;
        const data = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const updatedPrompt = await MarketPrompt.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        );

        if (!updatedPrompt) {
            return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
        }

        return NextResponse.json(updatedPrompt);
    } catch (error) {
        console.error('Error updating market prompt:', error);
        return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const params = await props.params;
        const id = params.id;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const deletedPrompt = await MarketPrompt.findByIdAndDelete(id);

        if (!deletedPrompt) {
            return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Prompt deleted successfully' });
    } catch (error) {
        console.error('Error deleting market prompt:', error);
        return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
    }
}
