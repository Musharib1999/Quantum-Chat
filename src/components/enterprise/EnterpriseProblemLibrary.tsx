"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { LibraryDetail, LibraryListItem } from "@/lib/problemLibrary";

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

export function EnterpriseProblemLibrary({ isDark, isDemo = false, onOpenProblem }: EnterpriseProblemLibraryProps) {
  const [problems, setProblems] = useState<LibraryListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [sizeFilter, setSizeFilter] = useState<string>("All");
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

  const problemTypes = useMemo(
    () => ["All", ...Array.from(new Set((problems || []).map((p) => p.problemType)))],
    [problems]
  );

  const filtered = useMemo(
    () =>
      (problems || []).filter(
        (p) =>
          (typeFilter === "All" || p.problemType === typeFilter) &&
          (sizeFilter === "All" || p.sizeTier === sizeFilter)
      ),
    [problems, typeFilter, sizeFilter]
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

  return (
    <div className="h-full w-full overflow-y-auto" style={{ backgroundColor: isDark ? "#090A0D" : "#F8FAFC" }}>
      <div className="max-w-6xl mx-auto px-5 py-6 space-y-5">
        {/* Header */}
        <div className="space-y-1.5">
          <h1 className={`text-lg font-semibold font-sans tracking-tight ${textMain}`}>Problem Library</h1>
          <p className={`text-[13px] leading-relaxed font-sans max-w-3xl ${textMuted}`}>
            Logistics benchmark problems with verified best-known values. Open one in the Workbench to compare the
            D-Wave QUBO solver (simulated annealing, run on classical software) against Google OR-Tools CP-SAT.
            Results show where each solver fits; classical solvers often win at these sizes.
          </p>
        </div>

        {/* Filters */}
        {problems && problems.length > 0 && (
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
          </div>
        )}

        {isDemo && (
          <p className={`text-[12px] font-sans ${textFaint}`}>
            Demo account: you can browse problems, but opening them in the Workbench is disabled.
          </p>
        )}

        {error && (
          <div className={`text-[12px] font-mono px-3 py-2 rounded-md border ${border} ${isDark ? "text-amber-300" : "text-amber-700"}`}>
            {error}
          </div>
        )}

        {!problems && !error && <div className={`text-[12px] font-mono ${textFaint}`}>Loading problems...</div>}

        {problems && filtered.length === 0 && (
          <div className={`text-[13px] font-sans ${textFaint}`}>No problems match these filters.</div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((p) => {
            const isOpen = expanded === p.slug;
            const detail = details[p.slug];
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
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-mono border ${border} ${textMuted}`}
                    title="Size tier from the estimated number of binary variables"
                  >
                    {SIZE_LABEL[p.sizeTier]} · ~{p.estimatedBinaryVars} vars
                  </span>
                </div>

                <p className={`text-[12.5px] leading-relaxed font-sans ${textMuted}`}>{p.description}</p>

                <div className={`flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-mono ${textMuted}`}>
                  <span>
                    {p.objectiveSense === "Minimize" ? "Min" : "Max"} objective, best known:{" "}
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
                  <div className={`border-t pt-3 space-y-3 ${border}`}>
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
                        <div className="space-y-1">
                          <div className={`text-[11px] font-mono ${textFaint}`}>How the best-known value was verified</div>
                          <p className={`text-[12.5px] leading-relaxed font-sans ${textMuted}`}>{detail.bestKnown.method}</p>
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
      </div>
    </div>
  );
}
