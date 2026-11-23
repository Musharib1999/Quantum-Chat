import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LibraryProblem from '@/models/LibraryProblem';
import LibraryProblemVersion from '@/models/LibraryProblemVersion';
import LibraryBenchmarkRun from '@/models/LibraryBenchmarkRun';
import { verifyAdminCookies } from '@/lib/auth';
import { computeContentHash, ensureLibrarySeeded } from '@/lib/problemLibrary';

export const dynamic = 'force-dynamic';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function inferSizeTier(estimatedBinaryVars: number): 'small' | 'medium' | 'large' {
  if (estimatedBinaryVars <= 40) return 'small';
  if (estimatedBinaryVars <= 100) return 'medium';
  return 'large';
}

/**
 * GET /api/admin/library
 * Admin-only listing of all Industry Problem Library templates, latest version hashes, and benchmark verdicts.
 */
export async function GET() {
  try {
    if (!(await verifyAdminCookies())) {
      return NextResponse.json({ error: 'Unauthorized — admin session required.' }, { status: 401 });
    }
    await dbConnect();
    await ensureLibrarySeeded();

    const problems = await LibraryProblem.find({})
      .sort({ industry: 1, updatedAt: -1 })
      .lean<any[]>();
    const versions =
      problems.length > 0
        ? await LibraryProblemVersion.find({
            $or: problems.map((p) => ({ slug: p.slug, version: p.currentVersion })),
          }).lean<any[]>()
        : [];
    const versionMap = new Map(versions.map((v) => [`${v.slug}@${v.version}`, v]));

    const benchmarks =
      versions.length > 0
        ? await LibraryBenchmarkRun.find({
            $or: versions.map((v) => ({ slug: v.slug, contentHash: v.contentHash })),
          }).lean<any[]>()
        : [];
    const benchMap = new Map(benchmarks.map((b) => [`${b.slug}@${b.contentHash}`, b]));

    const rows = problems.map((p) => {
      const v = versionMap.get(`${p.slug}@${p.currentVersion}`);
      const b = v ? benchMap.get(`${v.slug}@${v.contentHash}`) : null;
      return {
        slug: p.slug,
        title: p.title,
        industry: p.industry,
        problemType: p.problemType,
        description: p.description || '',
        sizeTier: p.sizeTier,
        estimatedBinaryVars: p.estimatedBinaryVars || 0,
        objectiveSense: p.objectiveSense,
        source: p.source || { name: '', url: null, license: '' },
        version: p.currentVersion || 1,
        contentHash: v?.contentHash || '',
        status: v?.status || 'pipeline_generated',
        prompt: v?.prompt || '',
        data: v?.data || {},
        bestKnown: v?.bestKnown || { value: 0, kind: 'proven_optimal', method: '' },
        benchmark: b
          ? {
              verdict: b.verdict,
              quboVars: b.quboVars,
              quboGapPct: b.qubo?.gapVsBestKnownPct ?? null,
              quboFeasRuns: b.qubo?.feasibleRuns ?? 0,
              quboTotalRuns: b.qubo?.totalRuns ?? 0,
              classicalBest: b.classical?.bestObjective ?? null,
              classicalTimeMs: b.classical?.meanTimeMs ?? null,
              runAt: b.runAt,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, problems: rows });
  } catch (error: any) {
    console.error('[GET /api/admin/library] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load library' }, { status: 500 });
  }
}

/**
 * POST /api/admin/library
 * Admin-only create, edit (creates a new immutable version on content change), or bulk import (JSON array).
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await verifyAdminCookies())) {
      return NextResponse.json({ error: 'Unauthorized — admin session required.' }, { status: 401 });
    }
    await dbConnect();
    const body = await req.json();
    const items: any[] = Array.isArray(body.problems)
      ? body.problems
      : body.problem
      ? [body.problem]
      : [body];

    if (items.length === 0) {
      return NextResponse.json({ error: 'No problems provided.' }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    let unchanged = 0;
    const errors: Array<{ index: number; slug?: string; error: string }> = [];

    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      try {
        const title = String(raw.title || '').trim();
        const industry = String(raw.industry || '').trim();
        const problemType = String(raw.problemType || 'Combinatorial').trim();
        const prompt = String(raw.prompt || '').trim();
        const objectiveSense =
          String(raw.objectiveSense || 'Minimize').toLowerCase() === 'maximize' ? 'Maximize' : 'Minimize';
        const estimatedBinaryVars = Math.max(1, Number(raw.estimatedBinaryVars) || 10);
        const sizeTier =
          raw.sizeTier === 'small' || raw.sizeTier === 'medium' || raw.sizeTier === 'large'
            ? raw.sizeTier
            : inferSizeTier(estimatedBinaryVars);

        const bestKnownVal = Number(raw.bestKnown?.value ?? raw.bestKnownValue);
        if (!title || !industry || !prompt || !Number.isFinite(bestKnownVal)) {
          errors.push({
            index: i,
            slug: raw.slug,
            error: 'Missing required fields: title, industry, prompt, and numeric bestKnown.value.',
          });
          continue;
        }

        const slug = slugify(String(raw.slug || `${industry}-${title}`));
        if (!slug) {
          errors.push({ index: i, error: 'Could not derive a valid slug.' });
          continue;
        }

        const bestKnown = {
          value: bestKnownVal,
          kind:
            raw.bestKnown?.kind === 'published_optimal' || raw.bestKnownKind === 'published_optimal'
              ? ('published_optimal' as const)
              : ('proven_optimal' as const),
          method: String(raw.bestKnown?.method ?? raw.bestKnownMethod ?? 'Imported reference optimum').trim(),
        };

        const source = {
          name: String(raw.source?.name ?? raw.sourceName ?? 'Admin import').trim(),
          url: raw.source?.url ?? raw.sourceUrl ?? null,
          license: String(raw.source?.license ?? raw.sourceLicense ?? 'Internal / Specified by admin').trim(),
        };

        const dataObj = raw.data && typeof raw.data === 'object' ? raw.data : {};
        const hash = computeContentHash({ prompt, data: dataObj, objectiveSense, bestKnown });

        const existing = await LibraryProblem.findOne({ slug }).lean<any>();
        const existingVersion = existing
          ? await LibraryProblemVersion.findOne({ slug, contentHash: hash }).lean<any>()
          : null;

        let versionNumber = existing?.currentVersion ?? 1;
        if (!existingVersion) {
          const latest = await LibraryProblemVersion.findOne({ slug }).sort({ version: -1 }).lean<any>();
          versionNumber = latest ? latest.version + 1 : 1;
          await LibraryProblemVersion.create({
            slug,
            version: versionNumber,
            contentHash: hash,
            prompt,
            data: dataObj,
            bestKnown,
            status: 'pipeline_generated',
          });
          if (existing) updated++;
          else created++;
        } else {
          versionNumber = existingVersion.version;
          unchanged++;
        }

        await LibraryProblem.findOneAndUpdate(
          { slug },
          {
            slug,
            title,
            industry,
            problemType,
            description: String(raw.description || '').trim(),
            sizeTier,
            estimatedBinaryVars,
            objectiveSense,
            source,
            currentVersion: versionNumber,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (e: any) {
        errors.push({ index: i, slug: raw?.slug, error: e?.message || 'Import error' });
      }
    }

    return NextResponse.json({
      success: true,
      summary: { total: items.length, created, updated, unchanged, failed: errors.length },
      errors,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/library] Error:', error);
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/library?slug=...
 * Admin-only delete of a library problem template along with its versions and benchmark runs.
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!(await verifyAdminCookies())) {
      return NextResponse.json({ error: 'Unauthorized — admin session required.' }, { status: 401 });
    }
    const slug = new URL(req.url).searchParams.get('slug');
    if (!slug) {
      return NextResponse.json({ error: 'slug is required.' }, { status: 400 });
    }

    await dbConnect();
    await Promise.all([
      LibraryProblem.deleteOne({ slug }),
      LibraryProblemVersion.deleteMany({ slug }),
      LibraryBenchmarkRun.deleteMany({ slug }),
    ]);

    return NextResponse.json({ success: true, deletedSlug: slug });
  } catch (error: any) {
    console.error('[DELETE /api/admin/library] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete problem' }, { status: 500 });
  }
}
