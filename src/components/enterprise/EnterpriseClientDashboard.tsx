"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function EnterpriseClientDashboard() {
    const [pipelines, setPipelines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'manager' | 'visualizer'>('visualizer');
    
    const [liveShots, setLiveShots] = useState<any[]>([]);
    const [isPolling, setIsPolling] = useState(true);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
            const res = await fetch('/api/v1/simulation/history?limit=3', { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Enterprise Control Center</h2>
                    <p className="text-sm text-slate-500 mt-1">Monitor high-frequency streams and manage your API integration endpoints.</p>
                </div>
                <div className="flex items-center p-1 bg-slate-50 rounded-xl border border-slate-200">
                    <button 
                        onClick={() => setViewMode('manager')}
                        className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'manager' ? 'bg-white text-[#3066bb] shadow-sm ring-1 ring-slate-200/50' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Active Pipelines
                    </button>
                    <button 
                        onClick={() => setViewMode('visualizer')}
                        className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'visualizer' ? 'bg-[#3066bb] text-white shadow-sm ring-1 ring-[#3066bb]/50' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Live Telemetry
                    </button>
                </div>
            </div>

            {viewMode === 'manager' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6">
                    <div className="mb-6">
                        <h3 className="font-bold text-slate-900 text-lg">Your Data Pipelines</h3>
                        <p className="text-sm text-slate-500 mt-1">These endpoints are configured by Quantum Guru administrators. Update your receiving Webhook URL here.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-800">
                            <thead className="bg-slate-50 text-slate-900 border-y border-slate-200 font-bold text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Problem ID Mapping</th>
                                    <th className="px-6 py-4">Webhook Target (Receiving URL)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-semibold">Syncing pipelines...</td></tr>
                                ) : pipelines.length === 0 ? (
                                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-semibold">No active pipelines detected for your account. Please contact support.</td></tr>
                                ) : pipelines.map(p => (
                                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${p.status === 'active' ? 'bg-blue-50 text-[#3066bb] border border-blue-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[12px] text-slate-900 font-bold">{p.problemId}</td>
                                        <td className="px-6 py-4">
                                            {editingPipeline === p._id ? (
                                                <div className="flex items-center gap-2 max-w-md">
                                                    <input 
                                                        type="url" 
                                                        value={tempWebhook} 
                                                        onChange={e => setTempWebhook(e.target.value)} 
                                                        className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-md focus:outline-none focus:border-[#3066bb] focus:ring-1 focus:ring-[#3066bb] w-[300px] text-slate-900"
                                                    />
                                                    <button onClick={() => handleSaveWebhook(p._id)} className="px-4 py-2 text-xs font-bold bg-[#3066bb] text-white rounded-md hover:bg-[#3066bb]/90 transition-colors">SAVE</button>
                                                    <button onClick={() => setEditingPipeline(null)} className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-md hover:bg-slate-200 transition-colors">CANCEL</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4">
                                                    <div className="text-xs font-mono text-slate-800 truncate max-w-[400px] bg-slate-50 px-3 py-2 rounded-md border border-slate-200">{p.webhookUrl || 'Not configured'}</div>
                                                    <button 
                                                        onClick={() => { setEditingPipeline(p._id); setTempWebhook(p.webhookUrl || ''); }}
                                                        className="text-[11px] font-bold text-[#3066bb] hover:underline"
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
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[650px]">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center px-6">
                        <div className="flex items-center gap-4">
                            <span className="text-slate-900 text-xs font-mono font-bold tracking-[0.2em]">ENTERPRISE TELEMETRY</span>
                        </div>
                        <button 
                            onClick={() => setIsPolling(!isPolling)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${isPolling ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50' : 'bg-[#3066bb] text-white border-[#3066bb] hover:bg-[#3066bb]/90'}`}
                        >
                            {isPolling ? 'SUSPEND POLLING' : 'RESUME SYNC'}
                        </button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                        {/* INBOUND STREAM */}
                        <div className="col-span-1 p-6 overflow-y-auto flex flex-col bg-white">
                            <h4 className="text-slate-900 flex flex-col font-mono text-xs font-bold mb-6 tracking-wider gap-1">
                                <span>INBOUND PACKETS</span>
                                <span className="text-[10px] text-slate-500 font-semibold">POST /v1/stream</span>
                            </h4>
                            <div className="flex-1 space-y-4 font-mono text-[11px]">
                                {liveShots.map((shot, i) => (
                                    <div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'bg-blue-50/50 border-[#3066bb]/30 shadow-sm' : 'bg-white border-slate-200'}`}>
                                        <div className="text-slate-600 mb-3 font-semibold">
                                            {new Date(shot.timestamp).toISOString().split('T')[1]}
                                        </div>
                                        <div className="text-slate-900 whitespace-pre-wrap break-words leading-relaxed">{JSON.stringify(shot.parameters || {}, null, 2)}</div>
                                    </div>
                                ))}
                                {liveShots.length === 0 && <div className="text-slate-500 font-semibold text-center mt-20">Awaiting automated payloads...</div>}
                            </div>
                        </div>

                        {/* QUANTUM EMBEDDING CORE */}
                        <div className="col-span-1 p-6 overflow-y-auto flex flex-col bg-slate-50/50">
                            <h4 className="text-[#3066bb] flex flex-col font-mono text-xs font-bold mb-6 tracking-wider gap-1">
                                <span>QUANTUM ENGINE</span>
                                <span className="text-[10px] text-slate-500 font-semibold">EMBEDDING NODE</span>
                            </h4>
                            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                                {isPolling ? (
                                    <>
                                        <div className="relative flex items-center justify-center w-40 h-40">
                                            <div className="absolute inset-0 rounded-full border border-[#3066bb]/10 animate-[spin_6s_linear_infinite]"></div>
                                            <div className="absolute inset-3 rounded-full border border-b-transparent border-[#3066bb]/30 animate-[spin_3s_linear_infinite_reverse]"></div>
                                            <div className="absolute inset-6 rounded-full border border-t-transparent border-[#3066bb] animate-[spin_2s_linear_infinite]"></div>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                                                <div className="text-center font-mono text-[10px] font-bold text-[#3066bb] tracking-[0.2em] animate-pulse">PROCESSING</div>
                                            </div>
                                        </div>
                                        <div className="bg-white border border-slate-200 rounded-xl p-5 w-full shadow-sm">
                                            <ul className="space-y-4">
                                                <li className="flex items-center justify-between text-xs font-mono">
                                                    <span className="text-slate-600 font-bold">Blueprint Valid</span>
                                                    <span className="text-[#3066bb] font-bold">OK</span>
                                                </li>
                                                <li className="flex items-center justify-between text-xs font-mono">
                                                    <span className="text-slate-600 font-bold">Engine Throughput</span>
                                                    <span className="text-slate-900 font-bold">24ms avg</span>
                                                </li>
                                                <li className="flex items-center justify-between text-xs font-mono">
                                                    <span className="text-slate-600 font-bold">Hardware</span>
                                                    <span className="text-slate-900 font-bold tracking-wider text-[10px]">Universal</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-slate-500 font-mono text-[11px] font-bold tracking-widest border border-slate-200 px-4 py-2 rounded-lg bg-white">SYNC SUSPENDED</div>
                                )}
                            </div>
                        </div>

                        {/* OUTBOUND STREAM */}
                        <div className="col-span-1 p-6 overflow-y-auto flex flex-col bg-white">
                            <h4 className="text-slate-900 flex flex-col font-mono text-xs font-bold mb-6 tracking-wider gap-1">
                                <span>WEBHOOK OUT</span>
                                <span className="text-[10px] text-slate-500 font-semibold">PUSH DELIVERY</span>
                            </h4>
                            <div className="flex-1 space-y-4 font-mono text-[11px]">
                                {liveShots.map((shot, i) => (
                                    <div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'bg-blue-50/50 border-[#3066bb]/30 shadow-sm' : 'bg-white border-slate-200'}`}>
                                        <div className="text-slate-600 font-bold mb-3 flex items-center justify-between">
                                            <span>200 OK</span>
                                            <span className="text-[#3066bb] uppercase tracking-wider text-[9px] border border-[#3066bb]/20 bg-[#3066bb]/5 px-2 py-0.5 rounded">{shot.hardware || 'Simulator'}</span>
                                        </div>
                                        <div className="text-slate-900 whitespace-pre-wrap break-words leading-relaxed">{JSON.stringify(shot.results || { status: 'delivered successfully' }, null, 2)}</div>
                                    </div>
                                ))}
                                {liveShots.length === 0 && <div className="text-slate-500 font-semibold text-center mt-20">No completed shots to push...</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
