import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Trash2 } from 'lucide-react';

export default function AnalysisPromptNode({ id, data }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();

  const onDelete = () => {
    setNodes((nodes) => nodes.filter((n) => n.id !== id));
    setEdges((edges) => edges.filter((e) => e.source !== id && e.target !== id));
  };

  return (
    <div 
      className="glass rounded-xl p-5 min-w-[280px] relative group border-2"
      style={{ borderColor: 'oklch(0.623 0.214 259.815)' }}
    >
      {/* 4-way Targets */}
      <Handle type="target" position={Position.Top} id="t-top" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="target" position={Position.Left} id="t-left" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="target" position={Position.Right} id="t-right" className="w-2 h-2 bg-foreground border-none" />
      
      {/* 4-way Sources */}
      <Handle type="source" position={Position.Top} id="s-top" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="source" position={Position.Left} id="s-left" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="source" position={Position.Right} id="s-right" className="w-2 h-2 bg-foreground border-none" />

      <button 
        onClick={onDelete}
        className="absolute top-3 right-3 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-background/50 rounded-md backdrop-blur-sm"
      >
        <Trash2 size={13} />
      </button>

      <div className="flex flex-col gap-3 pt-1">
        <h3 className="text-foreground text-[13px] font-semibold tracking-wide">AI interpretation</h3>
        <div className="mt-2">
            <label className="text-[11px] text-muted-foreground tracking-wide font-medium mb-1 block">Analysis prompt</label>
            <textarea 
                className="w-full bg-input border border-border rounded-lg text-sm text-foreground p-3 focus:outline-none focus:border-ring resize-none min-h-[80px]"
                placeholder="e.g. Analyze these results and write a summary on total cost savings..."
                defaultValue={data.prompt}
            />
        </div>
      </div>
    </div>
  );
}
