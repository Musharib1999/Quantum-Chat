import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import QuantumForm from '@/models/QuantumForm';

export const dynamic = 'force-dynamic';

// PATCH: Update specific fields (e.g., active toggle)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await req.json();

        const updatedForm = await QuantumForm.findByIdAndUpdate(id, body, { new: true });
        
        if (!updatedForm) {
            return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }

        return NextResponse.json(updatedForm);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove a form blueprint
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;

        const deletedForm = await QuantumForm.findByIdAndDelete(id);

        if (!deletedForm) {
            return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Form deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
