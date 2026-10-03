"use client";

import React from "react";

interface StudioCodeEditorProps {
  isDark: boolean;
  code: string;
  onChange: (code: string) => void;
  files?: string[];
  activeFile?: string;
  onSelectFile?: (file: string) => void;
  framework: "dwave" | "qiskit";
  onRun?: () => void;
  isRunning?: boolean;
  terminalOutput?: string;
  showTerminal?: boolean;
  onToggleTerminal?: () => void;
  onToggleTheme?: () => void;
  specs?: any;
}

export function StudioCodeEditor({
  isDark,
  code,
  onChange,
}: StudioCodeEditorProps) {
  const lineCount = code.split("\n").length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-text">
      {/* ── MAIN EDITOR CANVAS: LINE NUMBERS + CODE TEXTAREA ── */}
      <div className="flex-1 flex overflow-hidden relative font-mono text-xs h-full">
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
    </div>
  );
}
