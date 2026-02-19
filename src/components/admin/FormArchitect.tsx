"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Layers, Settings2, Search, Edit3, CheckCircle2, Code2, GripVertical, X, ArrowLeftRight } from 'lucide-react';
import axios from 'axios';

interface IField {
    label: string;
    key: string;
    type: 'text' | 'number' | 'select' | 'multi-select' | 'range';
    options?: (string | { label: string; value: string })[];
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

    // Config State
    const [editorMode, setEditorMode] = useState<'visual' | 'json'>('visual');
    const [fields, setFields] = useState<IField[]>([]);
    const [jsonFields, setJsonFields] = useState('[]');

    // UI State
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [view, setView] = useState<'editor' | 'overview'>('overview');
    const [editingField, setEditingField] = useState<IField | null>(null);
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Data State
    const [existingForms, setExistingForms] = useState<IQuantumForm[]>([]);
    const [metadata, setMetadata] = useState<{ industries: any[], services: any[], problemMapping: any }>({ industries: [], services: [], problemMapping: {} });

    useEffect(() => {
        fetchInitialData();
    }, []);

    // Sync Helper: JSON -> Visual
    const syncJsonToVisual = () => {
        try {
            const parsed = JSON.parse(jsonFields);
            if (Array.isArray(parsed)) {
                setFields(parsed);
            }
        } catch (e) {
            // Invalid JSON, don't overwrite visual state yet
            console.warn("Invalid JSON during sync");
        }
    };

    // Sync Helper: Visual -> JSON
    const syncVisualToJson = (currentFields: IField[]) => {
        setJsonFields(JSON.stringify(currentFields, null, 2));
    };

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
            let payload: any = {
                industry,
                service,
                problem,
                active: true,
                fields: []
            };

            if (editorMode === 'json') {
                try {
                    const parsed = JSON.parse(jsonFields);
                    if (Array.isArray(parsed)) {
                        payload.fields = parsed;
                    } else if (typeof parsed === 'object' && parsed !== null) {
                        // Handle full form object (e.g. copied from chat)
                        if (parsed.sections) {
                            payload.sections = parsed.sections;
                            // Validate sections have fields
                            payload.sections.forEach((sec: any) => {
                                if (!sec.fields || !Array.isArray(sec.fields)) {
                                    throw new Error(`Section "${sec.section_name}" missing fields array.`);
                                }
                            });
                        }
                        if (parsed.fields && Array.isArray(parsed.fields)) {
                            payload.fields = parsed.fields;
                        }
                        // Allow JSON to override metadata keys if present
                        if (parsed.industry) payload.industry = parsed.industry;
                        if (parsed.service) payload.service = parsed.service;
                        if (parsed.problem) payload.problem = parsed.problem;
                    } else {
                        throw new Error("Invalid JSON: Must be an Array of fields or a Form Object.");
                    }
                } catch (e: any) {
                    throw new Error("Invalid JSON: " + e.message);
                }
            } else {
                payload.fields = fields;
            }

            // Normalize Fields (Top-level)
            if (payload.fields && payload.fields.length > 0) {
                payload.fields = payload.fields.map((f: any) => normalizeField(f));
            }

            // Normalize Fields (Inside Sections)
            if (payload.sections) {
                payload.sections = payload.sections.map((sec: any) => ({
                    ...sec,
                    fields: sec.fields.map((f: any) => normalizeField(f))
                }));
            }

            // Update UI state if metadata changed via JSON
            if (payload.industry) setIndustry(payload.industry);
            if (payload.service) setService(payload.service);
            if (payload.problem) setProblem(payload.problem);

