"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Plus,
  Play,
  Zap,
  Cpu,
  LogIn,
  LogOut,
  RotateCw,
  Sparkles,
  Activity,
  Folder,
  FileCode,
  FileJson,
  FileText,
  Check,
  Share2,
} from "lucide-react";
import { ProjectItem, HeroTabType } from "./types";

interface StudioHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  activeProject: ProjectItem;
  onOpenProjectModal: () => void;
  onOpenNewProjectModal: () => void;
  isRunningOrRecompiling: boolean;
  onRunOrRecompile: () => void;
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
  onOpenDataConnectors?: () => void;
}

export function StudioHeader({
  isDark,
  onToggleTheme,
  activeProject,
  onOpenProjectModal,
  onOpenNewProjectModal,
  isRunningOrRecompiling,
  onRunOrRecompile,
  isModelDirty = false,
  user,
  isAuthenticated,
  onLogout,
  heroTab,
  onSelectHeroTab,
  activeFile,
  onSelectFile,
  onAddFile,
  onOpenDataConnectors,
}: StudioHeaderProps) {
  const isDwave = activeProject.framework === "dwave";
  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const fileDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
      return (
        <FileCode
          className={`w-3.5 h-3.5 shrink-0 ${
            isDwave ? "text-emerald-500" : "text-sky-500"
          }`}
        />
      );
    }
    if (file.endsWith(".py")) {
      return (
        <FileCode
          className={`w-3.5 h-3.5 shrink-0 ${
            isDwave ? "text-emerald-500" : "text-sky-500"
          }`}
        />
      );
    }
    if (file.endsWith(".qasm")) {
      return <Activity className="w-3.5 h-3.5 shrink-0 text-indigo-500" />;
    }
    if (file.endsWith(".json")) {
      return <FileJson className="w-3.5 h-3.5 shrink-0 text-amber-500" />;
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
      className={`h-12 border-b pl-2 pr-3.5 flex items-center justify-between shrink-0 z-20 shadow-xs transition-colors ${
        isDark
          ? "bg-[#0E0F13] border-white/[0.08]"
          : "bg-white border-slate-200"
      }`}
    >
      {/* ── LEFT: Logo + "QUANTUM GURU" + Space + Hero Tabs + Divider + Project/File Breadcrumb ── */}
      <div className="flex items-center shrink-0 min-w-0">
        {/* Brand Logo (36px, white background) + QUANTUM GURU text */}
        <div className="flex items-center space-x-2.5 shrink-0 select-none mr-4">
          <div className="w-9 h-9 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden border border-slate-200/50">
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

        {/* ── HERO TABS (Code | Model/Circuit | QUBO | Results) ── */}
        <div
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
                  : "bg-white text-sky-700 font-semibold shadow-xs"
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
                    : "bg-white text-sky-700 font-semibold shadow-xs"
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
                  : "bg-white text-sky-700 font-semibold shadow-xs"
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
                  : "bg-white text-sky-700 font-semibold shadow-xs"
                : isDark
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <span>Results</span>
          </button>
        </div>

        {/* ── VERTICAL DIVIDER ── */}
        <div
          className={`h-4 w-[1px] mx-3 shrink-0 ${
            isDark ? "bg-white/[0.08]" : "bg-slate-300"
          }`}
        />

        {/* ── PROJECT & FILE BREADCRUMB ── */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Project Dropdown Trigger Pill */}
          <button
            onClick={onOpenProjectModal}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-md text-xs font-mono transition-colors group cursor-pointer border ${
              isDark
                ? "border-transparent hover:bg-zinc-800/80 text-zinc-300 hover:text-white"
                : "border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-800 hover:text-slate-900"
            }`}
            title="Switch project"
          >
            <Folder
              className={`w-3.5 h-3.5 shrink-0 ${
                isDark ? "text-sky-400" : "text-sky-600"
              }`}
            />
            <span className="max-w-[100px] sm:max-w-[130px] truncate font-medium">
              {activeProject.title}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-transform" />
          </button>

          {/* Breadcrumb Separator */}
          <span
            className={`text-xs select-none ${
              isDark ? "text-zinc-600" : "text-slate-300"
            }`}
          >
            /
          </span>

          {/* File Dropdown Trigger Pill (Directly Anchored Popover) */}
          <div className="relative" ref={fileDropdownRef}>
            <button
              onClick={() => setIsFileDropdownOpen((prev) => !prev)}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded-md text-xs font-mono transition-colors group cursor-pointer border ${
                isFileDropdownOpen
                  ? isDark
                    ? "bg-zinc-800 border-white/[0.12] text-white"
                    : "bg-slate-100 border-slate-300 text-slate-900"
                  : isDark
                  ? "border-transparent hover:bg-zinc-800/80 text-zinc-300 hover:text-white"
                  : "border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-800 hover:text-slate-900"
              }`}
              title="Click to view all project files"
            >
              {getFileIcon(currentFile)}
              <span className={`max-w-[90px] sm:max-w-[120px] truncate font-mono text-[11px] font-semibold ${
                isDark ? "text-sky-400" : "text-sky-700"
              }`}>
                {currentFile}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-zinc-400 transition-transform duration-150 ${
                  isFileDropdownOpen ? "rotate-180 text-sky-500" : ""
                }`}
              />
            </button>

            {/* ── PROJECT FILES DROPDOWN POPOVER ── */}
            {isFileDropdownOpen && (
              <div
                className={`absolute top-full left-0 mt-1.5 w-64 rounded-xl border shadow-2xl backdrop-blur-md z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 ${
                  isDark
                    ? "bg-[#13141A]/95 border-white/[0.12] text-zinc-200 shadow-black/80"
                    : "bg-white border-slate-200 text-slate-900 shadow-xl"
                }`}
              >
                {/* Dropdown Header */}
                <div className={`flex items-center justify-between px-3 py-2 border-b text-[10px] font-mono uppercase tracking-wider ${
                  isDark ? "border-white/[0.06] text-zinc-400" : "border-slate-100 text-slate-500 bg-slate-50/50"
                }`}>
                  <span>Project Files</span>
                  <span>{projectFiles.length} file{projectFiles.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Scrollable File List */}
                <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                  {projectFiles.map((file: string) => {
                    const isActive = file === currentFile;
                    return (
                      <button
                        key={file}
                        onClick={() => {
                          onSelectFile?.(file);
                          setIsFileDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                          isActive
                            ? isDark
                              ? "bg-sky-500/15 text-sky-300 font-semibold"
                              : "bg-sky-50 text-sky-700 font-semibold"
                            : isDark
                            ? "hover:bg-white/[0.06] text-zinc-300 hover:text-white"
                            : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          {getFileIcon(file)}
                          <span className="truncate">{file}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                          <span className={`text-[10px] font-normal ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
                            {getFileTypeLabel(file)}
                          </span>
                          {isActive && (
                            <Check className="w-3.5 h-3.5 text-sky-500" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Dropdown Footer: Add File action */}
                <div className={`p-1 border-t ${isDark ? "border-white/[0.06]" : "border-slate-100"}`}>
                  <button
                    onClick={() => {
                      const name = window.prompt("Enter new file name (e.g., config.json):");
                      if (name && name.trim()) {
                        onAddFile?.(name.trim());
                        setIsFileDropdownOpen(false);
                      }
                    }}
                    className={`w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-mono transition-colors ${
                      isDark
                        ? "hover:bg-white/[0.05] text-sky-400 hover:text-sky-300"
                        : "hover:bg-slate-100 text-sky-600 hover:text-sky-700 font-medium"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>New file in project...</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Backend Chip (Clean Status) + Action Button + User Profile ── */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Backend Target Simulator Status Chip (NO non-functional dropdown arrow) */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-colors select-none ${
            isDark
              ? "bg-zinc-800/40 border-white/[0.08] text-zinc-300"
              : "bg-slate-100 border-slate-200 text-slate-700"
          }`}
          title="Active Simulation Engine"
        >
          {isDwave && (
            <Cpu className="w-3.5 h-3.5 text-emerald-500" />
          )}
          <span
            className="text-[11px] font-semibold"
            style={
              isDwave
                ? undefined
                : { color: isDark ? "#8A3FFC" : "#6929C4" }
            }
          >
            {isDwave ? "D-Wave" : "Qiskit Sim"}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
        </div>

        {/* Data Connectors Button (Pillar 2 Ingress / Egress) */}
        {onOpenDataConnectors && isDwave && (
          <button
            onClick={onOpenDataConnectors}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono border transition-all cursor-pointer bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1] text-sky-400 hover:text-sky-300 shadow-xs"
            title="Open Data Ingress and Egress Connectors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Data Connectors</span>
          </button>
        )}

        {/* Primary Action Button (⚡ Recompile / ▷ Run Circuit) */}
        <button
          onClick={onRunOrRecompile}
          disabled={isRunningOrRecompiling}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-all shadow-sm cursor-pointer ${
            isDwave
              ? isModelDirty
                ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
              : "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20"
          }`}
        >
          {isRunningOrRecompiling ? (
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
          ) : isDwave ? (
            <Zap className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          <span>
            {isRunningOrRecompiling
              ? isDwave
                ? "Compiling..."
                : "Executing..."
              : isDwave
              ? isModelDirty
                ? "⚡ Recompile"
                : "Compiled"
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
                className={`flex items-center space-x-2 px-2 py-1 rounded-md text-xs font-mono transition-colors border cursor-pointer ${
                  isDark
                    ? "bg-zinc-800/60 hover:bg-zinc-800 border-white/[0.08] text-zinc-200"
                    : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
                }`}
                title="Account menu"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-xs shrink-0">
                  {user?.name?.[0] || user?.email?.[0] || "U"}
                </div>
                <span className="hidden sm:inline max-w-[80px] truncate text-[11px] font-medium">
                  {user?.name || user?.email?.split("@")[0]}
                </span>
                <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} />
              </button>


            </div>

            {/* User Dropdown Menu Popover */}
            {isUserMenuOpen && (
              <div
                className={`absolute right-0 top-full mt-1.5 w-56 rounded-xl border shadow-xl backdrop-blur-md z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 ${
                  isDark
                    ? "bg-[#13141A]/95 border-white/[0.12] text-zinc-200 shadow-black/80"
                    : "bg-white border-slate-200 text-slate-900 shadow-xl"
                }`}
              >
                <div className={`px-3 py-2 border-b flex items-center space-x-2.5 ${isDark ? "border-white/[0.06]" : "border-slate-100 bg-slate-50/50"}`}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0 shadow-xs">
                    {user?.name?.[0] || user?.email?.[0] || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate font-mono">
                      {user?.name || user?.email?.split("@")[0]}
                    </p>
                    <p className={`text-[10px] truncate ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                      {user?.email}
                    </p>
                  </div>
                </div>

                <div className="p-1 space-y-0.5">
                  <Link
                    href="/marketplace"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      isDark ? "hover:bg-white/[0.06] text-zinc-300 hover:text-white" : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Marketplace</span>
                  </Link>
                  <Link
                    href="/quantum-assistant"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      isDark ? "hover:bg-white/[0.06] text-zinc-300 hover:text-white" : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                    <span>Assistant</span>
                  </Link>
                </div>

                {onLogout && (
                  <div className={`p-1 border-t ${isDark ? "border-white/[0.06]" : "border-slate-100"}`}>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-mono text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="font-semibold">Sign Out</span>
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
    </header>
  );
}
