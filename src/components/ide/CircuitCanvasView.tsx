"use client";

import React, { useState } from "react";
import { Layers, Activity, Sparkles, Cpu, Terminal, Copy, Check } from "lucide-react";

interface CircuitCanvasViewProps {
  isDark: boolean;
  circuitGates?: any[];
  circuitAscii?: string;
  qubitCount?: number;
  circuitDepth?: number;
}

export function CircuitCanvasView({
  isDark,
  circuitGates = [],
  circuitAscii = "",
  qubitCount = 1,
  circuitDepth = 1,
}: CircuitCanvasViewProps) {
  const [copied, setCopied] = useState(false);
  const [activeSubView, setActiveSubView] = useState<"visual" | "ascii">("visual");

  const handleCopyAscii = () => {
    if (circuitAscii && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(circuitAscii);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Generate dynamic wires per qubit based on actual executed circuit gates
  const wires = React.useMemo(() => {
    const n = Math.max(qubitCount || 1, 1);
    if (!circuitGates || circuitGates.length === 0) {
      // Default initial layout
      if (n === 1) {
        return [["X", "M"]];
      }
      return [
        ["H", "CX-C", "M"],
        ["I", "CX-T", "M"],
      ];
    }

    // Group gates by qubit index
    const result: string[][] = Array.from({ length: n }, () => []);
    const sorted = [...circuitGates].sort((a, b) => (a.step ?? 0) - (b.step ?? 0));

    sorted.forEach((g) => {
      const q = g.qubit ?? (g.qubits ? g.qubits[0] : 0);
      const name = (g.name || "").toUpperCase();

      if (q < n) {
        if (name === "CX" || name === "CNOT") {
          const ctrl = g.qubits ? g.qubits[0] : q;
          const tgt = g.qubits ? g.qubits[1] : q + 1;
          if (q === ctrl) {
            result[q].push("CX-C");
          } else {
            result[q].push("CX-T");
          }
        } else if (name === "MEASURE") {
          result[q].push("M");
        } else if (name === "BARRIER") {
          result[q].push("B");
        } else {
          result[q].push(name || "U");
        }
      }
    });

    // Ensure all wires have at least 1 element
    for (let i = 0; i < n; i++) {
      if (result[i].length === 0) {
        result[i].push("I");
      }
    }

    return result;
  }, [circuitGates, qubitCount]);

  return (
    <div className="flex-1 p-6 overflow-auto space-y-4 font-sans max-w-5xl mx-auto">
      {/* Header Metadata Banner */}
      <div className="flex items-center justify-between font-mono text-xs">
        <div className="flex items-center space-x-2.5">
          <span
            className={`font-semibold font-sans text-sm ${
              isDark ? "text-zinc-100" : "text-slate-900"
            }`}
          >
            Quantum Circuit Schematic
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 border border-sky-500/20 font-medium">
            Aer QPU Simulator
          </span>
        </div>

        {/* Right side stats + View Toggle */}
        <div className="flex items-center space-x-3 text-[11px] font-mono">
          <div className="flex items-center space-x-2 text-zinc-400">
            <span><strong className={isDark ? "text-zinc-200" : "text-slate-800"}>{qubitCount}</strong> Qubit{qubitCount !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span><strong className={isDark ? "text-sky-400" : "text-sky-700"}>{circuitDepth}</strong> Gate Depth</span>
          </div>

          {/* Subview switcher (Visual vs ASCII) */}
          {circuitAscii && (
            <div className={`flex items-center p-0.5 rounded border text-[10px] ${
              isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-slate-100 border-slate-200"
            }`}>
              <button
                type="button"
                onClick={() => setActiveSubView("visual")}
                className={`px-2 py-0.5 rounded cursor-pointer font-medium transition-colors ${
                  activeSubView === "visual"
                    ? isDark ? "bg-white/[0.12] text-white" : "bg-white text-sky-700 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Visual Wires
              </button>
              <button
                type="button"
                onClick={() => setActiveSubView("ascii")}
                className={`px-2 py-0.5 rounded cursor-pointer font-medium transition-colors ${
                  activeSubView === "ascii"
                    ? isDark ? "bg-white/[0.12] text-white" : "bg-white text-sky-700 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Qiskit ASCII
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Viewport: Either Visual Wire Diagram or ASCII Canvas */}
      {activeSubView === "visual" ? (
        <div
          className={`rounded-xl border p-8 space-y-8 relative overflow-hidden transition-colors ${
            isDark
              ? "bg-[#0B0C10] border-white/[0.08]"
              : "bg-white border-[#D5DDE7] shadow-sm"
          }`}
        >
          {wires.map((wire, qIdx) => (
            <div key={qIdx} className="flex items-center relative">
              {/* Qubit Label */}
              <div className="w-16 font-mono text-xs text-zinc-400 shrink-0 font-medium flex items-center space-x-1">
                <span className={isDark ? "text-zinc-300" : "text-slate-800"}>q[{qIdx}]</span>
                <span className="text-[10px] text-zinc-500">|0⟩</span>
              </div>

              {/* Wire Line */}
              <div
                className={`absolute left-16 right-0 h-[1px] ${
                  isDark ? "bg-zinc-800" : "bg-[#C4CEDB]"
                }`}
              />

              {/* Gates on Wire */}
              <div className="flex-1 flex justify-start items-center space-x-8 relative z-10 pl-6 overflow-x-auto custom-scrollbar py-1">
                {wire.map((gate, gIdx) => (
                  <div
                    key={gIdx}
                    className="w-12 h-10 flex items-center justify-center shrink-0"
                  >
                    {gate === "B" ? (
                      <div
                        className={`w-0.5 h-10 border-r-2 border-dashed ${
                          isDark ? "border-zinc-700" : "border-slate-400"
                        }`}
                        title="Barrier"
                      />
                    ) : gate === "CX-C" ? (
                      <div
                        className="w-3.5 h-3.5 rounded-full bg-sky-500 shadow-sm"
                        title="CNOT Control"
                      />
                    ) : gate === "CX-T" ? (
                      <div
                        className="w-6 h-6 rounded-full border border-sky-500 bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono text-xs font-bold"
                        title="CNOT Target"
                      >
                        ⊕
                      </div>
                    ) : gate === "I" ? null : (
                      <div
                        className={`px-3 py-1.5 rounded border flex items-center justify-center font-mono text-[11px] font-bold shadow-xs transition-transform hover:scale-105 ${
                          gate === "M"
                            ? "bg-amber-500/10 border-amber-500/40 text-amber-500"
                            : gate === "X"
                            ? "bg-rose-500/10 border-rose-500/40 text-rose-500"
                            : gate === "H"
                            ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-500"
                            : isDark
                            ? "bg-zinc-800/90 border-zinc-700 text-zinc-200"
                            : "bg-slate-50 border-slate-300 text-slate-800"
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
      ) : (
        /* Qiskit ASCII Canvas View */
        <div
          className={`rounded-xl border p-6 relative font-mono transition-colors ${
            isDark
              ? "bg-[#090A0D] border-white/[0.08]"
              : "bg-slate-900 border-slate-800 text-emerald-400"
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4 text-xs text-zinc-400">
            <span>qiskit.visualization.circuit_drawer</span>
            <button
              onClick={handleCopyAscii}
              className="flex items-center space-x-1 px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 cursor-pointer text-[10px]"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copied" : "Copy ASCII"}</span>
            </button>
          </div>

          <pre className="overflow-x-auto custom-scrollbar text-xs leading-relaxed text-sky-400 font-mono select-text py-2">
            {circuitAscii}
          </pre>
        </div>
      )}

      {/* Circuit Telemetry Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        <div
          className={`p-3 rounded-lg border ${
            isDark
              ? "bg-[#0E0F13] border-white/[0.06] text-zinc-400"
              : "bg-white border-slate-200 text-slate-600 shadow-xs"
          }`}
        >
          <span className="block text-[10px] uppercase text-zinc-500">
            Simulation Fidelity
          </span>
          <span className="text-emerald-500 font-semibold text-sm">99.8% (Aer Simulator)</span>
        </div>
        <div
          className={`p-3 rounded-lg border ${
            isDark
              ? "bg-[#0E0F13] border-white/[0.06] text-zinc-400"
              : "bg-white border-slate-200 text-slate-600 shadow-xs"
          }`}
        >
          <span className="block text-[10px] uppercase text-zinc-500">
            Target Basis Gates
          </span>
          <span className="text-sky-500 font-semibold text-sm">CX, ID, RZ, SX, X</span>
        </div>
        <div
          className={`p-3 rounded-lg border ${
            isDark
              ? "bg-[#0E0F13] border-white/[0.06] text-zinc-400"
              : "bg-white border-slate-200 text-slate-600 shadow-xs"
          }`}
        >
          <span className="block text-[10px] uppercase text-zinc-500">
            Execution Latency
          </span>
          <span className={isDark ? "text-zinc-200 font-semibold text-sm" : "text-slate-800 font-semibold text-sm"}>
            ~0.2 ms
          </span>
        </div>
      </div>
    </div>
  );
}
