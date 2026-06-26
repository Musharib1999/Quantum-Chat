'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePipelineStore } from '@/store/usePipelineStore';

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [phase, completedSteps, statusMsg]);

  const completeStep = (step: number) =>
    setCompletedSteps(prev => prev.includes(step) ? prev : [...prev, step]);

  const handleReset = () => {
    resetPipeline();
    setPhase('idle');
    setActiveStep(0);
    setCompletedSteps([]);
    setSelectedSolver('auto');
    setParsedMath('');
    setReasoningTrace('');
    setProblemText('');
    setStatusMsg('');
    setInput('');
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
      setStatusMsg('');
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
      setPhase('idle');
    }
  };

  const runGeneration = async () => {
    setPhase('generating');
    setActiveStep(4);
    setStatusMsg('Generating solver code...');

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
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
      setPhase('solver_select');
      setActiveStep(0);
    }
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
          <div className="space-y-3">
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-card-foreground">
              Analysis complete. Select a solver and generate code.
            </div>

            <div className="space-y-1.5">
              {SOLVERS.map(s => (
                <button key={s.id}
                  disabled={phase === 'generating' || phase === 'done'}
                  onClick={() => setSelectedSolver(s.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                    selectedSolver === s.id
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-border bg-background/40 hover:bg-background/60'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}>
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

            {phase === 'solver_select' && (
              <button onClick={runGeneration}
                className="w-full py-2.5 rounded-xl text-white font-semibold text-xs transition-all active:scale-95 shadow-md"
                style={{ backgroundColor: 'oklch(0.623 0.214 259.815)' }}>
                Generate code with {SOLVERS.find(s => s.id === selectedSolver)?.badge}
              </button>
            )}
          </div>
        )}

        {/* Done result */}
        {phase === 'done' && (
          <div className="bg-card border border-border rounded-2xl px-5 py-4 text-sm text-muted-foreground">
            Code generated successfully. Inspect the "Quantum algorithm" node on the canvas to view and run the code.
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
