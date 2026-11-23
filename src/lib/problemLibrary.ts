import crypto from 'crypto';
import dbConnect from '@/lib/db';
import LibraryProblem from '@/models/LibraryProblem';
import LibraryProblemVersion from '@/models/LibraryProblemVersion';
import LibraryBenchmarkRun from '@/models/LibraryBenchmarkRun';
import logisticsSeed from '@/data/problemLibrary/logistics.json';
import logisticsBenchmarks from '@/data/problemLibrary/logistics_benchmarks.json';
import multiIndustrySeed from '@/data/problemLibrary/multi_industry.json';
import multiIndustryBenchmarks from '@/data/problemLibrary/multi_industry_benchmarks.json';
import constructionSeed from '@/data/problemLibrary/construction.json';
import constructionBenchmarks from '@/data/problemLibrary/construction_benchmarks.json';

/** All seed bundles shipped with the app. Add new industries here. */
const SEED_BUNDLES: Array<{ industry: string; problems: any[] }> = [
  logisticsSeed as any,
  multiIndustrySeed as any,
  constructionSeed as any,
];
const BENCHMARK_BUNDLES: Array<{ benchmarks: any[] }> = [
  logisticsBenchmarks as any,
  multiIndustryBenchmarks as any,
  constructionBenchmarks as any,
];

function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

export function computeContentHash(p: {
  prompt: string;
  data: any;
  objectiveSense: string;
  bestKnown: any;
}): string {
  return crypto
    .createHash('sha256')
    .update(
      stableStringify({
        prompt: p.prompt,
        data: p.data,
        objectiveSense: p.objectiveSense,
        bestKnown: p.bestKnown,
      })
    )
    .digest('hex');
}

let seedPromise: Promise<void> | null = null;

/**
 * Idempotently upserts the shipped seed problems and their reproducible benchmark snapshots into MongoDB.
 * Unchanged content is a no-op; changed content creates a new immutable version.
 */
