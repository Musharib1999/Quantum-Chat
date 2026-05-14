import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Trash2, BarChart3, LineChart, Table2, ScatterChart } from 'lucide-react';

const CHART_ICONS: Record<string, any> = {
  bar_chart: BarChart3,
  line_chart: LineChart,
  scatter_chart: ScatterChart,
  table: Table2,
};

const CHART_LABELS: Record<string, string> = {
  bar_chart: 'Bar chart',
  line_chart: 'Line graph',
  scatter_chart: 'Scatter plot',
  table: 'Data table',
};

export default function AnalyticsNode({ id, data }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();

  const onDelete = () => {
    setNodes((nodes) => nodes.filter((n) => n.id !== id));
    setEdges((edges) => edges.filter((e) => e.source !== id && e.target !== id));
  };

  const hasVisuals = data.outputVisuals && data.outputVisuals.length > 0;

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

      <div className="flex flex-col gap-4 pt-1">
        <h3 className="text-foreground text-[13px] font-semibold tracking-wide">Output analytics</h3>

        {hasVisuals ? (
          <div className="flex flex-col gap-2">
            {data.outputVisuals.map((visual: any, i: number) => {
              const Icon = CHART_ICONS[visual.type] || BarChart3;
              return (
                <div key={i} className="bg-secondary/50 border border-border rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={13} className="text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground">{visual.title}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-auto">{CHART_LABELS[visual.type]}</span>
                  </div>
                  {(visual.xAxis || visual.yAxis) && (
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pl-5 mt-1">
                      {visual.xAxis && <span>X: {visual.xAxis}</span>}
                      {visual.yAxis && <span>Y: {visual.yAxis}</span>}
                    </div>
                  )}
                  {visual.columns && (
                    <div className="flex flex-wrap gap-1 pl-5 mt-1">
                      {visual.columns.map((col: string) => (
                        <span key={col} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{col}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] text-muted-foreground font-medium tracking-wide">Chart type</label>
              <select className="bg-input border border-border text-sm text-foreground rounded-lg px-3 py-2 focus:outline-none focus:border-ring">
                <option>Bar chart</option>
                <option>Line graph</option>
                <option>Scatter plot</option>
                <option>Data table</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] text-muted-foreground font-medium tracking-wide">Axis mapping</label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-4">X:</span>
                <div className="bg-secondary/50 border border-border rounded px-2 py-1 w-full text-center italic">Auto-map</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-4">Y:</span>
                <div className="bg-secondary/50 border border-border rounded px-2 py-1 w-full text-center italic">Auto-map</div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground italic text-center border border-dashed border-border rounded-lg p-3">
              Visuals will be defined by the coach in Stage 5
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
