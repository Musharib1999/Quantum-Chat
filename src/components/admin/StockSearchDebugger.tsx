"use client";

import React, { useState } from 'react';
import { Search, Loader2, Cpu, Database, FileText, CheckCircle, AlertCircle, ArrowRight, Play } from 'lucide-react';
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

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-[#3066bb]/10 p-6 rounded-2xl border border-[#3066bb]/20 backdrop-blur-md">
                <h3 className="flex items-center gap-2 font-bold text-[#3066bb] text-lg">
                    <Cpu size={24} /> Stock Flow Debugger
                </h3>
                <p className="text-[#3066bb]/80 text-sm mt-1">Trace the autonomous stock fetching logic: Ticker Extraction → YFinance Data → Prompt Enrichment → Final Summary.</p>
            </div>

            {/* Input Area */}
            <div className="bg-card/70 backdrop-blur-md p-6 rounded-2xl border border-border shadow-md">
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Test Prompt</label>
                        <input
                            type="text"
                            placeholder="e.g. What is the current price of NVDA and how it affects AI market?"
                            className="w-full p-4 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-[#3066bb] outline-none text-sm placeholder:text-muted-foreground transition-all"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRunDebug()}
                        />
                    </div>
                    <button
                        onClick={handleRunDebug}
                        disabled={loading || !prompt.trim()}
                        className="bg-[#3066bb] hover:bg-[#255296] text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 active:scale-95"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play size={18} fill="currentColor" />}
                        Run Trace
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-2 text-sm">
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {loading && !result && (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-[#3066bb] opacity-40" />
                    <p className="text-muted-foreground animate-pulse font-medium">Executing neural trace...</p>
                </div>
            )}

            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Trace Steps */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Execution Pipeline</h4>
                        <div className="space-y-3">
                            {result.steps?.map((step: any, idx: number) => (
                                <div key={idx} className="bg-card/40 border border-border p-4 rounded-xl flex items-center justify-between group hover:bg-card/60 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step.status === 'completed' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                                step.status === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                                    'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                            }`}>
                                            {step.status === 'completed' ? <CheckCircle size={16} /> :
                                                step.status === 'failed' ? <AlertCircle size={16} /> :
                                                    <Loader2 size={16} className="animate-spin" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{step.name}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase">{step.status}</p>
                                        </div>
                                    </div>
                                    {step.result && (
                                        <div className="text-right">
                                            <span className="text-[10px] bg-secondary px-2 py-1 rounded-md font-mono">
                                                {typeof step.result === 'string' ? step.result : 'DATA_OBJECT'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Raw Data Inspector */}
                        {result.rawMarketData && (
                            <div className="bg-card/40 border border-border p-6 rounded-2xl space-y-4 shadow-sm">
                                <h4 className="text-xs font-bold text-[#3066bb] flex items-center gap-2 uppercase tracking-widest">
                                    <Database size={14} /> YFinance Scraper Output
                                </h4>
                                <pre className="text-[10px] font-mono bg-slate-950/50 p-4 rounded-xl overflow-x-auto text-green-400 border border-white/5">
                                    {JSON.stringify(result.rawMarketData, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>

                    {/* AI Reasoning & Response */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">AI Logic & Output</h4>

                        {/* Enriched Prompt */}
                        <div className="bg-card/40 border border-border rounded-2xl overflow-hidden shadow-sm">
                            <div className="bg-blue-500/5 p-4 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-2 text-blue-500">
                                    <FileText size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Enriched System Prompt</span>
                                </div>
                            </div>
                            <div className="p-4 bg-secondary/10 max-h-[300px] overflow-y-auto">
                                <pre className="text-[10px] font-sans whitespace-pre-wrap leading-relaxed text-muted-foreground">
                                    {result.enrichedPrompt}
                                </pre>
                            </div>
                        </div>

                        {/* Final Output */}
                        <div className="bg-card border border-[#3066bb]/30 rounded-2xl overflow-hidden shadow-xl">
                            <div className="bg-[#3066bb] p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-white">
                                    <CheckCircle size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider text-white/90">Final Summarization</span>
                                </div>
                            </div>
                            <div className="p-6 prose prose-invert prose-sm max-w-none">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {result.finalOutput}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