export function ensureLibrarySeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      await dbConnect();
      const allProblems = SEED_BUNDLES.flatMap((b) => b.problems || []);
      if (allProblems.length === 0) return;

      const slugs = allProblems.map((p) => p.slug);

      // Single batched read of existing templates & versions instead of ~160 sequential round-trips
      const [existingTemplates, existingVersions] = await Promise.all([
        LibraryProblem.find({ slug: { $in: slugs } })
          .select('slug currentVersion')
          .lean<any[]>(),
        LibraryProblemVersion.find({ slug: { $in: slugs } })
          .select('slug version contentHash')
          .lean<any[]>(),
      ]);

      const maxVersionBySlug = new Map<string, number>();
      const versionBySlugHash = new Map<string, number>();
      for (const v of existingVersions) {
        versionBySlugHash.set(`${v.slug}@${v.contentHash}`, v.version);
        const curMax = maxVersionBySlug.get(v.slug) ?? 0;
        if (v.version > curMax) maxVersionBySlug.set(v.slug, v.version);
      }
      for (const t of existingTemplates) {
        const curMax = maxVersionBySlug.get(t.slug) ?? 0;
        if ((t.currentVersion ?? 0) > curMax) maxVersionBySlug.set(t.slug, t.currentVersion);
      }

      const newVersionOps: any[] = [];
      const templateOps: any[] = [];

      for (const p of allProblems) {
        const hash = computeContentHash(p);
        const existingVerNum = versionBySlugHash.get(`${p.slug}@${hash}`);
        let versionNumber: number;

        if (existingVerNum !== undefined) {
          versionNumber = existingVerNum;
        } else {
          versionNumber = (maxVersionBySlug.get(p.slug) ?? 0) + 1;
          maxVersionBySlug.set(p.slug, versionNumber);
          versionBySlugHash.set(`${p.slug}@${hash}`, versionNumber);
          newVersionOps.push({
            insertOne: {
              document: {
                slug: p.slug,
                version: versionNumber,
                contentHash: hash,
                prompt: p.prompt,
                data: p.data,
                bestKnown: p.bestKnown,
                status: 'pipeline_generated',
              },
            },
          });
        }

        templateOps.push({
          updateOne: {
            filter: { slug: p.slug },
            update: {
              $set: {
                slug: p.slug,
                title: p.title,
                industry: p.industry,
                problemType: p.problemType,
                description: p.description,
                sizeTier: p.sizeTier,
                estimatedBinaryVars: p.estimatedBinaryVars,
                objectiveSense: p.objectiveSense,
                source: p.source,
                currentVersion: versionNumber,
              },
            },
            upsert: true,
          },
        });
      }

      const benchOps: any[] = [];
      for (const bundle of BENCHMARK_BUNDLES) {
        for (const b of bundle.benchmarks || []) {
          if (!b?.slug || !b?.contentHash) continue;
          benchOps.push({
            updateOne: {
              filter: { slug: b.slug, contentHash: b.contentHash },
              update: {
                $set: {
                  slug: b.slug,
                  contentHash: b.contentHash,
                  runAt: b.runAt,
                  protocol: b.protocol,
                  quboVars: b.quboVars,
                  verdict: b.verdict,
                  verdictNote: b.verdictNote,
                  qubo: b.qubo,
                  classical: b.classical,
                },
              },
              upsert: true,
            },
          });
        }
      }

      // Execute all upserts in at most 3 parallel bulkWrite calls (~200ms vs ~10s serial)
      const tasks: Promise<any>[] = [];
      if (newVersionOps.length > 0) {
        tasks.push(LibraryProblemVersion.bulkWrite(newVersionOps, { ordered: false }));
      }
      if (templateOps.length > 0) {
        tasks.push(LibraryProblem.bulkWrite(templateOps, { ordered: false }));
      }
      if (benchOps.length > 0) {
        tasks.push(LibraryBenchmarkRun.bulkWrite(benchOps, { ordered: false }));
      }
      if (tasks.length > 0) {
        await Promise.all(tasks);
      }
    })().catch((err) => {
      seedPromise = null; // allow retry on next request
      throw err;
    });
  }
  return seedPromise;
}

export interface LambdaSweepPoint {
  lambda: number;
  feasibilityRate: number;
  bestObjective: number | null;
}

export interface LibraryBenchmarkSummary {
  slug: string;
  contentHash: string;
  runAt: string;
  protocol: {
    repeats: number;
    seeds: number[];
    quboReadsPerRepeat: number;
    maxQuboVars: number;
  };
  quboVars: number;
  verdict: 'competitive' | 'classical_wins' | 'exceeds_qubo_limit';
  verdictNote: string;
  qubo: {
    backend: string;
    exceedsLimit: boolean;
    bestLambda: number | null;
    lambdaSweep: LambdaSweepPoint[];
    feasibilityRate: number;
    feasibleRuns: number;
    totalRuns: number;
    bestObjective: number | null;
    meanObjective: number | null;
    stdObjective: number | null;
    gapVsBestKnownPct: number | null;
    gapVsOrtoolsPct: number | null;
    meanTimeMs: number | null;
  };
  classical: {
    backend: string;
    status: string;
    feasibilityRate: number;
    feasibleRuns: number;
    totalRuns: number;
    bestObjective: number | null;
    meanObjective: number | null;
    stdObjective: number | null;
    gapVsBestKnownPct: number | null;
    meanTimeMs: number | null;
  };
}

export interface LibraryListItem {
  slug: string;
  title: string;
  industry: string;
  problemType: string;
  description: string;
  sizeTier: 'small' | 'medium' | 'large';
  estimatedBinaryVars: number;
  objectiveSense: 'Minimize' | 'Maximize';
  source: { name: string; url: string | null; license: string };
  version: number;
  status: string;
  bestKnown: { value: number; kind: 'proven_optimal' | 'published_optimal'; method: string };
  benchmark?: LibraryBenchmarkSummary | null;
}

export interface LibraryDetail extends LibraryListItem {
  contentHash: string;
  prompt: string;
  data: any;
}
