import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Code2, Database, Terminal, BarChart2, Loader2 } from 'lucide-react';
import QuantumChart from './QuantumChart';
import MarkdownRenderer from './MarkdownRenderer';
import { getExperimentById } from '@/app/actions/experiment';

interface ExperimentDetailsModalProps {
    experiment: any | null; // Lightweight record from list
    onClose: () => void;
    onReRun: (experiment: any) => void;
}

export default function ExperimentDetailsModal({ experiment, onClose, onReRun }: ExperimentDetailsModalProps) {
    const [fullData, setFullData] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    // On open, fetch only the full experiment details on-demand
    useEffect(() => {
        if (!experiment?._id) {
            setFullData(null);
            return;
        }
        setLoading(true);
        setFullData(null);
        getExperimentById(experiment._id).then(data => {
            setFullData(data);
            setLoading(false);
        });
    }, [experiment?._id]);

    if (!experiment) return null;

    // Use full data if loaded, fall back to lightweight record for metadata
    const display = fullData || experiment;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card w-full max-w-4xl h-[90vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-border flex items-center justify-between bg-white dark:bg-card">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-[#111827] dark:text-foreground tracking-tight">Experiment Details</h2>
                            <span className="text-[10px] text-[#111827]/60 font-mono">ID: {display._id}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onReRun(display)}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3066bb] text-white text-sm font-bold shadow-xl shadow-[#3066bb]/20 hover:bg-[#3066bb]/90 transition-all active:scale-[0.98]"
                            >
                                <Play size={16} fill="currentColor" /> Re-Run
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-background/50">

                        {/* 1. Configuration Grid */}
                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-border flex flex-col gap-1 transition-all hover:shadow-md">
                                <span className="text-[10px] text-[#111827]/60 font-semibold tracking-wide">Industry</span>
                                <span className="text-[13px] text-[#111827] dark:text-foreground font-bold">{display.industry}</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-border flex flex-col gap-1 transition-all hover:shadow-md">
                                <span className="text-[10px] text-[#111827]/60 font-semibold tracking-wide">Service</span>
                                <span className="text-[13px] text-[#111827] dark:text-foreground font-bold">{display.service}</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-border flex flex-col gap-1 transition-all hover:shadow-md">
                                <span className="text-[10px] text-[#111827]/60 font-semibold tracking-wide">Problem</span>
                                <span className="text-[13px] text-[#111827] dark:text-foreground font-bold">{display.problem}</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-border flex flex-col gap-1 transition-all hover:shadow-md">
                                <span className="text-[10px] text-[#111827]/60 font-semibold tracking-wide">Hardware</span>
                                <span className="text-[13px] text-[#111827] dark:text-foreground font-bold">{display.hardware}</span>
                            </div>
                        </section>

                        {/* 2. Inputs (Form Data) */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="text-[#111827] font-bold text-xs tracking-wide flex items-center gap-2">
                                    <Database size={14} className="text-[#111827]/60" /> Input Parameters
                                </span>
                                <div className="h-px bg-border flex-1" />
                            </div>
                            <div className="bg-white dark:bg-card border border-border rounded-2xl p-6 overflow-auto max-h-48 group transition-all">
                                <pre className="text-xs font-mono text-[#111827]/80 dark:text-foreground/80 leading-relaxed">{JSON.stringify(display.parameters, null, 2)}</pre>
                            </div>
                        </section>

                        {/* Loading indicator for heavy data */}
                        {loading && (
                            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                                <Loader2 size={18} className="animate-spin" />
                                <span className="text-sm">Loading full experiment details...</span>
                            </div>
                        )}

                        {/* 3. Generated Code — only once full data is loaded */}
                        {!loading && (
                            <>
                                <section className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[#111827] font-bold text-xs tracking-wide flex items-center gap-2">
                                            <Code2 size={14} className="text-[#111827]/60" /> Generated Qiskit/Python Code
                                        </span>
                                        <div className="h-px bg-border flex-1" />
                                    </div>
                                    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 overflow-auto max-h-80 shadow-inner">
                                        <pre className="text-xs font-mono text-green-400/90 leading-relaxed scrollbar-hide">{display.qiskitCode || "# No code available"}</pre>
                                    </div>
                                </section>

                                {/* 4. Results & Analysis */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[#111827] font-bold text-xs tracking-wide flex items-center gap-2">
                                            <Terminal size={14} className="text-[#111827]/60" /> System Output & Analysis
                                        </span>
                                        <div className="h-px bg-border flex-1" />
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="bg-card border border-border rounded-xl p-6">
                                            <MarkdownRenderer content={display.analysis || "No analysis available."} />
                                        </div>
                                        {display.chartData && (
                                            <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
                                                <h4 className="text-[10px] text-[#111827]/60 font-bold mb-4 w-full text-left flex items-center gap-2">
                                                    <BarChart2 size={14} /> Visualization
                                                </h4>
                                                <QuantumChart data={display.chartData.data} />
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </>
                        )}

                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
