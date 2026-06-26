"use client";

import React, { useState } from 'react';
import { Play, Activity, Cpu, Code2, CheckCircle2, ShieldAlert } from 'lucide-react';

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
      const response = await fetch("http://localhost:8002/enterprise/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unstructured_problem: problem }),
      });
      
      const data = await response.json();
      setResult(data);
      setActiveStep(4);
    } catch (e) {
      console.error(e);
      alert("Backend connection failed. Ensure python3 main.py is running on port 8002.");
    }
    
    setLoading(false);
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
          <label className="block text-sm font-semibold text-slate-400 mb-3">
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
              <pre className="text-xs font-mono text-emerald-400 bg-slate-950 p-4 rounded-xl overflow-auto border border-slate-800/50 h-48 whitespace-pre-wrap">
                {result.parsed_math}
              </pre>
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
              <pre className="text-xs font-mono text-purple-300 bg-slate-950 p-4 rounded-xl overflow-auto border border-slate-800/50 h-48 whitespace-pre-wrap">
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
