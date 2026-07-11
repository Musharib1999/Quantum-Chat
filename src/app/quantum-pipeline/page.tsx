"use client";

import React, { useState } from 'react';
import { Play, Activity, Cpu, Code2, CheckCircle2, ShieldAlert, Layers, Award, AlertTriangle } from 'lucide-react';

export default function QuantumPipelineDemo() {
  const [problem, setProblem] = useState("We have 8 nurses and 4 wards. Each ward must have exactly 2 nurses for safety. Nurse 1 and Nurse 7 had a fight and cannot be in the same ward.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeStep, setActiveStep] = useState(0);

  const runPipeline = async () => {
    setLoading(true);
    setResult(null);
    setActiveStep(1);
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8002";
      const response = await fetch(`${backendUrl}/enterprise/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unstructured_problem: problem }),
      });
      
      const data = await response.json();
      setResult(data);
      setActiveStep(4);
    } catch (e) {
      console.error(e);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8002";
      alert(`Backend connection failed. Ensure the backend server is running at ${backendUrl}.`);
    }
    
    setLoading(false);
  };

  const parseCoverageMatrix = (finalCode: string) => {
    const lines = finalCode.split("\n");
    const matrix: { name: string; family: string; expected: string; compiled: string; status: string }[] = [];
    for (const line of lines) {
      if (line.startsWith("# ") && line.includes("|") && (line.includes("PASS") || line.includes("FAIL"))) {
        const parts = line.substring(2).split("|").map(p => p.trim());
        if (parts.length >= 5) {
          const expMatch = parts[2].match(/Exp:\s*(\d+)/);
          const cmpMatch = parts[3].match(/Cmp:\s*(\d+)/);
          const statusMatch = parts[4].match(/Status:\s*(PASS|FAIL)/);
          matrix.push({
            name: parts[0],
            family: parts[1],
            expected: expMatch ? expMatch[1] : "?",
            compiled: cmpMatch ? cmpMatch[1] : "?",
            status: statusMatch ? statusMatch[1] : "UNKNOWN"
          });
        }
      }
    }
    return matrix;
  };

  const renderParsedMath = (parsedMathStr: string, finalCode: string) => {
    if (!parsedMathStr) return null;
    
    let parsed: any = null;
    try {
      parsed = JSON.parse(parsedMathStr);
    } catch (e) {
      return (
        <pre className="text-xs font-mono text-emerald-400 bg-slate-950 p-4 rounded-xl overflow-auto border border-slate-800/50 h-64 whitespace-pre-wrap">
          {parsedMathStr}
        </pre>
      );
    }

    const coverageList = parseCoverageMatrix(finalCode || "");
    const coverageMap = new Map(coverageList.map(item => [item.name.toLowerCase(), item]));

    const variables = parsed.variable_registry || [];
    const constraints = parsed.constraint_registry || [];
    const objectives = parsed.objectives || [];

    return (
      <div className="space-y-6 text-sm text-slate-300">
        {/* ── VARIABLES ── */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-800 pb-1 flex items-center gap-1.5 select-none">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Variables
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {variables.map((v: any) => (
              <div key={v.id} className="bg-slate-950/80 border border-slate-850 rounded-xl p-3 hover:border-slate-800 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-xs">✓</span>
                    <span className="font-semibold text-white text-xs font-mono">{v.name || v.id}</span>
                  </div>
                  <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 uppercase font-sans tracking-wide">
                    {v.domain === "boolean" ? "Boolean" : v.domain || "Binary"}
                  </span>
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Dim:</span>
                  <span className="text-slate-200">
                    {v.dimensions ? v.dimensions.join(" × ") : "1"}
                  </span>
                </div>
                {v.description && (
                  <p className="text-[10px] text-slate-500 leading-snug mt-1 italic">{v.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── CONSTRAINTS ── */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-800 pb-1 flex items-center gap-1.5 select-none">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            Constraints
          </h4>
          <div className="space-y-2">
            {constraints.map((c: any) => {
              const cov = coverageMap.get(c.name?.toLowerCase());
              const hasMismatch = cov && cov.expected !== cov.compiled;
              const isFailing = cov?.status === "FAIL" || hasMismatch;
              
              return (
                <div key={c.id} className={`bg-slate-950/80 border rounded-xl p-3 transition-colors ${isFailing ? 'border-rose-950/50 hover:border-rose-900/60 bg-rose-950/5' : 'border-slate-850 hover:border-slate-800'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={isFailing ? "text-rose-400 font-bold" : "text-emerald-400"}>
                          {isFailing ? "✗" : "✓"}
                        </span>
                        <span className="font-semibold text-white text-xs font-mono">{c.name || c.id}</span>
                      </div>
                      {c.description && (
                        <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{c.description}</p>
                      )}
                      {c.formula && (
                        <p className="text-[10px] text-indigo-350 font-mono mt-1.5 bg-slate-900/30 px-2 py-1 rounded w-fit select-all">{c.formula}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${isFailing ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                        {c.family || "Other"}
                      </span>
                      {cov && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Exp: {cov.expected} | Cmp: {cov.compiled}
                        </span>
                      )}
                    </div>
                  </div>
                  {hasMismatch && (
                    <div className="mt-2 text-[10px] text-rose-400/90 bg-rose-950/20 border border-rose-950/40 rounded p-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Dimension mismatch: Expecting {cov.expected} equation(s) but compiled {cov.compiled}.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── OBJECTIVES ── */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-800 pb-1 flex items-center gap-1.5 select-none">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            Objectives
          </h4>
          <div className="space-y-2">
            {objectives.filter((o: any) => o.type === "penalty" || o.type === "cost").length > 0 && (
              <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 block mb-1">Minimize</span>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                  {objectives.filter((o: any) => o.type === "penalty" || o.type === "cost").map((o: any) => (
                    <li key={o.id} className="leading-snug">
                      <span className="font-semibold text-white capitalize">{o.metric?.replace(/_/g, " ")}</span>
                      <span className="text-slate-500 text-[10px] ml-1.5">({o.strength || "medium"} weight)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {objectives.filter((o: any) => o.type === "reward").length > 0 && (
              <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block mb-1">Maximize</span>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                  {objectives.filter((o: any) => o.type === "reward").map((o: any) => (
                    <li key={o.id} className="leading-snug">
                      <span className="font-semibold text-white capitalize">{o.metric?.replace(/_/g, " ")}</span>
                      <span className="text-slate-500 text-[10px] ml-1.5">({o.strength || "medium"} weight)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCompilerStages = (finalCode: string) => {
    const isDccActive = finalCode?.includes("DCC DETERMINISTIC FALLBACK ACTIVE");
    
    const stages = [
      { name: "Parse", status: "PASS" },
      { name: "Facts IR", status: "PASS" },
      { name: "Primitive Binding", status: "PASS" },
      { name: "AST Construction", status: "PASS" },
      { name: "Primitive Expansion", status: isDccActive ? "FAIL" : "PASS" },
      { name: "Verification & Audit", status: isDccActive ? "FAIL" : "PASS" }
    ];

    return (
      <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-3.5 space-y-2 mt-4 select-none">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 block mb-2 border-b border-slate-800 pb-1">
          Compiler execution stages
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {stages.map((st, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold ${
                st.status === "PASS" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400 animate-pulse"
              }`}>
                {st.status === "PASS" ? "✓" : "✗"}
              </div>
              <span className={st.status === "PASS" ? "text-slate-300" : "text-rose-300 font-semibold"}>
                {st.name}
              </span>
            </div>
          ))}
        </div>
        {isDccActive && (
          <p className="text-[10px] text-rose-400/90 bg-rose-950/10 border border-rose-950/30 rounded p-1.5 leading-snug mt-2">
            ⚠️ <strong>Audit Warning:</strong> Generative code failed semantic validation checks. Compiler automatically routed code generator to the Deterministic Fallback (DCC) to guarantee equation safety.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-300 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Cpu className="text-indigo-500" />
              Multi-Agent Quantum Orchestrator
            </h1>
            <p className="text-slate-500 mt-2">Autonomous 4-Tier LoRA Pipeline Demonstration</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full border border-slate-800 text-sm font-medium">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            System Online (M2 Local)
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <label className="block text-sm font-semibold text-slate-400 mb-3 font-mono">
            ENTERPRISE PROBLEM (CONVERSATIONAL)
          </label>
          <textarea 
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none font-mono text-sm"
          />
          <div className="mt-4 flex justify-end">
            <button 
              onClick={runPipeline}
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                loading 
                  ? 'bg-indigo-600/50 text-white cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-indigo-500/25'
              }`}
            >
              {loading ? (
                <><Activity className="animate-spin w-5 h-5" /> Orchestrating Pipeline...</>
              ) : (
                <><Play className="w-5 h-5" /> Initialize Agents</>
              )}
            </button>
          </div>
        </div>

        {/* Results Grid */}
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Step 1: Parser */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldAlert className="w-24 h-24" />
              </div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs">1</span>
                NLP Parser Expert
              </h3>
              {renderParsedMath(result.parsed_math, result.final_code)}
              {renderCompilerStages(result.final_code)}
            </div>

            {/* Step 2: Reasoner */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Activity className="w-24 h-24" />
              </div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs">2</span>
                Logic Reasoner Expert
              </h3>
              <pre className="text-xs font-mono text-purple-300 bg-slate-950 p-4 rounded-xl overflow-auto border border-slate-800/50 h-[calc(100%-4rem)] min-h-[380px] whitespace-pre-wrap">
                {result.reasoning_trace}
              </pre>
            </div>

            {/* Step 3 & 4: Coder & Debugger */}
            <div className="md:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Code2 className="w-32 h-32" />
              </div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">3</span>
                  Master Coder & QA Debugger
                </h3>
                {result.success ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                    <CheckCircle2 className="w-4 h-4" /> CQM Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-400/10 px-3 py-1 rounded-full border border-rose-400/20">
                    <ShieldAlert className="w-4 h-4" /> Infeasible Math Detected
                  </span>
                )}
              </div>
              <pre className="text-sm font-mono text-slate-300 bg-[#0d1117] p-6 rounded-xl overflow-auto border border-slate-800/80 shadow-inner whitespace-pre-wrap leading-relaxed">
                {result.final_code}
              </pre>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
