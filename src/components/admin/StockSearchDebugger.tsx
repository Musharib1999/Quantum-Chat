"use client";

import React, { useState } from 'react';
import axios from 'axios';

interface DebugStep {
    name: string;
    status: 'processing' | 'completed' | 'failed' | 'info';
    result?: any;
}

export default function StockSearchDebugger() {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [activeView, setActiveView] = useState<'trace' | 'history'>('trace');
    const [selectedLog, setSelectedLog] = useState<any>(null);

    const fetchHistory = async () => {
        try {
            const res = await axios.get('/api/admin/stock-logs');
            setHistory(res.data);
        } catch (err) {
            console.error("Failed to fetch history:", err);
        }
    };

    React.useEffect(() => {
        if (activeView === 'history') {
            fetchHistory();
        }
    }, [activeView]);

    const handleRunDebug = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await axios.post('/api/admin/stock-debug', { prompt });
            setResult(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const viewLogDetails = (log: any) => {
        setSelectedLog(log);
        setResult({
            ticker: log.ticker,
            tickerPrompt: log.tickerPrompt,
            rawMarketData: log.rawData,
            enrichedPrompt: log.systemPrompt,
            finalOutput: log.aiResponse,
            steps: [
                { name: "Ticker extraction", status: "completed", result: log.ticker || "NULL" },
                { name: "Market data fetch", status: log.rawData ? "completed" : "failed", result: log.rawData ? `${log.rawData.symbol} ($${log.rawData.price})` : "FETCH_FAILED" },
                { name: "Persistent log captured", status: "completed", result: new Date(log.timestamp).toLocaleString() }
            ]
        });
        setActiveView('trace');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-[#0F172A]">Stock flow debugger</h2>
                    <p className="text-sm text-[#0F172A]">Trace autonomous logic: Ticker extraction → YFinance data → Prompt enrichment → Final summary.</p>
                </div>
                <div className="flex bg-[rgb(48,102,187)]/10 p-1 rounded-xl border border-[rgb(27,176,206)]/30">
                    <button
                        onClick={() => setActiveView('trace')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === 'trace' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#0F172A]'}`}
                    >
                        Live trace
                    </button>
                    <button
                        onClick={() => setActiveView('history')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === 'history' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#0F172A]'}`}
                    >
                        Market logs
                    </button>
                </div>
            </div>

            {activeView === 'trace' ? (
                <div className="bg-white p-6 rounded-2xl border border-[rgb(27,176,206)]/30 shadow-sm">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] font-bold text-[#0F172A] uppercase">Input prompt</label>
                            <input
                                type="text"
                                placeholder="e.g. What is the current price of NVDA?"
                                className="w-full p-4 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-sm text-[#0F172A]"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRunDebug()}
                            />
                        </div>
                        <button
                            onClick={handleRunDebug}
                            disabled={loading || !prompt.trim()}
                            className="bg-[rgb(48,102,187)] hover:bg-[#255299] text-white px-8 py-4 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50"
                        >
                            {loading ? 'Executing...' : 'Run trace'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-[rgb(27,176,206)]/30 overflow-hidden shadow-sm">
                    <div className="p-4 bg-[rgb(48,102,187)]/5 border-b border-[rgb(27,176,206)]/30 flex justify-between items-center">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#0F172A]">Historical market interactions</h4>
                        <button onClick={fetchHistory} className="text-xs font-semibold text-[#0F172A] hover:underline">Refresh</button>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left text-xs text-[#0F172A]">
                            <thead className="bg-[rgb(48,102,187)]/5 text-[#0F172A] uppercase font-bold sticky top-0">
                                <tr>
                                    <th className="p-4">Time</th>
                                    <th className="p-4">Ticker</th>
                                    <th className="p-4">Query</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((log) => (
                                    <tr key={log._id} className="hover:bg-[rgb(48,102,187)]/5 transition-colors">
                                        <td className="p-4 text-[#0F172A] whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                        <td className="p-4 font-mono font-bold text-[#0F172A]">{log.ticker || 'N/A'}</td>
                                        <td className="p-4 truncate max-w-[300px]">{log.userQuery}</td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => viewLogDetails(log)}
                                                className="text-[#0F172A] hover:underline font-bold text-[10px] uppercase"
                                            >
                                                Inspect trace
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-[#0F172A]">No market logs found yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">
                    {error}
                </div>
            )}

            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-[#0F172A] uppercase tracking-widest px-1">Pipeline execution</h4>
                        <div className="space-y-2">
                            {result.steps?.map((step: any, idx: number) => (
                                <div key={idx} className="bg-white border border-[rgb(27,176,206)]/30 p-4 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${step.status === 'completed' ? 'bg-green-500' : step.status === 'failed' ? 'bg-red-500' : 'bg-[rgb(48,102,187)] animate-pulse'}`} />
                                        <div>
                                            <p className="text-xs font-bold text-[#0F172A]">{step.name}</p>
                                            <p className="text-[9px] text-[#0F172A] uppercase font-bold">{step.status}</p>
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-mono bg-[rgb(48,102,187)]/5 px-2 py-0.5 rounded border border-[rgb(27,176,206)]/30 text-[#0F172A]">
                                        {typeof step.result === 'string' ? step.result : 'Object'}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {result.rawMarketData && (
                            <div className="bg-white border border-[rgb(27,176,206)]/30 p-6 rounded-2xl space-y-3">
                                <h4 className="text-[10px] font-bold text-[#0F172A] uppercase tracking-widest">Market data raw output</h4>
                                <pre className="text-[10px] font-mono bg-slate-900 p-4 rounded-xl overflow-x-auto text-green-400">
                                    {JSON.stringify(result.rawMarketData, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-[#0F172A] uppercase tracking-widest px-1">Logic & reasoning</h4>

                        <div className="bg-white border border-[rgb(27,176,206)]/30 rounded-2xl overflow-hidden">
                            <div className="p-4 bg-[rgb(48,102,187)]/5 border-b border-[rgb(27,176,206)]/30 text-[10px] font-bold uppercase text-[#0F172A] tracking-widest">
                                Enriched system prompt
                            </div>
                            <div className="p-4 bg-white max-h-[250px] overflow-y-auto">
                                <pre className="text-[10px] font-sans whitespace-pre-wrap text-[#0F172A] leading-relaxed">
                                    {result.enrichedPrompt}
                                </pre>
                            </div>
                        </div>

                        <div className="bg-[rgb(48,102,187)] border border-[rgb(27,176,206)] rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-4 bg-[rgb(48,102,187)] text-[10px] font-bold uppercase text-white tracking-widest opacity-80">
                                Final summarization
                            </div>
                            <div className="p-6 text-white text-sm leading-relaxed whitespace-pre-wrap">
                                {result.finalOutput}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
