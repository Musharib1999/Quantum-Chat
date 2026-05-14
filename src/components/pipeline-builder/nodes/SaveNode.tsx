import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SaveNode({ id, data }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();

  const onDelete = () => {
    setNodes((nodes) => nodes.filter((n) => n.id !== id));
    setEdges((edges) => edges.filter((e) => e.source !== id && e.target !== id));
  };

  const onSave = () => {
      // Stub for saving logic to connect with backend later
      toast.success("Pipeline Blueprint saved to drafts!");
  }

  return (
    <div 
      className="glass rounded-xl p-6 min-w-[220px] relative group border-2 flex flex-col items-center justify-center gap-3"
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
        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-background/50 rounded-md backdrop-blur-sm"
      >
        <Trash2 size={13} />
      </button>

      <button 
        onClick={onSave}
        className="w-full py-3 bg-white text-[oklch(0.623_0.214_259.815)] border-2 border-[oklch(0.623_0.214_259.815)] hover:bg-[oklch(0.623_0.214_259.815)] hover:text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-sm active:scale-95"
      >
        <Save size={16} />
        Save Blueprint
      </button>
      <p className="text-[10px] text-muted-foreground font-medium text-center tracking-wide">
        Persist pipeline logic
      </p>
    </div>
  );
}
