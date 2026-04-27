"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PROVIDER_MODELS = {
    groq: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile)' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Instant)' },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
        { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Llama 70B' },
    ],
    gemini: [
        { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ]
};

interface ILLMEntry {
    _id?: string;
    name: string;
    activeProvider: 'groq' | 'gemini';
    activeModel: string;
    description?: string;
    isDefault: boolean;
}

export default function LLMSettingsManager() {
    const [allModels, setAllModels] = useState<ILLMEntry[]>([]);
    const [editingModel, setEditingModel] = useState<ILLMEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        fetchAllModels();
    }, []);

    const fetchAllModels = async () => {
        try {
            const res = await axios.get('/api/admin/llm-settings');
            setAllModels(res.data);
        } catch (error) {
            console.error("Failed to fetch LLM models", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingModel?.name) return;
        setSaving(true);
        setStatus('');
        try {
            await axios.post('/api/admin/llm-settings', editingModel);
            setStatus('Model deployed successfully');
            setEditingModel(null);
            fetchAllModels();
        } catch (error: any) {
            setStatus('Error: ' + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to remove this LLM model? This may affect blueprints using it.")) return;
        try {
            await axios.delete(`/api/admin/llm-settings?id=${id}`);
            fetchAllModels();
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to delete");
        }
    };

    if (loading) return <div className="p-12 text-[#0F172A] text-sm">Loading intelligence stack...</div>;

    return (
        <div className="space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-[#0F172A]">Intelligence Fleet</h2>
                    <p className="text-xs text-[#0F172A] mt-1">Manage global reasoning engines and local generation models.</p>
                </div>
                <button 
                    onClick={() => setEditingModel({ name: '', activeProvider: 'gemini', activeModel: 'gemini-2.0-flash-lite', isDefault: false })}
                    className="bg-[rgb(48,102,187)] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:scale-[1.02] transition-all"
                >
                    + Add New Model
                </button>
            </div>

            {status && (
                <div className={`p-4 rounded-xl text-xs font-bold uppercase tracking-wider border ${status.includes('Error') ? 'bg-red-50 text-red-500 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                    {status}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allModels.map((model) => (
                    <div key={model._id} className={`bg-white border p-6 rounded-2xl flex flex-col transition-all hover:shadow-md ${model.isDefault ? 'border-[rgb(27,176,206)] ring-1 ring-[rgb(27,176,206)]/10' : 'border-[rgb(27,176,206)]/30 shadow-sm'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${model.activeProvider === 'gemini' ? 'bg-white border-[rgb(27,176,206)]/20 text-[#0F172A]' : 'bg-purple-50 border-purple-100 text-purple-600'}`}>
                                {model.activeProvider}
                            </span>
                            {model.isDefault && <span className="text-[10px] text-green-600 font-bold uppercase">System Default</span>}
                        </div>
                        <h3 className="text-lg font-bold text-[#0F172A] mb-1">{model.name}</h3>
                        <div className="text-[11px] font-mono text-[#0F172A] mb-4">{model.activeModel}</div>
                        <p className="text-xs text-[#0F172A] mb-8 line-clamp-2 flex-1">{model.description || 'No description provided.'}</p>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setEditingModel(model)}
                                className="flex-1 py-2.5 rounded-xl bg-white border border-[rgb(27,176,206)]/20 text-[10px] font-bold uppercase tracking-wider hover:bg-white transition-all"
                            >
                                Edit
                            </button>
                            {!model.isDefault && (
                                <button 
                                    onClick={() => handleDelete(model._id!)}
                                    className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {editingModel && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-2xl border border-[rgb(27,176,206)]/30 shadow-xl p-8 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-lg font-bold text-[#0F172A] mb-6">{editingModel._id ? 'Modify Intelligence' : 'Register New LLM'}</h3>
                        
                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-widest">Display Name</label>
                                <input 
                                    value={editingModel.name} 
                                    onChange={e => setEditingModel({...editingModel, name: e.target.value})}
                                    placeholder="e.g. Generation Optimized" 
                                    className="w-full p-3 bg-white border border-[rgb(27,176,206)]/30 rounded-xl text-sm" 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-widest">Intelligence Provider</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['gemini', 'groq'].map(p => (
                                        <button 
                                            key={p}
                                            onClick={() => setEditingModel({...editingModel, activeProvider: p as any, activeModel: PROVIDER_MODELS[p as keyof typeof PROVIDER_MODELS][0].id})}
                                            className={`py-3 rounded-xl border text-xs font-bold transition-all ${editingModel.activeProvider === p ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-[#0F172A] border-[rgb(27,176,206)]/30'}`}
                                        >
                                            {p.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-widest">Selection Architecture</label>
                                <select 
                                    value={editingModel.activeModel}
                                    onChange={e => setEditingModel({...editingModel, activeModel: e.target.value})}
                                    className="w-full p-3 bg-white border border-[rgb(27,176,206)]/30 rounded-xl text-sm outline-none"
                                >
                                    {PROVIDER_MODELS[editingModel.activeProvider].map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-widest">Purpose Description</label>
                                <textarea 
                                    value={editingModel.description}
                                    onChange={e => setEditingModel({...editingModel, description: e.target.value})}
                                    placeholder="what is this model mostly used for?"
                                    className="w-full h-24 p-3 bg-white border border-[rgb(27,176,206)]/30 rounded-xl text-sm"
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/50 border border-[rgb(27,176,206)]/20 rounded-xl">
                                <div className="space-y-0.5">
                                    <div className="text-xs font-bold text-[#0F172A]">System Default</div>
                                    <div className="text-[10px] text-[#0F172A]">Use this model as the primary global fallback.</div>
                                </div>
                                <button 
                                    onClick={() => setEditingModel({...editingModel, isDefault: !editingModel.isDefault})}
                                    className={`w-10 h-5 rounded-full relative transition-all ${editingModel.isDefault ? 'bg-[rgb(48,102,187)]' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editingModel.isDefault ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-10 flex justify-end gap-3">
                            <button onClick={() => setEditingModel(null)} className="text-xs font-bold text-[#0F172A] px-6">Cancel</button>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-[rgb(48,102,187)] text-white px-8 py-3 rounded-xl text-xs font-bold shadow-sm hover:bg-[#255299] transition-all disabled:opacity-50"
                            >
                                {saving ? 'Deploying...' : 'Save Configuration'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
