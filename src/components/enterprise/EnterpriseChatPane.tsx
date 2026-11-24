"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  RotateCw,
  Check,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Square,
} from "lucide-react";
import { EnterpriseChatMessage } from "./types";

interface EnterpriseChatPaneProps {
  isDark: boolean;
  messages: EnterpriseChatMessage[];
  isStreaming: boolean;
  isExecuting?: boolean;
  isLoadingProjects?: boolean;
  onSendMessage: (text: string) => void;
  onStopStreaming?: () => void;
  onClearChat: () => void;
  onFocusWorkbench?: () => void;
  onRunParallel?: () => void;
  canRunParallel?: boolean;
  onOpenProblemVault?: () => void;
  onNewProject?: () => void;
}

export function EnterpriseChatPane({
  isDark,
  messages,
  isStreaming,
  isExecuting = false,
  isLoadingProjects = false,
  onSendMessage,
  onStopStreaming,
  onClearChat,
  onFocusWorkbench,
  onRunParallel,
  canRunParallel = false,
  onOpenProblemVault,
  onNewProject,
}: EnterpriseChatPaneProps) {
  const [inputText, setInputText] = useState("");
  const [expandedStepsMap, setExpandedStepsMap] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = inputText.trim();
    if (!clean || isStreaming) return;
    onSendMessage(clean);
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleSteps = (msgId: string) => {
    setExpandedStepsMap((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  return (
    <div
      style={{
        backgroundColor: isDark ? "#0E0F13" : "#FFFFFF",
      }}
      className={`h-full flex flex-col min-w-0 transition-colors ${
        isDark ? "text-zinc-100" : "text-slate-900"
      }`}
    >
      {/* ── MESSAGES SCROLL AREA ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 custom-scrollbar">
        {messages.length === 0 ? (
          isLoadingProjects ? (
            <div className="h-full flex items-center justify-center">
              <span className={`text-xs font-mono ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
                Loading workspace...
              </span>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-md mx-auto space-y-5">
              <div className="space-y-1.5">
                <h3 className={`text-base font-semibold font-sans tracking-tight ${isDark ? "text-zinc-100" : "text-slate-900"}`}>
                  Describe an optimization problem
                </h3>
                <p className={`text-[12.5px] leading-relaxed font-sans ${isDark ? "text-zinc-400" : "text-slate-600"}`}>
                  Formulates constraints and compiles both D-Wave QUBO (simulated annealing) and Google OR-Tools CP-SAT side-by-side.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {onOpenProblemVault && (
                  <button
                    type="button"
                    onClick={onOpenProblemVault}
                    className={`px-3.5 py-2 rounded-lg text-xs font-mono font-medium border inline-flex items-center gap-2 transition-colors cursor-pointer ${
                      isDark
                        ? "bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.14] text-zinc-100"
                        : "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white"
                    }`}
                  >
                    <span>Browse Problem Vault</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {onNewProject && (
                  <button
                    type="button"
                    onClick={onNewProject}
                    className={`px-3.5 py-2 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
                      isDark
                        ? "bg-transparent hover:bg-white/[0.04] border-white/[0.10] text-zinc-300"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    New Project
                  </button>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="max-w-3xl mx-auto w-full space-y-6">
          {messages.map((msg) => {
            const hasSteps = msg.pipelineSteps && msg.pipelineSteps.length > 0;
            const isStepsExpanded = !!expandedStepsMap[msg.id];
            const activeStep = hasSteps
              ? msg.pipelineSteps!.find((s) => s.status === "running") ||
                msg.pipelineSteps![msg.pipelineSteps!.length - 1]
              : null;
            const exec = msg.executionResult;
            const hasRealExecution = Boolean(
              exec &&
                ((typeof exec.num_reads === "number" && exec.num_reads > 0) ||
                  exec.solver_comparison != null ||
                  (Array.isArray(exec.selected_variables) && exec.selected_variables.length > 0) ||
                  (exec.solution && Object.keys(exec.solution).length > 0))
            );
            const isFeasible = hasRealExecution ? (exec!.feasible ?? true) : true;

            return (
              <div key={msg.id} className="animate-in fade-in duration-200">
                {msg.sender === "user" ? (
                  /* USER MESSAGE BUBBLE */
                  <div className="flex justify-end">
                    <div
                      style={{
                        backgroundColor: isDark ? "#13151B" : "#F1F5F9",
                      }}
                      className={`max-w-[85%] px-4 py-3.5 rounded-xl border text-xs sm:text-[13px] leading-relaxed ${
                        isDark
                          ? "border-white/[0.08] text-zinc-100"
                          : "border-slate-200 text-slate-900"
                      }`}
                    >
                      <div className={`flex items-center justify-between gap-4 text-[10px] font-mono pb-1.5 mb-1.5 border-b ${
                        isDark ? "text-zinc-500 border-white/[0.06]" : "text-slate-500 border-slate-200/80"
                      }`}>
                        <span className={isDark ? "font-medium text-zinc-300" : "font-medium text-slate-700"}>You</span>
                        <span suppressHydrationWarning>{msg.timestamp}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ) : (
                  /* ASSISTANT TURN (Flat, balanced column aligned to max-w-3xl — no nested box clutter) */
                  <div className="w-full space-y-2.5">
                    {/* ── EXPANDABLE 1-LINE PIPELINE ACCORDION ── */}
                    {hasSteps && (
                      <div
                        style={{
                          backgroundColor: isDark ? "#111217" : "#F8FAFC",
                        }}
                        className={`border rounded-lg overflow-hidden font-mono text-[11px] ${
                          isDark ? "border-white/[0.08]" : "border-slate-200"
                        }`}
                      >
                        <div
                          onClick={() => toggleSteps(msg.id)}
                          className={`px-3.5 py-2 flex items-center justify-between cursor-pointer select-none transition-colors ${
                            isDark ? "text-zinc-300 hover:text-white" : "text-slate-700 hover:text-slate-950"
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            {msg.isStreaming ? (
                              <RotateCw className="w-3.5 h-3.5 text-zinc-400 animate-spin shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span className="truncate">
                              {msg.isStreaming
                                ? activeStep?.message || activeStep?.title || "Executing optimization pipeline..."
                                : `Autonomous pipeline converged (${msg.pipelineSteps?.length || 0} stages complete)`}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0 ml-3 text-[10px] text-zinc-500">
                            <span>{isStepsExpanded ? "Hide stages" : "View stages"}</span>
                            {isStepsExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </div>

                        {/* Expandable Stage Progress Checklist */}
                        {isStepsExpanded && (
                          <div className={`px-3.5 pb-3 pt-2 border-t space-y-1.5 ${
                            isDark ? "border-white/[0.06] bg-black/25" : "border-slate-200 bg-white"
                          }`}>
                            {msg.pipelineSteps!.map((step) => (
                              <div
                                key={step.id}
                                className="flex items-center justify-between py-0.5 text-[10.5px]"
                              >
                                <div className="flex items-center space-x-2 min-w-0">
                                  {step.status === "done" ? (
                                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                  ) : step.status === "running" ? (
                                    <RotateCw className="w-3 h-3 text-zinc-300 animate-spin shrink-0" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                                  )}
                                  <span
                                    className={`truncate ${
                                      step.status === "running"
                                        ? isDark ? "text-zinc-100 font-medium" : "text-slate-900 font-medium"
                                        : isDark ? "text-zinc-400" : "text-slate-600"
                                    }`}
                                  >
                                    {step.title}
                                  </span>
                                </div>
                                <span className="text-zinc-500 capitalize shrink-0 ml-2">
                                  {step.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── ASSISTANT PROSE (shown for streaming / plain notices; omitted when Compiled Card or Execution Card owns the summary) ── */}
                    {((!hasRealExecution && !msg.compiledSummary) || msg.isStreaming) && msg.text && (
                      <div className={`px-4 py-3 rounded-xl border text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap ${
                        isDark
                          ? "bg-[#111217] border-white/[0.08] text-zinc-300"
                          : "bg-white border-slate-200 text-slate-700"
                      }`}>
                        {msg.text}
                      </div>
                    )}

                    {/* ── NEUTRAL COMPILED CARD (Shown after Compile, before explicit solver execution) ── */}
                    {!hasRealExecution && !msg.isStreaming && msg.compiledSummary && (
                      <div
                        style={{
                          backgroundColor: isDark ? "#111217" : "#F8FAFC",
                        }}
                        className={`p-4 rounded-xl border font-mono space-y-3 ${
                          isDark ? "border-white/[0.09]" : "border-slate-200"
                        }`}
                      >
                        <div className={`flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b ${
                          isDark ? "border-white/[0.07]" : "border-slate-200/80"
                        }`}>
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className={`w-4 h-4 shrink-0 ${isDark ? "text-zinc-300" : "text-slate-700"}`} />
                            <span className={`text-xs font-semibold ${isDark ? "text-zinc-100" : "text-slate-900"}`}>
                              Model compiled — run a solver to evaluate
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                            {msg.compiledSummary.variablesCount > 0 && (
                              <span className={`px-2 py-0.5 rounded border ${
                                isDark
                                  ? "bg-white/[0.04] border-white/[0.08] text-zinc-300"
                                  : "bg-white border-slate-200 text-slate-700"
                              }`}>
                                {msg.compiledSummary.variablesCount} vars
                              </span>
                            )}
                            {msg.compiledSummary.constraintsCount > 0 && (
                              <span className={`px-2 py-0.5 rounded border ${
                                isDark
                                  ? "bg-white/[0.04] border-white/[0.08] text-zinc-300"
                                  : "bg-white border-slate-200 text-slate-700"
                              }`}>
                                {msg.compiledSummary.constraintsCount} constraints
                              </span>
                            )}
                            {typeof msg.compiledSummary.qMatrixSize === "number" && msg.compiledSummary.qMatrixSize > 0 && (
                              <span className={`px-2 py-0.5 rounded border ${
                                isDark
                                  ? "bg-white/[0.04] border-white/[0.08] text-zinc-400"
                                  : "bg-white border-slate-200 text-slate-600"
                              }`}>
                                Q {msg.compiledSummary.qMatrixSize}×{msg.compiledSummary.qMatrixSize}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className={`text-xs font-sans leading-relaxed ${isDark ? "text-zinc-400" : "text-slate-600"}`}>
                          Mathematical model, Q-matrix, and solver scripts are ready. Run a solver under{" "}
                          <span className={`font-mono text-[11px] ${isDark ? "text-zinc-200" : "text-slate-800"}`}>Solve</span>{" "}
                          to evaluate feasibility and optimality.
                        </p>
                      </div>
                    )}

                    {/* ── EXECUTIVE SOLUTION CARD (Shown ONLY after a real solver execution) ── */}
                    {hasRealExecution && msg.executionResult && (
                      <div
                        style={{
                          backgroundColor: isDark
                            ? isFeasible
                              ? "rgba(16, 185, 129, 0.045)"
                              : "rgba(245, 158, 11, 0.045)"
                            : isFeasible
                            ? "#F0FDF4"
                            : "#FFFBEB",
                        }}
                        className={`p-4 rounded-xl border font-mono space-y-3.5 ${
                          isFeasible
                            ? isDark
                              ? "border-emerald-500/25 border-l-[3px] border-l-emerald-400"
                              : "border-emerald-200 border-l-[3px] border-l-emerald-500"
                            : isDark
                            ? "border-amber-500/25 border-l-[3px] border-l-amber-400"
                            : "border-amber-200 border-l-[3px] border-l-amber-500"
                        }`}
                      >
                        {/* Card Header */}
                        <div className={`flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b ${
                          isDark ? "border-white/[0.07]" : "border-slate-200/80"
                        }`}>
                          <div className="flex items-center space-x-2">
                            {isFeasible ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            )}
                            <span className={`text-xs font-semibold ${isDark ? "text-zinc-100" : "text-slate-900"}`}>
                              {isFeasible
                                ? "Feasible solution found"
                                : "Suboptimal or boundary violation"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className={`px-2 py-0.5 rounded border ${
                              isDark
                                ? "bg-white/[0.04] border-white/[0.08] text-zinc-300"
                                : "bg-white border-slate-200 text-slate-700"
                            }`}>
                              Ground energy:{" "}
                              <span className={`font-semibold ${isDark ? "text-zinc-100" : "text-slate-950"}`}>
                                {typeof msg.executionResult.energy === "number" && Number.isFinite(msg.executionResult.energy)
                                  ? msg.executionResult.energy.toFixed(4)
                                  : "—"}
                              </span>
                            </span>
                            {typeof msg.executionResult.num_reads === "number" && (
                              <span className={`px-2 py-0.5 rounded border ${
                                isDark
                                  ? "bg-white/[0.04] border-white/[0.08] text-zinc-400"
                                  : "bg-white border-slate-200 text-slate-600"
                              }`}>
                                {msg.executionResult.num_reads.toLocaleString()} reads
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Active Allocation Variable Badges */}
                        <div className="space-y-1.5">
                          <span className={`text-[10.5px] block ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                            Active decisions
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {Array.isArray(msg.executionResult.selected_variables) &&
                            msg.executionResult.selected_variables.length > 0 ? (
                              msg.executionResult.selected_variables.map((v, i) => (
                                <span
                                  key={i}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${
                                    isDark
                                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  }`}
                                >
                                  {v} = {msg.executionResult?.solution?.[v] ?? 1}
                                </span>
                              ))
                            ) : (
                              <span className="text-zinc-500 text-xs italic">
                                None active (Ground state 0)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Parallel Quantum vs. Classical (Google OR-Tools) Benchmark Strip */}
                        {msg.executionResult.solver_comparison && (
                          <div className={`pt-3 border-t space-y-2.5 text-[11px] ${
                            isDark ? "border-white/[0.07]" : "border-slate-200/80"
                          }`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className={`font-semibold ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
                                Solver Benchmark
                              </span>
                              <span className={`px-2 py-0.5 rounded border font-medium text-[10.5px] ${
                                isDark
                                  ? "bg-white/[0.05] border-white/[0.10] text-zinc-200"
                                  : "bg-white border-slate-200 text-slate-800"
                              }`}>
                                {msg.executionResult.solver_comparison.verdict_badge}
                              </span>
                            </div>

                            {/* Even 2-column stacked solver cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div className={`px-3 py-2.5 rounded-lg border space-y-1 ${
                                isDark ? "bg-black/25 border-white/[0.07]" : "bg-white border-slate-200"
                              }`}>
                                <div className="flex items-center justify-between gap-2 text-[10.5px]">
                                  <span className={isDark ? "text-zinc-400" : "text-slate-500"}>
                                    D-Wave Simulated Annealing
                                  </span>
                                  <span className="text-zinc-500 shrink-0">
                                    {msg.executionResult.solver_comparison.quantum.solve_time_ms ?? "—"} ms
                                  </span>
                                </div>
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className={`text-xs font-semibold ${isDark ? "text-zinc-100" : "text-slate-900"}`}>
                                    Obj {msg.executionResult.solver_comparison.quantum.objective_value ?? "—"}
                                  </span>
                                  <span className={`text-[10.5px] ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                                    {msg.executionResult.solver_comparison.quantum.constraints_satisfied}/
                                    {msg.executionResult.solver_comparison.quantum.constraints_total} constraints
                                  </span>
                                </div>
                              </div>

                              <div className={`px-3 py-2.5 rounded-lg border space-y-1 ${
                                isDark ? "bg-black/25 border-white/[0.07]" : "bg-white border-slate-200"
                              }`}>
                                <div className="flex items-center justify-between gap-2 text-[10.5px]">
                                  <span className={isDark ? "text-zinc-400" : "text-slate-500"}>
                                    Google OR-Tools CP-SAT
                                  </span>
                                  <span className="text-zinc-500 shrink-0">
                                    {msg.executionResult.solver_comparison.classical.solve_time_ms ?? "—"} ms
                                  </span>
                                </div>
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className={`text-xs font-semibold ${isDark ? "text-zinc-100" : "text-slate-900"}`}>
                                    Obj {msg.executionResult.solver_comparison.classical.objective_value ?? "—"}
                                  </span>
                                  <span className={`text-[10.5px] ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                                    {msg.executionResult.solver_comparison.classical.constraints_satisfied}/
                                    {msg.executionResult.solver_comparison.classical.constraints_total} constraints
                                  </span>
                                </div>
                              </div>
                            </div>

                            <p className={`leading-relaxed font-sans text-xs ${isDark ? "text-zinc-400" : "text-slate-600"}`}>
                              {msg.executionResult.solver_comparison.summary}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── ACTION ROW (Run Parallel + Inspect in workbench) ── */}
                    {(onFocusWorkbench || (onRunParallel && canRunParallel && !hasRealExecution && !msg.isStreaming && msg.compiledSummary)) && (
                      <div className="flex items-center justify-end gap-2 pt-0.5">
                        {onRunParallel && canRunParallel && !hasRealExecution && !msg.isStreaming && msg.compiledSummary && (
                          <button
                            type="button"
                            disabled={isExecuting}
                            onClick={onRunParallel}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                              isDark
                                ? "bg-zinc-100 hover:bg-white border-zinc-100 text-zinc-950"
                                : "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white"
                            }`}
                          >
                            <span>Run Parallel</span>
                          </button>
                        )}
                        {onFocusWorkbench && (
                          <button
                            type="button"
                            onClick={onFocusWorkbench}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium border transition-colors cursor-pointer ${
                              isDark
                                ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.10] text-zinc-200 hover:text-white"
                                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950"
                            }`}
                          >
                            <span>Inspect in workbench</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── COMPOSER (Centered on exact same max-w-3xl column as messages) ── */}
      <div
        style={{
          backgroundColor: isDark ? "#0E0F13" : "#FFFFFF",
        }}
        className={`px-4 sm:px-8 py-3.5 border-t shrink-0 ${
          isDark
            ? "border-white/[0.08]"
            : "border-slate-200"
        }`}
      >
        <div className="max-w-3xl mx-auto w-full">
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: isDark ? "#090A0D" : "#FFFFFF",
            }}
            className={`rounded-xl border px-3.5 py-2.5 relative transition-colors ${
              isDark
                ? "border-white/[0.09] focus-within:border-white/[0.18]"
                : "border-slate-200 focus-within:border-slate-400"
            }`}
          >
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your business problem, constraints, or penalty requests..."
              disabled={isStreaming}
              className={`w-full text-xs sm:text-[13px] bg-transparent outline-none focus:outline-none focus:ring-0 resize-none placeholder:text-zinc-500 leading-relaxed font-sans ${
                isDark ? "text-zinc-100" : "text-slate-900"
              }`}
            />

            <div className={`flex items-center justify-end pt-2 border-t mt-1 ${
              isDark ? "border-white/[0.05]" : "border-slate-100"
            }`}>
              {isStreaming && onStopStreaming ? (
                <button
                  type="button"
                  onClick={onStopStreaming}
                  className="px-3 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer flex items-center space-x-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/35 active:scale-95"
                  title="Terminate running execution"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isStreaming || !inputText.trim()}
                  className={`px-3 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                    isStreaming || !inputText.trim()
                      ? isDark
                        ? "bg-white/[0.04] text-zinc-600 border border-white/[0.06] cursor-not-allowed"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : isDark
                      ? "bg-zinc-100 hover:bg-white text-zinc-950 active:scale-95"
                      : "bg-slate-900 hover:bg-slate-800 text-white active:scale-95"
                  }`}
                  title="Submit problem to pipeline"
                >
                  <span>Send</span>
                  <Send className="w-3 h-3" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
