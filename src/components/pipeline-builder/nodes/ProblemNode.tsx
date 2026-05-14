import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Trash2 } from 'lucide-react';

export default function ProblemNode({ id, data }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();

  const onDelete = () => {
    setNodes((nodes) => nodes.filter((n) => n.id !== id));
    setEdges((edges) => edges.filter((e) => e.source !== id && e.target !== id));
  };

  return (
    <div
      className="glass rounded-xl p-5 min-w-[260px] max-w-[320px] relative group border-2"
      style={{ borderColor: 'oklch(0.623 0.214 259.815)' }}
    >
      <Handle type="target" position={Position.Top} id="t-top" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="target" position={Position.Left} id="t-left" className="w-2 h-2 bg-foreground border-none" />
      <Handle type="target" position={Position.Right} id="t-right" className="w-2 h-2 bg-foreground border-none" />
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
        {data.name ? (
          <div>
            <span className="text-[10px] font-bold tracking-widest text-primary uppercase">Blueprint</span>
            <h3 className="text-foreground text-[15px] font-bold tracking-tight leading-tight mt-0.5">{data.name}</h3>
          </div>
        ) : (
          <h3 className="text-foreground text-[13px] font-semibold tracking-wide text-muted-foreground italic">Awaiting problem name...</h3>
        )}

        {data.problem ? (
          <p className="text-muted-foreground text-sm leading-relaxed border-t border-border pt-2">{data.problem}</p>
        ) : (
          <p className="text-muted-foreground text-xs italic">Problem description will appear here...</p>
        )}

        {data.issues && (
          <div className="mt-1 pt-3 border-t border-border">
            <h4 className="text-foreground text-[11px] font-semibold tracking-wide mb-1.5 uppercase">Constraints</h4>
            <p className="text-muted-foreground text-xs leading-relaxed">{data.issues}</p>
          </div>
        )}
      </div>
    </div>
  );
}
