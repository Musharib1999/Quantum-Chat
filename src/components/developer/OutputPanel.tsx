"use client";

import React from 'react';
import { Terminal, Database, Clock, Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface OutputPanelProps {
    output: any;
    isExecuting: boolean;
    hardwareName: string | null;
}

export default function OutputPanel({ output, isExecuting, hardwareName }: OutputPanelProps) {
    
    const renderContent = () => {
        if (isExecuting) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 animate-in fade-in duration-500">
                    <Loader2 className="animate-spin text-[#3066bb] w-8 h-8" />
                    <div className="text-center">
                        <p className="text-sm font-semibold text-slate-600">Running code in {hardwareName}</p>
                        <p className="text-[10px] uppercase tracking-widest mt-1 opacity-70">Transpiling circuit parameters...</p>
                    </div>
                </div>
            );
        }

        if (!output) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3 grayscale opacity-60">
                    <Terminal size={48} strokeWidth={1} />
                    <p className="text-sm font-medium">Execute code to see output results</p>
                </div>
            );
        }

        return (
            <div className="p-6 h-full overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Results</span>
                        {output.error ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                <AlertCircle size={10} /> Execution Error
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={10} /> Success
                            </span>
                        )}
                    </div>
                    {output.executionTimeMs && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <Clock size={12} />
                            {output.executionTimeMs}ms
                        </div>
                    )}
                </div>

                {output.error ? (
                    <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl">
                        <pre className="text-red-600 text-[11px] font-mono whitespace-pre-wrap leading-relaxed">
                            {output.error}
                        </pre>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Status</span>
                                <span className="text-xs font-semibold text-slate-700">Finished</span>
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Compute Cost</span>
                                <span className="text-xs font-semibold text-slate-700">~0.15 Tokens</span>
                            </div>
                        </div>

                        {/* RAW JSON OUTPUT */}
                        <div className="relative">
                            <div className="absolute top-3 right-3 flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest px-1.5 py-0.5 border border-slate-100 rounded">JSON</span>
                            </div>
                            <pre className="bg-slate-900 text-slate-200 p-6 rounded-2xl text-[11px] font-mono overflow-x-auto shadow-inner leading-relaxed">
                                {JSON.stringify(output, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 h-full bg-white border-l border-slate-100 overflow-hidden flex flex-col">
            <div className="h-10 border-b border-slate-50 bg-slate-50/50 flex items-center px-4">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <Terminal size={12} /> Console Output
               </span>
            </div>
            <div className="flex-1 overflow-hidden">
                {renderContent()}
            </div>
        </div>
    );
}
