import React from 'react';
import { Beaker, ChevronRight } from 'lucide-react';

interface ExperimentHistoryListProps {
    experiments: any[];
    loading: boolean;
    onSelectExperiment: (experiment: any) => void;
    isGuest?: boolean;
}

export default function ExperimentHistoryList({ experiments, loading, onSelectExperiment, isGuest }: ExperimentHistoryListProps) {
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
                {isGuest ? (
                    <>
                        <p className="text-sm">History Unavailable</p>
                        <p className="text-xs opacity-60 mt-1">Log in to safely store and review your quantum simulations.</p>
                    </>
                ) : (
                    <>
                        <p className="text-sm">No experiments yet.</p>
                        <p className="text-xs opacity-60 mt-1">Run a simulation to see it here.</p>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-1 px-2 py-3 h-full overflow-y-auto scrollbar-hide">
            <h3 className="text-sm font-medium text-foreground mb-2 px-3">Recent Experiments</h3>
            {experiments.map((exp) => (
                <button
                    key={exp._id}
                    onClick={() => onSelectExperiment(exp)}
                    className="group w-full text-left px-3 py-2 rounded-xl bg-transparent border border-transparent text-foreground hover:bg-card hover:border-ring hover:shadow-md transition-all duration-200"
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[12px] font-medium text-muted-foreground">
                            {new Date(exp.timestamp).toLocaleDateString()}
                        </span>
                        <span className={`text-[12px] font-medium tracking-wide border-t border-border/20 uppercase ${exp.success !== false ? 'text-green-500' : 'text-red-500'}`}>
                            {exp.success !== false ? 'Success' : 'Failed'}
                        </span>
                    </div>
                    <div className="font-medium text-[12px] text-foreground mb-1 line-clamp-1 transition-colors">
                        {exp.problem || "Untitled Experiment"}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
                        <span className="truncate max-w-[120px]">{exp.industry}</span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span className="truncate">{exp.hardware}</span>
                    </div>
                </button>
            ))}
        </div>
    );
}
