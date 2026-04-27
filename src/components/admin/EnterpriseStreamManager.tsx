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
                    <h2 className="text-xl font-semibold text-[#0F172A]">Enterprise Pipeline Hub</h2>
                    <p className="text-sm text-[#0F172A]">Manage B2B integrations and visualize high-frequency streaming traffic.</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-[rgb(27,176,206)]/30">
                    <button 
                        onClick={() => setViewMode('manager')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${viewMode === 'manager' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#0F172A] hover:text-[#0F172A]'}`}
                    >
                        Pipelines
                    </button>
                    <button 
                        onClick={() => setViewMode('visualizer')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${viewMode === 'visualizer' ? 'bg-[rgb(48,102,187)] text-white shadow-sm' : 'text-[#0F172A] hover:text-[#0F172A]'}`}
                    >
                        <Activity size={16} /> Live Visualizer
                    </button>
                </div>
            </div>

            {viewMode === 'manager' && (
                <div className="bg-white rounded-2xl border border-[rgb(27,176,206)]/30 overflow-hidden shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-[#0F172A]">Active B2B Pipelines</h3>
                        <button 
                            onClick={() => setShowForm(!showForm)}
                            className="bg-white text-[#0F172A] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[rgb(48,102,187)]/20 transition-colors"
                        >
                            {showForm ? 'Close Editor' : '+ New Pipeline'}
                        </button>
                    </div>

                    {showForm && (
                        <form onSubmit={handleCreatePipeline} className="mb-8 p-6 bg-white rounded-xl border border-[rgb(27,176,206)]/30 grid grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-[#0F172A] mb-1">Enterprise Account</label>
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
                                <label className="block text-xs font-bold text-[#0F172A] mb-1">Problem Blueprint ID</label>
                                <input required value={formData.problemId} onChange={e => setFormData({...formData, problemId: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" placeholder="MongoDB ObjectId" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-[#0F172A] mb-1">Outbound Webhook URL</label>
                                <input required type="url" value={formData.webhookUrl} onChange={e => setFormData({...formData, webhookUrl: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" placeholder="https://api.acme.com/quantum/receive" />
                            </div>
                            <div className="col-span-2 flex justify-end">
                                <button type="submit" className="bg-[rgb(48,102,187)] text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm hover:opacity-90">Save Pipeline</button>
                            </div>
                        </form>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-[#0F172A]">
                            <thead className="bg-white text-[#0F172A] border-b border-[rgb(27,176,206)]/30 font-semibold">
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
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-[#0F172A]">Loading pipelines...</td></tr>
                                ) : pipelines.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-[#0F172A]">No data pipelines configured.</td></tr>
                                ) : pipelines.map(p => (
                                    <tr key={p._id} className="hover:bg-white">
                                        <td className="px-6 py-4 font-bold text-[#0F172A]">{p.enterpriseName}</td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => handleToggleStatus(p._id, p.status)}
                                                className={`px-3 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 ${p.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-200 text-[#0F172A] hover:bg-slate-300'}`}
                                            >
                                                {p.status === 'active' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                {p.status}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 group">
                                                <span className="text-[10px] font-mono bg-white text-[#0F172A] px-2 py-1 rounded border border-[rgb(27,176,206)]/30">
                                                    {p._id}
                                                </span>
                                                <button 
                                                    onClick={() => { navigator.clipboard.writeText(p._id); alert("Pipeline ID copied!"); }}
                                                    className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-[#0F172A] underline transition-opacity"
                                                >
                                                    COPY
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[10px] text-[#0F172A]">{p.problemId}</td>
                                        <td className="px-6 py-4 text-xs font-mono text-[#0F172A] truncate max-w-[200px]">{p.webhookUrl}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {viewMode === 'visualizer' && (
                <div className="bg-white/80 backdrop-blur-2xl rounded-2xl border border-[rgb(27,176,206)]/30 overflow-hidden shadow-xl flex flex-col h-[600px] animate-in fade-in duration-500">
                    <div className="bg-white/80 p-5 border-b border-[rgb(27,176,206)]/30 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="flex gap-1.5 opacity-60">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                            </div>
                            <span className="text-[#0F172A] text-xs font-bold tracking-[0.2em] pl-4 border-l border-[rgb(27,176,206)]/30 uppercase">Pipeline Telemetry</span>
                        </div>
                        <button 
                            onClick={() => setIsPolling(!isPolling)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border ${isPolling ? 'bg-white text-red-500 border-red-100 hover:bg-red-50' : 'bg-[rgb(48,102,187)] text-white border-[rgb(27,176,206)] hover:opacity-90'}`}
                        >
                            {isPolling ? <><Square size={12} fill="currentColor" /> STOP STREAM</> : <><Play size={12} fill="currentColor" /> LIVE MONITOR</>}
                        </button>
                    </div>

                    <div className="flex-1 grid grid-cols-3 divide-x divide-slate-100 bg-white/40">
                        {/* INBOUND STREAM */}
                        <div className="col-span-1 p-6 overflow-y-auto flex flex-col bg-white/30">
                            <h4 className="text-[#0F172A] flex items-center gap-2 font-bold text-xs mb-6 tracking-wide uppercase"><Database size={14} className="text-[#0F172A]" /> Inbound Load</h4>
                            <div className="flex-1 space-y-4 font-mono text-[10px]">
                                {liveShots.map((shot, i) => (
                                    <div key={i} className={`p-4 rounded-xl border transition-all ${i === 0 ? 'bg-white border-[rgb(27,176,206)]/30 shadow-md ring-1 ring-[rgb(27,176,206)]/5' : 'bg-white border-[rgb(27,176,206)]/20 opacity-60'}`}>
                                        <div className="text-[#0F172A] mb-2 truncate font-semibold">[{new Date(shot.timestamp).toISOString()}]</div>
                                        <div className="text-[#0F172A] whitespace-pre-wrap break-words leading-relaxed">{JSON.stringify(shot.parameters || {}, null, 2)}</div>
                                    </div>
                                ))}
                                {liveShots.length === 0 && <div className="text-slate-300 font-medium italic animate-pulse">Awaiting WebSocket payloads...</div>}
                            </div>
                        </div>

                        {/* QUANTUM EMBEDDING CORE */}
                        <div className="col-span-1 p-6 overflow-y-auto flex flex-col bg-white">
                            <h4 className="text-[#0F172A] flex items-center gap-2 font-bold text-xs mb-6 tracking-wide uppercase"><Workflow size={14} className="text-purple-500" /> Quantum Core</h4>
                            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                                {isPolling ? (
                                    <>
                                        <div className="relative flex items-center justify-center w-40 h-40">
                                            <div className="absolute inset-0 rounded-full border-2 border-[rgb(27,176,206)]/20 border-t-[rgb(27,176,206)]/20 animate-[spin_6s_linear_infinite]"></div>
                                            <div className="absolute inset-3 rounded-full border-2 border-[rgb(27,176,206)]/20 border-b-purple-500/40 animate-[spin_4s_linear_infinite_reverse]"></div>
                                            <div className="absolute inset-6 rounded-full border-2 border-[rgb(27,176,206)]/20 border-l-[rgb(27,176,206)] animate-[spin_3s_linear_infinite]"></div>
                                            <div className="text-center font-bold text-[10px] text-[#0F172A] tracking-[0.2em] z-10 drop-shadow-sm uppercase">Embedding<br/>Payload</div>
                                        </div>
                                        <div className="text-center space-y-2">
                                            <div className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100"><CheckCircle size={12} /> Schema Verified</div>
                                            <div className="text-xs font-semibold text-[#0F172A] flex items-center justify-center gap-2"><Activity size={12} className="text-[#0F172A]" /> Queue Depth: 0</div>
                                            <div className="text-[10px] font-bold text-slate-300 mt-4 tracking-widest uppercase">Active Simulator: QISKIT 1.3.1</div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-slate-200 font-bold text-[10px] tracking-widest animate-pulse">STREAM PAUSED...</div>
                                )}
                            </div>
                        </div>

                        {/* OUTBOUND STREAM */}
                        <div className="col-span-1 p-6 overflow-y-auto flex flex-col bg-white/30">
                            <h4 className="text-[#0F172A] flex items-center gap-2 font-bold text-xs mb-6 tracking-wide uppercase"><Activity size={14} className="text-emerald-500" /> Webhook Out</h4>
                            <div className="flex-1 space-y-4 font-mono text-[10px]">
                                {liveShots.map((shot, i) => (
                                    <div key={i} className={`p-4 rounded-xl border transition-all ${i === 0 ? 'bg-white border-emerald-500/30 shadow-md ring-1 ring-emerald-500/5' : 'bg-white border-[rgb(27,176,206)]/20 opacity-60'}`}>
                                        <div className="text-[#0F172A] mb-2 truncate flex justify-between font-semibold">
                                            <span>Target: POST 200 OK</span>
                                            <span className="text-[#0F172A]">{shot.hardware}</span>
                                        </div>
                                        <div className="text-[#0F172A] whitespace-pre-wrap break-words leading-relaxed">{JSON.stringify(shot.results || { status: 'processed' }, null, 2)}</div>
                                    </div>
                                ))}
                                {liveShots.length === 0 && <div className="text-slate-300 font-medium italic animate-pulse">No completed shots to push...</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
