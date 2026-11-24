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
  isLoadingProjects?: boolean;
  onSendMessage: (text: string) => void;
  onStopStreaming?: () => void;
  onClearChat: () => void;
  onFocusWorkbench?: () => void;
  onOpenProblemVault?: () => void;
  onNewProject?: () => void;
}

export function EnterpriseChatPane({
  isDark,
  messages,
  isStreaming,
  isLoadingProjects = false,
  onSendMessage,
  onStopStreaming,
  onClearChat,
  onFocusWorkbench,
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
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
          messages.map((msg) => {
            const hasSteps = msg.pipelineSteps && msg.pipelineSteps.length > 0;
            const isStepsExpanded = !!expandedStepsMap[msg.id];
            const activeStep = hasSteps
              ? msg.pipelineSteps!.find((s) => s.status === "running") ||
                msg.pipelineSteps![msg.pipelineSteps!.length - 1]
              : null;

            return (
              <div key={msg.id} className="space-y-3 animate-in fade-in duration-200">
                {msg.sender === "user" ? (
                  /* USER MESSAGE BUBBLE (Layer 3: Elevated Plane) */
                  <div className="flex justify-end">
                    <div
                      style={{
                        backgroundColor: isDark ? "#111216" : "#F1F5F9",
                      }}
                      className={`max-w-[85%] p-4 rounded-2xl rounded-tr-xs border text-xs sm:text-[13px] leading-relaxed shadow-md ${
                        isDark
                          ? "border-white/[0.1] text-[#F8FAFC] shadow-black/40"
                          : "border-slate-200 text-slate-900 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pb-1.5 mb-1.5 border-b border-white/[0.06]">
                        <span className="font-semibold text-zinc-300">You</span>
                        <span suppressHydrationWarning>{msg.timestamp}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ) : (
                  /* ASSISTANT MESSAGE CARD (IDE-Aligned Surface 2: Elevated Card) */
                  <div className="flex justify-start">
                    <div
                      style={{
                        backgroundColor: isDark ? "#13141A" : "#FFFFFF",
                      }}
                      className={`w-full max-w-[95%] p-4 sm:p-5 rounded-xl border space-y-4 shadow-lg ${
                        isDark
                          ? "border-white/[0.08] text-zinc-200 shadow-black/40"
                          : "border-slate-200 text-slate-800 shadow-sm"
                      }`}
                    >
                      {/* ── EXPANDABLE 1-LINE PIPELINE ACCORDION ── */}
                      {hasSteps && (
                        <div
                          style={{
                            backgroundColor: isDark ? "#0E0F13" : "#F8FAFC",
                          }}
                          className="border border-white/[0.08] rounded-lg overflow-hidden font-mono text-[11px]"
                        >
                          <div
                            onClick={() => toggleSteps(msg.id)}
                            className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none text-zinc-300 hover:text-white transition-colors"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              {msg.isStreaming ? (
                                <RotateCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                              <span className="truncate">
                                {msg.isStreaming
                                  ? activeStep?.message || activeStep?.title || "Executing optimization pipeline..."
                                  : `Autonomous pipeline converged (${msg.pipelineSteps?.length || 0} stages complete)`}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0 ml-3 text-[10px] text-zinc-400">
                              <span>{isStepsExpanded ? "Hide details" : "View stages"}</span>
                              {isStepsExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </div>
                          </div>

                          {/* Expandable 9-Stage Progress Checklist */}
                          {isStepsExpanded && (
                            <div className="px-3.5 pb-3 pt-2 border-t border-white/[0.06] space-y-1.5 bg-black/20">
                              {msg.pipelineSteps!.map((step) => (
                                <div
                                  key={step.id}
                                  className="flex items-center justify-between py-0.5 text-[10px]"
                                >
                                  <div className="flex items-center space-x-2 min-w-0">
                                    {step.status === "done" ? (
                                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                    ) : step.status === "running" ? (
                                      <RotateCw className="w-3 h-3 text-sky-400 animate-spin shrink-0" />
                                    ) : (
                                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                                    )}
                                    <span
                                      className={`truncate ${
                                        step.status === "running"
                                          ? "text-sky-300 font-semibold"
                                          : "text-zinc-400"
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

                      {/* ── ASSISTANT PROSE EXPLANATION ── */}
                      <div className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-300">
                        {msg.text}
                      </div>

                      {/* ── EXECUTIVE SOLUTION CARD ── */}
                      {msg.executionResult && (
                        <div
                          style={{
                            backgroundColor: isDark
                              ? (msg.executionResult.feasible ?? true)
                                ? "rgba(16, 185, 129, 0.05)"
                                : "rgba(245, 158, 11, 0.05)"
                              : "#F8FAFC",
                          }}
                          className={`p-3.5 rounded-lg border font-mono space-y-3 ${
                            (msg.executionResult.feasible ?? true)
                              ? "border-emerald-500/25 border-l-4 border-l-emerald-400"
                              : "border-amber-500/25 border-l-4 border-l-amber-400"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                            <div className="flex items-center space-x-2">
                              {(msg.executionResult.feasible ?? true) ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                              )}
                              <span className="text-xs font-semibold text-zinc-100">
                                {(msg.executionResult.feasible ?? true)
                                  ? "Feasible solution found"
                                  : "Suboptimal or boundary violation"}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] text-zinc-300">
                              <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                                Ground energy:{" "}
                                <span className="font-bold text-sky-400">
                                  {typeof msg.executionResult.energy === "number" && Number.isFinite(msg.executionResult.energy)
                                    ? msg.executionResult.energy.toFixed(4)
                                    : "—"}
                                </span>
                              </span>
                              {typeof msg.executionResult.num_reads === "number" && (
                                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-400">
                                  {msg.executionResult.num_reads.toLocaleString()} reads
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Active Allocation Variable Badges */}
                          <div className="text-xs space-y-1">
                            <span className="text-zinc-400 text-[11px] block">
                              Active decisions:
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {Array.isArray(msg.executionResult.selected_variables) &&
                              msg.executionResult.selected_variables.length > 0 ? (
                                msg.executionResult.selected_variables.map((v, i) => (
                                  <span
                                    key={i}
                                    className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
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
                            <div className="pt-2.5 border-t border-white/[0.08] space-y-2 text-[11px]">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-zinc-300 font-semibold">
                                  Quantum vs. Classical OR-Tools Benchmark
                                </span>
                                <span className="px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.12] text-zinc-100 font-semibold">
                                  {msg.executionResult.solver_comparison.verdict_badge}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="p-2 rounded bg-black/30 border border-white/[0.08] flex items-center justify-between">
                                  <span className="text-zinc-400">D-Wave QUBO Annealer:</span>
                                  <span className="text-zinc-100 font-semibold">
                                    Obj{" "}
                                    {msg.executionResult.solver_comparison.quantum.objective_value ?? "—"}{" "}
                                    <span className="text-zinc-400 font-normal">
                                      ({msg.executionResult.solver_comparison.quantum.constraints_satisfied}/
                                      {msg.executionResult.solver_comparison.quantum.constraints_total} constraints ·{" "}
                                      {msg.executionResult.solver_comparison.quantum.solve_time_ms ?? "—"} ms)
                                    </span>
                                  </span>
                                </div>
                                <div className="p-2 rounded bg-black/30 border border-white/[0.08] flex items-center justify-between">
                                  <span className="text-zinc-400">Google OR-Tools CP-SAT:</span>
                                  <span className="text-zinc-100 font-semibold">
                                    Obj{" "}
                                    {msg.executionResult.solver_comparison.classical.objective_value ?? "—"}{" "}
                                    <span className="text-zinc-400 font-normal">
                                      ({msg.executionResult.solver_comparison.classical.constraints_satisfied}/
                                      {msg.executionResult.solver_comparison.classical.constraints_total} constraints ·{" "}
                                      {msg.executionResult.solver_comparison.classical.solve_time_ms ?? "—"} ms)
                                    </span>
                                  </span>
                                </div>
                              </div>
                              <p className="text-zinc-400 leading-relaxed font-sans text-xs">
                                {msg.executionResult.solver_comparison.summary}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── WORKBENCH SYNC CTA BUTTON ── */}
                      {onFocusWorkbench && (
                        <div className="pt-2 flex items-center justify-end">
                          <button
                            onClick={onFocusWorkbench}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-sky-300 hover:text-white transition-all cursor-pointer"
                          >
                            <span>Inspect in workbench</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── PROMINENT FLOATING ELEVATED INPUT AREA (IDE-Aligned Surface 1) ── */}
      <div
        style={{
          backgroundColor: isDark ? "#0E0F13" : "#FFFFFF",
        }}
        className={`p-4 sm:p-5 border-t shrink-0 ${
          isDark
            ? "border-white/[0.08]"
            : "border-slate-200"
        }`}
      >
        {/* Input Container (Calm, Non-Highlighted Border) */}
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: isDark ? "#090A0D" : "#FFFFFF",
          }}
          className={`rounded-xl border p-3 sm:p-3.5 relative ${
            isDark
              ? "border-white/[0.06]"
              : "border-slate-200"
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

          <div className="flex items-center justify-end pt-2 border-t border-white/[0.04] mt-1">
            {isStreaming && onStopStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center space-x-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 shadow-xs active:scale-95"
                title="Terminate running execution"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop Execution</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isStreaming || !inputText.trim()}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isStreaming || !inputText.trim()
                    ? "bg-white/[0.04] text-zinc-600 border border-white/[0.06] cursor-not-allowed"
                    : "bg-sky-500 hover:bg-sky-400 text-black shadow-xs active:scale-95"
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
  );
}
