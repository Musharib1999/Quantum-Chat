import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LibraryProblem from '@/models/LibraryProblem';
import LibraryProblemVersion from '@/models/LibraryProblemVersion';
import LibraryBenchmarkRun from '@/models/LibraryBenchmarkRun';
import { resolveSession } from '@/lib/auth';
import { canAccessEnterprise } from '@/lib/roles';
import { ensureLibrarySeeded, LibraryBenchmarkSummary, LibraryListItem } from '@/lib/problemLibrary';

export const dynamic = 'force-dynamic';

function serializeBenchmark(b: any): LibraryBenchmarkSummary | null {
  if (!b) return null;
  return {
    slug: b.slug,
    contentHash: b.contentHash,
    runAt: b.runAt,
    protocol: b.protocol,
    environment: b.environment ?? null,
    structure: b.structure ?? null,
    equivalenceCheck: b.equivalenceCheck ?? null,
    runtimeRatioSaVsCp: b.runtimeRatioSaVsCp ?? null,
    quboVars: b.quboVars,
    verdict: b.verdict,
    verdictNote: b.verdictNote || '',
    qubo: b.qubo,
    classical: b.classical,
  };
}

/**
 * GET /api/enterprise/library
 * Login-only, read-only list of Verified Industry Problem Library entries + version-bound benchmark runs.
 * Allowed for roles that can access /enterprise (enterprise, admin, demo_enterprise).
 */
export async function GET(req: NextRequest) {
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

    await dbConnect();
    await ensureLibrarySeeded();

    const problems = await LibraryProblem.find({})
      .sort({ industry: 1, problemType: 1, estimatedBinaryVars: 1 })
      .lean<any[]>();
    if (problems.length === 0) {
      return NextResponse.json({ success: true, problems: [] });
    }

    const versions = await LibraryProblemVersion.find({
      $or: problems.map((p) => ({ slug: p.slug, version: p.currentVersion })),
    })
      .select('slug version contentHash status bestKnown')
      .lean<any[]>();
    const versionMap = new Map(versions.map((v) => [`${v.slug}@${v.version}`, v]));

    const benchmarks =
      versions.length > 0
        ? await LibraryBenchmarkRun.find({
            $or: versions.map((v) => ({ slug: v.slug, contentHash: v.contentHash })),
          }).lean<any[]>()
        : [];
    const benchMap = new Map(benchmarks.map((b) => [`${b.slug}@${b.contentHash}`, b]));

    const items: LibraryListItem[] = problems.flatMap((p) => {
      const v = versionMap.get(`${p.slug}@${p.currentVersion}`);
      if (!v) return [];
      const b = benchMap.get(`${v.slug}@${v.contentHash}`);
      return [
        {
          slug: p.slug,
          title: p.title,
          industry: p.industry,
          problemType: p.problemType,
          description: p.description,
          sizeTier: p.sizeTier,
          estimatedBinaryVars: p.estimatedBinaryVars,
          objectiveSense: p.objectiveSense,
          source: { name: p.source?.name || '', url: p.source?.url ?? null, license: p.source?.license || '' },
          version: v.version,
          status: v.status,
          bestKnown: { value: v.bestKnown.value, kind: v.bestKnown.kind, method: v.bestKnown.method || '' },
          benchmark: serializeBenchmark(b),
        },
      ];
    });

    return NextResponse.json({ success: true, problems: items });
  } catch (error: any) {
    console.error('[GET /api/enterprise/library] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load problem library' },
      { status: 500 }
    );
  }
}
