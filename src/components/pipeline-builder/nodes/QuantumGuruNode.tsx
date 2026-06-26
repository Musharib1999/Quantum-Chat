import React, { useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { usePipelineStore } from '@/store/usePipelineStore';

const SOLVERS = [
  {
    id: 'auto',
    label: 'Auto-detect (AI decides)',
    badge: 'Recommended',
    badgeColor: '#6366f1',
    description: 'The Suggestor Adapter analyzes your problem and selects the optimal solver automatically.',
    when: 'Unknown or complex mixed problems.',
  },
  {
    id: 'cqm',
    label: 'CQM — Constrained quadratic model',
    badge: 'D-Wave Leap Hybrid',
    badgeColor: '#0ea5e9',
    description: 'Best for mixed-integer constraints with equality/inequality bounds. Runs on D-Wave Leap hybrid cloud solvers.',
    when: 'Resource allocation, bin packing, portfolio optimization with hard constraints.',
  },
  {
    id: 'qubo',
    label: 'QUBO — Unconstrained binary optimization',
    badge: 'Quantum Annealer (QPU)',
    badgeColor: '#a855f7',
    description: 'Best for purely binary problems with soft-penalty constraints. Maps directly to physical QPU hardware.',
    when: 'Max-Cut, graph coloring, knapsack with penalty encoding.',
  },
  {
    id: 'ortools',
    label: 'OR-Tools — Classical CP-SAT',
    badge: 'Classical (Fast & Exact)',
    badgeColor: '#10b981',
    description: 'Best for linear scheduling, routing, and constraint satisfaction. Extremely fast with guaranteed exact solutions.',
    when: 'Vehicle routing, shift scheduling, linear programming.',
  },
];

export default function QuantumGuruNode({ id, data }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();
  const { problemDefinition, updateField } = usePipelineStore();
  const [selectedMode, setSelectedMode] = useState('auto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'approved' | 'dcc_override'>('idle');
  const [usedSolver, setUsedSolver] = useState<string | null>(null);
  const [solverRationale, setSolverRationale] = useState<string | null>(null);

  const selectedSolver = SOLVERS.find(s => s.id === selectedMode)!;

  const onDelete = () => {
    setNodes(nodes => nodes.filter(n => n.id !== id));
    setEdges(edges => edges.filter(e => e.source !== id && e.target !== id));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStatus('idle');
    setUsedSolver(null);
    setSolverRationale(null);
    try {
      const res = await fetch('http://127.0.0.1:8002/enterprise/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unstructured_problem: problemDefinition || 'We operate a fleet with 12 jobs and 8 technicians.',
          mode: selectedMode,
        })
      });
      const result = await res.json();
      updateField('quantumAlgorithmCode', result.final_code);
      updateField('currentIssues', result.parsed_math);
      updateField('reasoningTrace', result.reasoning_trace);
      if (result.suggested_solver) setUsedSolver(result.suggested_solver);
      if (result.solver_rationale) setSolverRationale(result.solver_rationale);
      setStatus(result.final_code?.includes('DCC FALLBACK') ? 'dcc_override' : 'approved');
    } catch (e) {
      console.error(e);
      setStatus('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5 min-w-[320px] border border-primary/20 relative group">
      {/* Handles */}
      {(['Top','Bottom','Left','Right'] as const).map(p => (
        <React.Fragment key={p}>
          <Handle type="target" position={Position[p]} id={`t-${p.toLowerCase()}`} className="w-2 h-2 bg-primary border-none" />
          <Handle type="source" position={Position[p]} id={`s-${p.toLowerCase()}`} className="w-2 h-2 bg-primary border-none" />
        </React.Fragment>
      ))}

      {/* Delete */}
      <button onClick={onDelete}
        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-background/50 rounded-md backdrop-blur-sm">
        ✕
      </button>

      {/* Title */}
      <div className="mb-4">
        <span className="font-semibold text-sm tracking-wide text-foreground block">Quantum code generator</span>
        <span className="text-[10px] text-muted-foreground">Powered by Quantum Guru Multi-LoRA</span>
      </div>

      {/* Solver Selector */}
      <div className="mb-3">
        <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest block mb-2">Select solver</label>
        <div className="flex flex-col gap-1.5">
          {SOLVERS.map(s => (
            <button key={s.id}
              onClick={() => setSelectedMode(s.id)}
              className={`text-left p-2.5 rounded-xl border transition-all text-xs ${
                selectedMode === s.id
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-border bg-background/40 hover:bg-background/70'
              }`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-foreground">{s.label}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                  style={{ background: s.badgeColor + '22', color: s.badgeColor }}>
                  {s.badge}
                </span>
              </div>
              {selectedMode === s.id && (
                <div className="mt-1.5 space-y-1">
                  <p className="text-muted-foreground leading-snug">{s.description}</p>
                  <p className="text-[10px] text-muted-foreground/70"><span className="font-semibold">Best for:</span> {s.when}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Result Badges */}
      {status === 'approved' && (
        <div className="mb-3 text-[11px] text-emerald-400 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20 font-medium">
          ✅ Verified — Solver: <strong>{usedSolver}</strong>
          {solverRationale && <div className="text-[10px] text-emerald-300/70 mt-0.5">{solverRationale}</div>}
        </div>
      )}
      {status === 'dcc_override' && (
        <div className="mb-3 text-[11px] text-amber-400 bg-amber-950/30 p-2 rounded-lg border border-amber-500/20 font-medium">
          ⚠️ DCC Override Active — Solver: <strong>{usedSolver}</strong>
        </div>
      )}

      {/* Run Button */}
      <button onClick={handleGenerate} disabled={isGenerating}
        className="w-full py-2.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-55">
        {isGenerating ? 'Running adapters...' : 'Generate code'}
      </button>
    </div>
  );
}
