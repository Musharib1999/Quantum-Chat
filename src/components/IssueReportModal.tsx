"use client";

import React, { useState } from 'react';
import { 
    AlertCircle, 
    Bug, 
    CheckCircle2, 
    ChevronDown, 
    ChevronUp, 
    Cpu, 
    Loader2, 
    Send, 
    Sparkles, 
    Terminal, 
    X 
} from 'lucide-react';

interface FlowContext {
    route?: string;
    framework?: string;
    projectId?: string;
    projectTitle?: string;
    activeFile?: string;
    activeTab?: string;
    codeSnippet?: string;
    projectFiles?: Record<string, string>;
    lastExecution?: {
        success?: boolean;
        stdout?: string;
        stderr?: string;
        simulatorId?: string;
        executionTimeMs?: number;
        backendUsed?: string;
        activeQubits?: number;
    };
    recentChatMessages?: Array<{
        sender: string;
        text: string;
        timestamp?: string;
    }>;
}

interface IssueReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    flowContext?: FlowContext;
    userEmail?: string;
    defaultCategory?: 'code_execution' | 'ai_synthesis' | 'ui_editor' | 'journey' | 'performance' | 'other';
    isDark?: boolean;
}

export default function IssueReportModal({
    isOpen,
    onClose,
    flowContext = {},
    userEmail,
    defaultCategory = 'code_execution',
    isDark = true,
}: IssueReportModalProps) {
    const [category, setCategory] = useState<string>(defaultCategory);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [email, setEmail] = useState(userEmail || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTelemetryDetails, setShowTelemetryDetails] = useState(false);
    const [submittedIssueId, setSubmittedIssueId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) {
            setErrorMessage("Please describe the issue before submitting.");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const clientEnv = typeof window !== 'undefined' ? {
                userAgent: navigator.userAgent,
                screen: `${window.innerWidth}x${window.innerHeight}`,
                url: window.location.href
            } : {};

            const payload = {
                title: title.trim() || undefined,
                description: description.trim(),
                category,
                userEmail: email.trim() || undefined,
                isGuest: !email,
                flowContext: {
                    ...flowContext,
                    clientEnv
                }
            };

            const res = await fetch('/api/issues/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setSubmittedIssueId(data.issueId);
            } else {
                setErrorMessage(data.error || "Failed to submit issue report.");
            }
        } catch (err: any) {
            setErrorMessage(err.message || "An unexpected network error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetAndClose = () => {
        setSubmittedIssueId(null);
        setDescription('');
        setTitle('');
        setErrorMessage(null);
        onClose();
    };

    const hasStderr = Boolean(flowContext.lastExecution?.stderr);
    const codeLines = flowContext.codeSnippet ? flowContext.codeSnippet.split('\n').length : 0;
    const chatTurns = flowContext.recentChatMessages?.length || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            {/* Modal Container */}
            <div 
                className={`relative w-full max-w-xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 border ${
                    isDark 
                        ? "bg-[#0B0D13]/95 border-white/[0.12] text-zinc-100 shadow-[0_0_50px_-10px_rgba(6,182,212,0.15)] ring-1 ring-white/[0.05]" 
                        : "bg-white border-slate-200 text-slate-900 shadow-2xl ring-1 ring-black/[0.05]"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Subtle Top Glow Accent Line */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4.5 border-b ${
                    isDark ? "border-white/[0.08] bg-[#0E111A]/80" : "border-slate-100 bg-slate-50/80"
                }`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-sky-500/10 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                            <Bug size={19} className="stroke-[2.2]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className={`font-semibold text-base tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                    Report an Issue
                                </h3>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                    <Sparkles size={10} /> Auto-Diagnostics
                                </span>
                            </div>
                            <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                                Flight recorder packages your editor state, traceback, and environment
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={handleResetAndClose}
                        className={`p-2 rounded-xl transition-colors ${
                            isDark 
                                ? "text-zinc-400 hover:text-white hover:bg-white/[0.08]" 
                                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        }`}
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4.5 custom-scrollbar">
                    {submittedIssueId ? (
                        <div className="py-10 text-center space-y-4 animate-in zoom-in-95 duration-200">
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                                <CheckCircle2 size={28} className="stroke-[2.2]" />
                            </div>
                            <div className="space-y-1.5">
                                <h4 className={`text-lg font-semibold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                    Report Submitted Successfully
                                </h4>
                                <p className={`text-xs max-w-sm mx-auto leading-relaxed ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                                    Your issue and full flow telemetry have been logged. The engineering team will review the diagnostic flight recorder.
                                </p>
                            </div>

                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-xs font-mono text-cyan-300">
                                <span>Reference ID:</span>
                                <span className="font-bold tracking-wider">{submittedIssueId}</span>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handleResetAndClose}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all cursor-pointer active:scale-[0.98]"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {errorMessage && (
                                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5 animate-in shake duration-200">
                                    <AlertCircle size={16} className="shrink-0 text-rose-400" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* Category & Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className={`block text-[11px] font-mono uppercase tracking-wider font-semibold mb-1.5 ${
                                        isDark ? "text-zinc-300" : "text-slate-700"
                                    }`}>
                                        Issue Category
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className={`w-full appearance-none px-3.5 py-2.5 text-xs rounded-xl border font-medium transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/25 ${
                                                isDark 
                                                    ? "bg-[#141722] hover:bg-[#181B28] border-white/[0.1] text-zinc-100 focus:border-cyan-400" 
                                                    : "bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800 focus:border-cyan-600"
                                            }`}
                                        >
                                            <option value="code_execution">Code Execution / Simulator Crash</option>
                                            <option value="ai_synthesis">AI Synthesis / Chat Response</option>
                                            <option value="ui_editor">Editor / Monaco / UI Glitch</option>
                                            <option value="journey">Quantum Journey 101 Step</option>
                                            <option value="performance">Performance / Latency</option>
                                            <option value="other">Other Feedback</option>
                                        </select>
                                        <ChevronDown size={14} className={`absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                                            isDark ? "text-zinc-400" : "text-slate-400"
                                        }`} />
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-[11px] font-mono uppercase tracking-wider font-semibold mb-1.5 ${
                                        isDark ? "text-zinc-300" : "text-slate-700"
                                    }`}>
                                        Your Email (for updates)
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="developer@domain.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`w-full px-3.5 py-2.5 text-xs rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/25 ${
                                            isDark 
                                                ? "bg-[#141722] border-white/[0.1] text-zinc-100 placeholder-zinc-500 focus:border-cyan-400 focus:bg-[#161A26]" 
                                                : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-600 focus:bg-white"
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Title (Optional) */}
                            <div>
                                <label className={`block text-[11px] font-mono uppercase tracking-wider font-semibold mb-1.5 ${
                                    isDark ? "text-zinc-300" : "text-slate-700"
                                }`}>
                                    Summary / Title <span className={`text-[10px] font-normal normal-case ${isDark ? "text-zinc-500" : "text-slate-400"}`}>(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Brief summary (e.g., KeyError (0,0) in Simulated Annealer)"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/25 ${
                                        isDark 
                                            ? "bg-[#141722] border-white/[0.1] text-zinc-100 placeholder-zinc-500 focus:border-cyan-400 focus:bg-[#161A26]" 
                                            : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-600 focus:bg-white"
                                    }`}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className={`block text-[11px] font-mono uppercase tracking-wider font-semibold mb-1.5 ${
                                    isDark ? "text-zinc-300" : "text-slate-700"
                                }`}>
                                    Description <span className="text-cyan-400">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="What were you attempting to do? What went wrong or didn't meet expectations?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/25 resize-none leading-relaxed ${
                                        isDark 
                                            ? "bg-[#141722] border-white/[0.1] text-zinc-100 placeholder-zinc-500 focus:border-cyan-400 focus:bg-[#161A26]" 
                                            : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-600 focus:bg-white"
                                    }`}
                                />
                            </div>

                            {/* Telemetry Flight Recorder Accordion */}
                            <div className={`rounded-xl border overflow-hidden transition-colors ${
                                isDark 
                                    ? "bg-[#10131D]/80 border-white/[0.08]" 
                                    : "bg-slate-50/80 border-slate-200"
                            }`}>
                                <button
                                    type="button"
                                    onClick={() => setShowTelemetryDetails(!showTelemetryDetails)}
                                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-mono transition-colors ${
                                        isDark 
                                            ? "text-zinc-300 hover:text-white hover:bg-white/[0.03]" 
                                            : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/50"
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <div className="w-5 h-5 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                                            <Cpu size={13} />
                                        </div>
                                        <span className="font-semibold text-xs">Captured Flow Telemetry</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                            {flowContext.framework || 'studio'}
                                        </span>
                                        {hasStderr && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                                <Terminal size={10} /> stderr attached
                                            </span>
                                        )}
                                    </div>
                                    <div className={`transition-transform duration-200 ${showTelemetryDetails ? "rotate-180" : ""}`}>
                                        <ChevronDown size={14} className={isDark ? "text-zinc-400" : "text-slate-400"} />
                                    </div>
                                </button>

                                {showTelemetryDetails && (
                                    <div className={`p-4 pt-1 border-t space-y-2.5 text-[11px] font-mono ${
                                        isDark ? "border-white/[0.06] bg-[#0A0C12]" : "border-slate-200 bg-white"
                                    }`}>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                                            <div className={`p-2 rounded-lg border ${isDark ? "bg-[#141722] border-white/[0.05]" : "bg-slate-50 border-slate-200"}`}>
                                                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Active File</div>
                                                <div className={`truncate font-semibold mt-0.5 ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>
                                                    {flowContext.activeFile || 'main.py'}
                                                </div>
                                            </div>
                                            <div className={`p-2 rounded-lg border ${isDark ? "bg-[#141722] border-white/[0.05]" : "bg-slate-50 border-slate-200"}`}>
                                                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Hero Tab</div>
                                                <div className={`truncate font-semibold mt-0.5 ${isDark ? "text-zinc-200" : "text-slate-800"}`}>
                                                    {flowContext.activeTab || 'code'}
                                                </div>
                                            </div>
                                            <div className={`p-2 rounded-lg border ${isDark ? "bg-[#141722] border-white/[0.05]" : "bg-slate-50 border-slate-200"}`}>
                                                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Code Size</div>
                                                <div className={`truncate font-semibold mt-0.5 ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                                                    {codeLines} lines
                                                </div>
                                            </div>
                                            <div className={`p-2 rounded-lg border ${isDark ? "bg-[#141722] border-white/[0.05]" : "bg-slate-50 border-slate-200"}`}>
                                                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Chat Turns</div>
                                                <div className={`truncate font-semibold mt-0.5 ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                                                    {chatTurns} msgs
                                                </div>
                                            </div>
                                        </div>

                                        {flowContext.lastExecution?.simulatorId && (
                                            <div className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between ${
                                                isDark ? "bg-[#141722] border-white/[0.05]" : "bg-slate-50 border-slate-200"
                                            }`}>
                                                <span className="text-zinc-500">Simulator Run ID:</span>
                                                <span className="font-bold text-cyan-400">{flowContext.lastExecution.simulatorId}</span>
                                            </div>
                                        )}

                                        {hasStderr && (
                                            <div className="space-y-1 pt-1">
                                                <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                                                    <Terminal size={11} /> Traceback Captured
                                                </div>
                                                <pre className="p-3 rounded-lg bg-rose-950/25 border border-rose-900/40 text-rose-300 text-[10px] max-h-28 overflow-y-auto leading-relaxed">
                                                    {flowContext.lastExecution?.stderr}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className={`flex items-center justify-end gap-3 pt-3 border-t ${
                                isDark ? "border-white/[0.08]" : "border-slate-100"
                            }`}>
                                <button
                                    type="button"
                                    onClick={handleResetAndClose}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold font-mono transition-colors cursor-pointer ${
                                        isDark 
                                            ? "text-zinc-400 hover:text-white hover:bg-white/[0.06]" 
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !description.trim()}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold font-mono transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 cursor-pointer active:scale-[0.98]"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={13} />
                                            <span>Submit Issue</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
