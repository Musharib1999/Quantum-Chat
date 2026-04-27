"use client";

import React, { useState, useEffect } from 'react';
import { getExperiments } from '@/app/actions/experiment';
import ExperimentDetailsModal from '../ExperimentDetailsModal';

export default function ExperimentManager() {
    const [experiments, setExperiments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState<'All' | 'Web' | 'API'>('All');
    const [selectedExp, setSelectedExp] = useState<any | null>(null);

    const loadExperiments = async () => {
        setLoading(true);
        const exps = await getExperiments(undefined, true);
        if (exps) setExperiments(exps);
        setLoading(false);
    };

    useEffect(() => {
        loadExperiments();
    }, []);

    const filtered = experiments.filter(exp => {
        const matchesSearch = (exp.problem && exp.problem.toLowerCase().includes(search.toLowerCase())) ||
            (exp.userId && exp.userId.toLowerCase().includes(search.toLowerCase())) ||
            (exp.industry && exp.industry.toLowerCase().includes(search.toLowerCase()));
        
        const matchesSource = sourceFilter === 'All' || exp.source === sourceFilter;
        
        return matchesSearch && matchesSource;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">Shot Log Viewer</h2>
                    <p className="text-sm text-slate-500">Global logs of all quantum simulations across the platform.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select 
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value as any)}
                        className="px-3 py-2 bg-white border border-[#3066bb]/30 rounded-xl focus:ring-1 focus:ring-[#3066bb] outline-none text-xs font-semibold text-slate-600"
                    >
                        <option value="All">All Sources</option>
                        <option value="Web">Web Dashboard</option>
                        <option value="API">External API</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Search problems, users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 md:w-64 px-4 py-2 bg-white border border-[#3066bb]/30 rounded-xl focus:ring-1 focus:ring-[#3066bb] outline-none text-sm text-slate-900"
                    />
                    <button
                        onClick={loadExperiments}
                        className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold text-sm transition-colors"
                    >
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#3066bb]/30 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-[#3066bb]/5 text-slate-900 border-b border-[#3066bb]/30 font-semibold">
                            <tr>
                                <th className="px-6 py-4">Shot (Problem)</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Hardware</th>
                                <th className="px-6 py-4">Date & Time</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        Syncing global logs...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No shots found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((exp) => (
                                    <tr key={exp._id} className="hover:bg-[#3066bb]/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-900 line-clamp-1">{exp.problem || "Untitled"}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                <span>{exp.industry} • {exp.service}</span>
                                                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${exp.source === 'API' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-[#3066bb]/5 text-[#3066bb] border border-[#3066bb]/20'}`}>
                                                    {exp.source || 'Web'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-[10px] font-mono bg-[#3066bb]/5 px-1.5 py-0.5 rounded border border-[#3066bb]/30 text-slate-500">
                                                {exp.userId || "Guest"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-slate-900">{exp.hardware}</span>
                                                <span className="text-[10px] text-green-600 font-bold">Success</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-slate-900 text-xs">{new Date(exp.timestamp).toLocaleDateString()}</div>
                                            <div className="text-[10px] text-slate-400">{new Date(exp.timestamp).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedExp(exp)}
                                                className="text-[#3066bb] hover:underline font-semibold text-xs transition-colors"
                                            >
                                                View details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
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
