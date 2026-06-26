'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePipelineStore } from '@/store/usePipelineStore';
import { Cpu, Terminal, CheckCircle2, AlertCircle, Loader2, ChevronDown } from 'lucide-react';

type Phase = 'idle' | 'analyzing' | 'solver_select' | 'generating' | 'done' | 'infeasible';

const STEPS = [
  { id: 1, label: 'Parsing problem structure' },
  { id: 2, label: 'Checking mathematical feasibility' },
  { id: 3, label: 'Quantum interpretation' },
  { id: 4, label: 'Generating solver code' },
];

const SOLVERS = [
  {
    id: 'auto',
    label: 'Auto-detect (AI decides)',
    badge: 'Recommended',
    badgeColor: '#6366f1',
    desc: 'Suggestor adapter picks the best solver for your problem.',
  },
  {
    id: 'cqm',
    label: 'CQM — Constrained quadratic model',
    badge: 'D-Wave Leap hybrid',
    badgeColor: '#0ea5e9',
    desc: 'Mixed-integer constraints with equality/inequality bounds.',
  },
  {
    id: 'qubo',
    label: 'QUBO — Unconstrained binary optimization',
    badge: 'Quantum annealer (QPU)',
    badgeColor: '#a855f7',
    desc: 'Binary variables with soft-penalty constraints, maps to physical QPU.',
  },
  {
    id: 'qiskit',
    label: 'Qiskit — IBM Gate-based Quantum',
    badge: 'Quantum Processor (QPU)',
    badgeColor: '#ec4899',
    desc: 'Gate-based quantum optimization using Qiskit Aer or IBM Quantum backend.',
  },
  {
    id: 'ortools',
    label: 'OR-Tools — Classical CP-SAT',
    badge: 'Classical (fast & exact)',
    badgeColor: '#10b981',
    desc: 'Linear scheduling, routing, constraint satisfaction — exact & fast.',
  },
];

