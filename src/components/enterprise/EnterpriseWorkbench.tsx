"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Code,
  Maximize2,
  Minimize2,
  Sliders,
  Check,
  Copy,
  Plus,
  Trash2,
  Cpu,
  Zap,
  Play,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Terminal,
  FileCode,
  Download,
  Search,
  Layers,
  Sparkles,
  AlertCircle,
  Clock,
  ShieldCheck,
  ExternalLink,
  Send,
  Bot,
  User,
  CornerDownLeft,
  MessageSquare,
  Square,
} from "lucide-react";
import { LatexMath } from "../optimization/LatexMath";
import IdeMarkdownRenderer from "../IdeMarkdownRenderer";
import {
  MathematicalModel,
  OptimizationVariable,
  OptimizationConstraint,
  SolverType,
  ExecutionRun,
  FeasibilityCheckResult,
  QMatrixData,
  SolverExecution,
  SolverRouting,
} from "./types";
import { exprToLatex, buildFallbackOrtoolsCode } from "./adapters";

// Dynamically import Monaco Editor to avoid SSR hydration mismatch
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export type WorkbenchTab = "model" | "q_matrix" | "solver" | "feasibility" | "deploy" | "code" | "results";

export interface GuruAiMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  suggestedCode?: string | null;
}

export interface EnterpriseWorkbenchProps {
  isDark: boolean;
  mathModel: MathematicalModel;
  onUpdateMathModel: React.Dispatch<React.SetStateAction<MathematicalModel>>;
  variables: OptimizationVariable[];
  onUpdateVariables: React.Dispatch<React.SetStateAction<OptimizationVariable[]>>;
  selectedSolver: SolverType;
  onSelectSolver: (solver: SolverType) => void;
  feasibilityResults: FeasibilityCheckResult[];
  penaltyLambda: number;
  onChangePenaltyLambda: (val: number) => void;
  generatedCode: string;
  onChangeCode: (code: string) => void;
  ortoolsCode?: string;
  onChangeOrtoolsCode?: (code: string) => void;
  executionHistory: ExecutionRun[];
  onRestoreRun: (run: ExecutionRun) => void;
  onReSolve: () => void;
  onStopSolving?: () => void;
  isSolving: boolean;
  terminalRunSeq?: number;
  onOpenDeploy?: () => void;
  projectId?: string;
  problemTitle?: string;

  // Real data integration
  qMatrix?: QMatrixData | null;
  solverRouting?: SolverRouting | null;
  execution?: SolverExecution | null;
  onUpdateExecution?: (updater: (prev: SolverExecution | null) => SolverExecution | null) => void;
  terminalLogs?: string[];
  onUpdateTerminalLogs?: (updater: (prev: string[]) => string[]) => void;
}

const AVAILABLE_SOLVERS: Array<{
  id: SolverType;
  name: string;
  category: string;
  description: string;
  badge: string;
}> = [
  {
    id: "dwave_sa",
    name: "D-Wave Simulated Annealer",
    category: "Classical Sampler",
    description: "Thermal sampling algorithm simulating quantum fluctuations across 1,000 reads.",
    badge: "Fast & robust",
  },
  {
    id: "dwave_advantage",
    name: "D-Wave Advantage 4.1 QPU",
    category: "Pure Quantum Hardware",
    description: "Direct superconducting quantum annealing processor with Pegasus topology.",
    badge: "Physical QPU",
  },
  {
    id: "dwave_cqm",
    name: "D-Wave Hybrid CQM Solver",
    category: "Quantum-Classical Hybrid",
    description: "Constrained Quadratic Model cloud portfolio solver handling mixed discrete bounds.",
    badge: "Hybrid cloud",
  },
  {
    id: "ortools_classical",
    name: "Classical Exact Solver (OR-Tools / CBC)",
    category: "Mathematical Programming",
    description: "Branch-and-cut linear programming engine for deterministic global optima verification.",
    badge: "Deterministic",
  },
];

