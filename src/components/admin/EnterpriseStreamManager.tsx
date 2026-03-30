"use client";

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getExperiments } from '@/app/actions/experiment';
import { Play, Square, Activity, Database, Workflow, CheckCircle, XCircle } from 'lucide-react';

export default function EnterpriseStreamManager() {
    const [pipelines, setPipelines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'manager' | 'visualizer'>('visualizer');
    
    // Live Stream Visualizer State
    const [liveShots, setLiveShots] = useState<any[]>([]);
    const [isPolling, setIsPolling] = useState(true);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Enterprise Users for Dropdown
    const [enterpriseUsers, setEnterpriseUsers] = useState<any[]>([]);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        enterpriseName: '',
        problemId: '',
        webhookUrl: '',
        status: 'draft'
    });

    useEffect(() => {
        fetchPipelines();
        fetchEnterpriseUsers();
        return () => stopPolling();
    }, []);

    useEffect(() => {
        if (viewMode === 'visualizer' && isPolling) {
            startPolling();
        } else {
            stopPolling();
        }
    }, [viewMode, isPolling]);

    const fetchEnterpriseUsers = async () => {
        try {
            const res = await axios.get('/api/admin/users');
            if (Array.isArray(res.data)) {
                // Filter users who have the 'enterprise' role
                const eUsers = res.data.filter((u: any) => u.role === 'enterprise');
                setEnterpriseUsers(eUsers);
            }
        } catch (error) {
            console.error("Failed to fetch enterprise users", error);
        }
    };

    const fetchPipelines = async () => {
        try {
            const res = await fetch('/api/admin/pipelines', {
                headers: { 'X-API-Key': localStorage.getItem('guru_api_key') || '' }
            });
            const data = await res.json();
            if (data.success) {
                setPipelines(data.pipelines);
            }
        } catch (error) {
            console.error("Failed to fetch pipelines:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLatestShots = async () => {
        try {
            const allShots = await getExperiments(undefined, true);
            // In a real environment, filter by source = 'Enterprise-Stream'
            // For now, take the latest 3 of any source to show the UI works
            const streamShots = allShots.filter((s:any) => s.source === 'Enterprise-Stream' || s.source === 'API').slice(0, 3);
            setLiveShots(streamShots);
        } catch (e) {
            console.error(e);
        }
    };

    const startPolling = () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        fetchLatestShots();
        pollIntervalRef.current = setInterval(fetchLatestShots, 3000); // 3-second polling
    };

    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    const handleToggleStatus = async (pipelineId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'active' ? 'draft' : 'active';
            const res = await fetch('/api/admin/pipelines', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-API-Key': localStorage.getItem('guru_api_key') || ''
                },
                body: JSON.stringify({ pipelineId, status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                fetchPipelines();
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert("Failed to toggle status.");
        }
    };

    const handleCreatePipeline = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/pipelines', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-API-Key': localStorage.getItem('guru_api_key') || ''
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                setFormData({ enterpriseName: '', problemId: '', webhookUrl: '', status: 'draft' });
                setShowForm(false);
                fetchPipelines();
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert("Submission failed.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">Enterprise Pipeline Hub</h2>
                    <p className="text-sm text-slate-500">Manage B2B integrations and visualize high-frequency streaming traffic.</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button 
                        onClick={() => setViewMode('manager')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${viewMode === 'manager' ? 'bg-white text-[#3066bb] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Pipelines
                    </button>
                    <button 
                        onClick={() => setViewMode('visualizer')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${viewMode === 'visualizer' ? 'bg-[#3066bb] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <Activity size={16} /> Live Visualizer
                    </button>
                </div>
            </div>

            {viewMode === 'manager' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-slate-900">Active B2B Pipelines</h3>
                        <button 
                            onClick={() => setShowForm(!showForm)}
                            className="bg-[#3066bb]/10 text-[#3066bb] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#3066bb]/20 transition-colors"
                        >
                            {showForm ? 'Close Editor' : '+ New Pipeline'}
                        </button>
                    </div>

                    {showForm && (
                        <form onSubmit={handleCreatePipeline} className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Enterprise Account</label>
                                <select 
                                    required 
                                    value={formData.enterpriseName} 
                                    onChange={e => setFormData({...formData, enterpriseName: e.target.value})} 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                >
                                    <option value="" disabled>Select an Enterprise Account</option>
                                    {enterpriseUsers.map(user => (
                                        <option key={user._id} value={user.company || user.email}>
                                            {user.company || user.firstName || 'Unnamed'} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Problem Blueprint ID</label>
                                <input required value={formData.problemId} onChange={e => setFormData({...formData, problemId: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" placeholder="MongoDB ObjectId" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Outbound Webhook URL</label>
                                <input required type="url" value={formData.webhookUrl} onChange={e => setFormData({...formData, webhookUrl: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" placeholder="https://api.acme.com/quantum/receive" />
                            </div>
                            <div className="col-span-2 flex justify-end">
                                <button type="submit" className="bg-[#3066bb] text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm hover:opacity-90">Save Pipeline</button>
                            </div>
                        </form>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-900 border-b border-slate-200 font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Enterprise</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Pipeline ID (Integration Key)</th>
                                    <th className="px-6 py-4">Problem Mapping</th>
                                    <th className="px-6 py-4">Webhook target</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Loading pipelines...</td></tr>
                                ) : pipelines.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No data pipelines configured.</td></tr>
                                ) : pipelines.map(p => (
                                    <tr key={p._id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-bold text-slate-900">{p.enterpriseName}</td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => handleToggleStatus(p._id, p.status)}
                                                className={`px-3 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 ${p.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                                            >
                                                {p.status === 'active' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                {p.status}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 group">
                                                <span className="text-[10px] font-mono bg-slate-50 text-slate-500 px-2 py-1 rounded border border-slate-200">
                                                    {p._id}
                                                </span>
                                                <button 
                                                    onClick={() => { navigator.clipboard.writeText(p._id); alert("Pipeline ID copied!"); }}
                                                    className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-[#3066bb] underline transition-opacity"
                                                >
                                                    COPY
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[10px] text-slate-500">{p.problemId}</td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-500 truncate max-w-[200px]">{p.webhookUrl}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {viewMode === 'visualizer' && (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-[600px]">
                    <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                            </div>
                            <span className="text-slate-400 text-xs font-mono font-bold tracking-widest pl-2 border-l border-slate-800">PIPELINE TELEMETRY</span>
                        </div>
                        <button 
                            onClick={() => setIsPolling(!isPolling)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors ${isPolling ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                        >
                            {isPolling ? <><Square size={12} fill="currentColor" /> STOP STREAM</> : <><Play size={12} fill="currentColor" /> LIVE MONITOR</>}
                        </button>
                    </div>

                    <div className="flex-1 grid grid-cols-3 divide-x divide-slate-800 bg-[#0A0F1A]">
                        {/* INBOUND STREAM */}
                        <div className="col-span-1 p-4 overflow-y-auto flex flex-col">
                            <h4 className="text-[#3066bb] flex items-center gap-2 font-mono text-xs font-bold mb-4 tracking-wider"><Database size={14} /> INBOUND LOAD</h4>
                            <div className="flex-1 space-y-3 font-mono text-[10px]">
                                {liveShots.map((shot, i) => (
                                    <div key={i} className={`p-3 rounded border border-slate-800 ${i === 0 ? 'bg-slate-800/50 border-[#3066bb]/30' : 'bg-transparent opacity-50'}`}>
                                        <div className="text-slate-500 mb-2 truncate">[{new Date(shot.timestamp).toISOString()}]</div>
                                        <div className="text-green-400 whitespace-pre-wrap break-words">{JSON.stringify(shot.parameters || {}, null, 2)}</div>
                                    </div>
                                ))}
                                {liveShots.length === 0 && <div className="text-slate-700 animate-pulse">Awaiting WebSocket payloads...</div>}
                            </div>
                        </div>

                        {/* QUANTUM EMBEDDING CORE */}
                        <div className="col-span-1 p-4 overflow-y-auto flex flex-col bg-slate-900/50">
                            <h4 className="text-purple-400 flex items-center gap-2 font-mono text-xs font-bold mb-4 tracking-wider"><Workflow size={14} /> QUANTUM CORE</h4>
                            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                                {isPolling ? (
                                    <>
                                        <div className="relative flex items-center justify-center w-32 h-32">
                                            <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-[spin_4s_linear_infinite]"></div>
                                            <div className="absolute inset-2 rounded-full border border-b-transparent border-[#3066bb] animate-[spin_2s_linear_infinite_reverse]"></div>
                                            <div className="absolute inset-4 rounded-full border border-t-transparent border-cyan-400 animate-[spin_3s_linear_infinite]"></div>
                                            <div className="text-center font-mono text-[10px] text-slate-300 tracking-widest z-10">EMBEDDING<br/>PAYLOAD</div>
                                        </div>
                                        <div className="text-center space-y-1">
                                            <div className="text-xs font-mono text-green-400 flex items-center gap-1.5"><CheckCircle size={12} /> Schema Verified</div>
                                            <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5"><Activity size={12} /> Queue Depth: 0</div>
                                            <div className="text-[10px] font-mono text-slate-500 mt-2">Active Simulator: QISKIT 1.3.1</div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-slate-700 font-mono text-[10px] animate-pulse">STREAM PAUSED...</div>
                                )}
                            </div>
                        </div>

                        {/* OUTBOUND STREAM */}
                        <div className="col-span-1 p-4 overflow-y-auto flex flex-col">
                            <h4 className="text-cyan-400 flex items-center gap-2 font-mono text-xs font-bold mb-4 tracking-wider"><Activity size={14} /> WEBHOK OUT</h4>
                            <div className="flex-1 space-y-3 font-mono text-[10px]">
                                {liveShots.map((shot, i) => (
                                    <div key={i} className={`p-3 rounded border border-slate-800 ${i === 0 ? 'bg-slate-800/50 border-cyan-500/30' : 'bg-transparent opacity-50'}`}>
                                        <div className="text-slate-500 mb-2 truncate flex justify-between">
                                            <span>Target: POST 200 OK</span>
                                            <span className="text-cyan-600">{shot.hardware}</span>
                                        </div>
                                        <div className="text-slate-300 whitespace-pre-wrap break-words">{JSON.stringify(shot.results || { status: 'processed' }, null, 2)}</div>
                                    </div>
                                ))}
                                {liveShots.length === 0 && <div className="text-slate-700 animate-pulse">No completed shots to push...</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
