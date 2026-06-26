import React, { useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { usePipelineStore } from '@/store/usePipelineStore';

export default function TheQuantumInterpretationNode({ id }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();
  const { reasoningTrace } = usePipelineStore();
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
          Step 3
        </span>
        <span className="font-bold text-sm text-foreground block">
          The quantum interpretation
        </span>
      </div>

      {/* Content preview */}
      <div className="bg-background/40 p-3 rounded-xl border border-border/50 mb-4 min-h-[60px] max-h-[100px] overflow-hidden">
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
          {reasoningTrace || 'Awaiting dynamic logical reasoning and feasibility results.'}
        </p>
      </div>

      {/* View Button */}
      <button 
        onClick={() => setIsOpen(true)}
        disabled={!reasoningTrace}
        className="w-full py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-55"
      >
        View
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-sm font-semibold p-1"
            >
              ✕
            </button>
            <h3 className="font-bold text-base text-foreground mb-4">
              The quantum interpretation
            </h3>
            <div className="bg-background p-4 rounded-xl border border-border max-h-[300px] overflow-y-auto">
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {reasoningTrace}
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
