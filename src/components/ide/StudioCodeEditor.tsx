"use client";

import React, { useState, useEffect } from "react";
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
} from "lucide-react";

interface StudioCodeEditorProps {
  isDark: boolean;
  code: string;
  onChange: (code: string) => void;
  files?: string[];
  activeFile?: string;
  onSelectFile?: (file: string) => void;
  framework: "dwave" | "qiskit";
  onRun: () => void;
  isRunning?: boolean;
  terminalOutput?: string;
  showTerminal?: boolean;
  onToggleTerminal?: () => void;
  onToggleTheme?: () => void;
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
  };
}

export function StudioCodeEditor({
  isDark,
  code,
  onChange,
  files = [],
  activeFile,
  onSelectFile,
  framework,
  onRun,
  isRunning = false,
  terminalOutput,
  showTerminal,
  onToggleTerminal,
  onToggleTheme,
  specs,
}: StudioCodeEditorProps) {
  // Internal state fallback if not controlled from parent
  const [internalShowTerminal, setInternalShowTerminal] = useState(false);

  const isTerminalOpen =
    showTerminal !== undefined ? showTerminal : internalShowTerminal;

  const handleToggleTerminal = () => {
    if (onToggleTerminal) {
      onToggleTerminal();
    } else {
      setInternalShowTerminal((prev) => !prev);
    }
  };

  const lineCount = code.split("\n").length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-text">
      {/* ── MAIN EDITOR CANVAS: LINE NUMBERS + CODE TEXTAREA ── */}
      <div className="flex-1 flex overflow-hidden relative font-mono text-xs">
        {/* Line Numbers */}
        <div
          className={`w-12 py-3 px-2 text-right shrink-0 select-none border-r ${
            isDark
              ? "bg-[#090A0D] border-white/[0.08] text-zinc-600"
              : "bg-[#F8FAFC] border-slate-200 text-slate-400"
          }`}
        >
          {Array.from({ length: Math.max(lineCount, 25) }, (_, i) => (
            <div key={i + 1} className="leading-5">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Content Input / View */}
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className={`flex-1 p-3 font-mono text-xs outline-none resize-none leading-5 whitespace-pre overflow-auto tab-4 transition-colors ${
            isDark
              ? "bg-[#090A0D] text-zinc-200 selection:bg-sky-500/30"
              : "bg-[#FAFBFC] text-[#172033] selection:bg-sky-500/20"
          }`}
          style={{ tabSize: 4 }}
        />
      </div>

      {/* ── COLLAPSIBLE STATUS BAR & CONSOLE (Specs on left, Show console button on right) ── */}
      <div
        className={`border-t shrink-0 flex flex-col transition-all duration-150 ${
          isTerminalOpen ? "h-36" : "h-7"
        } ${
          isDark
            ? "bg-[#090A0D] border-white/[0.08]"
            : "bg-[#090D14] text-slate-100 border-[#1E293B]"
        }`}
      >
        <div
          className={`h-7 px-3 flex items-center justify-between select-none text-xs font-mono transition-colors ${
            isTerminalOpen ? "border-b border-white/[0.05]" : ""
          } ${
            isDark
              ? "text-zinc-400"
              : "text-slate-400"
          }`}
        >
          {/* Left: Change Theme Button + Full QUANTUM GURU Text */}
          <div className="flex items-center space-x-2">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className={`p-1 rounded-md transition-colors flex items-center justify-center cursor-pointer ${
                  isDark
                    ? "hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200"
                    : "hover:bg-slate-200/60 text-slate-400 hover:text-slate-700"
                }`}
                title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
              >
                {isDark ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-sky-500" />
                )}
              </button>
            )}
            <span className="text-[11px] font-bold tracking-wider font-mono uppercase text-zinc-300 dark:text-zinc-200 select-none">
              QUANTUM GURU
            </span>
          </div>

          {/* Right-aligned: 1. Project Telemetry details + 2. Console Toggle */}
          <div className="flex items-center space-x-3.5 text-[11px] font-mono">
            {/* 1. Project telemetry sort of details */}
            <div className="flex items-center space-x-2 text-zinc-400">
              {framework === "qiskit" ? (
                <>
                  <span>
                    Qubits: <strong className="text-zinc-200">{specs?.qubits ?? 3}</strong>
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span>
                    Depth: <strong className="text-sky-400">{specs?.depth ?? 8}</strong>
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span>
                    Fidelity: <strong className="text-emerald-400">{(specs?.fidelity ?? 99.8).toFixed(1)}%</strong>
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span>
                    Shots: <strong className="text-amber-400">{specs?.shots ?? 4096}</strong>
                  </span>
                </>
              ) : (
                <>
                  <span>
                    Cost: <strong className="text-zinc-200">${Number((specs?.cost ?? 14).toFixed(1))}/${Number((specs?.maxCost ?? 18).toFixed(1))}</strong>
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span>
                    Score: <strong className="text-emerald-400">{(specs?.score ?? 18.5).toFixed(1)}</strong>
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span>
                    Energy: <strong className="text-amber-400">{(specs?.energy ?? -62.2).toFixed(1)}</strong>
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-emerald-400 font-medium">
                    {specs?.feasible ?? true ? "100% Feasible" : "Infeasible"}
                  </span>
                </>
              )}
            </div>

            <span className="text-zinc-700 select-none">|</span>

            {/* 2. Console Toggle Button */}
            <button
              type="button"
              onClick={handleToggleTerminal}
              className={`flex items-center space-x-1 text-[10px] transition-colors py-0.5 px-2 rounded hover:bg-white/[0.06] cursor-pointer ${
                isDark ? "text-zinc-400 hover:text-zinc-200" : "text-slate-400 hover:text-slate-200"
              }`}
              title={isTerminalOpen ? "Close Console" : "Open Console"}
            >
              <span>Console</span>
              {isTerminalOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Console Content */}
        {isTerminalOpen && (
          <div className="flex-1 p-3 font-mono text-[11px] overflow-auto text-emerald-400/90 whitespace-pre-wrap leading-relaxed select-text">
            {terminalOutput ||
              `$ Ready. Click "${
                framework === "dwave" ? "Recompile QUBO" : "Run Circuit"
              }" in the top toolbar to execute.`}
          </div>
        )}
      </div>
    </div>
  );
}
