"use client";

import React, { useState } from "react";
import {
  X,
  UploadCloud,
  Download,
  FileSpreadsheet,
  FileCode,
  Check,
  Layers,
  ArrowRight,
  Database,
  Share2,
} from "lucide-react";
import { ThemeColors } from "./types";

interface DataConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
  colors: ThemeColors;
  solverResult?: any;
  onSendToPipeline: (problemText: string) => void;
}

const SAMPLE_KNAPSACK_CSV = `item,weight,value
Laptop,2.5,1200
Sensor_Array,1.2,850
Battery_Pack,4.0,1500
Telemetry_Unit,1.8,920
Aux_Propulsion,5.5,2100`;

const SAMPLE_PORTFOLIO_CSV = `site,capex_m,annual_gwh,emissions_factor
Wind_Farm_North,12.0,45.0,0.02
Solar_Field_Alpha,8.5,32.0,0.01
Geothermal_Plant,18.0,80.0,0.05
Biomass_Facility,6.0,18.0,0.15
Hydro_Storage,14.5,58.0,0.03`;

const SAMPLE_GRAPH_CSV = `node_A,node_B,node_C,node_D
0,10,0,5
10,0,15,0
0,15,0,8
5,0,8,0`;

export function DataConnectorsModal({
  isOpen,
  onClose,
  isDark = true,
  colors,
  solverResult,
  onSendToPipeline,
}: DataConnectorsModalProps) {
  const [activeTab, setActiveTab] = useState<"ingress" | "egress">("ingress");
  const [csvContent, setCsvContent] = useState<string>(SAMPLE_KNAPSACK_CSV);
  const [problemType, setProblemType] = useState<"selection" | "knapsack" | "portfolio" | "maxcut">("knapsack");
  const [sense, setSense] = useState<"MAXIMIZE" | "MINIMIZE">("MAXIMIZE");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ingressResult, setIngressResult] = useState<any>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectSample = (type: "knapsack" | "portfolio" | "maxcut") => {
    setProblemType(type);
    if (type === "knapsack") {
      setCsvContent(SAMPLE_KNAPSACK_CSV);
      setSense("MAXIMIZE");
    } else if (type === "portfolio") {
      setCsvContent(SAMPLE_PORTFOLIO_CSV);
      setSense("MAXIMIZE");
    } else {
      setCsvContent(SAMPLE_GRAPH_CSV);
      setSense("MINIMIZE");
    }
    setIngressResult(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setIngressResult(null);
    };
    reader.readAsText(file);
  };

  const handleParseIngress = async () => {
    setIsProcessing(true);
    try {
      const resp = await fetch("/api/ide/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ingress_csv",
          payload: {
            csv_text: csvContent,
            problem_type: problemType,
            sense: sense,
          },
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setIngressResult(data);
      } else {
        alert(`Ingress parsing error: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Ingress error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendToCopilot = () => {
    if (!ingressResult?.formulation_text) return;
    onSendToPipeline(ingressResult.formulation_text);
    onClose();
  };

  const handleExport = async (exportType: string, filename: string) => {
    try {
      const resp = await fetch("/api/ide/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "egress_export",
          payload: {
            export_type: exportType,
            solution: solverResult?.optimal_state || solverResult?.sample || {},
            energy: solverResult?.energy || 0.0,
            variables: solverResult?.variables || [],
            q_matrix: solverResult?.qubo_matrix || [],
          },
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.content) {
        const mimeType = data.format === "json" ? "application/json" : "text/csv";
        const blob = new Blob([data.content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloadSuccess(exportType);
        setTimeout(() => setDownloadSuccess(null), 2500);
      } else {
        alert(`Export failed: ${data.error || "No content returned"}`);
      }
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-3xl rounded-xl border shadow-2xl flex flex-col overflow-hidden max-h-[88vh]"
        style={{
          backgroundColor: isDark ? "#0D0E12" : "#FFFFFF",
          borderColor: colors.border,
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between"
          style={{ borderColor: colors.border, backgroundColor: colors.bgSection3 }}
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight" style={{ color: colors.textPrimary }}>
                Enterprise Data Connectors (Pillar 2)
              </h2>
              <p className="text-[11px]" style={{ color: colors.textMuted }}>
                Pre-built ingress for problem payloads & automated egress for solver states
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b flex items-center space-x-4 text-xs font-mono" style={{ borderColor: colors.border }}>
          <button
            onClick={() => setActiveTab("ingress")}
            className={`pb-2.5 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === "ingress"
                ? "border-sky-500 text-sky-400 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Data Ingress (CSV / JSON)</span>
          </button>
          <button
            onClick={() => setActiveTab("egress")}
            className={`pb-2.5 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === "egress"
                ? "border-emerald-500 text-emerald-400 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Data Egress (Export Hub)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === "ingress" ? (
            <div className="space-y-4">
              {/* Presets and Upload */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-mono" style={{ color: colors.textMuted }}>Preset Templates:</span>
                  <button
                    onClick={() => handleSelectSample("knapsack")}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${
                      problemType === "knapsack"
                        ? "bg-sky-500/20 text-sky-400 border-sky-500/40"
                        : "bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:text-zinc-200"
                    }`}
                  >
                    Knapsack Cargo
                  </button>
                  <button
                    onClick={() => handleSelectSample("portfolio")}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${
                      problemType === "portfolio"
                        ? "bg-sky-500/20 text-sky-400 border-sky-500/40"
                        : "bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:text-zinc-200"
                    }`}
                  >
                    Clean Energy Portfolio
                  </button>
                  <button
                    onClick={() => handleSelectSample("maxcut")}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${
                      problemType === "maxcut"
                        ? "bg-sky-500/20 text-sky-400 border-sky-500/40"
                        : "bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:text-zinc-200"
                    }`}
                  >
                    Max-Cut Graph Adjacency
                  </button>
                </div>

                <label className="flex items-center space-x-1.5 px-3 py-1 rounded border cursor-pointer bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1] text-zinc-300">
                  <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-[11px] font-mono">Upload CSV</span>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* CSV Editor Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono" style={{ color: colors.textMuted }}>
                  <span>Raw Ingress CSV Buffer:</span>
                  <div className="flex items-center space-x-2">
                    <span>Sense:</span>
                    <button
                      onClick={() => setSense(sense === "MAXIMIZE" ? "MINIMIZE" : "MAXIMIZE")}
                      className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] font-bold"
                    >
                      {sense}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={csvContent}
                  onChange={(e) => {
                    setCsvContent(e.target.value);
                    setIngressResult(null);
                  }}
                  className="w-full p-2.5 rounded-lg border font-mono text-xs leading-relaxed outline-none resize-none"
                  style={{
                    backgroundColor: colors.bgInput,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  }}
                  placeholder="Paste or upload CSV here..."
                />
              </div>

              {/* Action: Parse Formulation */}
              <div className="flex items-center justify-end">
                <button
                  onClick={handleParseIngress}
                  disabled={isProcessing || !csvContent.trim()}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{isProcessing ? "Parsing Schema..." : "Ingest & Formulate Model"}</span>
                </button>
              </div>

              {/* Ingress Parsed Preview */}
              {ingressResult && (
                <div
                  className="p-3.5 rounded-lg border space-y-3 animate-in fade-in duration-150"
                  style={{ backgroundColor: colors.bgSection2, borderColor: colors.border }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-400 flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Formulation Synthesized ({ingressResult.items_count || ingressResult.nodes?.length} Entities)</span>
                    </span>
                    <button
                      onClick={handleSendToCopilot}
                      className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-sm transition-colors"
                    >
                      <span>Send to Autonomous Copilot</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-2.5 rounded border font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto" style={{ backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }}>
                    {ingressResult.formulation_text}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Egress Hub */
            <div className="space-y-4">
              <div
                className="p-3 rounded-lg border space-y-1"
                style={{ backgroundColor: colors.bgSection2, borderColor: colors.border }}
              >
                <span className="font-semibold block" style={{ color: colors.textPrimary }}>
                  Active Execution Context
                </span>
                <p className="text-[11px]" style={{ color: colors.textMuted }}>
                  Variables: {solverResult?.variables?.length || 0} · Ground Energy: {typeof solverResult?.energy === "number" ? solverResult.energy : "Uncompiled"} · Q-Matrix Size: {solverResult?.qubo_matrix?.length ? `${solverResult.qubo_matrix.length}x${solverResult.qubo_matrix.length}` : "None"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Solution JSON */}
                <div className="p-3 rounded-lg border flex flex-col justify-between space-y-2" style={{ backgroundColor: colors.bgSection3, borderColor: colors.border }}>
                  <div className="space-y-1">
                    <span className="font-semibold flex items-center space-x-1.5" style={{ color: colors.textPrimary }}>
                      <FileCode className="w-4 h-4 text-sky-400" />
                      <span>Solution Payload (JSON)</span>
                    </span>
                    <p className="text-[11px]" style={{ color: colors.textMuted }}>
                      Includes bitstring vector, active decision variables, and ground state energy.
                    </p>
                  </div>
                  <button
                    onClick={() => handleExport("solution_json", "solution.json")}
                    className="w-full py-1.5 px-3 rounded border text-xs font-mono font-semibold flex items-center justify-center space-x-1.5 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                    style={{ borderColor: colors.border, color: colors.textPrimary }}
                  >
                    {downloadSuccess === "solution_json" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-sky-400" />}
                    <span>{downloadSuccess === "solution_json" ? "Downloaded" : "Export solution.json"}</span>
                  </button>
                </div>

                {/* Solution CSV */}
                <div className="p-3 rounded-lg border flex flex-col justify-between space-y-2" style={{ backgroundColor: colors.bgSection3, borderColor: colors.border }}>
                  <div className="space-y-1">
                    <span className="font-semibold flex items-center space-x-1.5" style={{ color: colors.textPrimary }}>
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Solution Table (CSV)</span>
                    </span>
                    <p className="text-[11px]" style={{ color: colors.textMuted }}>
                      Tabular format mapping variable names directly to discrete choice values.
                    </p>
                  </div>
                  <button
                    onClick={() => handleExport("solution_csv", "solution.csv")}
                    className="w-full py-1.5 px-3 rounded border text-xs font-mono font-semibold flex items-center justify-center space-x-1.5 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                    style={{ borderColor: colors.border, color: colors.textPrimary }}
                  >
                    {downloadSuccess === "solution_csv" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{downloadSuccess === "solution_csv" ? "Downloaded" : "Export solution.csv"}</span>
                  </button>
                </div>

                {/* Q-Matrix Dense CSV */}
                <div className="p-3 rounded-lg border flex flex-col justify-between space-y-2" style={{ backgroundColor: colors.bgSection3, borderColor: colors.border }}>
                  <div className="space-y-1">
                    <span className="font-semibold flex items-center space-x-1.5" style={{ color: colors.textPrimary }}>
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>Dense Q-Matrix (CSV)</span>
                    </span>
                    <p className="text-[11px]" style={{ color: colors.textMuted }}>
                      Full N x N symmetric matrix with variable name headers.
                    </p>
                  </div>
                  <button
                    onClick={() => handleExport("qmatrix_dense", "qubo_matrix.csv")}
                    className="w-full py-1.5 px-3 rounded border text-xs font-mono font-semibold flex items-center justify-center space-x-1.5 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                    style={{ borderColor: colors.border, color: colors.textPrimary }}
                  >
                    {downloadSuccess === "qmatrix_dense" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{downloadSuccess === "qmatrix_dense" ? "Downloaded" : "Export qubo_matrix.csv"}</span>
                  </button>
                </div>

                {/* Q-Matrix Sparse COO */}
                <div className="p-3 rounded-lg border flex flex-col justify-between space-y-2" style={{ backgroundColor: colors.bgSection3, borderColor: colors.border }}>
                  <div className="space-y-1">
                    <span className="font-semibold flex items-center space-x-1.5" style={{ color: colors.textPrimary }}>
                      <Layers className="w-4 h-4 text-purple-400" />
                      <span>Sparse Coordinate (COO)</span>
                    </span>
                    <p className="text-[11px]" style={{ color: colors.textMuted }}>
                      Non-zero coupler list: (Row_Var, Col_Var, Weight, Type).
                    </p>
                  </div>
                  <button
                    onClick={() => handleExport("qmatrix_coo", "qubo_matrix.coo")}
                    className="w-full py-1.5 px-3 rounded border text-xs font-mono font-semibold flex items-center justify-center space-x-1.5 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                    style={{ borderColor: colors.border, color: colors.textPrimary }}
                  >
                    {downloadSuccess === "qmatrix_coo" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-purple-400" />}
                    <span>{downloadSuccess === "qmatrix_coo" ? "Downloaded" : "Export qubo_matrix.coo"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DataConnectorsModal;
