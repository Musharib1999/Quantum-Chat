import React, { useEffect, useState } from 'react';
import { usePipelineStore } from '@/store/usePipelineStore';
import { Loader2, ChevronDown, GripHorizontal } from 'lucide-react';

export default function LeftSidebar() {
  const { updateField, addVariable, resetPipeline } = usePipelineStore();
  const [toyProblems, setToyProblems] = useState<any[]>([]);
  const [loadingToys, setLoadingToys] = useState(true);
  const [isDragOpen, setIsDragOpen] = useState(false);

  const onDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  useEffect(() => {
      async function fetchToyProblems() {
          try {
              const res = await fetch('/api/quantum-forms?isToyProblem=true');
              if (res.ok) {
                  const data = await res.json();
                  const mapped = data.map((form: any) => ({
                      id: form._id,
                      title: form.problem,
                      description: form.description || `Pre-configured ${form.industry} optimization blueprint.`,
                      problem: form.description || form.problem,
                      issues: `Pre-configured for ${form.hardware || 'Universal solver'}.`,
                      variables: (form.fields || []).map((f: any) => f.label),
                      hardware: form.hardware,
                      prompt: form.interpretationPrompt,
                      chartConfig: form.chartConfig
                  }));
                  setToyProblems(mapped);
              }
          } catch (error) {
              console.error("Failed to load toy problems", error);
          } finally {
              setLoadingToys(false);
          }
      }
      fetchToyProblems();
  }, []);

  const handleFork = (problem: any) => {
    resetPipeline();
    setTimeout(() => {
      updateField('problemDefinition', problem.problem);
      updateField('currentIssues', problem.issues);
      if (problem.hardware) updateField('hardware', problem.hardware);
      if (problem.prompt) updateField('analysisPrompt', problem.prompt);
      if (problem.chartConfig) updateField('analyticsWidgets', problem.chartConfig);
      
      if (problem.variables) {
          problem.variables.forEach((v: string) => addVariable(v));
      }
    }, 50);
  };


  return (
    <div className="flex flex-col h-full">
      <div className="p-6 space-y-8">

        {/* Collapsible Drag to canvas section */}
        <section className="border-b border-border/40 pb-5">
          <button 
            onClick={() => setIsDragOpen(!isDragOpen)}
            className="w-full flex items-center justify-between text-[11px] text-muted-foreground font-semibold tracking-wide hover:text-foreground transition-colors"
          >
            <span>Drag to canvas</span>
            <ChevronDown size={13} className={`transform transition-transform duration-200 ${isDragOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDragOpen && (
            <div className="flex flex-col gap-2.5 mt-3 animate-in slide-in-from-top-2 duration-200">
              {[
                { type: 'problemNode', label: 'Problem definition' },
                { type: 'variableNode', label: 'Variables list' },
                { type: 'hardwareNode', label: 'Hardware / simulator' },
                { type: 'analyticsNode', label: 'Output analytics' },
                { type: 'promptNode', label: 'AI interpretation' },
                { type: 'saveNode', label: 'Save pipeline' },
                { type: 'executeNode', label: 'Execute pipeline' },
              ].map(node => (
                <div 
                  key={node.type}
                  className="bg-card border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors rounded-lg p-2.5 cursor-grab active:cursor-grabbing text-xs font-medium text-foreground flex items-center gap-2 shadow-sm"
                  onDragStart={(e) => onDragStart(e, node.type)} 
                  draggable
                >
                  <GripHorizontal size={14} className="text-muted-foreground" />
                  {node.label}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Toy Problems section */}
        <section>
           <h3 className="text-[11px] text-muted-foreground font-semibold tracking-wide mb-3 flex items-center gap-1.5">
             Sample problem
           </h3>
           <div className="flex flex-col gap-3">
            {loadingToys ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
            ) : toyProblems.length > 0 ? (
                toyProblems.map(tp => (
                  <div 
                    key={tp.id} 
                    className="bg-card/50 border border-border rounded-lg p-3.5 hover:bg-secondary transition-colors group cursor-pointer" 
                    onClick={() => handleFork(tp)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-[13px] font-medium text-foreground">{tp.title}</h4>
                      <button className="text-[9px] font-medium tracking-wide bg-primary text-primary-foreground px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Fork
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">{tp.description}</p>
                  </div>
                ))
            ) : (
                <div className="text-xs text-muted-foreground italic p-4 text-center border border-dashed border-border rounded-lg">
                    No active toy problems available.
                </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
