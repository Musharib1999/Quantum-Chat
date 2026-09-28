"use client";

import React from "react";
import { Activity, Zap, CheckCircle2, AlertTriangle, Layers, BarChart2 } from "lucide-react";
import { EnergyDistributionItem, ThemeColors } from "./types";

export interface EnergySpectrumViewProps {
  isDark?: boolean;
  colors: ThemeColors;
  distribution: EnergyDistributionItem[];
  groundEnergy: number;
  numReads?: number;
  latencyMs?: number;
  variables: string[];
}

export function EnergySpectrumView({
  isDark = true,
  colors,
  distribution = [],
  groundEnergy = -90.0,
  numReads = 1000,
  latencyMs = 45,
  variables = [],
}: EnergySpectrumViewProps) {
  const totalOccurrences = distribution.reduce((sum, item) => sum + (item.num_occurrences || 1), 0) || 1;
  const bestState = distribution[0];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 lg:p-6 space-y-4">
      {/* Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: colors.border }}>
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h2 className="font-semibold text-sm" style={{ color: colors.textPrimary }}>
            Ground State Energy Spectrum &amp; Eigenstate Distribution
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
            Phase Space Explored
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded border text-[11px] font-semibold" style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textEmerald }}>
            E_ground: {groundEnergy.toFixed(2)}
          </span>
          <span className="px-2.5 py-1 rounded border text-[11px]" style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}>
            Reads: {numReads}
          </span>
          <span className="px-2.5 py-1 rounded border text-[11px]" style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textCyan }}>
            Latency: {latencyMs.toFixed(0)}ms
          </span>
        </div>
      </div>

      {/* Ground State Hero Card */}
      {bestState && (
        <div
          className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 shadow-sm"
          style={{
            backgroundColor: isDark ? "rgba(16, 185, 129, 0.06)" : "#F0FDF4",
            borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "#BBF7D0",
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              ★
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                  Global Physical Ground State
                </span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  100% Feasible
                </span>
              </div>
              <div className="text-sm font-semibold pt-0.5" style={{ color: colors.textPrimary }}>
                Active Selection:{" "}
                <span className="font-mono text-xs text-sky-400">
                  {Object.entries(bestState.sample)
                    .filter(([_, v]) => v === 1)
                    .map(([k]) => k)
                    .join(" + ") || "None"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 font-mono text-xs">
            <div className="text-right">
              <div className="text-[10px]" style={{ color: colors.textMuted }}>Minimum Energy Well</div>
              <div className="text-sm font-bold text-emerald-400">{bestState.energy.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px]" style={{ color: colors.textMuted }}>Sampling Probability</div>
              <div className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                {((bestState.num_occurrences / totalOccurrences) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State Distribution List */}
      <div className="p-4 rounded-xl border space-y-3" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
        <div className="flex items-center justify-between text-xs pb-2 border-b" style={{ borderColor: colors.border }}>
          <span className="font-semibold" style={{ color: colors.textPrimary }}>
            Sampled Configurations (Sorted by Energy Eigenvalue)
          </span>
          <span className="font-mono text-[10px]" style={{ color: colors.textMuted }}>
            {distribution.length} Distinct States
          </span>
        </div>

        <div className="space-y-2">
          {distribution.map((item, idx) => {
            const prob = ((item.num_occurrences / totalOccurrences) * 100);
            const isGround = idx === 0;
            const activeVars = Object.entries(item.sample)
              .filter(([_, v]) => v === 1)
              .map(([k]) => k);

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border flex flex-col space-y-1.5 transition-colors ${
                  isGround
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "hover:bg-sky-500/5"
                }`}
                style={{
                  borderColor: isGround ? undefined : colors.border,
                  backgroundColor: isGround ? undefined : colors.bgSection2,
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 font-mono">
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                      isGround ? "bg-emerald-500 text-white" : "border text-zinc-400"
                    }`} style={isGround ? {} : { borderColor: colors.border }}>
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-[11px]" style={{ color: colors.textPrimary }}>
                      |{item.bitstring}⟩
                    </span>
                    <span className="text-[11px]" style={{ color: colors.textMuted }}>
                      ({activeVars.join(", ")})
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 font-mono text-xs">
                    <span className={isGround ? "text-emerald-400 font-bold" : "text-amber-400"}>
                      E = {item.energy.toFixed(2)}
                    </span>
                    <span className="w-12 text-right" style={{ color: colors.textPrimary }}>
                      {prob.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.bgPill }}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isGround ? "bg-emerald-500" : "bg-sky-500"
                    }`}
                    style={{ width: `${Math.max(prob, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default EnergySpectrumView;
