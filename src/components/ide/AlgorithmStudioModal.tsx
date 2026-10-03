"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  Sparkles,
  Cpu,
  Layers,
  Check,
  ArrowRight,
  Code2,
  ShieldCheck,
} from "lucide-react";
import { FrameworkType } from "./types";
import algorithmBankData from "@/data/algorithm_bank.json";

export interface AlgorithmBankItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  primaryFramework: FrameworkType;
  framework?: FrameworkType;
  frameworks?: FrameworkType[];
  purpose?: string;
  description: string;
  qubits: string;
  parameters?: string;
  depth?: string;
  complexity: string;
  verification?: string;
  code: string;
}

interface AlgorithmStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProjectFromAlgorithm: (algo: AlgorithmBankItem, projectName: string) => void;
  isDark: boolean;
}

export function AlgorithmStudioModal({
  isOpen,
  onClose,
  onCreateProjectFromAlgorithm,
  isDark,
}: AlgorithmStudioModalProps) {
  const algorithms = algorithmBankData as AlgorithmBankItem[];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedFramework, setSelectedFramework] = useState<"all" | FrameworkType>("all");
  const [previewAlgo, setPreviewAlgo] = useState<AlgorithmBankItem | null>(null);
  const [namingAlgo, setNamingAlgo] = useState<AlgorithmBankItem | null>(null);
  const [projectName, setProjectName] = useState<string>("");

  const categories = useMemo(() => {
    const cats = new Set<string>();
    algorithms.forEach((a) => cats.add(a.category));
    return ["All", ...Array.from(cats).sort()];
  }, [algorithms]);

  const filteredAlgorithms = useMemo(() => {
    return algorithms.filter((algo) => {
      const matchesCat =
        selectedCategory === "All" || algo.category === selectedCategory;

      const fw = algo.primaryFramework || algo.framework;
      const matchesFw =
        selectedFramework === "all" ||
        fw === selectedFramework ||
        (algo.frameworks && algo.frameworks.includes(selectedFramework));

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        algo.name.toLowerCase().includes(q) ||
        algo.description.toLowerCase().includes(q) ||
        (algo.purpose && algo.purpose.toLowerCase().includes(q)) ||
        algo.category.toLowerCase().includes(q) ||
        algo.slug.toLowerCase().includes(q);

      return matchesCat && matchesFw && matchesQuery;
    });
  }, [algorithms, searchQuery, selectedCategory, selectedFramework]);

  const handleOpenNaming = (algo: AlgorithmBankItem) => {
    setNamingAlgo(algo);
    setProjectName(`my-${algo.slug.toLowerCase().replace(/[^a-z0-9]/g, "-")}`);
  };

  const handleConfirmCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!namingAlgo) return;
    const finalName = projectName.trim() || `my-${namingAlgo.slug}`;
    onCreateProjectFromAlgorithm(namingAlgo, finalName);
    setNamingAlgo(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div
        style={{ height: "88vh", maxHeight: "820px" }}
        className={`w-full max-w-5xl flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-sans transition-all duration-200 ${
          isDark
            ? "bg-[#0C0D11] border-white/[0.12] text-zinc-100 shadow-black/90"
            : "bg-white border-slate-200 text-slate-900 shadow-xl"
        }`}
      >
        {/* Modal Top Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? "border-white/[0.08] bg-[#0E0F14]" : "border-slate-200 bg-slate-50/70"
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30 shadow-xs">
              <Sparkles className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2.5">
                <h2 className="font-bold text-base tracking-tight">Quantum Algorithm Studio</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>26 Verified Blueprints</span>
                </span>
              </div>
              <p className={`text-xs truncate ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                Production-tested quantum algorithms across Annealing and Gate-based architectures
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark
                ? "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
                : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
            }`}
            title="Close Studio"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Search, Framework Filter & Category Filter Toolbar */}
        <div
          className={`px-6 py-3.5 border-b space-y-3 shrink-0 ${
            isDark ? "border-white/[0.06] bg-[#090A0E]" : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div
              className={`flex-1 flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                isDark
                  ? "bg-black/40 border-white/[0.1] focus-within:border-sky-500 text-zinc-100"
                  : "bg-slate-50 border-slate-200 focus-within:border-sky-500 text-slate-900"
              }`}
            >
              <Search className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-zinc-500" : "text-slate-400"}`} />
              <input
                type="text"
                placeholder="Search algorithms by name, problem domain, Hamiltonian, or formulation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-xs placeholder:text-zinc-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Architecture Selector Chips */}
            <div
              className={`flex items-center p-1 rounded-lg border shrink-0 text-xs font-mono ${
                isDark ? "bg-black/30 border-white/[0.08]" : "bg-slate-100 border-slate-200"
              }`}
            >
              <button
                onClick={() => setSelectedFramework("all")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  selectedFramework === "all"
                    ? isDark
                      ? "bg-white/[0.12] text-white font-semibold"
                      : "bg-white text-slate-900 font-semibold shadow-xs"
                    : isDark
                    ? "text-zinc-400 hover:text-zinc-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All (26)
              </button>
              <button
                onClick={() => setSelectedFramework("dwave")}
                className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-all cursor-pointer ${
                  selectedFramework === "dwave"
                    ? "bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30"
                    : isDark
                    ? "text-zinc-400 hover:text-emerald-400"
                    : "text-slate-600 hover:text-emerald-600"
                }`}
              >
                <Cpu className="w-3 h-3 text-emerald-500" />
                <span>D-Wave (12)</span>
              </button>
              <button
                onClick={() => setSelectedFramework("qiskit")}
                className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-all cursor-pointer ${
                  selectedFramework === "qiskit"
                    ? "bg-purple-500/20 text-purple-400 font-semibold border border-purple-500/30"
                    : isDark
                    ? "text-zinc-400 hover:text-purple-400"
                    : "text-slate-600 hover:text-purple-600"
                }`}
              >
                <Layers className="w-3 h-3 text-purple-400" />
                <span>Qiskit (14)</span>
              </button>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all text-[11px] font-medium cursor-pointer ${
                    isActive
                      ? isDark
                        ? "bg-sky-500 text-white font-semibold shadow-xs"
                        : "bg-sky-600 text-white font-semibold shadow-xs"
                      : isDark
                      ? "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border border-white/[0.05]"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200/60"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Algorithms Cards Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 custom-scrollbar">
          {filteredAlgorithms.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-500">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-sm">No verified algorithms match your filter</h4>
              <p className="text-xs text-zinc-500 max-w-sm">
                Try changing your search terms or clearing the framework and category filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedFramework("all");
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-medium transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAlgorithms.map((algo) => {
                const fw = algo.primaryFramework || algo.framework;
                const isDwave = fw === "dwave";

                return (
                  <div
                    key={algo.id}
                    className={`rounded-xl border p-4.5 flex flex-col justify-between transition-all duration-150 group hover:shadow-lg ${
                      isDark
                        ? "bg-[#101217]/90 border-white/[0.08] hover:border-sky-500/40 hover:bg-[#13161e]"
                        : "bg-white border-slate-200 hover:border-sky-400 hover:bg-sky-50/[0.15]"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header: Category + Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          {/* Framework Badge */}
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold flex items-center space-x-1 ${
                              isDwave
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                            }`}
                          >
                            {isDwave ? (
                              <>
                                <Cpu className="w-3 h-3 text-emerald-400" />
                                <span>D-Wave Annealer</span>
                              </>
                            ) : (
                              <>
                                <Layers className="w-3 h-3 text-purple-400" />
                                <span>Qiskit Sim</span>
                              </>
                            )}
                          </span>

                          {/* Category Badge */}
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                              isDark ? "bg-white/[0.05] text-zinc-400" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {algo.category}
                          </span>
                        </div>

                        {/* Verified Badge */}
                        <div
                          title={algo.verification || "Verified mathematical implementation"}
                          className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20"
                        >
                          <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                          <span className="hidden sm:inline font-medium">Verified</span>
                        </div>
                      </div>

                      {/* Algorithm Title & Purpose */}
                      <div className="space-y-1.5">
                        <h3 className={`font-bold text-sm leading-snug group-hover:text-sky-400 transition-colors ${
                          isDark ? "text-zinc-100" : "text-slate-900"
                        }`}>
                          {algo.name}
                        </h3>

                        {algo.purpose && (
                          <p className={`text-xs font-medium leading-relaxed ${
                            isDark ? "text-zinc-300" : "text-slate-700"
                          }`}>
                            {algo.purpose}
                          </p>
                        )}

                        <p className={`text-xs line-clamp-2 leading-relaxed ${
                          isDark ? "text-zinc-400" : "text-slate-500"
                        }`}>
                          {algo.description}
                        </p>
                      </div>

                      {/* Technical Specs Metric Strip */}
                      <div
                        className={`p-2.5 rounded-lg border grid grid-cols-3 gap-2 text-center text-[10px] font-mono ${
                          isDark
                            ? "bg-black/30 border-white/[0.05] text-zinc-400"
                            : "bg-slate-50 border-slate-100 text-slate-600"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">Qubits</span>
                          <span className={`font-bold truncate block ${isDark ? "text-zinc-200" : "text-slate-800"}`}>⚡ {algo.qubits}</span>
                        </div>
                        <div className={`space-y-0.5 border-x ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
                          <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">Depth / Ansätz</span>
                          <span className={`font-bold truncate block ${isDark ? "text-zinc-200" : "text-slate-800"}`}>📐 {algo.depth || "O(N)"}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">Complexity</span>
                          <span className={`font-bold truncate block ${isDark ? "text-zinc-200" : "text-slate-800"}`}>⏱️ {algo.complexity}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions: Preview Code & 1-Click Instantiation */}
                    <div className={`pt-4 mt-3 border-t flex items-center justify-between gap-2 ${
                      isDark ? "border-white/[0.06]" : "border-slate-100"
                    }`}>
                      <button
                        type="button"
                        onClick={() => setPreviewAlgo(algo)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                          isDark
                            ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                        title="Preview verified Python code"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Inspect Code</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenNaming(algo)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono font-semibold text-xs shadow-sm hover:shadow-sky-500/20 transition-all cursor-pointer"
                      >
                        <span>Instantiate Project</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Code Inspection Drawer/Modal Overlay */}
        {previewAlgo && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-mono text-xs ${
                isDark
                  ? "bg-[#0D0E12] border-white/[0.12] text-zinc-200"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div
                className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
                  isDark ? "border-white/[0.08] bg-[#111218]" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <Code2 className="w-4 h-4 text-sky-400" />
                  <span className="font-bold truncate">{previewAlgo.name} — main.py</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Verified
                  </span>
                </div>
                <button
                  onClick={() => setPreviewAlgo(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-[#08090C] text-zinc-300 font-mono text-xs custom-scrollbar leading-relaxed whitespace-pre">
                {previewAlgo.code}
              </div>

              <div
                className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${
                  isDark ? "border-white/[0.08] bg-[#111218]" : "border-slate-200 bg-slate-50"
                }`}
              >
                <span className="text-[11px] text-zinc-400">
                  Click instantiate to name and generate workspace with this verified code.
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPreviewAlgo(null)}
                    className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const target = previewAlgo;
                      setPreviewAlgo(null);
                      handleOpenNaming(target);
                    }}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all cursor-pointer"
                  >
                    <span>Create Project with this Code</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Naming Modal Overlay (Step to customize project name before instantiation) */}
        {namingAlgo && (
          <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-md flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-sans transition-all animate-in fade-in zoom-in-95 duration-150 ${
                isDark
                  ? "bg-[#0E0F13] border-white/[0.12] text-zinc-100 shadow-black/90"
                  : "bg-white border-slate-200 text-slate-900 shadow-xl"
              }`}
            >
              {/* Header */}
              <div
                className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
                  isDark ? "border-white/[0.08] bg-[#111218]" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Create Project from Algorithm</h3>
                    <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                      Name your workspace to instantiate verified blueprint
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNamingAlgo(null)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isDark ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleConfirmCreate} className="p-5 space-y-4">
                {/* Selected Algorithm Pill */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold flex items-center space-x-1 ${
                          (namingAlgo.primaryFramework || namingAlgo.framework) === "dwave"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                        }`}
                      >
                        {(namingAlgo.primaryFramework || namingAlgo.framework) === "dwave" ? (
                          <>
                            <Cpu className="w-3 h-3 text-emerald-400" />
                            <span>D-Wave</span>
                          </>
                        ) : (
                          <>
                            <Layers className="w-3 h-3 text-purple-400" />
                            <span>Qiskit Sim</span>
                          </>
                        )}
                      </span>
                      <span className="font-semibold text-xs truncate">
                        {namingAlgo.name}
                      </span>
                    </div>
                    <p className={`text-[11px] truncate ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                      {namingAlgo.category} • ⚡ {namingAlgo.qubits} • ⏱️ {namingAlgo.complexity}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                    <span className="font-medium">Verified</span>
                  </div>
                </div>

                {/* Input field */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-mono font-medium ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. my-vqe-experiment"
                    className={`w-full px-3 py-2 rounded-lg border outline-none text-xs font-mono transition-colors ${
                      isDark
                        ? "bg-[#090A0D] border-white/[0.1] text-zinc-100 focus:border-sky-500"
                        : "bg-white border-slate-200 text-slate-900 focus:border-sky-500"
                    }`}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                  />
                  <p className={`text-[10px] font-mono ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
                    Initializes <span className="text-sky-400 font-semibold">main.py</span> with verified mathematical code.
                  </p>
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setNamingAlgo(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                      isDark ? "text-zinc-400 hover:text-zinc-200" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!projectName.trim()}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-mono font-semibold text-xs shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>Create Project</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
