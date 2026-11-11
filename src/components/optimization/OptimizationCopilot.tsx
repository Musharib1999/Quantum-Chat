"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  X,
  Zap,
  Lightbulb,
  Bot,
  Loader2,
  Code2,
  Check,
  Layers,
  Cpu,
  RotateCcw,
} from "lucide-react";
import { OptimizationSectionId, CopilotMessage, ThemeColors } from "./types";
import { LatexMath } from "./LatexMath";
import IdeMarkdownRenderer from "@/components/IdeMarkdownRenderer";

export interface OptimizationCopilotProps {
  isDark?: boolean;
  colors: ThemeColors;
  framework?: "dwave" | "qiskit";
  selectedSection: OptimizationSectionId;
  onSelectSection: (sec: OptimizationSectionId) => void;
  messages: CopilotMessage[];
  onSendMessage: (text: string) => void;
  isThinking?: boolean;
  onApplyMutualExclusion?: () => void;
  onApplyCircuitAction?: () => void;
  solutionHealth?: any;
  circuitHealth?: any;
  variables?: string[];
  isPortfolioProblem?: boolean;
  onApplyCodeToEditor?: (code: string, meta?: any) => void;
  onClearChat?: () => void;
  isJourney?: boolean;
  journeyStage?: "explore" | "quiz" | "challenge" | "completed";
  journeyMilestoneId?: number;
}

// Splits markdown text into logical lines while keeping multi-line $$...$$ or \[...\] math blocks intact
function splitIntoLogicalLines(text: string): string[] {
  if (!text) return [];
  const rawLines = text.split("\n");
  const logicalLines: string[] = [];
  let inDisplayMath = false;
  let mathBuffer: string[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    const dollarCount = (line.match(/\$\$/g) || []).length;
    if (!inDisplayMath) {
      if ((dollarCount === 1) || (trimmed.startsWith("\\[") && !trimmed.endsWith("\\]"))) {
        inDisplayMath = true;
        mathBuffer = [line];
      } else {
        logicalLines.push(line);
      }
    } else {
      mathBuffer.push(line);
      if (dollarCount >= 1 || trimmed.endsWith("\\]")) {
        inDisplayMath = false;
        logicalLines.push(mathBuffer.join("\n"));
        mathBuffer = [];
      }
    }
  }
  if (mathBuffer.length > 0) {
    logicalLines.push(mathBuffer.join("\n"));
  }
  return logicalLines;
}

