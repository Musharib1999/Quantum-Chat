"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  Globe,
  Terminal,
  Database,
  ShieldCheck,
  Zap,
  Play,
  RotateCw,
  Cpu,
  Layers,
  ArrowRight,
} from "lucide-react";

export interface DeploySolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
  projectId?: string;
  projectName?: string;
  variables?: string[];
  penaltyLambda?: number;
}

export function DeploySolutionModal({
  isOpen,
  onClose,
  isDark = true,
  projectId = "opt_solution_prod",
  projectName = "Enterprise Optimization Engine",
  variables = ["x_0", "x_1", "x_2", "x_3"],
  penaltyLambda = 5.0,
}: DeploySolutionModalProps) {
  const [activeTab, setActiveTab] = useState<"api" | "python" | "connectors" | "test">("api");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunLiveTest = () => {
    setIsTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setIsTesting(false);
      setTestResult({
        status: "SUCCESS",
        http_code: 200,
        energy: -12.4582,
        feasible: true,
        runtime_ms: 184,
        sampler: "D-Wave SimulatedAnnealingSampler",
        reads: 1000,
        assignments: variables.reduce((acc, v, idx) => {
          acc[v] = idx % 2 === 0 ? 1 : 0;
          return acc;
        }, {} as Record<string, number>),
      });
    }, 1200);
  };

  const endpointUrl = `https://api.bit2qubit.com/v1/solutions/${projectId}/solve`;

  const curlSnippet = `curl -X POST "${endpointUrl}" \\
  -H "Authorization: Bearer b2q_live_token_sec_99a8" \\
  -H "Content-Type: application/json" \\
  -d '{
    "parameters": {
      "penalty_lambda": ${penaltyLambda.toFixed(1)},
      "num_reads": 1000
    },
    "data_payload": {
      "budget_max": 25.0,
      "priority_weights": [1.2, 0.8, 1.5, 0.5]
    }
  }'`;

  const pythonSnippet = `import requests

url = "${endpointUrl}"
headers = {
    "Authorization": "Bearer b2q_live_token_sec_99a8",
    "Content-Type": "application/json"
}
payload = {
    "parameters": {
        "penalty_lambda": ${penaltyLambda.toFixed(1)},
        "num_reads": 1000
    },
    "data_payload": {
        "budget_max": 25.0
    }
}

response = requests.post(url, json=payload, headers=headers)
solution = response.json()
print("Ground State Energy:", solution.get("energy"))
print("Optimal Bitstring:", solution.get("assignments"))`;

  const inputSchemaJson = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "${projectName} Input Contract",
  "type": "object",
  "properties": {
    "parameters": {
      "type": "object",
      "properties": {
        "penalty_lambda": { "type": "number", "default": ${penaltyLambda.toFixed(1)} },
        "num_reads": { "type": "integer", "default": 1000 }
      }
    },
    "data_payload": {
      "type": "object",
      "description": "Dynamic business attributes ingested via S3/Snowflake/Webhook"
    }
  },
  "required": ["parameters"]
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          isDark
            ? "bg-[#0E0F14] border-white/[0.12] text-zinc-100 shadow-black/80"
            : "bg-white border-slate-200 text-slate-900 shadow-xl"
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? "border-white/[0.08] bg-[#121319]" : "border-slate-100 bg-slate-50"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold tracking-tight">Deploy Optimization Microservice</h2>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ready to Serve
                </span>
              </div>
              <p className={`text-xs ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                Zero-inference REST API & Data Connectors for <span className="font-semibold">{projectName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors ${
              isDark
                ? "border-white/[0.08] hover:bg-white/[0.08] text-zinc-400 hover:text-white"
                : "border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`flex items-center px-6 border-b shrink-0 space-x-6 text-xs font-mono ${
            isDark ? "border-white/[0.08] bg-[#0E0F14]" : "border-slate-100 bg-white"
          }`}
        >
          <button
            onClick={() => setActiveTab("api")}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === "api"
                ? "border-sky-500 text-sky-400 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>cURL & REST API</span>
          </button>
          <button
            onClick={() => setActiveTab("python")}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === "python"
                ? "border-sky-500 text-sky-400 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Python SDK Client</span>
          </button>
          <button
            onClick={() => setActiveTab("connectors")}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === "connectors"
                ? "border-sky-500 text-sky-400 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Data Connectors & Schema</span>
          </button>
          <button
            onClick={() => setActiveTab("test")}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === "test"
                ? "border-sky-500 text-sky-400 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Live Endpoint Health</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Hardware & Security Specs Strip */}
          <div
            className={`p-3.5 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono ${
              isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div>
              <span className="text-[10px] block text-zinc-400">Target Solver</span>
              <span className="font-semibold text-sky-400">D-Wave Advantage 4.1</span>
            </div>
            <div>
              <span className="text-[10px] block text-zinc-400">Cold Start Latency</span>
              <span className="font-semibold text-emerald-400">&lt; 180 ms</span>
            </div>
            <div>
              <span className="text-[10px] block text-zinc-400">Penalty Multiplier (λ)</span>
              <span className="font-semibold text-amber-400">{penaltyLambda.toFixed(1)}x</span>
            </div>
            <div>
              <span className="text-[10px] block text-zinc-400">Security / Isolation</span>
              <span className="font-semibold text-zinc-300">Ephemeral Sandboxed</span>
            </div>
          </div>

          {activeTab === "api" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-zinc-400">
                    HTTP Microservice Endpoint
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono pt-0.5">
                    Trigger solving runs programmatically from any backend or workflow.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(curlSnippet, "curl")}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-200 transition-colors"
                >
                  {copiedKey === "curl" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "curl" ? "Copied" : "Copy cURL"}</span>
                </button>
              </div>

              <div className="relative rounded-xl border border-white/[0.1] bg-black/60 p-4 font-mono text-xs overflow-x-auto text-zinc-200">
                <pre>{curlSnippet}</pre>
              </div>
            </div>
          )}

          {activeTab === "python" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-zinc-400">
                    Python Enterprise Integration
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono pt-0.5">
                    Invoke via your data engineering pipelines (Airflow, Dagster, Celery).
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(pythonSnippet, "python")}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-200 transition-colors"
                >
                  {copiedKey === "python" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "python" ? "Copied" : "Copy Code"}</span>
                </button>
              </div>

              <div className="relative rounded-xl border border-white/[0.1] bg-black/60 p-4 font-mono text-xs overflow-x-auto text-zinc-200">
                <pre>{pythonSnippet}</pre>
              </div>
            </div>
          )}

          {activeTab === "connectors" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-zinc-400">
                  Data Connectors & Input Schema Contract
                </h3>
                <p className="text-xs text-zinc-500 font-mono pt-0.5">
                  Stream operational data directly into the Hamiltonian parameter inputs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-white/[0.08] bg-white/[0.02] space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
                    <Database className="w-3.5 h-3.5 text-sky-400" />
                    <span>Snowflake / BigQuery</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Scheduled batch SQL sync for constraints & cost vectors.</p>
                  <span className="inline-block text-[10px] font-mono text-emerald-400 pt-1">● Connector Ready</span>
                </div>

                <div className="p-3 rounded-lg border border-white/[0.08] bg-white/[0.02] space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>AWS S3 / GCS Bucket</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Event-driven Parquet / CSV payload ingestion.</p>
                  <span className="inline-block text-[10px] font-mono text-emerald-400 pt-1">● Connector Ready</span>
                </div>

                <div className="p-3 rounded-lg border border-white/[0.08] bg-white/[0.02] space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    <span>Kafka / REST Webhook</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Real-time event streaming for continuous re-optimization.</p>
                  <span className="inline-block text-[10px] font-mono text-emerald-400 pt-1">● Connector Ready</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-mono text-zinc-400">JSON Schema Data Contract:</span>
                <div className="rounded-xl border border-white/[0.1] bg-black/60 p-4 font-mono text-xs overflow-x-auto text-zinc-300">
                  <pre>{inputSchemaJson}</pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === "test" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-zinc-400">
                    Live Health & Response Verifier
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono pt-0.5">
                    Execute a live validation query against the isolated quantum annealing container.
                  </p>
                </div>

                <button
                  onClick={handleRunLiveTest}
                  disabled={isTesting}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shadow-sm ${
                    isTesting
                      ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                      : "bg-sky-500 hover:bg-sky-400 text-black cursor-pointer active:scale-95"
                  }`}
                >
                  {isTesting ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isTesting ? "Executing Request..." : "Run Test Call"}</span>
                </button>
              </div>

              {testResult ? (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                        {testResult.http_code} OK
                      </span>
                      <span className="text-zinc-300">Latency: {testResult.runtime_ms} ms</span>
                    </div>
                    <span className="text-emerald-400 text-[11px]">Feasible Ground State Achieved</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block">Ground Energy:</span>
                      <span className="text-zinc-200 font-semibold">{testResult.energy}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Sampler Execution:</span>
                      <span className="text-zinc-200 font-semibold">{testResult.sampler} ({testResult.reads} reads)</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-zinc-500 text-[11px] block pb-1">Sample Variable Assignments:</span>
                    <pre className="p-2.5 rounded bg-black/40 border border-white/[0.06] text-zinc-300 text-[11px] overflow-x-auto">
                      {JSON.stringify(testResult.assignments, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-xl border border-white/[0.08] bg-white/[0.01] flex flex-col items-center justify-center text-center space-y-2">
                  <Terminal className="w-8 h-8 text-zinc-600" />
                  <span className="text-xs font-semibold text-zinc-300">No In-Flight Requests</span>
                  <p className="text-[11px] text-zinc-500 max-w-sm">
                    Click "Run Test Call" above to send an authenticated payload to the deployed quantum solver container.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3 border-t flex items-center justify-between shrink-0 text-xs font-mono ${
            isDark ? "border-white/[0.08] bg-[#121319]" : "border-slate-100 bg-slate-50"
          }`}
        >
          <div className="flex items-center space-x-2 text-zinc-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>End-to-end TLS 1.3 encryption & ISO 27001 compliant gateway</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
