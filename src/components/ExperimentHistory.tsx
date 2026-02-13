"use client";

import React, { useEffect, useState } from 'react';
import { History, ChevronRight, Beaker, Code2, BarChart2 } from 'lucide-react';
import { getExperiments } from '@/app/actions/experiment';

interface ExperimentHistoryProps {
    onSelectExperiment: (experiment: any) => void;
    currentExperimentId?: string;
}

export default function ExperimentHistory({ onSelectExperiment, currentExperimentId }: ExperimentHistoryProps) {
    const [experiments, setExperiments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    const [viewingCode, setViewingCode] = useState<{ code: string, problem: string } | null>(null);

    useEffect(() => {
        fetchExperiments();
        // Poll for updates every 10 seconds to keep history fresh
        const interval = setInterval(fetchExperiments, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchExperiments = async () => {
        try {
            const data = await getExperiments();
            setExperiments(data);
        } catch (error) {
            console.error("Failed to load experiments", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Code Viewer Modal */}
            {viewingCode && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/50 rounded-t-2xl">
                            <div className="flex items-center gap-2">
                                <Code2 size={18} className="text-primary" />
                                <h3 className="font-bold text-foreground">Generated Qiskit Code</h3>
                                <span className="text-xs text-muted-foreground ml-2 border-l border-border pl-2">{viewingCode.problem}</span>
                            </div>
                            <button
                                onClick={() => setViewingCode(null)}
                                className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ChevronRight size={18} className="rotate-90" />
                            </button>
                        </div>
                        <div className="p-0 overflow-auto bg-zinc-950 font-mono text-sm">
                            <pre className="p-6 text-green-400/90 leading-relaxed whitespace-pre-wrap">{viewingCode.code}</pre>
                        </div>
                        <div className="p-4 border-t border-border bg-card rounded-b-2xl flex justify-end">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(viewingCode.code);
                                }}
                                className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-secondary transition-all"
                            >
                                Copy to Clipboard
                            </button>
                        </div>
                    </div>
                    <div className="absolute inset-0 -z-10" onClick={() => setViewingCode(null)}></div>
                </div>
            )}

            {/* Toggle Button (Visible when closed) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-card border border-r-0 border-border p-3 rounded-l-xl shadow-lg transition-transform duration-300 ${isOpen ? 'translate-x-full' : 'translate-x-0'} hover:bg-secondary text-muted-foreground hover:text-foreground`}
            >
                <History size={20} />
            </button>

            {/* Sidebar Panel */}
            <div className={`fixed inset-y-0 right-0 z-50 w-80 bg-card/95 backdrop-blur-2xl border-l border-border shadow-2xl transform transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <History size={18} className="text-primary" />
                        <h2 className="font-bold text-foreground text-sm tracking-wide">Experiment History</h2>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-secondary rounded-lg transition-colors"
                    >
                        <ChevronRight size={18} className="text-muted-foreground" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto h-[calc(100vh-80px)] p-4 space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
                        </div>
                    ) : experiments.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground text-xs">
                            No experiments recorded yet.
                        </div>
                    ) : (
                        experiments.map((exp) => (
                            <div
                                key={exp._id}
                                className={`w-full text-left p-4 rounded-xl border transition-all group relative overflow-hidden ${currentExperimentId === exp._id
                                    ? 'bg-primary/5 border-primary/40'
                                    : 'bg-secondary/30 border-border hover:border-primary/20 hover:bg-secondary/80'
                                    }`}
                            >
                                <div
                                    onClick={() => onSelectExperiment(exp)}
                                    className="cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            {new Date(exp.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${exp.hardware.includes('real') ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                            }`}>
                                            {exp.hardware}
                                        </span>
                                    </div>

                                    <h3 className="text-xs font-bold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                                        {exp.problem}
                                    </h3>
                                </div>

                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Beaker size={12} />
                                            <span className="text-[10px]">Sim</span>
                                        </div>
                                        {exp.chartData && (
                                            <div className="flex items-center gap-1">
                                                <BarChart2 size={12} />
                                                <span className="text-[10px]">Chart</span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setViewingCode({ code: exp.qiskitCode, problem: exp.problem });
                                        }}
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border hover:border-primary/30"
                                    >
                                        <Code2 size={10} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">View Code</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