            await axios.post('/api/quantum-forms', payload);
            setStatus('Form Saved Successfully!');
            fetchInitialData();
            setTimeout(() => setView('overview'), 1500);
        } catch (error: any) {
            setStatus('Error: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const normalizeField = (f: any) => {
        if (!f.key && f.label) {
            f.key = f.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
        }
        if (!f.key) throw new Error(`Field "${f.label || 'Unknown'}" is missing a unique "key".`);
        if (!f.type) f.type = 'text';
        return f;
    };

    const editForm = (form: IQuantumForm) => {
        setIndustry(form.industry);
        setService(form.service);
        setProblem(form.problem);
        setFields(form.fields || []);
        setJsonFields(JSON.stringify(form.fields || [], null, 2));
        setView('editor');
        setEditorMode('visual'); // Default to visual for ease
    };

    const resetForm = () => {
        setIndustry('');
        setService('');
        setProblem('');
        setFields([]);
        setJsonFields('[]');
        setView('editor');
        setEditorMode('visual');
    };

    // --- Visual Editor Handlers ---

    const openNewFieldModal = () => {
        setEditingField({
            label: '',
            key: '',
            type: 'text',
            options: [],
            description: '',
            defaultValue: ''
        });
        setEditingFieldIndex(null);
        setIsEditModalOpen(true);
    };

    const openEditFieldModal = (field: IField, index: number) => {
        setEditingField({ ...field });
        setEditingFieldIndex(index);
        setIsEditModalOpen(true);
    };

    const saveField = () => {
        if (!editingField || !editingField.label) {
            alert("Label is required");
            return;
        }

        // Auto-generate key if empty
        const fieldToSave = { ...editingField };
        if (!fieldToSave.key) {
            fieldToSave.key = fieldToSave.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
        }

        const newFields = [...fields];
        if (editingFieldIndex !== null) {
            newFields[editingFieldIndex] = fieldToSave;
        } else {
            newFields.push(fieldToSave);
        }

        setFields(newFields);
        syncVisualToJson(newFields); // Keep JSON in sync
        setIsEditModalOpen(false);
        setEditingField(null);
        setEditingFieldIndex(null);
    };

    const deleteField = (index: number) => {
        if (confirm("Delete this field?")) {
            const newFields = fields.filter((_, i) => i !== index);
            setFields(newFields);
            syncVisualToJson(newFields);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 h-full overflow-y-auto pb-20">
            {view === 'overview' ? (
                <div className="space-y-8">
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
                <div className="space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border pb-6 sticky top-0 bg-background/95 backdrop-blur z-10 pt-2">
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
                                <Save size={18} /> {loading ? 'Saving...' : 'Save Module'}
                            </button>
                        </div>
                    </div>

                    {status && (
                        <div className={`p-4 rounded-xl text-sm font-medium animate-in slide-in-from-top-2 duration-500 ${status.includes('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                            {status}
                        </div>
                    )}

                    {/* Meta Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Industry</label>
                            <input
                                list="industries"
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                                placeholder="e.g. Biochemistry"
                                className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
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
                                className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
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
                                className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            />
                            <datalist id="problems">
                                {(metadata.problemMapping[industry]?.[service] || []).map((p: any) => <option key={p.id} value={p.label} />)}
                            </datalist>
                        </div>
                    </div>

                    {/* Builder Area */}
                    <div className="space-y-6 pt-6 bg-card/30 rounded-3xl p-6 border border-border/50">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-foreground flex items-center gap-2 tracking-tight">
                                <Settings2 size={20} className="text-primary" /> Parameter Definition
                            </h2>
                            <div className="flex items-center bg-secondary/50 rounded-lg p-1 border border-border">
                                <button
                                    onClick={() => { syncJsonToVisual(); setEditorMode('visual'); }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${editorMode === 'visual' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Visual Builder
                                </button>
                                <button
                                    onClick={() => { syncVisualToJson(fields); setEditorMode('json'); }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${editorMode === 'json' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    JSON Editor
                                </button>
                            </div>
                        </div>

                        {editorMode === 'visual' ? (
                            <div className="space-y-4">
                                {fields.length === 0 && (
                                    <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-secondary/10">
                                        <p className="text-sm text-muted-foreground mb-4">No parameters defined yet.</p>
                                        <button onClick={openNewFieldModal} className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-bold text-xs hover:bg-primary/20 transition-colors">
                                            + Add First Parameter
                                        </button>
                                    </div>
                                )}
                                <div className="grid gap-3">
                                    {fields.map((field, idx) => (
                                        <div key={idx} className="bg-card border border-border p-4 rounded-xl flex items-center justify-between group hover:border-primary/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-secondary rounded-lg text-muted-foreground cursor-grab active:cursor-grabbing">
                                                    <GripVertical size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-foreground">{field.label}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{field.key}</span>
                                                        <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{field.type}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditFieldModal(field, idx)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground">
                                                    <Edit3 size={16} />
                                                </button>
                                                <button onClick={() => deleteField(idx)} className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-400">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={openNewFieldModal}
                                    className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-secondary/30 transition-all font-bold text-sm flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> Add Parameter
                                </button>
                            </div>
                        ) : (
                            <div className="bg-black/40 rounded-2xl border border-border p-6 shadow-inner">
                                <textarea
                                    value={jsonFields}
                                    onChange={(e) => setJsonFields(e.target.value)}
                                    className="w-full h-96 bg-transparent font-mono text-sm text-green-400 focus:outline-none resize-none"
                                    spellCheck={false}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30">
                            <h3 className="font-bold text-foreground">
                                {editingFieldIndex !== null ? 'Edit Parameter' : 'New Parameter'}
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)}><X size={20} className="text-muted-foreground" /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Label</label>
                                    <input
                                        value={editingField?.label}
                                        onChange={e => setEditingField(prev => prev ? ({ ...prev, label: e.target.value }) : null)}
                                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                        placeholder="e.g. Iterations"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Key (Auto)</label>
                                    <input
                                        value={editingField?.key}
                                        onChange={e => setEditingField(prev => prev ? ({ ...prev, key: e.target.value }) : null)}
                                        className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm font-mono text-muted-foreground focus:outline-none focus:border-primary"
                                        placeholder="iterations"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['text', 'number', 'select', 'multi-select', 'range'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setEditingField(prev => prev ? ({ ...prev, type: t as any }) : null)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${editingField?.type === t ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary border-transparent text-muted-foreground hover:bg-secondary/80'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {(editingField?.type === 'select' || editingField?.type === 'multi-select') && (
                                <div className="space-y-2 p-4 bg-secondary/30 rounded-xl border border-border">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Options (Comma Separated)</label>
                                    <textarea
                                        value={editingField?.options?.map(o => typeof o === 'string' ? o : o.label).join(', ')}
                                        onChange={(e) => {
                                            const opts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                            setEditingField(prev => prev ? ({ ...prev, options: opts }) : null);
                                        }}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary h-20 resize-none"
                                        placeholder="e.g. Option A, Option B, Option C"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Description</label>
                                <input
                                    value={editingField?.description}
                                    onChange={e => setEditingField(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                    placeholder="Helper text for the user..."
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-border bg-secondary/30 flex justify-end gap-3">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-muted-foreground hover:text-foreground">Cancel</button>
                            <button onClick={saveField} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 shadow-lg">
                                {editingFieldIndex !== null ? 'Update Parameter' : 'Add Parameter'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
