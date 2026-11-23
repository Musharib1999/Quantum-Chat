"use client";

import React, { useMemo, useState } from "react";
import type { LibraryListItem } from "@/lib/problemLibrary";

interface SolverFitMapProps {
  isDark: boolean;
  problems: LibraryListItem[];
  onSelectProblem?: (slug: string) => void;
}

const VERDICT_LABEL: Record<string, string> = {
  competitive: "Competitive",
  classical_wins: "Classical Wins",
  exceeds_qubo_limit: "Exceeds QUBO Limit",
};

function fmtMs(ms: number | null | undefined): string {
  if (typeof ms !== "number") return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(1)}ms`;
}

function fmtGap(gap: number | null | undefined): string {
  if (typeof gap !== "number") return "—";
  return `${gap.toFixed(2)}%`;
}

export function SolverFitMap({ isDark, problems, onSelectProblem }: SolverFitMapProps) {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const benchmarked = useMemo(
    () =>
      problems
        .filter((p) => Boolean(p.benchmark))
        .slice()
        .sort((a, b) => (a.benchmark?.quboVars ?? 0) - (b.benchmark?.quboVars ?? 0)),
    [problems]
  );

  const counts = useMemo(() => {
    let competitive = 0;
    let classical = 0;
    let exceeds = 0;
    for (const p of benchmarked) {
      const v = p.benchmark?.verdict;
      if (v === "competitive") competitive++;
      else if (v === "exceeds_qubo_limit") exceeds++;
      else classical++;
    }
    return { total: benchmarked.length, competitive, classical, exceeds };
  }, [benchmarked]);

  const activeProblem = useMemo(
    () => benchmarked.find((p) => p.slug === hoveredSlug) || benchmarked[0] || null,
    [benchmarked, hoveredSlug]
  );

  const panelBg = isDark ? "#0C0D11" : "#FFFFFF";
  const border = isDark ? "border-white/[0.08]" : "border-slate-200";
  const textMain = isDark ? "text-zinc-100" : "text-slate-900";
  const textMuted = isDark ? "text-zinc-400" : "text-slate-600";
  const textFaint = isDark ? "text-zinc-500" : "text-slate-500";

  if (benchmarked.length === 0) {
    return (
      <div
        style={{ backgroundColor: panelBg }}
        className={`rounded-xl border ${border} p-8 text-center text-xs font-mono ${textFaint}`}
      >
        No benchmark snapshots loaded yet.
      </div>
    );
  }

  // SVG chart geometry
  const W = 760;
  const H = 260;
  const padL = 58;
  const padR = 28;
  const padT = 26;
  const padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxQuboLimit = benchmarked[0]?.benchmark?.protocol?.maxQuboVars ?? 150;
  const maxVars = Math.max(
    maxQuboLimit + 60,
    ...benchmarked.map((p) => p.benchmark?.quboVars ?? p.estimatedBinaryVars)
  );
  const finiteGaps = benchmarked
    .map((p) => p.benchmark?.qubo?.gapVsBestKnownPct)
    .filter((g): g is number => typeof g === "number");
  const maxGap = Math.max(10, Math.ceil((Math.max(0, ...finiteGaps) + 2) / 5) * 5);

  const xScale = (vars: number) => padL + (Math.min(vars, maxVars) / maxVars) * plotW;
  // Reserve top 22px of plot area for "Infeasible / Exceeds Limit" band
  const unsolvableBandY = padT + 12;
  const gapTopY = padT + 34;
  const gapBottomY = padT + plotH;
  const yScaleGap = (gapPct: number | null | undefined, exceeds: boolean) => {
    if (exceeds || typeof gapPct !== "number") return unsolvableBandY;
    const clamped = Math.min(Math.max(gapPct, 0), maxGap);
    return gapBottomY - (clamped / maxGap) * (gapBottomY - gapTopY);
  };

  const limitX = xScale(maxQuboLimit);
  const yTicks = [0, Math.round(maxGap / 2), maxGap];
  const xTicks = [0, 50, 100, 150, 200].filter((t) => t <= maxVars);

  const verdictColor = (verdict?: string) => {
    if (verdict === "competitive") return isDark ? "#34D399" : "#059669";
    if (verdict === "exceeds_qubo_limit") return isDark ? "#FBBF24" : "#D97706";
    return isDark ? "#94A3B8" : "#475569";
  };

  const verdictTextClass = (verdict?: string) => {
    if (verdict === "competitive") return isDark ? "text-emerald-400" : "text-emerald-700";
    if (verdict === "exceeds_qubo_limit") return isDark ? "text-amber-400" : "text-amber-700";
    return isDark ? "text-zinc-300" : "text-slate-700";
  };

  return (
    <div className="space-y-5">
      {/* 1. Summary Strip */}
      <div
        style={{ backgroundColor: panelBg }}
        className={`rounded-xl border ${border} grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x ${
          isDark ? "divide-white/[0.08]" : "divide-slate-200"
        }`}
      >
        <div className="p-4 space-y-1">
          <div className={`text-[11px] font-mono ${textFaint}`}>Benchmarked</div>
          <div className={`text-xl font-semibold font-mono ${textMain}`}>{counts.total}</div>
        </div>
        <div className="p-4 space-y-1">
          <div className={`text-[11px] font-mono ${textFaint}`}>Competitive (≤1% gap)</div>
          <div className={`text-xl font-semibold font-mono ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
            {counts.competitive}
          </div>
        </div>
        <div className="p-4 space-y-1">
          <div className={`text-[11px] font-mono ${textFaint}`}>Classical Wins</div>
          <div className={`text-xl font-semibold font-mono ${textMain}`}>{counts.classical}</div>
        </div>
        <div className="p-4 space-y-1">
          <div className={`text-[11px] font-mono ${textFaint}`}>Exceeds QUBO Limit</div>
          <div className={`text-xl font-semibold font-mono ${isDark ? "text-amber-400" : "text-amber-700"}`}>
            {counts.exceeds}
          </div>
        </div>
      </div>

      {/* 2. Methodology Disclosure */}
      <div className={`text-[12px] font-sans leading-relaxed ${textMuted}`}>
        <strong className={textMain}>Benchmark protocol:</strong> D-Wave Simulated Annealing runs on classical software (
        <code className="font-mono text-[11px]">dwave-neal</code>), not quantum hardware. Every problem runs{" "}
        <span className="font-mono text-[11px]">N = 5</span> fixed seeds (
        <span className="font-mono text-[11px]">101, 202, 303, 404, 505</span>) with a 4-point{" "}
        <span className="font-mono text-[11px]">λ</span> penalty sweep, 1,000 reads per repeat, and a{" "}
        <span className="font-mono text-[11px]">{maxQuboLimit}</span>-variable QUBO cap, compared against Google OR-Tools
        CP-SAT and the independently proven/published optimum.
      </div>

      {/* 3. Visual Solver Fit Map (QUBO Vars vs. Gap %) */}
      <div style={{ backgroundColor: panelBg }} className={`rounded-xl border ${border} p-4 sm:p-5 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className={`text-sm font-semibold font-sans ${textMain}`}>
              Solver Fit Map — Problem Size vs. QUBO Optimality Gap
            </h2>
            <p className={`text-[11px] font-sans ${textFaint}`}>
              Hover or select any point to inspect exact metrics. Points near 0% match the proven optimum.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span className={textMuted}>Competitive</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
              <span className={textMuted}>Classical Wins</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span className={textMuted}>Exceeds Limit</span>
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full min-w-[540px] h-auto select-none"
            role="img"
            aria-label="Solver Fit Map plotting QUBO variables against optimality gap"
          >
            {/* Unsolvable / Exceeds limit top band */}
            <rect
              x={padL}
              y={padT}
              width={plotW}
              height={24}
              fill={isDark ? "rgba(251,191,36,0.06)" : "rgba(217,119,6,0.06)"}
            />
            <text
              x={padL + 6}
              y={unsolvableBandY + 3}
              fontSize="9.5"
              fontFamily="monospace"
              fill={isDark ? "#FBBF24" : "#B45309"}
            >
              Infeasible / Exceeds QUBO Limit
            </text>

            {/* Horizontal grid lines */}
            {yTicks.map((t) => {
              const y = yScaleGap(t, false);
              return (
                <g key={`y-${t}`}>
                  <line
                    x1={padL}
                    x2={padL + plotW}
                    y1={y}
                    y2={y}
                    stroke={isDark ? "rgba(255,255,255,0.07)" : "#E2E8F0"}
                    strokeWidth="1"
                  />
                  <text
                    x={padL - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="10"
                    fontFamily="monospace"
                    fill={isDark ? "#71717A" : "#64748B"}
                  >
                    {t}%
                  </text>
                </g>
              );
            })}

            {/* Vertical grid lines */}
            {xTicks.map((t) => {
              const x = xScale(t);
              return (
                <g key={`x-${t}`}>
                  <line
                    x1={x}
                    x2={x}
                    y1={padT}
                    y2={gapBottomY}
                    stroke={isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9"}
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={gapBottomY + 16}
                    textAnchor="middle"
                    fontSize="10"
                    fontFamily="monospace"
                    fill={isDark ? "#71717A" : "#64748B"}
                  >
                    {t}
                  </text>
                </g>
              );
            })}

            {/* QUBO Variable Limit dashed line */}
            <line
              x1={limitX}
              x2={limitX}
              y1={padT}
              y2={gapBottomY}
              stroke={isDark ? "rgba(251,191,36,0.55)" : "rgba(217,119,6,0.65)"}
              strokeDasharray="4 4"
              strokeWidth="1.2"
            />
            <text
              x={limitX - 6}
              y={gapTopY + 10}
              textAnchor="end"
              fontSize="9.5"
              fontFamily="monospace"
              fill={isDark ? "#FBBF24" : "#B45309"}
            >
              QUBO cap ({maxQuboLimit} vars)
            </text>

            {/* Axis titles */}
            <text
              x={padL + plotW / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize="10.5"
              fontFamily="monospace"
              fill={isDark ? "#A1A1AA" : "#475569"}
            >
              QUBO Size (Decision + Slack Binary Variables)
            </text>
            <text
              x={14}
              y={padT + plotH / 2}
              textAnchor="middle"
              fontSize="10.5"
              fontFamily="monospace"
              fill={isDark ? "#A1A1AA" : "#475569"}
              transform={`rotate(-90 14 ${padT + plotH / 2})`}
            >
              SA Gap vs. Best Known
            </text>

            {/* Data points */}
            {benchmarked.map((p) => {
              const b = p.benchmark!;
              const cx = xScale(b.quboVars);
              const cy = yScaleGap(b.qubo.gapVsBestKnownPct, b.qubo.exceedsLimit);
              const isSelected = activeProblem?.slug === p.slug;
              const fill = verdictColor(b.verdict);
              return (
                <g
                  key={p.slug}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredSlug(p.slug)}
                  onClick={() => setHoveredSlug(p.slug)}
                >
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={10}
                      fill="none"
                      stroke={fill}
                      strokeOpacity={0.45}
                      strokeWidth={1.5}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : 4.8}
                    fill={fill}
                    stroke={isDark ? "#0C0D11" : "#FFFFFF"}
                    strokeWidth={1.5}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Active point callout (fixed min-height prevents vertical layout shift when hovering chart points) */}
        {activeProblem && activeProblem.benchmark && (
          <div
            className={`rounded-lg border px-3.5 py-2.5 min-h-[72px] flex flex-wrap items-center justify-between gap-2 text-[12px] ${border} ${
              isDark ? "bg-white/[0.02]" : "bg-slate-50"
            }`}
          >
            <div className="space-y-0.5 flex-1 min-w-[260px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`font-semibold font-sans ${textMain}`}>{activeProblem.title}</span>
                <span className={`text-[11px] font-mono ${verdictTextClass(activeProblem.benchmark.verdict)}`}>
                  {VERDICT_LABEL[activeProblem.benchmark.verdict] || activeProblem.benchmark.verdict}
                </span>
                <span className={`text-[11px] font-mono ${textFaint}`}>
                  {activeProblem.benchmark.quboVars} QUBO vars
                </span>
              </div>
              <p className={`text-[12px] font-sans line-clamp-2 ${textMuted}`}>{activeProblem.benchmark.verdictNote}</p>
            </div>
            {onSelectProblem && (
              <button
                type="button"
                onClick={() => onSelectProblem(activeProblem.slug)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono border cursor-pointer shrink-0 ${border} ${textMuted} ${
                  isDark ? "hover:bg-white/[0.06] hover:text-zinc-100" : "hover:bg-slate-200"
                }`}
              >
                Inspect in Library
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Full Comparison Table */}
      <div style={{ backgroundColor: panelBg }} className={`rounded-xl border ${border} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11.5px] font-mono">
            <thead>
              <tr className={`border-b ${border} ${textFaint}`}>
                <th className="py-2.5 px-4 font-medium">Problem</th>
                <th className="py-2.5 px-3 font-medium">QUBO Vars</th>
                <th className="py-2.5 px-3 font-medium">Best Known</th>
                <th className="py-2.5 px-3 font-medium">D-Wave SA (classical software)</th>
                <th className="py-2.5 px-3 font-medium">OR-Tools CP-SAT</th>
                <th className="py-2.5 px-4 font-medium text-right">Solver Fit</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-white/[0.06]" : "divide-slate-100"}`}>
              {benchmarked.map((p) => {
                const b = p.benchmark!;
                const q = b.qubo;
                const c = b.classical;
                return (
                  <tr
                    key={p.slug}
                    onClick={() => onSelectProblem?.(p.slug)}
                    className={`transition-colors cursor-pointer ${
                      isDark ? "hover:bg-white/[0.03]" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-2.5 px-4">
                      <div className={`font-sans font-medium text-[12px] ${textMain}`}>{p.title}</div>
                      <div className={`text-[10.5px] ${textFaint}`}>{p.problemType}</div>
                    </td>
                    <td className={`py-2.5 px-3 ${textMuted}`}>{b.quboVars}</td>
                    <td className={`py-2.5 px-3 font-semibold ${textMain}`}>{p.bestKnown.value}</td>
                    <td className={`py-2.5 px-3 ${textMuted}`}>
                      {q.exceedsLimit ? (
                        <span className={isDark ? "text-amber-400" : "text-amber-700"}>
                          &gt; {b.protocol.maxQuboVars} var limit
                        </span>
                      ) : q.bestObjective === null ? (
                        <span>0/{q.totalRuns} feasible · {fmtMs(q.meanTimeMs)}</span>
                      ) : (
                        <span>
                          <strong className={textMain}>{q.bestObjective}</strong> ({fmtGap(q.gapVsBestKnownPct)}) ·{" "}
                          {q.feasibleRuns}/{q.totalRuns} feas · {fmtMs(q.meanTimeMs)}
                        </span>
                      )}
                    </td>
                    <td className={`py-2.5 px-3 ${textMuted}`}>
                      <strong className={textMain}>{c.bestObjective ?? "—"}</strong> ({fmtGap(c.gapVsBestKnownPct)}) ·{" "}
                      {fmtMs(c.meanTimeMs)}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-medium ${verdictTextClass(b.verdict)}`}>
                      {VERDICT_LABEL[b.verdict] || b.verdict}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
