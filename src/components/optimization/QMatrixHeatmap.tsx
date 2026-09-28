"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Grid, Eye, Info, Sparkles, Layers } from "lucide-react";
import { ThemeColors } from "./types";

export interface QMatrixHeatmapProps {
  isDark?: boolean;
  colors: ThemeColors;
  matrix: number[][];
  variables: string[];
  hasMutualExclusion?: boolean;
  onCellClick?: (cell: { row: number; col: number; val: number; var1: string; var2: string }) => void;
}

export function QMatrixHeatmap({
  isDark = true,
  colors,
  matrix,
  variables,
  hasMutualExclusion = false,
  onCellClick,
}: QMatrixHeatmapProps) {
  const n = variables.length;
  const isLarge = n > 16;
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number; val: number; var1: string; var2: string } | null>(null);

  // Canvas ref for large matrices (N > 16)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; val: number } | null>(null);

  // Dynamic range & stats
  const stats = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let nonZero = 0;
    const total = n * n;

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const v = matrix[r]?.[c] ?? 0;
        if (v < min) min = v;
        if (v > max) max = v;
        if (Math.abs(v) > 1e-5) nonZero++;
      }
    }
    const sparsity = total > 0 ? (1 - nonZero / total) * 100 : 0;
    return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max, nonZero, sparsity };
  }, [matrix, n]);

  // Color mapper
  const getColor = (val: number, isDiag: boolean) => {
    if (val === 0) return isDark ? "#141417" : "#F8FAFC";
    if (isDiag) {
      return val < 0
        ? `rgba(56, 189, 248, ${Math.min(0.85, 0.2 + Math.abs(val) / Math.max(Math.abs(stats.min), 1) * 0.6)})`
        : `rgba(251, 146, 60, ${Math.min(0.85, 0.2 + Math.abs(val) / Math.max(stats.max, 1) * 0.6)})`;
    }
    return val < 0
      ? `rgba(56, 189, 248, ${Math.min(0.7, 0.15 + Math.abs(val) / Math.max(Math.abs(stats.min), 1) * 0.5)})`
      : `rgba(244, 63, 94, ${Math.min(0.7, 0.15 + Math.abs(val) / Math.max(stats.max, 1) * 0.5)})`;
  };

  // Render HTML5 2D Canvas for N > 16
  useEffect(() => {
    if (!isLarge || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cellSize = size / n;
    ctx.clearRect(0, 0, size, size);

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const val = matrix[r]?.[c] ?? 0;
        const isDiag = r === c;
        ctx.fillStyle = getColor(val, isDiag);
        ctx.fillRect(c * cellSize, r * cellSize, cellSize - 0.5, cellSize - 0.5);
      }
    }

    // Highlight hovered cell crosshair
    if (hoveredCell) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hoveredCell.col * cellSize, hoveredCell.row * cellSize, cellSize, cellSize);
    }
  }, [matrix, n, isLarge, hoveredCell, isDark]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cellSize = rect.width / n;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (row >= 0 && row < n && col >= 0 && col < n) {
      const val = matrix[row]?.[col] ?? 0;
      setHoveredCell({ row, col, val });
    }
  };

  const handleCanvasClick = () => {
    if (hoveredCell) {
      const cellInfo = {
        row: hoveredCell.row,
        col: hoveredCell.col,
        val: hoveredCell.val,
        var1: variables[hoveredCell.row] || `x${hoveredCell.row}`,
        var2: variables[hoveredCell.col] || `x${hoveredCell.col}`,
      };
      setSelectedCell(cellInfo);
      if (onCellClick) onCellClick(cellInfo);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 lg:p-6 space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: colors.border }}>
        <div className="flex items-center space-x-2">
          <Grid className="w-4 h-4 text-sky-400" />
          <h2 className="font-semibold text-sm" style={{ color: colors.textPrimary }}>
            Quadratic Interaction Coupler Matrix (Q-Matrix)
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textCyan }}>
            {n} × {n} ({n * n} Couplers)
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded border text-[11px]" style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textEmerald }}>
            Min: {stats.min.toFixed(1)}
          </span>
          <span className="px-2 py-0.5 rounded border text-[11px]" style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textAmber }}>
            Max: +{stats.max.toFixed(1)}
          </span>
          <span className="px-2 py-0.5 rounded border text-[11px]" style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textMuted }}>
            Sparsity: {stats.sparsity.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Mutual Exclusion Highlight Notification */}
      {hasMutualExclusion && (
        <div
          className="p-3 rounded-xl border flex items-center justify-between text-xs animate-in fade-in"
          style={{ backgroundColor: isDark ? "rgba(217, 70, 239, 0.08)" : "#FDF4FF", borderColor: isDark ? "rgba(217, 70, 239, 0.3)" : "#F0ABFC" }}
        >
          <div className="flex items-center space-x-2">
            <span className="font-bold text-fuchsia-400">⟂</span>
            <span style={{ color: isDark ? "#F5D0FE" : "#86198F" }}>
              Active Constraint: <strong>Wind_A × Solar_B (+8.0)</strong> anti-ferromagnetic energy wall injected into upper-triangular couplers.
            </span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
            Q[0, 1] = 15.7
          </span>
        </div>
      )}

      {/* Main Matrix Canvas / Table */}
      <div className="flex-1 min-h-[380px] flex flex-col justify-center items-center p-4 rounded-xl border relative" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
        {isLarge ? (
          /* High-Performance Canvas for N > 16 (Up to N=200) */
          <div className="flex flex-col items-center space-y-3">
            <div className="relative border rounded-lg overflow-hidden shadow-xl" style={{ borderColor: colors.border }}>
              <canvas
                ref={canvasRef}
                width={500}
                height={500}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={() => setHoveredCell(null)}
                onClick={handleCanvasClick}
                className="cursor-crosshair block"
              />
            </div>
            {hoveredCell && (
              <div className="text-xs font-mono px-3 py-1 rounded-full border shadow-sm" style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}>
                {variables[hoveredCell.row] || `x${hoveredCell.row}`} × {variables[hoveredCell.col] || `x${hoveredCell.col}`} : <strong className="text-sky-400">{hoveredCell.val.toFixed(2)}</strong>
              </div>
            )}
          </div>
        ) : (
          /* Interactive DOM Table for N <= 16 */
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse font-mono text-xs text-center">
              <thead>
                <tr>
                  <th className="p-2 text-left text-[11px] border-b" style={{ borderColor: colors.border, color: colors.textMuted }}>
                    Var
                  </th>
                  {variables.map((v, idx) => (
                    <th key={idx} className="p-2 text-[11px] border-b font-semibold" style={{ borderColor: colors.border, color: colors.textPrimary }}>
                      {v}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, rIdx) => {
                  const rVar = variables[rIdx] || `x${rIdx}`;
                  return (
                    <tr key={rIdx} className="hover:bg-sky-500/5 transition-colors">
                      <td className="p-2 text-left text-[11px] font-semibold border-r" style={{ borderColor: colors.border, color: colors.textPrimary }}>
                        {rVar}
                      </td>
                      {row.map((val, cIdx) => {
                        const isDiag = rIdx === cIdx;
                        const cVar = variables[cIdx] || `x${cIdx}`;
                        const isMutual = hasMutualExclusion && ((rIdx === 0 && cIdx === 1) || (rIdx === 1 && cIdx === 0));

                        return (
                          <td
                            key={cIdx}
                            onClick={() => {
                              const cellData = { row: rIdx, col: cIdx, val, var1: rVar, var2: cVar };
                              setSelectedCell(cellData);
                              if (onCellClick) onCellClick(cellData);
                            }}
                            style={{
                              backgroundColor: getColor(val, isDiag),
                              borderColor: colors.border,
                            }}
                            className={`p-3 border text-xs cursor-pointer hover:ring-2 hover:ring-sky-400 transition-all font-mono relative ${
                              isMutual ? "ring-2 ring-fuchsia-500 shadow-sm" : ""
                            }`}
                            title={`${isDiag ? `Linear bias h(${rVar})` : `Coupling J(${rVar}, ${cVar})`}: ${val}`}
                          >
                            <span className="font-semibold" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>
                              {val !== 0 ? (val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)) : "·"}
                            </span>
                            {isMutual && (
                              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500"></span>
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cell Inspector Drawer / Footer */}
      {selectedCell && (
        <div className="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 animate-in fade-in" style={{ backgroundColor: colors.bgSection2, borderColor: colors.border }}>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded border" style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textCyan }}>
              {selectedCell.row === selectedCell.col ? "Linear Bias (h_i)" : "Quadratic Coupler (J_ij)"}
            </span>
            <span className="text-xs" style={{ color: colors.textPrimary }}>
              <strong>{selectedCell.var1}</strong> {selectedCell.row === selectedCell.col ? "" : `× ${selectedCell.var2}`} = <strong className="text-amber-400 font-mono text-sm">{selectedCell.val > 0 ? `+${selectedCell.val.toFixed(2)}` : selectedCell.val.toFixed(2)}</strong>
            </span>
          </div>

          <div className="text-[11px] font-mono" style={{ color: colors.textMuted }}>
            {selectedCell.row === selectedCell.col
              ? "Diagonal physical self-field favoring |1⟩ or |0⟩ spin state."
              : "Off-diagonal two-body rf-SQUID exchange interaction."}
          </div>
        </div>
      )}
    </div>
  );
}

export default QMatrixHeatmap;
