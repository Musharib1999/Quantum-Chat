"use client";

import React, { useState } from 'react';
import { 
    AlertCircle, 
    Bug, 
    Check, 
    CheckCircle2, 
    ChevronDown, 
    ChevronUp, 
    Cpu, 
    Loader2, 
    Send, 
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div 
                className={`w-full max-w-lg flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-sans transition-all duration-200 ${
                    isDark 
                        ? "bg-[#0E0F13] border-white/[0.12] text-zinc-100 shadow-black/80" 
                        : "bg-white border-slate-200 text-slate-900 shadow-xl"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Top Header */}
                <div 
                    className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
                        isDark ? "border-white/[0.08] bg-[#0E0F13]" : "border-slate-200 bg-white"
                    }`}
                >
                    <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.06] text-zinc-300 flex items-center justify-center shrink-0 border border-white/[0.08]">
                            <Bug className="w-4 h-4 text-zinc-300" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">Report an Issue</h3>
                            <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                                Diagnostics & environment details are captured automatically
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={handleResetAndClose}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isDark 
                                ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]" 
                                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        }`}
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Modal Body */}
                {submittedIssueId ? (
                    <div className="p-8 text-center space-y-4">
                        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Check className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-semibold text-sm">Report Submitted Successfully</h4>
                            <p className={`text-xs max-w-xs mx-auto leading-relaxed ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                                Your issue and flight-recorder diagnostics have been logged for our engineering team.
                            </p>
                        </div>
                        <div className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border ${
                            isDark ? "bg-[#090A0D] border-white/[0.08] text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}>
                            <span className={isDark ? "text-zinc-500" : "text-slate-400"}>Reference ID:</span>
                            <span className="font-bold">{submittedIssueId}</span>
                        </div>
                        <div className="pt-2">
                            <button
                                onClick={handleResetAndClose}
                                className={`px-4 py-1.5 rounded-lg font-mono font-semibold text-xs transition-all cursor-pointer ${
                                    isDark
                                        ? "bg-zinc-200 hover:bg-white text-zinc-900 shadow-zinc-900/20"
                                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10"
                                }`}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col">
                        <div className="p-5 space-y-3.5 overflow-y-auto max-h-[calc(85vh-140px)] custom-scrollbar">
                            {errorMessage && (
                                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* Row: Category + Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className={`text-xs font-mono font-medium ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
                                        Issue Category
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className={`w-full appearance-none px-3 py-2 rounded-lg border outline-none text-xs font-mono transition-colors ${
                                                isDark
                                                    ? "bg-[#090A0D] border-white/[0.1] text-zinc-100 focus:border-zinc-400"
                                                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-zinc-400"
                                            }`}
                                        >
                                            <option value="code_execution">Code Execution / Simulator</option>
                                            <option value="ai_synthesis">AI Synthesis / Response</option>
                                            <option value="ui_editor">Editor / Monaco Glitch</option>
                                            <option value="journey">Quantum Journey 101</option>
                                            <option value="performance">Performance / Latency</option>
                                            <option value="other">Other Feedback</option>
                                        </select>
                                        <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                                            isDark ? "text-zinc-500" : "text-slate-400"
                                        }`} />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className={`text-xs font-mono font-medium ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
                                        Your Email (optional)
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="developer@domain.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`w-full px-3 py-2 rounded-lg border outline-none text-xs font-mono transition-colors ${
                                            isDark
                                                ? "bg-[#090A0D] border-white/[0.1] text-zinc-100 focus:border-zinc-400 placeholder-zinc-500"
                                                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-zinc-400 placeholder-slate-400"
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Summary / Title */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-mono font-medium ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
                                    Summary / Title
                                </label>
                                <input
                                    type="text"
                                    placeholder="Brief summary (e.g. KeyError on Simulated Annealer run)"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border outline-none text-xs font-mono transition-colors ${
                                        isDark
                                            ? "bg-[#090A0D] border-white/[0.1] text-zinc-100 focus:border-zinc-400 placeholder-zinc-500"
                                            : "bg-slate-50 border-slate-200 text-slate-900 focus:border-zinc-400 placeholder-slate-400"
                                    }`}
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-mono font-medium ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
                                    Description <span className="text-rose-400">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="What were you trying to do, and what happened instead?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border outline-none text-xs font-mono transition-colors resize-none ${
                                        isDark
                                            ? "bg-[#090A0D] border-white/[0.1] text-zinc-100 focus:border-zinc-400 placeholder-zinc-500"
                                            : "bg-slate-50 border-slate-200 text-slate-900 focus:border-zinc-400 placeholder-slate-400"
                                    }`}
                                />
                            </div>

                            {/* Captured Telemetry Flight Recorder Accordion */}
                            <div className={`p-3 rounded-xl border transition-all ${
                                isDark
                                    ? "bg-[#090A0D] border-white/[0.08]"
                                    : "bg-slate-50 border-slate-200"
                            }`}>
                                <button
                                    type="button"
                                    onClick={() => setShowTelemetryDetails(!showTelemetryDetails)}
                                    className="w-full flex items-center justify-between text-left cursor-pointer"
                                >
                                    <div className="flex items-center space-x-2">
                                        <Cpu className={`w-3.5 h-3.5 ${isDark ? "text-zinc-400" : "text-slate-500"}`} />
                                        <span className="font-semibold text-xs">Captured Flow Telemetry</span>
                                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                                            isDark ? "bg-white/[0.06] text-zinc-300 border border-white/[0.08]" : "bg-slate-200 text-slate-700"
                                        }`}>
                                            {flowContext.framework || 'studio'}
                                        </span>
                                        {hasStderr && (
                                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                                                isDark ? "bg-rose-500/15 text-rose-300 border border-rose-500/30" : "bg-rose-100 text-rose-700"
                                            }`}>
                                                stderr attached
                                            </span>
                                        )}
                                    </div>
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                        showTelemetryDetails ? "rotate-180" : ""
                                    } ${isDark ? "text-zinc-500" : "text-slate-400"}`} />
                                </button>

                                {showTelemetryDetails && (
                                    <div className={`mt-3 pt-3 border-t space-y-2 text-[11px] font-mono ${
                                        isDark ? "border-white/[0.06]" : "border-slate-200"
                                    }`}>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className={isDark ? "text-zinc-400" : "text-slate-500"}>
                                                File: <span className={isDark ? "text-zinc-200" : "text-slate-800"}>{flowContext.activeFile || 'main.py'}</span>
                                            </div>
                                            <div className={isDark ? "text-zinc-400" : "text-slate-500"}>
                                                Tab: <span className={isDark ? "text-zinc-200" : "text-slate-800"}>{flowContext.activeTab || 'code'}</span>
                                            </div>
                                            <div className={isDark ? "text-zinc-400" : "text-slate-500"}>
                                                Code: <span className={isDark ? "text-zinc-200" : "text-slate-800"}>{codeLines} lines</span>
                                            </div>
                                            <div className={isDark ? "text-zinc-400" : "text-slate-500"}>
                                                Chat: <span className={isDark ? "text-zinc-200" : "text-slate-800"}>{chatTurns} turns</span>
                                            </div>
                                        </div>

                                        {flowContext.lastExecution?.simulatorId && (
                                            <div className={isDark ? "text-zinc-400" : "text-slate-500"}>
                                                Simulator ID: <span className="font-semibold text-zinc-300">{flowContext.lastExecution.simulatorId}</span>
                                            </div>
                                        )}

                                        {hasStderr && (
                                            <div className="pt-1">
                                                <div className="text-[10px] uppercase font-semibold text-rose-400 mb-1 flex items-center space-x-1">
                                                    <Terminal className="w-3 h-3" />
                                                    <span>Traceback</span>
                                                </div>
                                                <pre className={`p-2.5 rounded-lg text-[10px] max-h-24 overflow-y-auto leading-relaxed border ${
                                                    isDark 
                                                        ? "bg-[#0E0F13] border-rose-900/40 text-rose-300" 
                                                        : "bg-rose-50 border-rose-200 text-rose-800"
                                                }`}>
                                                    {flowContext.lastExecution?.stderr}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Bottom Footer */}
                        <div
                            className={`px-5 py-3 border-t flex items-center justify-between gap-3 shrink-0 ${
                                isDark ? "border-white/[0.08] bg-[#0E0F13]" : "border-slate-200 bg-slate-50"
                            }`}
                        >
                            <span className={`text-[11px] font-mono ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
                                Auto-telemetry attached
                            </span>

                            <div className="flex items-center space-x-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={handleResetAndClose}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                                        isDark
                                            ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !description.trim()}
                                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg font-mono font-semibold text-xs shadow-xs transition-all cursor-pointer active:scale-[0.98] ${
                                        isDark
                                            ? "bg-zinc-200 hover:bg-white text-zinc-900 shadow-zinc-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                            : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-3.5 h-3.5" />
                                            <span>Submit Issue</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
