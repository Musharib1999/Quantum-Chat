import React from 'react';
import { Beaker, ChevronRight } from 'lucide-react';

interface ExperimentHistoryListProps {
    experiments: any[];
    loading: boolean;
    onSelectExperiment: (experiment: any) => void;
}

export default function ExperimentHistoryList({ experiments, loading, onSelectExperiment }: ExperimentHistoryListProps) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
                <p className="text-xs text-muted-foreground">Syncing Lab History...</p>
            </div>
        );
    }

    if (experiments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                <Beaker size={32} className="opacity-20 mb-4" />
                <p className="text-sm">No experiments yet.</p>
                <p className="text-xs opacity-60 mt-1">Run a simulation to see it here.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-3 p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Recent Experiments</h3>
            {experiments.map((exp) => (
                <button
                    key={exp._id}
                    onClick={() => onSelectExperiment(exp)}
                    className="group w-full text-left p-3 rounded-xl bg-card/50 border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all shadow-sm"
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono text-muted-foreground">
                            {new Date(exp.timestamp).toLocaleDateString()}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${exp.success !== false ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                            {exp.success !== false ? 'Success' : 'Failed'}
                        </span>
                    </div>
                    <div className="font-medium text-sm text-foreground mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">
                        {exp.problem || "Untitled Experiment"}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="truncate max-w-[120px]">{exp.industry}</span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span className="truncate">{exp.hardware}</span>
                    </div>
                </button>
            ))}
        </div>
    );
}
