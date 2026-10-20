import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import IssueReport from '@/models/IssueReport';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            title,
            description,
            category = 'other',
            userEmail,
            userId,
            isGuest = false,
            flowContext = {},
        } = body;

        if (!description || typeof description !== 'string' || !description.trim()) {
            return NextResponse.json(
                { success: false, error: 'Description is required to submit an issue report.' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Generate clean human-readable issue ID (e.g. ISSUE-M1A9-F42B)
        const datePart = Date.now().toString(36).slice(-4).toUpperCase();
        const randPart = Math.random().toString(36).slice(2, 6).toUpperCase();
        const issueId = `ISSUE-${datePart}-${randPart}`;

        // Determine derived title if not explicitly provided
        const finalTitle = title && typeof title === 'string' && title.trim()
            ? title.trim().slice(0, 150)
            : `${category.toUpperCase().replace('_', ' ')}: ${description.trim().slice(0, 60)}...`;

        // Create new issue report
        const newIssue = await IssueReport.create({
            issueId,
            status: 'open',
            priority: 'medium',
            category,
            title: finalTitle,
            description: description.trim(),
            userEmail: userEmail || 'anonymous@guest.local',
            userId: userId || null,
            isGuest: Boolean(isGuest),
            flowContext: {
                route: flowContext.route || '/ide',
                framework: flowContext.framework || 'unknown',
                projectId: flowContext.projectId || null,
                projectTitle: flowContext.projectTitle || null,
                activeFile: flowContext.activeFile || 'main.py',
                activeTab: flowContext.activeTab || 'code',
                codeSnippet: flowContext.codeSnippet ? String(flowContext.codeSnippet).slice(0, 50000) : '',
                projectFiles: flowContext.projectFiles || {},
                lastExecution: flowContext.lastExecution || {},
                recentChatMessages: Array.isArray(flowContext.recentChatMessages)
                    ? flowContext.recentChatMessages.slice(-10)
                    : [],
                clientEnv: flowContext.clientEnv || {},
            },
        });

        return NextResponse.json({
            success: true,
            issueId: newIssue.issueId,
            message: 'Issue report received successfully. Our team will review the telemetry.',
        });
    } catch (error: any) {
        console.error('[/api/issues/report] Error creating issue report:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to submit issue report.' },
            { status: 500 }
        );
    }
}
