"use client";

import React, { useState, useEffect } from 'react';
import { 
    AlertCircle, 
    AlertTriangle, 
    Bug, 
    CheckCircle2, 
    Clock, 
    Code2, 
    Copy, 
    Cpu, 
    Eye, 
    FileText, 
    Filter, 
    Loader2, 
    MessageSquare, 
    RefreshCw, 
    Search, 
    Terminal, 
    Trash2, 
    User, 
    X 
} from 'lucide-react';

interface IssueItem {
    _id: string;
    issueId: string;
    status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    title: string;
    description: string;
    userEmail?: string;
    userId?: string;
    isGuest: boolean;
    flowContext?: {
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
        clientEnv?: {
            userAgent?: string;
            screen?: string;
            url?: string;
        };
    };
    adminNotes?: string;
    resolvedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export default function IssueReportsViewer() {
    const [issues, setIssues] = useState<IssueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [activeDetailTab, setActiveDetailTab] = useState<'code' | 'execution' | 'chat' | 'env'>('code');
    const [copiedCode, setCopiedCode] = useState(false);

    const fetchIssues = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (categoryFilter !== 'all') params.set('category', categoryFilter);
            if (priorityFilter !== 'all') params.set('priority', priorityFilter);
            if (search.trim()) params.set('search', search.trim());

            const res = await fetch(`/api/admin/issues?${params.toString()}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.issues)) {
                setIssues(data.issues);
            }
        } catch (err) {
            console.error('Failed to load issues:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, [statusFilter, categoryFilter, priorityFilter]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchIssues();
    };

    const handleSelectIssue = (issue: IssueItem) => {
        setSelectedIssue(issue);
        setAdminNotes(issue.adminNotes || '');
        setActiveDetailTab(issue.flowContext?.lastExecution?.stderr ? 'execution' : 'code');
    };

    const handleUpdateStatus = async (newStatus: string) => {
        if (!selectedIssue) return;
        try {
            const res = await fetch(`/api/admin/issues/${selectedIssue.issueId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (data.success && data.issue) {
                setSelectedIssue(data.issue);
                setIssues((prev) => prev.map((item) => (item.issueId === data.issue.issueId ? data.issue : item)));
            }
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    const handleUpdatePriority = async (newPriority: string) => {
        if (!selectedIssue) return;
        try {
            const res = await fetch(`/api/admin/issues/${selectedIssue.issueId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priority: newPriority }),
            });
            const data = await res.json();
            if (data.success && data.issue) {
                setSelectedIssue(data.issue);
                setIssues((prev) => prev.map((item) => (item.issueId === data.issue.issueId ? data.issue : item)));
            }
        } catch (err) {
            console.error('Failed to update priority:', err);
        }
    };

    const handleSaveAdminNotes = async () => {
        if (!selectedIssue) return;
        setIsSavingNotes(true);
        try {
            const res = await fetch(`/api/admin/issues/${selectedIssue.issueId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminNotes }),
            });
            const data = await res.json();
            if (data.success && data.issue) {
                setSelectedIssue(data.issue);
                setIssues((prev) => prev.map((item) => (item.issueId === data.issue.issueId ? data.issue : item)));
            }
        } catch (err) {
            console.error('Failed to save notes:', err);
        } finally {
            setIsSavingNotes(false);
        }
    };

    const handleDeleteIssue = async (issueId: string) => {
        if (!confirm('Are you sure you want to permanently delete this issue report?')) return;
        try {
            const res = await fetch(`/api/admin/issues/${issueId}`, { method: 'DELETE' });
            if (res.ok) {
                setIssues((prev) => prev.filter((i) => i.issueId !== issueId));
                if (selectedIssue?.issueId === issueId) {
                    setSelectedIssue(null);
                }
            }
        } catch (err) {
            console.error('Failed to delete issue:', err);
        }
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const openCount = issues.filter((i) => i.status === 'open').length;
    const resolvedCount = issues.filter((i) => i.status === 'resolved').length;
    const crashCount = issues.filter((i) => i.category === 'code_execution').length;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header & Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Reports</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1">{issues.length}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
                        <FileText size={20} />
                    </div>
                </div>
                <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Open / Active</div>
                        <div className="text-2xl font-bold text-amber-900 mt-1">{openCount}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-100 text-amber-800">
                        <Clock size={20} />
                    </div>
                </div>
                <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Resolved</div>
                        <div className="text-2xl font-bold text-emerald-900 mt-1">{resolvedCount}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800">
                        <CheckCircle2 size={20} />
                    </div>
                </div>
                <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/50 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Execution Crashes</div>
                        <div className="text-2xl font-bold text-rose-900 mt-1">{crashCount}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-100 text-rose-800">
                        <Bug size={20} />
                    </div>
                </div>
            </div>

            {/* Controls & Filter Bar */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Issue ID, user email, keywords..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                        />
                    </form>

                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
                        >
                            <option value="all">All Statuses</option>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="dismissed">Dismissed</option>
                        </select>

                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
                        >
                            <option value="all">All Categories</option>
                            <option value="code_execution">Code Execution</option>
                            <option value="ai_synthesis">AI Synthesis</option>
                            <option value="ui_editor">UI / Monaco Editor</option>
                            <option value="journey">Quantum Journey 101</option>
                            <option value="performance">Performance</option>
                            <option value="other">Other</option>
                        </select>

                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
                        >
                            <option value="all">All Priorities</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>

                        <button
                            onClick={fetchIssues}
                            disabled={loading}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Issues Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                                <th className="px-4 py-3">Reference ID</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Priority</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Summary / User</th>
                                <th className="px-4 py-3">Created</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                        <Loader2 size={18} className="animate-spin mx-auto mb-2 text-cyan-600" />
                                        Loading issue reports...
                                    </td>
                                </tr>
                            ) : issues.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                        No issue reports found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                issues.map((issue) => {
                                    const hasStderr = Boolean(issue.flowContext?.lastExecution?.stderr);
                                    return (
                                        <tr key={issue.issueId} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 font-mono font-medium text-cyan-700">
                                                {issue.issueId}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                                    issue.status === 'open' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                    issue.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                                    issue.status === 'resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                    'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}>
                                                    {issue.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                                    issue.priority === 'critical' ? 'bg-rose-100 text-rose-800' :
                                                    issue.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                                                    issue.priority === 'medium' ? 'bg-blue-50 text-blue-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {issue.priority}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 font-medium capitalize">
                                                {issue.category.replace('_', ' ')}
                                            </td>
                                            <td className="px-4 py-3 max-w-xs">
                                                <div className="font-medium text-slate-900 truncate flex items-center gap-1.5">
                                                    {hasStderr && <Bug size={13} className="text-rose-500 shrink-0" />}
                                                    <span>{issue.title}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-400 truncate">
                                                    {issue.userEmail || 'Guest user'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                                                {new Date(issue.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => handleSelectIssue(issue)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-medium text-xs transition-colors"
                                                >
                                                    <Eye size={13} />
                                                    <span>Inspect Flow</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Inspection Drawer / Modal */}
            {selectedIssue && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        className="relative w-full max-w-4xl max-h-[92vh] bg-[#0B0D13]/95 border border-white/[0.12] ring-1 ring-white/[0.05] shadow-[0_0_50px_-10px_rgba(6,182,212,0.15)] rounded-2xl flex flex-col overflow-hidden text-zinc-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-sm font-bold">
                                    {selectedIssue.issueId}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-100 text-base">{selectedIssue.title}</h3>
                                    <div className="text-xs text-slate-400 flex items-center gap-2">
                                        <span>User: {selectedIssue.userEmail || 'Guest'}</span>
                                        <span>•</span>
                                        <span>Route: {selectedIssue.flowContext?.route || '/ide'}</span>
                                        <span>•</span>
                                        <span>Framework: {selectedIssue.flowContext?.framework || 'unknown'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDeleteIssue(selectedIssue.issueId)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                    title="Delete Issue"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button
                                    onClick={() => setSelectedIssue(null)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Controls & Quick Metadata Bar */}
                        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400">Status:</span>
                                    <select
                                        value={selectedIssue.status}
                                        onChange={(e) => handleUpdateStatus(e.target.value)}
                                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none"
                                    >
                                        <option value="open">Open</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="dismissed">Dismissed</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400">Priority:</span>
                                    <select
                                        value={selectedIssue.priority}
                                        onChange={(e) => handleUpdatePriority(e.target.value)}
                                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-slate-400">
                                <span>Reported: {new Date(selectedIssue.createdAt).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* User Description */}
                            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">User's Problem Description</div>
                                <div className="text-sm text-slate-200 whitespace-pre-wrap">{selectedIssue.description}</div>
                            </div>

                            {/* Flow Inspection Tabs */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 border-b border-slate-800">
                                    <button
                                        onClick={() => setActiveDetailTab('code')}
                                        className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-medium transition-colors ${
                                            activeDetailTab === 'code'
                                                ? 'border-cyan-500 text-cyan-400'
                                                : 'border-transparent text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <Code2 size={14} />
                                        <span>Editor Code & Files</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveDetailTab('execution')}
                                        className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-medium transition-colors ${
                                            activeDetailTab === 'execution'
                                                ? 'border-cyan-500 text-cyan-400'
                                                : 'border-transparent text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <Terminal size={14} />
                                        <span>Terminal & Traceback</span>
                                        {selectedIssue.flowContext?.lastExecution?.stderr && (
                                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                                        )}
                                    </button>

                                    <button
                                        onClick={() => setActiveDetailTab('chat')}
                                        className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-medium transition-colors ${
                                            activeDetailTab === 'chat'
                                                ? 'border-cyan-500 text-cyan-400'
                                                : 'border-transparent text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <MessageSquare size={14} />
                                        <span>Recent AI Chat</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveDetailTab('env')}
                                        className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-medium transition-colors ${
                                            activeDetailTab === 'env'
                                                ? 'border-cyan-500 text-cyan-400'
                                                : 'border-transparent text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <Cpu size={14} />
                                        <span>Environment</span>
                                    </button>
                                </div>

                                {/* Tab 1: Code */}
                                {activeDetailTab === 'code' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>Active File: <strong className="text-slate-200">{selectedIssue.flowContext?.activeFile || 'main.py'}</strong></span>
                                            {selectedIssue.flowContext?.codeSnippet && (
                                                <button
                                                    onClick={() => handleCopyCode(selectedIssue.flowContext?.codeSnippet || '')}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                                                >
                                                    <Copy size={12} />
                                                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                                                </button>
                                            )}
                                        </div>

                                        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 max-h-96 overflow-y-auto overflow-x-auto leading-relaxed">
                                            {selectedIssue.flowContext?.codeSnippet || '# No code snippet captured.'}
                                        </pre>

                                        {/* Multi-file snapshots if present */}
                                        {selectedIssue.flowContext?.projectFiles && Object.keys(selectedIssue.flowContext.projectFiles).length > 0 && (
                                            <div className="pt-2">
                                                <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Secondary Workspace Files</div>
                                                <div className="space-y-2">
                                                    {Object.entries(selectedIssue.flowContext.projectFiles).map(([fname, fcontent]) => (
                                                        <details key={fname} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                                                            <summary className="font-mono text-cyan-400 cursor-pointer font-medium">
                                                                {fname}
                                                            </summary>
                                                            <pre className="mt-2 p-3 rounded bg-slate-950 font-mono text-slate-300 max-h-60 overflow-y-auto">
                                                                {fcontent}
                                                            </pre>
                                                        </details>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tab 2: Execution & Stderr */}
                                {activeDetailTab === 'execution' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                                                <div className="text-slate-400 text-[10px]">SUCCESS</div>
                                                <div className={`font-semibold mt-0.5 ${selectedIssue.flowContext?.lastExecution?.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {selectedIssue.flowContext?.lastExecution?.success ? 'TRUE' : 'FALSE'}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                                                <div className="text-slate-400 text-[10px]">SIMULATOR ID</div>
                                                <div className="font-mono text-cyan-400 font-semibold mt-0.5">
                                                    {selectedIssue.flowContext?.lastExecution?.simulatorId || 'N/A'}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                                                <div className="text-slate-400 text-[10px]">EXECUTION TIME</div>
                                                <div className="text-slate-200 font-semibold mt-0.5">
                                                    {selectedIssue.flowContext?.lastExecution?.executionTimeMs ? `${selectedIssue.flowContext.lastExecution.executionTimeMs} ms` : 'N/A'}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                                                <div className="text-slate-400 text-[10px]">BACKEND</div>
                                                <div className="text-slate-200 font-semibold mt-0.5">
                                                    {selectedIssue.flowContext?.lastExecution?.backendUsed || 'local'}
                                                </div>
                                            </div>
                                        </div>

                                        {selectedIssue.flowContext?.lastExecution?.stderr && (
                                            <div className="space-y-1">
                                                <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    <AlertTriangle size={13} />
                                                    <span>Standard Error (Traceback)</span>
                                                </div>
                                                <pre className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/60 text-xs font-mono text-rose-300 max-h-60 overflow-y-auto leading-relaxed">
                                                    {selectedIssue.flowContext.lastExecution.stderr}
                                                </pre>
                                            </div>
                                        )}

                                        {selectedIssue.flowContext?.lastExecution?.stdout && (
                                            <div className="space-y-1">
                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                    Standard Output (stdout)
                                                </div>
                                                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 max-h-48 overflow-y-auto leading-relaxed">
                                                    {selectedIssue.flowContext.lastExecution.stdout}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tab 3: Recent AI Chat */}
                                {activeDetailTab === 'chat' && (
                                    <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {selectedIssue.flowContext?.recentChatMessages && selectedIssue.flowContext.recentChatMessages.length > 0 ? (
                                            selectedIssue.flowContext.recentChatMessages.map((msg, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                                                        msg.sender === 'user'
                                                            ? 'bg-cyan-950/20 border-cyan-800/40 text-cyan-200 ml-6'
                                                            : 'bg-slate-800/40 border-slate-700/60 text-slate-200 mr-6'
                                                    }`}
                                                >
                                                    <div className="font-semibold text-[10px] uppercase tracking-wider text-slate-400">
                                                        {msg.sender}
                                                    </div>
                                                    <div className="whitespace-pre-wrap">{msg.text}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-6 text-center text-slate-400 text-xs">
                                                No recent chat messages recorded for this session.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tab 4: Environment */}
                                {activeDetailTab === 'env' && (
                                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono text-slate-300">
                                        <div>User Agent: <span className="text-slate-400">{selectedIssue.flowContext?.clientEnv?.userAgent || 'N/A'}</span></div>
                                        <div>Screen Resolution: <span className="text-slate-400">{selectedIssue.flowContext?.clientEnv?.screen || 'N/A'}</span></div>
                                        <div>Full Page URL: <span className="text-cyan-400">{selectedIssue.flowContext?.clientEnv?.url || 'N/A'}</span></div>
                                    </div>
                                )}
                            </div>

                            {/* Admin Resolution Notes */}
                            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Admin Triage & Resolution Notes
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Add internal debugging notes, root cause analysis, or tracking details..."
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                                />
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSaveAdminNotes}
                                        disabled={isSavingNotes}
                                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
                                    >
                                        {isSavingNotes ? <Loader2 size={13} className="animate-spin" /> : null}
                                        <span>Save Notes</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
