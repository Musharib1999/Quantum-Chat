import React, { useEffect, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Trash2 } from 'lucide-react';

interface HardwareItem {
    id: string;
    name: string;
    provider: string;
    qubits: number;
    description: string;
}

export default function HardwareNode({ id, data }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();
  const [hardwareList, setHardwareList] = useState<HardwareItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const onDelete = () => {
    setNodes((nodes) => nodes.filter((n) => n.id !== id));
    setEdges((edges) => edges.filter((e) => e.source !== id && e.target !== id));
  };

  useEffect(() => {
      async function fetchHardware() {
          try {
              const res = await fetch('/api/hardware');
              if (res.ok) {
                  const fetchedData = await res.json();
                  setHardwareList(fetchedData);
              }
          } catch (error) {
              console.error("Failed to load hardware registry", error);
          } finally {
              setIsLoading(false);
          }
      }
      fetchHardware();
  }, []);

  return (
    <div 
      className="glass rounded-xl p-5 min-w-[260px] relative group border-2"
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

      <div className="flex flex-col gap-4 pt-1">
        <h3 className="text-foreground text-[13px] font-semibold tracking-wide">Hardware / simulator</h3>
        
        <div className="flex flex-col gap-2">
          <label className="text-[11px] text-muted-foreground font-medium tracking-wide">Select target</label>
          <select 
              className="bg-input border border-border text-sm text-foreground rounded-lg px-3 py-2 focus:outline-none focus:border-ring"
              disabled={isLoading}
              defaultValue={data?.selectedHardware || ""}
          >
            {isLoading ? (
                <option>Loading registry...</option>
            ) : hardwareList.length > 0 ? (
                hardwareList.map(hw => (
                    <option key={hw.id} value={hw.id}>
                        {hw.name} ({hw.provider})
                    </option>
                ))
            ) : (
                <>
                    <option>D-Wave Advantage (QPU)</option>
                    <option>IBM Quantum System One</option>
                    <option>Hybrid CQM Solver</option>
                    <option>Local CPU (Simulated Annealing)</option>
                </>
            )}
          </select>
          <p className="text-[10px] text-muted-foreground mt-1 text-right italic">
              {isLoading ? "Connecting to registry..." : "Registry loaded"}
          </p>
        </div>
      </div>
    </div>
  );
}
