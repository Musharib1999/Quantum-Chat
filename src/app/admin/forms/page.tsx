"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Plus, Trash2, Save, Layers, Settings2 } from 'lucide-react';
import axios from 'axios';

interface IField {
    label: string;
    key: string;
    type: 'text' | 'number' | 'select' | 'range';
    options?: string[];
    description?: string;
}

export default function AdminFormsPage() {
    const [industry, setIndustry] = useState('');
    const [service, setService] = useState('');
    const [problem, setProblem] = useState('');
    const [fields, setFields] = useState<IField[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

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
        } catch (error: any) {
            setStatus('Error: ' + error.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout
            currentMode="industry"
            sidebarContent={<div className="p-6 text-zinc-500 text-xs font-bold uppercase tracking-widest">Admin Control</div>}
        >
            <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <Layers className="text-zinc-400" /> Quantum Form Architect
                        </h1>
                        <p className="text-zinc-500 mt-1">Design and map dynamic parameter inputs for specific Industry workflows.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={loading || !industry || !service || !problem}
                        className="bg-white text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-200 transition-all disabled:opacity-50"
                    >
                        <Save size={18} /> {loading ? 'Saving...' : 'Save Mapping'}
                    </button>
                </div>

                {status && (
                    <div className={`p-4 rounded-xl text-sm font-medium ${status.includes('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                        {status}
                    </div>
                )}

                <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Industry</label>
                        <input
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            placeholder="e.g. Biochemistry"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Service</label>
                        <input
                            value={service}
                            onChange={(e) => setService(e.target.value)}
                            placeholder="e.g. Molecular Docking"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Problem</label>
                        <input
                            value={problem}
                            onChange={(e) => setProblem(e.target.value)}
                            placeholder="e.g. Binding Energy"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Settings2 size={18} className="text-zinc-500" /> Parameter Fields
                        </h2>
                        <button
                            onClick={addField}
                            className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-all"
                        >
                            <Plus size={14} /> Add Parameter
                        </button>
                    </div>

                    <div className="space-y-3">
                        {fields.map((field, idx) => (
                            <div key={idx} className="bg-zinc-900/50 border border-white/5 p-5 rounded-2xl group animate-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                <div className="grid grid-cols-12 gap-4 items-start">
                                    <div className="col-span-3 space-y-1">
                                        <input
                                            value={field.label}
                                            onChange={(e) => updateField(idx, 'label', e.target.value)}
                                            placeholder="Label (e.g. Num Qubits)"
                                            className="w-full bg-transparent border-b border-white/10 py-1 text-sm text-white focus:outline-none focus:border-zinc-500"
                                        />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                        <input
                                            value={field.key}
                                            onChange={(e) => updateField(idx, 'key', e.target.value)}
                                            placeholder="Key (e.g. num_qubits)"
                                            className="w-full bg-transparent border-b border-white/10 py-1 text-sm text-zinc-400 font-mono focus:outline-none focus:border-zinc-500"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <select
                                            value={field.type}
                                            onChange={(e) => updateField(idx, 'type', e.target.value)}
                                            className="w-full bg-zinc-800 text-xs rounded-lg px-2 py-2 text-zinc-300 focus:outline-none"
                                        >
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="range">Range</option>
                                            <option value="select">Select</option>
                                        </select>
                                    </div>
                                    <div className="col-span-3">
                                        {field.type === 'select' && (
                                            <input
                                                onChange={(e) => updateField(idx, 'options', e.target.value)}
                                                placeholder="Options (comma separated)"
                                                className="w-full bg-transparent border-b border-white/10 py-1 text-[10px] text-zinc-500 focus:outline-none"
                                            />
                                        )}
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <button
                                            onClick={() => removeField(idx)}
                                            className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {fields.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
                                <p className="text-zinc-600 text-sm">No parameters defined. Add one to get started.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
