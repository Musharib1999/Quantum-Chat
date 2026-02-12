"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Play, Info } from 'lucide-react';

interface IField {
    label: string;
    key: string;
    type: 'text' | 'number' | 'select' | 'range';
    options?: string[];
    description?: string;
    defaultValue?: string;
}

interface IForm {
    _id: string;
    fields: IField[];
    description: string;
}

interface QuantumFormFetcherProps {
    industry: string;
    service: string;
    problem: string;
    onSubmit: (formData: Record<string, any>) => void;
}

export default function QuantumFormFetcher({ industry, service, problem, onSubmit }: QuantumFormFetcherProps) {
    const [form, setForm] = useState<IForm | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchForm = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`/api/quantum-forms?industry=${industry}&service=${service}&problem=${problem}`);
                setForm(data);
                // Set default values
                const defaults: Record<string, any> = {};
                data.fields.forEach((f: IField) => {
                    if (f.defaultValue) defaults[f.key] = f.defaultValue;
                });
                setFormData(defaults);
            } catch (err: any) {
                setError(err.response?.status === 404 ? 'No specialized quantum form mapped for this configuration.' : 'Failed to load quantum form.');
            } finally {
                setLoading(false);
            }
        };

        if (industry && service && problem) {
            fetchForm();
        }
    }, [industry, service, problem]);

    const handleInputChange = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    if (loading) return (
        <div className="p-8 bg-zinc-900/50 border border-white/5 rounded-2xl animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Settings className="text-zinc-600 animate-spin" size={20} />
            </div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Hydrating Quantum Parameters...</p>
        </div>
    );

    if (error) return (
        <div className="p-8 bg-zinc-900/50 border border-white/5 rounded-2xl text-center space-y-3">
            <Info className="text-zinc-600 mx-auto" size={24} />
            <p className="text-zinc-500 text-sm font-medium">{error}</p>
        </div>
    );

    if (!form) return null;

    return (
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 space-y-8 animate-in zoom-in-95 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Quantum Parameters</h3>
                    <p className="text-zinc-500 text-sm mt-1">{form.description || `Configure your ${problem} simulation settings.`}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Settings className="text-white" size={18} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {form.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{field.label}</label>
                        {field.type === 'select' ? (
                            <select
                                value={formData[field.key]}
                                onChange={(e) => handleInputChange(field.key, e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all appearance-none"
                            >
                                {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        ) : field.type === 'range' ? (
                            <div className="pt-2">
                                <input
                                    type="range"
                                    value={formData[field.key] || 0}
                                    onChange={(e) => handleInputChange(field.key, parseInt(e.target.value))}
                                    className="w-full accent-white h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-zinc-600 mt-2 font-mono">
                                    <span>{formData[field.key] || 0}</span>
                                </div>
                            </div>
                        ) : (
                            <input
                                type={field.type === 'number' ? 'number' : 'text'}
                                value={formData[field.key] || ''}
                                onChange={(e) => handleInputChange(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-white/30 transition-all"
                            />
                        )}
                        {field.description && <p className="text-[10px] text-zinc-600 italic">{field.description}</p>}
                    </div>
                ))}
            </div>

            <button
                onClick={() => onSubmit(formData)}
                className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-2xl shadow-white/5"
            >
                <Play size={18} fill="currentColor" /> Execute Quantum Workflow
            </button>
        </div>
    );
}

