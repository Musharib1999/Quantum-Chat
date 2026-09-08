"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    ShieldCheck,
    AlertTriangle,
    Play,
    RotateCcw,
    Download,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    ChevronDown,
    ChevronUp,
    Terminal,
    ArrowLeft,
    Zap,
    Cpu,
    Lock,
    Globe,
    Layers
} from 'lucide-react';
import {
    TEST_DEFINITIONS,
    TestCaseDefinition,
    TestResult,
    TestCategory,
    TestSeverity
} from '@/lib/test-suite/test-definitions';
import {
    runSingleTest,
    runTestSuite,
    generateAuditReportMarkdown
} from '@/lib/test-suite/test-runner';

export default function TestSuitePage() {
    const [results, setResults] = useState<Record<string, TestResult>>({});
    const [runningId, setRunningId] = useState<string | null>(null);
    const [isRunningAll, setIsRunningAll] = useState(false);
    const [cooldownSec, setCooldownSec] = useState<number>(0);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed' | 'pending'>('all');
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

    // Toggle accordion
    const toggleExpand = (id: string) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Execute single test
    const handleRunSingle = async (def: TestCaseDefinition) => {
        setRunningId(def.id);
        setResults(prev => ({
            ...prev,
            [def.id]: { id: def.id, status: 'running', durationMs: 0, assertions: [] }
        }));

        const result = await runSingleTest(def);
        setResults(prev => ({ ...prev, [def.id]: result }));
        setRunningId(null);
    };

    // Execute entire suite or filtered
    const handleRunAll = async (categoryFilter?: string) => {
        setIsRunningAll(true);
        const targetDefs = TEST_DEFINITIONS.filter(t => !categoryFilter || categoryFilter === 'all' || t.category === categoryFilter);

        // Mark all target tests as pending/running
        const initialStatus: Record<string, TestResult> = {};
        for (const t of targetDefs) {
            initialStatus[t.id] = { id: t.id, status: 'pending', durationMs: 0, assertions: [] };
        }
        setResults(prev => ({ ...prev, ...initialStatus }));

        let lastLlmTime = 0;

        for (const def of targetDefs) {
            if (def.category === 'llm' && lastLlmTime > 0) {
                const elapsed = Date.now() - lastLlmTime;
                if (elapsed < 30000) {
                    const waitMs = 30000 - elapsed;
                    setCooldownSec(Math.ceil(waitMs / 1000));
                    for (let rem = Math.ceil(waitMs / 1000); rem > 0; rem--) {
                        setCooldownSec(rem);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                    setCooldownSec(0);
                }
            }
            if (def.category === 'llm') {
                lastLlmTime = Date.now();
            }

            setRunningId(def.id);
            setResults(prev => ({
                ...prev,
                [def.id]: { id: def.id, status: 'running', durationMs: 0, assertions: [] }
            }));

            const result = await runSingleTest(def);
            setResults(prev => ({ ...prev, [def.id]: result }));
        }

        setRunningId(null);
        setIsRunningAll(false);
    };

    // Export audit report
    const handleExportMarkdown = () => {
        const resultsList = TEST_DEFINITIONS.map(def => results[def.id] || {
            id: def.id,
            status: 'skipped',
            durationMs: 0,
            assertions: []
        });
        const md = generateAuditReportMarkdown(resultsList);
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prime-blazar-audit-report-${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportJson = () => {
        const payload = {
            suite: "Prime Blazar Production Readiness & Security Test Suite",
            version: "2.0.0",
            timestamp: new Date().toISOString(),
            metrics: {
                total: TEST_DEFINITIONS.length,
                passed: Object.values(results).filter(r => r.status === 'passed').length,
                failed: Object.values(results).filter(r => r.status === 'failed').length,
            },
            results: TEST_DEFINITIONS.map(def => ({
                definition: def,
                result: results[def.id] || { status: 'untested' }
            }))
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prime-blazar-audit-report-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Filtered list
    const filteredDefs = useMemo(() => {
        return TEST_DEFINITIONS.filter(def => {
            const matchesCategory = selectedCategory === 'all' || def.category === selectedCategory;
            const res = results[def.id];
            const currentStatus = res ? res.status : 'pending';

            const matchesStatus = statusFilter === 'all'
                || (statusFilter === 'passed' && currentStatus === 'passed')
                || (statusFilter === 'failed' && currentStatus === 'failed')
                || (statusFilter === 'pending' && currentStatus === 'pending');

            const matchesSearch = !searchQuery
                || def.id.toLowerCase().includes(searchQuery.toLowerCase())
                || def.title.toLowerCase().includes(searchQuery.toLowerCase())
                || def.description.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesCategory && matchesStatus && matchesSearch;
        });
    }, [selectedCategory, statusFilter, searchQuery, results]);

    // Metrics
    const totalCount = TEST_DEFINITIONS.length;
    const passedCount = Object.values(results).filter(r => r.status === 'passed').length;
    const failedCount = Object.values(results).filter(r => r.status === 'failed').length;
    const completedCount = passedCount + failedCount;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const passRate = completedCount > 0 ? Math.round((passedCount / completedCount) * 100) : 0;

    const totalDuration = Object.values(results).reduce((sum, r) => sum + (r.durationMs || 0), 0);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-10">
            {/* Header / Nav */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                                <ArrowLeft className="w-3.5 h-3.5" /> Back to Studio
                            </Link>
                            <span className="text-slate-600">•</span>
                            <span className="text-xs text-slate-400 font-mono">v2.0.0 Production Verified</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                            <ShieldCheck className="w-8 h-8 text-cyan-400" />
                            Production Readiness & Security Test Suite
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Comprehensive 52-case verification across security vulnerabilities, API robustness, pure Groq LLM inference, and system resilience.
                        </p>
                    </div>

                    {/* System Status Pills */}
                    <div className="flex flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-slate-300 font-mono">Next.js :3000</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-slate-300 font-mono">Gateway :8002</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span className="text-slate-300 font-mono">Groq Engine :8003</span>
                        </div>
                    </div>
                </div>

                {/* KPI Metrics Dashboard */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 my-6">
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4">
                        <div className="text-xs text-slate-400 font-medium">Total Tests</div>
                        <div className="text-2xl font-bold text-white mt-1">{totalCount}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">5 Categories</div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4">
                        <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                        </div>
                        <div className="text-2xl font-bold text-emerald-400 mt-1">{passedCount}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{passRate}% Pass Rate</div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4">
                        <div className="text-xs text-rose-400 font-medium flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Failed
                        </div>
                        <div className="text-2xl font-bold text-rose-400 mt-1">{failedCount}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{totalCount - completedCount} Untested</div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4">
                        <div className="text-xs text-cyan-400 font-medium flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5" /> Progress
                        </div>
                        <div className="text-2xl font-bold text-cyan-400 mt-1">{progressPercent}%</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{completedCount}/{totalCount} Completed</div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4">
                        <div className="text-xs text-indigo-400 font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Runtime
                        </div>
                        <div className="text-2xl font-bold text-indigo-400 mt-1">{(totalDuration / 1000).toFixed(1)}s</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Cumulative Time</div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4">
                        <div className="text-xs text-amber-400 font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Security Rating
                        </div>
                        <div className="text-2xl font-bold text-amber-400 mt-1">
                            {failedCount === 0 && passedCount > 10 ? 'A+ Grade' : failedCount === 0 ? 'Verified' : 'Action Req'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Production Grade</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800 mb-6">
                    <div
                        className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl mb-8">
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => handleRunAll(selectedCategory)}
                            disabled={isRunningAll}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-sm px-5 py-2.5 rounded-lg shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                        >
                            <Play className={`w-4 h-4 fill-current ${isRunningAll ? 'animate-spin' : ''}`} />
                            {isRunningAll ? (cooldownSec > 0 ? `Rate-limit Cooldown (${cooldownSec}s)...` : 'Running Test Suite...') : selectedCategory === 'all' ? 'Run All 52 Tests' : `Run Category (${selectedCategory.toUpperCase()})`}
                        </button>

                        {cooldownSec > 0 && (
                            <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-800/60 px-3 py-2 rounded-lg text-amber-300 text-xs font-mono animate-pulse">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Pacing AI request: {cooldownSec}s remaining to protect Groq OTPM quota...</span>
                            </div>
                        )}

                        <button
                            onClick={() => setResults({})}
                            disabled={isRunningAll || completedCount === 0}
                            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-3.5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset Results
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportMarkdown}
                            disabled={completedCount === 0}
                            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
                        >
                            <Download className="w-3.5 h-3.5" /> Export Markdown
                        </button>
                        <button
                            onClick={handleExportJson}
                            disabled={completedCount === 0}
                            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
                        >
                            <Download className="w-3.5 h-3.5" /> Export JSON
                        </button>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs">
                        {[
                            { id: 'all', label: 'All', count: 52, icon: Layers },
                            { id: 'security', label: 'Security & Auth', count: 12, icon: Lock },
                            { id: 'api', label: 'API Robustness', count: 12, icon: Terminal },
                            { id: 'llm', label: 'AI Reasoning (Groq)', count: 10, icon: Cpu },
                            { id: 'navigation', label: 'Navigation & State', count: 8, icon: Globe },
                            { id: 'production', label: 'Production SLA', count: 10, icon: Zap },
                        ].map(tab => {
                            const Icon = tab.icon;
                            const isActive = selectedCategory === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setSelectedCategory(tab.id)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                                        isActive
                                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-800 text-slate-400'}`}>
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search & Status */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search tests by name or ID..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                        >
                            <option value="all">All Status</option>
                            <option value="passed">Passed Only</option>
                            <option value="failed">Failed Only</option>
                            <option value="pending">Pending Only</option>
                        </select>
                    </div>
                </div>

                {/* Test Cards List */}
                <div className="space-y-3">
                    {filteredDefs.map(def => {
                        const res = results[def.id];
                        const isRunning = runningId === def.id || (res && res.status === 'running');
                        const isPassed = res && res.status === 'passed';
                        const isFailed = res && res.status === 'failed';
                        const isPending = !res || res.status === 'pending';
                        const isExpanded = Boolean(expandedIds[def.id]);

                        const severityColor = {
                            CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                            HIGH: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                            MEDIUM: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                            INFO: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
                        }[def.severity];

                        return (
                            <div
                                key={def.id}
                                className={`border rounded-xl transition-all ${
                                    isPassed
                                        ? 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/30'
                                        : isFailed
                                        ? 'bg-rose-950/20 border-rose-500/40'
                                        : isRunning
                                        ? 'bg-cyan-950/20 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                                        : 'bg-slate-900/40 border-slate-800/80'
                                }`}
                            >
                                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="flex items-start md:items-center gap-3">
                                        {/* Status Icon */}
                                        <div className="mt-0.5 md:mt-0 flex-shrink-0">
                                            {isRunning ? (
                                                <div className="w-5 h-5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                                            ) : isPassed ? (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                            ) : isFailed ? (
                                                <XCircle className="w-5 h-5 text-rose-400" />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Test Info */}
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                                                    {def.id}
                                                </span>
                                                <h3 className="text-sm font-semibold text-white">
                                                    {def.title}
                                                </h3>
                                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${severityColor}`}>
                                                    {def.severity}
                                                </span>
                                                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                                    {def.category}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                                {def.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action & Duration */}
                                    <div className="flex items-center gap-3 self-end md:self-center">
                                        {res && res.durationMs > 0 && (
                                            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-slate-500" />
                                                {res.durationMs}ms
                                            </span>
                                        )}

                                        <button
                                            onClick={() => handleRunSingle(def)}
                                            disabled={isRunningAll || isRunning}
                                            className="text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
                                        >
                                            {isRunning ? 'Testing...' : res ? 'Rerun' : 'Run'}
                                        </button>

                                        <button
                                            onClick={() => toggleExpand(def.id)}
                                            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                                        >
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Inspection Drawer */}
                                {isExpanded && (
                                    <div className="border-t border-slate-800/80 bg-slate-950/60 p-4 space-y-3 text-xs">
                                        <div>
                                            <div className="text-slate-400 font-semibold mb-1">Expected Behavior:</div>
                                            <div className="text-slate-300 font-mono bg-slate-900 p-2 rounded border border-slate-800">
                                                {def.expected}
                                            </div>
                                        </div>

                                        {/* Assertions */}
                                        {res && res.assertions && res.assertions.length > 0 && (
                                            <div>
                                                <div className="text-slate-400 font-semibold mb-1">Assertions:</div>
                                                <div className="space-y-1">
                                                    {res.assertions.map((a, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`flex items-center gap-2 p-2 rounded font-mono ${
                                                                a.passed
                                                                    ? 'bg-emerald-950/20 text-emerald-300 border border-emerald-900/40'
                                                                    : 'bg-rose-950/20 text-rose-300 border border-rose-900/40'
                                                            }`}
                                                        >
                                                            {a.passed ? (
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                                            ) : (
                                                                <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                                            )}
                                                            <span className="flex-1">{a.name}</span>
                                                            {a.actual !== undefined && (
                                                                <span className="text-[11px] text-slate-400">
                                                                    Actual: {typeof a.actual === 'object' ? JSON.stringify(a.actual) : String(a.actual)}
                                                                </span>
                                                            )}
                                                            {a.message && (
                                                                <span className="text-[11px] text-amber-300">
                                                                    ({a.message})
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Request / Response Details */}
                                        {res && (res.request || res.response) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                                {res.request && (
                                                    <div>
                                                        <div className="text-slate-500 font-semibold mb-1">HTTP Request:</div>
                                                        <pre className="bg-slate-900 border border-slate-800 p-2 rounded text-[11px] font-mono text-slate-300 overflow-x-auto max-h-32">
                                                            {JSON.stringify(res.request, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                                {res.response && (
                                                    <div>
                                                        <div className="text-slate-500 font-semibold mb-1">HTTP Response:</div>
                                                        <pre className="bg-slate-900 border border-slate-800 p-2 rounded text-[11px] font-mono text-slate-300 overflow-x-auto max-h-32">
                                                            {JSON.stringify(res.response, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Error Alert */}
                                        {res && res.error && (
                                            <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded text-rose-300 font-mono">
                                                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                                <span>Error: {res.error}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {filteredDefs.length === 0 && (
                        <div className="text-center py-12 text-slate-500 text-sm bg-slate-900/30 rounded-xl border border-slate-800">
                            No test cases matched your filter criteria.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
