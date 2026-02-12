"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Plus, Trash2, Save, Layers, Settings2, Search, Edit3, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

interface IField {
    label: string;
    key: string;
    type: 'text' | 'number' | 'select' | 'range';
    options?: string[];
    description?: string;
    defaultValue?: string;
}

interface IQuantumForm {
    _id?: string;
    industry: string;
    service: string;
    problem: string;
    fields: IField[];
    active: boolean;
    createdAt?: string;
}

export default function AdminFormsPage() {
    const [industry, setIndustry] = useState('');
    const [service, setService] = useState('');
    const [problem, setProblem] = useState('');
    const [fields, setFields] = useState<IField[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const [existingForms, setExistingForms] = useState<IQuantumForm[]>([]);
    const [metadata, setMetadata] = useState<{ industries: any[], services: any[], problemMapping: any }>({ industries: [], services: [], problemMapping: {} });
    const [view, setView] = useState<'editor' | 'overview'>('overview');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [formsRes, metaRes] = await Promise.all([
                axios.get('/api/quantum-forms'),
                axios.get('/api/quantum-forms/metadata')
            ]);
            setExistingForms(formsRes.data);
            setMetadata(metaRes.data);
        } catch (error) {
            console.error("Failed to fetch admin data", error);
        }
    };

    const addField = () => {
        setFields([...fields, { label: '', key: '', type: 'text' }]);
    };

    const removeField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const updateField = (index: number, key: keyof IField, value: any) => {
        const newFields = [...fields];
        if (key === 'options' && typeof value === 'string') {
            newFields[index][key] = value.split(',').map(s => s.trim());
        } else {
            (newFields[index] as any)[key] = value;
        }
        setFields(newFields);
    };

    const handleSave = async () => {
        setLoading(true);
        setStatus('Saving...');
        try {
            await axios.post('/api/quantum-forms', {
                industry,
                service,
                problem,
                fields,
                active: true
            });
            setStatus('Form Mapped Successfully!');
            fetchInitialData();
            setTimeout(() => setView('overview'), 1500);
        } catch (error: any) {
            setStatus('Error: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const editForm = (form: IQuantumForm) => {
        setIndustry(form.industry);
        setService(form.service);
        setProblem(form.problem);
        setFields(form.fields);
        setView('editor');
    };

    const resetForm = () => {
        setIndustry('');
        setService('');
        setProblem('');
        setFields([]);
        setView('editor');
    };

    return (
        <AppLayout
            currentMode="industry"
            sidebarContent={
                <div className="p-6 space-y-6">
                    <div className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Admin Dashboard</div>
                    <nav className="space-y-1">
                        <button
                            onClick={() => setView('overview')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${view === 'overview' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <Layers size={18} /> Overview
                        </button>
                        <button
                            onClick={resetForm}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${view === 'editor' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <Plus size={18} /> Create New
                        </button>
                    </nav>
                </div>
            }
        >
            <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 h-full overflow-y-auto">
                {view === 'overview' ? (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between border-b border-white/10 pb-6">
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                    <Search className="text-zinc-400" /> Module Overview
                                </h1>
                                <p className="text-zinc-500 mt-1">Manage all active quantum industry modules and their parameter forms.</p>
                            </div>
                            <button
                                onClick={resetForm}
                                className="bg-white text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-200 transition-all"
                            >
                                <Plus size={18} /> New Module
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {existingForms.map((form) => (
                                <div key={form._id} className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl group hover:border-white/20 transition-all hover:bg-zinc-900/60 flex flex-col justify-between min-h-[240px]">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="bg-white/5 px-2 py-1 rounded text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">{form.industry}</div>
                                            {form.active && <CheckCircle2 size={14} className="text-green-500" />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white leading-tight">{form.problem}</h3>
                                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">{form.service}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {form.fields.slice(0, 3).map((f, i) => (
                                                <span key={i} className="text-[10px] bg-black/40 border border-white/5 px-2 py-0.5 rounded text-zinc-400">{f.label}</span>
                                            ))}
                                            {form.fields.length > 3 && <span className="text-[10px] text-zinc-600">+{form.fields.length - 3} more</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => editForm(form)}
                                        className="mt-6 w-full py-2.5 rounded-xl border border-white/5 text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:bg-white group-hover:text-black group-hover:border-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <Edit3 size={14} /> Configure Module
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between border-b border-white/10 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <Layers className="text-white" size={24} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-white tracking-tight">
                                        Form Architect
                                    </h1>
                                    <p className="text-zinc-500 mt-1">Design parameter fields for <span className="text-white font-bold">{problem || 'New Problem'}</span></p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setView('overview')}
                                    className="px-6 py-2.5 rounded-xl font-bold text-zinc-500 hover:text-white transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading || !industry || !service || !problem}
                                    className="bg-white text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-200 transition-all disabled:opacity-50 shadow-2xl shadow-white/5"
                                >
                                    <Save size={18} /> {loading ? 'Saving...' : 'Publish Module'}
                                </button>
                            </div>
                        </div>

                        {status && (
                            <div className={`p-4 rounded-xl text-sm font-medium animate-in slide-in-from-top-2 duration-500 ${status.includes('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                {status}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Industry</label>
                                <input
                                    list="industries"
                                    value={industry}
                                    onChange={(e) => setIndustry(e.target.value)}
                                    placeholder="e.g. Biochemistry"
                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/30 transition-all"
                                />
                                <datalist id="industries">
                                    {metadata.industries.map(i => <option key={i.id} value={i.label} />)}
                                </datalist>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Service</label>
                                <input
                                    list="services"
                                    value={service}
                                    onChange={(e) => setService(e.target.value)}
                                    placeholder="e.g. Simulation"
                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/30 transition-all"
                                />
                                <datalist id="services">
                                    {metadata.services.map(s => <option key={s.id} value={s.label} />)}
                                </datalist>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Problem Context</label>
                                <input
                                    value={problem}
                                    onChange={(e) => setProblem(e.target.value)}
                                    placeholder="e.g. Protein Folding"
                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/30 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-6 pt-6">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
                                    <Settings2 size={20} className="text-zinc-500" /> Parameter Field Definitions
                                </h2>
                                <button
                                    onClick={addField}
                                    className="bg-white/5 border border-white/5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-all"
                                >
                                    <Plus size={14} /> Add Parameter
                                </button>
                            </div>

                            <div className="space-y-4">
                                {fields.map((field, idx) => (
                                    <div key={idx} className="bg-zinc-900/30 border border-white/5 p-6 rounded-[2rem] group hover:border-white/10 transition-all">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                            <div className="md:col-span-3 space-y-2">
                                                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Display Label</label>
                                                <input
                                                    value={field.label}
                                                    onChange={(e) => updateField(idx, 'label', e.target.value)}
                                                    placeholder="e.g. Iterations"
                                                    className="w-full bg-transparent border-b border-white/10 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 transiiton-all"
                                                />
                                            </div>
                                            <div className="md:col-span-3 space-y-2">
                                                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Internal ID (Key)</label>
                                                <input
                                                    value={field.key}
                                                    onChange={(e) => updateField(idx, 'key', e.target.value)}
                                                    placeholder="e.g. shots"
                                                    className="w-full bg-transparent border-b border-white/10 py-2 text-sm text-zinc-400 font-mono focus:outline-none focus:border-zinc-500"
                                                />
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Input Type</label>
                                                <select
                                                    value={field.type}
                                                    onChange={(e) => updateField(idx, 'type', e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                                                >
                                                    <option value="text">Text Input</option>
                                                    <option value="number">Numeric</option>
                                                    <option value="range">Range Slider</option>
                                                    <option value="select">Dropdown Selection</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-3 space-y-2">
                                                {field.type === 'select' && (
                                                    <>
                                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Dropdown Options</label>
                                                        <input
                                                            value={field.options?.join(', ')}
                                                            onChange={(e) => updateField(idx, 'options', e.target.value)}
                                                            placeholder="Op1, Op2, Op3"
                                                            className="w-full bg-transparent border-b border-white/10 py-2 text-[10px] text-zinc-500 focus:outline-none"
                                                        />
                                                    </>
                                                )}
                                                {(field.type === 'number' || field.type === 'range') && (
                                                    <>
                                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Default Value</label>
                                                        <input
                                                            value={field.defaultValue}
                                                            onChange={(e) => updateField(idx, 'defaultValue', e.target.value)}
                                                            placeholder="e.g. 1024"
                                                            className="w-full bg-transparent border-b border-white/10 py-2 text-[10px] text-zinc-500 focus:outline-none"
                                                        />
                                                    </>
                                                )}
                                            </div>
                                            <div className="md:col-span-1 flex justify-end">
                                                <button
                                                    onClick={() => removeField(idx)}
                                                    className="text-zinc-700 hover:text-red-400 transition-all p-2 bg-black/20 rounded-xl border border-white/5 hover:border-red-500/20"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {fields.length === 0 && (
                                    <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[3rem] bg-zinc-900/10">
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/5">
                                            <Settings2 className="text-zinc-700" size={32} />
                                        </div>
                                        <p className="text-zinc-600 font-bold uppercase tracking-widest text-[10px]">No Parameters Defined</p>
                                        <p className="text-zinc-500 text-sm mt-1 max-w-xs mx-auto">Add parameter fields to create a specialized input form for this quantum workflow.</p>
                                        <button
                                            onClick={addField}
                                            className="mt-6 px-6 py-2.5 bg-white text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all"
                                        >
                                            Add First Parameter
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

