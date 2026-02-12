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
            {/* Toggle Button (Visible when closed) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-zinc-900 border border-r-0 border-white/10 p-3 rounded-l-xl shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-full' : 'translate-x-0'} hover:bg-zinc-800`}
            >
                <History className="text-zinc-400" size={20} />
            </button>

            {/* Sidebar Panel */}
            <div className={`fixed inset-y-0 right-0 z-50 w-80 bg-black/40 backdrop-blur-2xl border-l border-white/10 shadow-2xl transform transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <History size={18} className="text-purple-400" />
                        <h2 className="font-bold text-zinc-100 text-sm tracking-wide">Experiment History</h2>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ChevronRight size={18} className="text-zinc-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto h-[calc(100vh-80px)] p-4 space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
                        </div>
                    ) : experiments.length === 0 ? (
                        <div className="text-center py-10 text-zinc-600 text-xs">
                            No experiments recorded yet.
                        </div>
                    ) : (
                        experiments.map((exp) => (
                            <button
                                key={exp._id}
                                onClick={() => {
                                    onSelectExperiment(exp);
                                    // Optional: Don't auto-close, let user browse
                                }}
                                className={`w-full text-left p-4 rounded-xl border transition-all group relative overflow-hidden ${currentExperimentId === exp._id
                                        ? 'bg-purple-500/10 border-purple-500/40'
                                        : 'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-800/60'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                        {new Date(exp.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${exp.hardware.includes('real') ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>
                                        {exp.hardware}
                                    </span>
                                </div>

                                <h3 className="text-xs font-bold text-zinc-200 mb-1 line-clamp-2 group-hover:text-white transition-colors">
                                    {exp.problem}
                                </h3>

                                <div className="flex items-center gap-3 mt-3 text-zinc-500">
                                    <div className="flex items-center gap-1">
                                        <Code2 size={12} />
                                        <span className="text-[10px]">Code</span>
                                    </div>
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
                            </button>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
