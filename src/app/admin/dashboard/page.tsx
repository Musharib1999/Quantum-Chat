"use client";

import React, { useState, useEffect } from 'react';
import {
    BarChart3, FileText, Lock, ShieldAlert, MessageSquare, Plus, Trash2, Save,
    LogOut, Search, ChevronDown, CheckCircle, AlertTriangle, Menu, X, TrendingUp, BookOpen
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
    getQaPairs, addQaPair, deleteQaPair,
    getGuardrails, addGuardrail, toggleGuardrail as toggleGuardrailAction,
    deleteGuardrail as deleteGuardrailAction, updateGuardrail as updateGuardrailAction,
    getChatLogs,
    type QaPairType as QaPair, type GuardrailType as Guardrail, type ChatLogType
} from '../../actions/admin';
import QuantumBackground from '../../../components/QuantumBackground';
import ThemeToggle from '../../../components/ThemeToggle';
import StockManager from '../../../components/admin/StockManager';
import ArticleManager from '../../../components/admin/ArticleManager';

export default function AdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("knowledge_base");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Knowledge Base State
    const [qaPairs, setQaPairs] = useState<QaPair[]>([]);
    const [newQ, setNewQ] = useState("");
    const [newA, setNewA] = useState("");
    const [newType, setNewType] = useState<'text' | 'url' | 'form'>('text');
    const [newFormConfig, setNewFormConfig] = useState<string>('{\n "title": "Grievance Form",\n "fields": [\n  {"label": "Name", "type": "text"},\n  {"label": "Email", "type": "email"},\n  {"label": "Issue Type", "type": "select", "options": ["Water Supply", "Road Connection", "Street Light"]}\n ]\n}');

    // Guardrails State
    const [guardrails, setGuardrails] = useState<Guardrail[]>([]);
    const [newRule, setNewRule] = useState("");
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [editingRuleText, setEditingRuleText] = useState("");

    // Logs State
    const [chatLogs, setChatLogs] = useState<ChatLogType[]>([]);

    useEffect(() => {
        // Load initial data
        getQaPairs().then(setQaPairs);
        getGuardrails().then(setGuardrails);
        getChatLogs().then(setChatLogs);
    }, []);

    const handleAddQa = async () => {
        if (!newQ || !newA) return;
        let config = null;
        if (newType === 'form') {
            try {
                config = JSON.parse(newFormConfig);
            } catch (e) {
                alert("Invalid JSON in Form Config");
                return;
            }
        }
        const newPair: QaPair = {
            id: Date.now().toString(),
            question: newQ,
            answer: newA,
            type: newType,
            formConfig: config,
            tags: []
        };
        await addQaPair(newPair);
        setQaPairs([...qaPairs, newPair]);
        setNewQ("");
        setNewA("");
    };

    const handleDeleteQa = async (id: string) => {
        await deleteQaPair(id);
        setQaPairs(qaPairs.filter(q => q.id !== id));
    };

    const handleAddRule = async () => {
        if (!newRule) return;
        const rule: Guardrail = {
            id: Date.now().toString(),
            rule: newRule,
            type: 'banned_topic',
            active: true
        };
        await addGuardrail(rule);
        setGuardrails([...guardrails, rule]);
        setNewRule("");
    };

    const handleToggleGuardrail = async (id: string) => {
        await toggleGuardrailAction(id);
        setGuardrails(guardrails.map(g => g.id === id ? { ...g, active: !g.active } : g));
    };

    const handleDeleteRule = async (id: string) => {
        if (!confirm("Are you sure you want to delete this guardrail?")) return;
        await deleteGuardrailAction(id);
        setGuardrails(guardrails.filter(g => g.id !== id));
    };

    const handleUpdateRule = async (id: string) => {
        if (!editingRuleText.trim()) return;
        await updateGuardrailAction(id, editingRuleText);
        setGuardrails(guardrails.map(g => g.id === id ? { ...g, rule: editingRuleText } : g));
        setEditingRuleId(null);
    };

    return (
        <div className="flex h-screen bg-background font-sans overflow-hidden text-foreground relative selection:bg-purple-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-20 dark:opacity-100 transition-opacity duration-500">
                <QuantumBackground />
            </div>
            <div className="fixed inset-0 bg-background/80 z-0 pointer-events-none backdrop-blur-[1px]" />

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-black/20 backdrop-blur-2xl border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out
                md:relative md:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-secondary to-secondary/50 border border-border rounded-lg flex items-center justify-center font-bold text-foreground shadow-lg">QG</div>
                        <div>
                            <h1 className="font-bold text-lg tracking-wide text-foreground">Quantum Admin</h1>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Control Center</p>
                        </div>
                    </div>
                    <button className="md:hidden p-2 hover:bg-secondary/50 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                        <X size={20} className="text-foreground" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
                    <SidebarLink
                        icon={<FileText size={20} />}
                        label="Knowledge Base"
                        active={activeTab === 'knowledge_base'}
                        onClick={() => { setActiveTab('knowledge_base'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarLink
                        icon={<ShieldAlert size={20} />}
                        label="Guardrails"
                        active={activeTab === 'guardrails'}
                        onClick={() => { setActiveTab('guardrails'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarLink
                        icon={<TrendingUp size={20} />}
                        label="Stocks"
                        active={activeTab === 'stocks'}
                        onClick={() => { setActiveTab('stocks'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarLink
                        icon={<BookOpen size={20} />}
                        label="Articles"
                        active={activeTab === 'articles'}
                        onClick={() => { setActiveTab('articles'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarLink
                        icon={<MessageSquare size={20} />}
                        label="Chat Logs"
                        active={activeTab === 'logs'}
                        onClick={() => { setActiveTab('logs'); setIsMobileMenuOpen(false); }}
                    />
                    <SidebarLink
                        icon={<BarChart3 size={20} />}
                        label="Analytics"
                        active={activeTab === 'analytics'}
                        onClick={() => { setActiveTab('analytics'); setIsMobileMenuOpen(false); }}
                    />
                </nav>

                <div className="p-4 border-t border-border">
                    <button
                        onClick={() => router.push('/admin/login')}
                        className="flex items-center gap-3 w-full px-4 py-3 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all font-medium group"
                    >
                        <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">

                {/* Desktop/Mobile Header */}
                <header className="bg-transparent border-b border-border h-16 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-30 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden p-2 text-muted-foreground hover:bg-white/5 rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <h2 className="font-bold text-foreground flex items-center gap-2 text-sm md:text-base capitalize">
                            {activeTab === 'knowledge_base' && <MessageSquare className="text-blue-400" />}
                            {activeTab === 'guardrails' && <ShieldAlert className="text-red-400" />}
                            {activeTab === 'analytics' && <BarChart3 className="text-purple-400" />}
                            {activeTab === 'logs' && <MessageSquare className="text-purple-400" />}
                            {activeTab === 'stocks' && <TrendingUp className="text-green-400" />}
                            {activeTab === 'articles' && <BookOpen className="text-blue-400" />}
                            {activeTab.replace('_', ' ')}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <div className="text-sm text-right">
                            <p className="font-bold text-muted-foreground dark:text-zinc-200">Administrator</p>
                            <p className="text-[10px] text-green-500 font-medium tracking-widest uppercase">● System Online</p>
                        </div>
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-foreground border border-border font-bold">A</div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-4 md:p-8 bg-transparent">

                    {/* KNOWLEDGE BASE TAB */}
                    {activeTab === 'knowledge_base' && (
                        <div className="max-w-5xl mx-auto space-y-6">
                            <div className="bg-card/70 backdrop-blur-md p-6 rounded-2xl border border-border shadow-xl">
                                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-lg">
                                    <Plus className="w-5 h-5 text-green-400" /> Add New Q&A Pair
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        className="p-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-foreground placeholder:text-muted-foreground transition-all font-light"
                                        placeholder="User Question (e.g., 'What is scheme X?')"
                                        value={newQ}
                                        onChange={e => setNewQ(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            className="p-3 bg-secondary/30 border border-border rounded-xl outline-none text-foreground cursor-pointer"
                                            value={newType}
                                            onChange={(e) => setNewType(e.target.value as 'text' | 'url' | 'form')}
                                        >
                                            <option value="text" className="bg-card text-foreground">Direct Answer</option>
                                            <option value="url" className="bg-card text-foreground">URL Source</option>
                                            <option value="form" className="bg-card text-foreground">Smart Form</option>
                                        </select>
                                        <input
                                            className="flex-1 p-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-foreground placeholder:text-muted-foreground transition-all font-light"
                                            placeholder={newType === 'text' ? "Assistant Answer..." : newType === 'url' ? "https://example.com/info-page" : "Help text for the form..."}
                                            value={newA}
                                            onChange={e => setNewA(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {newType === 'form' && (
                                    <div className="mt-4">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Form Settings (JSON Configuration)</label>
                                        <textarea
                                            className="w-full p-4 border border-border rounded-xl font-mono text-xs bg-black/80 dark:bg-black/50 text-green-400 h-40 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                                            value={newFormConfig}
                                            onChange={e => setNewFormConfig(e.target.value)}
                                        />
                                        <p className="text-[10px] text-muted-foreground italic mt-1 font-medium">Define your form fields using the JSON structure above.</p>
                                    </div>
                                )}
                                <div className="mt-4 text-right">
                                    <button
                                        onClick={handleAddQa}
                                        className="bg-secondary hover:bg-secondary/80 border border-border text-foreground px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ml-auto shadow-lg hover:shadow-xl active:scale-95"
                                    >
                                        <Save size={18} /> Save Mapping
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-bold text-muted-foreground uppercase text-xs tracking-wider">Existing Mappings ({qaPairs.length})</h4>
                                {qaPairs.map(qa => (
                                    <div key={qa.id} className="bg-card/70 backdrop-blur-sm p-5 rounded-2xl border border-border hover:border-border/80 shadow-sm flex items-start justify-between group transition-all hover:bg-card/90">
                                        <div className="space-y-2">
                                            <p className="font-medium text-foreground text-lg flex items-center gap-2">
                                                <span className="text-muted-foreground font-normal text-sm">Q:</span> {qa.question}
                                            </p>
                                            <div className="text-muted-foreground leading-relaxed bg-secondary/30 p-3 rounded-lg border border-border">
                                                <span className="text-foreground font-bold text-xs mr-2 uppercase">AI Response:</span> {qa.answer}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteQa(qa.id)}
                                            className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GUARDRAILS TAB */}
                    {activeTab === 'guardrails' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 p-6 rounded-2xl border border-red-500/20 mb-8 backdrop-blur-md">
                                <h3 className="flex items-center gap-2 font-bold text-red-400 text-lg">
                                    <ShieldAlert size={24} /> Safety & Compliance
                                </h3>
                                <p className="text-red-300/80 text-sm mt-1">Define strict boundaries for the AI. These rules override all other knowledge retrieval.</p>
                            </div>

                            <div className="flex gap-4 mb-6">
                                <input
                                    className="flex-1 p-4 bg-zinc-800/50 border border-white/10 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-red-500/50 text-white placeholder:text-zinc-500"
                                    placeholder="Enter a new guardrail rule (e.g., 'Do not discuss politics')"
                                    value={newRule}
                                    onChange={e => setNewRule(e.target.value)}
                                />
                                <button
                                    onClick={handleAddRule}
                                    className="bg-red-600/80 hover:bg-red-600 backdrop-blur-sm text-white px-6 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20"
                                >
                                    Add Rule
                                </button>
                            </div>

                            <div className="grid gap-4">
                                {guardrails.map(g => (
                                    <div key={g.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all backdrop-blur-sm ${g.active ? 'bg-zinc-900/60 border-white/10 shadow-sm' : 'bg-zinc-900/20 border-white/5 opacity-60'
                                        }`}>
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`p-2 rounded-lg ${g.active ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-zinc-800 text-zinc-600'}`}>
                                                <Lock size={20} />
                                            </div>
                                            <div className="flex-1">
                                                {editingRuleId === g.id ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            className="flex-1 p-2 bg-zinc-800 border border-white/10 rounded-lg text-white"
                                                            value={editingRuleText}
                                                            onChange={e => setEditingRuleText(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <button onClick={() => handleUpdateRule(g.id)} className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg">
                                                            <Save size={18} />
                                                        </button>
                                                        <button onClick={() => setEditingRuleId(null)} className="p-2 text-zinc-400 hover:bg-zinc-500/10 rounded-lg">
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p className={`font-medium ${g.active ? 'text-zinc-200' : 'text-zinc-500 line-through'}`}>{g.rule}</p>
                                                )}
                                                <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider">{g.type?.replace('_', ' ') || 'GENERAL'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingRuleId(g.id);
                                                    setEditingRuleText(g.rule);
                                                }}
                                                className="p-2 text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                            >
                                                <FileText size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRule(g.id)}
                                                className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleGuardrail(g.id)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${g.active
                                                    ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                                                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                                                    }`}
                                            >
                                                {g.active ? 'Active' : 'Disabled'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* NEW TABS */}
                    {activeTab === 'stocks' && <StockManager />}
                    {activeTab === 'articles' && <ArticleManager />}

                    {/* LOGS TAB */}
                    {activeTab === 'logs' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                <MessageSquare className="text-purple-400" /> Interaction Logs
                            </h2>
                            <div className="bg-card/60 backdrop-blur-md rounded-2xl shadow-xl border border-border overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-secondary/30 border-b border-border">
                                            <tr className="text-muted-foreground font-bold text-xs uppercase tracking-wider">
                                                <th className="p-4">Time</th>
                                                <th className="p-4">User Query</th>
                                                <th className="p-4">AI Response</th>
                                                <th className="p-4">Guardrails</th>
                                                <th className="p-4">Source</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {chatLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-secondary/10 transition-colors">
                                                    <td className="p-4 text-xs text-muted-foreground whitespace-nowrap font-mono">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </td>
                                                    <td className="p-4 text-sm text-foreground font-medium max-w-[150px] md:max-w-xs truncate" title={log.userQuery}>
                                                        {log.userQuery}
                                                    </td>
                                                    <td className="p-4 text-sm text-muted-foreground max-w-[150px] md:max-w-md truncate" title={log.aiResponse}>
                                                        {log.aiResponse}
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap text-xs">
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit ${log.guardrailsStatus === 'violated'
                                                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                                : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                                }`}>
                                                                {log.guardrailsStatus?.toUpperCase() || 'PASSED'}
                                                            </span>
                                                            <span className="text-[10px] text-zinc-600">
                                                                {log.activeGuardrails?.length || 0} rules
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${log.source === 'gemini' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                            log.source.includes('kb') ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                                'bg-zinc-800 text-zinc-500 border-zinc-700'
                                                            }`}>
                                                            {log.source === 'gemini' ? 'Groq' : log.source}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {chatLogs.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-12 text-center text-zinc-600">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <MessageSquare size={32} className="opacity-20" />
                                                            <span>No logs found yet.</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ANALYTICS TAB (Placeholder) */}
                    {activeTab === 'analytics' && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <BarChart3 size={64} className="mb-4 text-gray-200" />
                            <h3 className="text-xl font-bold text-gray-300">Analytics Module</h3>
                            <p className="text-sm">Usage statistics and query insights coming soon.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Components
function SidebarLink({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${active
                ? 'bg-secondary text-foreground shadow-[0_0_15px_rgba(255,255,255,0.05)] border-border'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground border-transparent'
                }`}
        >
            {icon}
            <span className="font-medium text-sm">{label}</span>
            {active && <ChevronDown className="ml-auto w-4 h-4 -rotate-90 text-zinc-400" />}
        </button>
    );
}
