import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import News from '@/models/News';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();

        // Aggregate counts per countryCode
        const stats = await News.aggregate([
            {
                $group: {
                    _id: "$countryCode",
                    count: { $sum: 1 },
                    name: { $first: "$countryName" }
                }
            },
            {
                $project: {
                    _id: 0,
                    countryCode: "$_id",
                    count: 1,
                    countryName: "$name"
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        return NextResponse.json({
            success: true,
            stats: stats.filter(s => s.countryCode && s.countryCode !== 'GLOBAL')
        });

    } catch (error: any) {
        console.error("Geostatistics error:", error);
        return NextResponse.json({ error: 'Failed to fetch geographic stats' }, { status: 500 });
    }
}
