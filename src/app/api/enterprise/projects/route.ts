import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EnterpriseProject from '@/models/EnterpriseProject';
import { resolveSession } from '@/lib/auth';
import { canAccessEnterprise, isDemoRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * GET /api/enterprise/projects
 * Returns all Enterprise Optimization Studio projects persisted in MongoDB for the authenticated user.
 * Allowed for: enterprise, admin, demo_enterprise (read-only).
 */
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveSession(req);
    if (!identity) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized — please sign in.' },
        { status: 401 }
      );
    }

    if (!canAccessEnterprise(identity.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden — Enterprise access required.' },
        { status: 403 }
      );
    }

    await dbConnect();
    const docs = await EnterpriseProject.find({ userEmail: identity.email })
      .sort({ updatedAtMs: -1 })
      .lean();

    const projects = (docs || []).map((doc: any) => ({
      id: doc.projectId,
      title: doc.title || 'New optimization model',
      domain: doc.domain || 'Custom domain',
      createdAt: typeof doc.createdAtMs === 'number' ? doc.createdAtMs : new Date(doc.createdAt).getTime(),
      updatedAt: typeof doc.updatedAtMs === 'number' ? doc.updatedAtMs : new Date(doc.updatedAt).getTime(),
      lastProblemText: doc.lastProblemText || '',
      messages: Array.isArray(doc.messages) ? doc.messages : [],
      runs: Array.isArray(doc.runs) ? doc.runs : [],
      activeRunId: doc.activeRunId ?? null,
      workspace: doc.workspace || {},
    }));

    return NextResponse.json({
      success: true,
      readOnly: isDemoRole(identity.role),
      projects,
    });
  } catch (error: any) {
    console.error('[GET /api/enterprise/projects] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch enterprise projects' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/enterprise/projects
 * Upserts one or more Enterprise projects in MongoDB for the authenticated user.
 * Blocked for demo_enterprise (read-only) and non-enterprise roles.
 */
export async function POST(req: NextRequest) {
  try {
    const identity = await resolveSession(req);
    if (!identity) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized — please sign in.' },
        { status: 401 }
      );
    }

    if (!canAccessEnterprise(identity.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden — Enterprise access required.' },
        { status: 403 }
      );
    }

    if (isDemoRole(identity.role)) {
      return NextResponse.json(
        {
          success: false,
          code: 'DEMO_READ_ONLY',
          error: 'Demo accounts are view-only and cannot modify saved projects.',
        },
        { status: 403 }
      );
    }

    await dbConnect();
    const body = await req.json();
    const items: any[] = Array.isArray(body.projects)
      ? body.projects
      : body.project
      ? [body.project]
      : body.id
      ? [body]
      : [];

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No project payload provided.' },
        { status: 400 }
      );
    }

    const savedIds: string[] = [];
    for (const proj of items) {
      const projectId = String(proj.id || proj.projectId || '').trim();
      if (!projectId) continue;

      const now = Date.now();
      await EnterpriseProject.findOneAndUpdate(
        { projectId, userEmail: identity.email },
        {
          projectId,
          userEmail: identity.email,
          title: proj.title || 'New optimization model',
          domain: proj.domain || 'Custom domain',
          createdAtMs: typeof proj.createdAt === 'number' && proj.createdAt > 0 ? proj.createdAt : now,
          updatedAtMs: typeof proj.updatedAt === 'number' && proj.updatedAt > 0 ? proj.updatedAt : now,
          lastProblemText: proj.lastProblemText || '',
          messages: Array.isArray(proj.messages) ? proj.messages : [],
          runs: Array.isArray(proj.runs) ? proj.runs : [],
          activeRunId: proj.activeRunId ?? null,
          workspace: proj.workspace || {},
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      savedIds.push(projectId);
    }

    return NextResponse.json({ success: true, savedIds });
  } catch (error: any) {
    console.error('[POST /api/enterprise/projects] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save enterprise project' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/enterprise/projects?projectId=...
 * Deletes a single Enterprise project belonging to the authenticated user.
 * Blocked for demo_enterprise (read-only) and non-enterprise roles.
 */
export async function DELETE(req: NextRequest) {
  try {
    const identity = await resolveSession(req);
    if (!identity) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized — please sign in.' },
        { status: 401 }
      );
    }

    if (!canAccessEnterprise(identity.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden — Enterprise access required.' },
        { status: 403 }
      );
    }

    if (isDemoRole(identity.role)) {
      return NextResponse.json(
        {
          success: false,
          code: 'DEMO_READ_ONLY',
          error: 'Demo accounts are view-only and cannot delete saved projects.',
        },
        { status: 403 }
      );
    }

    const projectId = new URL(req.url).searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required.' },
        { status: 400 }
      );
    }

    await dbConnect();
    await EnterpriseProject.deleteOne({ projectId, userEmail: identity.email });

    return NextResponse.json({ success: true, deletedId: projectId });
  } catch (error: any) {
    console.error('[DELETE /api/enterprise/projects] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete enterprise project' },
      { status: 500 }
    );
  }
}
