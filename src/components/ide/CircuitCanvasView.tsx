"use client";

import React, { useState, useMemo } from "react";
import {
  Layers,
  Activity,
  Sparkles,
  Cpu,
  Terminal,
  Copy,
  Check,
  Plus,
  X,
  Trash2,
  ChevronDown,
  ArrowRight,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface CircuitCanvasViewProps {
  isDark: boolean;
  circuitGates?: any[];
  circuitAscii?: string;
  qubitCount?: number;
  circuitDepth?: number;
  onUpdateQubitCount?: (count: number) => void;
  onAddGate?: (gate: string, qubit: number, targetQubit?: number, step?: number) => void;
  onRemoveGate?: (gateIndex: number) => void;
}

export function CircuitCanvasView({
  isDark,
  circuitGates = [],
  circuitAscii = "",
  qubitCount = 1,
  circuitDepth = 1,
  onUpdateQubitCount,
  onAddGate,
  onRemoveGate,
}: CircuitCanvasViewProps) {
  const [copied, setCopied] = useState(false);
  const [activeSubView, setActiveSubView] = useState<"visual" | "ascii">("visual");

  // Slot modal state: { qubit: number; step: number } | null
  const [selectedSlot, setSelectedSlot] = useState<{ qubit: number; step: number } | null>(null);
  const [selectedTwoQubitGate, setSelectedTwoQubitGate] = useState<string | null>(null);
  const [extraSteps, setExtraSteps] = useState<number>(2);

  const nQubits = Math.min(30, Math.max(1, qubitCount || 1));
  const isCompact = nQubits > 10;

  const handleCopyAscii = () => {
    if (circuitAscii && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(circuitAscii);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Calculate dynamic steps grid
  const { maxStep, grid, gateIndexMap } = useMemo(() => {
    let highestStep = 3;
    const gIndexMap: Record<string, number> = {};

    circuitGates.forEach((g, idx) => {
      const s = g.step ?? idx;
      if (s > highestStep) highestStep = s;
      const q = g.qubit ?? (g.qubits ? g.qubits[0] : 0);
      gIndexMap[`${q}_${s}`] = idx;
    });

    const totalSteps = highestStep + 1 + extraSteps;
    // Create matrix: [qubits][steps]
    const matrix: any[][] = Array.from({ length: nQubits }, () =>
      Array.from({ length: totalSteps }, () => null)
    );

    // Populate matrix with gates
    circuitGates.forEach((g, idx) => {
      const q = g.qubit ?? (g.qubits ? g.qubits[0] : 0);
      const s = g.step ?? idx;
      const name = (g.name || "").toUpperCase();

      if (q < nQubits && s < totalSteps) {
        if (name === "CX" || name === "CNOT") {
          const ctrl = g.qubits ? g.qubits[0] : q;
          const tgt = g.qubits ? g.qubits[1] : q + 1;
          if (ctrl < nQubits && s < totalSteps) {
            matrix[ctrl][s] = { name: "CX-C", target: tgt, gateIdx: idx };
          }
          if (tgt < nQubits && s < totalSteps) {
            matrix[tgt][s] = { name: "CX-T", control: ctrl, gateIdx: idx };
          }
        } else if (name === "CZ") {
          const ctrl = g.qubits ? g.qubits[0] : q;
          const tgt = g.qubits ? g.qubits[1] : q + 1;
          if (ctrl < nQubits && s < totalSteps) {
            matrix[ctrl][s] = { name: "CZ-C", target: tgt, gateIdx: idx };
          }
          if (tgt < nQubits && s < totalSteps) {
            matrix[tgt][s] = { name: "CZ-T", control: ctrl, gateIdx: idx };
          }
        } else if (name === "SWAP") {
          const q1 = g.qubits ? g.qubits[0] : q;
          const q2 = g.qubits ? g.qubits[1] : q + 1;
          if (q1 < nQubits && s < totalSteps) {
            matrix[q1][s] = { name: "SWAP", target: q2, gateIdx: idx };
          }
          if (q2 < nQubits && s < totalSteps) {
            matrix[q2][s] = { name: "SWAP", control: q1, gateIdx: idx };
          }
        } else if (name === "MEASURE") {
          matrix[q][s] = { name: "M", gateIdx: idx };
        } else if (name === "BARRIER") {
          matrix[q][s] = { name: "B", gateIdx: idx };
        } else {
          matrix[q][s] = { name: name || "U", gateIdx: idx };
        }
      }
    });

    return { maxStep: totalSteps, grid: matrix, gateIndexMap: gIndexMap };
  }, [circuitGates, nQubits, extraSteps]);

  // Single Qubit Gates list for Square Modal
  const singleQubitGates = [
    { name: "H", label: "Hadamard", color: "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" },
    { name: "X", label: "Pauli-X (NOT)", color: "bg-rose-500/15 border-rose-500/40 text-rose-400" },
    { name: "Y", label: "Pauli-Y", color: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" },
    { name: "Z", label: "Pauli-Z", color: "bg-sky-500/15 border-sky-500/40 text-sky-400" },
    { name: "S", label: "Phase (S)", color: "bg-purple-500/15 border-purple-500/40 text-purple-400" },
    { name: "T", label: "Phase (T)", color: "bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-400" },
    { name: "RX", label: "Rx(π/2)", color: "bg-amber-500/15 border-amber-500/40 text-amber-400" },
    { name: "RY", label: "Ry(π/2)", color: "bg-amber-500/15 border-amber-500/40 text-amber-400" },
    { name: "RZ", label: "Rz(π/2)", color: "bg-amber-500/15 border-amber-500/40 text-amber-400" },
    { name: "M", label: "Measure", color: "bg-amber-500/20 border-amber-500/50 text-amber-400" },
  ];

  const twoQubitGates = [
    { name: "CX", label: "CNOT (CX)", color: "bg-sky-500/20 border-sky-500/40 text-sky-400" },
    { name: "CZ", label: "Controlled-Z", color: "bg-indigo-500/20 border-indigo-500/40 text-indigo-400" },
    { name: "SWAP", label: "Swap Qubits", color: "bg-rose-500/20 border-rose-500/40 text-rose-400" },
  ];

  const handleSelectSingleGate = (gateName: string) => {
    if (!selectedSlot) return;
    onAddGate?.(gateName, selectedSlot.qubit, undefined, selectedSlot.step);
    setSelectedSlot(null);
    setSelectedTwoQubitGate(null);
  };

  const handleSelectTwoQubitGateTarget = (targetQubit: number) => {
    if (!selectedSlot || !selectedTwoQubitGate) return;
    onAddGate?.(selectedTwoQubitGate, selectedSlot.qubit, targetQubit, selectedSlot.step);
    setSelectedSlot(null);
    setSelectedTwoQubitGate(null);
  };

  return (
    <div className="flex-1 p-5 overflow-auto space-y-4 font-sans max-w-6xl mx-auto">
      {/* ── HEADER TOOLBAR (Title + Qubit Count Input + Step Counter + View Toggle) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs pb-1 border-b border-white/[0.08]">
        {/* Left: Title + Target Chip */}
        <div className="flex items-center space-x-2.5">
          <span
            className={`font-bold font-sans text-sm tracking-tight ${
              isDark ? "text-zinc-100" : "text-slate-900"
            }`}
          >
            Quantum Circuit Schematic
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            Aer QPU Simulator
          </span>
        </div>

        {/* Right: Qubit Count Input + Gate Depth + Subview Switcher */}
        <div className="flex items-center space-x-3 text-[11px] font-mono">
          {/* Qubit Count Interactive Input Field */}
          <div
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-md border transition-all ${
              isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-slate-50 border-slate-200"
            }`}
          >
            <span className={isDark ? "text-zinc-400" : "text-slate-600"}>Qubits:</span>
            <input
              type="number"
              min={1}
              max={30}
              value={nQubits}
              onChange={(e) => {
                const val = Math.min(30, Math.max(1, parseInt(e.target.value) || 1));
                onUpdateQubitCount?.(val);
              }}
              className={`w-11 px-1 py-0.5 rounded border text-center font-mono font-bold text-xs outline-none transition-colors ${
                isDark
                  ? "bg-black/40 border-white/[0.12] text-sky-400 focus:border-sky-500"
                  : "bg-white border-slate-300 text-sky-700 focus:border-sky-500"
              }`}
              title="Adjust circuit qubit count (1 to 30 qubits)"
            />
            <span className="text-[10px] text-zinc-500">/ 30</span>
          </div>

          <div className="flex items-center space-x-2 text-zinc-400 hidden sm:flex">
            <span>·</span>
            <span>
              Depth:{" "}
              <strong className={isDark ? "text-sky-400" : "text-sky-700"}>
                {circuitDepth || maxStep}
              </strong>
            </span>
          </div>

          {/* Subview switcher (Visual Wires vs Qiskit ASCII) */}
          {circuitAscii && (
            <div
              className={`flex items-center p-0.5 rounded border text-[10px] ${
                isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-slate-100 border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveSubView("visual")}
                className={`px-2 py-0.5 rounded cursor-pointer font-medium transition-colors ${
                  activeSubView === "visual"
                    ? isDark
                      ? "bg-white/[0.12] text-white"
                      : "bg-white text-sky-700 shadow-xs"
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
                    ? isDark
                      ? "bg-white/[0.12] text-white"
                      : "bg-white text-sky-700 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Qiskit ASCII
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN VIEWPORT ── */}
      {activeSubView === "visual" ? (
        <div
          className={`rounded-2xl border relative overflow-hidden font-sans transition-colors ${
            isDark ? "bg-[#0B0C10] border-white/[0.08]" : "bg-white border-[#D5DDE7] shadow-sm"
          }`}
        >
          {/* Top Step-Column Index Bar */}
          <div className="flex items-center border-b border-white/[0.06] bg-black/20 text-[10px] font-mono text-zinc-500 overflow-x-auto custom-scrollbar">
            <div className="w-24 shrink-0 px-3 py-1.5 font-semibold text-zinc-400 border-r border-white/[0.06]">
              Wire Register
            </div>
            <div className="flex items-center pl-4 py-1.5 space-x-6 shrink-0">
              {Array.from({ length: maxStep }).map((_, stepIdx) => (
                <div key={stepIdx} className="w-10 text-center font-mono">
                  s{stepIdx}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setExtraSteps((prev) => prev + 2)}
                className="flex items-center space-x-1 px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-sky-400 border border-white/[0.08] transition-all cursor-pointer text-[10px]"
                title="Add 2 more parallel time-step columns"
              >
                <Plus className="w-3 h-3" />
                <span>Step</span>
              </button>
            </div>
          </div>

          {/* Scrollable Wires Area (Virtual-friendly, scales up to 30 Qubits) */}
          <div
            className="overflow-x-auto overflow-y-auto max-h-[58vh] custom-scrollbar p-4 space-y-3"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: isDark
                ? "rgba(255, 255, 255, 0.2) transparent"
                : "rgba(100, 116, 139, 0.4) transparent",
            }}
          >
            {grid.map((wireSteps, qIdx) => (
              <div
                key={qIdx}
                style={{
                  contentVisibility: "auto",
                  containIntrinsicSize: isCompact ? "36px" : "48px",
                }}
                className={`flex items-center relative group ${isCompact ? "h-9" : "h-11"}`}
              >
                {/* Sticky Left Wire Label */}
                <div
                  className={`w-24 shrink-0 font-mono text-xs font-semibold flex items-center justify-between pr-3 select-none sticky left-0 z-20 ${
                    isDark ? "bg-[#0B0C10] text-zinc-300" : "bg-white text-slate-800"
                  }`}
                >
                  <span className="truncate">q[{qIdx}]</span>
                  <span className="text-[10px] text-zinc-500 font-normal">|0⟩</span>
                </div>

                {/* Wire Backbone Line */}
                <div
                  className={`absolute left-24 right-0 h-[1.5px] z-0 ${
                    isDark ? "bg-zinc-800" : "bg-[#C4CEDB]"
                  }`}
                />

                {/* Gates and Slots Grid on Wire */}
                <div className="flex items-center space-x-6 relative z-10 pl-4 shrink-0">
                  {wireSteps.map((gate, stepIdx) => (
                    <div
                      key={stepIdx}
                      className="w-10 flex items-center justify-center shrink-0 relative"
                    >
                      {gate ? (
                        /* Render Placed Gate */
                        <div className="relative group/gate">
                          {gate.name === "B" ? (
                            <div
                              className={`w-0.5 ${
                                isCompact ? "h-8" : "h-10"
                              } border-r-2 border-dashed ${
                                isDark ? "border-zinc-700" : "border-slate-400"
                              }`}
                              title="Barrier"
                            />
                          ) : gate.name === "CX-C" || gate.name === "CZ-C" ? (
                            <div
                              className="w-4 h-4 rounded-full bg-sky-500 shadow-sm cursor-pointer hover:scale-125 transition-transform"
                              title={`Control (Target: q[${gate.target}])`}
                            />
                          ) : gate.name === "CX-T" ? (
                            <div
                              className="w-6 h-6 rounded-full border-2 border-sky-500 bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono text-xs font-bold shadow-sm"
                              title={`Target (Control: q[${gate.control}])`}
                            >
                              ⊕
                            </div>
                          ) : gate.name === "CZ-T" ? (
                            <div
                              className="w-6 h-6 rounded-full border-2 border-indigo-500 bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono text-xs font-bold shadow-sm"
                              title={`Target (Control: q[${gate.control}])`}
                            >
                              Z
                            </div>
                          ) : gate.name === "SWAP" ? (
                            <div
                              className="w-5 h-5 text-rose-400 font-bold font-mono flex items-center justify-center text-xs"
                              title="SWAP Gate"
                            >
                              ✕
                            </div>
                          ) : (
                            <div
                              className={`px-2.5 py-1 rounded border flex items-center justify-center font-mono font-bold shadow-xs transition-transform hover:scale-105 cursor-pointer ${
                                isCompact ? "text-[10px] h-7 min-w-[32px]" : "text-[11px] h-8 min-w-[36px]"
                              } ${
                                gate.name === "M"
                                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                                  : gate.name === "X"
                                  ? "bg-rose-500/15 border-rose-500/40 text-rose-400"
                                  : gate.name === "H"
                                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                                  : gate.name === "Z"
                                  ? "bg-sky-500/15 border-sky-500/40 text-sky-400"
                                  : isDark
                                  ? "bg-zinc-800/95 border-zinc-700 text-zinc-100"
                                  : "bg-slate-50 border-slate-300 text-slate-800"
                              }`}
                            >
                              {gate.name}
                            </div>
                          )}

                          {/* Delete Gate Action Button on Hover */}
                          {gate.gateIdx !== undefined && onRemoveGate && (
                            <button
                              type="button"
                              onClick={() => onRemoveGate(gate.gateIdx)}
                              className="absolute -top-2.5 -right-2.5 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[9px] opacity-0 group-hover/gate:opacity-100 transition-opacity cursor-pointer shadow-xs z-30"
                              title="Delete this gate"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Empty Slot Box: Click to open Square Gate Modal */
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSlot({ qubit: qIdx, step: stepIdx });
                            setSelectedTwoQubitGate(null);
                          }}
                          className={`w-8 rounded border border-dashed flex items-center justify-center transition-all cursor-pointer ${
                            isCompact ? "h-6 text-[10px]" : "h-7 text-xs"
                          } ${
                            isDark
                              ? "border-white/[0.1] text-zinc-600 hover:border-sky-500 hover:text-sky-400 hover:bg-sky-500/10"
                              : "border-slate-300 text-slate-400 hover:border-sky-600 hover:text-sky-700 hover:bg-sky-50"
                          }`}
                          title={`Click to place gate on q[${qIdx}] at step ${stepIdx}`}
                        >
                          <Plus className="w-3 h-3 stroke-[2.5]" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Qiskit ASCII Canvas View */
        <div
          className={`rounded-2xl border p-6 relative font-mono transition-colors ${
            isDark ? "bg-[#090A0D] border-white/[0.08]" : "bg-slate-900 border-slate-800 text-emerald-400"
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4 text-xs text-zinc-400">
            <span>qiskit.visualization.circuit_drawer</span>
            <button
              onClick={handleCopyAscii}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 cursor-pointer text-[10px] transition-colors"
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

      {/* ── SQUARE GATE SELECTOR MODAL / POPOVER ── */}
      {selectedSlot && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className={`w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden font-sans transition-all animate-in zoom-in-95 duration-150 ${
              isDark
                ? "bg-[#0E0F14] border-white/[0.12] text-zinc-100 shadow-black/90"
                : "bg-white border-slate-200 text-slate-900 shadow-xl"
            }`}
          >
            {/* Modal Header */}
            <div
              className={`px-4.5 py-3 border-b flex items-center justify-between shrink-0 ${
                isDark ? "border-white/[0.08] bg-[#12131A]" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-6 h-6 rounded-md bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/25">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs">
                    Place Gate · Wire q[{selectedSlot.qubit}]
                  </h4>
                  <p className={`text-[10px] ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                    Time Slot: Step {selectedSlot.step}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSlot(null);
                  setSelectedTwoQubitGate(null);
                }}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  isDark
                    ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Single vs Two-Qubit selection */}
            <div className="p-4 space-y-4 font-mono">
              {!selectedTwoQubitGate ? (
                <>
                  {/* Section 1: Single Qubit Gates */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block">
                      Single-Qubit Gates
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {singleQubitGates.map((gate) => (
                        <button
                          key={gate.name}
                          type="button"
                          onClick={() => handleSelectSingleGate(gate.name)}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-0.5 transition-all hover:scale-105 cursor-pointer shadow-xs ${gate.color}`}
                        >
                          <span className="font-bold text-sm">{gate.name}</span>
                          <span className="text-[9px] opacity-75 font-sans truncate w-full text-center">
                            {gate.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Two-Qubit Entangling Gates */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block">
                      Two-Qubit Gates (Control → Target)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {twoQubitGates.map((gate) => (
                        <button
                          key={gate.name}
                          type="button"
                          onClick={() => setSelectedTwoQubitGate(gate.name)}
                          className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-0.5 transition-all hover:scale-105 cursor-pointer shadow-xs ${gate.color}`}
                        >
                          <span className="font-bold text-sm">{gate.name}</span>
                          <span className="text-[9px] opacity-75 font-sans truncate w-full text-center">
                            {gate.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Two-Qubit Target Selector */
                <div className="space-y-3 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <span className="text-xs font-semibold text-sky-400">
                      Select Target Qubit for {selectedTwoQubitGate}:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedTwoQubitGate(null)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                    >
                      Back
                    </button>
                  </div>

                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    Control qubit is fixed to <strong className="text-sky-400">q[{selectedSlot.qubit}]</strong>.
                    Choose the target qubit wire:
                  </p>

                  <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                    {Array.from({ length: nQubits }).map((_, targetQ) => {
                      const isSelf = targetQ === selectedSlot.qubit;
                      return (
                        <button
                          key={targetQ}
                          disabled={isSelf}
                          type="button"
                          onClick={() => handleSelectTwoQubitGateTarget(targetQ)}
                          className={`p-2 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                            isSelf
                              ? "opacity-25 border-zinc-800 text-zinc-600 cursor-not-allowed"
                              : isDark
                              ? "bg-white/[0.05] border-white/[0.1] text-zinc-200 hover:bg-sky-500/20 hover:border-sky-500 hover:text-white"
                              : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-sky-100 hover:border-sky-500 hover:text-sky-800"
                          }`}
                        >
                          q[{targetQ}]
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className={`px-4 py-2.5 border-t flex items-center justify-between text-[11px] font-mono shrink-0 ${
                isDark ? "border-white/[0.08] bg-[#12131A] text-zinc-400" : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              <span>Updates main.py in Monaco editor</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedSlot(null);
                  setSelectedTwoQubitGate(null);
                }}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CIRCUIT TELEMETRY FOOTER ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        <div
          className={`p-3 rounded-xl border ${
            isDark ? "bg-[#0E0F13] border-white/[0.06] text-zinc-400" : "bg-white border-slate-200 text-slate-600 shadow-xs"
          }`}
        >
          <span className="block text-[10px] uppercase text-zinc-500">Simulation Fidelity</span>
          <span className="text-emerald-500 font-semibold text-sm">99.8% (Aer Simulator)</span>
        </div>
        <div
          className={`p-3 rounded-xl border ${
            isDark ? "bg-[#0E0F13] border-white/[0.06] text-zinc-400" : "bg-white border-slate-200 text-slate-600 shadow-xs"
          }`}
        >
          <span className="block text-[10px] uppercase text-zinc-500">Target Basis Gates</span>
          <span className="text-sky-400 font-semibold text-xs">CX, ID, RZ, SX, X</span>
        </div>
        <div
          className={`p-3 rounded-xl border ${
            isDark ? "bg-[#0E0F13] border-white/[0.06] text-zinc-400" : "bg-white border-slate-200 text-slate-600 shadow-xs"
          }`}
        >
          <span className="block text-[10px] uppercase text-zinc-500">Execution Latency</span>
          <span className="text-zinc-200 font-semibold text-sm">~0.2 ms</span>
        </div>
      </div>
    </div>
  );
}
