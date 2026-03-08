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
                    <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                        <div className="flex flex-col">
                            <h2 className="text-lg font-bold text-foreground">Experiment Details</h2>
                            <span className="text-xs text-muted-foreground font-mono">ID: {display._id}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onReRun(display)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:bg-primary/90 transition-colors"
                            >
                                <Play size={16} fill="currentColor" /> Re-Run
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-background/50">

                        {/* 1. Configuration Grid */}
                        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-card border border-border">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Industry</span>
                                <span className="text-sm font-medium">{display.industry}</span>
                            </div>
                            <div className="p-4 rounded-xl bg-card border border-border">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Service</span>
                                <span className="text-sm font-medium">{display.service}</span>
                            </div>
                            <div className="p-4 rounded-xl bg-card border border-border">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Problem</span>
                                <span className="text-sm font-medium">{display.problem}</span>
                            </div>
                            <div className="p-4 rounded-xl bg-card border border-border">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Hardware</span>
                                <span className="text-sm font-medium">{display.hardware}</span>
                            </div>
                        </section>

                        {/* 2. Inputs (Form Data) */}
                        <section className="space-y-3">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                <Database size={16} /> Input Parameters
                            </h3>
                            <div className="bg-card border border-border rounded-xl p-4 overflow-auto max-h-48">
                                <pre className="text-xs font-mono text-foreground/80">{JSON.stringify(display.parameters, null, 2)}</pre>
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
                                <section className="space-y-3">
                                    <h3 className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                        <Code2 size={16} /> Generated Qiskit/Python Code
                                    </h3>
                                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-auto max-h-64">
                                        <pre className="text-xs font-mono text-green-400 leading-relaxed">{display.qiskitCode || "# No code available"}</pre>
                                    </div>
                                </section>

                                {/* 4. Results & Analysis */}
                                <section className="space-y-3">
                                    <h3 className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                        <Terminal size={16} /> System Output & Analysis
                                    </h3>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="bg-card border border-border rounded-xl p-6">
                                            <MarkdownRenderer content={display.analysis || "No analysis available."} />
                                        </div>
                                        {display.chartData && (
                                            <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
                                                <h4 className="text-xs font-bold text-muted-foreground mb-4 w-full text-left flex items-center gap-2">
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
