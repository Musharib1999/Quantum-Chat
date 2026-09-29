"use client";

import React, { useState } from "react";
import { Sparkles, Zap, Copy, Check, Sliders, ShieldAlert, ArrowRight } from "lucide-react";
import { OptimizationSectionId, MathFormulationParams, ThemeColors } from "./types";
import { LatexMath } from "./LatexMath";

export interface FormulationCanvasProps {
  isDark?: boolean;
  colors: ThemeColors;
  mathParams: MathFormulationParams;
  setMathParams: React.Dispatch<React.SetStateAction<MathFormulationParams>>;
  onRecompile?: () => void;
  isDirty?: boolean;
  selectedSection: OptimizationSectionId;
  onSelectSection: (sec: OptimizationSectionId) => void;
  onCopyLatex?: (latex: string) => void;
  customBqmFormula?: string;
  variables?: string[];
  activeFileName?: string;
  projectName?: string;
  isPortfolioProblem?: boolean;
}

export function FormulationCanvas({
  isDark = true,
  colors,
  mathParams,
  setMathParams,
  onRecompile,
  isDirty = false,
  selectedSection,
  onSelectSection,
  onCopyLatex,
  customBqmFormula,
  variables,
  activeFileName,
  projectName,
  isPortfolioProblem = true,
}: FormulationCanvasProps) {
  const [copiedLatex, setCopiedLatex] = useState(false);

  const {
    budgetMax,
    yieldWeight,
    minDiversity,
    penaltyLambda,
    hasMutualExclusion,
    hasCarbonCeiling,
    isMarkowitz,
  } = mathParams;

  const handleCopy = () => {
    const fullLatex = `\\min_{x \\in \\{0, 1\\}^4} \\mathcal{H}_{\\text{obj}}(x) = \\sum_{i=1}^4 C_i x_i - ${yieldWeight.toFixed(1)} \\sum_{i=1}^4 R_i x_i \\quad \\text{s.t.} \\quad \\sum_{i=1}^4 C_i x_i \\le ${budgetMax.toFixed(1)} \\text{ M}`;
    if (onCopyLatex) {
      onCopyLatex(fullLatex);
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(fullLatex);
    }
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2000);
  };

  // Section 01 LaTeX
  const objFormula = isMarkowitz
    ? `\\min_{x \\in \\{0, 1\\}^4} \\quad \\mathcal{H}_{\\text{obj}}(x) = \\sum_{i=1}^4 \\sum_{j=1}^4 \\sigma_{ij} x_i x_j - ${yieldWeight.toFixed(1)} \\sum_{i=1}^4 R_i x_i`
    : `\\min_{x \\in \\{0, 1\\}^4} \\quad \\mathcal{H}_{\\text{obj}}(x) = \\sum_{i=1}^4 C_i x_i - ${yieldWeight.toFixed(1)} \\sum_{i=1}^4 R_i x_i`;

  let constraintsFormula = `\\text{subject to } \\sum_{i=1}^4 C_i x_i \\le B_{\\text{max}} = ${budgetMax.toFixed(1)} \\text{ M} \\quad \\text{and} \\quad \\sum_{i=1}^4 x_i \\ge ${minDiversity}`;
  if (hasMutualExclusion) {
    constraintsFormula += ` \\quad \\text{and} \\quad x_{\\text{wind}} + x_{\\text{solar}} \\le 1`;
  }
  if (hasCarbonCeiling) {
    constraintsFormula += ` \\quad \\text{and} \\quad \\sum_{i=1}^4 E_i x_i \\le E_{\\text{max}}`;
  }

  // Section 02 LaTeX
  let penaltyFormula = `\\mathcal{H}_{\\text{penalty}}(x, s) = ${penaltyLambda.toFixed(1)} \\left( \\sum_{i=1}^4 C_i x_i + \\sum_{k=0}^1 2^k s_k - ${budgetMax.toFixed(1)} \\right)^2 + 2.0 \\left( ${minDiversity} - \\sum_{i=1}^4 x_i + s_{\\text{div}} \\right)^2`;
  if (hasMutualExclusion) {
    penaltyFormula += ` + \\mathbf{\\lambda_{\\text{ex}} (x_{\\text{wind}} \\cdot x_{\\text{solar}})}`;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 lg:p-6 space-y-6">
      {/* Subheader / Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: colors.border }}>
        <div className="flex items-center space-x-2.5">
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border" style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}>
            {isPortfolioProblem ? "qubo_penalty_formulation.tex" : (activeFileName || "main.py")}
          </span>
          <span className="text-[11px] font-mono" style={{ color: colors.textMuted }}>
            {isPortfolioProblem ? "in Clean Energy Portfolio" : `in ${projectName || "Custom Project"}`}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="text-[11px] font-mono text-emerald-400">D-Wave BQM Verified</span>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-[11px] font-mono" style={{ color: colors.textMuted }}>
            {isPortfolioProblem ? "42 Variables" : `${variables && variables.length > 0 ? variables.length : 1} Variable${variables && variables.length === 1 ? "" : "s"}`} · Advantage QPU
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs transition-colors border"
            style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}
            title="Copy LaTeX formulation"
          >
            {copiedLatex ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLatex ? "Copied" : "Copy LaTeX"}</span>
          </button>
        </div>
      </div>

      {/* Dirty State / Recompile Alert Banner */}
      {isDirty && (
        <div
          className="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 animate-in fade-in"
          style={{ backgroundColor: isDark ? "rgba(245, 158, 11, 0.08)" : "#FEF3C7", borderColor: isDark ? "rgba(245, 158, 11, 0.25)" : "#FDE68A" }}
        >
          <div className="flex items-center space-x-2.5">
            <span className="text-amber-400 font-bold">⚡</span>
            <div className="text-xs">
              <span className="font-semibold" style={{ color: isDark ? "#FCD34D" : "#92400E" }}>
                Formulation parameters modified:
              </span>{" "}
              <span style={{ color: isDark ? "#E5E7EB" : "#78350F" }}>
                Q-Matrix couplers, energy spectrum, and code must be recompiled.
              </span>
            </div>
          </div>
          {onRecompile && (
            <button
              onClick={onRecompile}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Recompile QUBO Pipeline</span>
            </button>
          )}
        </div>
      )}

      {/* SECTION 01: PRIMAL OPTIMIZATION PROBLEM */}
      <div
        id="math-section-01"
        className={`p-5 rounded-xl border space-y-4 transition-all ${
          selectedSection === "01"
            ? "ring-1 ring-sky-500/30 shadow-lg shadow-sky-500/10"
            : ""
        }`}
        style={{
          backgroundColor: selectedSection === "01" ? (isDark ? "#11131a" : "rgba(240, 249, 255, 0.6)") : colors.bgCard,
          borderColor: selectedSection === "01" ? "rgba(14, 165, 233, 0.6)" : colors.border,
        }}
      >
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: colors.border }}>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm font-bold text-amber-400">01</span>
            <h3 className="font-semibold text-sm" style={{ color: colors.textPrimary }}>
              Primal Mathematical Optimization Model
            </h3>
            {selectedSection === "01" && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center space-x-1 animate-pulse">
                <span>🎯 Scoped in Copilot</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              BQM Canonical Form
            </span>
            <button
              onClick={() => onSelectSection(selectedSection === "01" ? null : "01")}
              className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md transition-all border ${
                selectedSection === "01"
                  ? "bg-sky-500 text-white font-semibold border-sky-400"
                  : "hover:border-sky-400/40"
              }`}
              style={selectedSection === "01" ? {} : { backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}
              title="Scope Optimization Copilot to Section 01"
            >
              <Sparkles className="w-3 h-3 text-current" />
              <span>{selectedSection === "01" ? "Scoped" : "Ask Copilot"}</span>
            </button>
          </div>
        </div>

        {/* Mathematical Formula Output */}
        <div
          className="p-4 rounded-lg flex flex-col items-center justify-center space-y-3 border overflow-x-auto text-xs sm:text-sm"
          style={{ backgroundColor: colors.bgSection2, borderColor: colors.border }}
        >
          {customBqmFormula ? (
            <LatexMath math={`\\min_{\\mathbf{x} \\in \\{0, 1\\}^{${variables?.length || 1}}} \\quad \\mathcal{H}(\\mathbf{x}) = ${customBqmFormula}`} inline={false} isDark={isDark} />
          ) : (
            <>
              <LatexMath math={objFormula} inline={false} isDark={isDark} />
              <LatexMath math={constraintsFormula} inline={false} isDark={isDark} />
            </>
          )}
        </div>

        {/* Interactive Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Budget Cap */}
          <div className="p-3 rounded-lg border space-y-1.5" style={{ backgroundColor: colors.bgSection2, borderColor: colors.border }}>
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: colors.textPrimary }}>Budget Cap (B_max)</span>
              <span className="font-mono text-[10px] text-emerald-400">Inequality Constraint</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono" style={{ color: colors.textMuted }}>$</span>
              <input
                type="number"
                step="0.5"
                min="6"
                max="40"
                value={budgetMax}
                onChange={(e) => setMathParams(prev => ({ ...prev, budgetMax: parseFloat(e.target.value) || 0 }))}
                className="w-full text-xs font-mono px-2 py-1 rounded border outline-none font-semibold"
                style={{ backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }}
              />
              <span className="text-xs font-mono" style={{ color: colors.textMuted }}>M</span>
            </div>
            <p className="text-[10px]" style={{ color: colors.textMuted }}>Capex ceiling across chosen facilities.</p>
          </div>

          {/* Yield Weight */}
          <div className="p-3 rounded-lg border space-y-1.5" style={{ backgroundColor: colors.bgSection2, borderColor: colors.border }}>
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: colors.textPrimary }}>Yield Weight (γ)</span>
              <span className="font-mono text-[10px] text-sky-400">Objective Tradeoff</span>
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={yieldWeight}
                onChange={(e) => setMathParams(prev => ({ ...prev, yieldWeight: parseFloat(e.target.value) }))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <span className="text-xs font-mono font-semibold w-10 text-right" style={{ color: colors.textCyan }}>
                {yieldWeight.toFixed(1)}x
              </span>
            </div>
            <p className="text-[10px]" style={{ color: colors.textMuted }}>Penalizes cost vs. clean MW yield.</p>
          </div>

          {/* Min Diversity */}
          <div className="p-3 rounded-lg border space-y-1.5" style={{ backgroundColor: colors.bgSection2, borderColor: colors.border }}>
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: colors.textPrimary }}>Min Diversity (K_min)</span>
              <span className="font-mono text-[10px] text-amber-400">Sites</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="4"
                value={minDiversity}
                onChange={(e) => setMathParams(prev => ({ ...prev, minDiversity: parseInt(e.target.value) || 1 }))}
                className="w-full text-xs font-mono px-2 py-1 rounded border outline-none font-semibold"
                style={{ backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }}
              />
              <span className="text-xs font-mono" style={{ color: colors.textMuted }}>Sites</span>
            </div>
            <p className="text-[10px]" style={{ color: colors.textMuted }}>Requires at least K distinct sites.</p>
          </div>
        </div>
      </div>

      {/* SECTION 02: QUBO PENALTY & SLACKS */}
      <div
        id="math-section-02"
        className={`p-5 rounded-xl border space-y-4 transition-all ${
          selectedSection === "02"
            ? "ring-1 ring-sky-500/30 shadow-lg shadow-sky-500/10"
            : ""
        }`}
        style={{
          backgroundColor: selectedSection === "02" ? (isDark ? "#11131a" : "rgba(240, 249, 255, 0.6)") : colors.bgCard,
          borderColor: selectedSection === "02" ? "rgba(14, 165, 233, 0.6)" : colors.border,
        }}
      >
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: colors.border }}>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm font-bold text-amber-400">02</span>
            <h3 className="font-semibold text-sm" style={{ color: colors.textPrimary }}>
              QUBO Penalty Hamiltonian &amp; Slack Transformation
            </h3>
            {selectedSection === "02" && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center space-x-1 animate-pulse">
                <span>🎯 Scoped in Copilot</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 mr-2">
              <span className="text-xs font-mono" style={{ color: colors.textMuted }}>Multiplier:</span>
              <span className="text-xs font-mono font-bold text-amber-400">λ = {penaltyLambda.toFixed(1)}</span>
            </div>
            <button
              onClick={() => onSelectSection(selectedSection === "02" ? null : "02")}
              className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md transition-all border ${
                selectedSection === "02"
                  ? "bg-sky-500 text-white font-semibold border-sky-400"
                  : "hover:border-sky-400/40"
              }`}
              style={selectedSection === "02" ? {} : { backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}
              title="Scope Optimization Copilot to Section 02"
            >
              <Sparkles className="w-3 h-3 text-current" />
              <span>{selectedSection === "02" ? "Scoped" : "Ask Copilot"}</span>
            </button>
          </div>
        </div>

        {/* Math Penalty Representation */}
        <div
          className="p-4 rounded-lg flex flex-col items-center justify-center space-y-3 border overflow-x-auto text-xs sm:text-sm"
          style={{ backgroundColor: colors.bgSection2, borderColor: colors.border }}
        >
          <LatexMath math={penaltyFormula} inline={false} isDark={isDark} />
          <LatexMath math="\\mathcal{H}_{\\text{total}}(x, s) = \\mathcal{H}_{\\text{obj}}(x) + \\mathcal{H}_{\\text{penalty}}(x, s)" inline={false} isDark={isDark} />
        </div>

        {/* Penalty Multiplier Slider */}
        <div className="p-3.5 rounded-lg border space-y-2" style={{ backgroundColor: colors.bgSection2, borderColor: colors.border }}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold" style={{ color: colors.textPrimary }}>Penalty Multiplier Stiffness (λ)</span>
            <span className="font-mono font-bold text-amber-400">{penaltyLambda.toFixed(1)}x</span>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.5"
              value={penaltyLambda}
              onChange={(e) => setMathParams(prev => ({ ...prev, penaltyLambda: parseFloat(e.target.value) }))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
          <p className="text-[10px]" style={{ color: colors.textMuted }}>
            Ensures infeasible states are strictly elevated above the physical ground state energy.
          </p>
        </div>
      </div>

      {/* SECTION 03: Q-MATRIX COUPLERS */}
      <div
        id="math-section-03"
        className={`p-5 rounded-xl border space-y-3 transition-all ${
          selectedSection === "03"
            ? "ring-1 ring-sky-500/30 shadow-lg shadow-sky-500/10"
            : ""
        }`}
        style={{
          backgroundColor: selectedSection === "03" ? (isDark ? "#11131a" : "rgba(240, 249, 255, 0.6)") : colors.bgCard,
          borderColor: selectedSection === "03" ? "rgba(14, 165, 233, 0.6)" : colors.border,
        }}
      >
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: colors.border }}>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm font-bold text-amber-400">03</span>
            <h3 className="font-semibold text-sm" style={{ color: colors.textPrimary }}>
              Analytical Q-Matrix Coupler Expansion
            </h3>
            {selectedSection === "03" && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center space-x-1 animate-pulse">
                <span>🎯 Scoped in Copilot</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono" style={{ color: colors.textMuted }}>
              Symmetric Coupling (∀ i ≠ j)
            </span>
            <button
              onClick={() => onSelectSection(selectedSection === "03" ? null : "03")}
              className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md transition-all border ${
                selectedSection === "03"
                  ? "bg-sky-500 text-white font-semibold border-sky-400"
                  : "hover:border-sky-400/40"
              }`}
              style={selectedSection === "03" ? {} : { backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}
              title="Scope Optimization Copilot to Section 03"
            >
              <Sparkles className="w-3 h-3 text-current" />
              <span>{selectedSection === "03" ? "Scoped" : "Ask Copilot"}</span>
            </button>
          </div>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: colors.textMuted }}>
          Expanding the squared penalty Hamiltonian with updated parameters yields the analytical coupler expressions:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-lg border space-y-1.5" style={{ backgroundColor: colors.bgSection2, borderColor: colors.border }}>
            <span className="text-[10px] font-mono uppercase tracking-wider block text-center" style={{ color: colors.textMuted }}>
              Diagonal Bias Term
            </span>
            <div className="text-center font-mono py-1">
              <LatexMath
                math={`Q_{ii} = C_i - ${yieldWeight.toFixed(1)} R_i - 2(${penaltyLambda.toFixed(1)})(${budgetMax.toFixed(1)})C_i + ${penaltyLambda.toFixed(1)} C_i^2`}
                inline={false}
                isDark={isDark}
              />
            </div>
          </div>

          <div className="p-3 rounded-lg border space-y-1.5" style={{ backgroundColor: colors.bgSection2, borderColor: colors.border }}>
            <span className="text-[10px] font-mono uppercase tracking-wider block text-center" style={{ color: colors.textMuted }}>
              Off-Diagonal Coupler
            </span>
            <div className="text-center font-mono py-1">
              <LatexMath
                math={hasMutualExclusion
                  ? `Q_{ij} = 2(${penaltyLambda.toFixed(1)})C_i C_j + \\lambda_{\\text{ex}} \\quad (i \\ne j)`
                  : `Q_{ij} = 2(${penaltyLambda.toFixed(1)})C_i C_j \\quad (i \\ne j)`}
                inline={false}
                isDark={isDark}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FormulationCanvas;
