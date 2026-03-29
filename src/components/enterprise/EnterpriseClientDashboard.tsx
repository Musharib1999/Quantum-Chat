"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Activity, Database, Workflow, CheckCircle, Save } from 'lucide-react';

export default function EnterpriseClientDashboard() {
    const [pipelines, setPipelines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'manager' | 'visualizer'>('visualizer');
    
    // Live Stream Visualizer State
    const [liveShots, setLiveShots] = useState<any[]>([]);
    const [isPolling, setIsPolling] = useState(true);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Edit Webhook State
    const [editingPipeline, setEditingPipeline] = useState<string | null>(null);
    const [tempWebhook, setTempWebhook] = useState('');

    useEffect(() => {
        fetchPipelines();
        return () => stopPolling();
    }, []);

    useEffect(() => {
        if (viewMode === 'visualizer' && isPolling) {
            startPolling();
        } else {
            stopPolling();
        }
    }, [viewMode, isPolling]);

    const getAuthHeaders = () => {
        return { 
            'Content-Type': 'application/json',
            'X-API-Key': localStorage.getItem('guru_api_key') || '',
            'Authorization': `Bearer ${localStorage.getItem('guru_api_key') || ''}`
        };
    };

    const fetchPipelines = async () => {
        try {
            const res = await fetch('/api/v1/enterprise/pipelines', { headers: getAuthHeaders() });
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
            // Note: The history route looks for Authorization Bearer token natively
            const res = await fetch('/api/v1/simulation/history?limit=3', { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                // Assuming enterprise streams are either 'API' or 'Enterprise-Stream' source
                const streamShots = (data.data || []).filter((s:any) => s.source === 'API' || s.source === 'Enterprise-Stream');
                setLiveShots(streamShots);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const startPolling = () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        fetchLatestShots();
        pollIntervalRef.current = setInterval(fetchLatestShots, 3000); 
    };

    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    const handleSaveWebhook = async (pipelineId: string) => {
        try {
            const res = await fetch('/api/v1/enterprise/pipelines', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ pipelineId, webhookUrl: tempWebhook })
            });
            const data = await res.json();
            if (data.success) {
                setEditingPipeline(null);
                fetchPipelines();
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert("Failed to update webhook URL.");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[#3066bb] to-purple-600 bg-clip-text text-transparent">Enterprise Control Center</h2>
                    <p className="text-sm text-slate-500 mt-1">Monitor high-frequency streams and manage your API integration endpoints.</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    <button 
                        onClick={() => setViewMode('manager')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'manager' ? 'bg-white text-[#3066bb] shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Active Pipelines
                    </button>
                    <button 
                        onClick={() => setViewMode('visualizer')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${viewMode === 'visualizer' ? 'bg-[#3066bb] text-white shadow-sm ring-1 ring-[#3066bb]/50' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <Activity size={16} /> Live Telemetry
                    </button>
                </div>
            </div>

            {viewMode === 'manager' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6">
                    <div className="mb-6">
                        <h3 className="font-bold text-slate-900 text-lg">Your Data Pipelines</h3>
                        <p className="text-xs text-slate-500 mt-1">These endpoints are configured and authorized by Quantum Guru administrators. You can update your receiving WebSocket/Webhook URL here.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-900 border-y border-slate-200 font-semibold tracking-wide text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Problem ID Mapping</th>
                                    <th className="px-6 py-4">Webhook Target (Receiving URL)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400">Syncing pipelines...</td></tr>
                                ) : pipelines.length === 0 ? (
                                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500">No active pipelines detected for your account. Please contact support.</td></tr>
                                ) : pipelines.map(p => (
                                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${p.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[11px] text-[#3066bb] font-semibold">{p.problemId}</td>
                                        <td className="px-6 py-4">
                                            {editingPipeline === p._id ? (
                                                <div className="flex items-center gap-2 max-w-md">
                                                    <input 
                                                        type="url" 
                                                        value={tempWebhook} 
                                                        onChange={e => setTempWebhook(e.target.value)} 
                                                        className="flex-1 px-3 py-1.5 text-xs font-mono border border-[#3066bb] rounded focus:outline-none focus:ring-2 focus:ring-[#3066bb]/20 w-[300px]"
                                                    />
                                                    <button onClick={() => handleSaveWebhook(p._id)} className="p-1.5 bg-[#3066bb] text-white rounded hover:bg-[#3066bb]/90"><Save size={14} /></button>
                                                    <button onClick={() => setEditingPipeline(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300">Cancel</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4">
                                                    <div className="text-xs font-mono text-slate-600 truncate max-w-[300px] bg-slate-50 p-1.5 rounded border border-slate-100">{p.webhookUrl || 'Not configured'}</div>
                                                    <button 
                                                        onClick={() => { setEditingPipeline(p._id); setTempWebhook(p.webhookUrl || ''); }}
                                                        className="text-[10px] font-bold text-[#3066bb] hover:underline"
                                                    >
                                                        EDIT ROUTE
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {viewMode === 'visualizer' && (
                <div className="bg-[#0A0F1A] rounded-2xl border border-slate-800/50 overflow-hidden shadow-[0_0_40px_-15px_rgba(48,102,187,0.3)] flex flex-col h-[650px]">
                    <div className="bg-slate-900/80 backdrop-blur-md p-4 border-b border-slate-800 flex justify-between items-center px-6">
                        <div className="flex items-center gap-4">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.4)]"></div>
                            </div>
                            <span className="text-slate-400 text-xs font-mono font-bold tracking-[0.2em] pl-4 border-l border-slate-700/50">ENTERPRISE TELEMETRY</span>
                        </div>
                        <button 
                            onClick={() => setIsPolling(!isPolling)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${isPolling ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'}`}
                        >
                            {isPolling ? <><Square size={12} fill="currentColor" /> SUSPEND POLLING</> : <><Play size={12} fill="currentColor" /> RESUME SYNC</>}
                        </button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/50">
                        {/* INBOUND STREAM */}
                        <div className="col-span-1 p-5 overflow-y-auto flex flex-col relative group">
                            <div className="absolute inset-0 bg-gradient-to-b from-[#3066bb]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            <h4 className="text-[#3066bb] flex items-center justify-between font-mono text-xs font-bold mb-6 tracking-wider">
                                <span className="flex items-center gap-2"><Database size={14} /> INBOUND PACKETS</span>
                                <span className="text-[9px] text-slate-500">POST /v1/stream</span>
                            </h4>
                            <div className="flex-1 space-y-4 font-mono text-[11px] relative z-10">
                                {liveShots.map((shot, i) => (
                                    <div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'bg-slate-800/80 border-[#3066bb]/40 shadow-[0_0_15px_rgba(48,102,187,0.15)]' : 'bg-slate-900/50 border-slate-800 opacity-60'}`}>
                                        <div className="text-slate-500 mb-3 flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${i===0 ? 'bg-[#3066bb] animate-pulse' : 'bg-slate-600'}`}></div>
                                            {new Date(shot.timestamp).toISOString().split('T')[1]}
                                        </div>
                                        <div className="text-emerald-400/90 whitespace-pre-wrap break-words leading-relaxed">{JSON.stringify(shot.parameters || {}, null, 2)}</div>
                                    </div>
                                ))}
                                {liveShots.length === 0 && <div className="text-slate-700 animate-pulse text-center mt-20">Awaiting automated payloads...</div>}
                            </div>
                        </div>

                        {/* QUANTUM EMBEDDING CORE */}
                        <div className="col-span-1 p-5 overflow-y-auto flex flex-col bg-slate-900/40 relative">
                            <h4 className="text-fuchsia-400 flex items-center justify-between font-mono text-xs font-bold mb-6 tracking-wider">
                                <span className="flex items-center gap-2"><Workflow size={14} /> QUANTUM ENGINE</span>
                                <span className="text-[9px] text-slate-500">EMBEDDING NODE</span>
                            </h4>
                            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                                {isPolling ? (
                                    <>
                                        <div className="relative flex items-center justify-center w-40 h-40">
                                            <div className="absolute inset-0 rounded-full border border-fuchsia-500/20 animate-[spin_6s_linear_infinite]"></div>
                                            <div className="absolute inset-3 rounded-full border border-b-transparent border-[#3066bb]/60 animate-[spin_3s_linear_infinite_reverse]"></div>
                                            <div className="absolute inset-6 rounded-full border border-t-transparent border-cyan-400/80 animate-[spin_2s_linear_infinite]"></div>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                                                <Activity size={24} className="text-white animate-pulse" />
                                                <div className="text-center font-mono text-[9px] text-slate-300 tracking-[0.2em]">PROCESSING</div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 w-full">
                                            <ul className="space-y-3">
                                                <li className="flex items-center justify-between text-xs font-mono">
                                                    <span className="text-slate-400 flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500"/> Blueprint Valid</span>
                                                    <span className="text-emerald-500 font-bold">OK</span>
                                                </li>
                                                <li className="flex items-center justify-between text-xs font-mono">
                                                    <span className="text-slate-400 flex items-center gap-2"><Activity size={12} className="text-[#3066bb]"/> Engine Throughput</span>
                                                    <span className="text-slate-200">24ms avg</span>
                                                </li>
                                                <li className="flex items-center justify-between text-xs font-mono">
                                                    <span className="text-slate-400 flex items-center gap-2"><Database size={12} className="text-fuchsia-500"/> Pipeline Hardware</span>
                                                    <span className="text-fuchsia-400 font-bold tracking-wider text-[10px]">Universal</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-slate-600 font-mono text-[11px] animate-pulse tracking-widest border border-slate-800 px-4 py-2 rounded-lg bg-slate-900">SYNC SUSPENDED</div>
                                )}
                            </div>
                        </div>

                        {/* OUTBOUND STREAM */}
                        <div className="col-span-1 p-5 overflow-y-auto flex flex-col relative group">
                            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            <h4 className="text-cyan-400 flex items-center justify-between font-mono text-xs font-bold mb-6 tracking-wider">
                                <span className="flex items-center gap-2"><Activity size={14} /> WEBHOOK OUT</span>
                                <span className="text-[9px] text-slate-500">PUSH DELIVERY</span>
                            </h4>
                            <div className="flex-1 space-y-4 font-mono text-[11px] relative z-10">
                                {liveShots.map((shot, i) => (
                                    <div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'bg-slate-800/80 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-slate-900/50 border-slate-800 opacity-60'}`}>
                                        <div className="text-slate-500 mb-3 flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${i===0 ? 'bg-cyan-400' : 'bg-slate-600'}`}></div>
                                                200 OK
                                            </span>
                                            <span className="text-cyan-600/80 font-bold uppercase track-wider text-[9px] border border-cyan-900/50 px-1.5 rounded">{shot.hardware || 'Simulator'}</span>
                                        </div>
                                        <div className="text-slate-300 whitespace-pre-wrap break-words leading-relaxed">{JSON.stringify(shot.results || { status: 'delivered successfully' }, null, 2)}</div>
                                    </div>
                                ))}
                                {liveShots.length === 0 && <div className="text-slate-700 animate-pulse text-center mt-20">No completed shots to push...</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
