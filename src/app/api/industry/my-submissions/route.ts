import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import QuantumForm from '@/models/QuantumForm';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: "Missing email parameter" }, { status: 400 });
        }

        const submissions = await QuantumForm.find({ createdBy: email }).sort({ createdAt: -1 }).lean();
        return NextResponse.json(submissions);
    } catch (error: any) {
        console.error("Fetch Submissions Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
