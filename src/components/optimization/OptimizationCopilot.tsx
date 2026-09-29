"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  X,
  Zap,
  Lightbulb,
} from "lucide-react";
import { OptimizationSectionId, CopilotMessage, ThemeColors } from "./types";
import { LatexMath } from "./LatexMath";

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
}: OptimizationCopilotProps) {
  const [input, setInput] = useState("");
  const [showSuggestionsPopover, setShowSuggestionsPopover] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isQiskit = framework === "qiskit";

  // Auto-scroll chat on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

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

  // Dynamic Prompt Options
  const prompts = isQiskit
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
    : selectedSection === "02"
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
      ];

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
              <p className="leading-relaxed break-words [word-break:break-word] overflow-wrap-anywhere">{msg.text}</p>

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
                  <span className="text-amber-400 text-xs shrink-0">💡</span>
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
                ? "Qwen-27B analyzing circuit gate matrix..."
                : "Qwen-27B formulating penalty Hamiltonian..."}
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
              className={`w-full p-2.5 bg-transparent text-xs font-mono outline-none resize-none leading-relaxed placeholder-zinc-500 ${
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
