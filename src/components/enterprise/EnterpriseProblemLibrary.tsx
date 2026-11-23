"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { LibraryDetail, LibraryListItem } from "@/lib/problemLibrary";
import { SolverFitMap } from "./SolverFitMap";

interface EnterpriseProblemLibraryProps {
  isDark: boolean;
  isDemo?: boolean;
  onOpenProblem: (problem: LibraryDetail) => void;
}

const SIZE_LABEL: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

const KIND_LABEL: Record<string, string> = {
  proven_optimal: "Proven optimal",
  published_optimal: "Published optimal",
};

const VERDICT_LABEL: Record<string, string> = {
  competitive: "Competitive",
  classical_wins: "Classical Wins",
  exceeds_qubo_limit: "Exceeds QUBO Limit",
};

function fmtMs(ms: number | null | undefined): string {
  if (typeof ms !== "number") return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(1)}ms`;
}

export function EnterpriseProblemLibrary({ isDark, isDemo = false, onOpenProblem }: EnterpriseProblemLibraryProps) {
  const [viewMode, setViewMode] = useState<"problems" | "fit_map">("problems");
  const [problems, setProblems] = useState<LibraryListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [industryFilter, setIndustryFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [sizeFilter, setSizeFilter] = useState<string>("All");
  const [verdictFilter, setVerdictFilter] = useState<string>("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, LibraryDetail>>({});
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/enterprise/library", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.success) {
          setError(data.error || "Failed to load the problem library.");
          return;
        }
        setProblems(data.problems as LibraryListItem[]);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load the problem library.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const industries = useMemo(
    () => ["All", ...Array.from(new Set((problems || []).map((p) => p.industry))).sort()],
    [problems]
  );

  const industryScoped = useMemo(
    () => (problems || []).filter((p) => industryFilter === "All" || p.industry === industryFilter),
    [problems, industryFilter]
  );

  const problemTypes = useMemo(
    () => ["All", ...Array.from(new Set(industryScoped.map((p) => p.problemType))).sort()],
    [industryScoped]
  );

  const filtered = useMemo(
    () =>
      industryScoped.filter(
        (p) =>
          (typeFilter === "All" || p.problemType === typeFilter) &&
          (sizeFilter === "All" || p.sizeTier === sizeFilter) &&
          (verdictFilter === "All" || p.benchmark?.verdict === verdictFilter)
      ),
    [industryScoped, typeFilter, sizeFilter, verdictFilter]
  );

  const fetchDetail = async (slug: string): Promise<LibraryDetail | null> => {
    if (details[slug]) return details[slug];
    setLoadingSlug(slug);
    try {
      const res = await fetch(`/api/enterprise/library/${encodeURIComponent(slug)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load problem details.");
        return null;
      }
      setDetails((prev) => ({ ...prev, [slug]: data.problem }));
      return data.problem as LibraryDetail;
    } catch (err: any) {
      setError(err?.message || "Failed to load problem details.");
      return null;
    } finally {
      setLoadingSlug(null);
    }
  };

  const toggleExpand = async (slug: string) => {
    if (expanded === slug) {
      setExpanded(null);
      return;
    }
    setExpanded(slug);
    await fetchDetail(slug);
  };

  const handleInspectFromMap = async (slug: string) => {
    setIndustryFilter("All");
    setTypeFilter("All");
    setSizeFilter("All");
    setVerdictFilter("All");
    setViewMode("problems");
    setExpanded(slug);
    await fetchDetail(slug);
  };

  const handleOpen = async (slug: string) => {
    if (isDemo) return;
    const detail = await fetchDetail(slug);
    if (detail) onOpenProblem(detail);
  };

  const panelBg = isDark ? "#0C0D11" : "#FFFFFF";
  const border = isDark ? "border-white/[0.08]" : "border-slate-200";
  const textMain = isDark ? "text-zinc-100" : "text-slate-900";
  const textMuted = isDark ? "text-zinc-400" : "text-slate-600";
  const textFaint = isDark ? "text-zinc-500" : "text-slate-500";

  const chip = (active: boolean) =>
    `px-2.5 py-1 rounded-md text-[11px] font-mono border cursor-pointer transition-colors ${
      active
        ? isDark
          ? "bg-white/[0.10] border-white/[0.20] text-zinc-100"
          : "bg-slate-900 border-slate-900 text-white"
        : isDark
        ? "bg-transparent border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
    }`;

  const verdictTextClass = (verdict?: string) => {
    if (verdict === "competitive") return isDark ? "text-emerald-400" : "text-emerald-700";
    if (verdict === "exceeds_qubo_limit") return isDark ? "text-amber-400" : "text-amber-700";
    return isDark ? "text-zinc-300" : "text-slate-700";
  };

  return (
    <div className="h-full w-full overflow-y-auto" style={{ backgroundColor: isDark ? "#090A0D" : "#F8FAFC" }}>
      <div className="max-w-6xl mx-auto px-5 py-6 space-y-5">
        {/* Header + View Switcher */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className={`text-lg font-semibold font-sans tracking-tight ${textMain}`}>Problem Library</h1>
            <p className={`text-[13px] leading-relaxed font-sans max-w-3xl ${textMuted}`}>
              Multi-industry benchmark problems with verified best-known optima and seeded side-by-side runs comparing
              D-Wave Simulated Annealing (classical software) against Google OR-Tools CP-SAT.
            </p>
          </div>

          {/* Problems | Solver Fit Map segmented toggle */}
          <div
            style={{ backgroundColor: isDark ? "#0C0D11" : "#F1F5F9" }}
            className={`inline-flex items-center p-0.5 rounded-lg border text-[11px] font-mono shrink-0 ${border}`}
          >
            <button
              type="button"
              onClick={() => setViewMode("problems")}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === "problems"
                  ? isDark
                    ? "bg-white/[0.08] text-zinc-100 font-medium border border-white/[0.12]"
                    : "bg-white text-slate-900 font-medium border border-slate-200 shadow-2xs"
                  : textMuted
              }`}
            >
              Problems
            </button>
            <button
              type="button"
              onClick={() => setViewMode("fit_map")}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === "fit_map"
                  ? isDark
                    ? "bg-white/[0.08] text-zinc-100 font-medium border border-white/[0.12]"
                    : "bg-white text-slate-900 font-medium border border-slate-200 shadow-2xs"
                  : textMuted
              }`}
            >
              Solver Fit Map
            </button>
          </div>
        </div>

        {isDemo && (
          <p className={`text-[12px] font-sans ${textFaint}`}>
            Demo account: you can browse problems and benchmark results, but loading them into Copilot is disabled.
          </p>
        )}

        {error && (
          <div className={`text-[12px] font-mono px-3 py-2 rounded-md border ${border} ${isDark ? "text-amber-300" : "text-amber-700"}`}>
            {error}
          </div>
        )}

        {!problems && !error && <div className={`text-[12px] font-mono ${textFaint}`}>Loading problems...</div>}

        {/* Shared Industry Filter Strip (applies to both Problems and Solver Fit Map) */}
        {problems && industries.length > 2 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[11px] font-mono mr-1 ${textFaint}`}>Industry</span>
            {industries.map((ind) => (
              <button
                key={ind}
                type="button"
                className={chip(industryFilter === ind)}
                onClick={() => {
                  setIndustryFilter(ind);
                  setTypeFilter("All");
                }}
              >
                {ind}
              </button>
            ))}
          </div>
        )}

        {/* ── VIEW 1: SOLVER FIT MAP ── */}
        {problems && viewMode === "fit_map" && (
          <SolverFitMap isDark={isDark} problems={industryScoped} onSelectProblem={handleInspectFromMap} />
        )}

        {/* ── VIEW 2: PROBLEM CARDS ── */}
        {problems && viewMode === "problems" && (
          <>
            {/* Filters */}
            {problems.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-[11px] font-mono mr-1 ${textFaint}`}>Type</span>
                  {problemTypes.map((t) => (
                    <button key={t} type="button" className={chip(typeFilter === t)} onClick={() => setTypeFilter(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-[11px] font-mono mr-1 ${textFaint}`}>Size</span>
                  {["All", "small", "medium", "large"].map((s) => (
                    <button key={s} type="button" className={chip(sizeFilter === s)} onClick={() => setSizeFilter(s)}>
                      {s === "All" ? "All" : SIZE_LABEL[s]}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-[11px] font-mono mr-1 ${textFaint}`}>Fit</span>
                  {["All", "competitive", "classical_wins", "exceeds_qubo_limit"].map((v) => (
                    <button key={v} type="button" className={chip(verdictFilter === v)} onClick={() => setVerdictFilter(v)}>
                      {v === "All" ? "All" : VERDICT_LABEL[v]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <div className={`text-[13px] font-sans ${textFaint}`}>No problems match these filters.</div>
            )}

            {/* Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((p) => {
                const isOpen = expanded === p.slug;
                const detail = details[p.slug];
                const b = p.benchmark;
                return (
                  <div
                    key={p.slug}
                    style={{ backgroundColor: panelBg }}
                    className={`rounded-xl border ${border} p-4 space-y-3 ${isOpen ? "lg:col-span-2" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className={`text-[11px] font-mono ${textFaint}`}>
                          {p.industry} · {p.problemType}
                        </div>
                        <h3 className={`text-sm font-semibold font-sans ${textMain}`}>{p.title}</h3>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {b && (
                          <span className={`text-[11px] font-mono font-medium ${verdictTextClass(b.verdict)}`}>
                            {VERDICT_LABEL[b.verdict] || b.verdict}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border ${border} ${textFaint}`}
                          title="Total QUBO binary variables (decision + slack)"
                        >
                          {SIZE_LABEL[p.sizeTier]} · {b ? `${b.quboVars} QUBO vars` : `~${p.estimatedBinaryVars} vars`}
                        </span>
                      </div>
                    </div>

                    <p className={`text-[12.5px] leading-relaxed font-sans ${textMuted}`}>{p.description}</p>

                    {/* Compact Seeded Benchmark Strip */}
                    {b && (
                      <div
                        className={`rounded-lg border ${border} grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x ${
                          isDark ? "divide-white/[0.08] bg-white/[0.015]" : "divide-slate-200 bg-slate-50/70"
                        } text-[11px] font-mono`}
                      >
                        <div className="px-3 py-2 space-y-0.5">
                          <div className={textFaint}>D-Wave SA (classical software)</div>
                          {b.qubo.exceedsLimit ? (
                            <div className={isDark ? "text-amber-400" : "text-amber-700"}>
                              Exceeds {b.protocol.maxQuboVars}-var QUBO limit ({b.quboVars} vars)
                            </div>
                          ) : b.qubo.bestObjective === null ? (
                            <div className={textMuted}>
                              0/{b.qubo.totalRuns} feasible · {fmtMs(b.qubo.meanTimeMs)}
                            </div>
                          ) : (
                            <div className={textMuted}>
                              Best <strong className={textMain}>{b.qubo.bestObjective}</strong> (
                              {b.qubo.gapVsBestKnownPct?.toFixed(2)}% gap) · {b.qubo.feasibleRuns}/{b.qubo.totalRuns} feas ·{" "}
                              {fmtMs(b.qubo.meanTimeMs)}
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-2 space-y-0.5">
                          <div className={textFaint}>Google OR-Tools CP-SAT</div>
                          <div className={textMuted}>
                            Best <strong className={textMain}>{b.classical.bestObjective ?? "—"}</strong> (
                            {typeof b.classical.gapVsBestKnownPct === "number"
                              ? `${b.classical.gapVsBestKnownPct.toFixed(2)}% gap`
                              : "—"}
                            ) · {b.classical.status} · {fmtMs(b.classical.meanTimeMs)}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={`flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-mono ${textMuted}`}>
                      <span>
                        {p.objectiveSense === "Minimize" ? "Min" : "Max"} best known:{" "}
                        <strong className={`font-semibold ${textMain}`}>{p.bestKnown.value}</strong>{" "}
                        <span className={textFaint}>({KIND_LABEL[p.bestKnown.kind]})</span>
                      </span>
                      <span className={textFaint}>Source: {p.source.name}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpen(p.slug)}
                        disabled={isDemo || loadingSlug === p.slug}
                        title={isDemo ? "Demo accounts cannot load library problems" : "Create a project from this problem in Copilot"}
                        className={`px-3 py-1 rounded-md text-[11px] font-mono font-medium border transition-colors ${
                          isDemo
                            ? "border-white/[0.06] text-zinc-600 cursor-not-allowed"
                            : isDark
                            ? "bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.16] text-zinc-100 cursor-pointer"
                            : "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white cursor-pointer"
                        }`}
                      >
                        Load Problem
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleExpand(p.slug)}
                        className={`px-3 py-1 rounded-md text-[11px] font-mono border cursor-pointer transition-colors ${border} ${textMuted} ${
                          isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-50"
                        }`}
                      >
                        {isOpen ? "Hide details" : "Details"}
                      </button>
                    </div>

                    {isOpen && (
                      <div className={`border-t pt-3 space-y-4 ${border}`}>
                        {!detail ? (
                          <div className={`text-[12px] font-mono ${textFaint}`}>Loading details...</div>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <div className={`text-[11px] font-mono ${textFaint}`}>Problem statement</div>
                              <p className={`text-[12.5px] leading-relaxed font-sans whitespace-pre-wrap ${textMuted}`}>
                                {detail.prompt}
                              </p>
                            </div>

                            {detail.benchmark && (
                              <div className="space-y-2">
                                <div className={`text-[11px] font-mono ${textFaint}`}>Benchmark summary</div>
                                <p className={`text-[12.5px] leading-relaxed font-sans ${textMuted}`}>
                                  {detail.benchmark.verdictNote}
                                </p>

                                {/* λ Sweep Table */}
                                {detail.benchmark.qubo.lambdaSweep.length > 0 && (
                                  <div className={`rounded-lg border ${border} overflow-hidden max-w-md`}>
                                    <table className="w-full text-left text-[11px] font-mono">
                                      <thead>
                                        <tr className={`border-b ${border} ${textFaint}`}>
                                          <th className="py-1.5 px-3 font-medium">Penalty λ</th>
                                          <th className="py-1.5 px-3 font-medium">Feasibility</th>
                                          <th className="py-1.5 px-3 font-medium text-right">Best Obj</th>
                                        </tr>
                                      </thead>
                                      <tbody className={`divide-y ${isDark ? "divide-white/[0.06]" : "divide-slate-100"}`}>
                                        {detail.benchmark.qubo.lambdaSweep.map((pt) => {
                                          const isChosen = pt.lambda === detail.benchmark?.qubo.bestLambda;
                                          return (
                                            <tr
                                              key={pt.lambda}
                                              className={isChosen ? (isDark ? "bg-white/[0.04]" : "bg-slate-50") : ""}
                                            >
                                              <td className={`py-1.5 px-3 ${isChosen ? textMain : textMuted}`}>
                                                {pt.lambda}
                                                {isChosen ? " (selected)" : ""}
                                              </td>
                                              <td className={`py-1.5 px-3 ${textMuted}`}>
                                                {Math.round(pt.feasibilityRate * 100)}%
                                              </td>
                                              <td className={`py-1.5 px-3 text-right ${textMain}`}>
                                                {pt.bestObjective ?? "—"}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                <div className={`flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] font-mono ${textFaint}`}>
                                  <span>
                                    Protocol: N={detail.benchmark.protocol.repeats} seeds (
                                    {detail.benchmark.protocol.seeds.join(", ")})
                                  </span>
                                  <span>Reads: {detail.benchmark.protocol.quboReadsPerRepeat.toLocaleString()}</span>
                                  {detail.benchmark.qubo.meanObjective !== null && (
                                    <span>
                                      SA mean ± std: {detail.benchmark.qubo.meanObjective.toFixed(2)} ±{" "}
                                      {(detail.benchmark.qubo.stdObjective ?? 0).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="space-y-1">
                              <div className={`text-[11px] font-mono ${textFaint}`}>How the best-known value was verified</div>
                              <p className={`text-[12.5px] leading-relaxed font-sans ${textMuted}`}>
                                {detail.bestKnown.method}
                              </p>
                            </div>

                            <div className={`flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-mono ${textFaint}`}>
                              <span>
                                Source: {detail.source.name}
                                {detail.source.url ? ` (${detail.source.url})` : ""}
                              </span>
                              <span>License: {detail.source.license}</span>
                              <span>
                                Version v{detail.version} · {detail.contentHash.slice(0, 10)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