function LiveWorkingTrace({ isQiskit, isDark, onTick }: { isQiskit: boolean; isDark: boolean; onTick?: () => void }) {
  const steps = isQiskit
    ? [
        "Inspecting active editor buffer & line numbers...",
        "Reading AerSimulator stdout, stderr & measurement counts...",
        "Checking Qiskit 2.x gate syntax & state transitions...",
        "Synthesizing pinpointed diagnosis & solution...",
      ]
    : [
        "Inspecting active editor buffer & line numbers...",
        "Reading solver stdout, traceback & BQM/QUBO telemetry...",
        "Verifying objective biases & quadratic penalty couplers...",
        "Synthesizing pinpointed diagnosis & solution...",
      ];

  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev < steps.length) {
          if (onTick) onTick();
          return prev + 1;
        }
        return prev;
      });
    }, 420);
    return () => clearInterval(timer);
  }, [steps.length, onTick]);

  return (
    <div className="py-1 px-0.5 space-y-1.5 select-none font-mono text-[11px]">
      {steps.slice(0, visibleCount).map((stepText, idx) => {
        const isCurrent = idx === visibleCount - 1;
        return (
          <div
            key={idx}
            className={`flex items-center space-x-2 transition-opacity duration-150 ${
              isCurrent
                ? isDark
                  ? "text-sky-300"
                  : "text-sky-700 font-medium"
                : isDark
                ? "text-zinc-400"
                : "text-slate-500"
            }`}
          >
            {isCurrent ? (
              <Loader2 className="w-3 h-3 text-sky-400 animate-spin shrink-0" />
            ) : (
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            )}
            <span className="truncate">{stepText}</span>
            {isCurrent && (
              <span className="inline-block w-1.5 h-3 bg-sky-400 animate-pulse shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProgressiveAiResponse({
  msg,
  isDark,
  isQiskit,
  shouldAnimate,
  onComplete,
  onTickScroll,
  onApplyCodeToEditor,
}: {
  msg: CopilotMessage;
  isDark: boolean;
  isQiskit: boolean;
  shouldAnimate: boolean;
  onComplete: () => void;
  onTickScroll: () => void;
  onApplyCodeToEditor?: (code: string, meta?: any) => void;
}) {
  const proseLines = React.useMemo(() => splitIntoLogicalLines(msg.text || ""), [msg.text]);
  const codeLines = React.useMemo(
    () => (msg.generatedCode ? msg.generatedCode.split("\n") : []),
    [msg.generatedCode]
  );

  const [visibleProseCount, setVisibleProseCount] = useState<number>(() =>
    shouldAnimate ? Math.min(1, proseLines.length) : proseLines.length
  );
  const [visibleCodeCount, setVisibleCodeCount] = useState<number>(() =>
    shouldAnimate ? 0 : codeLines.length
  );
  const codePreRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    if (!shouldAnimate) {
      setVisibleProseCount(proseLines.length);
      setVisibleCodeCount(codeLines.length);
      return;
    }

    if (visibleProseCount < proseLines.length) {
      const t = setTimeout(() => {
        setVisibleProseCount((c) => Math.min(proseLines.length, c + 1));
        onTickScroll();
      }, 75);
      return () => clearTimeout(t);
    }

    if (codeLines.length > 0 && visibleCodeCount < codeLines.length) {
      const t = setTimeout(() => {
        setVisibleCodeCount((c) => Math.min(codeLines.length, c + 1));
        if (codePreRef.current) {
          codePreRef.current.scrollTop = codePreRef.current.scrollHeight;
        }
        onTickScroll();
      }, 35);
      return () => clearTimeout(t);
    }

    onComplete();
  }, [
    shouldAnimate,
    visibleProseCount,
    visibleCodeCount,
    proseLines.length,
    codeLines.length,
    onComplete,
    onTickScroll,
  ]);

  const isPrintingProse = shouldAnimate && visibleProseCount < proseLines.length;
  const isPrintingCode =
    shouldAnimate &&
    visibleProseCount >= proseLines.length &&
    codeLines.length > 0 &&
    visibleCodeCount < codeLines.length;

  const displayedProse = shouldAnimate
    ? proseLines.slice(0, visibleProseCount).join("\n")
    : msg.text;
  const displayedCode = shouldAnimate
    ? codeLines.slice(0, Math.max(1, visibleCodeCount)).join("\n")
    : msg.generatedCode;

  return (
    <>
      <div className="w-full min-w-0 overflow-hidden leading-relaxed">
        <IdeMarkdownRenderer content={displayedProse} isDark={isDark} />
        {isPrintingProse && (
          <div className="flex items-center space-x-1.5 pt-1 font-mono text-[10px] text-sky-400/90 select-none">
            <span className="inline-block w-1.5 h-3 bg-sky-400 animate-pulse" />
            <span>
              Printing line {visibleProseCount}/{proseLines.length}...
            </span>
          </div>
        )}
      </div>

      {msg.generatedCode && (!shouldAnimate || visibleProseCount >= proseLines.length) && (
        <div className="space-y-2 pt-2 w-full min-w-0">
          <div
            className="p-2.5 rounded-lg border space-y-2"
            style={{
              backgroundColor: isDark ? "#0A0B0E" : "#F1F5F9",
              borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#CBD5E1",
            }}
          >
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-300 font-semibold flex items-center space-x-1.5">
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isQiskit ? "Updated Qiskit Script" : "Updated D-Wave Script"}</span>
              </span>
              {isPrintingCode ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center space-x-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>
                    Line {visibleCodeCount}/{codeLines.length}
                  </span>
                </span>
              ) : msg.formulationMeta?.q_size ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {msg.formulationMeta.q_size} Qubits
                </span>
              ) : null}
            </div>

            <pre
              ref={codePreRef}
              className="p-2 rounded bg-black/40 text-[10px] font-mono text-zinc-300 max-h-36 overflow-y-auto custom-scrollbar whitespace-pre leading-relaxed border border-white/[0.05]"
            >
              {displayedCode}
              {isPrintingCode && (
                <span className="inline-block w-1.5 h-3 ml-0.5 bg-emerald-400 animate-pulse align-middle" />
              )}
            </pre>

            <button
              onClick={() =>
                onApplyCodeToEditor && onApplyCodeToEditor(msg.generatedCode!, msg.formulationMeta)
              }
              className={`w-full py-2 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center space-x-2 shadow-md ${
                msg.appliedToEditor
                  ? "bg-emerald-600 text-white shadow-emerald-500/20"
                  : "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-500/20"
              }`}
            >
              {msg.appliedToEditor ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Injected into Monaco Editor & Running</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Apply to Monaco Editor & Run</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function OptimizationCopilot({
  isDark = true,
  colors,
  framework = "dwave",
  selectedSection,
  onSelectSection,
  messages,
  onSendMessage,
  isThinking = false,
  onApplyMutualExclusion,
  onApplyCircuitAction,
  variables = [],
  isPortfolioProblem = true,
  onApplyCodeToEditor,
  onClearChat,
  isJourney = false,
  journeyStage = "explore",
  journeyMilestoneId = 0,
}: OptimizationCopilotProps) {
  const [input, setInput] = useState("");
  const [showSuggestionsPopover, setShowSuggestionsPopover] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mountTimeRef = useRef<number>(Date.now());
  const animatedMsgIdsRef = useRef<Set<number>>(new Set());
  const completedMsgIdsRef = useRef<Set<number>>(
    new Set(messages.map((m) => m.id))
  );

  const isQiskit = framework === "qiskit";

  const scrollToBottom = React.useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  // Track messages that started streaming or arrived after mount so they print line-by-line once
  useEffect(() => {
    messages.forEach((m) => {
      if (m.sender === "assistant") {
        if (m.isStreaming) {
          animatedMsgIdsRef.current.add(m.id);
        } else if (m.id > mountTimeRef.current && !completedMsgIdsRef.current.has(m.id)) {
          animatedMsgIdsRef.current.add(m.id);
        }
      }
    });
    scrollToBottom();
  }, [messages, isThinking, scrollToBottom]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
    setShowSuggestionsPopover(false);
  };

  const handleChipClick = (promptText: string) => {
    onSendMessage(promptText);
    setShowSuggestionsPopover(false);
  };

  // Dynamic Prompt Options (Context-Aware for Journey & Studio)
  const prompts = isJourney
    ? journeyStage === "explore"
      ? [
          {
            label: "What does state |+⟩ mean?",
            query: "What does state |+⟩ mean?",
          },
          {
            label: "Show Dirac notation",
            query: "Show Dirac notation",
          },
          {
            label: "Run Aer Simulator",
            query: "Run Aer Simulator",
          },
        ]
      : journeyStage === "quiz"
      ? [
          {
            label: "Give me a hint",
            query: "Give me a hint",
          },
          {
            label: "Explain with an analogy",
            query: "Explain with an analogy",
          },
          {
            label: "Skip to Challenge",
            query: "Skip to Challenge",
          },
        ]
      : journeyStage === "challenge"
      ? [
          {
            label: "Validate my circuit",
            query: "Validate my circuit",
          },
          {
            label: "Socratic Hint Level 1",
            query: "Socratic Hint Level 1",
          },
          {
            label: "Reset starter code",
            query: "Reset starter code",
          },
        ]
      : [
          {
            label: "Next module",
            query: "Next module",
          },
          {
            label: "Explain key takeaways",
            query: "Summarize the key mathematical takeaways of this completed module.",
          },
          {
            label: "Restart journey",
            query: "Restart journey",
          },
        ]
    : isQiskit
    ? [
        {
          label: "Explain Bob's conditional X and Z correction gates",
          query: "Explain Bob's conditional X and Z correction gates in teleportation",
        },
        {
          label: "Add depolarizing noise model to simulate real QPU",
          query: "Add depolarizing noise model to simulate real QPU decoherence",
        },
        {
          label: "Transpile circuit to native CX + SX + RZ basis gates",
          query: "Transpile circuit to native CX + SX + RZ basis gates",
        },
      ]
    : isPortfolioProblem
    ? selectedSection === "02"
      ? [
          {
            label: "Is λ = 3.5x optimal? Calculate λ > max |ΔH_obj|",
            query: "Is lambda = 3.5x optimal? Calculate lambda > max |Delta H_obj|",
          },
          {
            label: "Switch slack bit decomposition to binary one-hot",
            query: "Switch slack bit decomposition from logarithmic (2^k) to binary one-hot",
          },
          {
            label: "Tighten penalty stiffness to eliminate violations",
            query: "Tighten penalty stiffness to strictly eliminate ground-state violations",
          },
        ]
      : selectedSection === "03"
      ? [
          {
            label: "Explain step-by-step how coupler Q_01 = 15.7 was derived",
            query: "Explain step-by-step how coupler Q_01 = 15.7 was derived",
          },
          {
            label: "Why does mutual exclusion add +8.0 to coupler?",
            query: "Why does mutual exclusion add +8.0 to the off-diagonal coupler?",
          },
          {
            label: "Calculate matrix sparsity percentage & dynamic range",
            query: "What is the sparsity percentage and dynamic range of this matrix?",
          },
        ]
      : [
          {
            label: "Add carbon emission constraint: ∑ E_i x_i ≤ E_max",
            query: "Add carbon emissions ceiling constraint: ∑ E_i x_i ≤ E_max",
          },
          {
            label: "Add mutual exclusion: Wind_A & Solar_B cannot both be built",
            query: "Add a constraint where Wind_A and Solar_B cannot both be built simultaneously.",
          },
          {
            label: "Convert objective to Markowitz quadratic risk (x^T Σ x)",
            query: "Convert objective from linear yield to Markowitz covariance risk (x^T Σ x)",
          },
        ]
    : (() => {
        const vList = variables && variables.length > 0 ? variables : ["x"];
        const v0 = vList[0];
        const v1 = vList.length > 1 ? vList[1] : null;

        if (selectedSection === "02") {
          return [
            {
              label: "Formulate quadratic penalty multiplier (λ)",
              query: "How should I select penalty multiplier stiffness lambda to elevate infeasible states above ground energy?",
            },
            {
              label: "Decompose inequality with binary slack bits",
              query: "Explain how to convert inequality constraints into equality using logarithmic slack bit decomposition",
            },
            {
              label: "Calculate Hamiltonian dynamic range",
              query: "Analyze the dynamic range of coefficients in this Hamiltonian formulation",
            },
          ];
        }
        if (selectedSection === "03") {
          return [
            {
              label: v1 ? `Explain coupling between ${v0} and ${v1}` : `Explain self-energy of ${v0}`,
              query: v1 ? `Explain the quadratic coupling J between ${v0} and ${v1}` : `Explain the diagonal linear bias h on variable ${v0}`,
            },
            {
              label: "Analyze matrix sparsity & connectivity",
              query: "What is the sparsity percentage and dynamic range of this Q-matrix?",
            },
            {
              label: "Verify Chimera/Pegasus graph embedding",
              query: "Can this problem graph be embedded directly onto D-Wave Pegasus QPU without chain breaks?",
            },
          ];
        }
        return [
          {
            label: v1 ? `Add mutual exclusion between ${v0} and ${v1}` : `Add quadratic interaction for ${v0}`,
            query: v1 ? `Add a mutual exclusion constraint where ${v0} and ${v1} cannot both be active.` : `How do I add a second variable and couple it quadratically with ${v0}?`,
          },
          {
            label: `Explain optimal decision state for ${v0}`,
            query: `Analyze the ground state decision and energy distribution for ${v0}.`,
          },
          {
            label: "Explain BQM to Ising transformation",
            query: "Explain the algebraic transformation from binary variables {0, 1} to Ising spin variables {-1, +1}",
          },
        ];
      })();

  return (
    <div
      className="w-full h-full max-h-full min-h-0 min-w-0 flex flex-col border-l font-sans overflow-hidden"
      style={{ backgroundColor: colors.bgSection3, borderColor: colors.border }}
    >
      {/* ── HEADER: PURE MINIMAL TITLE (No Project, No Simulator, No Telemetry) ── */}
      <div
        className="px-3.5 py-3 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: colors.border }}
      >
        <div className="flex items-center space-x-2">
          {isQiskit ? (
            <Zap className="w-4 h-4 text-indigo-400 fill-current" />
          ) : (
            <Zap className="w-4 h-4 text-sky-400 fill-current" />
          )}
          <h3
            className="font-semibold text-xs font-heading tracking-wide"
            style={{ color: colors.textPrimary }}
          >
            {isQiskit ? "Circuit Copilot" : "Optimization Copilot"}
          </h3>
        </div>
        {onClearChat && (
          <button
            onClick={onClearChat}
            title="Clear conversation for this project"
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors border border-transparent hover:border-white/10 hover:bg-white/[0.06] text-slate-400 hover:text-slate-200"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* ── CHAT STREAM (100% Height for Conversation) ── */}
      <div
        ref={chatContainerRef}
        className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-3.5 space-y-3.5 text-xs custom-scrollbar"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col space-y-1 w-full min-w-0 ${
              msg.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`p-3 rounded-xl max-w-[94%] min-w-0 overflow-hidden space-y-2 break-words [word-break:break-word] ${
                msg.sender === "user"
                  ? "bg-sky-600 text-white rounded-tr-none shadow-sm"
                  : "rounded-tl-none border shadow-xs"
              }`}
              style={
                msg.sender === "user"
                  ? { maxWidth: "90%", boxSizing: "border-box" }
                  : {
                      backgroundColor: colors.bgCard,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      maxWidth: "100%",
                      boxSizing: "border-box",
                      boxShadow: !isDark
                        ? "0 2px 8px rgba(15, 23, 42, 0.06)"
                        : undefined,
                    }
              }
            >
              {msg.sender === "user" ? (
                <p className="text-[13.5px] leading-relaxed break-words [word-break:break-word] overflow-wrap-anywhere">{msg.text}</p>
              ) : msg.isStreaming && (!msg.text || msg.text === "Analyzing circuit and reasoning with Quantum Guru Copilot..." || msg.text === "Thinking...") ? (
                <LiveWorkingTrace isQiskit={isQiskit} isDark={isDark} onTick={scrollToBottom} />
              ) : (
                <ProgressiveAiResponse
                  msg={msg}
                  isDark={isDark}
                  isQiskit={isQiskit}
                  shouldAnimate={
                    animatedMsgIdsRef.current.has(msg.id) &&
                    !completedMsgIdsRef.current.has(msg.id)
                  }
                  onComplete={() => {
                    completedMsgIdsRef.current.add(msg.id);
                  }}
                  onTickScroll={scrollToBottom}
                  onApplyCodeToEditor={onApplyCodeToEditor}
                />
              )}

              {/* Live Autonomous Multi-Agent Reasoning Pipeline (Scoped strictly to Autonomous QUBO Formulation) */}
              {!isQiskit && msg.pipelineSteps && msg.pipelineSteps.length > 0 && (
                <div className="space-y-2 pt-2 w-full min-w-0">
                  <div
                    className="p-2.5 rounded-lg border space-y-2"
                    style={{
                      backgroundColor: isDark ? "rgba(0, 0, 0, 0.4)" : "#F8FAFC",
                      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0",
                    }}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono border-b pb-1.5" style={{ borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E2E8F0" }}>
                      <span className="font-semibold text-sky-400 flex items-center space-x-1.5">
                        <Bot className="w-3.5 h-3.5" />
                        <span>Autonomous Optimization Engine</span>
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {msg.isStreaming ? (
                          <span className="flex items-center space-x-1 text-amber-400">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Synthesizing</span>
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">Verified</span>
                        )}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      {msg.pipelineSteps.map((step) => (
                        <div key={step.id} className="flex items-start space-x-2 py-0.5">
                          <div className="mt-0.5 shrink-0">
                            {step.status === "running" ? (
                              <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                            ) : step.status === "done" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : step.status === "failed" ? (
                              <X className="w-3.5 h-3.5 text-rose-400" />
                            ) : (
                              <span className="w-3.5 h-3.5 rounded-full border border-zinc-600 block" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold font-mono text-[10px]" style={{ color: colors.textPrimary }}>
                                {step.title}
                              </span>
                            </div>
                            {step.message && (
                              <p className="text-[10px] mt-0.5" style={{ color: colors.textMuted }}>
                                {step.message}
                              </p>
                            )}
                            {step.details && (
                              <p className="text-[9px] font-mono text-sky-400/90 mt-0.5">
                                {step.details}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}



              {/* KaTeX Math Formula Bubble (Bounded width & horizontal scroll) */}
              {msg.mathFormula && (
                <div className="space-y-2 pt-1 w-full min-w-0 max-w-full overflow-hidden">
                  <div
                    className="p-2.5 rounded-lg font-mono text-xs w-full max-w-full overflow-x-auto custom-scrollbar flex items-center"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.04)"
                        : "#F1F5F9",
                    }}
                  >
                    <div className="w-full min-w-0 max-w-full overflow-x-auto custom-scrollbar">
                      <LatexMath
                        math={msg.mathFormula}
                        inline={false}
                        isDark={isDark}
                      />
                    </div>
                  </div>

                  {/* Impact Checklist */}
                  {msg.breakdown && (
                    <div
                      className="space-y-1 text-[11px]"
                      style={{ color: colors.textMuted }}
                    >
                      {msg.breakdown.map((item, idx) => (
                        <div key={idx} className="flex items-start space-x-1.5">
                          <span
                            className={
                              isQiskit
                                ? "text-indigo-400 font-bold"
                                : "text-sky-400 font-bold"
                            }
                          >
                            •
                          </span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Proposal Action Button */}
                  {msg.isMutualProposal && (
                    <button
                      onClick={
                        isQiskit
                          ? onApplyCircuitAction || onApplyMutualExclusion
                          : onApplyMutualExclusion
                      }
                      className={`w-full py-2 px-3 rounded-lg text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-md ${
                        isQiskit
                          ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
                          : "bg-fuchsia-600 hover:bg-fuchsia-500 shadow-fuchsia-500/20"
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {isQiskit
                          ? "Transpile & Verify Circuit Depth"
                          : "Recompile with Mutual Exclusion"}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
            <span
              className="text-[9px] font-mono px-1"
              style={{ color: colors.textMuted }}
            >
              {msg.timestamp}
            </span>
          </div>
        ))}

        {/* Starter Prompt Cards inside Chat Area (Visible only on initial fresh chat) */}
        {messages.length <= 1 && (
          <div className="pt-2 pb-1 space-y-1.5 animate-in fade-in duration-200">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-1">
              Suggested Starters
            </span>
            <div className="space-y-1.5">
              {prompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(p.query)}
                  className={`w-full p-2.5 rounded-lg border text-left text-xs transition-all flex items-center space-x-2 ${
                    isDark
                      ? "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] hover:border-sky-500/40 text-zinc-200"
                      : "bg-white border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 text-slate-800 shadow-xs"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                  <span className="font-mono text-[11px] leading-tight truncate">
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isThinking && (
          <div
            className="flex items-center space-x-2 text-xs italic p-2"
            style={{ color: colors.textMuted }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>
              {isQiskit
                ? "Guru AI analyzing circuit & simulator telemetry..."
                : "Guru AI analyzing Hamiltonian & solver output..."}
            </span>
          </div>
        )}
      </div>

      {/* ── MULTI-LINE INPUT CONTAINER ── */}
      <div
        className="p-3 border-t shrink-0 relative"
        style={{ borderColor: colors.border, backgroundColor: colors.bgSection3 }}
      >
        {/* Suggestions popover hidden per user request */}

        {/* Journey Stage-Aware Quick Action Chips */}
        {isJourney && prompts.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {prompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(p.query)}
                className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-all cursor-pointer ${
                  isDark
                    ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] hover:border-zinc-500 text-zinc-300 hover:text-white"
                    : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-1.5">
          <div
            className={`rounded-xl border transition-all ${
              isDark
                ? "bg-[#090A0D] border-white/[0.1] focus-within:border-sky-500/60"
                : "bg-white border-slate-200 focus-within:border-sky-500/60"
            }`}
          >
            {/* Multi-line Textarea (few lines in height, ~72px) */}
            <textarea
              ref={textareaRef}
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={
                isQiskit
                  ? "Ask about gates, circuits, entanglement, or Aer simulation..."
                  : "Ask about QUBO formulation, penalties, or slack variables..."
              }
              className={`w-full p-2.5 bg-transparent text-[13px] font-mono outline-none resize-none leading-relaxed placeholder-zinc-500 ${
                isDark ? "text-zinc-200" : "text-slate-900"
              }`}
            />

            {/* Input Box Footer Toolbar (Suggestion button hidden) */}
            <div className="px-2.5 pb-2 flex items-center justify-end text-xs select-none">
              {/* Submit Button */}
              <button
                type="submit"
                disabled={!input.trim()}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium font-mono text-xs transition-colors shadow-xs cursor-pointer ${
                  input.trim()
                    ? "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20"
                    : isDark
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/[0.06]"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                }`}
                title="Send message (Enter, Shift+Enter for new line)"
              >
                <span>Send</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>


        </form>
      </div>
    </div>
  );
}
