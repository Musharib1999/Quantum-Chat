"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Plus,
  Play,
  Cpu,
  LogIn,
  LogOut,
  RotateCw,
  Activity,
  Folder,
  FileCode,
  FileJson,
  FileText,
  Check,
  Compass,
  Bug,
  Globe,
  Sparkles,
} from "lucide-react";
import { ProjectItem, HeroTabType } from "./types";

export type StudioActivityStatus = "idle" | "running" | "optimal" | "warning";

interface StudioHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  activeProject: ProjectItem;
  onOpenProjectModal: () => void;
  onOpenNewProjectModal: () => void;
  onOpenAlgorithmStudio?: () => void;
  isSynced?: boolean;
  onSync?: () => void;
  isRunningOrRecompiling: boolean;
  onRunOrRecompile: () => void;
  activityStatus?: StudioActivityStatus;
  isModelDirty?: boolean;
  user: any;
  isAuthenticated: boolean;
  onLogout?: () => void;
  heroTab: HeroTabType;
  onSelectHeroTab: (tab: HeroTabType) => void;
  activeFile?: string;
  onSelectFile?: (file: string) => void;
  onAddFile?: (fileName: string) => void;
  onCopyCode?: () => void;
  showTerminal?: boolean;
  onToggleTerminal?: () => void;
  isSyncing?: boolean;
  onStartTour?: () => void;
  onOpenReportIssue?: () => void;
  onOpenDeployModal?: () => void;
}

