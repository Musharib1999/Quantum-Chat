import crypto from 'crypto';
import dbConnect from '@/lib/db';
import LibraryProblem from '@/models/LibraryProblem';
import LibraryProblemVersion from '@/models/LibraryProblemVersion';
import LibraryBenchmarkRun from '@/models/LibraryBenchmarkRun';
import logisticsSeed from '@/data/problemLibrary/logistics.json';
import logisticsBenchmarks from '@/data/problemLibrary/logistics_benchmarks.json';

/** All seed bundles shipped with the app. Add new industries here. */
const SEED_BUNDLES: Array<{ industry: string; problems: any[] }> = [logisticsSeed as any];
const BENCHMARK_BUNDLES: Array<{ benchmarks: any[] }> = [logisticsBenchmarks as any];

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
      for (const bundle of SEED_BUNDLES) {
        for (const p of bundle.problems) {
          const hash = computeContentHash(p);
          const existing = await LibraryProblem.findOne({ slug: p.slug }).lean<any>();
          const existingVersion = existing
            ? await LibraryProblemVersion.findOne({ slug: p.slug, contentHash: hash }).lean<any>()
            : null;

          let versionNumber = existing?.currentVersion ?? 1;
          if (!existingVersion) {
            const latest = await LibraryProblemVersion.findOne({ slug: p.slug })
              .sort({ version: -1 })
              .lean<any>();
            versionNumber = latest ? latest.version + 1 : 1;
            await LibraryProblemVersion.create({
              slug: p.slug,
              version: versionNumber,
              contentHash: hash,
              prompt: p.prompt,
              data: p.data,
              bestKnown: p.bestKnown,
              status: 'pipeline_generated',
            });
          } else {
            versionNumber = existingVersion.version;
          }

          await LibraryProblem.findOneAndUpdate(
            { slug: p.slug },
            {
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
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
      }

      // Idempotently seed reproducible benchmark snapshots bound to (slug, contentHash)
      for (const bundle of BENCHMARK_BUNDLES) {
        for (const b of bundle.benchmarks || []) {
          if (!b?.slug || !b?.contentHash) continue;
          await LibraryBenchmarkRun.findOneAndUpdate(
            { slug: b.slug, contentHash: b.contentHash },
            {
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
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
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
