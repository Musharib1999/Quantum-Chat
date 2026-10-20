"use client";

import React, { useState } from 'react';
import { AlertCircle, Bug, CheckCircle2, ChevronDown, ChevronUp, Code2, Cpu, FileCode, Loader2, Terminal, X } from 'lucide-react';

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
}

export default function IssueReportModal({
    isOpen,
    onClose,
    flowContext = {},
    userEmail,
    defaultCategory = 'code_execution'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="relative w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <Bug size={18} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-100 text-base">Report an Issue</h3>
                            <p className="text-xs text-slate-400">Flow diagnostics & environment details are captured automatically</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleResetAndClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {submittedIssueId ? (
                        <div className="py-8 text-center space-y-4">
                            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <CheckCircle2 size={24} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-lg font-semibold text-slate-100">Report Submitted Successfully</h4>
                                <p className="text-xs text-slate-400 max-w-md mx-auto">
                                    Your issue and full flow telemetry have been logged. The engineering team will review the diagnostic flight recorder.
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-mono text-cyan-400">
                                Reference ID: <span className="font-bold">{submittedIssueId}</span>
                            </div>
                            <div className="pt-4">
                                <button
                                    onClick={handleResetAndClose}
                                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors shadow-lg shadow-cyan-600/20"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {errorMessage && (
                                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                                    <AlertCircle size={15} className="shrink-0" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* Category & Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                                    >
                                        <option value="code_execution">Code Execution / Simulator Crash</option>
                                        <option value="ai_synthesis">AI Synthesis / Chat Response</option>
                                        <option value="ui_editor">Editor / Monaco / UI Glitch</option>
                                        <option value="journey">Quantum Journey 101 Step</option>
                                        <option value="performance">Performance / Latency</option>
                                        <option value="other">Other Feedback</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Email (for updates)</label>
                                    <input
                                        type="email"
                                        placeholder="optional@domain.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Title (Optional) */}
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Summary / Title (optional)</label>
                                <input
                                    type="text"
                                    placeholder="Brief summary (e.g. KeyError on Simulated Annealer run)"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                    Description <span className="text-rose-400">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="What were you attempting to do? What went wrong or didn't meet expectations?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                                />
                            </div>

                            {/* Telemetry Flight Recorder Accordion */}
                            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                                <button
                                    type="button"
                                    onClick={() => setShowTelemetryDetails(!showTelemetryDetails)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Cpu size={14} className="text-cyan-400" />
                                        <span>Captured Flow Telemetry</span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                                            {flowContext.framework || 'studio'}
                                        </span>
                                        {hasStderr && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 font-medium">
                                                stderr attached
                                            </span>
                                        )}
                                    </div>
                                    {showTelemetryDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>

                                {showTelemetryDetails && (
                                    <div className="p-3 pt-0 border-t border-slate-800/60 space-y-2 text-[11px] font-mono text-slate-400">
                                        <div className="grid grid-cols-2 gap-2 pt-2">
                                            <div>File: <span className="text-slate-200">{flowContext.activeFile || 'main.py'}</span></div>
                                            <div>Tab: <span className="text-slate-200">{flowContext.activeTab || 'code'}</span></div>
                                            <div>Code: <span className="text-slate-200">{codeLines} lines</span></div>
                                            <div>Chat turns: <span className="text-slate-200">{chatTurns}</span></div>
                                        </div>
                                        {flowContext.lastExecution?.simulatorId && (
                                            <div>Simulator ID: <span className="text-cyan-400">{flowContext.lastExecution.simulatorId}</span></div>
                                        )}
                                        {hasStderr && (
                                            <div className="p-2 rounded bg-rose-950/30 border border-rose-900/50 text-rose-300 text-[10px] max-h-24 overflow-y-auto">
                                                {flowContext.lastExecution?.stderr}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={handleResetAndClose}
                                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !description.trim()}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors shadow-lg shadow-cyan-600/20"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <span>Submit Issue</span>
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
