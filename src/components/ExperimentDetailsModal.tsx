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

    const DynamicResultsTable = ({ tables, assignments, portfolioMetrics }: { tables: any[], assignments: any[], portfolioMetrics?: any }) => {
        if (!tables || tables.length === 0) {
            // Fallback for older experiments without stored outputTables
            if (!assignments || assignments.length === 0) return null;
            return (
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="max-h-[300px] overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-muted/95 backdrop-blur-md z-10 border-b border-border">
                                <tr>
                                    <th className="pl-3 pr-2 py-2.5 text-[10px] text-[#111827] font-semibold tracking-wider bg-secondary/5">Assignment</th>
                                    <th className="px-2 py-2.5 text-[10px] text-[#111827] font-semibold tracking-wider bg-secondary/5 text-right">Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {assignments.map((row: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-muted/40 transition-colors">
                                        <td className="pl-3 pr-2 py-2.5 text-xs text-[#111827]">{row.ticker || row.pilot || row.asset || 'Item'}</td>
                                        <td className="px-2 py-2.5 text-xs text-right">{row.route || row.assignment || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {tables.map((table, tIdx) => {
                    const isSummary = table.mapping.some((col: any) => portfolioMetrics && portfolioMetrics[col.resultKey] !== undefined);
                    const rows = isSummary ? [portfolioMetrics] : assignments;

                    return (
                        <div key={tIdx} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                            <div className="px-3 py-1.5 border-b border-border bg-secondary/10 flex items-center justify-between">
                                <span className="text-[10px] text-[#111827]/60 font-bold uppercase tracking-wider">{table.name}</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-muted/95 backdrop-blur-md z-10 border-b border-border">
                                        <tr>
                                            {table.mapping.sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0)).map((col: any, cIdx: number) => (
                                                <th key={cIdx} className="px-3 py-2.5 text-[10px] text-[#111827] font-semibold tracking-wider bg-secondary/5">{col.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {rows.map((row, rIdx) => (
                                            <tr key={rIdx} className="hover:bg-muted/40 transition-colors">
                                                {table.mapping.map((col: any, cIdx: number) => {
                                                    const val = row[col.resultKey];
                                                    const displayVal = col.type === 'percentage' 
                                                        ? (typeof val === 'number' ? `${val.toFixed(2)}%` : val)
                                                        : col.type === 'number'
                                                            ? (typeof val === 'number' ? val.toLocaleString() : val)
                                                            : val;
                                                    
                                                    const colorClass = col.type === 'percentage' && typeof val === 'number' 
                                                        ? (val > 0 ? 'text-[#10b981]' : val < 0 ? 'text-[#ef4444]' : 'text-[#111827]')
                                                        : 'text-[#111827]';

                                                    return (
                                                        <td key={cIdx} className={`px-3 py-2.5 text-xs font-medium ${colorClass}`}>
                                                            {displayVal || '-'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
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
                        className="fixed inset-0 top-[80px] z-[70] bg-white flex flex-col border-t border-border"
                    >
                        <div className="p-4 border-b border-border flex items-center justify-between bg-white">
                            <div className="flex items-center gap-2">
                                <span className="text-[#111827] text-sm font-bold truncate">Quantum code for {display.hardware}</span>
                            </div>
                            <button 
                                onClick={() => setViewingCode(false)}
                                className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-8 lg:p-12 custom-scrollbar bg-white">
                            <pre className="text-sm font-mono text-[#111827]/80 leading-relaxed max-w-5xl mx-auto whitespace-pre-wrap break-words">{display.qiskitCode || "# No code available"}</pre>
                        </div>
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ 
                        opacity: viewingCode ? 0 : 1, 
                        scale: viewingCode ? 0.98 : 1,
                        display: viewingCode ? 'none' : 'flex'
                    }}
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
                            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-border flex flex-col gap-1 transition-all hover:shadow-md">
                                <span className="text-[10px] text-[#111827]/60 font-semibold tracking-wide">Computational Complexity</span>
                                <span className="text-[13px] text-[#3066bb] font-bold">{display.qubitCount || 0} Qubits</span>
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
                                            Quantum code for {display.hardware}
                                        </span>
                                        <div className="h-px bg-border flex-1" />
                                        <button 
                                            onClick={() => setViewingCode(true)}
                                            className="px-4 py-1.5 rounded-lg bg-[#3066bb]/10 text-[#3066bb] text-[10px] font-bold hover:bg-[#3066bb]/20 transition-all border border-[#3066bb]/20"
                                        >
                                            View code
                                        </button>
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
                                    
                                    <DynamicResultsTable 
                                        tables={display.outputTables}
                                        assignments={display.assignmentsTable}
                                        portfolioMetrics={display.portfolioMetrics}
                                    />

                                    <div className="flex flex-col gap-6">
                                        <div className="bg-white dark:bg-card border border-border rounded-2xl p-6 shadow-sm w-full">
                                            <div className="text-[10px] text-[#111827]/60 font-bold mb-4 tracking-wide">Analysis</div>
                                            <MarkdownRenderer content={display.analysis || "No analysis available."} />
                                        </div>
                                        {display.chartData && (
                                            <div className="bg-white dark:bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[300px] w-full">
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