export function StudioHeader({
  isDark,
  onToggleTheme,
  activeProject,
  onOpenProjectModal,
  onOpenNewProjectModal,
  onOpenAlgorithmStudio,
  isSynced = true,
  onSync,
  isRunningOrRecompiling,
  onRunOrRecompile,
  activityStatus = "idle",
  isModelDirty = false,
  user,
  isAuthenticated,
  onLogout,
  heroTab,
  onSelectHeroTab,
  activeFile,
  onSelectFile,
  onAddFile,
  onStartTour,
  onOpenReportIssue,
  onOpenDeployModal,
}: StudioHeaderProps) {
  const isDwave = activeProject.framework === "dwave";
  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
  const [isAddingNewFile, setIsAddingNewFile] = useState(false);
  const [newFileNameInput, setNewFileNameInput] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCompletionFlash, setIsCompletionFlash] = useState(false);
  const prevActivityRef = useRef<StudioActivityStatus>(activityStatus);
  const fileDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Brief vivid completion flash when transitioning from running -> optimal / warning,
  // then smoothly settles into a calm ambient hairline (matches EnterpriseHeader).
  useEffect(() => {
    const prev = prevActivityRef.current;
    prevActivityRef.current = activityStatus;
    if (prev === "running" && (activityStatus === "optimal" || activityStatus === "warning")) {
      setIsCompletionFlash(true);
      const t = setTimeout(() => setIsCompletionFlash(false), 3500);
      return () => clearTimeout(t);
    }
    if (activityStatus === "running" || activityStatus === "idle") {
      setIsCompletionFlash(false);
    }
  }, [activityStatus]);

  const currentFile =
    activeFile ||
    activeProject.activeFile ||
    activeProject.files?.[0] ||
    "main.py";

  const projectFiles =
    activeProject.files && activeProject.files.length > 0
      ? activeProject.files
      : [currentFile];

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        fileDropdownRef.current &&
        !fileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFileDropdownOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFileDropdownOpen(false);
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const getFileIcon = (file?: string) => {
    if (!file) {
      return <FileCode className="w-3.5 h-3.5 shrink-0 text-zinc-400" />;
    }
    if (file.endsWith(".py")) {
      return <FileCode className="w-3.5 h-3.5 shrink-0 text-zinc-300" />;
    }
    if (file.endsWith(".qasm")) {
      return <Activity className="w-3.5 h-3.5 shrink-0 text-zinc-400" />;
    }
    if (file.endsWith(".json")) {
      return <FileJson className="w-3.5 h-3.5 shrink-0 text-zinc-400" />;
    }
    return <FileText className="w-3.5 h-3.5 shrink-0 text-zinc-400" />;
  };

  const getFileTypeLabel = (file?: string) => {
    if (!file) return "File";
    if (file.endsWith(".py")) return "Python";
    if (file.endsWith(".qasm")) return "QASM";
    if (file.endsWith(".json")) return "JSON";
    return "File";
  };

  return (
    <header
      suppressHydrationWarning
      className={`relative h-12 border-b pl-2 pr-3.5 flex items-center justify-between shrink-0 z-20 shadow-xs transition-colors ${
        isDark
          ? "bg-[#0E0F13] border-white/[0.08]"
          : "bg-white border-slate-200"
      }`}
    >
      {/* ── LEFT: 3 Distinct Functional Zones with Generous Spacing ── */}
      <div className="flex items-center gap-5 shrink-0 min-w-0">
        {/* ── SECTION 1: Brand Anchor (Logo + Platform Name) ── */}
        <div className="flex items-center space-x-2.5 shrink-0 select-none">
          <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden border border-slate-200/50">
            <img
              src="/qg-logo.png"
              alt="Quantum Guru"
              className="w-full h-full object-contain"
            />
          </div>
          <span
            className={`text-xs font-mono font-bold tracking-wider uppercase select-none ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            QUANTUM GURU
          </span>
        </div>

        {/* Structural Divider 1: Brand ↔ Workspace Navigation */}
        <div
          className={`h-4 w-[1px] shrink-0 ${
            isDark ? "bg-white/10" : "bg-slate-200"
          }`}
        />

        {/* ── SECTION 2: Workspace View Switcher (Hero Tabs) ── */}
        <div
          id="tour-hero-tabs"
          className={`flex items-center space-x-0.5 p-0.5 rounded-lg text-xs font-mono select-none transition-colors shrink-0 ${
            isDark ? "bg-white/[0.06]" : "bg-slate-100 border border-slate-200/60"
          }`}
        >
          {/* Tab 1: Code */}
          <button
            onClick={() => onSelectHeroTab("code")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              heroTab === "code"
                ? isDark
                  ? "bg-white/[0.12] text-white shadow-xs"
                  : "bg-white text-slate-900 font-semibold shadow-xs"
                : isDark
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <span>Code</span>
          </button>

          {/* Tab 2: Model (D-Wave exclusive, previously Formulation) */}
          {isDwave && (
            <button
              onClick={() => onSelectHeroTab("formulation")}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all font-medium ${
                heroTab === "formulation"
                  ? isDark
                    ? "bg-white/[0.12] text-white shadow-xs"
                    : "bg-white text-slate-900 font-semibold shadow-xs"
                  : isDark
                  ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <span>Model</span>
              {isModelDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          )}

          {/* Tab 3: QUBO (D-Wave) or Circuit (Qiskit) */}
          <button
            onClick={() => onSelectHeroTab("visual")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              heroTab === "visual"
                ? isDark
                  ? "bg-white/[0.12] text-white shadow-xs"
                  : "bg-white text-slate-900 font-semibold shadow-xs"
                : isDark
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <span>{isDwave ? "QUBO" : "Circuit"}</span>
          </button>

          {/* Tab 4: Results */}
          <button
            onClick={() => onSelectHeroTab("results")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              heroTab === "results"
                ? isDark
                  ? "bg-white/[0.12] text-white shadow-xs"
                  : "bg-white text-slate-900 font-semibold shadow-xs"
                : isDark
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <span>Results</span>
          </button>
        </div>

        {/* Structural Divider 2: Workspace Navigation ↔ File Context */}
        <div
          className={`h-4 w-[1px] shrink-0 ${
            isDark ? "bg-white/10" : "bg-slate-200"
          }`}
        />

        {/* ── SECTION 3: Contextual Hierarchy (Project & File Breadcrumbs) ── */}
        <div id="tour-project-selector" className="flex items-center space-x-2 shrink-0">
          {/* Project Dropdown Trigger Pill */}
          <button
            onClick={onOpenProjectModal}
            className={`flex items-center space-x-1.5 px-2.5 py-1.25 rounded-md text-xs font-mono transition-colors group cursor-pointer border ${
              isDark
                ? "border-transparent hover:bg-zinc-800/80 text-zinc-300 hover:text-white"
                : "border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-800 hover:text-slate-900"
            }`}
            title="Switch project"
          >
            <Folder
              className={`w-3.5 h-3.5 shrink-0 ${
                isDark ? "text-zinc-400" : "text-slate-500"
              }`}
            />
            <span className="max-w-[160px] sm:max-w-[200px] truncate font-medium">
              {activeProject.title}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-transform" />
          </button>
        </div>
      </div>

      {/* ── RIGHT: Backend Chip (Clean Status) + Action Button + User Profile ── */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Algorithm Vault Button (Refined Neutral Ghost Pill) */}
        {onOpenAlgorithmStudio && (
          <button
            onClick={onOpenAlgorithmStudio}
            className={`flex items-center px-2.5 py-1.5 rounded-md text-xs font-mono border transition-all cursor-pointer ${
              isDark
                ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-300 hover:text-white"
                : "bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700 hover:text-slate-900"
            }`}
            title="Open Algorithm Vault (26 Verified Blueprints)"
          >
            <span className="font-medium">Algorithm Vault</span>
          </button>
        )}

        {/* Primary Action Button (Option A: High-Contrast Monochromatic Linear/Vercel style) */}
        <button
          id="tour-run-action"
          onClick={onRunOrRecompile}
          disabled={isRunningOrRecompiling}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold font-mono transition-all shadow-sm cursor-pointer ${
            isDark
              ? "bg-zinc-200 hover:bg-white text-zinc-900 shadow-zinc-900/20 active:scale-[0.98]"
              : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10 active:scale-[0.98]"
          } ${isRunningOrRecompiling ? "opacity-75 cursor-not-allowed" : ""}`}
        >
          {isRunningOrRecompiling ? (
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>
            {isRunningOrRecompiling
              ? isDwave
                ? "Solving..."
                : "Executing..."
              : isDwave
              ? isModelDirty
                ? "Recompile & Solve"
                : "Run Solver"
              : "Run Circuit"}
          </span>
        </button>

        <div className={`h-4 w-[1px] ${isDark ? "bg-zinc-700/50" : "bg-slate-200"}`} />

        {/* User / Session Badge & Logout Dropdown */}
        {isAuthenticated ? (
          <div className="relative" ref={userMenuRef}>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className={`flex items-center space-x-2 px-2.5 py-1.25 rounded-md text-xs transition-colors border cursor-pointer ${
                  isDark
                    ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-200 hover:text-white"
                    : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
                }`}
                title="Account menu"
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold uppercase shadow-xs shrink-0 border ${
                  isDark
                    ? "bg-zinc-800 border-white/10 text-zinc-200"
                    : "bg-slate-200 border-slate-300 text-slate-700"
                }`}>
                  {user?.name?.[0] || user?.email?.[0] || "U"}
                </div>
                <span className="hidden sm:inline max-w-[80px] truncate text-[11px] font-medium font-mono">
                  {user?.name || user?.email?.split("@")[0]}
                </span>
                <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isUserMenuOpen ? "rotate-180 text-zinc-200" : ""}`} />
              </button>


            </div>

            {/* User Dropdown Menu Popover */}
            {isUserMenuOpen && (
              <div
                className={`absolute right-0 top-full mt-1.5 w-60 rounded-xl border shadow-2xl backdrop-blur-md z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 ${
                  isDark
                    ? "bg-[#13141A]/95 border-white/[0.12] text-zinc-200 shadow-black/80"
                    : "bg-white border-slate-200 text-slate-900 shadow-xl"
                }`}
              >
                {/* User Info Header */}
                <div className={`px-3.5 py-3 border-b flex items-center space-x-3 ${isDark ? "border-white/[0.06]" : "border-slate-100 bg-slate-50/50"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0 border ${
                    isDark
                      ? "bg-zinc-800 border-white/10 text-zinc-200"
                      : "bg-slate-200 border-slate-300 text-slate-700"
                  }`}>
                    {user?.name?.[0] || user?.email?.[0] || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate font-mono text-zinc-100 dark:text-zinc-100">
                      {user?.name || user?.email?.split("@")[0]}
                    </p>
                    <p className={`text-[11px] truncate font-mono ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                      {user?.email}
                    </p>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="p-1 space-y-0.5">
                  <Link
                    href="/enterprise"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                      isDark
                        ? "hover:bg-white/[0.06] text-sky-300 hover:text-sky-200"
                        : "hover:bg-sky-50 text-sky-700 hover:text-sky-800"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>Enterprise Studio</span>
                  </Link>

                  {onOpenReportIssue && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenReportIssue();
                      }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                        isDark ? "hover:bg-white/[0.06] text-amber-300 hover:text-amber-200" : "hover:bg-amber-50 text-amber-700 hover:text-amber-800"
                      }`}
                    >
                      <Bug className="w-3.5 h-3.5 text-amber-400" />
                      <span>Report Issue / Bug</span>
                    </button>
                  )}

                  {onStartTour && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onStartTour();
                      }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                        isDark ? "hover:bg-white/[0.06] text-zinc-300 hover:text-white" : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Take Product Tour</span>
                    </button>
                  )}

                </div>

                {/* Sign Out Action */}
                {onLogout && (
                  <div className={`p-1 border-t ${isDark ? "border-white/[0.06]" : "border-slate-100"}`}>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isDark
                          ? "text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                          : "text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5 text-current" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login?redirect=%2Fide"
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors border ${
              isDark
                ? "bg-zinc-800/60 hover:bg-zinc-800 border-white/[0.06] text-zinc-300"
                : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 font-medium"
            }`}
          >
            <LogIn className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px]">Sign In</span>
          </Link>
        )}
      </div>

      {/* ── QUANTUM GURU NAV-BAR BOTTOM PROGRESS & STATUS HAIRLINE ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
      >
        {activityStatus === "running" && (
          <div className="relative h-full w-full bg-[#2E65BF]/20">
            <div
              style={{
                width: "32%",
                background:
                  "linear-gradient(90deg, transparent 0%, #2E65BF 20%, #1BB0CE 62%, #38BDF8 90%, transparent 100%)",
                boxShadow: "0 0 12px rgba(27, 176, 206, 0.85)",
              }}
              className="h-full qg-nav-beam-sweep"
            />
          </div>
        )}

        {activityStatus === "optimal" && (
          <div
            style={{
              background: "linear-gradient(90deg, #059669 0%, #10B981 50%, #34D399 100%)",
              boxShadow: isCompletionFlash ? "0 0 10px rgba(16, 185, 129, 0.7)" : "none",
              opacity: isCompletionFlash ? 1 : isDark ? 0.42 : 0.55,
            }}
            className="h-full w-full transition-opacity duration-700"
          />
        )}

        {activityStatus === "warning" && (
          <div
            style={{
              background: "linear-gradient(90deg, #D97706 0%, #F59E0B 50%, #FBBF24 100%)",
              boxShadow: isCompletionFlash ? "0 0 10px rgba(245, 158, 11, 0.7)" : "none",
              opacity: isCompletionFlash ? 1 : isDark ? 0.5 : 0.65,
            }}
            className="h-full w-full transition-opacity duration-700"
          />
        )}
      </div>
    </header>
  );
}
