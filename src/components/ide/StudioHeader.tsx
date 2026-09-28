"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Plus,
  Play,
  Zap,
  Sun,
  Moon,
  Cpu,
  LogIn,
  RotateCw,
  Cloud,
  CloudOff,
  Code,
  Sparkles,
  Layers,
  Activity,
  BarChart2,
  Folder,
  FileCode,
  FileJson,
  FileText,
  Check,
  Copy,
  Terminal,
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
  heroTab: HeroTabType;
  onSelectHeroTab: (tab: HeroTabType) => void;
  activeFile?: string;
  onSelectFile?: (file: string) => void;
  onAddFile?: (fileName: string) => void;
  onCopyCode?: () => void;
  showTerminal?: boolean;
  onToggleTerminal?: () => void;
  isSyncing?: boolean;
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
  heroTab,
  onSelectHeroTab,
  activeFile,
  onSelectFile,
  onAddFile,
  onCopyCode,
  showTerminal = false,
  onToggleTerminal,
  isSyncing = false,
}: StudioHeaderProps) {
  const isDwave = activeProject.framework === "dwave";
  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileDropdownRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    onCopyCode?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentFile =
    activeFile ||
    activeProject.activeFile ||
    activeProject.files?.[0] ||
    "main.py";

  const projectFiles =
    activeProject.files && activeProject.files.length > 0
      ? activeProject.files
      : [currentFile];

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        fileDropdownRef.current &&
        !fileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFileDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFileDropdownOpen(false);
      }
    }
    if (isFileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFileDropdownOpen]);

  const getFileIcon = (file?: string) => {
    if (!file) {
      return (
        <FileCode
          className={`w-3.5 h-3.5 shrink-0 ${
            isDwave ? "text-emerald-400" : "text-sky-400"
          }`}
        />
      );
    }
    if (file.endsWith(".py")) {
      return (
        <FileCode
          className={`w-3.5 h-3.5 shrink-0 ${
            isDwave ? "text-emerald-400" : "text-sky-400"
          }`}
        />
      );
    }
    if (file.endsWith(".qasm")) {
      return <Activity className="w-3.5 h-3.5 shrink-0 text-indigo-400" />;
    }
    if (file.endsWith(".json")) {
      return <FileJson className="w-3.5 h-3.5 shrink-0 text-amber-400" />;
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
      className={`h-12 border-b px-3.5 flex items-center justify-between shrink-0 z-20 shadow-xs transition-colors ${
        isDark
          ? "bg-[#0E0F13] border-white/[0.08]"
          : "bg-white border-slate-200"
      }`}
    >
      {/* ── LEFT: QG Brand + Hero Tabs + Divider + Project/File Breadcrumb ── */}
      <div className="flex items-center space-x-2.5 shrink-0 min-w-0">
        {/* Brand Logo with White Background (36px = +50% larger, standalone without QG text) */}
        <div className="mr-1 shrink-0 select-none">
          <div className="w-9 h-9 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
            <img
              src="/qg-logo.png"
              alt="Quantum Guru"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* ── HERO TABS (Code | Model | QUBO | Results) ── */}
        <div
          className={`flex items-center space-x-0.5 p-0.5 rounded-lg text-xs font-mono select-none transition-colors shrink-0 ${
            isDark ? "bg-white/[0.06]" : "bg-slate-100"
          }`}
        >
          {/* Tab 1: Code */}
          <button
            onClick={() => onSelectHeroTab("code")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              heroTab === "code"
                ? isDark
                  ? "bg-white/[0.12] text-white shadow-xs"
                  : "bg-white text-[#087FC3] shadow-xs"
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
                    : "bg-white text-[#087FC3] shadow-xs"
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
                  : "bg-white text-[#087FC3] shadow-xs"
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
                  : "bg-white text-[#087FC3] shadow-xs"
                : isDark
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <span>Results</span>
          </button>
        </div>

        {/* Separator / Divider: │ */}
        <div
          className={`h-4 w-[1px] mx-1 shrink-0 ${
            isDark ? "bg-white/[0.12]" : "bg-slate-300"
          }`}
        />

        {/* ── BREADCRUMB: Project Name ▾ + File Name ▾ ── */}
        <div className="flex items-center shrink-0">
          <div
            className={`flex items-center rounded-md text-xs font-medium transition-all ${
              isDark
                ? "bg-zinc-800/40 text-zinc-200"
                : "bg-slate-100 text-[#172033]"
            }`}
          >
            {/* 1. Project Name Button (Triggers Switch Project Modal) */}
            <button
              onClick={onOpenProjectModal}
              className={`group flex items-center space-x-1.5 px-2.5 py-1 rounded-l-md transition-colors ${
                isDark ? "hover:bg-zinc-800/80" : "hover:bg-[#E2E8F0]"
              }`}
              title="Click to Switch Project"
            >
              <Folder className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="max-w-[120px] sm:max-w-[150px] truncate font-mono text-[11px]">
                {activeProject.title}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:text-zinc-200" />
            </button>

            {/* Separator / Divider */}
            <div
              className={`h-4 w-[1px] ${
                isDark ? "bg-white/[0.08]" : "bg-[#C4CEDB]"
              }`}
            />

            {/* 2. File Name Dropdown Button */}
            <div className="relative" ref={fileDropdownRef}>
              <button
                onClick={() => setIsFileDropdownOpen((prev) => !prev)}
                className={`group flex items-center space-x-1.5 px-2.5 py-1 rounded-r-md transition-colors ${
                  isFileDropdownOpen
                    ? isDark
                      ? "bg-white/[0.08] text-white"
                      : "bg-slate-200 text-slate-900"
                    : isDark
                    ? "hover:bg-zinc-800/80 text-zinc-300"
                    : "hover:bg-[#E2E8F0] text-[#172033]"
                }`}
                title="Click to view all project files"
              >
                {getFileIcon(currentFile)}
                <span className="max-w-[90px] sm:max-w-[120px] truncate font-mono text-[11px] font-semibold text-sky-400">
                  {currentFile}
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-zinc-400 group-hover:text-zinc-200 transition-transform duration-150 ${
                    isFileDropdownOpen ? "rotate-180 text-sky-400" : ""
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
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-zinc-400">
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
                            <span className="text-[10px] text-zinc-500 font-normal">
                              {getFileTypeLabel(file)}
                            </span>
                            {isActive && (
                              <Check className="w-3.5 h-3.5 text-sky-400" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown Footer: Add File action */}
                  <div className="p-1 border-t border-white/[0.06]">
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
                          : "hover:bg-slate-100 text-sky-600 hover:text-sky-700"
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
      </div>

      {/* ── RIGHT: Backend Selector + Run Action + User ── */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Backend Target Selector */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
            isDark
              ? "bg-zinc-800/40 border-white/[0.08] text-zinc-300"
              : "bg-slate-100 border-slate-200 text-slate-700"
          }`}
        >
          <Cpu
            className={`w-3.5 h-3.5 ${
              isDwave ? "text-emerald-400" : "text-sky-400"
            }`}
          />
          <span className="text-[11px] font-medium">
            {isDwave ? "D-Wave" : "AerSimulator"}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          <ChevronDown className="w-3 h-3 text-zinc-400" />
        </div>

        {/* Primary Action Button (⚡ Recompile / ▷ Run Circuit) */}
        <button
          onClick={onRunOrRecompile}
          disabled={isRunningOrRecompiling}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium font-mono transition-all shadow-xs ${
            isDwave
              ? isModelDirty
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:brightness-110 shadow-amber-500/20"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
              : "bg-[#087FC3] hover:bg-[#066DAE] text-white shadow-sm"
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

        <div className="h-4 w-[1px] bg-zinc-700/50" />

        {/* User / Session Badge */}
        {isAuthenticated ? (
          <div className="flex items-center space-x-2 text-xs font-mono text-zinc-300">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
              {user?.name?.[0] || user?.email?.[0] || "U"}
            </div>
            <span className="hidden sm:inline max-w-[80px] truncate text-[11px]">
              {user?.name || user?.email?.split("@")[0]}
            </span>
          </div>
        ) : (
          <Link
            href="/login?redirect=%2Fide"
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors border ${
              isDark
                ? "bg-zinc-800/60 hover:bg-zinc-800 border-white/[0.06] text-zinc-300"
                : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
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
