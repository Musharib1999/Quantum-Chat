"use client";

import React from "react";
import { Layers, Activity, Sparkles, Cpu } from "lucide-react";

interface CircuitCanvasViewProps {
  isDark: boolean;
  circuitGates?: any[];
  qubitCount?: number;
  circuitDepth?: number;
}

export function CircuitCanvasView({
  isDark,
  qubitCount = 3,
  circuitDepth = 8,
}: CircuitCanvasViewProps) {
  const wires = [
    ["Rx(\pi/3)", "B", "I", "I", "B", "CX-C", "H", "M"],
    ["I", "B", "H", "CX-C", "B", "CX-T", "I", "M"],
    ["I", "B", "I", "CX-T", "B", "I", "CX-T", "M"],
  ];

  return (
    <div className="flex-1 p-6 overflow-auto space-y-4 font-sans">
      <div className="flex items-center justify-between font-mono text-xs">
        <div className="flex items-center space-x-2">
          <span
            className={`font-semibold font-sans ${
              isDark ? "text-zinc-200" : "text-slate-900"
            }`}
          >
            Quantum Teleportation Circuit Schematic
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
            OpenQASM 3.0 Compatible
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] text-zinc-400">
          <span>{qubitCount} Qubits</span>
          <span>·</span>
          <span>{circuitDepth} Gate Depth</span>
          <span>·</span>
          <span>3 Classical Bits</span>
        </div>
      </div>

      <div
        className={`rounded-xl border p-8 space-y-8 relative overflow-hidden transition-colors ${
          isDark
            ? "bg-[#0B0C10] border-white/[0.08]"
            : "bg-white border-[#D5DDE7] shadow-sm"
        }`}
      >
        {wires.map((wire, qIdx) => (
          <div key={qIdx} className="flex items-center relative">
            <div className="w-16 font-mono text-xs text-zinc-400 shrink-0 font-medium flex items-center space-x-1">
              <span>q[{qIdx}]</span>
              <span className="text-[10px] text-zinc-500">|0⟩</span>
            </div>
            <div
              className={`absolute left-16 right-0 h-[1px] ${
                isDark ? "bg-zinc-800" : "bg-[#C4CEDB]"
              }`}
            />
            <div className="flex-1 flex justify-between items-center relative z-10 pl-4">
              {wire.map((gate, gIdx) => (
                <div
                  key={gIdx}
                  className="w-12 h-10 flex items-center justify-center"
                >
                  {gate === "B" ? (
                    <div
                      className={`w-0.5 h-10 border-r-2 border-dashed ${
                        isDark ? "border-zinc-700" : "border-slate-400"
                      }`}
                    />
                  ) : gate === "CX-C" ? (
                    <div className="w-3.5 h-3.5 rounded-full bg-sky-500 shadow-sm" />
                  ) : gate === "CX-T" ? (
                    <div className="w-6 h-6 rounded-full border border-sky-500 bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono text-xs font-bold">
                      ⊕
                    </div>
                  ) : gate === "I" ? null : (
                    <div
                      className={`px-2 py-1 rounded border flex items-center justify-center font-mono text-[11px] font-medium shadow-xs transition-transform hover:scale-105 ${
                        gate === "M"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                          : isDark
                          ? "bg-zinc-800/90 border-zinc-700 text-zinc-200"
                          : "bg-[#FAFBFC] border-[#D5DDE7] text-[#172033] shadow-xs"
                      }`}
                    >
                      {gate}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        <div
          className={`p-3 rounded-lg border ${
            isDark
              ? "bg-[#0E0F13] border-white/[0.06] text-zinc-400"
              : "bg-white border-[#D5DDE7] text-[#526174] shadow-sm"
          }`}
        >
          <span className="block text-[10px] uppercase text-zinc-500">
            Fidelity Benchmark
          </span>
          <span className="text-emerald-400 font-semibold text-sm">99.4% (Aer Ideal)</span>
        </div>
        <div
          className={`p-3 rounded-lg border ${
            isDark
              ? "bg-[#0E0F13] border-white/[0.06] text-zinc-400"
              : "bg-white border-[#D5DDE7] text-[#526174] shadow-sm"
          }`}
        >
          <span className="block text-[10px] uppercase text-zinc-500">
            Entanglement Witnesses
          </span>
          <span className="text-sky-400 font-semibold text-sm">Bell Pair |Phi^+angle</span>
        </div>
        <div
          className={`p-3 rounded-lg border ${
            isDark
              ? "bg-[#0E0F13] border-white/[0.06] text-zinc-400"
              : "bg-white border-[#D5DDE7] text-[#526174] shadow-sm"
          }`}
        >
          <span className="block text-[10px] uppercase text-zinc-500">
            Feed-Forward Delay
          </span>
          <span className="text-zinc-200 font-semibold text-sm">0 ns (Simulated)</span>
        </div>
      </div>
    </div>
  );
}
