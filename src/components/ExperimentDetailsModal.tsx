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
    const [viewingCode, setViewingCode] = useState(false);

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

    const PortfolioResultsPreview = ({ metrics, assignments, qubitCount }: { metrics: any, assignments: any[], qubitCount: number }) => {
        if (!metrics && (!assignments || assignments.length === 0)) return null;

        const toSuperscript = (num: number) => {
            const map: { [key: string]: string } = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
            return num.toString().split('').map(c => map[c] || c).join('');
        };

        return (
            <div className="grid grid-cols-1 gap-6 my-4">
                {metrics && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm max-w-md">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-border">
                                <tr>
                                    <td className="pl-3 pr-2 py-2.5 text-[11px] text-[#111827] bg-secondary/10 font-medium">Sectors</td>
                                    <td className="px-3 py-2.5 text-xs text-[#111827]">{metrics.sectorsCount}</td>
                                </tr>
                                <tr>
                                    <td className="pl-3 pr-2 py-2.5 text-[11px] text-[#111827] bg-secondary/10 font-medium">Assets</td>
                                    <td className="px-3 py-2.5 text-xs text-[#111827]">{metrics.assetsCount}</td>
                                </tr>
                                <tr>
                                    <td className="pl-3 pr-2 py-2.5 text-[11px] text-[#111827] bg-secondary/10 font-medium">Avg Return</td>
                                    <td className="px-3 py-2.5 text-xs text-[#10b981] font-bold">{metrics.avgReturn?.toFixed(2)}%</td>
                                </tr>
                                <tr>
                                    <td className="pl-3 pr-2 py-2.5 text-[11px] text-[#111827] bg-secondary/10 font-medium">Avg Risk</td>
                                    <td className="px-3 py-2.5 text-xs text-[#ef4444] font-bold">{metrics.avgRisk?.toFixed(2)}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {assignments && assignments.length > 0 && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                        <div className="max-h-[300px] overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-muted/95 backdrop-blur-md z-10 border-b border-border">
                                    <tr>
                                        <th className="pl-3 pr-2 py-2.5 text-[10px] text-[#111827] font-semibold tracking-wider bg-secondary/5">Asset</th>
                                        <th className="px-2 py-2.5 text-[10px] text-[#111827] font-semibold tracking-wider bg-secondary/5">Sector</th>
                                        <th className="px-2 py-2.5 text-[10px] text-[#111827] font-semibold tracking-wider bg-secondary/5">Ticker</th>
                                        <th className="px-2 py-2.5 text-[10px] text-[#111827] font-semibold tracking-wider bg-secondary/5 text-right">Return</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {assignments.map((row: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-muted/40 transition-colors">
                                            <td className="pl-3 pr-2 py-2.5 text-xs text-[#111827]">{row.route?.split('(')[0].trim()}</td>
                                            <td className="px-2 py-2.5 text-xs text-[#111827]">{row.sector}</td>
                                            <td className="px-2 py-2.5 text-xs text-[#111827] font-mono font-bold">{row.ticker || row.pilot || row.asset || 'N/A'}</td>
                                            <td className="px-2 py-2.5 text-xs text-[#10b981] font-bold text-right">{row.return !== undefined ? `${row.return.toFixed(2)}%` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                
                {/* Fullscreen Code Viewer */}
                {viewingCode && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 top-[80px] z-[70] bg-white dark:bg-card flex flex-col border-t border-border"
                    >
                        <div className="p-4 border-b border-border flex items-center justify-between bg-white dark:bg-card">
                            <div className="flex flex-col">
                                <span className="text-[#111827] dark:text-foreground text-sm font-bold">Quantum Source Code</span>
                                <span className="text-[#111827]/40 dark:text-foreground/40 text-[10px] font-mono">Qiskit/BQM Implementation</span>
                            </div>
                            <button 
                                onClick={() => setViewingCode(false)}
                                className="px-4 py-2 rounded-xl bg-[#3066bb] text-white text-xs hover:bg-[#3066bb]/90 transition-all font-bold shadow-md shadow-[#3066bb]/20"
                            >
                                Exit Fullscreen
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-8 lg:p-12 custom-scrollbar bg-white dark:bg-card">
                            <pre className="text-sm font-mono text-[#111827]/80 dark:text-foreground/80 leading-relaxed max-w-5xl mx-auto">{display.qiskitCode || "# No code available"}</pre>
                        </div>
                    </motion.div>
                )}

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
                                Re-Run
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
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-background/50 custom-scrollbar">

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

                        {/* 2. Input Parameters */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="text-[#111827] font-bold text-xs tracking-wide">
                                    Input Parameters
                                </span>
                                <div className="h-px bg-border flex-1" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {display.parameters && Object.entries(display.parameters).map(([key, value]: [string, any]) => (
                                    <div key={key} className="p-4 rounded-2xl bg-white dark:bg-card border border-border flex flex-col gap-1">
                                        <span className="text-[10px] text-[#111827]/60 font-semibold tracking-wide">
                                            {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                        </span>
                                        <span className="text-[13px] text-[#111827] dark:text-foreground font-bold truncate">
                                            {Array.isArray(value) ? value.join(', ') : String(value)}
                                        </span>
                                    </div>
                                ))}
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
                                        <span className="text-[#111827] font-bold text-xs tracking-wide">
                                            Generated Qiskit/Python Code
                                        </span>
                                        <div className="h-px bg-border flex-1" />
                                        <button 
                                            onClick={() => setViewingCode(true)}
                                            className="px-4 py-1.5 rounded-lg bg-[#3066bb]/10 text-[#3066bb] text-[10px] font-bold hover:bg-[#3066bb]/20 transition-all border border-[#3066bb]/20"
                                        >
                                            View Source
                                        </button>
                                    </div>
                                    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 overflow-hidden shadow-inner relative group">
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]/80" />
                                        <pre className="text-[11px] font-mono text-green-400/60 leading-relaxed overflow-hidden h-24">{display.qiskitCode || "# No code available"}</pre>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setViewingCode(true)}
                                                className="px-6 py-2 rounded-xl bg-white/10 backdrop-blur-md text-white text-xs font-bold border border-white/20"
                                            >
                                                Open Fullscreen
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {/* 4. Results & Analysis */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[#111827] font-bold text-xs tracking-wide">
                                            Simulation Output
                                        </span>
                                        <div className="h-px bg-border flex-1" />
                                    </div>
                                    
                                    <PortfolioResultsPreview 
                                        metrics={display.portfolioMetrics}
                                        assignments={display.assignmentsTable}
                                        qubitCount={display.qubitCount || 0}
                                    />

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="bg-white dark:bg-card border border-border rounded-2xl p-6 shadow-sm">
                                            <div className="text-[10px] text-[#111827]/60 font-bold mb-4 tracking-wide">Analysis</div>
                                            <MarkdownRenderer content={display.analysis || "No analysis available."} />
                                        </div>
                                        {display.chartData && (
                                            <div className="bg-white dark:bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                                                <div className="text-[10px] text-[#111827]/60 font-bold mb-4 w-full text-left tracking-wide">Visualization</div>
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
