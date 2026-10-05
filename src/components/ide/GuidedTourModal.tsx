"use client";

import React, { useEffect, useState, useCallback } from "react";
import { X, ArrowRight, ArrowLeft, Check } from "lucide-react";

export interface TourStep {
  step: number;
  title: string;
  targetId: string;
  position: "bottom" | "top" | "left" | "right" | "inside-top";
  desc: string;
  badge: string;
  bulletPoints?: { icon: string; text: string }[];
}

export const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    title: "1. Workspace & Algorithm Templates",
    targetId: "tour-project-selector",
    position: "bottom",
    desc: "Switch between pre-scaffolded quantum algorithms (Clean Energy Portfolio, Teleportation, Grover's Search, VQE Molecular Chemistry, or D-Wave QUBO Optimization), manage multi-file projects, or open the Algorithm Vault.",
    badge: "Workspace & Blueprints",
  },
  {
    step: 2,
    title: "2. Live Quantum Code Canvas",
    targetId: "tour-editor-pane",
    position: "inside-top",
    desc: "Write and edit your Qiskit and D-Wave Python scripts with full syntax highlighting, parameter autocompletion, and live AST validation. Changes are automatically synced across the IDE.",
    badge: "Code Editor",
  },
  {
    step: 3,
    title: "3. Interactive Visual Canvas",
    targetId: "tour-visual-canvas",
    position: "inside-top",
    desc: "Your Python code is parsed live into an interactive quantum circuit diagram (with support for up to 30 qubits) or interactive D-Wave QUBO matrix. Inspect gate couplings, wire depths, and interaction terms with zero manual compilation.",
    badge: "Interactive Canvas",
  },
  {
    step: 4,
    title: "4. QPU Simulation & Persistent Console",
    targetId: "tour-bottom-console",
    position: "top",
    desc: "Execute your quantum programs directly on high-performance simulators (AerSimulator, Statevector, or D-Wave Simulated Annealer) and inspect measurement counts, eigenvalues, and execution logs in real-time.",
    badge: "Execution Engine",
  },
  {
    step: 5,
    title: "5. Agentic Quantum Copilot",
    targetId: "tour-copilot-panel",
    position: "left",
    desc: "Your personal quantum pair programmer, AST analyzer, and algorithm architect. It can:",
    bulletPoints: [
      { icon: "🧠", text: "Answer quantum computing, physics & mathematical theory" },
      { icon: "🔍", text: "Inspect and explain your active code file line-by-line" },
      { icon: "⚡", text: "Write complete, production-ready quantum scripts for you" },
      { icon: "⚛️", text: "Synthesize and mutate visual circuits and QUBO matrices directly" },
    ],
    badge: "AI Quantum Assistant",
  },
];

export interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
  steps?: TourStep[];
}

