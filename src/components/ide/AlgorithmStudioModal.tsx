"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  Cpu,
  Layers,
  ArrowRight,
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
        {/* Modal Top Header (Clean typography, zero decorative sparkles) */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? "border-white/[0.08] bg-[#0E0F14]" : "border-slate-200 bg-slate-50/70"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center space-x-2.5">
              <h2 className="font-bold text-base tracking-tight">Quantum Algorithm Vault</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span>26 Verified Blueprints</span>
              </span>
            </div>
            <p className={`text-xs truncate mt-0.5 ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
              Production-tested quantum algorithms across Annealing and Gate-based architectures
            </p>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark
                ? "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
                : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
            }`}
            title="Close Vault"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Consolidated Search & Filter Toolbar */}
        <div
          className={`px-6 py-3 border-b space-y-2.5 shrink-0 ${
            isDark ? "border-white/[0.06] bg-[#090A0E]" : "border-slate-200 bg-white"
          }`}
        >
          {/* Row 1: Search Input + Framework Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div
              className={`flex-1 flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                isDark
                  ? "bg-black/40 border-white/[0.1] focus-within:border-white/30 text-zinc-100"
                  : "bg-slate-50 border-slate-200 focus-within:border-slate-400 text-slate-900"
              }`}
            >
              <Search className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-zinc-500" : "text-slate-400"}`} />
              <input
                type="text"
                placeholder="Search algorithms by name, domain, or formulation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-xs placeholder:text-zinc-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Architecture Selector Pills (Monochromatic) */}
            <div
              className={`flex items-center p-0.5 rounded-lg border shrink-0 text-xs font-mono ${
                isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-slate-100 border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedFramework("all")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                  selectedFramework === "all"
                    ? isDark
                      ? "bg-white/[0.12] text-white shadow-xs"
                      : "bg-white text-slate-900 font-semibold shadow-xs"
                    : isDark
                    ? "text-zinc-400 hover:text-zinc-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All (26)
              </button>
              <button
                type="button"
                onClick={() => setSelectedFramework("dwave")}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                  selectedFramework === "dwave"
                    ? isDark
                      ? "bg-white/[0.12] text-white shadow-xs"
                      : "bg-white text-slate-900 font-semibold shadow-xs"
                    : isDark
                    ? "text-zinc-400 hover:text-zinc-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>D-Wave (12)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFramework("qiskit")}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                  selectedFramework === "qiskit"
                    ? isDark
                      ? "bg-white/[0.12] text-white shadow-xs"
                      : "bg-white text-slate-900 font-semibold shadow-xs"
                    : isDark
                    ? "text-zinc-400 hover:text-zinc-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Qiskit (14)</span>
              </button>
            </div>
          </div>

          {/* Row 2: Category Filter Strip (Monochrome Design System) */}
          <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar pb-0.5 text-xs">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-0.5 rounded-full whitespace-nowrap transition-all text-[11px] font-medium cursor-pointer ${
                    isActive
                      ? isDark
                        ? "bg-zinc-200 text-zinc-900 font-semibold shadow-xs"
                        : "bg-slate-900 text-white font-semibold shadow-xs"
                      : isDark
                      ? "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border border-white/[0.06]"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Algorithms Cards Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar">
          {filteredAlgorithms.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-500">
                <Search className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm">No verified algorithms match your filter</h4>
              <p className="text-xs text-zinc-500 max-w-sm">
                Try clearing search query or resetting framework filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedFramework("all");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  isDark
                    ? "bg-zinc-200 text-zinc-900 hover:bg-white"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAlgorithms.map((algo) => {
                const fw = algo.primaryFramework || algo.framework;
                const isDwave = fw === "dwave";
                const displayDesc = algo.description || algo.purpose;

                return (
                  <div
                    key={algo.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-150 group hover:border-white/20 ${
                      isDark
                        ? "bg-[#101217]/90 border-white/[0.08] hover:bg-[#13161e]"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Card Header: Framework + Domain Category (Clean Metadata, NO 26x repeated Verified badge) */}
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-medium border ${
                            isDark
                              ? "bg-white/[0.05] border-white/[0.08] text-zinc-300"
                              : "bg-slate-100 border-slate-200 text-slate-700"
                          }`}
                        >
                          {isDwave ? "D-Wave Annealer" : "Qiskit Sim"}
                        </span>

                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                            isDark
                              ? "bg-white/[0.02] border-white/[0.05] text-zinc-400"
                              : "bg-slate-50 border-slate-200/60 text-slate-500"
                          }`}
                        >
                          {algo.category}
                        </span>
                      </div>

                      {/* Algorithm Title & Single Concise Description (NO dual repetitive paragraphs) */}
                      <div className="space-y-1">
                        <h3
                          className={`font-semibold text-sm leading-snug transition-colors ${
                            isDark ? "text-zinc-100" : "text-slate-900"
                          }`}
                        >
                          {algo.name}
                        </h3>

                        <p
                          className={`text-xs line-clamp-2 leading-relaxed ${
                            isDark ? "text-zinc-400" : "text-slate-600"
                          }`}
                        >
                          {displayDesc}
                        </p>
                      </div>

                      {/* 2-Column Technical Metric Strip (Complexity removed, full Depth displayed without truncation) */}
                      <div
                        className={`p-2 rounded-lg border grid grid-cols-2 gap-2 text-center text-[10px] font-mono ${
                          isDark
                            ? "bg-black/30 border-white/[0.05] text-zinc-400"
                            : "bg-slate-50 border-slate-100 text-slate-600"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">
                            Capacity
                          </span>
                          <span className={`font-semibold truncate block ${isDark ? "text-zinc-200" : "text-slate-800"}`}>
                            {algo.qubits}
                          </span>
                        </div>
                        <div className={`space-y-0.5 border-l ${isDark ? "border-white/[0.06]" : "border-slate-200"} pl-2`}>
                          <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">
                            Depth / Runtime
                          </span>
                          <span className={`font-semibold truncate block ${isDark ? "text-zinc-200" : "text-slate-800"}`}>
                            {algo.depth || "Adaptive"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Action: High-Contrast Option A Primary CTA */}
                    <div
                      className={`pt-3 mt-2.5 border-t flex items-center justify-end ${
                        isDark ? "border-white/[0.06]" : "border-slate-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenNaming(algo)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shadow-xs cursor-pointer active:scale-[0.98] ${
                          isDark
                            ? "bg-zinc-200 hover:bg-white text-zinc-900 shadow-zinc-900/20"
                            : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10"
                        }`}
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

        {/* Naming Modal Overlay (Step to customize project name before instantiation) */}
        {namingAlgo && (
          <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div
              className={`w-full max-w-md flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-sans transition-all animate-in zoom-in-95 duration-150 ${
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
                <div>
                  <h3 className="font-semibold text-sm">Create Project from Algorithm</h3>
                  <p className={`text-[11px] mt-0.5 ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                    Name your workspace to instantiate verified blueprint
                  </p>
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
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-medium border ${
                          isDark
                            ? "bg-white/[0.06] border-white/[0.08] text-zinc-300"
                            : "bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                      >
                        {(namingAlgo.primaryFramework || namingAlgo.framework) === "dwave" ? "D-Wave" : "Qiskit Sim"}
                      </span>
                      <span className="font-semibold text-xs truncate">
                        {namingAlgo.name}
                      </span>
                    </div>
                    <p className={`text-[11px] truncate ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                      {namingAlgo.category} • {namingAlgo.qubits}
                    </p>
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
                        ? "bg-[#090A0D] border-white/[0.1] text-zinc-100 focus:border-white/30"
                        : "bg-white border-slate-200 text-slate-900 focus:border-slate-400"
                    }`}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                  />
                  <p className={`text-[10px] font-mono ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
                    Initializes <span className="font-semibold text-zinc-300">main.py</span> with verified mathematical code.
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
                    className={`px-4 py-1.5 rounded-lg disabled:opacity-40 font-mono font-semibold text-xs shadow-sm transition-all cursor-pointer flex items-center space-x-1.5 ${
                      isDark
                        ? "bg-zinc-200 hover:bg-white text-zinc-900 shadow-zinc-900/20"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10"
                    }`}
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
