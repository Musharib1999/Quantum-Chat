import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Hardware from '@/models/Hardware';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();

        // Only fetch Online custom hardware intended for public view
        const hardwares = await Hardware.find({ status: 'Online' }).sort({ order: 1 }).lean();

        const safeData = hardwares.map((hw: any) => ({
            id: hw._id.toString(),
            name: hw.name,
            provider: hw.provider,
            qubits: hw.qubits,
            description: hw.description
        }));

        return NextResponse.json(safeData);
    } catch (error) {
        console.error('Failed to fetch hardware:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
