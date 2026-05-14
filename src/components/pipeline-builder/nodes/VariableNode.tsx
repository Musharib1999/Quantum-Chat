import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Trash2, Maximize2 } from 'lucide-react';

export default function VariableNode({ id, data }: NodeProps) {
  const { setNodes, setEdges, getNodes } = useReactFlow();

  const onDelete = () => {
    setNodes((nodes) => nodes.filter((n) => n.id !== id));
    setEdges((edges) => edges.filter((e) => e.source !== id && e.target !== id));
  };

  const onExpand = () => {
    if (!data.variables || data.variables.length === 0) return;

    const varNodes: any[] = [];
    const varEdges: any[] = [];
    const parentNode = getNodes().find(n => n.id === id);
    const baseX = parentNode ? parentNode.position.x + 370 : 600;
    const baseY = parentNode ? parentNode.position.y : 300;

    data.variables.forEach((v: any, index: number) => {
      const vId = `single-var-${id}-${v.id || index}`;
      if (getNodes().some(n => n.id === vId)) return;
      varNodes.push({
        id: vId,
        type: 'singleVar',
        position: { x: baseX, y: baseY + (index * 90) },
        data: { label: v.name, weight: v.weight, description: v.description }
      });
      varEdges.push({
        id: `edge-${id}-${vId}`,
        source: id, sourceHandle: 's-right',
        target: vId, targetHandle: 't-left',
        animated: true,
        style: { stroke: 'oklch(0.623 0.214 259.815)', strokeWidth: 2 }
      });
    });

    setNodes((nds) => [...nds, ...varNodes]);
    setEdges((eds) => [...eds, ...varEdges]);
  };

  return (
    <div
      className="glass rounded-xl p-5 min-w-[280px] relative group border-2"
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-foreground text-[13px] font-semibold tracking-wide">Variables</h3>
            <p className="text-muted-foreground text-[11px] tracking-wide mt-1">Priority ordered · weighted</p>
          </div>
          <button
            onClick={onExpand}
            className="text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-2 py-1 rounded transition-colors flex items-center gap-1"
            title="Expand into individual blocks"
          >
            <Maximize2 size={12} /> Expand
          </button>
        </div>

        <div className="flex flex-col gap-2 mt-1">
          {data.variables && data.variables.length > 0 ? (
            data.variables.map((v: any, index: number) => (
              <div key={v.id} className="bg-secondary/50 border border-border hover:bg-secondary transition-colors rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-foreground font-medium">
                    <span className="text-muted-foreground font-mono text-xs w-4">{index + 1}.</span>
                    {v.name}
                  </span>
                  {v.weight != null && (
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      w:{v.weight}
                    </span>
                  )}
                </div>
                {v.description && (
                  <p className="text-[11px] text-muted-foreground mt-1 pl-6 leading-snug">{v.description}</p>
                )}
              </div>
            ))
          ) : (
            <div className="text-muted-foreground text-xs italic border border-dashed border-border p-4 rounded-lg text-center">
              Awaiting variable extraction...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
