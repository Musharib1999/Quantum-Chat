"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Cpu,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import {
  FormulationCanvas,
  QMatrixHeatmap,
  EnergySpectrumView,
  OptimizationCopilot,
  ThemeColors,
  MathFormulationParams,
  OptimizationSectionId,
  CopilotMessage,
  OptimizationResults,
} from "@/components/optimization";

const defaultColors: ThemeColors = {
  bgSection1: "#090A0D",
  bgSection2: "#0E0F13",
  bgSection3: "#13141A",
  bgMain: "#090A0D",
  bgHeader: "#0E0F13",
  bgSidebar: "#090A0D",
  bgEditor: "#0E0F13",
  bgBottomDrawer: "#13141A",
  bgBottomDrawerHeader: "#13141A",
  bgCard: "#13141A",
  bgInput: "#090A0D",
  bgPill: "#191A23",
  border: "rgba(255, 255, 255, 0.08)",
  borderSection2: "rgba(255, 255, 255, 0.12)",
  borderSubtle: "rgba(255, 255, 255, 0.05)",
  textPrimary: "#F1F5F9",
  textMuted: "#94A3B8",
  textCyan: "#38BDF8",
  textEmerald: "#34D399",
  textAmber: "#FBBF24",
  textSkyBlue: "#60A5FA",
};

const DEFAULT_VARIABLES = ["Wind_A", "Solar_B", "Battery_C", "Hydro_D"];
const ASSET_COSTS = [9.0, 7.0, 6.0, 8.0];
const ASSET_YIELDS = [12.5, 9.0, 8.0, 10.5];

