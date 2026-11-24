"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Sun,
  Moon,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  Bug,
  User as UserIcon,
  LogOut,
  Sparkles,
  Square,
  RotateCw,
} from "lucide-react";
import type { SurfaceMode } from "./types";

interface EnterpriseHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenDeployModal: () => void;
  onOpenReportIssue: () => void;
  onOpenProfileModal: () => void;
  user: any;
  isAuthenticated: boolean;
  onLogout?: () => void;
  activeProblemTitle: string;
  isSolving?: boolean;
  onStopSolving?: () => void;
  surfaceMode?: SurfaceMode;
  onSelectSurfaceMode?: (mode: SurfaceMode) => void;
  onCompile?: () => void;
  onRunDwave?: () => void;
  onRunOrtools?: () => void;
  onRunParallel?: () => void;
  canCompile?: boolean;
  canRunDwave?: boolean;
  canRunOrtools?: boolean;
  isDemo?: boolean;
}

export function EnterpriseHeader({
  isDark,
  onToggleTheme,
  onOpenDeployModal,
  onOpenReportIssue,
  onOpenProfileModal,
  user,
  isAuthenticated,
  onLogout,
  activeProblemTitle,
  isSolving = false,
  onStopSolving,
  surfaceMode = "copilot",
  onSelectSurfaceMode,
  onCompile,
  onRunDwave,
  onRunOrtools,
  onRunParallel,
  canCompile = false,
  canRunDwave = false,
  canRunOrtools = false,
  isDemo = false,
}: EnterpriseHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSolveMenuOpen, setIsSolveMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const solveMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (solveMenuRef.current && !solveMenuRef.current.contains(event.target as Node)) {
        setIsSolveMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsSolveMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header
      style={{
        backgroundColor: isDark ? "#0E0F13" : "#FFFFFF",
      }}
      className={`h-12 border-b flex items-center justify-between px-3 sm:px-4 shrink-0 z-30 transition-colors enterprise-bg-layer-1 ${
        isDark ? "border-white/[0.08]" : "border-slate-200"
      }`}
    >
      {/* Left: Brand Anchor (Exact Logo from IDE) */}
      <div className="flex items-center space-x-3 shrink-0">
        <Link href="/" className="flex items-center space-x-2.5 shrink-0 select-none group">
          <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden border border-slate-200/50 group-hover:scale-105 transition-transform">
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
        </Link>

        {activeProblemTitle && (
          <>
            <div
              className={`h-4 w-[1px] shrink-0 ${
                isDark ? "bg-white/10" : "bg-slate-200"
              }`}
            />
            <span className="hidden md:inline text-xs font-mono text-zinc-400 truncate max-w-[260px]">
              {activeProblemTitle}
            </span>
          </>
        )}
      </div>

      {/* Center: Surface Mode Switcher & Telemetry Strip */}
      <div className="flex items-center space-x-3 text-[11px] font-mono">
        {onSelectSurfaceMode && (
          <div
            style={{
              backgroundColor: isDark ? "#090A0D" : "#F1F5F9",
            }}
            className="flex items-center p-0.5 rounded-lg border border-white/[0.08] enterprise-bg-layer-0"
          >
            <button
              onClick={() => onSelectSurfaceMode("copilot")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                surfaceMode === "copilot"
                  ? "bg-white/[0.08] text-white font-medium border border-white/[0.12] shadow-xs"
                  : isDark ? "text-zinc-400 hover:text-zinc-200" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Surface 1 Copilot View (30% Project History + 70% Chat)"
            >
              Copilot
            </button>
            <button
              onClick={() => onSelectSurfaceMode("workbench")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                surfaceMode === "workbench"
                  ? "bg-white/[0.08] text-white font-medium border border-white/[0.12] shadow-xs"
                  : isDark ? "text-zinc-400 hover:text-zinc-200" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Surface 2 Workbench View (50% Math Deck + 50% Monaco Code Studio)"
            >
              Workbench
            </button>
            <button
              onClick={() => onSelectSurfaceMode("library")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                surfaceMode === "library"
                  ? "bg-white/[0.08] text-white font-medium border border-white/[0.12] shadow-xs"
                  : isDark ? "text-zinc-400 hover:text-zinc-200" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Verified Industry Problem Library"
            >
              Library
            </button>
          </div>
        )}
      </div>

      {/* Right: Demo Indicator, Solve Dropdown, Theme Toggle, Profile Dropdown */}
      <div className="flex items-center space-x-2.5">
        {isDemo && (
          <span
            className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${
              isDark
                ? "bg-white/[0.04] border-white/[0.12] text-zinc-400"
                : "bg-slate-100 border-slate-200 text-slate-600"
            }`}
            title="View-only demo account — AI and simulators are disabled"
          >
            Demo · View Only
          </span>
        )}

        {/* Solve / Stop Dropdown (Option 2: Ultra-Minimal, Zero Fancy Icons) */}
        {isSolving && onStopSolving ? (
          <button
            type="button"
            onClick={onStopSolving}
            className={`px-3 py-1 rounded-md text-[11px] font-mono font-medium transition-colors border cursor-pointer ${
              isDark
                ? "bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/35 text-rose-300"
                : "bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-700"
            }`}
            title="Stop active solver run"
          >
            Stop
          </button>
        ) : (
          <div className="relative" ref={solveMenuRef}>
            <button
              type="button"
              onClick={() => setIsSolveMenuOpen((prev) => !prev)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-[11px] font-mono font-medium transition-colors border cursor-pointer ${
                isDark
                  ? "bg-white/[0.06] hover:bg-white/[0.11] border-white/[0.14] text-zinc-100"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white"
              }`}
              aria-haspopup="menu"
              aria-expanded={isSolveMenuOpen}
            >
              <span>Solve</span>
              <ChevronDown
                className={`w-3 h-3 opacity-70 transition-transform ${
                  isSolveMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isSolveMenuOpen && (
              <div
                style={{
                  backgroundColor: isDark ? "#111216" : "#FFFFFF",
                }}
                className={`absolute right-0 top-full mt-1.5 w-44 rounded-lg border shadow-2xl z-50 py-1 text-xs font-mono ${
                  isDark
                    ? "border-white/[0.12] text-zinc-200 shadow-black/80"
                    : "border-slate-200 text-slate-800 shadow-lg"
                }`}
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={!canCompile}
                  onClick={() => {
                    setIsSolveMenuOpen(false);
                    onCompile?.();
                  }}
                  className={`w-full text-left px-3 py-1.5 transition-colors ${
                    canCompile
                      ? isDark
                        ? "hover:bg-white/[0.06] text-zinc-200 hover:text-white cursor-pointer"
                        : "hover:bg-slate-100 text-slate-800 cursor-pointer"
                      : "text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  Compile
                </button>

                <div
                  className={`my-1 border-t ${
                    isDark ? "border-white/[0.08]" : "border-slate-200"
                  }`}
                />

                <button
                  type="button"
                  role="menuitem"
                  disabled={!canRunDwave}
                  onClick={() => {
                    setIsSolveMenuOpen(false);
                    onRunDwave?.();
                  }}
                  className={`w-full text-left px-3 py-1.5 transition-colors ${
                    canRunDwave
                      ? isDark
                        ? "hover:bg-white/[0.06] text-zinc-200 hover:text-white cursor-pointer"
                        : "hover:bg-slate-100 text-slate-800 cursor-pointer"
                      : "text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  Run D-Wave
                </button>

                <button
                  type="button"
                  role="menuitem"
                  disabled={!canRunOrtools}
                  onClick={() => {
                    setIsSolveMenuOpen(false);
                    onRunOrtools?.();
                  }}
                  className={`w-full text-left px-3 py-1.5 transition-colors ${
                    canRunOrtools
                      ? isDark
                        ? "hover:bg-white/[0.06] text-zinc-200 hover:text-white cursor-pointer"
                        : "hover:bg-slate-100 text-slate-800 cursor-pointer"
                      : "text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  Run Google OR-Tools
                </button>

                <button
                  type="button"
                  role="menuitem"
                  disabled={!canRunDwave && !canRunOrtools}
                  onClick={() => {
                    setIsSolveMenuOpen(false);
                    onRunParallel?.();
                  }}
                  className={`w-full text-left px-3 py-1.5 transition-colors ${
                    canRunDwave || canRunOrtools
                      ? isDark
                        ? "hover:bg-white/[0.06] text-zinc-100 hover:text-white font-medium cursor-pointer"
                        : "hover:bg-slate-100 text-slate-900 font-medium cursor-pointer"
                      : "text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  Run Parallel
                </button>
              </div>
            )}
          </div>
        )}

        {/* User / Session Badge & Logout Dropdown */}
        {isAuthenticated ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className={`flex items-center space-x-2 px-2.5 py-1.25 rounded-md text-xs transition-colors border cursor-pointer ${
                isDark
                  ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-200 hover:text-white"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
              }`}
              title="Account menu"
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold uppercase shrink-0 border ${
                  isDark
                    ? "bg-zinc-800 border-white/10 text-zinc-200"
                    : "bg-slate-200 border-slate-300 text-slate-700"
                }`}
              >
                {user?.name?.[0] || user?.email?.[0] || "U"}
              </div>
              <span className="hidden sm:inline max-w-[80px] truncate text-[11px] font-medium font-mono">
                {user?.name || user?.email?.split("@")[0]}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-zinc-400 transition-transform ${
                  isUserMenuOpen ? "rotate-180 text-zinc-200" : ""
                }`}
              />
            </button>

            {/* User Dropdown Menu Popover (Layer 4) */}
            {isUserMenuOpen && (
              <div
                className={`absolute right-0 top-full mt-1.5 w-60 rounded-xl border shadow-2xl backdrop-blur-md z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 ${
                  isDark
                    ? "bg-[#1D202F] border-white/[0.14] text-zinc-100 shadow-black/80"
                    : "bg-white border-slate-200 text-slate-900 shadow-xl"
                }`}
              >
                {/* User Info Header */}
                <div
                  className={`px-3.5 py-3 border-b flex items-center space-x-3 ${
                    isDark ? "border-white/[0.08] bg-[#161924]" : "border-slate-100 bg-slate-50/50"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0 border ${
                      isDark
                        ? "bg-zinc-800 border-white/10 text-zinc-200"
                        : "bg-slate-200 border-slate-300 text-slate-700"
                    }`}
                  >
                    {user?.name?.[0] || user?.email?.[0] || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate text-zinc-100">
                      {user?.name || "Enterprise User"}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate font-mono">
                      {user?.email || "user@enterprise.org"}
                    </p>
                  </div>
                </div>

                <div className="p-1 space-y-0.5 text-xs font-mono">
                  {!isDemo && (
                    <Link
                      href="/ide"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left hover:bg-white/[0.05] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      <span>Circuit IDE</span>
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenProfileModal();
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left hover:bg-white/[0.05] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>Profile & account</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenReportIssue();
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left hover:bg-white/[0.05] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <Bug className="w-3.5 h-3.5 text-amber-400" />
                    <span>Report an issue</span>
                  </button>

                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold bg-sky-500 hover:bg-sky-400 text-black shadow-xs transition-all cursor-pointer"
          >
            <span>Sign in</span>
          </Link>
        )}
      </div>
    </header>
  );
}
