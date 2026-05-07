"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

interface EnterpriseClientDashboardProps {
    viewMode: 'datapoints' | 'telemetry' | 'pipelines';
}

export default function EnterpriseClientDashboard({ viewMode }: EnterpriseClientDashboardProps) {
    const { user } = useAuth();
    const [pipelines, setPipelines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [liveShots, setLiveShots] = useState<any[]>([]);
    const [isPolling, setIsPolling] = useState(true);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [editingPipeline, setEditingPipeline] = useState<string | null>(null);
    const [tempWebhook, setTempWebhook] = useState('');

    const [metrics, setMetrics] = useState({
        totalRequests: 0,
        avgExecutionTime: 0,
        requestQueue: 0,
        successRate: 100,
        monthlyLimit: 10000
    });

    useEffect(() => {
        fetchPipelines();
        return () => stopPolling();
    }, []);

    useEffect(() => {
        if (viewMode === 'telemetry' && isPolling) {
            startPolling();
        } else {
            stopPolling();
        }
    }, [viewMode, isPolling]);

    const getAuthHeaders = () => {
        const key = user?.apiKey || '';
        return { 
            'Content-Type': 'application/json',
            'X-API-Key': key,
            'Authorization': `Bearer ${key}`
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
            const res = await fetch('/api/v1/simulation/history?limit=10', { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                const streamShots = (data.data || []).filter((s:any) => s.source === 'API' || s.source === 'Enterprise-Stream');
                setLiveShots(streamShots);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchMetrics = async () => {
        try {
            const res = await fetch('/api/v1/enterprise/metrics', { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                setMetrics(data.metrics);
            }
        } catch (e) {
            console.error("Failed to fetch metrics:", e);
        }
    };

    const startPolling = () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        fetchLatestShots();
        fetchMetrics();
        pollIntervalRef.current = setInterval(() => {
            fetchLatestShots();
            fetchMetrics();
        }, 15000); // 15s polling for live feel
    };

    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    const handleRestartStream = () => {
        setLiveShots([]);
        fetchLatestShots();
        fetchMetrics();
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

    const handleToggleStatus = async (pipelineId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'active' ? 'draft' : 'active';
            const res = await fetch('/api/v1/enterprise/pipelines', {
                method: 'PUT',
                headers: getAuthHeaders(),
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

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                        {viewMode === 'datapoints' ? 'Metrics & Analytics' : viewMode === 'telemetry' ? 'Live Stream Telemetry' : 'Pipeline Configuration'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {viewMode === 'datapoints' ? 'Track your API utilization, webhook delivery success, and queue health.' : viewMode === 'telemetry' ? 'Monitor high-frequency streams bypassing through your integration endpoints.' : 'Manage your active mathematical mappings and automated webhook targets.'}
                    </p>
                </div>
            </div>

            {/* DATAPOINTS TAB */}
            {viewMode === 'datapoints' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <h5 className="text-xs font-bold text-slate-500 tracking-widest mb-4 uppercase">Executed Requests</h5>
                    <div>
                        <div className="text-3xl font-bold text-slate-900">{metrics.totalRequests.toLocaleString()}</div>
                        <div className="text-xs font-semibold text-[#3066bb] mt-2">{metrics.monthlyLimit.toLocaleString()} monthly limit</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <h5 className="text-xs font-bold text-slate-500 tracking-widest mb-4 uppercase">Request Queue</h5>
                    <div>
                        <div className="text-3xl font-bold text-slate-900">{metrics.requestQueue}</div>
                        <div className="text-xs font-semibold text-orange-500 mt-2">Active backlog</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <h5 className="text-xs font-bold text-slate-500 tracking-widest mb-4 uppercase">Average Execution</h5>
                    <div>
                        <div className="text-3xl font-bold text-slate-900">{metrics.avgExecutionTime}<span className="text-lg text-slate-400 ml-1">ms</span></div>
                        <div className="text-xs font-semibold text-green-500 mt-2">Latency per solve</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#3066bb]/5 rounded-bl-full border-b border-l border-[#3066bb]/10"></div>
                    <h5 className="text-xs font-bold text-slate-500 tracking-widest mb-4 relative z-10 uppercase">Success Rate</h5>
                    <div className="relative z-10">
                        <div className="text-3xl font-bold text-slate-900">{metrics.successRate}<span className="text-lg text-slate-400 ml-1">%</span></div>
                        <div className="text-xs font-semibold text-[#3066bb] mt-2">Reliability threshold</div>
                    </div>
                </div>
            </div>
            )}

            {/* PIPELINES TAB */}
            {viewMode === 'pipelines' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="mb-6">
                        <h3 className="font-bold text-slate-900 text-lg">Your Data Pipelines</h3>
                        <p className="text-sm text-slate-500 mt-1">These endpoints are configured by Quantum Guru administrators. Update your receiving Webhook URL here.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-800">
                            <thead className="bg-slate-50 text-slate-900 border-y border-slate-200 font-bold text-xs tracking-wide">
                                <tr>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Pipeline ID (Integration Key)</th>
                                    <th className="px-6 py-4">Problem Mapping</th>
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
                                            <button 
                                                onClick={() => handleToggleStatus(p._id, p.status)}
                                                className={`px-3 py-1 rounded-md text-[11px] font-bold tracking-wider transition-all border ${p.status === 'active' ? 'bg-blue-50 text-[#3066bb] border-blue-100 hover:bg-blue-100' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
                                            >
                                                {p.status}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 group">
                                                <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">
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
                                        <td className="px-6 py-4 font-sans text-[12px] text-slate-900 font-bold">{p.problemId}</td>
                                        <td className="px-6 py-4">
                                            {editingPipeline === p._id ? (
                                                <div className="flex items-center gap-2 max-w-md">
                                                    <input 
                                                        type="url" 
                                                        value={tempWebhook} 
                                                        onChange={e => setTempWebhook(e.target.value)} 
                                                        className="flex-1 px-3 py-2 text-xs font-sans border border-slate-300 rounded-md focus:outline-none focus:border-[#3066bb] focus:ring-1 focus:ring-[#3066bb] w-[300px] text-slate-900"
                                                    />
                                                    <button onClick={() => handleSaveWebhook(p._id)} className="px-4 py-2 text-xs font-bold bg-[#3066bb] text-white rounded-md hover:bg-[#3066bb]/90 transition-colors">SAVE</button>
                                                    <button onClick={() => setEditingPipeline(null)} className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-md hover:bg-slate-200 transition-colors">CANCEL</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4">
                                                    <div className="text-xs font-sans text-slate-800 truncate max-w-[400px] bg-slate-50 px-3 py-2 rounded-md border border-slate-200">{p.webhookUrl || 'Not configured'}</div>
                                                    <button 
                                                        onClick={() => { setEditingPipeline(p._id); setTempWebhook(p.webhookUrl || ''); }}
                                                        className="text-[11px] font-bold text-[#3066bb] hover:underline"
                                                    >
                                                        Edit Route
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

            {/* TELEMETRY TAB */}
            {viewMode === 'telemetry' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[650px] animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center px-6">
                        <div className="flex items-center gap-4">
                            <span className="text-slate-900 text-xs font-sans font-bold tracking-[0.2em]">Enterprise Telemetry</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleRestartStream}
                                className="px-4 py-2 rounded-lg text-xs font-bold transition-all border bg-white text-[#3066bb] border-[#3066bb]/20 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                                Restart Stream
                            </button>
                            <button 
                                onClick={() => setIsPolling(!isPolling)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${isPolling ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50' : 'bg-[#3066bb] text-white border-[#3066bb] hover:bg-[#3066bb]/90'}`}
                            >
                                {isPolling ? 'Pause Pipeline' : 'Resume Pipeline'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 min-h-0">
                        {/* INBOUND STREAM */}
                        <div className="col-span-1 p-6 overflow-hidden flex flex-col bg-white min-h-0">
                            <h4 className="text-slate-900 flex flex-col font-sans text-xs font-bold mb-6 tracking-wider gap-1">
                                <span>Inbound Packets</span>
                                <span className="text-[10px] text-slate-500 font-semibold">Post /v1/stream</span>
                            </h4>
                            <div className="flex-1 space-y-4 font-sans text-[11px] overflow-y-auto pr-2 custom-scrollbar">
                                {liveShots.filter((s, idx, self) => 
                                    idx === self.findIndex((t) => (
                                        (t.parameters?.call?.call_id && t.parameters?.call?.call_id === s.parameters?.call?.call_id) || 
                                        (!t.parameters?.call?.call_id && t.id === s.id)
                                    ))
                                ).map((shot, i) => (
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

                        {/* KPI METRICS BLOCK */}
                        <div className="col-span-1 p-8 overflow-y-auto flex flex-col bg-slate-50/30 backdrop-blur-md">
                            <h4 className="text-[#3066bb] flex flex-col font-sans text-xs font-bold mb-8 tracking-wider gap-1 uppercase">
                                <span>Optimization KPI</span>
                                <span className="text-[10px] text-slate-400 font-semibold normal-case">Real-time pipeline health</span>
                            </h4>
                            
                            <div className="flex-1 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/60 p-4 rounded-2xl border border-slate-200/50 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Inbound Packets</p>
                                        <p className="text-xl font-bold text-slate-900">{metrics.totalRequests}</p>
                                    </div>
                                    <div className="bg-white/60 p-4 rounded-2xl border border-slate-200/50 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Webhook Pushes</p>
                                        <p className="text-xl font-bold text-slate-900">{liveShots.length}</p>
                                    </div>
                                </div>

                                <div className="bg-white/80 p-5 rounded-2xl border border-[#3066bb]/10 shadow-md relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#3066bb]/5 rounded-bl-full -mr-8 -mt-8"></div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 relative z-10">Success Rate</p>
                                    <div className="flex items-end gap-2 relative z-10">
                                        <span className="text-3xl font-black text-slate-900 leading-none">{metrics.successRate}%</span>
                                        <span className="text-[10px] font-bold text-green-500 mb-1">Operational</span>
                                    </div>
                                    <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#3066bb]" style={{ width: `${metrics.successRate}%` }}></div>
                                    </div>
                                </div>

                                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Avg Execution Latency</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full border-2 border-[#3066bb] border-t-transparent animate-spin"></div>
                                        <div>
                                            <span className="text-2xl font-bold text-white leading-none">{metrics.avgExecutionTime}</span>
                                            <span className="text-xs font-bold text-slate-400 ml-1">ms</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200/50">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                        <span>Engine Status</span>
                                        <span className="text-emerald-500 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Active
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* OUTBOUND STREAM */}
                        <div className="col-span-1 p-6 overflow-hidden flex flex-col bg-white min-h-0">
                            <h4 className="text-slate-900 flex flex-col font-mono text-xs font-bold mb-6 tracking-wider gap-1">
                                <span>Webhook Out</span>
                                <span className="text-[10px] text-slate-500 font-semibold">Push Delivery</span>
                            </h4>
                            <div className="flex-1 space-y-4 font-mono text-[11px] overflow-y-auto pr-2 custom-scrollbar">
                                {liveShots.map((shot, i) => (
                                    <div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'bg-blue-50/50 border-[#3066bb]/30 shadow-sm' : 'bg-white border-slate-200'}`}>
                                        <div className="text-slate-600 font-bold mb-3 flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <span>200 OK</span>
                                                <span className="text-[#3066bb] uppercase tracking-wider text-[9px] border border-[#3066bb]/20 bg-[#3066bb]/5 px-2 py-0.5 rounded">{shot.hardware || 'Simulator'}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-medium bg-white px-2 py-1 rounded border border-slate-100 w-fit">
                                                Call ID: <span className="text-slate-800 font-bold">{shot.parameters?.call?.call_id || shot.parameters?.callId || shot.parameters?.id || 'N/A'}</span>
                                            </div>
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
