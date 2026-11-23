import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LibraryProblem from '@/models/LibraryProblem';
import LibraryProblemVersion from '@/models/LibraryProblemVersion';
import { resolveSession } from '@/lib/auth';
import { canAccessEnterprise } from '@/lib/roles';
import { ensureLibrarySeeded, LibraryDetail } from '@/lib/problemLibrary';

export const dynamic = 'force-dynamic';

/**
 * GET /api/enterprise/library/[slug]
 * Login-only, read-only detail (full problem statement, data, best-known verification) of the current version.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const identity = await resolveSession(req);
    if (!identity) {
      return NextResponse.json({ success: false, error: 'Unauthorized — please sign in.' }, { status: 401 });
    }
    if (!canAccessEnterprise(identity.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden — Enterprise access required.' },
        { status: 403 }
      );
    }

    const { slug } = await ctx.params;
    await dbConnect();
    await ensureLibrarySeeded();

    const problem = await LibraryProblem.findOne({ slug }).lean<any>();
    if (!problem) {
      return NextResponse.json({ success: false, error: 'Problem not found.' }, { status: 404 });
    }
    const v = await LibraryProblemVersion.findOne({ slug, version: problem.currentVersion }).lean<any>();
    if (!v) {
      return NextResponse.json({ success: false, error: 'Problem version not found.' }, { status: 404 });
    }

    const detail: LibraryDetail = {
      slug: problem.slug,
      title: problem.title,
      industry: problem.industry,
      problemType: problem.problemType,
      description: problem.description,
      sizeTier: problem.sizeTier,
      estimatedBinaryVars: problem.estimatedBinaryVars,
      objectiveSense: problem.objectiveSense,
      source: { name: problem.source?.name || '', url: problem.source?.url ?? null, license: problem.source?.license || '' },
      version: v.version,
      status: v.status,
      bestKnown: { value: v.bestKnown.value, kind: v.bestKnown.kind, method: v.bestKnown.method || '' },
      contentHash: v.contentHash,
      prompt: v.prompt,
      data: v.data,
    };

    return NextResponse.json({ success: true, problem: detail });
  } catch (error: any) {
    console.error('[GET /api/enterprise/library/[slug]] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load problem' },
      { status: 500 }
    );
  }
}
