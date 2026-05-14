import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Trash2 } from 'lucide-react';

export default function SingleVariableNode({ id, data }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();

  const onDelete = () => {
    setNodes((nodes) => nodes.filter((n) => n.id !== id));
    setEdges((edges) => edges.filter((e) => e.source !== id && e.target !== id));
  };

  return (
    <div 
      className="glass rounded-xl p-3 min-w-[150px] relative group border-2"
      style={{ borderColor: 'oklch(0.623 0.214 259.815)' }}
    >
      <Handle type="target" position={Position.Left} id="t-left" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="target" position={Position.Top} id="t-top" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="target" position={Position.Right} id="t-right" className="w-2 h-2 bg-foreground border-none" />

      <Handle type="source" position={Position.Left} id="s-left" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="source" position={Position.Top} id="s-top" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="source" position={Position.Right} id="s-right" className="w-2 h-2 bg-foreground border-none" />

      <button 
        onClick={onDelete}
        className="absolute -top-2 -right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-background rounded-full backdrop-blur-sm border border-border shadow-sm"
      >
        <Trash2 size={10} />
      </button>

      <div className="text-[11px] font-bold text-foreground text-center tracking-wide">{data.label}</div>
    </div>
  );
}