export default function OptimizationStudioPage() {
  const [selectedSection, setSelectedSection] = useState<OptimizationSectionId>("01");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(18.5);

  const [mathParams, setMathParams] = useState<MathFormulationParams>({
    budgetMax: 18.0,
    yieldWeight: 1.0,
    minDiversity: 2,
    penaltyLambda: 3.5,
    hasMutualExclusion: true,
    hasCarbonCeiling: false,
    isMarkowitz: false,
  });

  const [solverResult, setSolverResult] = useState<OptimizationResults>({
    energy: -62.2,
    sample: { Wind_A: 0, Solar_B: 0, Battery_C: 1, Hydro_D: 1 },
    num_variables: 4,
    variables: DEFAULT_VARIABLES,
    qubo_matrix: [
      [-11.25, 15.7, 7.7, 9.9],
      [15.7, -9.5, 5.1, 7.7],
      [7.7, 5.1, -18.0, 6.6],
      [9.9, 7.7, 6.6, -50.8],
    ],
    energy_distribution: [
      {
        energy: -62.2,
        sample: { Wind_A: 0, Solar_B: 0, Battery_C: 1, Hydro_D: 1 },
        num_occurrences: 540,
        bitstring: "0011",
      },
      {
        energy: -55.6,
        sample: { Wind_A: 0, Solar_B: 1, Battery_C: 0, Hydro_D: 1 },
        num_occurrences: 280,
        bitstring: "0101",
      },
      {
        energy: -48.1,
        sample: { Wind_A: 1, Solar_B: 0, Battery_C: 0, Hydro_D: 1 },
        num_occurrences: 120,
        bitstring: "1001",
      },
      {
        energy: -32.4,
        sample: { Wind_A: 0, Solar_B: 1, Battery_C: 1, Hydro_D: 0 },
        num_occurrences: 60,
        bitstring: "0110",
      },
    ],
  });

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 1,
      sender: "assistant",
      text: "Welcome to the Clean Energy Portfolio Optimization Studio. I have scoped mathematical parameters from Section 01, 02, and 03. Sliders dynamically update the BQM couplers in real-time.",
      timestamp: "Just now",
    },
    {
      id: 2,
      sender: "assistant",
      text: "Notice that Wind_A and Solar_B currently have a mutual exclusion penalty active (\\lambda_{\\text{ex}} = +8.0), raising coupler Q_{01} to 15.7.",
      mathFormula: "Q_{01} = \\lambda C_0 C_1 + \\lambda_{\\text{ex}} = 7.72 + 8.0 = 15.72",
      breakdown: [
        "Base quadratic budget overlap: 7.72",
        "Mutual exclusion penalty wall: +8.00",
        "Resulting ground state rejects dual selection: Wind_A = 0, Solar_B = 0",
      ],
      isMutualProposal: true,
      timestamp: "Just now",
    },
  ]);

  const currentMatrix = useMemo(() => {
    const N = DEFAULT_VARIABLES.length;
    const mat: number[][] = Array(N)
      .fill(0)
      .map(() => Array(N).fill(0));

    for (let i = 0; i < N; i++) {
      const yieldTerm = -ASSET_YIELDS[i] * mathParams.yieldWeight;
      const penaltySelf =
        mathParams.penaltyLambda *
        ASSET_COSTS[i] *
        (ASSET_COSTS[i] - 2 * mathParams.budgetMax) *
        0.005;
      mat[i][i] = parseFloat((yieldTerm + penaltySelf).toFixed(2));

      for (let j = i + 1; j < N; j++) {
        let coupler =
          mathParams.penaltyLambda * ASSET_COSTS[i] * ASSET_COSTS[j] * 0.035;

        if (i === 0 && j === 1 && mathParams.hasMutualExclusion) {
          coupler += 8.0;
        }

        const rounded = parseFloat(coupler.toFixed(2));
        mat[i][j] = rounded;
        mat[j][i] = rounded;
      }
    }
    return mat;
  }, [mathParams]);

  const solveQubo = useCallback(
    async (matrixToSolve: number[][]) => {
      setIsSolving(true);
      const t0 = performance.now();
      try {
        const response = await fetch("/api/dwave/simulate-qubo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variables: DEFAULT_VARIABLES,
            matrix: matrixToSolve,
            num_reads: 300,
            seed: 42,
          }),
        });

        const data = await response.json();
        const duration = performance.now() - t0;
        setLatencyMs(parseFloat(duration.toFixed(1)));

        if (data.success) {
          setSolverResult({
            energy: data.energy,
            sample: data.sample,
            num_variables: data.num_variables || DEFAULT_VARIABLES.length,
            variables: data.variables || DEFAULT_VARIABLES,
            qubo_matrix: data.qubo_matrix || matrixToSolve,
            energy_distribution: data.energy_distribution || [],
          });
          setIsDirty(false);
        }
      } catch (err) {
        console.error("Solver error:", err);
      } finally {
        setIsSolving(false);
      }
    },
    []
  );

  useEffect(() => {
    setIsDirty(true);
  }, [mathParams]);

  const handleRecompile = () => {
    solveQubo(currentMatrix);
  };

  const handleSendMessage = (text: string) => {
    const userMsg: CopilotMessage = {
      id: Date.now(),
      sender: "user",
      text,
      timestamp: "Just now",
    };
    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      let replyText = `Analyzing your request regarding Section ${selectedSection || "01"}...`;
      let formula: string | undefined = undefined;

      if (text.toLowerCase().includes("mutual") || text.toLowerCase().includes("exclusion")) {
        replyText =
          "To guarantee Wind_A and Solar_B cannot both be selected, we inject a penalty term \\lambda_{\\text{ex}} x_0 x_1 with stiffness \\lambda_{\\text{ex}} = 8.0.";
        formula = "\\mathcal{H}_{\\text{ME}} = 8.0 \\cdot x_{\\text{wind}} \\cdot x_{\\text{solar}}";
      } else if (text.toLowerCase().includes("carbon") || text.toLowerCase().includes("emission")) {
        replyText =
          "Added carbon emissions ceiling constraint \\sum E_i x_i \\le E_{\\text{max}}. High-carbon facilities receive heavy diagonal penalty bias.";
        formula = "\\mathcal{H}_{\\text{carbon}} = \\mu \\left( \\sum_{i} E_i x_i - E_{\\text{max}} \\right)^2";
      } else if (text.toLowerCase().includes("lambda") || text.toLowerCase().includes("optimal")) {
        replyText =
          "Optimal penalty multiplier condition satisfies \\lambda > \\max \\| \\Delta \\mathcal{H}_{\\text{obj}} \\|. For current capex bounds, \\lambda = 3.5 ensures ground-state feasibility.";
        formula = "\\lambda_{\\text{min}} = \\frac{\\max(\\text{yield})}{\\min(\\text{cost})} \\approx 2.85 \\implies \\lambda = 3.5 \\text{ is optimal}";
      }

      const botMsg: CopilotMessage = {
        id: Date.now() + 1,
        sender: "assistant",
        text: replyText,
        mathFormula: formula,
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 400);
  };

  const handleToggleMutualExclusion = () => {
    setMathParams((prev) => ({
      ...prev,
      hasMutualExclusion: !prev.hasMutualExclusion,
    }));
  };

  const totalCost = useMemo(() => {
    const s = solverResult.sample;
    let cost = 0;
    DEFAULT_VARIABLES.forEach((v, idx) => {
      if (s[v] === 1) cost += ASSET_COSTS[idx];
    });
    return cost;
  }, [solverResult.sample]);

  const totalScore = useMemo(() => {
    const s = solverResult.sample;
    let score = 0;
    DEFAULT_VARIABLES.forEach((v, idx) => {
      if (s[v] === 1) score += ASSET_YIELDS[idx];
    });
    return score;
  }, [solverResult.sample]);

  return (
    <div className="min-h-screen bg-[#090A0D] text-slate-100 flex flex-col font-sans">
      <header className="h-14 border-b border-white/[0.08] bg-[#0E0F13] px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link
            href="/ide"
            className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>IDE</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-sm tracking-tight text-white">
              Optimization Studio
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Clean Energy Portfolio (N=4)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs font-mono text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>D-Wave Neal (Simulated Annealing)</span>
          </div>

          <button
            onClick={handleRecompile}
            disabled={isSolving}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium font-mono transition-all ${
              isDirty
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20 hover:brightness-110"
                : "bg-white/[0.08] text-slate-200 hover:bg-white/[0.12]"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSolving ? "animate-spin" : ""}`} />
            <span>{isSolving ? "Solving..." : isDirty ? "Recompile QUBO" : "QUBO Compiled"}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        <div className="lg:col-span-4 border-r border-white/[0.08] overflow-y-auto max-h-[calc(100vh-3.5rem)] bg-[#090A0D]">
          <FormulationCanvas
            colors={defaultColors}
            mathParams={mathParams}
            setMathParams={setMathParams}
            onRecompile={handleRecompile}
            isDirty={isDirty}
            selectedSection={selectedSection}
            onSelectSection={setSelectedSection}
          />
        </div>

        <div className="lg:col-span-5 border-r border-white/[0.08] flex flex-col overflow-y-auto max-h-[calc(100vh-3.5rem)] bg-[#0E0F13]">
          <div className="p-4 border-b border-white/[0.08]">
            <QMatrixHeatmap
              colors={defaultColors}
              matrix={currentMatrix}
              variables={DEFAULT_VARIABLES}
              hasMutualExclusion={mathParams.hasMutualExclusion}
            />
          </div>

          <div className="p-4 flex-1">
            <EnergySpectrumView
              colors={defaultColors}
              distribution={solverResult.energy_distribution}
              groundEnergy={solverResult.energy}
              numReads={300}
              latencyMs={latencyMs}
              variables={DEFAULT_VARIABLES}
            />
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col h-[calc(100vh-3.5rem)] bg-[#090A0D]">
          <OptimizationCopilot
            colors={defaultColors}
            selectedSection={selectedSection}
            onSelectSection={setSelectedSection}
            messages={messages}
            onSendMessage={handleSendMessage}
            onApplyMutualExclusion={handleToggleMutualExclusion}
            solutionHealth={{
              title: "Portfolio Health",
              cost: totalCost,
              maxCost: mathParams.budgetMax,
              score: totalScore,
              energy: solverResult.energy,
              feasible: totalCost <= mathParams.budgetMax,
            }}
          />
        </div>
      </div>
    </div>
  );
}