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
import { exprToLatex } from "./adapters";

// Dynamically import Monaco Editor to avoid SSR hydration mismatch
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export type WorkbenchTab = "model" | "q_matrix" | "solver" | "feasibility" | "deploy" | "code";

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
  executionHistory: ExecutionRun[];
  onRestoreRun: (run: ExecutionRun) => void;
  onReSolve: () => void;
  onStopSolving?: () => void;
  isSolving: boolean;
  onOpenDeploy?: () => void;
  projectId?: string;
  problemTitle?: string;

  // Real data integration
  qMatrix?: QMatrixData | null;
  solverRouting?: SolverRouting | null;
  execution?: SolverExecution | null;
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
  executionHistory,
  onRestoreRun,
  onReSolve,
  onStopSolving,
  isSolving,
  onOpenDeploy,
  projectId = "default",
  problemTitle = "Optimization Problem",
  qMatrix = null,
  solverRouting = null,
  execution = null,
  terminalLogs: externalTerminalLogs,
  onUpdateTerminalLogs,
}: EnterpriseWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("code");

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

  // ── Guru AI Agent State & Handlers ──
  const [guruAiMessages, setGuruAiMessages] = useState<GuruAiMessage[]>([]);
  const [guruAiInput, setGuruAiInput] = useState("");
  const [isGuruAiThinking, setIsGuruAiThinking] = useState(false);
  const guruAbortRef = useRef<AbortController | null>(null);
  const runCodeAbortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleStopGuruAi = () => {
    if (guruAbortRef.current) {
      guruAbortRef.current.abort();
      guruAbortRef.current = null;
    }
    setIsGuruAiThinking(false);
  };

  const handleStopPythonScript = () => {
    if (runCodeAbortRef.current) {
      runCodeAbortRef.current.abort();
      runCodeAbortRef.current = null;
    }
    setIsRunningCode(false);
  };

  // Guru AI quick prompt templates
  const GURU_QUICK_PROMPTS = useMemo(() => [
    { label: "Why these variables?", query: "Why did the solver pick these specific variables?" },
    { label: "Calibrate penalty λ", query: `Is penalty stiffness λ = ${(typeof penaltyLambda === "number" ? penaltyLambda : 1.0).toFixed(1)} calibrated properly for these constraints?` },
    { label: "Explain QUBO couplings", query: "Explain the QUBO interaction couplings derived from the objective." },
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
  - Variable Values: ${JSON.stringify(execution.solution || {})}`
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

  const [isRunningCode, setIsRunningCode] = useState(false);

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

  // Real execution in container sandbox
  const handleRunPythonScript = async () => {
    if (!generatedCode?.trim()) return;
    if (runCodeAbortRef.current) {
      runCodeAbortRef.current.abort();
    }
    const controller = new AbortController();
    runCodeAbortRef.current = controller;
    setShowTerminal(true);
    setIsRunningCode(true);
    setTerminalLogs((prev) => [
      ...prev,
      `> python3 solution.py`,
      `[INFO] Dispatching code to sandbox execution engine...`,
    ]);

    const start = performance.now();
    try {
      const res = await fetch("/api/ide/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ code: generatedCode }),
      });
      const data = await res.json();
      const elapsed = Math.round(performance.now() - start);

      if (data.success) {
        const stdoutLines = data.stdout ? data.stdout.trim().split("\n") : [];
        const stderrLines = data.stderr ? data.stderr.trim().split("\n") : [];
        setTerminalLogs((prev) => [
          ...prev,
          ...stdoutLines,
          ...(stderrLines.length > 0 ? stderrLines.map((l: string) => `[STDERR] ${l}`) : []),
          `[OK] Execution completed in ${elapsed}ms (${data.backend_used || "local"}).`,
        ]);
      } else {
        const err = data.stderr || data.error || "Execution failed";
        setTerminalLogs((prev) => [
          ...prev,
          `[ERROR] ${err}`,
          `[FAIL] Process exited with failure (${elapsed}ms)`,
        ]);
      }
    } catch (err: any) {
      const isAbort = err?.name === "AbortError" || controller.signal.aborted;
      setTerminalLogs((prev) => [
        ...prev,
        isAbort ? `[STOPPED] Execution terminated by user.` : `[ERROR] Execution engine connection error: ${err.message}`,
      ]);
    } finally {
      if (runCodeAbortRef.current === controller) {
        runCodeAbortRef.current = null;
      }
      setIsRunningCode(false);
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
      {/* ── LEFT PANE: All Tabs (Left 50%) ── */}
      <div
        style={{
          width: "50%",
          minWidth: 0,
          maxWidth: "50%",
          flexBasis: "50%",
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
                    onChange={(e) => onChangePenaltyLambda(parseFloat(e.target.value) || 1.0)}
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
        {/* TAB 3: SOLVER STRATEGY                                                           */}
        {/* ════════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "solver" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold text-zinc-200">
                Solver Strategy
              </h3>
            </div>

            {/* AI Recommendation Banner if available from backend */}
            {solverRouting?.selected && (
              <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/[0.04] space-y-1.5 font-mono text-xs">
                <div className="flex items-center space-x-2 text-sky-400 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Recommended Solver: {solverRouting.selected}</span>
                </div>
                {solverRouting.reasons.length > 0 && (
                  <ul className="text-[11px] text-zinc-300 list-disc list-inside space-y-0.5 pl-1">
                    {solverRouting.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Active Solver: D-Wave Simulator working on Quantum Guru Infrastructure */}
            <div
              style={{
                backgroundColor: isDark ? "rgba(56, 189, 248, 0.05)" : "#FFFFFF",
              }}
              className="p-4 sm:p-5 rounded-xl border border-sky-500/30 space-y-3 font-mono text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100">
                      DWave Simulator
                    </h4>
                    <span className="text-[11px] text-sky-300">
                      Quantum Guru Runtime
                    </span>
                  </div>
                </div>

                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 font-semibold">
                  <Check className="w-3 h-3" />
                  <span>Active</span>
                </span>
              </div>

              <div className="pt-2 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-zinc-400">
                <div>
                  <span className="text-zinc-500 text-[10px] block">Sampler backend:</span>
                  <span className="text-zinc-200 font-semibold">dimod.SimulatedAnnealingSampler</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">Execution host:</span>
                  <span className="text-zinc-200 font-semibold">Quantum Guru Cluster</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">Sampling depth:</span>
                  <span className="text-sky-400 font-semibold">1,000 reads / solve</span>
                </div>
              </div>
            </div>

            {/* Hardware Note */}
            <div
              style={{
                backgroundColor: isDark ? "#13141A" : "#F8FAFC",
              }}
              className="p-3 rounded-xl border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-mono text-xs"
            >
              <div className="flex items-center space-x-1.5 text-zinc-400 text-[11px]">
                <Layers className="w-3.5 h-3.5 text-zinc-500" />
                <span className="font-semibold text-zinc-300">Physical Quantum Hardware (D-Wave Advantage QPU)</span>
              </div>
              <span className="text-[10px] text-zinc-500">Configurable with Leap API credentials</span>
            </div>
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
              <div className="flex items-center space-x-2 sm:space-x-2.5">
                <FileCode className="w-4 h-4 text-sky-400" />
                <span className={`font-semibold ${isDark ? "text-zinc-200" : "text-slate-800"}`}>solution.py</span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {/* Recompile & Solve / Stop */}
                {isSolving && onStopSolving ? (
                  <button
                    type="button"
                    onClick={onStopSolving}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer shrink-0 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 active:scale-95"
                    title="Terminate running solver execution"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop Solve</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onReSolve}
                    disabled={isRunningCode || isSolving}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all cursor-pointer shrink-0 border ${
                      isSolving
                        ? "bg-white/[0.02] text-zinc-600 border-white/[0.04] cursor-not-allowed"
                        : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white border-white/[0.08] active:scale-95"
                    }`}
                    title="Recompile QUBO and solve"
                  >
                    <RotateCw className={`w-3.5 h-3.5 text-sky-400 ${isSolving ? "animate-spin" : ""}`} />
                    <span>Recompile &amp; Solve</span>
                  </button>
                )}

                {/* Run code / Stop code (Primary CTA) */}
                {isRunningCode ? (
                  <button
                    type="button"
                    onClick={handleStopPythonScript}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer shrink-0 bg-rose-500 hover:bg-rose-400 text-black shadow-xs active:scale-95"
                    title="Terminate running script"
                  >
                    <Square className="w-3 h-3 fill-black" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRunPythonScript}
                    disabled={isRunningCode || isSolving}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer shrink-0 bg-emerald-500 hover:bg-emerald-400 text-black shadow-xs active:scale-95"
                    title="Execute Python script in container sandbox"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Run code</span>
                  </button>
                )}
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
                value={generatedCode}
                onChange={(val) => onChangeCode(val || "")}
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
                <span className="text-zinc-500 text-[10px]">dimod / dwave-neal</span>
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
      </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      {/* ── RIGHT PANE: PERMANENT GURU AI ASSISTANT (Right 50%) ──                        */}
      {/* ════════════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          width: "50%",
          minWidth: 0,
          maxWidth: "50%",
          flexBasis: "50%",
          flexGrow: 1,
          flexShrink: 0,
          backgroundColor: isDark ? "#0E0F13" : "#FFFFFF",
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
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className={`font-semibold ${isDark ? "text-zinc-200" : "text-slate-800"}`}>Guru AI</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
              Formulation Assistant
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectTab("code")}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer border ${
                activeTab === "code"
                  ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.08]"
              }`}
              title="Open solution.py in Code Editor tab"
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>solution.py</span>
            </button>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 min-h-0">
          {guruAiMessages.length === 0 ? (
            /* Clean Empty State */
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1 max-w-sm">
                <div className="text-xs font-semibold text-zinc-200">Guru AI Formulation Assistant</div>
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
                        ? "bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.08]"
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
                        <div className="w-4 h-4 rounded bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                          <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                        </div>
                        <span className="text-[10px] font-semibold text-purple-300">Guru AI</span>
                      </>
                    ) : (
                      <>
                        <div className="w-4 h-4 rounded bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
                          <User className="w-2.5 h-2.5 text-sky-300" />
                        </div>
                        <span className="text-[10px] font-semibold text-sky-300">You</span>
                      </>
                    )}
                    <span className="text-[10px] text-zinc-500">{msg.timestamp}</span>
                  </div>

                  <div
                    style={{
                      backgroundColor:
                        msg.sender === "user"
                          ? isDark
                            ? "#1A2234"
                            : "#E0F2FE"
                          : isDark
                          ? "#13141A"
                          : "#FFFFFF",
                    }}
                    className={`max-w-[95%] sm:max-w-[90%] rounded-xl p-3 border leading-relaxed text-xs font-mono ${
                      msg.sender === "user"
                        ? isDark
                          ? "border-sky-500/30 text-sky-100"
                          : "border-sky-300 text-sky-950"
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
                            <span className="text-[10px] text-purple-400">Suggested Code Update Available</span>
                            <button
                              type="button"
                              onClick={() => {
                                onChangeCode(msg.suggestedCode!);
                                handleSelectTab("code");
                              }}
                              className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-[10px] font-semibold transition-all cursor-pointer active:scale-95 flex items-center space-x-1"
                            >
                              <FileCode className="w-3 h-3 text-purple-300" />
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
                    <div className="w-4 h-4 rounded bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                      <Sparkles className="w-2.5 h-2.5 text-purple-300 animate-spin" />
                    </div>
                    <span className="text-[10px] font-semibold text-purple-300">Guru AI</span>
                  </div>
                  <div
                    style={{
                      backgroundColor: isDark ? "#13141A" : "#FFFFFF",
                    }}
                    className={`p-3 rounded-xl border border-white/[0.08] text-xs text-zinc-400 flex items-center space-x-2`}
                  >
                    <RotateCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
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
                backgroundColor: isDark ? "#12141A" : "#FFFFFF",
              }}
              className={`w-full rounded-xl border p-2.5 transition-all focus-within:ring-1 focus-within:ring-purple-500/50 ${
                isDark
                  ? "border-white/[0.1] focus-within:border-purple-500/60"
                  : "border-slate-300 focus-within:border-purple-500 shadow-xs"
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
                        ? "bg-purple-600 hover:bg-purple-500 text-white shadow-xs active:scale-95"
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
