"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, RefreshCw, Layers, ShieldAlert, Cpu } from 'lucide-react';

interface LogEntry {
    _id: string;
    service: 'frontend' | 'backend' | 'engine';
    logType: 'api_request' | 'model_engagement' | 'info' | 'error';
    userId?: string;
    message: string;
    metadata?: any;
    timestamp: string;
}

export default function SystemLogViewer() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [selectedService, setSelectedService] = useState<string>('all');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [isAutoRefresh, setIsAutoRefresh] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    // Track the timestamp of the newest log we have seen so we only
    // fetch NEW entries on each poll instead of the full top-100.
    const lastTimestampRef = useRef<string | null>(null);

    const fetchLogs = useCallback(async (sinceFetch = false) => {
        // Pause polling when the browser tab is hidden — no point burning
        // DB queries while the admin is looking at another tab.
        if (document.hidden) return;

        setIsLoading(true);
        try {
            const sinceParam = sinceFetch && lastTimestampRef.current
                ? `&since=${encodeURIComponent(lastTimestampRef.current)}`
                : '';
            const res = await fetch(
                `/api/admin/system-logs?service=${selectedService}&logType=${selectedType}&limit=100${sinceParam}`
            );
            if (res.ok) {
                const data: LogEntry[] = await res.json();
                if (sinceFetch && data.length > 0) {
                    // Prepend only the new entries so we dont re-render the full list
                    setLogs(prev => [...data, ...prev].slice(0, 200));
                } else if (!sinceFetch) {
                    setLogs(data);
                }
                // Update the cursor to the newest timestamp we have
                if (data.length > 0) {
                    lastTimestampRef.current = data[0].timestamp;
                }
            }
        } catch (err) {
            console.error("Failed to fetch system logs:", err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedService, selectedType]);

    // Full re-fetch when filters change — reset cursor
    useEffect(() => {
        lastTimestampRef.current = null;
        fetchLogs(false);
    }, [selectedService, selectedType]);

    // Visibility-aware polling at 5s interval (only fetches new entries)
    useEffect(() => {
        if (!isAutoRefresh) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(() => {
            fetchLogs(true); // incremental fetch — only new since last seen
        }, 5000); // 5s interval, was 2.5s — cuts DB load by 50%

        // Also pause/resume automatically on tab visibility changes
        const onVisibilityChange = () => {
            if (!document.hidden && isAutoRefresh) {
                fetchLogs(true); // immediate fetch when tab becomes visible again
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [isAutoRefresh, fetchLogs]);

    const getServiceBadgeClass = (service: string) => {
        switch (service) {
            case 'frontend':
                return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
            case 'backend':
                return 'bg-teal-500/15 text-teal-400 border border-teal-500/30';
            case 'engine':
                return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
            default:
                return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
        }
    };

    const getLogTypeBadgeClass = (type: string) => {
        switch (type) {
            case 'error':
                return 'bg-red-500/20 text-red-400 border border-red-500/40 font-bold';
            case 'model_engagement':
                return 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30';
            case 'api_request':
                return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25';
            default:
                return 'bg-zinc-800 text-zinc-500';
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Terminal size={22} className="text-indigo-500" /> Centralized System Logs
                    </h2>
                    <p className="text-slate-500 text-sm">Monitor executions across Frontend, API Gateway, and AI Engine in real-time.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Service Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Service:</span>
                        <select 
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="all">All Services</option>
                            <option value="frontend">Frontend</option>
                            <option value="backend">Backend Gateway</option>
                            <option value="engine">AI Engine</option>
                        </select>
                    </div>

                    {/* Log Type Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Type:</span>
                        <select 
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="all">All Logs</option>
                            <option value="api_request">API Requests</option>
                            <option value="model_engagement">LLM Engagements</option>
                            <option value="info">Info</option>
                            <option value="error">Errors</option>
                        </select>
                    </div>

                    {/* Auto Refresh Toggle */}
                    <button 
                        onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                            isAutoRefresh 
                                ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' 
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                    >
                        {isAutoRefresh ? '● Live Auto-refresh' : 'Auto-refresh Off'}
                    </button>

                    {/* Refresh Button */}
                    <button 
                        onClick={() => fetchLogs(false)}
                        disabled={isLoading}
                        className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                        title="Force Refresh"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Terminal Log Console */}
            <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-mono">
                {/* Console header */}
                <div className="bg-[#141b2c] px-6 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-xs text-slate-400 font-semibold ml-2">sys_monitor@optios:~</span>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">MongoDB Stream buffer</span>
                </div>

                {/* Log list container */}
                <div className="p-4 md:p-6 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar min-h-[300px]">
                    {logs.map((log) => (
                        <div key={log._id} className="border-b border-slate-900 pb-4 last:border-b-0 last:pb-0">
                            {/* Log summary row */}
                            <div 
                                className="flex flex-col md:flex-row md:items-center gap-3 cursor-pointer hover:bg-slate-900/40 p-2 rounded-lg transition-colors"
                                onClick={() => log.logType === 'model_engagement' ? setExpandedLogId(expandedLogId === log._id ? null : log._id) : null}
                            >
                                {/* Timestamp */}
                                <span className="text-slate-500 text-[11px] whitespace-nowrap min-w-[80px]">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </span>

                                {/* Service Label */}
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-wide ${getServiceBadgeClass(log.service)}`}>
                                    {log.service}
                                </span>

                                {/* Log Type */}
                                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono ${getLogTypeBadgeClass(log.logType)}`}>
                                    {log.logType.replace('_', ' ')}
                                </span>

                                {/* Instigating User Identity */}
                                {log.userId && (
                                    <span className="text-[10px] text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 truncate max-w-[150px]" title={log.userId}>
                                        U: {log.userId}
                                    </span>
                                )}

                                {/* Log Message */}
                                <span className={`text-xs flex-1 ${log.logType === 'error' ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                                    {log.message}
                                </span>

                                {/* Metadata helper hint for model logs */}
                                {log.logType === 'model_engagement' && (
                                    <span className="text-[10px] text-indigo-400 underline decoration-dotted whitespace-nowrap">
                                        {expandedLogId === log._id ? 'Collapse Prompts' : 'View Prompts ➔'}
                                    </span>
                                )}
                            </div>

                            {/* Expanded model engagement log view */}
                            {log.logType === 'model_engagement' && expandedLogId === log._id && log.metadata && (
                                <div className="mt-3 ml-4 md:ml-10 p-4 rounded-xl bg-[#070b13] border border-indigo-900/30 space-y-4 text-xs animate-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-2 gap-4 border-b border-indigo-900/20 pb-3">
                                        <div>
                                            <span className="text-[10px] text-slate-500 font-semibold block uppercase">Model Name</span>
                                            <span className="text-slate-300 font-semibold flex items-center gap-1.5 mt-0.5">
                                                <Cpu size={14} className="text-fuchsia-400" /> {log.metadata.model || 'Unknown'}
                                            </span>
                                        </div>
                                        {log.userId && (
                                            <div>
                                                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Request Instigator</span>
                                                <span className="text-indigo-300 font-mono mt-0.5 block">{log.userId}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* System prompt */}
                                    {log.metadata.systemPrompt && (
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                                                <Layers size={12} className="text-indigo-400" /> System Context / Instructions
                                            </span>
                                            <pre className="p-3 bg-slate-900/60 rounded-lg text-slate-400 font-mono max-h-[150px] overflow-auto whitespace-pre-wrap select-all">
                                                {log.metadata.systemPrompt}
                                            </pre>
                                        </div>
                                    )}

                                    {/* User prompt */}
                                    {log.metadata.userPrompt && (
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                                                <Terminal size={12} className="text-emerald-400" /> User Input Context
                                            </span>
                                            <pre className="p-3 bg-slate-900/60 rounded-lg text-emerald-300/80 font-mono max-h-[180px] overflow-auto whitespace-pre-wrap select-all">
                                                {log.metadata.userPrompt}
                                            </pre>
                                        </div>
                                    )}

                                    {/* Model Response */}
                                    {log.metadata.response && (
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                                                <Cpu size={12} className="text-fuchsia-400" /> Generated Response Output
                                            </span>
                                            <pre className="p-3 bg-[#0a0f1d] border border-fuchsia-950/30 rounded-lg text-fuchsia-200/90 font-mono max-h-[220px] overflow-auto whitespace-pre-wrap select-all">
                                                {log.metadata.response}
                                            </pre>
                                        </div>
                                    )}

                                    {/* Model Errors */}
                                    {log.metadata.error && (
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-red-500 font-semibold uppercase flex items-center gap-1">
                                                <ShieldAlert size={12} /> Execution Error Details
                                            </span>
                                            <pre className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-red-400 font-mono whitespace-pre-wrap">
                                                {log.metadata.error}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {logs.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center p-20 text-slate-600 gap-3">
                            <Terminal size={40} className="opacity-10" />
                            <span>No system logs match the current filters.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
