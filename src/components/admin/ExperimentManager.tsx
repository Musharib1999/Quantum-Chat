"use client";

import React, { useState, useEffect } from 'react';
import { getExperiments } from '@/app/actions/experiment';
import { Beaker, Search, Eye, RefreshCw, Cpu, CheckCircle2, Clock } from 'lucide-react';
import ExperimentDetailsModal from '../ExperimentDetailsModal';

export default function ExperimentManager() {
    const [experiments, setExperiments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedExp, setSelectedExp] = useState<any | null>(null);

    const loadExperiments = async () => {
        setLoading(true);
        // Call the server action with isAdmin = true
        const exps = await getExperiments(undefined, true);
        if (exps) setExperiments(exps);
        setLoading(false);
    };

    useEffect(() => {
        loadExperiments();
    }, []);

    const filtered = experiments.filter(exp =>
        (exp.problem && exp.problem.toLowerCase().includes(search.toLowerCase())) ||
        (exp.userId && exp.userId.toLowerCase().includes(search.toLowerCase())) ||
        (exp.industry && exp.industry.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Beaker className="text-purple-500" />
                        Experiment History
                    </h2>
                    <p className="text-muted-foreground">Global logs of all quantum simulations across the platform.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search problems, users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                        />
                    </div>
                    <button
                        onClick={loadExperiments}
                        className="p-2.5 bg-secondary text-foreground rounded-xl border border-border hover:bg-card hover:border-primary transition-all shadow-sm"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-secondary/50 text-muted-foreground">
                            <tr>
                                <th className="px-6 py-4 font-medium">Experiment Name (Problem)</th>
                                <th className="px-6 py-4 font-medium">User ID</th>
                                <th className="px-6 py-4 font-medium">Hardware</th>
                                <th className="px-6 py-4 font-medium">Date & Time</th>
                                <th className="px-6 py-4 font-medium">Metrics</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCw className="animate-spin w-5 h-5" /> Syncing Global Logs...
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <Beaker size={32} className="mx-auto opacity-20 mb-3" />
                                        <p>No experiments found matching your criteria.</p>
                                    </td>
                                </tr>
                            ) : filtered.map((exp) => (
                                <tr key={exp._id} className="hover:bg-secondary/40 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-foreground">{exp.problem || "Untitled"}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                            {exp.industry} <span className="opacity-50">•</span> {exp.service}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-mono bg-secondary px-2 py-1 rounded text-muted-foreground">
                                            {exp.userId || "Guest"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary w-fit px-2 py-1 rounded-md mb-1 font-medium">
                                            <Cpu size={12} /> {exp.hardware}
                                        </div>
                                        <div className="text-xs flex items-center gap-1 text-green-500 font-medium">
                                            <CheckCircle2 size={12} /> Success
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-foreground">{new Date(exp.timestamp).toLocaleDateString()}</div>
                                        <div className="text-xs text-muted-foreground">{new Date(exp.timestamp).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 text-[11px] font-mono">
                                            <div className="flex items-center gap-1 text-muted-foreground"><Clock size={10} /> Time: ~2.4s</div>
                                            <div className="flex items-center gap-1 text-muted-foreground">Tokens: N/A</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setSelectedExp(exp)}
                                            className="px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ml-auto"
                                        >
                                            <Eye size={14} /> View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Experiment Details Modal Wrapper */}
            <div className="relative z-[100]">
                <ExperimentDetailsModal
                    experiment={selectedExp}
                    onClose={() => setSelectedExp(null)}
                    onReRun={(exp) => alert("To re-run this simulation, please access it via your personal Lab Dashboard.")}
                />
            </div>
        </div>
    );
}
