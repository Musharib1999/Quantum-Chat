import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import QuantumForm from '@/models/QuantumForm';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const { industry, service, hardware, problem, description, fields, code, userEmail } = body;

        if (!industry || !service || !hardware || !problem || !userEmail) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Map code to template
        const codeTemplates = code ? [{ hardware, code }] : [];

        const newForm = await QuantumForm.create({
            industry,
            service,
            problem,
            hardware,
            description,
            fields,
            codeTemplates,
            status: 'pending_approval',
            createdBy: userEmail,
            active: false // Inactive until approved
        });

        return NextResponse.json({ success: true, id: newForm._id });
    } catch (error: any) {
        console.error("Submission Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
