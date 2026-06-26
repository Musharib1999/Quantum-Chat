import React, { useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { usePipelineStore } from '@/store/usePipelineStore';

export default function QuantumAlgorithmNode({ id }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();
  const { quantumAlgorithmCode } = usePipelineStore();
  const [isOpen, setIsOpen] = useState(false);

  const onDelete = () => {
    setNodes((nodes) => nodes.filter((n) => n.id !== id));
    setEdges((edges) => edges.filter((e) => e.source !== id && e.target !== id));
  };

  return (
    <div className="glass rounded-2xl p-5 min-w-[240px] border border-primary/20 relative group">
      {/* Handles */}
      <Handle type="target" position={Position.Top} id="t-top" className="w-2 h-2 bg-primary border-none" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="w-2 h-2 bg-primary border-none" />
      <Handle type="target" position={Position.Left} id="t-left" className="w-2 h-2 bg-primary border-none" />
      <Handle type="target" position={Position.Right} id="t-right" className="w-2 h-2 bg-primary border-none" />
      
      <Handle type="source" position={Position.Top} id="s-top" className="w-2 h-2 bg-primary border-none" />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="w-2 h-2 bg-primary border-none" />
      <Handle type="source" position={Position.Left} id="s-left" className="w-2 h-2 bg-primary border-none" />
      <Handle type="source" position={Position.Right} id="s-right" className="w-2 h-2 bg-primary border-none" />

      {/* Delete button */}
      <button 
        onClick={onDelete}
        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-background/50 rounded-md backdrop-blur-sm"
      >
        ✕
      </button>

      {/* Title */}
      <div className="mb-3">
        <span className="font-semibold text-xs text-muted-foreground uppercase tracking-widest block mb-1">
          Step 4
        </span>
        <span className="font-bold text-sm text-foreground block">
          Quantum algorithm
        </span>
      </div>

      {/* Content preview */}
      <div className="bg-background/40 p-3 rounded-xl border border-border/50 mb-4 min-h-[60px] max-h-[100px] overflow-hidden">
        <p className="text-[11px] font-mono text-muted-foreground line-clamp-3 leading-relaxed">
          {quantumAlgorithmCode || '# Awaiting model compilation code.'}
        </p>
      </div>

      {/* View Button */}
      <button 
        onClick={() => setIsOpen(true)}
        disabled={!quantumAlgorithmCode}
        className="w-full py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-55"
      >
        View
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-6 md:p-10">
          <div className="bg-card border border-border rounded-3xl w-full max-w-5xl h-[85vh] p-8 shadow-2xl relative flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 text-muted-foreground hover:text-foreground text-lg font-bold p-2 bg-secondary/50 rounded-xl transition-colors"
            >
              ✕
            </button>
            <div className="mb-4">
              <span className="font-semibold text-xs text-muted-foreground uppercase tracking-widest block mb-1">
                Compiled CQM model formulation
              </span>
              <h3 className="font-bold text-xl text-foreground">
                Quantum algorithm
              </h3>
            </div>
            <div className="flex-1 bg-slate-950 p-6 rounded-2xl border border-slate-800/80 overflow-y-auto font-mono text-xs shadow-inner">
              <pre className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {quantumAlgorithmCode}
              </pre>
            </div>
            <div className="mt-6 flex justify-end shrink-0">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-6 py-3 bg-primary text-primary-foreground text-xs font-semibold rounded-2xl shadow-md active:scale-95 transition-all"
              >
                Close viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
