"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import type { LibraryDetail, LibraryListItem } from "@/lib/problemLibrary";
import { SolverFitMap } from "./SolverFitMap";

interface FilterDropdownOption {
  value: string;
  label: string;
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  isDark,
}: {
  label: string;
  value: string;
  options: FilterDropdownOption[];
  onChange: (value: string) => void;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const selectedOption = options.find((o) => o.value === value) || options[0];
  const isActive = value !== "All";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`h-8 px-2.5 rounded-lg border text-[11px] font-mono inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
          isDark
            ? isActive
              ? "bg-white/[0.08] border-white/[0.18] text-zinc-100"
              : "bg-[#0C0D11] border-white/[0.08] text-zinc-300 hover:border-white/[0.16] hover:bg-white/[0.03]"
            : isActive
            ? "bg-slate-900 border-slate-900 text-white"
            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <span className={isActive ? (isDark ? "text-zinc-400" : "text-slate-300") : isDark ? "text-zinc-500" : "text-slate-400"}>
          {label}
        </span>
        <span className="font-medium max-w-[140px] truncate">{selectedOption?.label ?? value}</span>
        <ChevronDown
          className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""} ${
            isActive ? (isDark ? "text-zinc-300" : "text-slate-200") : isDark ? "text-zinc-500" : "text-slate-400"
          }`}
        />
      </button>

      {open && (
        <div
          style={{ backgroundColor: isDark ? "#0E0F14" : "#FFFFFF" }}
          className={`absolute left-0 mt-1.5 min-w-[190px] max-h-64 overflow-y-auto rounded-lg border shadow-xl z-40 py-1 ${
            isDark ? "border-white/[0.12]" : "border-slate-200"
          }`}
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-[11.5px] font-mono flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  selected
                    ? isDark
                      ? "bg-white/[0.09] text-zinc-100 font-medium"
                      : "bg-slate-100 text-slate-900 font-medium"
                    : isDark
                    ? "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {selected && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDark ? "bg-zinc-200" : "bg-slate-800"}`} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState<number>(-1);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, LibraryDetail>>({});
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!searchFocused) return;
    const handleOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
        setActiveSuggestionIdx(-1);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [searchFocused]);

  useEffect(() => {
    if (!expanded) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(null);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [expanded]);

  const activeDrawerItem = useMemo(
    () => (expanded && problems ? problems.find((p) => p.slug === expanded) ?? null : null),
    [expanded, problems]
  );
  const activeDrawerDetail = expanded ? details[expanded] ?? null : null;

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

  const filtered = useMemo(() => {
    const tokens = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return industryScoped.filter((p) => {
      if (typeFilter !== "All" && p.problemType !== typeFilter) return false;
      if (sizeFilter !== "All" && p.sizeTier !== sizeFilter) return false;
      if (tokens.length > 0) {
        const haystack = `${p.title} ${p.industry} ${p.problemType} ${p.description} ${p.slug} ${SIZE_LABEL[p.sizeTier] || p.sizeTier}`.toLowerCase();
        if (!tokens.every((tok) => haystack.includes(tok))) return false;
      }
      return true;
    });
  }, [industryScoped, typeFilter, sizeFilter, searchQuery]);

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !problems) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    return problems
      .filter((p) => {
        const haystack = `${p.title} ${p.industry} ${p.problemType} ${p.description} ${p.slug}`.toLowerCase();
        return tokens.every((tok) => haystack.includes(tok));
      })
      .sort((a, b) => {
        const aTitle = a.title.toLowerCase().startsWith(q) ? 0 : a.title.toLowerCase().includes(q) ? 1 : 2;
        const bTitle = b.title.toLowerCase().startsWith(q) ? 0 : b.title.toLowerCase().includes(q) ? 1 : 2;
        if (aTitle !== bTitle) return aTitle - bTitle;
        return a.title.localeCompare(b.title);
      })
      .slice(0, 6);
  }, [problems, searchQuery]);

  const hasActiveFilters =
    industryFilter !== "All" || typeFilter !== "All" || sizeFilter !== "All" || searchQuery.trim().length > 0;

  const resetFilters = () => {
    setIndustryFilter("All");
    setTypeFilter("All");
    setSizeFilter("All");
    setSearchQuery("");
    setSearchFocused(false);
    setActiveSuggestionIdx(-1);
  };

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
    setSearchQuery("");
    setViewMode("problems");
    setExpanded(slug);
    await fetchDetail(slug);
  };

  const handleSelectSuggestion = async (p: LibraryListItem) => {
    setSearchQuery(p.title);
    setIndustryFilter("All");
    setTypeFilter("All");
    setSizeFilter("All");
    setSearchFocused(false);
    setActiveSuggestionIdx(-1);
    setViewMode("problems");
    setExpanded(p.slug);
    await fetchDetail(p.slug);
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

  const verdictTextClass = (verdict?: string) => {
    if (verdict === "competitive") return isDark ? "text-emerald-400" : "text-emerald-700";
    if (verdict === "exceeds_qubo_limit") return isDark ? "text-amber-400" : "text-amber-700";
    return isDark ? "text-zinc-300" : "text-slate-700";
  };

  const industryOptions = useMemo(
    () => industries.map((ind) => ({ value: ind, label: ind })),
    [industries]
  );

  const typeOptions = useMemo(
    () => problemTypes.map((t) => ({ value: t, label: t })),
    [problemTypes]
  );

  const sizeOptions: FilterDropdownOption[] = [
    { value: "All", label: "All" },
    { value: "small", label: "Small" },
    { value: "medium", label: "Medium" },
    { value: "large", label: "Large" },
  ];

  return (
    <div className="h-full w-full overflow-y-auto" style={{ backgroundColor: isDark ? "#090A0D" : "#F8FAFC" }}>
      <div className="max-w-6xl mx-auto px-5 py-6 space-y-4">
        {/* Header + View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-2.5">
            <h1 className={`text-lg font-semibold font-sans tracking-tight ${textMain}`}>Problem Library</h1>
            {problems && (
              <span className={`text-[11px] font-mono ${textFaint}`}>
                {hasActiveFilters ? `${filtered.length} / ${problems.length}` : `${problems.length}`}
              </span>
            )}
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

        {/* Unified Search + Dropdown Filter Bar */}
        {problems && problems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Dynamic / Suggestive Search Box */}
            <div ref={searchBoxRef} className="relative flex-1 min-w-[220px]">
              <Search
                className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${textFaint}`}
              />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                  setActiveSuggestionIdx(-1);
                }}
                onKeyDown={(e) => {
                  if (!searchFocused || suggestions.length === 0) {
                    if (e.key === "Escape") {
                      setSearchFocused(false);
                    }
                    return;
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveSuggestionIdx((prev) => (prev + 1) % suggestions.length);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveSuggestionIdx((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
                  } else if (e.key === "Enter" && activeSuggestionIdx >= 0) {
                    e.preventDefault();
                    handleSelectSuggestion(suggestions[activeSuggestionIdx]);
                  } else if (e.key === "Escape") {
                    setSearchFocused(false);
                    setActiveSuggestionIdx(-1);
                  }
                }}
                placeholder="Search problems, industries, or types..."
                className={`w-full h-8 pl-8 pr-7 rounded-lg border text-[12px] font-sans outline-none transition-colors ${
                  isDark
                    ? "bg-[#0C0D11] border-white/[0.08] text-zinc-100 placeholder:text-zinc-500 focus:border-white/[0.22]"
                    : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveSuggestionIdx(-1);
                  }}
                  aria-label="Clear search"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded cursor-pointer ${
                    isDark ? "text-zinc-500 hover:text-zinc-200" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Suggestive Dropdown */}
              {searchFocused && searchQuery.trim().length > 0 && (
                <div
                  style={{ backgroundColor: isDark ? "#0E0F14" : "#FFFFFF" }}
                  className={`absolute left-0 right-0 mt-1.5 rounded-lg border shadow-xl z-40 py-1 overflow-hidden ${
                    isDark ? "border-white/[0.12]" : "border-slate-200"
                  }`}
                >
                  {suggestions.length === 0 ? (
                    <div className={`px-3 py-2 text-[11.5px] font-mono ${textFaint}`}>No matching problems</div>
                  ) : (
                    suggestions.map((item, idx) => {
                      const highlighted = idx === activeSuggestionIdx;
                      return (
                        <button
                          key={item.slug}
                          type="button"
                          onMouseEnter={() => setActiveSuggestionIdx(idx)}
                          onClick={() => handleSelectSuggestion(item)}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            highlighted
                              ? isDark
                                ? "bg-white/[0.08]"
                                : "bg-slate-100"
                              : isDark
                              ? "hover:bg-white/[0.04]"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className={`text-[12px] font-sans font-medium truncate ${textMain}`}>{item.title}</div>
                            <div className={`text-[10.5px] font-mono truncate ${textFaint}`}>
                              {item.industry} · {item.problemType}
                            </div>
                          </div>
                          <span className={`text-[10.5px] font-mono shrink-0 ${textFaint}`}>
                            {SIZE_LABEL[item.sizeTier]} · {item.benchmark?.quboVars ?? item.estimatedBinaryVars} vars
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* 1. Industry Dropdown */}
            <FilterDropdown
              label="Industry"
              value={industryFilter}
              options={industryOptions}
              onChange={(nextInd) => {
                setIndustryFilter(nextInd);
                setTypeFilter("All");
              }}
              isDark={isDark}
            />

            {/* 2. Problem Type Dropdown */}
            <FilterDropdown
              label="Problem type"
              value={typeFilter}
              options={typeOptions}
              onChange={setTypeFilter}
              isDark={isDark}
            />

            {/* 3. Problem Size Dropdown */}
            <FilterDropdown
              label="Problem size"
              value={sizeFilter}
              options={sizeOptions}
              onChange={setSizeFilter}
              isDark={isDark}
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className={`h-8 px-2 text-[11px] font-mono cursor-pointer transition-colors ${
                  isDark ? "text-zinc-500 hover:text-zinc-200" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* ── VIEW 1: SOLVER FIT MAP ── */}
        {problems && viewMode === "fit_map" && (
          <SolverFitMap isDark={isDark} problems={filtered} onSelectProblem={handleInspectFromMap} />
        )}

        {/* ── VIEW 2: LINEAR-STYLE COMPACT PROBLEM LIST ── */}
        {problems && viewMode === "problems" && (
          <>
            {filtered.length === 0 ? (
              <div className={`text-[13px] font-sans ${textFaint}`}>No problems match these filters.</div>
            ) : (
              <div
                style={{ backgroundColor: panelBg }}
                className={`rounded-xl border ${border} overflow-hidden`}
              >
                {/* Quiet Column Header */}
                <div
                  className={`hidden sm:flex items-center justify-between gap-4 px-4 py-2 border-b text-[10.5px] font-mono ${border} ${textFaint}`}
                >
                  <span className="flex-1 min-w-0">Problem</span>
                  <div className="flex items-center gap-5 shrink-0">
                    <span className="w-16 text-right">QUBO</span>
                    <span className="w-16 text-right">Optimum</span>
                    <span className="w-20 text-right hidden md:block">SA Med Gap</span>
                    <span className="w-28 text-right">Solver Fit</span>
                    <span className="w-14 text-right" />
                  </div>
                </div>

                {/* Compact Rows */}
                <div className={`divide-y ${isDark ? "divide-white/[0.06]" : "divide-slate-100"}`}>
                  {filtered.map((p) => {
                    const isSelected = expanded === p.slug;
                    const b = p.benchmark;
                    const saGap = b?.qubo.medianGapVsBestKnownPct ?? b?.qubo.gapVsBestKnownPct;
                    return (
                      <div
                        key={p.slug}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleExpand(p.slug)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleExpand(p.slug);
                          }
                        }}
                        className={`flex items-center justify-between gap-4 px-4 py-2.5 transition-colors cursor-pointer outline-none ${
                          isSelected
                            ? isDark
                              ? "bg-white/[0.05]"
                              : "bg-slate-100/80"
                            : isDark
                            ? "hover:bg-white/[0.025]"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {/* Title + Meta */}
                        <div className="min-w-0 flex-1">
                          <div className={`text-[13px] font-medium font-sans truncate ${textMain}`}>
                            {p.title}
                          </div>
                          <div className={`text-[11px] font-mono truncate mt-0.5 ${textFaint}`}>
                            {p.industry} · {p.problemType}
                          </div>
                        </div>

                        {/* Aligned Right Metrics + Load CTA */}
                        <div className="flex items-center gap-5 shrink-0 text-[11.5px] font-mono">
                          <span
                            className={`w-16 text-right hidden sm:block ${textMuted}`}
                            title={`${SIZE_LABEL[p.sizeTier]} · ${b ? `${b.quboVars} QUBO vars` : `~${p.estimatedBinaryVars} vars`}`}
                          >
                            {b ? `${b.quboVars}v` : `~${p.estimatedBinaryVars}v`}
                          </span>

                          <span
                            className={`w-16 text-right hidden sm:block font-medium ${textMain}`}
                            title={`${p.objectiveSense} best known (${KIND_LABEL[p.bestKnown.kind]})`}
                          >
                            {p.bestKnown.value}
                          </span>

                          <span className={`w-20 text-right hidden md:block ${textMuted}`}>
                            {!b ? (
                              "—"
                            ) : b.qubo.exceedsLimit ? (
                              <span className={isDark ? "text-amber-400/90" : "text-amber-700"}>
                                &gt;{b.protocol.maxQuboVars}v
                              </span>
                            ) : typeof saGap === "number" ? (
                              `${saGap.toFixed(2)}%`
                            ) : (
                              "—"
                            )}
                          </span>

                          <span
                            className={`w-28 text-right text-[11px] font-medium ${
                              b ? verdictTextClass(b.verdict) : textFaint
                            }`}
                          >
                            {b ? VERDICT_LABEL[b.verdict] || b.verdict : "—"}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpen(p.slug);
                            }}
                            disabled={isDemo || loadingSlug === p.slug}
                            title={
                              isDemo
                                ? "Demo accounts cannot load library problems"
                                : "Create a project from this problem in Copilot"
                            }
                            className={`w-14 py-1 rounded-md text-[11px] font-mono font-medium border text-center transition-colors ${
                              isDemo
                                ? "border-white/[0.06] text-zinc-600 cursor-not-allowed"
                                : isDark
                                ? "bg-white/[0.06] hover:bg-white/[0.14] border-white/[0.14] text-zinc-100 cursor-pointer"
                                : "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white cursor-pointer"
                            }`}
                          >
                            Load
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── RIGHT-SIDE SLIDE-OVER DETAIL DRAWER ── */}
      {expanded && activeDrawerItem && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setExpanded(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
          />

          {/* Drawer Panel */}
          <aside
            role="dialog"
            aria-label={activeDrawerItem.title}
            style={{ backgroundColor: isDark ? "#0B0C10" : "#FFFFFF" }}
            className={`relative z-10 w-full max-w-xl h-full border-l flex flex-col shadow-2xl ${border}`}
          >
            {/* Sticky Header */}
            <div className={`px-5 py-4 border-b flex items-start justify-between gap-4 shrink-0 ${border}`}>
              <div className="min-w-0 space-y-1">
                <div className={`text-[11px] font-mono ${textFaint}`}>
                  {activeDrawerItem.industry} · {activeDrawerItem.problemType} · {SIZE_LABEL[activeDrawerItem.sizeTier]} ·{" "}
                  {activeDrawerItem.benchmark
                    ? `${activeDrawerItem.benchmark.quboVars} QUBO vars`
                    : `~${activeDrawerItem.estimatedBinaryVars} vars`}
                </div>
                <h2 className={`text-base font-semibold font-sans leading-snug ${textMain}`}>
                  {activeDrawerItem.title}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpen(activeDrawerItem.slug)}
                  disabled={isDemo || loadingSlug === activeDrawerItem.slug}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-medium border transition-colors ${
                    isDemo
                      ? "border-white/[0.06] text-zinc-600 cursor-not-allowed"
                      : isDark
                      ? "bg-white/[0.10] hover:bg-white/[0.16] border-white/[0.18] text-zinc-100 cursor-pointer"
                      : "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white cursor-pointer"
                  }`}
                >
                  Load Problem
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(null)}
                  aria-label="Close details"
                  className={`p-1.5 rounded-md border cursor-pointer transition-colors ${border} ${textMuted} ${
                    isDark ? "hover:bg-white/[0.06] hover:text-zinc-100" : "hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Summary + Verdict */}
              <div className="space-y-2">
                <p className={`text-[13px] leading-relaxed font-sans ${textMuted}`}>
                  {activeDrawerItem.description}
                </p>
                {activeDrawerItem.benchmark && (
                  <div
                    className={`rounded-lg border px-3.5 py-2.5 space-y-1 ${border} ${
                      isDark ? "bg-white/[0.02]" : "bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className={textFaint}>Solver Fit</span>
                      <span className={`font-medium ${verdictTextClass(activeDrawerItem.benchmark.verdict)}`}>
                        {VERDICT_LABEL[activeDrawerItem.benchmark.verdict] || activeDrawerItem.benchmark.verdict}
                      </span>
                    </div>
                    <p className={`text-[12px] leading-relaxed font-sans ${textMuted}`}>
                      {activeDrawerItem.benchmark.verdictNote}
                    </p>
                  </div>
                )}
              </div>

              {/* 20-Seed Side-by-Side Solver Comparison */}
              {activeDrawerItem.benchmark && (
                <div className="space-y-2">
                  <div className={`text-[11px] font-mono ${textFaint}`}>
                    Seeded Benchmark (N={activeDrawerItem.benchmark.protocol.repeats} held-out seeds)
                  </div>
                  <div
                    className={`rounded-lg border ${border} grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x ${
                      isDark ? "divide-white/[0.08] bg-white/[0.015]" : "divide-slate-200 bg-slate-50/70"
                    } text-[11px] font-mono`}
                  >
                    <div className="p-3 space-y-1">
                      <div className={textFaint}>D-Wave SA (classical software)</div>
                      {activeDrawerItem.benchmark.qubo.exceedsLimit ? (
                        <div className={isDark ? "text-amber-400" : "text-amber-700"}>
                          Exceeds {activeDrawerItem.benchmark.protocol.maxQuboVars}-var cap (
                          {activeDrawerItem.benchmark.quboVars} vars)
                        </div>
                      ) : activeDrawerItem.benchmark.qubo.bestObjective === null ? (
                        <div className={textMuted}>
                          0/{activeDrawerItem.benchmark.qubo.totalRuns} feasible
                        </div>
                      ) : (
                        <>
                          <div className={textMain}>
                            Med{" "}
                            <strong>
                              {activeDrawerItem.benchmark.qubo.medianObjective ??
                                activeDrawerItem.benchmark.qubo.bestObjective}
                            </strong>{" "}
                            <span className={textMuted}>
                              (
                              {(
                                activeDrawerItem.benchmark.qubo.medianGapVsBestKnownPct ??
                                activeDrawerItem.benchmark.qubo.gapVsBestKnownPct
                              )?.toFixed(2)}
                              % gap)
                            </span>
                          </div>
                          <div className={textFaint}>
                            Best {activeDrawerItem.benchmark.qubo.bestObjective} · Worst{" "}
                            {activeDrawerItem.benchmark.qubo.worstObjective ?? "—"} ·{" "}
                            {activeDrawerItem.benchmark.qubo.feasibleRuns}/
                            {activeDrawerItem.benchmark.qubo.totalRuns} feas
                          </div>
                          {activeDrawerItem.benchmark.qubo.meanObjective !== null && (
                            <div className={textFaint}>
                              Mean {activeDrawerItem.benchmark.qubo.meanObjective.toFixed(2)} ±{" "}
                              {(activeDrawerItem.benchmark.qubo.stdObjective ?? 0).toFixed(2)}
                              {typeof activeDrawerItem.benchmark.qubo.iqrObjective === "number"
                                ? ` · IQR ${activeDrawerItem.benchmark.qubo.iqrObjective}`
                                : ""}
                            </div>
                          )}
                          <div className={textFaint}>
                            Solve {fmtMs(activeDrawerItem.benchmark.qubo.solveTimeMs ?? activeDrawerItem.benchmark.qubo.meanTimeMs)}
                            {typeof activeDrawerItem.benchmark.qubo.tuneTimeMs === "number"
                              ? ` · Tune ${fmtMs(activeDrawerItem.benchmark.qubo.tuneTimeMs)}`
                              : ""}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="p-3 space-y-1">
                      <div className={textFaint}>Google OR-Tools CP-SAT</div>
                      <div className={textMain}>
                        Opt <strong>{activeDrawerItem.benchmark.classical.bestObjective ?? "—"}</strong>{" "}
                        <span className={textMuted}>
                          (
                          {typeof activeDrawerItem.benchmark.classical.gapVsBestKnownPct === "number"
                            ? `${activeDrawerItem.benchmark.classical.gapVsBestKnownPct.toFixed(2)}% gap`
                            : "—"}
                          )
                        </span>
                      </div>
                      <div className={textFaint}>
                        {activeDrawerItem.benchmark.classical.status} ·{" "}
                        {activeDrawerItem.benchmark.classical.feasibleRuns}/
                        {activeDrawerItem.benchmark.classical.totalRuns} proven
                      </div>
                      <div className={textFaint}>
                        Solve{" "}
                        {fmtMs(
                          activeDrawerItem.benchmark.classical.solveTimeMs ??
                            activeDrawerItem.benchmark.classical.meanTimeMs
                        )}
                        {typeof activeDrawerItem.benchmark.classical.buildTimeMs === "number"
                          ? ` · Build ${fmtMs(activeDrawerItem.benchmark.classical.buildTimeMs)}`
                          : ""}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* QUBO Structure & Equivalence Proof */}
              {activeDrawerItem.benchmark?.structure && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-mono ${textFaint}`}>QUBO Structure & Equivalence</span>
                    {activeDrawerItem.benchmark.equivalenceCheck?.passed && (
                      <span className={`text-[11px] font-mono ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                        QUBO ≡ Original verified (err {activeDrawerItem.benchmark.equivalenceCheck.maxAbsError})
                      </span>
                    )}
                  </div>
                  <div
                    className={`rounded-lg border px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono ${border} ${textMuted}`}
                  >
                    <span>
                      {activeDrawerItem.benchmark.structure.decisionVars} decision +{" "}
                      {activeDrawerItem.benchmark.structure.slackVars} slack vars
                    </span>
                    <span>{activeDrawerItem.benchmark.structure.quadraticCouplings.toLocaleString()} couplings</span>
                    <span>density {activeDrawerItem.benchmark.structure.densityPct}%</span>
                    <span>max deg {activeDrawerItem.benchmark.structure.maxDegree}</span>
                    <span>range {activeDrawerItem.benchmark.structure.dynamicRange}×</span>
                  </div>
                </div>
              )}

              {/* Disjoint λ Sweep Table */}
              {activeDrawerItem.benchmark && activeDrawerItem.benchmark.qubo.lambdaSweep.length > 0 && (
                <div className="space-y-2">
                  <div className={`text-[11px] font-mono ${textFaint}`}>Penalty λ Sweep (disjoint tuning seeds)</div>
                  <div className={`rounded-lg border ${border} overflow-hidden`}>
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead>
                        <tr className={`border-b ${border} ${textFaint}`}>
                          <th className="py-1.5 px-3 font-medium">Penalty λ</th>
                          <th className="py-1.5 px-3 font-medium">Feasibility</th>
                          <th className="py-1.5 px-3 font-medium text-right">Median Obj</th>
                          <th className="py-1.5 px-3 font-medium text-right">Best Obj</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? "divide-white/[0.06]" : "divide-slate-100"}`}>
                        {activeDrawerItem.benchmark.qubo.lambdaSweep.map((pt) => {
                          const isChosen = pt.lambda === activeDrawerItem.benchmark?.qubo.bestLambda;
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
                              <td className={`py-1.5 px-3 text-right ${textMuted}`}>
                                {pt.medianObjective ?? "—"}
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
                </div>
              )}

              {/* Full Problem Statement */}
              <div className="space-y-2">
                <div className={`text-[11px] font-mono ${textFaint}`}>Problem statement</div>
                {!activeDrawerDetail ? (
                  <div className={`text-[12px] font-mono ${textFaint}`}>Loading full specification...</div>
                ) : (
                  <div
                    className={`rounded-lg border p-3 text-[12px] leading-relaxed font-sans whitespace-pre-wrap ${border} ${textMuted} ${
                      isDark ? "bg-white/[0.015]" : "bg-slate-50"
                    }`}
                  >
                    {activeDrawerDetail.prompt}
                  </div>
                )}
              </div>

              {/* Verification & Reproducibility Provenance */}
              <div className={`border-t pt-4 space-y-2 text-[11px] font-mono ${border} ${textFaint}`}>
                <div>
                  <span className={textMuted}>
                    {activeDrawerItem.objectiveSense} best known:{" "}
                    <strong className={textMain}>{activeDrawerItem.bestKnown.value}</strong> (
                    {KIND_LABEL[activeDrawerItem.bestKnown.kind]})
                  </span>{" "}
                  — {activeDrawerItem.bestKnown.method}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    Source: {activeDrawerItem.source.name}
                    {activeDrawerItem.source.url ? ` (${activeDrawerItem.source.url})` : ""}
                  </span>
                  <span>License: {activeDrawerItem.source.license}</span>
                  {activeDrawerDetail && (
                    <span>
                      v{activeDrawerDetail.version} · {activeDrawerDetail.contentHash.slice(0, 10)}
                    </span>
                  )}
                </div>
                {activeDrawerItem.benchmark && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      Reads: {activeDrawerItem.benchmark.protocol.quboReadsPerRepeat}
                      {activeDrawerItem.benchmark.protocol.quboNumSweeps
                        ? ` × ${activeDrawerItem.benchmark.protocol.quboNumSweeps} sweeps`
                        : ""}
                    </span>
                    {activeDrawerItem.benchmark.environment && (
                      <span>
                        Python {activeDrawerItem.benchmark.environment.pythonVersion} · OR-Tools{" "}
                        {activeDrawerItem.benchmark.environment.ortoolsVersion} · neal{" "}
                        {activeDrawerItem.benchmark.environment.nealVersion} (
                        {activeDrawerItem.benchmark.environment.machine})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
