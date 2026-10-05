"use client";

import React from "react";
import {
  Sun,
  Moon,
  RotateCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface StudioBottomBarProps {
  isDark: boolean;
  onToggleTheme?: () => void;
  framework: "dwave" | "qiskit";
  isSynced?: boolean;
  onSync?: () => void;
  showTerminal: boolean;
  onToggleTerminal: () => void;
  terminalOutput?: string;
  specs?: {
    qubits?: number;
    depth?: number;
    fidelity?: number;
    shots?: number;
    cost?: number;
    maxCost?: number;
    score?: number;
    energy?: number;
    feasible?: boolean;
    isPortfolio?: boolean;
    variablesCount?: number;
    activeCount?: number;
    reads?: number;
  };
}

export function StudioBottomBar({
  isDark,
  onToggleTheme,
  framework,
  isSynced = true,
  onSync,
  showTerminal,
  onToggleTerminal,
  terminalOutput,
  specs,
}: StudioBottomBarProps) {
  const isDwave = framework === "dwave";

  const valClass = isDark
    ? "text-zinc-200 font-medium"
    : "text-slate-800 font-semibold";

  return (
    <div
      id="tour-bottom-console"
      className={`border-t shrink-0 flex flex-col transition-all duration-150 ${
        showTerminal ? "h-48" : "h-7"
      } ${
        isDark
          ? "bg-[#090A0D] border-white/[0.08]"
          : "bg-white border-slate-200"
      }`}
    >
      {/* ── STATUS BAR STRIP (h-7) ── */}
      <div
        className={`h-7 px-3 flex items-center justify-between select-none text-xs font-mono transition-colors ${
          showTerminal
            ? isDark
              ? "border-b border-white/[0.05]"
              : "border-b border-slate-200"
            : ""
        } ${isDark ? "text-zinc-400" : "text-slate-600"}`}
      >
        {/* Left: Change Theme Button */}
        <div className="flex items-center space-x-2">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className={`p-1 rounded-md transition-colors flex items-center justify-center cursor-pointer ${
                isDark
                  ? "hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200"
                  : "hover:bg-slate-100 text-slate-500 hover:text-slate-800"
              }`}
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-600" />
              )}
            </button>
          )}
        </div>

        {/* Right: Telemetry (Disciplined Monochrome) + Engine Badge + Synced Status + Console Toggle */}
        <div suppressHydrationWarning className="flex items-center space-x-3 text-[11px] font-mono">
          {/* Telemetry metrics */}
          <div suppressHydrationWarning className={`flex items-center space-x-2 ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
            {framework === "qiskit" ? (
              <>
                <span>
                  Qubits: <strong suppressHydrationWarning className={valClass}>{specs?.qubits ?? 3}</strong>
                </span>
                <span className={isDark ? "text-zinc-700" : "text-slate-300"}>·</span>
                <span>
                  Depth: <strong suppressHydrationWarning className={valClass}>{specs?.depth ?? 8}</strong>
                </span>
                <span className={isDark ? "text-zinc-700" : "text-slate-300"}>·</span>
                <span>
                  Fidelity: <strong suppressHydrationWarning className={valClass}>{(specs?.fidelity ?? 99.8).toFixed(1)}%</strong>
                </span>
                <span className={isDark ? "text-zinc-700" : "text-slate-300"}>·</span>
                <span>
                  Shots: <strong suppressHydrationWarning className={valClass}>{specs?.shots ?? 4096}</strong>
                </span>
              </>
            ) : specs?.isPortfolio ? (
              <>
                <span>
                  Cost: <strong suppressHydrationWarning className={valClass}>${Number((specs?.cost ?? 14).toFixed(1))}/${Number((specs?.maxCost ?? 18).toFixed(1))}</strong>
                </span>
                <span className={isDark ? "text-zinc-700" : "text-slate-300"}>·</span>
                <span>
                  Score: <strong suppressHydrationWarning className={valClass}>{(specs?.score ?? 18.5).toFixed(1)}</strong>
                </span>
                <span className={isDark ? "text-zinc-700" : "text-slate-300"}>·</span>
                <span>
                  Energy: <strong suppressHydrationWarning className={valClass}>{(specs?.energy ?? -62.2).toFixed(1)}</strong>
                </span>
                <span className={isDark ? "text-zinc-700" : "text-slate-300"}>·</span>
                <span className={`font-semibold ${specs?.feasible ?? true ? (isDark ? "text-emerald-400" : "text-emerald-700") : (isDark ? "text-rose-400" : "text-rose-700")}`}>
                  {specs?.feasible ?? true ? "Feasible" : "Infeasible"}
                </span>
              </>
            ) : (
              <>
                <span>
                  Variables: <strong suppressHydrationWarning className={valClass}>{specs?.variablesCount ?? 1}</strong>
                </span>
                <span className={isDark ? "text-zinc-700" : "text-slate-300"}>·</span>
                <span>
                  Active: <strong suppressHydrationWarning className={valClass}>{specs?.activeCount ?? 0}</strong>
                </span>
                <span className={isDark ? "text-zinc-700" : "text-slate-300"}>·</span>
                <span>
                  Energy: <strong suppressHydrationWarning className={valClass}>{(specs?.energy ?? 0).toFixed(2)}</strong>
                </span>
                <span className={isDark ? "text-zinc-700" : "text-slate-300"}>·</span>
                <span>
                  Reads: <strong suppressHydrationWarning className={valClass}>{specs?.reads ?? 1024}</strong>
                </span>
              </>
            )}
          </div>

          <span className={`select-none ${isDark ? "text-zinc-700" : "text-slate-300"}`}>|</span>

          {/* Engine Status Badge (Clean Monochromatic Metadata) */}
          <div
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-mono border select-none transition-colors ${
              isDark
                ? "bg-white/[0.04] border-white/[0.08] text-zinc-300"
                : "bg-slate-100 border-slate-200 text-slate-700"
            }`}
            title="Active Simulation Engine"
          >
            <span className="font-medium">
              {isDwave ? "D-Wave QPU" : "Qiskit Aer Sim"}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5 shrink-0" />
          </div>

          {/* Code / Circuit Synced Indicative Button (Status Green / Warning Amber) */}
          {onSync && (
            <button
              type="button"
              onClick={onSync}
              className={`flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                isSynced
                  ? isDark
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  : isDark
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 shadow-xs animate-pulse"
                  : "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 shadow-xs animate-pulse"
              }`}
              title={isSynced ? "Code and visual circuit are in sync" : "Code or circuit modified — click to sync"}
            >
              {isSynced ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-medium">Synced</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-2.5 h-2.5 text-amber-400 animate-spin shrink-0" />
                  <span className="font-semibold text-amber-400">Sync</span>
                </>
              )}
            </button>
          )}

          <span className={`select-none ${isDark ? "text-zinc-700" : "text-slate-300"}`}>|</span>

          {/* Console Toggle Button */}
          <button
            type="button"
            onClick={onToggleTerminal}
            className={`flex items-center space-x-1 text-[10px] transition-colors py-0.5 px-2 rounded cursor-pointer ${
              isDark
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium"
            }`}
            title={showTerminal ? "Close Console" : "Open Console"}
          >
            <span>Console</span>
            {showTerminal ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* ── EXPANDED TERMINAL DRAWER ── */}
      {showTerminal && (
        <div className="flex-1 p-3 font-mono text-[11px] overflow-auto text-emerald-400/90 whitespace-pre-wrap leading-relaxed select-text">
          {terminalOutput ||
            `$ Ready. Click "${
              isDwave ? "Recompile" : "Run Circuit"
            }" in the top toolbar to execute.`}
        </div>
      )}
    </div>
  );
}
