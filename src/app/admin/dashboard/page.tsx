"use client";

import React, { useState, useEffect } from 'react';
import {
    BarChart3, FileText, Lock, ShieldAlert, MessageSquare, Plus, Trash2, Save,
    LogOut, Search, ChevronDown, CheckCircle, AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
    getQaPairs, addQaPair, deleteQaPair,
    getGuardrails, addGuardrail, toggleGuardrail as toggleGuardrailAction,
    getChatLogs,
    type QaPairType as QaPair, type GuardrailType as Guardrail, type ChatLogType
} from '../../actions/admin';

export default function AdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("knowledge_base");

    // Knowledge Base State
    const [qaPairs, setQaPairs] = useState<QaPair[]>([]);
    const [newQ, setNewQ] = useState("");
    const [newA, setNewA] = useState("");
    const [newType, setNewType] = useState<'text' | 'url' | 'form'>('text');
    const [newFormConfig, setNewFormConfig] = useState<string>('{\n "title": "Grievance Form",\n "fields": [\n  {"label": "Name", "type": "text"},\n  {"label": "Email", "type": "email"},\n  {"label": "Issue Type", "type": "select", "options": ["Water Supply", "Road Connection", "Street Light"]}\n ]\n}');

    // Guardrails State
    const [guardrails, setGuardrails] = useState<Guardrail[]>([]);
    const [newRule, setNewRule] = useState("");

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

    // Assuming SidebarItem is a component defined elsewhere or a placeholder
    const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
        >
            {icon}
            <span className="font-medium">{label}</span>
        </button>
    );

    return (
        <div className="flex h-screen bg-gray-50 font-sans">

            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold">S</div>
                    <div>
                        <h1 className="font-bold text-lg tracking-wide">Sahayak Admin</h1>
                        <p className="text-xs text-slate-400">AI Control Center</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <SidebarItem icon={<FileText size={20} />} label="Knowledge Base" active={activeTab === 'knowledge_base'} onClick={() => setActiveTab('knowledge_base')} />
                    <SidebarItem icon={<ShieldAlert size={20} />} label="Guardrails" active={activeTab === 'guardrails'} onClick={() => setActiveTab('guardrails')} />
                    <SidebarItem icon={<MessageSquare size={20} />} label="Chat Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
                    <SidebarItem icon={<BarChart3 size={20} />} label="Analytics" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={() => router.push('/admin/login')}
                        className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-800 capitalize flex items-center gap-2">
                        {activeTab === 'knowledge_base' && <MessageSquare className="text-blue-600" />}
                        {activeTab === 'guardrails' && <ShieldAlert className="text-red-600" />}
                        {activeTab === 'analytics' && <BarChart3 className="text-purple-600" />}
                        {activeTab === 'logs' && <MessageSquare className="text-purple-600" />}
                        {activeTab.replace('_', ' ')}
                    </h2>

                    <div className="flex items-center gap-4">
                        <div className="text-sm text-right">
                            <p className="font-bold text-gray-700">Administrator</p>
                            <p className="text-xs text-green-600 font-medium">● System Online</p>
                        </div>
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold">A</div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-8 bg-gray-50">

                    {/* KNOWLEDGE BASE TAB */}
                    {activeTab === 'knowledge_base' && (
                        <div className="max-w-5xl mx-auto space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-green-600" /> Add New Q&A Pair
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="User Question (e.g., 'What is scheme X?')"
                                        value={newQ}
                                        onChange={e => setNewQ(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            className="p-3 border border-gray-300 rounded-xl bg-white outline-none"
                                            value={newType}
                                            onChange={(e) => setNewType(e.target.value as 'text' | 'url' | 'form')}
                                        >
                                            <option value="text">Direct Answer</option>
                                            <option value="url">URL Source</option>
                                            <option value="form">Smart Form</option>
                                        </select>
                                        <input
                                            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder={newType === 'text' ? "Assistant Answer..." : newType === 'url' ? "https://example.com/info-page" : "Help text for the form..."}
                                            value={newA}
                                            onChange={e => setNewA(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {newType === 'form' && (
                                    <div className="mt-4">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Form Settings (JSON Configuration)</label>
                                        <textarea
                                            className="w-full p-4 border border-gray-300 rounded-xl font-mono text-xs bg-slate-900 text-green-400 h-40 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                                            value={newFormConfig}
                                            onChange={e => setNewFormConfig(e.target.value)}
                                        />
                                        <p className="text-[10px] text-gray-400 italic mt-1 font-medium">Define your form fields using the JSON structure above.</p>
                                    </div>
                                )}
                                <div className="mt-4 text-right">
                                    <button
                                        onClick={handleAddQa}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 ml-auto"
                                    >
                                        <Save size={18} /> Save Mapping
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-600 uppercase text-xs tracking-wider">Existing Mappings ({qaPairs.length})</h4>
                                {qaPairs.map(qa => (
                                    <div key={qa.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-start justify-between group">
                                        <div className="space-y-2">
                                            <p className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                                <span className="text-gray-400 font-normal text-sm">Q:</span> {qa.question}
                                            </p>
                                            <p className="text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <span className="text-gray-400 font-bold text-xs mr-2">Groq:</span> {qa.answer}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteQa(qa.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
                            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-2xl border border-red-100 mb-8">
                                <h3 className="flex items-center gap-2 font-bold text-red-800 text-lg">
                                    <ShieldAlert size={24} /> Safety & Compliance
                                </h3>
                                <p className="text-red-600 text-sm mt-1">Define strict boundaries for the AI. These rules override all other knowledge retrieval.</p>
                            </div>

                            <div className="flex gap-4 mb-6">
                                <input
                                    className="flex-1 p-4 border border-gray-300 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="Enter a new guardrail rule (e.g., 'Do not discuss politics')"
                                    value={newRule}
                                    onChange={e => setNewRule(e.target.value)}
                                />
                                <button
                                    onClick={handleAddRule}
                                    className="bg-red-600 text-white px-6 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                                >
                                    Add Rule
                                </button>
                            </div>

                            <div className="grid gap-4">
                                {guardrails.map(g => (
                                    <div key={g.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${g.active ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-100 border-gray-200 opacity-60'
                                        }`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${g.active ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-400'}`}>
                                                <Lock size={20} />
                                            </div>
                                            <div>
                                                <p className={`font-medium ${g.active ? 'text-gray-800' : 'text-gray-500 line-through'}`}>{g.rule}</p>
                                                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">{g.type?.replace('_', ' ') || 'GENERAL'}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleToggleGuardrail(g.id)}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${g.active
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                }`}
                                        >
                                            {g.active ? 'Active' : 'Disabled'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LOGS TAB */}
                    {activeTab === 'logs' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <MessageSquare className="text-purple-600" /> Interaction Logs
                            </h2>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                            <th className="p-4">Time</th>
                                            <th className="p-4">User Query</th>
                                            <th className="p-4">AI Response</th>
                                            <th className="p-4">Guardrails</th>
                                            <th className="p-4">Source</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {chatLogs.map((log) => (
                                            <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-sm text-gray-800 font-medium max-w-xs truncate" title={log.userQuery}>
                                                    {log.userQuery}
                                                </td>
                                                <td className="p-4 text-sm text-gray-600 max-w-md truncate" title={log.aiResponse}>
                                                    {log.aiResponse}
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit ${log.guardrailsStatus === 'violated'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-green-100 text-green-700'
                                                            }`}>
                                                            {log.guardrailsStatus?.toUpperCase() || 'PASSED'}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">
                                                            {log.activeGuardrails?.length || 0} rules checked
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${log.source === 'gemini' ? 'bg-blue-100 text-blue-700' :
                                                        log.source.includes('kb') ? 'bg-green-100 text-green-700' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {log.source}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {chatLogs.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-400">No logs found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
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
            </main >
        </div >
    );
}

// Components
function SidebarLink({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
        >
            {icon}
            <span className="font-medium text-sm">{label}</span>
            {active && <ChevronDown className="ml-auto w-4 h-4 -rotate-90" />}
        </button>
    );
}