export function EnterpriseWorkbench({
  isDark,
  mathModel,
  onUpdateMathModel,
  variables,
  onUpdateVariables,
  selectedSolver,
  onSelectSolver,
  feasibilityResults,
  penaltyLambda,
  onChangePenaltyLambda,
  generatedCode,
  onChangeCode,
  ortoolsCode = "",
  onChangeOrtoolsCode,
  executionHistory,
  onRestoreRun,
  onReSolve,
  onStopSolving,
  isSolving,
  terminalRunSeq = 0,
  onOpenDeploy,
  projectId = "default",
  problemTitle = "Optimization Problem",
  qMatrix = null,
  solverRouting = null,
  execution = null,
  onUpdateExecution,
  terminalLogs: externalTerminalLogs,
  onUpdateTerminalLogs,
}: EnterpriseWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("code");
  const [activeCodeFile, setActiveCodeFile] = useState<"solution.py" | "ortools_baseline.py">("solution.py");
  const [resultVarFilter, setResultVarFilter] = useState<"active" | "all">("active");

  // Always auto-select Code Editor tab when entering Workbench
  useEffect(() => {
    setActiveTab("code");
  }, []);

  const handleSelectTab = (tab: WorkbenchTab) => {
    setActiveTab(tab);
  };

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Constraint creation modal state
  const [showAddConstraint, setShowAddConstraint] = useState(false);
  const [newConstraintName, setNewConstraintName] = useState("");
  const [newConstraintExpr, setNewConstraintExpr] = useState("");
  const [newConstraintOp, setNewConstraintOp] = useState<"<=" | ">=" | "==">("<=");
  const [newConstraintRhs, setNewConstraintRhs] = useState("0");

  // Terminal state
  const [showTerminal, setShowTerminal] = useState(false);
  const [localTerminalLogs, setLocalTerminalLogs] = useState<string[]>([]);
  const terminalLogs = externalTerminalLogs ?? localTerminalLogs;
  const setTerminalLogs = (updater: (prev: string[]) => string[]) => {
    if (onUpdateTerminalLogs) {
      onUpdateTerminalLogs(updater);
    } else {
      setLocalTerminalLogs(updater);
    }
  };

  // Auto-open Terminal whenever a solver run is triggered from the top Solve menu
  useEffect(() => {
    if (terminalRunSeq > 0) {
      setShowTerminal(true);
    }
  }, [terminalRunSeq]);

  // ── Guru AI Agent State & Handlers ──
  const [guruAiMessages, setGuruAiMessages] = useState<GuruAiMessage[]>([]);
  const [guruAiInput, setGuruAiInput] = useState("");
  const [isGuruAiThinking, setIsGuruAiThinking] = useState(false);
  const guruAbortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleStopGuruAi = () => {
    if (guruAbortRef.current) {
      guruAbortRef.current.abort();
      guruAbortRef.current = null;
    }
    setIsGuruAiThinking(false);
  };

  // Guru AI quick prompt templates
  const GURU_QUICK_PROMPTS = useMemo(() => [
    { label: "Quantum vs. OR-Tools", query: "Compare the D-Wave QUBO solution against the Google OR-Tools CP-SAT solution and explain which is better and why." },
    { label: "Why these variables?", query: "Why did the solver pick these specific variables?" },
    { label: "Calibrate penalty λ", query: `Is penalty stiffness λ = ${(typeof penaltyLambda === "number" ? penaltyLambda : 1.0).toFixed(1)} calibrated properly for these constraints?` },
  ], [penaltyLambda]);

  // Restore or initialize conversation on project change
  useEffect(() => {
    try {
      const storageKey = `qg_guru_ai_messages_${projectId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGuruAiMessages(parsed);
          return;
        }
      }
    } catch {}
    setGuruAiMessages([]);
  }, [projectId]);

  // Persist messages to localStorage
  useEffect(() => {
    if (guruAiMessages.length > 0) {
      try {
        localStorage.setItem(`qg_guru_ai_messages_${projectId}`, JSON.stringify(guruAiMessages));
      } catch {}
    }
  }, [guruAiMessages, projectId]);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [guruAiMessages, isGuruAiThinking]);

  const handleClearGuruAi = () => {
    setGuruAiMessages([]);
    try {
      localStorage.removeItem(`qg_guru_ai_messages_${projectId}`);
    } catch {}
  };

  const handleSendGuruAiMessage = async (queryText?: string) => {
    const textToSend = (queryText ?? guruAiInput).trim();
    if (!textToSend || isGuruAiThinking) return;

    const userMsg: GuruAiMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setGuruAiMessages((prev) => [...prev, userMsg]);
    setGuruAiInput("");
    setIsGuruAiThinking(true);

    if (guruAbortRef.current) {
      guruAbortRef.current.abort();
    }
    const controller = new AbortController();
    guruAbortRef.current = controller;

    try {
      // Build deep contextual summary of the current problem
      const contextSummary = `
[CURRENT WORKSPACE STATE]
Problem Title: "${problemTitle}" (Project ID: ${projectId})
Objective Sense: ${mathModel?.objectiveSense || "Minimize"}
Objective Expression: ${mathModel?.objectiveExpr || "0.0"}
Decision Variables (${variables.length}): ${variables.map((v) => `${v.name} (${v.varType})`).join(", ") || "None"}
Penalty Multiplier (λ): ${penaltyLambda}
Active Constraints (${mathModel?.constraints?.length || 0}):
${(mathModel?.constraints || []).map((c, idx) => `  ${idx + 1}. [${c.name}] ${c.leftExpr} ${c.op} ${c.rightVal ?? 0}`).join("\n") || "  (None)"}
${
  execution
    ? `Latest Solver Execution (dwave_simulator):
  - Energy: ${execution.energy}
  - Objective Value: ${execution.objectiveValue}
  - Feasible: ${execution.feasible}
  - Selected Variables: ${execution.selectedVariables?.join(", ") || "None"}
  - Variable Values: ${JSON.stringify(execution.solution || {})}
${
  execution.solverComparison
    ? `Parallel Quantum vs. Classical (Google OR-Tools CP-SAT) Benchmark:
  - Verdict: ${execution.solverComparison.verdict_badge}
  - Optimality Gap (%): ${execution.solverComparison.optimality_gap_pct}
  - Decision Overlap (%): ${execution.solverComparison.decision_overlap_pct}
  - Quantum (D-Wave QUBO): Objective=${execution.solverComparison.quantum.objective_value}, Feasible=${execution.solverComparison.quantum.feasible}, Constraints=${execution.solverComparison.quantum.constraints_satisfied}/${execution.solverComparison.quantum.constraints_total}, Time=${execution.solverComparison.quantum.solve_time_ms}ms, Selected=${execution.solverComparison.quantum.selected_variables?.join(", ") || "None"}
  - Classical (Google OR-Tools CP-SAT): Status=${execution.solverComparison.classical.status}, Objective=${execution.solverComparison.classical.objective_value}, Feasible=${execution.solverComparison.classical.feasible}, Constraints=${execution.solverComparison.classical.constraints_satisfied}/${execution.solverComparison.classical.constraints_total}, Time=${execution.solverComparison.classical.solve_time_ms}ms, Selected=${execution.solverComparison.classical.selected_variables?.join(", ") || "None"}
  - Benchmark Summary: ${execution.solverComparison.summary}`
    : ""
}`
    : "Latest Solver Execution: Not yet executed."
}
${
  feasibilityResults.length > 0
    ? `Feasibility Audit:
${feasibilityResults.map((f) => `  - [${f.name}] satisfied: ${f.satisfied}, LHS: ${f.computedLhs}, RHS: ${f.rhs}, slack: ${f.slack}`).join("\n")}`
    : ""
}

[USER QUESTION]
${textToSend}
`.trim();

      const res = await fetch("/api/ide/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          project_id: projectId,
          user_message: contextSummary,
          active_file: "solution.py",
          file_content: generatedCode,
          target_backend: "dwave_simulator",
          optimization_level: 2,
          model_engine: "groq",
          terminal_output: terminalLogs.slice(-10).join("\n"),
          execution_context: {
            problem_title: problemTitle,
            project_id: projectId,
            math_model: mathModel,
            penalty_lambda: penaltyLambda,
            variables: variables,
            execution: execution,
            feasibility: feasibilityResults,
          },
        }),
      });

      const data = await res.json();
      const aiText = data.response_text || data.scientific_verdict || "No response received from Guru AI agent.";
      const suggestedCode = data.updated_code || null;

      const aiMsg: GuruAiMessage = {
        id: `ai_${Date.now()}`,
        sender: "assistant",
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestedCode,
      };

      setGuruAiMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const isAbort = err?.name === "AbortError" || controller.signal.aborted;
      const errMsg: GuruAiMessage = {
        id: `err_${Date.now()}`,
        sender: "assistant",
        text: isAbort
          ? `_Request terminated by user._`
          : `**Connection Error:** Unable to reach Guru AI engine (${err.message}). Please ensure the backend service is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setGuruAiMessages((prev) => [...prev, errMsg]);
    } finally {
      if (guruAbortRef.current === controller) {
        guruAbortRef.current = null;
      }
      setIsGuruAiThinking(false);
    }
  };

  // Q Matrix Tab Filter & Search State
  const [qSearch, setQSearch] = useState("");
  const [qFilterKind, setQFilterKind] = useState<"all" | "decision" | "slack">("all");
  const [selectedCell, setSelectedCell] = useState<{ i: number; j: number; val: number } | null>(null);

  // Precomputed lookup map and max magnitude for Q Matrix heatmap
  const { matrixMap, maxMagnitude, sortedEntries } = useMemo(() => {
    const map = new Map<string, number>();
    let maxMag = 0.0001;
    const entries = qMatrix?.entries || [];

    for (const e of entries) {
      map.set(`${e.i}_${e.j}`, e.value);
      const mag = Math.abs(e.value);
      if (mag > maxMag) maxMag = mag;
    }

    const sorted = [...entries].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    return { matrixMap: map, maxMagnitude: maxMag, sortedEntries: sorted };
  }, [qMatrix]);

  // Filtered couplings table rows
  const filteredCouplings = useMemo(() => {
    if (!qMatrix) return [];
    const query = qSearch.trim().toLowerCase();
    return sortedEntries.filter((e) => {
      const varA = qMatrix.variables[e.i];
      const varB = qMatrix.variables[e.j];
      if (qFilterKind === "decision" && (varA?.kind !== "decision" || varB?.kind !== "decision")) {
        return false;
      }
      if (qFilterKind === "slack" && varA?.kind !== "slack" && varB?.kind !== "slack") {
        return false;
      }
      if (!query) return true;
      const nameA = varA?.name?.toLowerCase() || "";
      const nameB = varB?.name?.toLowerCase() || "";
      return nameA.includes(query) || nameB.includes(query) || `${e.i}` === query || `${e.j}` === query;
    });
  }, [sortedEntries, qMatrix, qSearch, qFilterKind]);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Export Q-matrix as CSV
  const handleExportCsv = () => {
    if (!qMatrix) return;
    const lines = ["row_i,col_j,var_i,var_j,type,coupling_weight"];
    for (const e of qMatrix.entries) {
      const varA = qMatrix.variables[e.i]?.name || `q_${e.i}`;
      const varB = qMatrix.variables[e.j]?.name || `q_${e.j}`;
      const type = e.i === e.j ? "linear_bias" : "quadratic_coupling";
      lines.push(`${e.i},${e.j},${varA},${varB},${type},${e.value}`);
    }
    const csvContent = lines.join("\n");
    handleCopy(csvContent, "csv_copied");
  };

  // Export Q-matrix as JSON download
  const handleDownloadJson = () => {
    if (!qMatrix) return;
    const jsonStr = JSON.stringify(qMatrix, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qubo_matrix_${projectId || "model"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleSense = () => {
    onUpdateMathModel((prev) => ({
      ...prev,
      objectiveSense: prev.objectiveSense === "Minimize" ? "Maximize" : "Minimize",
    }));
  };

  const handleAddConstraint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConstraintName.trim() || !newConstraintExpr.trim()) return;
    const newConst: OptimizationConstraint = {
      id: `c_${Date.now()}`,
      name: newConstraintName.trim(),
      leftExpr: newConstraintExpr.trim(),
      op: newConstraintOp,
      rightVal: parseFloat(newConstraintRhs) || 0,
    };
    onUpdateMathModel((prev) => ({
      ...prev,
      constraints: [...prev.constraints, newConst],
    }));
    setNewConstraintName("");
    setNewConstraintExpr("");
    setShowAddConstraint(false);
  };

  const handleDeleteConstraint = (id: string) => {
    onUpdateMathModel((prev) => ({
      ...prev,
      constraints: prev.constraints.filter((c) => c.id !== id),
    }));
  };

  // Synthesize deterministic Google OR-Tools CP-SAT script client-side if loading a historical project saved before the OR-Tools update
  const synthesizedOrtoolsCode = useMemo(() => {
    const existing = ortoolsCode || execution?.ortoolsCode || execution?.solverComparison?.classical?.code || "";
    if (existing.trim()) return existing;
    return buildFallbackOrtoolsCode(variables, mathModel);
  }, [ortoolsCode, execution, variables, mathModel]);

  const activeEditorCode = activeCodeFile === "ortools_baseline.py" ? synthesizedOrtoolsCode : generatedCode;

  // Live-update penalty λ inside solution.py whenever the user edits λ
  const handleInlinePenaltyChange = (nextLambda: number) => {
    const safeLambda = Number.isFinite(nextLambda) && nextLambda > 0 ? nextLambda : 1.0;
    onChangePenaltyLambda(safeLambda);
    if (generatedCode?.trim()) {
      const updatedQubo = generatedCode
        .replace(/Q\s*=\s*Q_cost\s*\+\s*[\d.]+\s*\*\s*Q_con/g, `Q = Q_cost + ${safeLambda} * Q_con`)
        .replace(/offset\s*=\s*offset_cost\s*\+\s*[\d.]+\s*\*\s*offset_con/g, `offset = offset_cost + ${safeLambda} * offset_con`)
        .replace(/penalty_lambda\s*=\s*[\d.]+/g, `penalty_lambda = ${safeLambda}`);
      if (updatedQubo !== generatedCode) {
        onChangeCode(updatedQubo);
      }
    }
  };

  // Monaco theme registration
  const handleBeforeMount = (monaco: any) => {
    monaco.editor.defineTheme("quantum-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64748B", fontStyle: "italic" },
        { token: "keyword", foreground: "38BDF8", fontStyle: "bold" },
        { token: "keyword.python", foreground: "38BDF8", fontStyle: "bold" },
        { token: "string", foreground: "34D399" },
        { token: "string.escape", foreground: "F59E0B" },
        { token: "number", foreground: "F472B6" },
        { token: "type", foreground: "A78BFA" },
        { token: "identifier", foreground: "F1F5F9" },
        { token: "delimiter", foreground: "94A3B8" },
        { token: "operator", foreground: "38BDF8" },
      ],
      colors: {
        "editor.background": "#090A0D",
        "editor.foreground": "#F1F5F9",
        "editor.lineHighlightBackground": "#11141A",
        "editor.lineHighlightBorder": "#00000000",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#38BDF8",
        "editorIndentGuide.background1": "#1E293B",
        "editorIndentGuide.activeBackground1": "#38BDF8",
        "editorCursor.foreground": "#38BDF8",
        "editor.selectionBackground": "#0284C740",
        "editor.inactiveSelectionBackground": "#0284C720",
        "scrollbarSlider.background": "#33415530",
        "scrollbarSlider.hoverBackground": "#47556950",
      },
    });

    monaco.editor.defineTheme("quantum-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "94A3B8", fontStyle: "italic" },
        { token: "keyword", foreground: "0284C7", fontStyle: "bold" },
        { token: "keyword.python", foreground: "0284C7", fontStyle: "bold" },
        { token: "string", foreground: "059669" },
        { token: "number", foreground: "DB2777" },
        { token: "identifier", foreground: "0F172A" },
      ],
      colors: {
        "editor.background": "#FAFBFC",
        "editor.foreground": "#0F172A",
        "editor.lineHighlightBackground": "#F1F5F9",
      },
    });
  };

  // Feasibility status badge calculation
  const allConstraintsSatisfied =
    feasibilityResults.length > 0 && feasibilityResults.every((r) => r.satisfied === true);
  const anyConstraintViolated =
    feasibilityResults.length > 0 && feasibilityResults.some((r) => r.satisfied === false);

  // Formatted LaTeX for objective
  const renderedObjectiveLatex = useMemo(() => {
    if (!mathModel?.objectiveExpr) return "";
    const sense = (mathModel.objectiveSense || "Minimize").toLowerCase();
    const latexExpr = exprToLatex(mathModel.objectiveExpr);
    return `\\text{${sense}}_{\\mathbf{x}} \\quad \\mathcal{H}_{\\text{obj}}(\\mathbf{x}) = ${latexExpr}`;
  }, [mathModel?.objectiveExpr, mathModel?.objectiveSense]);

  return (
    <div className="w-full h-full min-w-0 max-w-full flex flex-row min-h-0 overflow-hidden font-mono text-xs">
      {/* ── LEFT PANE: All Tabs (Left 65%) ── */}
      <div
        style={{
          width: "65%",
          minWidth: 0,
          maxWidth: "65%",
          flexBasis: "65%",
          flexGrow: 1,
          flexShrink: 0,
          backgroundColor: isDark ? "#090A0D" : "#FFFFFF",
        }}
        className="h-full flex flex-col min-w-0 border-r border-white/[0.08] overflow-hidden enterprise-bg-layer-1"
      >
        {/* Tab Navigation Strip */}
        <div
          style={{
            backgroundColor: isDark ? "#090A0D" : "#F8FAFC",
          }}
          className={`w-full min-w-0 h-11 px-2 sm:px-3 border-b flex items-center justify-between text-xs font-mono shrink-0 ${
            isDark ? "border-white/[0.08]" : "border-slate-200"
          }`}
        >
        {/* Workflow Tabs: Model | Q Matrix | Solver strategy | Feasibility & presolve | Deploy | Code */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 overflow-x-auto no-scrollbar h-full min-w-0 flex-1">
          <button
            onClick={() => handleSelectTab("model")}
            className={`h-full px-1 sm:px-1.5 transition-colors flex items-center shrink-0 cursor-pointer border-b-2 -mb-px ${
              activeTab === "model"
                ? "border-sky-400 text-sky-300 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Model</span>
          </button>

          <span className={`h-3 w-px shrink-0 select-none ${isDark ? "bg-white/[0.08]" : "bg-slate-300"}`} />

          <button
            onClick={() => handleSelectTab("q_matrix")}
            className={`h-full px-1 sm:px-1.5 transition-colors flex items-center space-x-1 shrink-0 cursor-pointer border-b-2 -mb-px ${
              activeTab === "q_matrix"
                ? "border-sky-400 text-sky-300 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Q Matrix</span>
            {qMatrix && (
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                {qMatrix.size}×{qMatrix.size}
              </span>
            )}
          </button>

          <span className={`h-3 w-px shrink-0 select-none ${isDark ? "bg-white/[0.08]" : "bg-slate-300"}`} />

          <button
            onClick={() => handleSelectTab("solver")}
            className={`h-full px-1 sm:px-1.5 transition-colors flex items-center shrink-0 cursor-pointer border-b-2 -mb-px ${
              activeTab === "solver"
                ? "border-sky-400 text-sky-300 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Solver strategy</span>
          </button>

          <span className={`h-3 w-px shrink-0 select-none ${isDark ? "bg-white/[0.08]" : "bg-slate-300"}`} />

          <button
            onClick={() => handleSelectTab("feasibility")}
            className={`h-full px-1 sm:px-1.5 transition-colors flex items-center shrink-0 cursor-pointer border-b-2 -mb-px ${
              activeTab === "feasibility"
                ? "border-sky-400 text-sky-300 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Feasibility &amp; presolve</span>
          </button>

          <span className={`h-3 w-px shrink-0 select-none ${isDark ? "bg-white/[0.08]" : "bg-slate-300"}`} />

          <button
            onClick={() => handleSelectTab("deploy")}
            className={`h-full px-1 sm:px-1.5 transition-colors flex items-center shrink-0 cursor-pointer border-b-2 -mb-px ${
              activeTab === "deploy"
                ? "border-sky-400 text-sky-300 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Deploy</span>
          </button>

          <span className={`h-3 w-px shrink-0 select-none ${isDark ? "bg-white/[0.08]" : "bg-slate-300"}`} />

          <button
            onClick={() => handleSelectTab("code")}
            className={`h-full px-1 sm:px-1.5 transition-colors flex items-center space-x-1 shrink-0 cursor-pointer border-b-2 -mb-px ${
              activeTab === "code"
                ? "border-sky-400 text-sky-300 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-sky-400" />
            <span>Code Editor</span>
          </button>

          <span className={`h-3 w-px shrink-0 select-none ${isDark ? "bg-white/[0.08]" : "bg-slate-300"}`} />

          <button
            onClick={() => handleSelectTab("results")}
            className={`h-full px-1 sm:px-1.5 transition-colors flex items-center space-x-1 shrink-0 cursor-pointer border-b-2 -mb-px ${
              activeTab === "results"
                ? "border-sky-400 text-sky-300 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Result</span>
          </button>
        </div>
      </div>

      {/* ── TAB CONTENT BODY ── */}
      <div
        style={{
          backgroundColor: isDark ? "#0E0F13" : "#FFFFFF",
        }}
        className={`w-full min-w-0 max-w-full flex-1 min-h-0 ${
          activeTab === "code"
            ? "flex flex-col overflow-hidden p-0"
            : "overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-5 custom-scrollbar"
        }`}
      >
        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: MODEL                                                                     */}
        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "model" && (
          <div className="space-y-6">
            {/* Mathematical Model */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-zinc-400">Penalty (λ):</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={penaltyLambda}
                    onChange={(e) => handleInlinePenaltyChange(parseFloat(e.target.value) || 1.0)}
                    className={`w-20 px-2.5 py-1 text-xs font-mono rounded-lg border outline-none font-semibold transition-colors ${
                      isDark
                        ? "bg-[#13141A] border-white/[0.1] text-zinc-100 focus:border-sky-400"
                        : "bg-white border-slate-300 text-slate-900 focus:border-sky-500 shadow-xs"
                    }`}
                    title="Constraint penalty stiffness multiplier (λ)"
                  />
                  {qMatrix && qMatrix.penaltyWeight !== null && penaltyLambda !== qMatrix.penaltyWeight && (
                    <button
                      type="button"
                      onClick={onReSolve}
                      disabled={isSolving}
                      className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition-all cursor-pointer active:scale-95"
                      title="Apply modified penalty to recompile QUBO model"
                    >
                      <RotateCw className={`w-3 h-3 text-sky-400 ${isSolving ? "animate-spin" : ""}`} />
                      <span>{isSolving ? "Recompiling..." : "Apply & Recompile"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Rendered KaTeX Model */}
              {renderedObjectiveLatex ? (
                <div
                  style={{
                    backgroundColor: isDark ? "#13141A" : "#F8FAFC",
                  }}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 overflow-x-auto text-sm ${
                    isDark ? "border-white/[0.08]" : "border-slate-200"
                  }`}
                >
                  <LatexMath math={renderedObjectiveLatex} inline={false} isDark={isDark} />
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: isDark ? "#13141A" : "#F8FAFC",
                  }}
                  className={`p-6 rounded-xl border border-dashed text-center text-xs text-zinc-500 ${
                    isDark ? "border-white/[0.1]" : "border-slate-300"
                  }`}
                >
                  No model formulated yet.
                </div>
              )}
            </div>

            {/* Active Constraints List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">
                  Constraints ({mathModel?.constraints?.length || 0})
                </span>
                <button
                  onClick={() => setShowAddConstraint((prev) => !prev)}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-400" />
                  <span>Add constraint</span>
                </button>
              </div>

                {mathModel?.constraints?.length === 0 ? (
                  <div
                    style={{
                      backgroundColor: isDark ? "#13141A" : "#F8FAFC",
                    }}
                    className={`p-4 rounded-xl border border-dashed text-center text-xs text-zinc-500 ${
                      isDark ? "border-white/[0.08]" : "border-slate-200"
                    }`}
                  >
                    No constraints defined.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(mathModel?.constraints || []).map((c) => (
                      <div
                        key={c.id}
                        style={{
                          backgroundColor: isDark ? "#13141A" : "#FFFFFF",
                        }}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs font-mono ${
                          isDark ? "border-white/[0.08] hover:border-white/[0.14]" : "border-slate-200"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-zinc-200 block truncate">{c.name}</span>
                          <span className="text-zinc-400 text-[11px] block truncate">{c.leftExpr}</span>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-sky-400 font-bold">{c.op}</span>
                          <input
                            type="number"
                            step="0.5"
                            value={c.rightVal ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? null : parseFloat(e.target.value) || 0;
                              onUpdateMathModel((prev) => ({
                                ...prev,
                                constraints: prev.constraints.map((item) =>
                                  item.id === c.id ? { ...item, rightVal: val } : item
                                ),
                              }));
                            }}
                            className={`w-20 px-2 py-1 text-xs font-mono rounded border outline-none font-semibold ${
                              isDark
                                ? "bg-[#090A0D] border-white/[0.1] text-zinc-100"
                                : "bg-white border-slate-300 text-slate-900"
                            }`}
                          />
                          <button
                            onClick={() => handleDeleteConstraint(c.id)}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Remove constraint"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add constraint inline form */}
                {showAddConstraint && (
                  <form
                    onSubmit={handleAddConstraint}
                    className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/[0.03] space-y-3 font-mono text-xs"
                  >
                    <div className="font-semibold text-sky-400">Add new constraint</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Constraint label (e.g. Budget ceiling)"
                        value={newConstraintName}
                        onChange={(e) => setNewConstraintName(e.target.value)}
                        className="px-2.5 py-1.5 rounded border border-white/[0.1] bg-[#0D0F15] text-zinc-100 outline-none text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Expression (e.g. 2.0*x_0 + 3.5*x_1)"
                        value={newConstraintExpr}
                        onChange={(e) => setNewConstraintExpr(e.target.value)}
                        className="px-2.5 py-1.5 rounded border border-white/[0.1] bg-[#0D0F15] text-zinc-100 outline-none text-xs"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={newConstraintOp}
                        onChange={(e) => setNewConstraintOp(e.target.value as any)}
                        className="px-2.5 py-1.5 rounded border border-white/[0.1] bg-[#0D0F15] text-zinc-100 outline-none text-xs"
                      >
                        <option value="<=">&le; Less than or equal</option>
                        <option value=">=">&ge; Greater than or equal</option>
                        <option value="==">== Exact equality</option>
                      </select>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="RHS Bound"
                        value={newConstraintRhs}
                        onChange={(e) => setNewConstraintRhs(e.target.value)}
                        className="w-28 px-2.5 py-1.5 rounded border border-white/[0.1] bg-[#0D0F15] text-zinc-100 outline-none text-xs"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-black font-semibold cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddConstraint(false)}
                        className="px-2.5 py-1.5 rounded text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

            <div className="border-t border-white/[0.08]" />

            {/* Decision Variables Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-semibold text-zinc-200">
                  Variables ({variables.length})
                </h3>
              </div>

              {variables.length === 0 ? (
                <div
                  style={{
                    backgroundColor: isDark ? "#13141A" : "#F8FAFC",
                  }}
                  className={`p-6 rounded-xl border border-dashed text-center text-xs text-zinc-500 ${
                    isDark ? "border-white/[0.08]" : "border-slate-200"
                  }`}
                >
                  No variables defined yet.
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: isDark ? "#13141A" : "#FFFFFF",
                  }}
                  className="w-full min-w-0 max-w-full border border-white/[0.08] rounded-xl overflow-x-auto custom-scrollbar font-mono text-xs"
                >
                  <table className="w-full min-w-[460px] text-left border-collapse">
                    <thead
                      style={{
                        backgroundColor: isDark ? "#090A0D" : "#F8FAFC",
                      }}
                      className="text-zinc-400 border-b border-white/[0.08] text-[11px]"
                    >
                      <tr>
                        <th className="p-3">Symbol</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Domain</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Solution</th>
                      </tr>
                    </thead>
                    <tbody
                      style={{
                        backgroundColor: isDark ? "#13141A" : "#FFFFFF",
                      }}
                    >
                      {variables.map((v, i) => {
                        const solVal = execution?.solution ? execution.solution[v.name] : undefined;
                        const hasSol = solVal !== undefined;
                        const isSelected = solVal === 1;

                        return (
                          <tr
                            key={v.name}
                            className={`transition-colors hover:bg-white/[0.03] ${
                              i !== variables.length - 1 ? "border-b border-white/[0.04]" : ""
                            }`}
                          >
                            <td className="p-3 font-semibold text-sky-400">{v.name}</td>
                            <td className="p-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.05] text-zinc-300 border border-white/[0.06]">
                                {v.varType}
                              </span>
                            </td>
                            <td className="p-3 text-zinc-400">
                              [{v.lowerBound ?? 0}, {v.upperBound ?? 1}]
                            </td>
                            <td className="p-3 text-zinc-300 truncate max-w-[200px]">
                              {v.description || "Decision variable"}
                            </td>
                            <td className="p-3 text-right">
                              {hasSol ? (
                                <span
                                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                    isSelected
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-white/[0.04] text-zinc-500 border border-white/[0.06]"
                                  }`}
                                >
                                  {isSelected ? "1 (Selected)" : `${solVal} (Rejected)`}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[11px] bg-white/[0.02] text-zinc-600 border border-white/[0.04]">
                                  Unsolved
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: Q MATRIX (DEDICATED QUBO COUPLING MATRIX & HEATMAP)                        */}
        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "q_matrix" && (
          <div className="space-y-5">
            {!qMatrix ? (
              <div
                style={{
                  backgroundColor: isDark ? "#13141A" : "#F8FAFC",
                }}
                className="p-8 sm:p-12 rounded-xl border border-white/[0.08] flex flex-col items-center justify-center text-center space-y-3 font-mono"
              >
                <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-zinc-200">No QUBO matrix compiled yet</div>
              </div>
            ) : (
              <>
                {/* Header Metrics Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-mono font-semibold text-zinc-200 flex items-center space-x-2">
                      <span>QUBO Matrix</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        {qMatrix.size} × {qMatrix.size}
                      </span>
                    </h3>
                  </div>

                  {/* Export Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={handleExportCsv}
                      className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      title="Copy Q Matrix as CSV"
                    >
                      {copiedKey === "csv_copied" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied CSV</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy CSV</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadJson}
                      className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 transition-colors cursor-pointer"
                      title="Download Q Matrix JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download JSON</span>
                    </button>
                  </div>
                </div>

                {/* Hardware & QUBO Stats Strip */}
                <div
                  style={{
                    backgroundColor: isDark ? "#13141A" : "#F8FAFC",
                  }}
                  className="w-full min-w-0 p-3.5 rounded-xl border border-white/[0.08] grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono"
                >
                  <div>
                    <span className="text-[10px] block text-zinc-500">Logical qubits (N)</span>
                    <span className="font-semibold text-zinc-100">{qMatrix.size}</span>
                  </div>
                  <div>
                    <span className="text-[10px] block text-zinc-500">Non-zero couplers</span>
                    <span className="font-semibold text-sky-400">{qMatrix.nnz}</span>
                  </div>
                  <div>
                    <span className="text-[10px] block text-zinc-500">Coupling density</span>
                    <span className="font-semibold text-zinc-200">
                      {((qMatrix.nnz / (qMatrix.size * qMatrix.size || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] block text-zinc-500">Variables split</span>
                    <span className="font-semibold text-zinc-200">
                      <span className="text-sky-400">{qMatrix.decisionCount} dec</span>
                      <span className="text-zinc-500"> / </span>
                      <span className="text-amber-400">{qMatrix.slackCount} slack</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] block text-zinc-500">Penalty weight (λ)</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-amber-400">
                        {(qMatrix.penaltyWeight ?? penaltyLambda).toFixed(1)}
                      </span>
                      {qMatrix.penaltyWeight !== null && penaltyLambda !== qMatrix.penaltyWeight && (
                        <button
                          type="button"
                          onClick={onReSolve}
                          disabled={isSolving}
                          className="text-[10px] text-sky-400 hover:text-sky-300 underline cursor-pointer font-mono"
                          title="Click to apply modified penalty"
                        >
                          (Pending: {penaltyLambda.toFixed(1)} · Recompile)
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] block text-zinc-500">Hamiltonian offset</span>
                    <span className="font-semibold text-zinc-300">{(qMatrix.offset ?? 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Heatmap Visual Matrix Section */}
                <div
                  style={{
                    backgroundColor: isDark ? "#13141A" : "#FFFFFF",
                  }}
                  className="p-4 rounded-xl border border-white/[0.08] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">
                      Coupling Heatmap
                    </span>
                    <div className="flex items-center space-x-3 text-[10px] text-zinc-400">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-xs bg-sky-400/80" />
                        <span>Negative</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-xs bg-amber-400/80" />
                        <span>Positive</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-xs border border-sky-400/60 bg-transparent" />
                        <span>Diagonal</span>
                      </div>
                    </div>
                  </div>

                  {/* Matrix Grid Container */}
                  <div className="overflow-x-auto max-h-[380px] custom-scrollbar border border-white/[0.06] rounded-lg p-2 bg-[#090A0D]">
                    <div
                      className="grid gap-1"
                      style={{
                        gridTemplateColumns: `auto repeat(${qMatrix.size}, minmax(28px, 1fr))`,
                        minWidth: `${(qMatrix.size + 1) * 32}px`,
                      }}
                    >
                      {/* Top Header Corner */}
                      <div className="h-6 w-14 text-[9px] text-zinc-600 flex items-center justify-center sticky left-0 bg-[#090A0D] z-10 font-bold">
                        i \ j
                      </div>

                      {/* Column Headers */}
                      {qMatrix.variables.map((v, j) => (
                        <div
                          key={`col_${j}`}
                          title={v.name}
                          className={`h-6 text-[9px] truncate flex items-center justify-center font-bold px-0.5 ${
                            v.kind === "decision" ? "text-sky-400" : "text-amber-400/80"
                          }`}
                        >
                          {v.name.length > 5 ? v.name.slice(0, 5) : v.name}
                        </div>
                      ))}

                      {/* Matrix Rows */}
                      {qMatrix.variables.map((rowVar, i) => (
                        <React.Fragment key={`row_${i}`}>
                          {/* Row Header */}
                          <div
                            title={rowVar.name}
                            className={`h-7 w-14 text-[9px] truncate flex items-center pr-1.5 font-bold sticky left-0 bg-[#090A0D] z-10 ${
                              rowVar.kind === "decision" ? "text-sky-400" : "text-amber-400/80"
                            }`}
                          >
                            {rowVar.name.length > 6 ? rowVar.name.slice(0, 6) : rowVar.name}
                          </div>

                          {/* Row Cells */}
                          {qMatrix.variables.map((colVar, j) => {
                            const val = matrixMap.get(`${i}_${j}`) ?? matrixMap.get(`${j}_${i}`) ?? 0;
                            const isDiagonal = i === j;
                            const absVal = Math.abs(val);
                            const intensity = Math.min(1, absVal / maxMagnitude);

                            let bg = "rgba(255, 255, 255, 0.02)";
                            if (val > 0) {
                              bg = `rgba(245, 158, 11, ${Math.max(0.18, intensity * 0.85)})`;
                            } else if (val < 0) {
                              bg = `rgba(56, 189, 248, ${Math.max(0.18, intensity * 0.85)})`;
                            }

                            return (
                              <button
                                key={`cell_${i}_${j}`}
                                onClick={() => setSelectedCell({ i, j, val })}
                                title={`Q[${rowVar.name}, ${colVar.name}] = ${val.toFixed(4)}${
                                  isDiagonal ? " (Linear bias)" : ""
                                }`}
                                style={{ backgroundColor: bg }}
                                className={`h-7 rounded-xs transition-transform hover:scale-110 flex items-center justify-center text-[8px] font-mono cursor-pointer ${
                                  isDiagonal
                                    ? "border border-sky-400/50 shadow-xs"
                                    : "border border-white/[0.04]"
                                } ${val !== 0 ? "text-white font-bold" : "text-zinc-600 font-normal"}`}
                              >
                                {val !== 0 ? (absVal >= 10 ? absVal.toFixed(0) : absVal.toFixed(1)) : "·"}
                              </button>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Selected Cell Inspector */}
                  {selectedCell && (
                    <div className="p-2.5 rounded-lg bg-sky-500/[0.06] border border-sky-500/20 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center space-x-2">
                        <span className="text-zinc-400">Selected:</span>
                        <span className="font-bold text-sky-400">
                          Q[{qMatrix.variables[selectedCell.i]?.name}, {qMatrix.variables[selectedCell.j]?.name}]
                        </span>
                        <span className="text-zinc-500">
                          ({selectedCell.i === selectedCell.j ? "Linear bias" : "Quadratic coupler"})
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-zinc-400">Weight:</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded ${
                            selectedCell.val > 0
                              ? "bg-amber-500/20 text-amber-300"
                              : selectedCell.val < 0
                              ? "bg-sky-500/20 text-sky-300"
                              : "bg-white/[0.05] text-zinc-400"
                          }`}
                        >
                          {selectedCell.val.toFixed(6)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Couplings Table Section */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-mono font-semibold text-zinc-200">
                        Couplings ({filteredCouplings.length})
                      </h4>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Filter by kind: All / Decision only / Slack only */}
                      <div className="flex items-center rounded-lg border border-white/[0.08] p-0.5 bg-[#090A0D] text-[11px]">
                        <button
                          onClick={() => setQFilterKind("all")}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            qFilterKind === "all" ? "bg-white/[0.1] text-white" : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setQFilterKind("decision")}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            qFilterKind === "decision"
                              ? "bg-sky-500/20 text-sky-300"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          Decision
                        </button>
                        <button
                          onClick={() => setQFilterKind("slack")}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            qFilterKind === "slack"
                              ? "bg-amber-500/20 text-amber-300"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          Slack
                        </button>
                      </div>

                      {/* Search Input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search variable..."
                          value={qSearch}
                          onChange={(e) => setQSearch(e.target.value)}
                          className="pl-8 pr-2.5 py-1 text-xs rounded-lg border border-white/[0.08] bg-[#090A0D] text-zinc-200 outline-none w-36 sm:w-44"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Couplings Table */}
                  <div
                    style={{
                      backgroundColor: isDark ? "#13141A" : "#FFFFFF",
                    }}
                    className="w-full min-w-0 max-w-full border border-white/[0.08] rounded-xl overflow-x-auto custom-scrollbar font-mono text-xs max-h-[320px]"
                  >
                    <table className="w-full min-w-[500px] text-left border-collapse">
                      <thead
                        style={{
                          backgroundColor: isDark ? "#090A0D" : "#F8FAFC",
                        }}
                        className="text-zinc-400 border-b border-white/[0.08] text-[11px] sticky top-0 z-10"
                      >
                        <tr>
                          <th className="p-3">Variable A</th>
                          <th className="p-3">Variable B</th>
                          <th className="p-3">Type</th>
                          <th className="p-3 text-right">Weight</th>
                        </tr>
                      </thead>
                      <tbody
                        style={{
                          backgroundColor: isDark ? "#13141A" : "#FFFFFF",
                        }}
                      >
                        {filteredCouplings.map((e, idx) => {
                          const varA = qMatrix.variables[e.i];
                          const varB = qMatrix.variables[e.j];
                          const isLinear = e.i === e.j;

                          return (
                            <tr
                              key={`${e.i}_${e.j}_${idx}`}
                              className={`transition-colors hover:bg-white/[0.03] ${
                                idx !== filteredCouplings.length - 1 ? "border-b border-white/[0.04]" : ""
                              }`}
                            >
                              <td className="p-3">
                                <span className="font-semibold text-sky-400">{varA?.name || `q_${e.i}`}</span>
                                <span
                                  className={`ml-2 px-1.5 py-0.2 rounded text-[10px] ${
                                    varA?.kind === "decision"
                                      ? "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                                      : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                  }`}
                                >
                                  {varA?.kind}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="font-semibold text-sky-400">{varB?.name || `q_${e.j}`}</span>
                                <span
                                  className={`ml-2 px-1.5 py-0.2 rounded text-[10px] ${
                                    varB?.kind === "decision"
                                      ? "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                                      : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                  }`}
                                >
                                  {varB?.kind}
                                </span>
                              </td>
                              <td className="p-3 text-zinc-400">
                                {isLinear ? (
                                  <span className="text-sky-300">Linear (h_i)</span>
                                ) : (
                                  <span className="text-zinc-400">Quadratic (J_ij)</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <span
                                  className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                                    e.value > 0
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                      : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                  }`}
                                >
                                  {e.value > 0 ? `+${e.value.toFixed(4)}` : e.value.toFixed(4)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: SOLVER STRATEGY & PARALLEL QUANTUM VS. CLASSICAL BENCHMARK                */}
        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "solver" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold text-zinc-200">
                Parallel Quantum vs. Classical Solver Benchmark
              </h3>
              {execution?.solverComparison?.verdict_badge && (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.14] text-zinc-100 font-semibold">
                  {execution.solverComparison.verdict_badge}
                </span>
              )}
            </div>

            {execution?.solverComparison ? (
              <div className="space-y-4 font-mono text-xs">
                {/* Comparative AI Verdict Card */}
                <div
                  style={{
                    backgroundColor: isDark ? "#111216" : "#F8FAFC",
                  }}
                  className="p-4 rounded-xl border border-white/[0.1] space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-zinc-100">
                      Comparative Optimality &amp; Feasibility Verdict
                    </span>
                    <div className="flex items-center space-x-2 text-zinc-400">
                      <span>
                        Optimality Gap:{" "}
                        <strong className="text-zinc-100">
                          {execution.solverComparison.optimality_gap_pct !== null
                            ? `${execution.solverComparison.optimality_gap_pct.toFixed(2)}%`
                            : "—"}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Decision Overlap:{" "}
                        <strong className="text-zinc-100">
                          {execution.solverComparison.decision_overlap_pct !== null
                            ? `${execution.solverComparison.decision_overlap_pct}%`
                            : "—"}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {execution.solverComparison.summary}
                  </p>
                </div>

                {/* Head-to-Head Side-by-Side Comparison Table */}
                <div
                  style={{
                    backgroundColor: isDark ? "#13141A" : "#FFFFFF",
                  }}
                  className="w-full border border-white/[0.08] rounded-xl overflow-x-auto custom-scrollbar"
                >
                  <table className="w-full min-w-[500px] text-left border-collapse text-xs">
                    <thead
                      style={{
                        backgroundColor: isDark ? "#090A0D" : "#F8FAFC",
                      }}
                      className="text-zinc-400 border-b border-white/[0.08] text-[11px]"
                    >
                      <tr>
                        <th className="p-3">Metric</th>
                        <th className="p-3">Quantum Annealing (D-Wave QUBO)</th>
                        <th className="p-3">Classical Exact (Google OR-Tools CP-SAT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      <tr>
                        <td className="p-3 text-zinc-400">Convergence Status</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              execution.solverComparison.quantum.feasible
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/25"
                            }`}
                          >
                            {execution.solverComparison.quantum.feasible ? "FEASIBLE" : "BOUNDARY VIOLATION"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              execution.solverComparison.classical.feasible
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/25"
                            }`}
                          >
                            {execution.solverComparison.classical.status}
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td className="p-3 text-zinc-400">Objective Value</td>
                        <td className="p-3 font-semibold text-zinc-100">
                          {execution.solverComparison.quantum.objective_value ?? "—"}
                        </td>
                        <td className="p-3 font-semibold text-zinc-100">
                          {execution.solverComparison.classical.objective_value ?? "—"}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-3 text-zinc-400">Constraints Satisfied</td>
                        <td className="p-3 text-zinc-200">
                          {execution.solverComparison.quantum.constraints_satisfied} /{" "}
                          {execution.solverComparison.quantum.constraints_total}
                        </td>
                        <td className="p-3 text-zinc-200">
                          {execution.solverComparison.classical.constraints_satisfied} /{" "}
                          {execution.solverComparison.classical.constraints_total}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-3 text-zinc-400">Execution Latency</td>
                        <td className="p-3 text-zinc-200">
                          {execution.solverComparison.quantum.solve_time_ms ?? "—"} ms{" "}
                          <span className="text-zinc-500 text-[10px]">(1,000 annealing reads)</span>
                        </td>
                        <td className="p-3 text-zinc-200">
                          {execution.solverComparison.classical.solve_time_ms ?? "—"} ms{" "}
                          <span className="text-zinc-500 text-[10px]">(Branch-and-cut CP-SAT)</span>
                        </td>
                      </tr>

                      <tr>
                        <td className="p-3 text-zinc-400">Formulation Mechanism</td>
                        <td className="p-3 text-zinc-300 text-[11px]">
                          Unconstrained Penalty QUBO (λ = {execution.solverComparison.quantum.penalty_lambda ?? penaltyLambda},{" "}
                          {execution.solverComparison.quantum.logical_qubits ?? "—"} qubits)
                        </td>
                        <td className="p-3 text-zinc-300 text-[11px]">
                          Hard Linear / Integer Constraints (0 slack bits)
                        </td>
                      </tr>

                      <tr>
                        <td className="p-3 text-zinc-400 align-top">Active Decisions (x = 1)</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {execution.solverComparison.quantum.selected_variables.length > 0 ? (
                              execution.solverComparison.quantum.selected_variables.map((v, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded text-[10px] bg-white/[0.06] border border-white/[0.1] text-zinc-200"
                                >
                                  {v}
                                </span>
                              ))
                            ) : (
                              <span className="text-zinc-500 italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {execution.solverComparison.classical.selected_variables.length > 0 ? (
                              execution.solverComparison.classical.selected_variables.map((v, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded text-[10px] bg-white/[0.06] border border-white/[0.1] text-zinc-200"
                                >
                                  {v}
                                </span>
                              ))
                            ) : (
                              <span className="text-zinc-500 italic">None</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td className="p-3 text-zinc-400">Compiled Script</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCodeFile("solution.py");
                              handleSelectTab("code");
                            }}
                            className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-zinc-100 text-[11px] cursor-pointer transition-colors"
                          >
                            Open solution.py →
                          </button>
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCodeFile("ortools_baseline.py");
                              handleSelectTab("code");
                            }}
                            className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-zinc-100 text-[11px] cursor-pointer transition-colors"
                          >
                            Open ortools_baseline.py →
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: isDark ? "#13141A" : "#F8FAFC",
                }}
                className="p-6 rounded-xl border border-dashed border-white/[0.1] text-center text-xs text-zinc-500"
              >
                Run a problem in Copilot or click &quot;Recompile &amp; Solve&quot; to generate the parallel D-Wave QUBO vs. Google OR-Tools CP-SAT benchmark.
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: FEASIBILITY & PRESOLVE                                                    */}
        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "feasibility" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold text-zinc-200">
                Constraint Presolve
              </h3>

              {feasibilityResults.length > 0 && (
                <span
                  className={`text-xs font-mono px-2.5 py-0.5 rounded-full flex items-center space-x-1.5 ${
                    allConstraintsSatisfied
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : anyConstraintViolated
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : "bg-white/[0.04] text-zinc-400 border border-white/[0.08]"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    {allConstraintsSatisfied
                      ? "Feasible"
                      : anyConstraintViolated
                      ? "Violated"
                      : "Pending"}
                  </span>
                </span>
              )}
            </div>

            {feasibilityResults.length === 0 ? (
              <div
                style={{
                  backgroundColor: isDark ? "#13141A" : "#F8FAFC",
                }}
                className={`p-8 rounded-xl border border-dashed text-center text-xs text-zinc-500 ${
                  isDark ? "border-white/[0.08]" : "border-slate-200"
                }`}
              >
                No constraints evaluated yet.
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: isDark ? "#13141A" : "#FFFFFF",
                }}
                className="w-full min-w-0 max-w-full border border-white/[0.08] rounded-xl overflow-x-auto custom-scrollbar font-mono text-xs"
              >
                <table className="w-full min-w-[500px] text-left border-collapse">
                  <thead
                    style={{
                      backgroundColor: isDark ? "#090A0D" : "#F8FAFC",
                    }}
                    className="text-zinc-400 border-b border-white/[0.08] text-[11px]"
                  >
                    <tr>
                      <th className="p-3">Constraint</th>
                      <th className="p-3">Evaluated LHS</th>
                      <th className="p-3">Bound</th>
                      <th className="p-3">Slack</th>
                      <th className="p-3">Slack bits</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody
                    style={{
                      backgroundColor: isDark ? "#13141A" : "#FFFFFF",
                    }}
                  >
                    {feasibilityResults.map((r, i) => (
                      <tr
                        key={i}
                        className={`transition-colors hover:bg-white/[0.03] ${
                          i !== feasibilityResults.length - 1 ? "border-b border-white/[0.04]" : ""
                        }`}
                      >
                        <td className="p-3">
                          <span className="font-semibold text-zinc-200 block">{r.name}</span>
                          <span className="text-[10px] text-zinc-500 block truncate max-w-[200px]">
                            {r.lhsFormula}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-sky-400">
                          {r.computedLhs !== null ? r.computedLhs.toFixed(1) : "—"}
                        </td>
                        <td className="p-3 text-zinc-300">
                          {r.op} {r.rhs !== null ? r.rhs.toFixed(1) : "—"}
                        </td>
                        <td className="p-3 text-zinc-300">
                          {r.slack !== null ? r.slack.toFixed(1) : "—"}
                        </td>
                        <td className="p-3 text-zinc-400">
                          {r.slackBits !== null ? `${r.slackBits} bits` : "—"}
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              r.satisfied === true
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : r.satisfied === false
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-white/[0.04] text-zinc-500 border border-white/[0.06]"
                            }`}
                          >
                            {r.satisfied === true ? "Satisfied" : r.satisfied === false ? "Violated" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: DEPLOY                                                                    */}
        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "deploy" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold text-zinc-200">
                Deploy
              </h3>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Coming soon
              </span>
            </div>

            <div
              style={{
                backgroundColor: isDark ? "#13141A" : "#F8FAFC",
              }}
              className="p-8 sm:p-12 rounded-xl border border-white/[0.08] flex flex-col items-center justify-center text-center space-y-3 font-mono"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-zinc-200">Feature coming soon, stay tuned</div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 6: CODE EDITOR (MONACO CODE STUDIO)                                          */}
        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "code" && (
          <div
            style={{
              backgroundColor: isDark ? "#090A0D" : "#FAFBFC",
            }}
            className="flex flex-col h-full min-h-0 w-full overflow-hidden"
          >
            {/* Editor Toolbar Header */}
            <div
              style={{
                backgroundColor: isDark ? "#090A0D" : "#F8FAFC",
              }}
              className={`w-full min-w-0 h-11 px-3 sm:px-4 border-b flex items-center justify-between text-xs font-mono shrink-0 ${
                isDark ? "border-white/[0.08]" : "border-slate-200"
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setActiveCodeFile("solution.py")}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer border ${
                    activeCodeFile === "solution.py"
                      ? isDark
                        ? "bg-white/[0.08] text-zinc-100 border-white/[0.2] font-semibold"
                        : "bg-slate-200 text-slate-900 border-slate-400 font-semibold"
                      : isDark
                      ? "bg-transparent hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200 border-transparent"
                      : "bg-transparent hover:bg-slate-100 text-slate-600 border-transparent"
                  }`}
                  title="D-Wave Quantum Annealing / AutoQUBO Script"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>solution.py (Quantum QUBO)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCodeFile("ortools_baseline.py")}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer border ${
                    activeCodeFile === "ortools_baseline.py"
                      ? isDark
                        ? "bg-white/[0.08] text-zinc-100 border-white/[0.2] font-semibold"
                        : "bg-slate-200 text-slate-900 border-slate-400 font-semibold"
                      : isDark
                      ? "bg-transparent hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200 border-transparent"
                      : "bg-transparent hover:bg-slate-100 text-slate-600 border-transparent"
                  }`}
                  title="Deterministic Google OR-Tools CP-SAT Classical Baseline"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>ortools_baseline.py (OR-Tools)</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {/* Inline Penalty λ Control synced live with solution.py */}
                <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.08]">
                  <span className="text-[11px] text-zinc-400">λ:</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={penaltyLambda}
                    onChange={(e) => handleInlinePenaltyChange(parseFloat(e.target.value) || 1.0)}
                    className={`w-14 px-1.5 py-0.5 text-[11px] font-mono rounded border outline-none font-semibold ${
                      isDark
                        ? "bg-[#111216] border-white/[0.12] text-zinc-100 focus:border-white/[0.3]"
                        : "bg-white border-slate-300 text-slate-900"
                    }`}
                    title="QUBO Constraint Penalty Multiplier (λ) — live-updates solution.py"
                  />
                </div>
              </div>
            </div>

            {/* Monaco Editor Container */}
            <div
              style={{
                backgroundColor: isDark ? "#090A0D" : "#FAFBFC",
              }}
              className="w-full min-w-0 max-w-full flex-1 relative overflow-hidden min-h-[160px]"
            >
              <MonacoEditor
                height="100%"
                width="100%"
                language="python"
                theme={isDark ? "quantum-dark" : "quantum-light"}
                beforeMount={handleBeforeMount}
                value={activeEditorCode}
                onChange={(val) => {
                  if (activeCodeFile === "ortools_baseline.py") {
                    onChangeOrtoolsCode?.(val || "");
                  } else {
                    onChangeCode(val || "");
                  }
                }}
                options={{
                  fontSize: 12,
                  fontFamily: "JetBrains Mono, Menlo, monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: "on",
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: "on",
                }}
              />
            </div>

            {/* Collapsible Terminal Drawer */}
            {showTerminal && (
              <div
                style={{
                  backgroundColor: isDark ? "#07080B" : "#F1F5F9",
                }}
                className={`w-full h-44 sm:h-48 border-t flex flex-col shrink-0 overflow-hidden font-mono text-xs ${
                  isDark ? "border-white/[0.08]" : "border-slate-200"
                }`}
              >
                {/* Terminal Header */}
                <div
                  style={{
                    backgroundColor: isDark ? "#090A0D" : "#E2E8F0",
                  }}
                  className={`h-7 px-3 border-b flex items-center justify-between shrink-0 select-none ${
                    isDark ? "border-white/[0.06] text-zinc-400" : "border-slate-300 text-slate-700"
                  }`}
                >
                  <div className="flex items-center space-x-2 text-[11px]">
                    <span className="font-semibold text-zinc-200 flex items-center space-x-1.5">
                      <Terminal className="w-3.5 h-3.5 text-sky-400" />
                      <span>Terminal</span>
                    </span>
                    <span className="text-[10px] text-zinc-500">stdout / stderr</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {execution && (
                      <button
                        type="button"
                        onClick={() => handleSelectTab("results")}
                        className="px-2 py-0.5 rounded text-[10px] bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-zinc-100 transition-colors cursor-pointer"
                        title="Open side-by-side Quantum vs. OR-Tools Result comparison"
                      >
                        View Result Comparison →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setTerminalLogs(() => [])}
                      className="px-1.5 py-0.5 rounded text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
                      title="Clear terminal"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTerminal(false)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
                      title="Hide terminal"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Terminal Output */}
                <div className="flex-1 p-2.5 overflow-y-auto space-y-1 text-[11px] leading-relaxed custom-scrollbar select-text">
                  {terminalLogs.length === 0 ? (
                    <div className="text-zinc-600 text-[10px]">No execution logs yet. Click &quot;Run code&quot; to execute.</div>
                  ) : (
                    terminalLogs.map((log, idx) => {
                      const isPrompt = log.startsWith(">");
                      const isOk = log.startsWith("[OK]") || log.includes("optimal") || log.includes("Optimal");
                      const isErr = log.startsWith("[ERROR]") || log.startsWith("[FAIL]") || log.startsWith("[STDERR]");
                      return (
                        <div
                          key={idx}
                          className={`${
                            isPrompt
                              ? "text-sky-300 font-semibold"
                              : isOk
                              ? "text-emerald-400"
                              : isErr
                              ? "text-rose-400"
                              : "text-zinc-300"
                          }`}
                        >
                          {log}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Status Bar */}
            <div
              style={{
                backgroundColor: isDark ? "#090A0D" : "#F8FAFC",
              }}
              className={`h-7 px-3 border-t flex items-center justify-between text-[11px] font-mono shrink-0 select-none ${
                isDark ? "border-white/[0.08] text-zinc-400" : "border-slate-200 text-slate-600"
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-zinc-500 text-[10px]">Python 3.11</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500 text-[10px]">
                  {activeCodeFile === "ortools_baseline.py"
                    ? "ortools.sat.python.cp_model (CP-SAT)"
                    : "dimod / dwave-neal (QUBO)"}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setShowTerminal((prev) => !prev)}
                  className="px-2 py-0.5 rounded text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Terminal className="w-3 h-3 text-sky-400" />
                  <span>Terminal {showTerminal ? "(hide)" : "(show)"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 7: RESULT (CLEAN 3-ZONE EXECUTIVE SUMMARY & PARALLEL BENCHMARK)              */}
        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "results" && (
          <div className="space-y-6 text-xs">
            {!execution ? (
              <div
                style={{
                  backgroundColor: isDark ? "#0C0D11" : "#F8FAFC",
                }}
                className="p-10 rounded-xl border border-dashed border-white/[0.1] text-center space-y-2"
              >
                <div className="text-sm font-medium text-zinc-200 font-sans">No execution results yet</div>
                <p className="text-xs text-zinc-500 font-sans">
                  Run a problem in Copilot or select an action from the <span className="text-zinc-300 font-mono">Solve</span> menu in the top bar.
                </p>
              </div>
            ) : (() => {
              const comp = execution.solverComparison;
              const qNotRun = comp?.quantum?.status === "NOT_RUN";
              const cNotRun = comp?.classical?.status === "NOT_RUN";
              const totalConstraints = mathModel?.constraints?.length || comp?.quantum?.constraints_total || 0;
              const isTrivialZero =
                totalConstraints === 0 &&
                (execution.selectedVariables?.length || 0) === 0 &&
                (execution.objectiveValue === null || Math.abs(execution.objectiveValue) < 1e-6);

              const bothFeasible = Boolean(
                !isTrivialZero &&
                (comp
                  ? qNotRun
                    ? comp.classical.feasible
                    : cNotRun
                    ? comp.quantum.feasible
                    : comp.quantum.feasible && comp.classical.feasible
                  : execution.feasible)
              );

              const verdictTitle = isTrivialZero
                ? "Unconstrained Trivial Zero State"
                : comp?.verdict_badge
                ? comp.verdict_badge
                : execution.feasible
                ? "Feasible Solution Found"
                : "Constraint Bounds Infeasible";

              const normalizedCompSummary = comp?.summary
                ? comp.summary
                    .replace(
                      /D-Wave QUBO \(Penalty = ([^)]+)\)/g,
                      `D-Wave QUBO (Energy = ${typeof execution.energy === "number" ? execution.energy.toFixed(2) : "$1"})`
                    )
                    .replace(/Click "Recompile & Solve"/g, 'Select "Compile" from the Solve menu')
                : null;

              const verdictSubtitle = isTrivialZero
                ? "No constraints were compiled into this model (0/0). Re-submit the problem or add constraints in the Model tab."
                : normalizedCompSummary
                ? normalizedCompSummary
                : execution.feasible
                ? `Solver converged across ${typeof execution.numReads === "number" ? execution.numReads.toLocaleString() : "1,000"} annealing reads with penalty stiffness λ = ${execution.penaltyWeight ?? penaltyLambda}.`
                : `Solver could not satisfy all constraints at λ = ${execution.penaltyWeight ?? penaltyLambda}. Adjust λ or inspect constraint bounds.`;

              const allRows: Array<{ name: string; qVal: number; cVal: number | null }> = (
                Object.keys(execution.solution || {}).length > 0
                  ? Object.entries(execution.solution || {})
                  : variables.map((v) => [
                      v.name,
                      execution.selectedVariables?.includes(v.name) ? 1 : 0,
                    ] as [string, number])
              ).map(([name, qVal]) => ({
                name,
                qVal: Number(qVal),
                cVal: comp
                  ? comp.classical.selected_variables?.includes(name)
                    ? 1
                    : 0
                  : null,
              }));

              const activeRows = allRows.filter((r) => r.qVal > 0 || (r.cVal !== null && r.cVal > 0));
              const displayedRows = resultVarFilter === "active" && activeRows.length > 0 ? activeRows : allRows;

              const qObjDisplay =
                typeof (comp?.quantum?.objective_value ?? execution.objectiveValue) === "number"
                  ? Number(comp?.quantum?.objective_value ?? execution.objectiveValue).toFixed(2)
                  : "—";
              const qEnergyDisplay =
                typeof execution.energy === "number" ? execution.energy.toFixed(2) : null;
              const showEnergyNote =
                qEnergyDisplay !== null &&
                qObjDisplay !== "—" &&
                Math.abs(Number(execution.energy) - Number(comp?.quantum?.objective_value ?? execution.objectiveValue)) > 0.01;

              const cObjDisplay =
                typeof comp?.classical?.objective_value === "number"
                  ? comp.classical.objective_value.toFixed(2)
                  : "—";

              const fmtMs = (ms: number | null | undefined) => {
                if (typeof ms !== "number") return "—";
                return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
              };

              return (
                <>
                  {/* ── ZONE 1: SINGLE HERO VERDICT BANNER ── */}
                  <div className="pb-5 border-b border-white/[0.08] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            bothFeasible ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                        />
                        <h3 className={`text-sm sm:text-base font-semibold font-sans tracking-tight ${isDark ? "text-zinc-100" : "text-slate-900"}`}>
                          {verdictTitle}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] font-mono text-zinc-500">
                        <span>λ = {execution.penaltyWeight ?? penaltyLambda}</span>
                        <span>·</span>
                        <span>{typeof execution.numReads === "number" ? execution.numReads.toLocaleString() : "1,000"} reads</span>
                      </div>
                    </div>
                    <p className="text-[13px] text-zinc-400 leading-relaxed font-sans max-w-3xl">
                      {verdictSubtitle}
                    </p>
                  </div>

                  {/* ── ZONE 2: CLEAN 2-COLUMN SOLVER COMPARISON (HAIRLINE DIVIDER, ZERO NESTED BOXES) ── */}
                  <div
                    style={{ backgroundColor: isDark ? "#0C0D11" : "#F8FAFC" }}
                    className="rounded-xl border border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08]"
                  >
                    {/* Left: Quantum (D-Wave QUBO) */}
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-400 font-sans">
                          Quantum Annealing (D-Wave QUBO)
                        </span>
                        <span
                          className={`text-[11px] font-mono font-medium ${
                            qNotRun
                              ? "text-zinc-500"
                              : (comp ? comp.quantum.feasible : execution.feasible) && !isTrivialZero
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}
                        >
                          {qNotRun
                            ? "Not run"
                            : isTrivialZero
                            ? "Unconstrained"
                            : (comp ? comp.quantum.feasible : execution.feasible)
                            ? "Feasible"
                            : "Suboptimal"}
                        </span>
                      </div>

                      <div className="flex items-baseline space-x-2.5">
                        <span className={`text-2xl font-semibold font-mono tracking-tight ${isDark ? "text-zinc-100" : "text-slate-900"}`}>
                          {qObjDisplay}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-sans">objective</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-zinc-400 pt-1">
                        <span>
                          Constraints:{" "}
                          <strong className="text-zinc-200 font-medium">
                            {comp
                              ? `${comp.quantum.constraints_satisfied}/${comp.quantum.constraints_total}`
                              : `${execution.feasible ? totalConstraints : 0}/${totalConstraints}`}
                          </strong>
                        </span>
                        <span>
                          Time:{" "}
                          <strong className="text-zinc-200 font-medium">
                            {fmtMs(comp?.quantum?.solve_time_ms)}
                          </strong>
                        </span>
                        {showEnergyNote && (
                          <span className="text-zinc-500" title="Raw QUBO Hamiltonian energy including penalty">
                            Energy: {qEnergyDisplay}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Classical (Google OR-Tools CP-SAT) */}
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-400 font-sans">
                          Classical Exact (Google OR-Tools)
                        </span>
                        <span
                          className={`text-[11px] font-mono font-medium ${
                            comp && !cNotRun
                              ? comp.classical.feasible && !isTrivialZero
                                ? "text-emerald-400"
                                : "text-amber-400"
                              : "text-zinc-500"
                          }`}
                        >
                          {comp && !cNotRun ? (isTrivialZero ? "Unconstrained" : comp.classical.status) : "Not run"}
                        </span>
                      </div>

                      <div className="flex items-baseline space-x-2.5">
                        <span className={`text-2xl font-semibold font-mono tracking-tight ${isDark ? "text-zinc-100" : "text-slate-900"}`}>
                          {cObjDisplay}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-sans">objective</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-zinc-400 pt-1">
                        <span>
                          Constraints:{" "}
                          <strong className="text-zinc-200 font-medium">
                            {comp
                              ? `${comp.classical.constraints_satisfied}/${comp.classical.constraints_total}`
                              : `—/${totalConstraints}`}
                          </strong>
                        </span>
                        <span>
                          Time:{" "}
                          <strong className="text-zinc-200 font-medium">
                            {fmtMs(comp?.classical?.solve_time_ms)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── ZONE 3: UNIFIED DECISION VARIABLES TABLE (ACTIVE FILTER, NO REDUNDANT PILLS) ── */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-300 font-sans">
                        Decision Variables
                      </span>
                      <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] font-sans text-[11px]">
                        <button
                          type="button"
                          onClick={() => setResultVarFilter("active")}
                          className={`px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                            resultVarFilter === "active"
                              ? "bg-white/[0.12] text-zinc-100 font-medium"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          Active ({activeRows.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setResultVarFilter("all")}
                          className={`px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                            resultVarFilter === "all"
                              ? "bg-white/[0.12] text-zinc-100 font-medium"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          All ({allRows.length})
                        </button>
                      </div>
                    </div>

                    <div
                      style={{ backgroundColor: isDark ? "#0C0D11" : "#FFFFFF" }}
                      className="w-full border border-white/[0.08] rounded-xl overflow-x-auto custom-scrollbar"
                    >
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="text-zinc-500 border-b border-white/[0.08] text-[11px] font-sans">
                          <tr>
                            <th className="py-2.5 px-4 font-medium">Variable</th>
                            <th className="py-2.5 px-4 font-medium text-right">Quantum (QUBO)</th>
                            {comp && (
                              <th className="py-2.5 px-4 font-medium text-right">Classical (OR-Tools)</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05] font-mono">
                          {displayedRows.length === 0 ? (
                            <tr>
                              <td colSpan={comp ? 3 : 2} className="py-6 px-4 text-center text-zinc-500 font-sans">
                                No variables selected in this state.
                              </td>
                            </tr>
                          ) : (
                            displayedRows.map((row) => {
                              const qActive = row.qVal > 0;
                              const cActive = row.cVal !== null && row.cVal > 0;
                              return (
                                <tr key={row.name} className="hover:bg-white/[0.02]">
                                  <td className={`py-2.5 px-4 ${qActive || cActive ? "text-zinc-100 font-medium" : "text-zinc-500"}`}>
                                    {row.name}
                                  </td>
                                  <td className={`py-2.5 px-4 text-right ${qActive ? "text-zinc-100 font-semibold" : "text-zinc-600"}`}>
                                    {row.qVal}
                                  </td>
                                  {comp && (
                                    <td className={`py-2.5 px-4 text-right ${cActive ? "text-zinc-100 font-semibold" : "text-zinc-600"}`}>
                                      {row.cVal}
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      {/* ── RIGHT PANE: PERMANENT GURU AI ASSISTANT (Right 35% — reduced by 30%) ──      */}
      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          width: "35%",
          minWidth: 0,
          maxWidth: "35%",
          flexBasis: "35%",
          flexGrow: 0,
          flexShrink: 0,
          backgroundColor: isDark ? "#090A0D" : "#FFFFFF",
        }}
        className="h-full flex flex-col min-w-0 min-h-0 overflow-hidden"
      >
        {/* Guru AI Header */}
        <div
          style={{
            backgroundColor: isDark ? "#090A0D" : "#F8FAFC",
          }}
          className={`w-full min-w-0 h-11 px-3 sm:px-4 border-b flex items-center justify-between text-xs font-mono shrink-0 ${
            isDark ? "border-white/[0.08]" : "border-slate-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            <Sparkles className={`w-4 h-4 ${isDark ? "text-zinc-200" : "text-slate-700"}`} />
            <span className={`font-semibold ${isDark ? "text-zinc-100" : "text-slate-900"}`}>Guru AI</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                isDark
                  ? "bg-white/[0.04] text-zinc-300 border-white/[0.12]"
                  : "bg-slate-100 text-slate-700 border-slate-300"
              }`}
            >
              Formulation Assistant
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectTab("code")}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer border ${
                activeTab === "code"
                  ? isDark
                    ? "bg-white/[0.08] text-zinc-100 border-white/[0.2]"
                    : "bg-slate-200 text-slate-900 border-slate-400"
                  : isDark
                  ? "bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 hover:text-white border-white/[0.1]"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
              }`}
              title="Open solution.py in Code Editor tab"
            >
              <FileCode className={`w-3.5 h-3.5 ${isDark ? "text-zinc-300" : "text-slate-700"}`} />
              <span>solution.py</span>
            </button>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 min-h-0">
          {guruAiMessages.length === 0 ? (
            /* Clean Empty State */
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div
                className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                  isDark
                    ? "bg-white/[0.04] border-white/[0.12] text-zinc-200"
                    : "bg-slate-100 border-slate-300 text-slate-700"
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1 max-w-sm">
                <div className={`text-xs font-semibold ${isDark ? "text-zinc-100" : "text-slate-900"}`}>
                  Guru AI Formulation Assistant
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Ask questions about your formulation, penalty tuning, constraints, or solver output.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 pt-2 max-w-md">
                {GURU_QUICK_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isGuruAiThinking}
                    onClick={() => handleSendGuruAiMessage(p.query)}
                    className={`text-[11px] px-3 py-1 rounded-full border transition-all cursor-pointer active:scale-95 ${
                      isDark
                        ? "bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.1]"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message List */
            <div className="space-y-3">
              {guruAiMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1 px-1">
                    {msg.sender === "assistant" ? (
                      <>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isDark
                              ? "bg-white/[0.06] border-white/[0.14]"
                              : "bg-slate-100 border-slate-300"
                          }`}
                        >
                          <Sparkles className={`w-2.5 h-2.5 ${isDark ? "text-zinc-200" : "text-slate-700"}`} />
                        </div>
                        <span className={`text-[10px] font-semibold ${isDark ? "text-zinc-200" : "text-slate-800"}`}>
                          Guru AI
                        </span>
                      </>
                    ) : (
                      <>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isDark
                              ? "bg-white/[0.06] border-white/[0.14]"
                              : "bg-slate-100 border-slate-300"
                          }`}
                        >
                          <User className={`w-2.5 h-2.5 ${isDark ? "text-zinc-200" : "text-slate-700"}`} />
                        </div>
                        <span className={`text-[10px] font-semibold ${isDark ? "text-zinc-200" : "text-slate-800"}`}>
                          You
                        </span>
                      </>
                    )}
                    <span className="text-[10px] text-zinc-500">{msg.timestamp}</span>
                  </div>

                  <div
                    style={{
                      backgroundColor:
                        msg.sender === "user"
                          ? isDark
                            ? "#111216"
                            : "#F1F5F9"
                          : isDark
                          ? "#0C0D11"
                          : "#FFFFFF",
                    }}
                    className={`max-w-[95%] sm:max-w-[90%] rounded-xl p-3 border leading-relaxed text-xs font-mono ${
                      msg.sender === "user"
                        ? isDark
                          ? "border-white/[0.14] text-zinc-100"
                          : "border-slate-300 text-slate-900"
                        : isDark
                        ? "border-white/[0.08] text-zinc-200"
                        : "border-slate-200 text-slate-800"
                    }`}
                  >
                    {msg.sender === "assistant" ? (
                      <div className="space-y-2">
                        <IdeMarkdownRenderer content={msg.text} isDark={isDark} />
                        {msg.suggestedCode && (
                          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2">
                            <span className="text-[10px] text-zinc-400">Suggested Code Update Available</span>
                            <button
                              type="button"
                              onClick={() => {
                                onChangeCode(msg.suggestedCode!);
                                handleSelectTab("code");
                              }}
                              className={`px-2 py-1 rounded border text-[10px] font-semibold transition-all cursor-pointer active:scale-95 flex items-center space-x-1 ${
                                isDark
                                  ? "bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.18] text-zinc-100"
                                  : "bg-slate-200 hover:bg-slate-300 border-slate-400 text-slate-900"
                              }`}
                            >
                              <FileCode className="w-3 h-3" />
                              <span>Apply to solution.py</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    )}
                  </div>
                </div>
              ))}

              {/* Thinking animation */}
              {isGuruAiThinking && (
                <div className="flex flex-col items-start">
                  <div className="flex items-center space-x-1.5 mb-1 px-1">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isDark ? "bg-white/[0.06] border-white/[0.14]" : "bg-slate-100 border-slate-300"
                      }`}
                    >
                      <Sparkles className={`w-2.5 h-2.5 ${isDark ? "text-zinc-200" : "text-slate-700"}`} />
                    </div>
                    <span className={`text-[10px] font-semibold ${isDark ? "text-zinc-200" : "text-slate-800"}`}>
                      Guru AI
                    </span>
                  </div>
                  <div
                    style={{
                      backgroundColor: isDark ? "#0C0D11" : "#FFFFFF",
                    }}
                    className="p-3 rounded-xl border border-white/[0.08] text-xs text-zinc-400 flex items-center space-x-2"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-zinc-300 animate-spin shrink-0" />
                    <span>Analyzing problem formulation, penalty λ, and solution.py...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar pinned to bottom */}
        <div
          style={{
            backgroundColor: isDark ? "#090A0D" : "#F8FAFC",
          }}
          className={`p-2.5 sm:p-3 border-t shrink-0 ${
            isDark ? "border-white/[0.08]" : "border-slate-200"
          }`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendGuruAiMessage();
            }}
            className="w-full flex flex-col"
          >
            <div
              style={{
                backgroundColor: isDark ? "#0C0D11" : "#FFFFFF",
              }}
              className={`w-full rounded-xl border p-2.5 transition-all ${
                isDark
                  ? "border-white/[0.1] focus-within:border-white/[0.24]"
                  : "border-slate-300 focus-within:border-slate-500 shadow-xs"
              }`}
            >
              <textarea
                rows={2}
                value={guruAiInput}
                onChange={(e) => setGuruAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendGuruAiMessage();
                  }
                }}
                placeholder="Ask Guru AI about this formulation, penalty λ, constraints, or solution.py..."
                disabled={isGuruAiThinking}
                className={`w-full bg-transparent text-xs font-mono outline-none resize-none custom-scrollbar leading-relaxed ${
                  isDark
                    ? "text-zinc-100 placeholder-zinc-500"
                    : "text-slate-900 placeholder-slate-400"
                } ${isGuruAiThinking ? "opacity-60 cursor-not-allowed" : ""}`}
              />

              {/* Clean Action Footer row */}
              <div className="flex items-center justify-between pt-1.5 mt-1">
                {guruAiMessages.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleClearGuruAi}
                    className="flex items-center space-x-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer py-1 px-1.5 rounded hover:bg-white/[0.04]"
                    title="Clear conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear chat</span>
                  </button>
                ) : (
                  <div />
                )}

                {isGuruAiThinking ? (
                  <button
                    type="button"
                    onClick={handleStopGuruAi}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center space-x-1.5 transition-all cursor-pointer bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 shadow-xs active:scale-95"
                    title="Terminate Guru AI request"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!guruAiInput.trim() || isGuruAiThinking}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
                      guruAiInput.trim() && !isGuruAiThinking
                        ? isDark
                          ? "bg-zinc-100 hover:bg-white text-black shadow-xs active:scale-95"
                          : "bg-slate-900 hover:bg-slate-800 text-white shadow-xs active:scale-95"
                        : "bg-white/[0.04] text-zinc-500 border border-white/[0.06] cursor-not-allowed"
                    }`}
                    title="Send message (Enter)"
                  >
                    <span>Send</span>
                    <Send className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
