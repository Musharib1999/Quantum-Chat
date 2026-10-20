import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import IssueReport from '@/models/IssueReport';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const skip = (page - 1) * limit;

        const query: any = {};

        if (status && status !== 'all') {
            query.status = status;
        }
        if (priority && priority !== 'all') {
            query.priority = priority;
        }
        if (category && category !== 'all') {
            query.category = category;
        }
        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { issueId: regex },
                { title: regex },
                { description: regex },
                { userEmail: regex },
            ];
        }

        const [issues, total, openCount] = await Promise.all([
            IssueReport.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            IssueReport.countDocuments(query),
            IssueReport.countDocuments({ status: 'open' }),
        ]);

        return NextResponse.json({
            success: true,
            issues,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit) || 1,
            },
            stats: {
                openCount,
            },
        });
    } catch (error: any) {
        console.error('[/api/admin/issues GET] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch issues.' },
            { status: 500 }
        );
    }
}
