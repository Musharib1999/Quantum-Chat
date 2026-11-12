"use client";

import React, { useState, useMemo, useCallback } from "react";
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
  Sliders,
} from "lucide-react";

interface CircuitCanvasViewProps {
  isDark: boolean;
  circuitGates?: any[];
  circuitAscii?: string;
  qubitCount?: number;
  circuitDepth?: number;
  latencyMs?: number;
  isResultsStale?: boolean;
  hasDynamicLoops?: boolean;
  onRunCircuit?: () => void;
  onUpdateQubitCount?: (count: number) => void;
  onAddGate?: (
    gate: string,
    qubit: number,
    targetQubit?: number,
    step?: number,
    angleExpr?: string,
    extraArgs?: { control2?: number; uTheta?: string; uPhi?: string; uLam?: string }
  ) => void;
  onRemoveGate?: (gateIndex: number) => void;
}

export function CircuitCanvasView({
  isDark,
  circuitGates = [],
  circuitAscii = "",
  qubitCount = 1,
  circuitDepth = 1,
  latencyMs = 0,
  isResultsStale = false,
  hasDynamicLoops = false,
  onRunCircuit,
  onUpdateQubitCount,
  onAddGate,
  onRemoveGate,
}: CircuitCanvasViewProps) {
  const [copied, setCopied] = useState(false);
  const [activeSubView, setActiveSubView] = useState<"visual" | "ascii">("visual");

  // Slot modal state: { qubit: number; step: number } | null
  const [selectedSlot, setSelectedSlot] = useState<{ qubit: number; step: number } | null>(null);
  const [selectedTwoQubitGate, setSelectedTwoQubitGate] = useState<string | null>(null);
  const [selectedMultiQubitGate, setSelectedMultiQubitGate] = useState<string | null>(null);
  const [ccxControl2, setCcxControl2] = useState<number | null>(null);
  const [showUniversalModal, setShowUniversalModal] = useState<boolean>(false);

  // Parameter states
  const [rotationAngleExpr, setRotationAngleExpr] = useState<string>("np.pi / 2");
  const [uTheta, setUTheta] = useState<string>("np.pi / 2");
  const [uPhi, setUPhi] = useState<string>("0.0");
  const [uLam, setULam] = useState<string>("np.pi");

  const [extraSteps, setExtraSteps] = useState<number>(2);

  const nQubits = Math.min(30, Math.max(1, qubitCount || 1));
  const isCompact = nQubits > 10;

  // Local state for qubit count to prevent mid-typing drops (B1 fix)
  const [localQubits, setLocalQubits] = useState<string>(String(nQubits));

  React.useEffect(() => {
    setLocalQubits(String(nQubits));
  }, [nQubits]);

  const commitQubitCount = () => {
    const parsed = parseInt(localQubits, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(30, Math.max(1, parsed));
      setLocalQubits(String(clamped));
      if (clamped !== nQubits && onUpdateQubitCount) {
        onUpdateQubitCount(clamped);
      }
    } else {
      setLocalQubits(String(nQubits));
    }
  };

  const handleCopyAscii = () => {
    if (circuitAscii && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(circuitAscii);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeModal = () => {
    setSelectedSlot(null);
    setSelectedTwoQubitGate(null);
    setSelectedMultiQubitGate(null);
    setCcxControl2(null);
    setShowUniversalModal(false);
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
          const allQ = [ctrl, tgt];
          if (ctrl < nQubits && s < totalSteps) {
            matrix[ctrl][s] = { name: "CX-C", target: tgt, allQubits: allQ, gateIdx: idx };
          }
          if (tgt < nQubits && s < totalSteps) {
            matrix[tgt][s] = { name: "CX-T", control: ctrl, allQubits: allQ, gateIdx: idx };
          }
        } else if (name === "CZ") {
          const ctrl = g.qubits ? g.qubits[0] : q;
          const tgt = g.qubits ? g.qubits[1] : q + 1;
          const allQ = [ctrl, tgt];
          if (ctrl < nQubits && s < totalSteps) {
            matrix[ctrl][s] = { name: "CZ-C", target: tgt, allQubits: allQ, gateIdx: idx };
          }
          if (tgt < nQubits && s < totalSteps) {
            matrix[tgt][s] = { name: "CZ-T", control: ctrl, allQubits: allQ, gateIdx: idx };
          }
        } else if (name === "CH") {
          const ctrl = g.qubits ? g.qubits[0] : q;
          const tgt = g.qubits ? g.qubits[1] : q + 1;
          const allQ = [ctrl, tgt];
          if (ctrl < nQubits && s < totalSteps) {
            matrix[ctrl][s] = { name: "CH-C", target: tgt, allQubits: allQ, gateIdx: idx };
          }
          if (tgt < nQubits && s < totalSteps) {
            matrix[tgt][s] = { name: "CH-T", control: ctrl, allQubits: allQ, gateIdx: idx };
          }
        } else if (name === "CP") {
          const ctrl = g.qubits ? g.qubits[0] : q;
          const tgt = g.qubits ? g.qubits[1] : q + 1;
          const allQ = [ctrl, tgt];
          if (ctrl < nQubits && s < totalSteps) {
            matrix[ctrl][s] = { name: "CP-C", target: tgt, params: g.params, allQubits: allQ, gateIdx: idx };
          }
          if (tgt < nQubits && s < totalSteps) {
            matrix[tgt][s] = { name: "CP-T", control: ctrl, params: g.params, allQubits: allQ, gateIdx: idx };
          }
        } else if (name === "CRX" || name === "CRY" || name === "CRZ") {
          const ctrl = g.qubits ? g.qubits[0] : q;
          const tgt = g.qubits ? g.qubits[1] : q + 1;
          const allQ = [ctrl, tgt];
          if (ctrl < nQubits && s < totalSteps) {
            matrix[ctrl][s] = { name: `${name}-C`, target: tgt, params: g.params, allQubits: allQ, gateIdx: idx };
          }
          if (tgt < nQubits && s < totalSteps) {
            matrix[tgt][s] = { name: `${name}-T`, control: ctrl, params: g.params, allQubits: allQ, gateIdx: idx };
          }
        } else if (name === "RZZ") {
          const q1 = g.qubits ? g.qubits[0] : q;
          const q2 = g.qubits ? g.qubits[1] : q + 1;
          const allQ = [q1, q2];
          if (q1 < nQubits && s < totalSteps) {
            matrix[q1][s] = { name: "RZZ", target: q2, params: g.params, allQubits: allQ, gateIdx: idx };
          }
          if (q2 < nQubits && s < totalSteps) {
            matrix[q2][s] = { name: "RZZ", control: q1, params: g.params, allQubits: allQ, gateIdx: idx };
          }
        } else if (name === "CCX" || name === "TOFFOLI") {
          const c1 = g.qubits ? g.qubits[0] : q;
          const c2 = g.qubits ? g.qubits[1] : q + 1;
          const tgt = g.qubits ? g.qubits[2] : q + 2;
          const allQ = [c1, c2, tgt];
          if (c1 < nQubits && s < totalSteps) {
            matrix[c1][s] = { name: "CCX-C", target: tgt, otherCtrl: c2, allQubits: allQ, gateIdx: idx };
          }
          if (c2 < nQubits && s < totalSteps) {
            matrix[c2][s] = { name: "CCX-C", target: tgt, otherCtrl: c1, allQubits: allQ, gateIdx: idx };
          }
          if (tgt < nQubits && s < totalSteps) {
            matrix[tgt][s] = { name: "CCX-T", control: c1, control2: c2, allQubits: allQ, gateIdx: idx };
          }
        } else if (name === "SWAP") {
          const q1 = g.qubits ? g.qubits[0] : q;
          const q2 = g.qubits ? g.qubits[1] : q + 1;
          const allQ = [q1, q2];
          if (q1 < nQubits && s < totalSteps) {
            matrix[q1][s] = { name: "SWAP", target: q2, allQubits: allQ, gateIdx: idx };
          }
          if (q2 < nQubits && s < totalSteps) {
            matrix[q2][s] = { name: "SWAP", control: q1, allQubits: allQ, gateIdx: idx };
          }
        } else if (name === "MEASURE") {
          matrix[q][s] = { name: "M", gateIdx: idx };
        } else if (name === "RESET") {
          matrix[q][s] = { name: "RESET", gateIdx: idx };
        } else if (name === "BARRIER") {
          matrix[q][s] = { name: "B", gateIdx: idx };
        } else if (name === "SAVE_STATEVECTOR" || name.startsWith("SAVE_") || name === "|Ψ⟩" || name === "|PSI>") {
          matrix[q][s] = { name: "|ψ⟩", isProbe: true, gateIdx: idx };
        } else if (name === "SXDG" || name === "SX†") {
          matrix[q][s] = { name: "SX†", gateIdx: idx };
        } else {
          matrix[q][s] = { name: name || "U", params: g.params, gateIdx: idx };
        }
      }
    });

    return { maxStep: totalSteps, grid: matrix, gateIndexMap: gIndexMap };
  }, [circuitGates, nQubits, extraSteps]);

  // Helper to find the earliest non-colliding time step where all specified wires are free (B4 fix)
  const getFirstFreeStepForWires = useCallback(
    (wires: number[], startStep: number): number => {
      let s = startStep;
      while (s < maxStep + 20) {
        const hasCollision = wires.some((w) => grid[w]?.[s] !== null && grid[w]?.[s] !== undefined);
        if (!hasCollision) return s;
        s++;
      }
      return s;
    },
    [grid, maxStep]
  );

  // Single Qubit Gates list for Square Modal
  const singleQubitGates = [
    { name: "H", label: "Hadamard", accent: "text-sky-400" },
    { name: "X", label: "Pauli-X", accent: "text-rose-400" },
    { name: "Y", label: "Pauli-Y", accent: "text-emerald-400" },
    { name: "Z", label: "Pauli-Z", accent: "text-cyan-400" },
    { name: "S", label: "Phase (S)", accent: "text-violet-400" },
    { name: "T", label: "Phase (T)", accent: "text-purple-400" },
    { name: "SX", label: "√X (SX)", accent: "text-indigo-400" },
    { name: "SXDG", label: "√X† (Inv)", accent: "text-indigo-300" },
    { name: "RX", label: "Rx(θ)", accent: "text-amber-400", isParam: true },
    { name: "RY", label: "Ry(θ)", accent: "text-amber-400", isParam: true },
    { name: "RZ", label: "Rz(θ)", accent: "text-amber-400", isParam: true },
    { name: "P", label: "Phase P(λ)", accent: "text-pink-400", isParam: true },
    { name: "U", label: "Universal U", accent: "text-teal-400", isUniversal: true },
    { name: "M", label: "Measure", accent: "text-emerald-400" },
    { name: "BARRIER", label: "Barrier", accent: "text-zinc-400" },
  ];

  const twoQubitGates = [
    { name: "CX", label: "CNOT (CX)", desc: "Controlled-NOT", accent: "text-sky-400" },
    { name: "CZ", label: "Controlled-Z", desc: "Phase-Flip Control", accent: "text-violet-400" },
    { name: "CH", label: "Controlled-H", desc: "Conditional Hadamard", accent: "text-teal-400" },
    { name: "SWAP", label: "Swap Qubits", desc: "State Exchange", accent: "text-rose-400" },
    { name: "CP", label: "Controlled-P", desc: "Conditional Phase", accent: "text-pink-400", isParam: true },
    { name: "CRX", label: "Controlled-RX", desc: "Conditional RX", accent: "text-amber-400", isParam: true },
    { name: "CRY", label: "Controlled-RY", desc: "Conditional RY", accent: "text-amber-400", isParam: true },
    { name: "CRZ", label: "Controlled-RZ", desc: "Conditional RZ", accent: "text-amber-400", isParam: true },
    { name: "RZZ", label: "RZZ Interaction", desc: "ZZ Entangling Interaction", accent: "text-cyan-400", isParam: true },
  ];

  const multiQubitGates = [
    { name: "CCX", label: "Toffoli (CCX)", desc: "Controlled-Controlled-NOT", accent: "text-emerald-400" },
  ];

  const handleSelectSingleGate = (gateName: string) => {
    if (!selectedSlot) return;
    if (gateName.toUpperCase() === "U") {
      setShowUniversalModal(true);
      return;
    }
    const isRot = ["RX", "RY", "RZ", "P"].includes(gateName.toUpperCase());
    onAddGate?.(gateName, selectedSlot.qubit, undefined, selectedSlot.step, isRot ? rotationAngleExpr : undefined);
    closeModal();
  };

  const handleConfirmUniversalGate = () => {
    if (!selectedSlot) return;
    onAddGate?.("U", selectedSlot.qubit, undefined, selectedSlot.step, uTheta, {
      uTheta,
      uPhi,
      uLam,
    });
    closeModal();
  };

  const handleSelectTwoQubitGateTarget = (targetQubit: number) => {
    if (!selectedSlot || !selectedTwoQubitGate) return;
    const isParam = ["CP", "CRX", "CRY", "CRZ", "RZZ"].includes(selectedTwoQubitGate.toUpperCase());
    const freeStep = getFirstFreeStepForWires([selectedSlot.qubit, targetQubit], selectedSlot.step);
    onAddGate?.(
      selectedTwoQubitGate,
      selectedSlot.qubit,
      targetQubit,
      freeStep,
      isParam ? rotationAngleExpr : undefined
    );
    closeModal();
  };

  const handleConfirmCcxGate = (targetQubit: number) => {
    if (!selectedSlot || ccxControl2 === null) return;
    const freeStep = getFirstFreeStepForWires([selectedSlot.qubit, ccxControl2, targetQubit], selectedSlot.step);
    onAddGate?.("CCX", selectedSlot.qubit, targetQubit, freeStep, undefined, {
      control2: ccxControl2,
    });
    closeModal();
  };

  const activeGateSetLabel = useMemo(() => {
    const names = Array.from(
      new Set(
        circuitGates
          .map((g) => (g.name || "").toUpperCase())
          .filter((n) => n && n !== "BARRIER" && n !== "MEASURE" && !n.startsWith("SAVE_"))
      )
    );
    return names.length > 0 ? names.slice(0, 8).join(", ") : "H, CX, CP, CCX, RZZ, U";
  }, [circuitGates]);

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
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.08] font-medium">
            Qiskit Aer Simulator
          </span>
        </div>

        {/* Right: Qubit Count Input + Gate Depth + Subview Switcher */}
        <div className="flex items-center space-x-3 text-[11px] font-mono">
          {/* Qubit Count Interactive Input Field */}
          <div
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-md border transition-all ${
              isDark ? "bg-[#101218] border-white/[0.08]" : "bg-slate-50 border-[#D5DDE7]"
            }`}
          >
            <span className="text-zinc-500 text-[10px] uppercase font-semibold">Qubits:</span>
            <button
              type="button"
              onClick={() => {
                const next = Math.max(1, nQubits - 1);
                if (next !== nQubits && onUpdateQubitCount) onUpdateQubitCount(next);
              }}
              disabled={nQubits <= 1}
              className="text-zinc-400 hover:text-zinc-200 disabled:opacity-25 text-xs px-0.5 select-none transition-colors"
              title="Decrease qubits"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={30}
              value={localQubits}
              onChange={(e) => setLocalQubits(e.target.value)}
              onBlur={commitQubitCount}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitQubitCount();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className={`w-8 bg-transparent text-center font-bold focus:outline-hidden ${
                isDark ? "text-zinc-100" : "text-slate-900"
              }`}
              title="Type qubit count and press Enter or click away"
            />
            <button
              type="button"
              onClick={() => {
                const next = Math.min(30, nQubits + 1);
                if (next !== nQubits && onUpdateQubitCount) onUpdateQubitCount(next);
              }}
              disabled={nQubits >= 30}
              className="text-zinc-400 hover:text-zinc-200 disabled:opacity-25 text-xs px-0.5 select-none transition-colors"
              title="Increase qubits"
            >
              +
            </button>
            <span className="text-zinc-500 text-[10px]">/ 30</span>
          </div>

          <div className="text-zinc-500">·</div>

          <div className="flex items-center space-x-1.5 text-zinc-400">
            <span>Depth:</span>
            <span className="text-zinc-200 font-bold">{circuitDepth}</span>
          </div>

          <div
            className={`flex items-center rounded-lg p-0.5 border ${
              isDark ? "bg-black/40 border-white/[0.08]" : "bg-slate-100 border-slate-200"
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveSubView("visual")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                activeSubView === "visual"
                  ? isDark
                    ? "bg-white/[0.1] text-white shadow-xs font-semibold"
                    : "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Visual Wires
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView("ascii")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                activeSubView === "ascii"
                  ? isDark
                    ? "bg-white/[0.1] text-white shadow-xs font-semibold"
                    : "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Qiskit ASCII
            </button>
          </div>
        </div>
      </div>

      {/* ── DYNAMIC LOOP CODE NOTIFICATION BANNER ── */}
      {hasDynamicLoops && isResultsStale && (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-mono animate-in fade-in duration-150">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Dynamic Python Code (Loops/Functions)</strong> — Graph edges and variables expand during execution. Run circuit to compile full schematic.
            </span>
          </div>
          {onRunCircuit && (
            <button
              type="button"
              onClick={onRunCircuit}
              className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors cursor-pointer shrink-0"
            >
              Run & Compile
            </button>
          )}
        </div>
      )}

      {/* ── MAIN VIEWPORT ── */}
      {activeSubView === "visual" ? (
        <div
          className={`rounded-2xl border relative overflow-hidden font-sans transition-colors ${
            isDark ? "bg-[#0B0C10] border-white/[0.08]" : "bg-white border-[#D5DDE7] shadow-sm"
          }`}
        >
          {/* Unified horizontal and vertical scroll container */}
          <div
            className="overflow-x-auto overflow-y-auto max-h-[62vh] custom-scrollbar"
            style={{
              scrollbarWidth: "auto",
              scrollbarColor: isDark
                ? "rgba(255, 255, 255, 0.4) rgba(0, 0, 0, 0.3)"
                : "rgba(100, 116, 139, 0.6) rgba(0, 0, 0, 0.05)",
            }}
          >
            <div className="min-w-max">
              {/* Top Step-Column Index Bar (Sticky Top + Sticky Left Wire Register) */}
              <div
                className={`sticky top-0 z-30 flex items-center border-b border-white/[0.06] text-[10px] font-mono text-zinc-400 backdrop-blur-md ${
                  isDark ? "bg-[#0B0C10]/95" : "bg-slate-100/95"
                }`}
              >
                <div
                  className={`w-24 shrink-0 px-3 py-2 font-semibold text-zinc-300 border-r border-white/[0.06] sticky left-0 z-40 ${
                    isDark ? "bg-[#0B0C10]" : "bg-slate-100"
                  }`}
                >
                  Wire Register
                </div>
                <div className="flex items-center pl-4 py-2 space-x-6 shrink-0">
                  {Array.from({ length: maxStep }).map((_, stepIdx) => (
                    <div key={stepIdx} className="w-10 text-center font-mono font-medium">
                      s{stepIdx}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setExtraSteps((prev) => prev + 2)}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] transition-all cursor-pointer text-[10px]"
                    title="Add 2 more parallel time-step columns"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Step</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Wires Area */}
              <div className="p-4 space-y-3 min-w-max">
                {grid.map((wireSteps, qIdx) => (
                  <div
                    key={qIdx}
                    className={`flex items-center relative group min-w-max ${isCompact ? "h-9" : "h-11"}`}
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
                      {wireSteps.map((gate, stepIdx) => {
                        const hasConnector =
                          gate &&
                          gate.allQubits &&
                          gate.allQubits.length > 1 &&
                          qIdx === Math.min(...gate.allQubits);

                        const connectorHeight = hasConnector
                          ? (Math.max(...gate.allQubits) - Math.min(...gate.allQubits)) * (isCompact ? 48 : 56)
                          : 0;

                        return (
                          <div
                            key={stepIdx}
                            className="w-10 flex items-center justify-center shrink-0 relative"
                          >
                            {/* Vertical entangling connector line spanning top-most to bottom-most qubit */}
                            {hasConnector && (
                              <div
                                style={{
                                  height: `${connectorHeight}px`,
                                  top: "50%",
                                }}
                                className={`absolute left-1/2 -translate-x-1/2 w-[2px] pointer-events-none z-0 ${
                                  gate.name.startsWith("CCX")
                                    ? "bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                                    : gate.name.startsWith("CZ")
                                    ? "bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                                    : gate.name.startsWith("CH")
                                    ? "bg-teal-400/80 shadow-[0_0_8px_rgba(45,212,191,0.5)]"
                                    : gate.name.startsWith("CP")
                                    ? "bg-pink-400/80 shadow-[0_0_8px_rgba(244,114,182,0.5)]"
                                    : gate.name.startsWith("CR")
                                    ? "bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                    : gate.name === "RZZ"
                                    ? "bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                                    : gate.name === "SWAP"
                                    ? "bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                                    : "bg-sky-500/80 shadow-[0_0_8px_rgba(14,165,233,0.5)]"
                                }`}
                              />
                            )}

                            {gate ? (
                              /* Render Placed Gate */
                              <div className="relative group/gate">
                                {gate.name === "B" ? (
                                  <div
                                    className={`w-2.5 ${
                                      isCompact ? "h-9" : "h-11"
                                    } flex items-center justify-center rounded-xs ${
                                      isDark
                                        ? "bg-amber-500/10 border-x-2 border-dashed border-amber-500/50"
                                        : "bg-slate-400/20 border-x-2 border-dashed border-slate-500/60"
                                    }`}
                                    title="Quantum Barrier — Synchronizes wire time steps (qc.barrier)"
                                  />
                                ) : gate.name.endsWith("-C") ? (
                                  /* Control Bullet (CCX-C, CX-C, CZ-C, CH-C, CP-C, CRX-C, etc.) */
                                  <div
                                    className={`w-4 h-4 rounded-full cursor-pointer hover:scale-125 transition-transform ${
                                      gate.name.startsWith("CCX")
                                        ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                                        : gate.name.startsWith("CP")
                                        ? "bg-pink-400 shadow-[0_0_6px_rgba(244,114,182,0.8)]"
                                        : gate.name.startsWith("CH")
                                        ? "bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.8)]"
                                        : gate.name.startsWith("CR")
                                        ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                                        : gate.name.startsWith("CZ")
                                        ? "bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]"
                                        : "bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]"
                                    }`}
                                    title={`Control wire (Target: q[${gate.target}])`}
                                  />
                                ) : gate.name === "CCX-T" ? (
                                  <div
                                    className="w-6 h-6 rounded-full border-2 border-emerald-400 bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-mono text-xs font-bold shadow-sm"
                                    title={`Toffoli Target (Controls: q[${gate.control}], q[${gate.control2}])`}
                                  >
                                    ⊕
                                  </div>
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
                                ) : gate.name === "CH-T" ? (
                                  <div
                                    className="w-6 h-6 rounded-md border-2 border-teal-500 bg-teal-500/20 text-teal-300 flex items-center justify-center font-mono text-xs font-bold shadow-sm"
                                    title={`Target (Control: q[${gate.control}])`}
                                  >
                                    H
                                  </div>
                                ) : gate.name === "CP-T" ? (
                                  <div
                                    className="px-2 py-0.5 rounded border border-pink-500/50 bg-pink-500/20 text-pink-300 font-mono text-[11px] font-bold shadow-sm"
                                    title={`Target CP (Control: q[${gate.control}])`}
                                  >
                                    P
                                  </div>
                                ) : gate.name.startsWith("CR") && gate.name.endsWith("-T") ? (
                                  <div
                                    className="px-2 py-0.5 rounded border border-amber-500/50 bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold shadow-sm"
                                    title={`Target ${gate.name.replace("-T", "")} (Control: q[${gate.control}])`}
                                  >
                                    {gate.name.replace("-T", "")}
                                  </div>
                                ) : gate.name === "RZZ" ? (
                                  <div
                                    className="px-2 py-0.5 rounded border border-cyan-500/50 bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold shadow-sm"
                                    title="ZZ Entangling Interaction"
                                  >
                                    RZZ
                                  </div>
                                ) : gate.name === "SWAP" ? (
                                  <div
                                    className="w-5 h-5 text-rose-400 font-bold font-mono flex items-center justify-center text-xs"
                                    title="SWAP Gate"
                                  >
                                    ✕
                                  </div>
                                ) : gate.name === "|ψ⟩" || gate.isProbe ? (
                                  <div
                                    className={`px-2 py-1 rounded border flex items-center justify-center font-mono font-bold shadow-xs transition-transform hover:scale-105 cursor-default ${
                                      isCompact ? "text-[10px] h-7 min-w-[32px]" : "text-[11px] h-8 min-w-[36px]"
                                    } bg-cyan-500/15 border-cyan-500/40 text-cyan-300`}
                                    title="Statevector Snapshot — Evaluates wavefunction |ψ⟩ at this step"
                                  >
                                    |ψ⟩
                                  </div>
                                ) : gate.name === "RESET" ? (
                                  <div
                                    className={`px-2 py-1 rounded border flex items-center justify-center font-mono font-bold shadow-xs transition-transform hover:scale-105 cursor-default ${
                                      isCompact ? "text-[10px] h-7 min-w-[30px]" : "text-[11px] h-8 min-w-[34px]"
                                    } bg-zinc-800/90 border-zinc-600 text-zinc-200`}
                                    title="Reset Qubit to |0⟩ (qc.reset)"
                                  >
                                    |0⟩
                                  </div>
                                ) : (
                                  /* Standard single-qubit badges */
                                  <div
                                    className={`px-2 py-1 rounded border flex items-center justify-center font-mono font-bold shadow-xs transition-transform hover:scale-105 cursor-pointer ${
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
                                        : gate.name === "P"
                                        ? "bg-pink-500/15 border-pink-500/40 text-pink-300"
                                        : gate.name === "U"
                                        ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                                        : gate.name.startsWith("SX")
                                        ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                                        : isDark
                                        ? "bg-zinc-800/95 border-zinc-700 text-zinc-100"
                                        : "bg-slate-50 border-slate-300 text-slate-800"
                                    }`}
                                    title={
                                      gate.params && gate.params.length > 0
                                        ? `${gate.name}(${gate.params.join(", ")})`
                                        : `${gate.name} Gate`
                                    }
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
                              /* Empty Slot Box: Click to open Gate Modal */
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSlot({ qubit: qIdx, step: stepIdx });
                                  setSelectedTwoQubitGate(null);
                                  setSelectedMultiQubitGate(null);
                                  setCcxControl2(null);
                                  setShowUniversalModal(false);
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
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ASCII VIEWPORT */
        <div
          className={`rounded-2xl border p-4 font-mono text-xs overflow-x-auto relative ${
            isDark ? "bg-[#08090C] border-white/[0.08]" : "bg-slate-900 border-slate-800 text-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-3 border-b border-white/[0.08] pb-2">
            <span className="text-zinc-400 font-sans text-xs">
              Direct Qiskit Text Circuit Representation
            </span>
            <button
              type="button"
              onClick={handleCopyAscii}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition-all text-[11px] cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy ASCII"}</span>
            </button>
          </div>
          <pre className="text-zinc-300 leading-relaxed overflow-x-auto custom-scrollbar select-all">
            {circuitAscii || "# Circuit schematic is empty. Add gates above to compile."}
          </pre>
        </div>
      )}

      {/* ── SQUARE GATE PLACEMENT MODAL ── */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
              isDark ? "bg-[#0E0F14] border-white/[0.1] text-zinc-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Modal Header */}
            <div
              className={`px-4.5 py-3 border-b flex items-center justify-between shrink-0 ${
                isDark ? "border-white/[0.07] bg-[#12141C]" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs tracking-tight">
                    Place Quantum Gate
                  </h4>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                      Wire q[{selectedSlot.qubit}]
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Step s{selectedSlot.step}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  isDark
                    ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4.5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {showUniversalModal ? (
                /* Universal U Gate Form */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <span className="text-xs font-semibold text-teal-400 font-mono">
                      Universal Gate U(θ, φ, λ)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowUniversalModal(false)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Arbitrary single-qubit unitary rotation on the Bloch sphere with angles θ (polar), φ (azimuthal), and λ (phase).
                  </p>
                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">θ (theta):</label>
                      <input
                        type="text"
                        value={uTheta}
                        onChange={(e) => setUTheta(e.target.value)}
                        placeholder="e.g. np.pi / 2"
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono focus:outline-hidden ${
                          isDark ? "bg-[#14161F] border-white/[0.1] text-zinc-100 focus:border-teal-400" : "bg-slate-50 border-slate-300 text-slate-800"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">φ (phi):</label>
                      <input
                        type="text"
                        value={uPhi}
                        onChange={(e) => setUPhi(e.target.value)}
                        placeholder="e.g. 0.0"
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono focus:outline-hidden ${
                          isDark ? "bg-[#14161F] border-white/[0.1] text-zinc-100 focus:border-teal-400" : "bg-slate-50 border-slate-300 text-slate-800"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">λ (lambda):</label>
                      <input
                        type="text"
                        value={uLam}
                        onChange={(e) => setULam(e.target.value)}
                        placeholder="e.g. np.pi"
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono focus:outline-hidden ${
                          isDark ? "bg-[#14161F] border-white/[0.1] text-zinc-100 focus:border-teal-400" : "bg-slate-50 border-slate-300 text-slate-800"
                        }`}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmUniversalGate}
                    className="w-full py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Insert U(θ, φ, λ) Gate
                  </button>
                </div>
              ) : selectedMultiQubitGate === "CCX" ? (
                /* CCX (Toffoli) Target Selector */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <span className="text-xs font-semibold text-emerald-400 font-mono">
                      Toffoli Gate (CCX) Setup
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMultiQubitGate(null);
                        setCcxControl2(null);
                      }}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                    >
                      Back
                    </button>
                  </div>

                  <div className="text-xs text-zinc-400 leading-relaxed space-y-1">
                    <p>
                      Control 1: <strong className="text-emerald-400 font-mono">q[{selectedSlot.qubit}]</strong>
                    </p>
                    <p>
                      {ccxControl2 === null
                        ? "Select Control 2 wire:"
                        : `Control 2: q[${ccxControl2}] — Now select Target wire:`}
                    </p>
                  </div>

                  {ccxControl2 === null ? (
                    <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-0.5">
                      {Array.from({ length: nQubits }).map((_, c2) => {
                        const isSelf = c2 === selectedSlot.qubit;
                        return (
                          <button
                            key={c2}
                            disabled={isSelf}
                            type="button"
                            onClick={() => setCcxControl2(c2)}
                            className={`h-10 rounded-lg border text-center text-xs font-mono font-bold transition-all cursor-pointer ${
                              isSelf
                                ? "opacity-20 border-zinc-800 text-zinc-600 cursor-not-allowed"
                                : isDark
                                ? "bg-[#13151D] border-white/[0.07] text-zinc-200 hover:bg-emerald-500/15 hover:border-emerald-500/50 hover:text-white"
                                : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-emerald-100 hover:border-emerald-500 hover:text-emerald-800"
                            }`}
                          >
                            q[{c2}]
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-0.5">
                        {Array.from({ length: nQubits }).map((_, tgtQ) => {
                          const isInvalid = tgtQ === selectedSlot.qubit || tgtQ === ccxControl2;
                          const freeStep = isInvalid || !selectedSlot
                            ? (selectedSlot?.step ?? 0)
                            : getFirstFreeStepForWires([selectedSlot.qubit, ccxControl2, tgtQ], selectedSlot.step);
                          const isDelayed = !isInvalid && selectedSlot && freeStep > selectedSlot.step;

                          return (
                            <button
                              key={tgtQ}
                              disabled={isInvalid}
                              type="button"
                              onClick={() => handleConfirmCcxGate(tgtQ)}
                              className={`h-10 rounded-lg border text-center text-xs font-mono font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                                isInvalid
                                  ? "opacity-20 border-zinc-800 text-zinc-600 cursor-not-allowed"
                                  : isDark
                                  ? "bg-[#13151D] border-white/[0.07] text-zinc-200 hover:bg-emerald-500/15 hover:border-emerald-500/50 hover:text-white"
                                  : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-emerald-100 hover:border-emerald-500 hover:text-emerald-800"
                              }`}
                              title={
                                isInvalid
                                  ? "Qubit cannot be both control and target"
                                  : isDelayed
                                  ? `Wire q[${tgtQ}] is busy at step ${selectedSlot?.step}. Gate will be placed at step ${freeStep} where all 3 wires are free.`
                                  : `Place Toffoli target on q[${tgtQ}] at step ${selectedSlot?.step}`
                              }
                            >
                              <span>q[{tgtQ}]</span>
                              {isDelayed && (
                                <span className="text-[9px] text-amber-400 font-normal leading-none">→ s{freeStep}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCcxControl2(null)}
                        className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                      >
                        Change Control 2
                      </button>
                    </div>
                  )}
                </div>
              ) : selectedTwoQubitGate ? (
                /* Two-Qubit Target Selector */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <span className="text-xs font-semibold text-sky-400 font-mono">
                      Target Qubit for {selectedTwoQubitGate}:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedTwoQubitGate(null)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                    >
                      Back
                    </button>
                  </div>

                  {["CP", "CRX", "CRY", "CRZ", "RZZ"].includes(selectedTwoQubitGate.toUpperCase()) && (
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.07] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-zinc-300">Angle Expression θ:</span>
                        <div className="flex items-center space-x-1 text-[10px] font-mono">
                          {[
                            { label: "π/4", expr: "np.pi / 4" },
                            { label: "π/2", expr: "np.pi / 2" },
                            { label: "π", expr: "np.pi" },
                          ].map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setRotationAngleExpr(opt.expr)}
                              className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                                rotationAngleExpr === opt.expr
                                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                                  : "border-white/[0.08] text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={rotationAngleExpr}
                        onChange={(e) => setRotationAngleExpr(e.target.value)}
                        placeholder="e.g. np.pi / 2"
                        className={`w-full px-2.5 py-1 rounded border text-xs font-mono focus:outline-hidden ${
                          isDark ? "bg-[#14161F] border-white/[0.1] text-zinc-100" : "bg-slate-50 border-slate-300 text-slate-800"
                        }`}
                      />
                    </div>
                  )}

                  <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                    Control wire: <strong className="text-sky-400 font-mono">q[{selectedSlot.qubit}]</strong>.
                    Choose target wire:
                  </p>

                  <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-0.5">
                    {Array.from({ length: nQubits }).map((_, targetQ) => {
                      const isSelf = targetQ === selectedSlot.qubit;
                      const freeStep = isSelf || !selectedSlot
                        ? (selectedSlot?.step ?? 0)
                        : getFirstFreeStepForWires([selectedSlot.qubit, targetQ], selectedSlot.step);
                      const isDelayed = !isSelf && selectedSlot && freeStep > selectedSlot.step;

                      return (
                        <button
                          key={targetQ}
                          disabled={isSelf}
                          type="button"
                          onClick={() => handleSelectTwoQubitGateTarget(targetQ)}
                          className={`h-10 rounded-lg border text-center text-xs font-mono font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                            isSelf
                              ? "opacity-20 border-zinc-800 text-zinc-600 cursor-not-allowed"
                              : isDark
                              ? "bg-[#13151D] border-white/[0.07] text-zinc-200 hover:bg-sky-500/15 hover:border-sky-500/50 hover:text-white"
                              : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-sky-100 hover:border-sky-500 hover:text-sky-800"
                          }`}
                          title={
                            isSelf
                              ? "Control and target cannot be the same wire"
                              : isDelayed
                              ? `Wire q[${targetQ}] is busy at step ${selectedSlot?.step}. Gate will be placed at step ${freeStep} where both wires are free.`
                              : `Place ${selectedTwoQubitGate} on target q[${targetQ}] at step ${selectedSlot?.step}`
                          }
                        >
                          <span>q[{targetQ}]</span>
                          {isDelayed && (
                            <span className="text-[9px] text-amber-400 font-normal leading-none">→ s{freeStep}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Primary Gate Palette (Single, Two-Qubit, Multi-Qubit) */
                <>
                  {/* Parameter Angle Toolbar */}
                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.07] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                        Angle Parameter (for Rx, Ry, Rz, P)
                      </span>
                      <div className="flex items-center space-x-1 text-[10px] font-mono">
                        {[
                          { label: "π/4", expr: "np.pi / 4" },
                          { label: "π/3", expr: "np.pi / 3" },
                          { label: "π/2", expr: "np.pi / 2" },
                          { label: "π", expr: "np.pi" },
                          { label: "2π", expr: "2 * np.pi" },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setRotationAngleExpr(opt.expr)}
                            className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                              rotationAngleExpr === opt.expr
                                ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                                : "border-white/[0.08] text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={rotationAngleExpr}
                      onChange={(e) => setRotationAngleExpr(e.target.value)}
                      placeholder="e.g. np.pi / 2, 0.7854, theta"
                      className={`w-full px-2.5 py-1 rounded border text-xs font-mono focus:outline-hidden ${
                        isDark ? "bg-[#14161F] border-white/[0.1] text-zinc-100 focus:border-amber-400" : "bg-slate-50 border-slate-300 text-slate-800"
                      }`}
                    />
                  </div>

                  {/* Section 1: Single Qubit Gates */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                      Single-Qubit Gates
                    </span>
                    <div className="grid grid-cols-5 gap-2">
                      {singleQubitGates.map((gate) => (
                        <button
                          key={gate.name}
                          type="button"
                          onClick={() => handleSelectSingleGate(gate.name)}
                          className={`h-13 rounded-lg border flex flex-col items-center justify-center space-y-0.5 transition-all cursor-pointer group ${
                            isDark
                              ? "bg-[#13151D] border-white/[0.07] hover:border-sky-500/50 hover:bg-[#181B26]"
                              : "bg-slate-50 border-slate-200 hover:border-sky-500 hover:bg-sky-50/50"
                          }`}
                        >
                          <span className={`font-mono font-bold text-xs ${gate.accent}`}>
                            {gate.name}
                          </span>
                          <span className="text-[9px] text-zinc-400 font-sans tracking-tight truncate w-full text-center px-1">
                            {gate.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Two-Qubit Entangling Gates */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                      Two-Qubit Gates (Control → Target)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {twoQubitGates.map((gate) => (
                        <button
                          key={gate.name}
                          type="button"
                          onClick={() => setSelectedTwoQubitGate(gate.name)}
                          className={`h-13 rounded-lg border flex flex-col items-center justify-center space-y-0.5 transition-all cursor-pointer group ${
                            isDark
                              ? "bg-[#13151D] border-white/[0.07] hover:border-indigo-500/50 hover:bg-[#181B26]"
                              : "bg-slate-50 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50"
                          }`}
                        >
                          <span className={`font-mono font-bold text-xs ${gate.accent}`}>
                            {gate.name}
                          </span>
                          <span className="text-[9px] text-zinc-400 font-sans tracking-tight truncate w-full text-center px-1">
                            {gate.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Multi-Qubit Gates (3+ Qubits) */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                      Multi-Qubit Gates (3 Qubits)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {multiQubitGates.map((gate) => (
                        <button
                          key={gate.name}
                          type="button"
                          onClick={() => setSelectedMultiQubitGate(gate.name)}
                          className={`h-13 rounded-lg border flex flex-col items-center justify-center space-y-0.5 transition-all cursor-pointer group ${
                            isDark
                              ? "bg-[#13151D] border-white/[0.07] hover:border-emerald-500/50 hover:bg-[#181B26]"
                              : "bg-slate-50 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50"
                          }`}
                        >
                          <span className={`font-mono font-bold text-xs ${gate.accent}`}>
                            {gate.name}
                          </span>
                          <span className="text-[9px] text-zinc-400 font-sans tracking-tight truncate w-full text-center px-1">
                            {gate.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className={`px-4.5 py-3 border-t flex items-center justify-between text-xs shrink-0 ${
                isDark ? "border-white/[0.07] bg-[#101218] text-zinc-400" : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              <span className="text-[11px] text-zinc-500 font-sans">
                Generates Qiskit code in Monaco editor
              </span>
              <button
                type="button"
                onClick={closeModal}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  isDark
                    ? "border-white/[0.08] hover:bg-white/[0.06] text-zinc-300"
                    : "border-slate-200 hover:bg-slate-100 text-slate-700"
                }`}
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
          <span className="block text-[10px] uppercase text-zinc-500">Simulation Engine</span>
          <span className="text-emerald-500 font-semibold text-sm">Exact Statevector (Aer)</span>
        </div>
        <div
          className={`p-3 rounded-xl border ${
            isDark ? "bg-[#0E0F13] border-white/[0.06] text-zinc-400" : "bg-white border-slate-200 text-slate-600 shadow-xs"
          }`}
        >
          <span className="block text-[10px] uppercase text-zinc-500">Active Circuit Gates</span>
          <span className="text-sky-400 font-semibold text-xs">{activeGateSetLabel}</span>
        </div>
        <div
          className={`p-3 rounded-xl border ${
            isDark ? "bg-[#0E0F13] border-white/[0.06] text-zinc-400" : "bg-white border-slate-200 text-slate-600 shadow-xs"
          }`}
        >
          <span className="block text-[10px] uppercase text-zinc-500">Last Execution Latency</span>
          {isResultsStale ? (
            <span className="text-amber-400 font-semibold text-xs flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Modified (Run to Update)</span>
            </span>
          ) : (
            <span className={isDark ? "text-zinc-200 font-semibold text-sm" : "text-slate-900 font-semibold text-sm"}>
              {latencyMs > 0 ? `${latencyMs.toFixed(1)} ms` : "Ready"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
