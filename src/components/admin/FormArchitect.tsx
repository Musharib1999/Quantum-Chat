"use client";

import React, { useState, useEffect } from 'react';
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

export default function FormArchitect() {
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
        setFields(form.fields || []);
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
        <div className="space-y-8 animate-in fade-in duration-700 h-full overflow-y-auto">
            {view === 'overview' ? (
                <div className="space-y-8 pb-20">
                    <div className="flex items-center justify-between border-b border-border pb-6">
                        <div>
                            <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
                                <Search className="text-muted-foreground" /> Module Overview
                            </h2>
                            <p className="text-muted-foreground mt-1">Manage all active quantum industry modules and their parameter forms.</p>
                        </div>
                        <button
                            onClick={resetForm}
                            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg"
                        >
                            <Plus size={18} /> New Module
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {existingForms.map((form) => (
                            <div key={form._id} className="bg-secondary/20 backdrop-blur-md border border-border p-6 rounded-3xl group hover:border-primary/50 transition-all flex flex-col justify-between min-h-[240px]">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="bg-primary/5 px-2 py-1 rounded text-[10px] font-black text-primary uppercase tracking-widest leading-none border border-primary/10">{form.industry}</div>
                                        {form.active && <CheckCircle2 size={14} className="text-green-500" />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-foreground leading-tight">{form.problem}</h3>
                                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">{form.service}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {form.fields && form.fields.slice(0, 3).map((f, i) => (
                                            <span key={i} className="text-[10px] bg-secondary border border-border px-2 py-0.5 rounded text-muted-foreground">{f.label}</span>
                                        ))}
                                        {form.fields && form.fields.length > 3 && <span className="text-[10px] text-muted-foreground/60">+{form.fields.length - 3} more</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => editForm(form)}
                                    className="mt-6 w-full py-2.5 rounded-xl border border-border text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all flex items-center justify-center gap-2"
                                >
                                    <Edit3 size={14} /> Configure Module
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-8 pb-20">
                    <div className="flex items-center justify-between border-b border-border pb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Layers className="text-primary" size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-foreground tracking-tight">
                                    Form Architect
                                </h1>
                                <p className="text-muted-foreground mt-1">Design parameter fields for <span className="text-primary font-bold">{problem || 'New Problem'}</span></p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setView('overview')}
                                className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:text-foreground transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading || !industry || !service || !problem}
                                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-xl"
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
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Industry</label>
                            <input
                                list="industries"
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                                placeholder="e.g. Biochemistry"
                                className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                            <datalist id="industries">
                                {metadata.industries.map(i => <option key={i.id} value={i.label} />)}
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Service</label>
                            <input
                                list="services"
                                value={service}
                                onChange={(e) => setService(e.target.value)}
                                placeholder="e.g. Simulation"
                                className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                            <datalist id="services">
                                {metadata.services.map(s => <option key={s.id} value={s.label} />)}
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Problem Context</label>
                            <input
                                value={problem}
                                onChange={(e) => setProblem(e.target.value)}
                                placeholder="e.g. Protein Folding"
                                className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-6 pt-6">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                            <h2 className="text-xl font-black text-foreground flex items-center gap-2 tracking-tight">
                                <Settings2 size={20} className="text-muted-foreground" /> Parameter Field Definitions
                            </h2>
                            <button
                                onClick={addField}
                                className="bg-secondary/50 border border-border px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-2 transition-all"
                            >
                                <Plus size={14} /> Add Parameter
                            </button>
                        </div>

                        <div className="space-y-4">
                            {fields.map((field, idx) => (
                                <div key={idx} className="bg-secondary/10 border border-border p-6 rounded-[2rem] group hover:border-primary/20 transition-all">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                        <div className="md:col-span-3 space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Display Label</label>
                                            <input
                                                value={field.label}
                                                onChange={(e) => updateField(idx, 'label', e.target.value)}
                                                placeholder="e.g. Iterations"
                                                className="w-full bg-transparent border-b border-border py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all"
                                            />
                                        </div>
                                        <div className="md:col-span-3 space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Internal ID (Key)</label>
                                            <input
                                                value={field.key}
                                                onChange={(e) => updateField(idx, 'key', e.target.value)}
                                                placeholder="e.g. shots"
                                                className="w-full bg-transparent border-b border-border py-2 text-sm text-muted-foreground font-mono focus:outline-none focus:border-primary/50"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Input Type</label>
                                            <select
                                                value={field.type}
                                                onChange={(e) => updateField(idx, 'type', e.target.value)}
                                                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
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
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Dropdown Options</label>
                                                    <input
                                                        value={field.options?.join(', ')}
                                                        onChange={(e) => updateField(idx, 'options', e.target.value)}
                                                        placeholder="Op1, Op2, Op3"
                                                        className="w-full bg-transparent border-b border-border py-2 text-[10px] text-muted-foreground focus:outline-none"
                                                    />
                                                </>
                                            )}
                                            {(field.type === 'number' || field.type === 'range') && (
                                                <>
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Default Value</label>
                                                    <input
                                                        value={field.defaultValue}
                                                        onChange={(e) => updateField(idx, 'defaultValue', e.target.value)}
                                                        placeholder="e.g. 1024"
                                                        className="w-full bg-transparent border-b border-border py-2 text-[10px] text-muted-foreground focus:outline-none"
                                                    />
                                                </>
                                            )}
                                        </div>
                                        <div className="md:col-span-1 flex justify-end">
                                            <button
                                                onClick={() => removeField(idx)}
                                                className="text-muted-foreground hover:text-destructive transition-all p-2 bg-secondary/20 rounded-xl border border-border hover:border-destructive/20"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {fields.length === 0 && (
                                <div className="text-center py-20 border-2 border-dashed border-border rounded-[3rem] bg-secondary/10">
                                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4 border border-border">
                                        <Settings2 className="text-muted-foreground" size={32} />
                                    </div>
                                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">No Parameters Defined</p>
                                    <p className="text-muted-foreground/60 text-sm mt-1 max-w-xs mx-auto">Add parameter fields to create a specialized input form for this quantum workflow.</p>
                                    <button
                                        onClick={addField}
                                        className="mt-6 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg"
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
    );
}