export default function OptimizationCoach() {
  const { updateField, resetPipeline } = usePipelineStore();
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [selectedSolver, setSelectedSolver] = useState('auto');
  const [parsedMath, setParsedMath] = useState('');
  const [reasoningTrace, setReasoningTrace] = useState('');
  const [problemText, setProblemText] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  
  // Hardware Selection & Execution States
  const [suggestedSolver, setSuggestedSolver] = useState<string>('');
  const [hardwares, setHardwares] = useState<any[]>([]);
  const [selectedHardwareId, setSelectedHardwareId] = useState<string>('');
  const [executionOutput, setExecutionOutput] = useState<string>('');
  const [executionError, setExecutionError] = useState<string>('');
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [phase, completedSteps, statusMsg, executionStatus]);

  // Fetch Hardware registries on mount
  useEffect(() => {
    fetch('/api/hardware')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setHardwares(data);
        }
      })
      .catch(err => console.error('Failed to fetch hardware:', err));
  }, []);

  const completeStep = (step: number) =>
    setCompletedSteps(prev => prev.includes(step) ? prev : [...prev, step]);

  const handleReset = () => {
    resetPipeline();
    setPhase('idle');
    setActiveStep(0);
    setCompletedSteps([]);
    setSelectedSolver('auto');
    setSuggestedSolver('');
    setParsedMath('');
    setReasoningTrace('');
    setProblemText('');
    setStatusMsg('');
    setInput('');
    setSelectedHardwareId('');
    setExecutionOutput('');
    setExecutionError('');
    setExecutionStatus('idle');
  };

  const runAnalysis = async (problem: string) => {
    setPhase('analyzing');
    updateField('problemDefinition', problem);
    updateField('problemName', 'Custom optimization run');

    try {
      // Step 1 starts
      setActiveStep(1);
      setStatusMsg('Running NLP parser...');

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8002'}/enterprise/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unstructured_problem: problem }),
      });

      if (!res.ok) throw new Error('Backend connection failed.');
      const data = await res.json();

      // Step 1 done — update store → canvas shows Step 1
      completeStep(1);
      setActiveStep(2);
      setStatusMsg('Checking mathematical feasibility...');
      updateField('currentIssues', data.parsed_math);
      setParsedMath(data.parsed_math);

      // Small visual pause before showing step 2 complete
      await new Promise(r => setTimeout(r, 600));

      // Step 2 done → canvas shows Step 2
      completeStep(2);
      setActiveStep(3);
      setStatusMsg('Building quantum interpretation...');
      updateField('reasoningTrace', data.reasoning_trace);
      setReasoningTrace(data.reasoning_trace);

      await new Promise(r => setTimeout(r, 600));

      // Step 3 done → canvas shows Step 3
      completeStep(3);
      setActiveStep(0);

      if (!data.is_feasible) {
        setStatusMsg(data.feasibility_note || 'Problem is mathematically infeasible.');
        setPhase('infeasible');
        return;
      }

      setPhase('solver_select');
      setSuggestedSolver(data.suggested_solver || 'OR-Tools');
      setStatusMsg('');
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
      setPhase('idle');
    }
  };

  const getEffectiveSolver = () => {
    if (selectedSolver === 'auto') {
      const suggested = suggestedSolver.toLowerCase();
      if (suggested.includes('cqm')) return 'cqm';
      if (suggested.includes('qubo')) return 'qubo';
      if (suggested.includes('qiskit')) return 'qiskit';
      return 'ortools';
    }
    return selectedSolver;
  };

  const effectiveSolver = getEffectiveSolver();

  const getProviderForSolver = (solver: string) => {
    if (solver === 'cqm' || solver === 'qubo') return 'dwave';
    if (solver === 'qiskit') return 'ibm';
    return 'other'; // classical OR-Tools
  };

  const targetProvider = getProviderForSolver(effectiveSolver);
  const filteredHardwares = hardwares.filter(hw => hw.provider === targetProvider);

  // Auto-select first hardware in the filtered list when list changes
  useEffect(() => {
    if (filteredHardwares.length > 0) {
      setSelectedHardwareId(filteredHardwares[0].id);
    } else {
      setSelectedHardwareId('');
    }
  }, [targetProvider, hardwares]);

  const runGenerationAndExecution = async () => {
    setPhase('generating');
    setActiveStep(4);
    setStatusMsg('Generating solver code...');
    setExecutionStatus('running');
    setExecutionOutput('');
    setExecutionError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8002'}/enterprise/pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unstructured_problem: problemText,
          mode: selectedSolver,
        }),
      });
      if (!res.ok) throw new Error('Code generation failed.');
      const data = await res.json();

      completeStep(4);
      updateField('quantumAlgorithmCode', data.final_code);
      setActiveStep(0);
      setStatusMsg(`Done — solver used: ${data.suggested_solver || selectedSolver.toUpperCase()}`);
      setPhase('done');

      // Forward code for execution via /v2/execute
      setStatusMsg('Executing solver code on selected hardware...');

      const execRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8002'}/v2/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: data.final_code,
          hardware_id: selectedHardwareId,
        }),
      });

      if (!execRes.ok) throw new Error('Code execution API failed.');
      const execData = await execRes.json();

      if (execData.success) {
        setExecutionStatus('success');
        setExecutionOutput(execData.output);
        setExecutionError(execData.error || '');
        setStatusMsg('Done — execution completed successfully.');
      } else {
        setExecutionStatus('failed');
        setExecutionOutput(execData.output || '');
        setExecutionError(execData.error || 'Execution failed.');
        setStatusMsg('Execution failed.');
      }
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
      setExecutionStatus('failed');
      setExecutionError(e.message);
      setPhase('solver_select');
      setActiveStep(0);
    }
  };

  const getSolverFriendlyName = (solver: string) => {
    const s = solver.toUpperCase();
    if (s.includes('CQM')) return 'CQM (D-Wave Leap Hybrid)';
    if (s.includes('QUBO')) return 'QUBO (Quantum Annealer QPU)';
    if (s.includes('QISKIT')) return 'Qiskit (IBM Gate-based)';
    if (s.includes('OR-TOOLS') || s.includes('OR_TOOLS')) return 'OR-Tools (Classical CP-SAT)';
    return solver || 'Unknown';
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || phase !== 'idle') return;
    const p = input.trim();
    setProblemText(p);
    setInput('');
    runAnalysis(p);
  };

  const stepDone = (n: number) => completedSteps.includes(n);
  const stepActive = (n: number) => activeStep === n;

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Idle welcome */}
        {phase === 'idle' && (
          <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-card-foreground leading-relaxed">
            Hello! Describe your optimization problem below. I will run it through 3 analysis steps, then let you choose the solver before generating code.
          </div>
        )}

        {/* Problem bubble */}
        {problemText && (
          <div className="flex justify-end">
            <div className="bg-secondary border border-border rounded-2xl rounded-tr-sm px-5 py-4 text-sm max-w-[90%]">
              {problemText}
            </div>
          </div>
        )}

        {/* Step Progress */}
        {phase !== 'idle' && (
          <div className="bg-card border border-border rounded-2xl px-5 py-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Pipeline progress</p>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(completedSteps.length / 4) * 100}%`,
                  background: 'oklch(0.623 0.214 259.815)'
                }}
              />
            </div>

            {/* Steps */}
            <div className="space-y-2 mt-1">
              {STEPS.map(s => (
                <div key={s.id} className="flex items-center gap-3 text-xs">
                  {/* Icon */}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold transition-all ${
                    stepDone(s.id)
                      ? 'bg-emerald-500 text-white'
                      : stepActive(s.id)
                      ? 'bg-primary text-primary-foreground animate-pulse'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {stepDone(s.id) ? '✓' : s.id}
                  </div>
                  <span className={`${stepDone(s.id) ? 'text-foreground' : stepActive(s.id) ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {s.label}
                    {stepActive(s.id) && <span className="ml-1 animate-pulse">…</span>}
                  </span>
                </div>
              ))}
            </div>

            {/* Status message */}
            {statusMsg && (
              <p className={`text-xs mt-2 ${phase === 'done' ? 'text-emerald-400' : phase === 'infeasible' ? 'text-red-400' : 'text-muted-foreground'}`}>
                {statusMsg}
              </p>
            )}
          </div>
        )}

        {/* Infeasible block */}
        {phase === 'infeasible' && (
          <div className="bg-card border border-border rounded-2xl px-5 py-4 text-sm text-muted-foreground">
            Problem is mathematically infeasible. The supply cannot meet the demand under hard constraints. Please revise your problem and reset.
          </div>
        )}

        {/* Solver selection — appears after step 3 */}
        {(phase === 'solver_select' || phase === 'generating' || phase === 'done') && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-card-foreground">
              Analysis complete. Select a solver category and run on the registry.
            </div>

            {/* AI Suggestion Banner */}
            {suggestedSolver && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 text-xs text-card-foreground flex items-start gap-2.5">
                <span className="text-base">🤖</span>
                <div>
                  <span className="font-semibold text-foreground">Suggestor Recommendation:</span>
                  <span className="ml-1 text-primary font-medium">{getSolverFriendlyName(suggestedSolver)}</span>
                  <p className="text-muted-foreground mt-1 leading-snug">
                    The AI analyzed your problem and determined this category is best suited for optimal performance.
                  </p>
                </div>
              </div>
            )}

            {/* Solver List */}
            <div className="space-y-1.5">
              {SOLVERS.map(s => (
                <button key={s.id}
                  disabled={phase === 'generating' || phase === 'done'}
                  onClick={() => setSelectedSolver(s.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                    selectedSolver === s.id
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-border bg-background/40 hover:bg-background/60'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{s.label}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0"
                      style={{ background: s.badgeColor + '22', color: s.badgeColor }}>
                      {s.badge}
                    </span>
                  </div>
                  {selectedSolver === s.id && (
                    <p className="text-muted-foreground mt-1 leading-snug">{s.desc}</p>
                  )}
                </button>
              ))}
            </div>

            {/* Hardware Selection Dropdown */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Select Target Hardware ({filteredHardwares.length})
                </label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Displaying online registries for the {getSolverFriendlyName(effectiveSolver)} category.
                </p>
              </div>

              {filteredHardwares.length > 0 ? (
                <div className="relative">
                  <select
                    value={selectedHardwareId}
                    disabled={phase === 'generating' || phase === 'done'}
                    onChange={e => setSelectedHardwareId(e.target.value)}
                    className="w-full bg-background/50 border border-border hover:border-primary/50 text-foreground text-xs rounded-xl p-3 appearance-none focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer pr-10 transition-all"
                  >
                    {filteredHardwares.map(hw => (
                      <option key={hw.id} value={hw.id} className="bg-card text-foreground">
                        {hw.name} ({hw.qubits > 0 ? `${hw.qubits} Qubits` : 'Classical'}) — {hw.description}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-red-400 bg-red-400/5 border border-red-400/10 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>No online hardware registries found for this category.</span>
                </div>
              )}

              {/* Hardware Description Details */}
              {selectedHardwareId && (
                (() => {
                  const activeHw = filteredHardwares.find(h => h.id === selectedHardwareId);
                  if (!activeHw) return null;
                  return (
                    <div className="bg-background/25 border border-border/50 rounded-lg p-2.5 text-[11px] text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span className="font-semibold text-foreground">Registry Name:</span>
                        <span>{activeHw.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-foreground">Provider Type:</span>
                        <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {activeHw.provider}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-foreground">Capacity/Scale:</span>
                        <span>{activeHw.qubits > 0 ? `${activeHw.qubits} qubits` : 'Infinite classical'}</span>
                      </div>
                      {activeHw.description && (
                        <div className="pt-1 border-t border-border/30 mt-1">
                          <span className="font-semibold text-foreground block mb-0.5">Description:</span>
                          <p className="leading-snug">{activeHw.description}</p>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Execute Button */}
            {phase === 'solver_select' && (
              <button
                onClick={runGenerationAndExecution}
                disabled={filteredHardwares.length === 0}
                className="w-full py-2.5 rounded-xl text-white font-semibold text-xs transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'oklch(0.623 0.214 259.815)' }}
              >
                <Cpu className="w-4 h-4" />
                <span>Generate & Execute Solver</span>
              </button>
            )}
          </div>
        )}

        {/* Done Result Block */}
        {phase === 'done' && (
          <div className="bg-card border border-border rounded-2xl px-5 py-4 text-sm text-muted-foreground">
            Code generated successfully. Inspect the "Quantum algorithm" node on the canvas to view and run the code.
          </div>
        )}

        {/* Execution Output Box */}
        {executionStatus !== 'idle' && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${executionStatus === 'running' ? 'bg-primary animate-ping' : executionStatus === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Execution Logs & Output
                </h4>
              </div>
              {executionStatus === 'running' && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Running...
                </span>
              )}
              {executionStatus === 'success' && (
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Success
                </span>
              )}
              {executionStatus === 'failed' && (
                <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Failed
                </span>
              )}
            </div>

            <div className="relative font-mono text-[11px] bg-background border border-border/80 rounded-xl overflow-hidden shadow-inner">
              {/* Terminal Header */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/80 text-[10px] text-muted-foreground select-none">
                <span className="flex items-center gap-1"><Terminal className="w-3.5 h-3.5" /> python_execution_subsystem.py</span>
                <button
                  onClick={() => {
                    const text = (executionOutput || '') + (executionError ? `\n--- Error ---\n` + executionError : '');
                    navigator.clipboard.writeText(text);
                  }}
                  className="hover:text-foreground transition-colors flex items-center gap-1 font-sans font-medium"
                >
                  Copy Output
                </button>
              </div>

              {/* Terminal Body */}
              <div className="p-3.5 max-h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap select-text">
                {executionStatus === 'running' && (
                  <div className="text-muted-foreground animate-pulse">
                    Connecting to hardware registry...
                    Running solver subprocess execution environment...
                  </div>
                )}
                {executionOutput && (
                  <div className="text-slate-300">{executionOutput}</div>
                )}
                {executionError && (
                  <div className="text-red-400 font-semibold mt-2">
                    {executionOutput ? '\n' : ''}
                    --- Error Output ---
                    {executionError}
                  </div>
                )}
                {!executionOutput && !executionError && executionStatus !== 'running' && (
                  <div className="text-muted-foreground italic">No output logs returned.</div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input — only when idle */}
      {phase === 'idle' && (
        <div className="p-4 shrink-0">
          <form onSubmit={handleSubmit}
            className="flex items-end gap-2 bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-lg p-2 focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
              placeholder="Describe your optimization problem..."
              rows={1}
              className="flex-1 max-h-32 bg-transparent text-foreground placeholder:text-muted-foreground text-sm px-4 py-2 focus:outline-none resize-none"
              style={{ minHeight: '44px' }}
            />
            <button type="submit" disabled={!input.trim()}
              className="p-2.5 rounded-xl text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-95 mb-0.5 font-semibold text-xs"
              style={{ backgroundColor: 'oklch(0.623 0.214 259.815)' }}>
              Submit
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
