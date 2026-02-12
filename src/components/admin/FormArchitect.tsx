"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Layers, Settings2, Search, Edit3, CheckCircle2, Code2 } from 'lucide-react';
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
    const [jsonFields, setJsonFields] = useState('[]');
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

    const handleSave = async () => {
        setLoading(true);
        setStatus('Saving...');
        try {
            let parsedFields;
            try {
                parsedFields = JSON.parse(jsonFields);
                if (!Array.isArray(parsedFields)) {
                    throw new Error("Fields must be an array of objects.");
                }
            } catch (e: any) {
                setStatus('Error: ' + (e.message || 'Invalid JSON format'));
                setLoading(false);
                return;
            }

            await axios.post('/api/quantum-forms', {
                industry,
                service,
                problem,
                fields: parsedFields,
                active: true
            });
            setStatus('Form Saved Successfully!');
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
        setJsonFields(JSON.stringify(form.fields || [], null, 2));
        setView('editor');
    };

    const handleJsonChange = (value: string) => {
        setJsonFields(value);
        try {
            const parsed = JSON.parse(value);
            // Smart Paste: If user pastes a full config object, extract fields only
            if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null && parsed.fields && Array.isArray(parsed.fields)) {
                // Remove metadata auto-fill as per user request
                // Replace textarea content with just the fields array
                setJsonFields(JSON.stringify(parsed.fields, null, 2));
                setStatus('✨ Extracted fields from JSON configuration!');
            }
        } catch (e) {
            // Ignore parsing errors while typing
        }
    };

    const resetForm = () => {
        setIndustry('');
        setService('');
        setProblem('');
        setJsonFields('[\n  {\n    "label": "Example Label",\n    "key": "example_key",\n    "type": "text"\n  }\n]');
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
                                <Save size={18} /> {loading ? 'Saving...' : 'Save'}
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
                                list="problems"
                                value={problem}
                                onChange={(e) => setProblem(e.target.value)}
                                placeholder="e.g. Protein Folding"
                                className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                            <datalist id="problems">
                                {(metadata.problemMapping[service] || []).map((p: any) => <option key={p.id} value={p.label} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className="space-y-6 pt-6">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                            <h2 className="text-xl font-black text-foreground flex items-center gap-2 tracking-tight">
                                <Code2 size={20} className="text-muted-foreground" /> Parameter Field Definitions (JSON)
                            </h2>
                        </div>

                        <div className="bg-black/40 rounded-[2.5rem] border border-border p-8 shadow-inner group transition-all hover:border-primary/20">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-4 block">Schema Definition</label>
                            <textarea
                                value={jsonFields}
                                onChange={(e) => handleJsonChange(e.target.value)}
                                placeholder='[{"label": "Iterations", "key": "iters", "type": "number"}]'
                                className="w-full h-96 bg-transparent font-mono text-sm text-primary/80 focus:text-primary outline-none resize-none transition-all scrollbar-hide py-2"
                                spellCheck={false}
                            />
                            <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/50 pulse"></div>
                                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Valid JSON Structure Required</span>
                                    </div>
                                </div>
                                <div className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
                                    Fields: label, key, type [text|number|range|select], options[], defaultValue
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
