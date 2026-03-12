import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Stock from '@/models/Stock';
import { getQuantumExposureScore } from '@/app/actions/quantum-score';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();
    try {
        const stocks = await Stock.find({}).sort({ name: 1 });

        // Background update for missing scores
        stocks.forEach(stock => {
            if (!stock.quantumExposureScore || stock.quantumExposureScore === 0) {
                // Not awaiting to avoid blocking the response
                getQuantumExposureScore(stock.name, 'stock', stock._id.toString()).catch(err => {
                    console.error(`Background Q-Score update failed for ${stock.name}:`, err);
                });
            }
        });

        return NextResponse.json(stocks);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch stocks' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    await dbConnect();
    try {
        const body = await req.json();
        const stock = await Stock.create(body);
        return NextResponse.json(stock, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create stock' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const body = await req.json();
        const stock = await Stock.findByIdAndUpdate(id, body, { new: true });
        return NextResponse.json(stock);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await Stock.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Stock deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete stock' }, { status: 500 });
    }
}
