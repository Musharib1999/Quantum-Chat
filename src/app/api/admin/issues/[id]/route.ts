import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import IssueReport from '@/models/IssueReport';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await dbConnect();

        const issue = await IssueReport.findOne({
            $or: [{ issueId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
        }).lean();

        if (!issue) {
            return NextResponse.json({ success: false, error: 'Issue report not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, issue });
    } catch (error: any) {
        console.error('[/api/admin/issues/[id] GET] Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Server error.' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { status, priority, adminNotes } = body;

        await dbConnect();

        const updateData: any = {};
        if (status) {
            updateData.status = status;
            if (status === 'resolved') {
                updateData.resolvedAt = new Date();
            } else {
                updateData.resolvedAt = null;
            }
        }
        if (priority) {
            updateData.priority = priority;
        }
        if (typeof adminNotes === 'string') {
            updateData.adminNotes = adminNotes;
        }

        const updated = await IssueReport.findOneAndUpdate(
            { $or: [{ issueId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
            { $set: updateData },
            { new: true }
        ).lean();

        if (!updated) {
            return NextResponse.json({ success: false, error: 'Issue report not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, issue: updated });
    } catch (error: any) {
        console.error('[/api/admin/issues/[id] PATCH] Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Update failed.' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await dbConnect();

        const deleted = await IssueReport.findOneAndDelete({
            $or: [{ issueId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
        });

        if (!deleted) {
            return NextResponse.json({ success: false, error: 'Issue report not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Issue report deleted.' });
    } catch (error: any) {
        console.error('[/api/admin/issues/[id] DELETE] Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Deletion failed.' }, { status: 500 });
    }
}