export function GuidedTourModal({
  isOpen,
  onClose,
  isDark = true,
  currentStep,
  onStepChange,
  steps = DEFAULT_TOUR_STEPS,
}: GuidedTourModalProps) {
  const [spotlightRect, setSpotlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const activeStep = steps[currentStep] || steps[0];

  // Dynamic bounding rect calculation with retries for DOM transitions
  useEffect(() => {
    if (!isOpen) {
      setSpotlightRect(null);
      return;
    }

    const updateRect = () => {
      if (!activeStep) return;
      const el = document.getElementById(activeStep.targetId);
      if (el) {
        const r = el.getBoundingClientRect();
        const pad = 6;
        setSpotlightRect({
          top: Math.max(0, r.top - pad),
          left: Math.max(0, r.left - pad),
          width: r.width + pad * 2,
          height: r.height + pad * 2,
        });
      } else {
        setSpotlightRect(null);
      }
    };

    updateRect();
    const t1 = setTimeout(updateRect, 80);
    const t2 = setTimeout(updateRect, 250);

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [isOpen, currentStep, activeStep]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (currentStep < steps.length - 1) {
          onStepChange(currentStep + 1);
        } else {
          onClose();
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentStep > 0) {
          onStepChange(currentStep - 1);
        }
      }
    },
    [isOpen, currentStep, steps.length, onClose, onStepChange]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // Popover card positioning & arrow pointer calculation
  const getPopoverLayout = () => {
    if (!spotlightRect || typeof window === "undefined") {
      return {
        style: {
          position: "fixed" as const,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(90vw, 460px)",
          zIndex: 75,
        },
        arrow: null as "up" | "down" | "left" | "right" | null,
      };
    }

    const cardWidth = Math.min(460, window.innerWidth - 32);
    const cardHeight = activeStep.bulletPoints ? 380 : 250;
    let top = 0;
    let left = 0;
    let arrow: "up" | "down" | "left" | "right" | null = null;

    if (activeStep.position === "bottom") {
      top = spotlightRect.top + spotlightRect.height + 14;
      left = Math.min(
        window.innerWidth - cardWidth - 16,
        Math.max(16, spotlightRect.left)
      );
      arrow = "up";
    } else if (activeStep.position === "top") {
      top = Math.max(16, spotlightRect.top - cardHeight - 16);
      left = Math.min(
        window.innerWidth - cardWidth - 16,
        Math.max(16, spotlightRect.left + 20)
      );
      arrow = "down";
    } else if (activeStep.position === "left") {
      top = Math.max(
        24,
        Math.min(window.innerHeight - cardHeight - 24, spotlightRect.top + 40)
      );
      left = Math.max(16, spotlightRect.left - cardWidth - 18);
      arrow = "right";
    } else {
      // inside-top
      top = Math.max(76, spotlightRect.top + 24);
      left = Math.max(
        24,
        Math.min(window.innerWidth - cardWidth - 24, spotlightRect.left + 36)
      );
      arrow = null;
    }

    return {
      style: {
        position: "fixed" as const,
        top: `${top}px`,
        left: `${left}px`,
        width: `${cardWidth}px`,
        zIndex: 75,
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      arrow,
    };
  };

  const popover = getPopoverLayout();

  return (
    <div className="fixed inset-0 z-[70] pointer-events-auto">
      {/* 1. Precision Spotlight Cutout Box (Monochromatic High-Contrast Ring) */}
      {spotlightRect && (
        <div
          style={{
            position: "fixed",
            top: `${spotlightRect.top}px`,
            left: `${spotlightRect.left}px`,
            width: `${spotlightRect.width}px`,
            height: `${spotlightRect.height}px`,
            boxShadow:
              "0 0 0 9999px rgba(0, 0, 0, 0.78), 0 0 25px rgba(255, 255, 255, 0.12)",
            borderRadius: "10px",
            border: "1.5px solid rgba(255, 255, 255, 0.4)",
            pointerEvents: "none",
            zIndex: 71,
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      )}

      {/* Fallback backdrop when spotlight rect is unavailable */}
      {!spotlightRect && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[70] transition-opacity duration-300"
        />
      )}

      {/* Transparent Clickable Overlay to Dismiss */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[72] bg-transparent cursor-pointer"
        aria-label="Click outside to exit tour"
      />

      {/* 2. Floating Anchored Step Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...popover.style,
          backgroundColor: isDark ? "#13141A" : "#ffffff",
          borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(203, 213, 225, 0.9)",
        }}
        className={`rounded-2xl border p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 select-none ${
          isDark
            ? "text-zinc-100 shadow-black/80"
            : "text-slate-900 shadow-2xl shadow-slate-400/20"
        }`}
      >
        {/* Directional Pointer Arrows */}
        {popover.arrow === "up" && (
          <div
            style={{ backgroundColor: isDark ? "#13141A" : "#ffffff" }}
            className={`absolute -top-1.5 left-10 w-3 h-3 rotate-45 border-t border-l ${
              isDark ? "border-white/20" : "border-slate-300"
            }`}
          />
        )}
        {popover.arrow === "down" && (
          <div
            style={{ backgroundColor: isDark ? "#13141A" : "#ffffff" }}
            className={`absolute -bottom-1.5 left-10 w-3 h-3 rotate-45 border-b border-r ${
              isDark ? "border-white/20" : "border-slate-300"
            }`}
          />
        )}
        {popover.arrow === "right" && (
          <div
            style={{ backgroundColor: isDark ? "#13141A" : "#ffffff" }}
            className={`absolute top-12 -right-1.5 w-3 h-3 rotate-45 border-t border-r ${
              isDark ? "border-white/20" : "border-slate-300"
            }`}
          />
        )}
        {popover.arrow === "left" && (
          <div
            style={{ backgroundColor: isDark ? "#13141A" : "#ffffff" }}
            className={`absolute top-12 -left-1.5 w-3 h-3 rotate-45 border-b border-l ${
              isDark ? "border-white/20" : "border-slate-300"
            }`}
          />
        )}

        {/* Card Header: Step Pill + Badge + Close Button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-medium ${
                isDark
                  ? "bg-white/[0.08] border-white/10 text-zinc-300"
                  : "bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              Step {currentStep + 1} of {steps.length}
            </span>
            <span
              className={`text-xs font-mono font-medium ${
                isDark ? "text-zinc-400" : "text-slate-500"
              }`}
            >
              {activeStep.badge}
            </span>
          </div>

          <button
            onClick={onClose}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isDark
                ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            }`}
            title="Exit tour (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Title */}
        <h3
          className={`text-sm font-semibold mb-2 font-mono tracking-tight flex items-center gap-2 ${
            isDark ? "text-white" : "text-slate-900"
          }`}
        >
          <span>{activeStep.title}</span>
        </h3>

        {/* Step Description */}
        <p
          className={`text-xs leading-relaxed mb-3.5 font-sans ${
            isDark ? "text-zinc-300" : "text-slate-600"
          }`}
        >
          {activeStep.desc}
        </p>

        {/* Bullet Points (Step 5 Copilot Superpowers) */}
        {activeStep.bulletPoints && (
          <div
            style={{
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "#f8fafc",
              borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0"
            }}
            className={`rounded-xl border p-3 mb-3.5 space-y-2 text-xs font-sans ${
              isDark ? "text-zinc-200" : "text-slate-700"
            }`}
          >
            <div
              className={`text-[11px] font-mono font-semibold uppercase tracking-wider ${
                isDark ? "text-zinc-400" : "text-slate-500"
              }`}
            >
              4 Core Copilot Capabilities:
            </div>
            {activeStep.bulletPoints.map((bp, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="shrink-0 text-sm leading-none mt-0.5">
                  {bp.icon}
                </span>
                <span className="leading-snug text-xs">{bp.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Progress Bar (Monochrome Platinum Accent) */}
        <div
          className={`w-full rounded-full h-1 mb-4 overflow-hidden ${
            isDark ? "bg-zinc-800" : "bg-slate-200"
          }`}
        >
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isDark ? "bg-zinc-200" : "bg-slate-900"
            }`}
            style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
            }}
          />
        </div>

        {/* Footer Actions: Skip, Back, Next / Finish */}
        <div
          className={`flex items-center justify-between pt-3 border-t ${
            isDark ? "border-white/[0.08]" : "border-slate-100"
          }`}
        >
          <button
            onClick={onClose}
            className={`text-xs font-mono transition-colors cursor-pointer px-1 ${
              isDark
                ? "text-zinc-400 hover:text-zinc-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => onStepChange(currentStep - 1)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors border cursor-pointer ${
                  isDark
                    ? "bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.08] text-zinc-300 hover:text-white"
                    : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => onStepChange(currentStep + 1)}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shadow-sm cursor-pointer ${
                  isDark
                    ? "bg-zinc-200 hover:bg-white text-zinc-900 shadow-zinc-900/20 active:scale-[0.98]"
                    : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10 active:scale-[0.98]"
                }`}
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shadow-sm cursor-pointer ${
                  isDark
                    ? "bg-zinc-200 hover:bg-white text-zinc-900 shadow-zinc-900/20 active:scale-[0.98]"
                    : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10 active:scale-[0.98]"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Finish Tour</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
