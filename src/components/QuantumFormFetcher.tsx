"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Play, Info, Layers, ChevronDown, Building } from 'lucide-react';

interface IField {
    label: string;
    key: string;
    type: 'text' | 'number' | 'select' | 'multi-select' | 'range' | 'textarea' | 'dropdown';
    options?: (string | { label: string; value: string })[];
    description?: string;
    defaultValue?: string;
    required?: boolean;
}
interface IForm {
    _id: string;
    fields: IField[];
    sections?: { section_name: string; fields: IField[] }[];
    description: string;
    batchingEnabled?: boolean;
    maxQubitsPerBatch?: number;
    qubitFormula?: string;
    batchKey?: string;
}

interface QuantumFormFetcherProps {
    industry: string;
    service: string;
    problem: string;
    hardware: string;
    initialData?: Record<string, any>;
    onSubmit: (formData: Record<string, any>, qubits: number) => void;
}

export default function QuantumFormFetcher({ industry, service, problem, hardware, initialData, onSubmit }: QuantumFormFetcherProps) {
    const [form, setForm] = useState<IForm | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});
    const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = () => setOpenDropdowns({});
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchForm = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`/api/quantum-forms?industry=${industry}&service=${service}&problem=${problem}&hardware=${hardware}`);
                setForm(data);
                // Set default values
                const defaults: Record<string, any> = {};
                if (data.fields) {
                    data.fields.forEach((f: IField) => {
                        if (f.defaultValue) defaults[f.key] = f.defaultValue;
                    });
                }
                // Merge with initialData if provided (for re-runs)
                setFormData({ ...defaults, ...initialData });
            } catch (err: any) {
                setError(err.response?.status === 404 ? 'No specialized quantum form mapped for this configuration.' : 'Failed to load quantum form.');
            } finally {
                setLoading(false);
            }
        };

        if (industry && service && problem && hardware) {
            fetchForm();
        }
    }, [industry, service, problem, hardware]);

    const handleInputChange = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const calculateComplexity = () => {
        if (!form || !form.qubitFormula) return { qubits: 0, batches: 1 };

        let formula = form.qubitFormula;

        // 1. Replace known parameters
        Object.keys(formData).forEach(key => {
            const val = formData[key] === undefined || formData[key] === '' ? 0 : formData[key];
            const regex = new RegExp(`{{${key}}}`, 'g');
            formula = formula.replace(regex, String(val));
        });

        // 2. Replace any remaining {{...}} with 0 to avoid eval errors
        formula = formula.replace(/{{[^}]+}}/g, '0');

        try {
            // Basic math evaluation
            const sanitized = formula.replace(/[^0-9+\-*/().\s]/g, '');
            const qubits = Math.max(0, Math.ceil(eval(sanitized) || 0));

            let batches = 1;
            if (form.batchingEnabled && form.maxQubitsPerBatch && qubits > form.maxQubitsPerBatch) {
                batches = Math.ceil(qubits / form.maxQubitsPerBatch);
            }

            return { qubits, batches };
        } catch (e) {
            console.error("Complexity calculation error:", e);
            return { qubits: 0, batches: 1, error: true };
        }
    };

    const { qubits, batches } = calculateComplexity();

    const renderField = (field: IField) => {
        // Map 'dropdown' to 'select' for compatibility
        const effectiveType = field.type === 'dropdown' ? 'select' : field.type;

        return (
            <div key={field.key} className="space-y-2 relative">
                <label className="text-xs font-medium text-muted-foreground">
                    {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>
                {effectiveType === 'select' ? (
                    <div className="relative">
                        <select
                            value={formData[field.key] || ''}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-ring transition-all appearance-none"
                        >
                            <option value="" disabled>Select option</option>
                            {field.options?.map((opt: any) => {
                                const label = typeof opt === 'string' ? opt : opt.label;
                                const value = typeof opt === 'string' ? opt : opt.value;
                                return <option key={value} value={value}>{label}</option>;
                            })}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                            <Play size={10} className="rotate-90" />
                        </div>
                    </div>
                ) : effectiveType === 'multi-select' ? (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setOpenDropdowns(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                            className={`w-full bg-secondary/50 border rounded-xl px-4 py-3 text-left transition-all duration-300 min-h-[50px] flex flex-wrap gap-2 items-center group ${openDropdowns[field.key] ? 'border-ring ring-1 ring-ring/20' : 'border-border hover:border-ring/50'}`}
                        >
                            {(formData[field.key] || []).length > 0 ? (
                                (formData[field.key] || []).map((val: string) => {
                                    const opt = field.options?.find(o => (typeof o === 'string' ? o : o.value) === val);
                                    const label = opt ? (typeof opt === 'string' ? opt : opt.label) : val;
                                    return (
                                        <span
                                            key={val}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#3066bb] text-white text-[11px] font-semibold shadow-sm animate-in zoom-in-95"
                                        >
                                            {label}
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const next = (formData[field.key] || []).filter((v: any) => v !== val);
                                                    handleInputChange(field.key, next);
                                                }}
                                                className="hover:bg-white/20 rounded-full p-0.5 transition-colors cursor-pointer"
                                            >
                                                <Play size={8} className="rotate-45" />
                                            </span>
                                        </span>
                                    );
                                })
                            ) : (
                                <span className="text-muted-foreground/50 text-sm">Select options...</span>
                            )}
                            <div className="ml-auto text-muted-foreground group-hover:text-foreground transition-colors">
                                <ChevronDown size={14} className={`transition-transform duration-300 ${openDropdowns[field.key] ? 'rotate-180' : ''}`} />
                            </div>
                        </button>

                        {openDropdowns[field.key] && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-2xl border border-border shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                <div className="max-h-60 overflow-y-auto p-2 space-y-1 scrollbar-hide">
                                    {field.options?.map((opt: any) => {
                                        const label = typeof opt === 'string' ? opt : opt.label;
                                        const value = typeof opt === 'string' ? opt : opt.value;
                                        const isSelected = (formData[field.key] || []).includes(value);

                                        return (
                                            <div
                                                key={value}
                                                onClick={() => {
                                                    const current = formData[field.key] || [];
                                                    const next = isSelected
                                                        ? current.filter((v: any) => v !== value)
                                                        : [...current, value];
                                                    handleInputChange(field.key, next);
                                                }}
                                                className={`flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                <span className="text-xs font-medium">{label}</span>
                                                {isSelected && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(48,102,187,0.5)]" />
                                                )}
                                            </div>
                                        );
                                    })}
                                    {(!field.options || field.options.length === 0) && (
                                        <p className="text-[10px] text-muted-foreground italic p-4 text-center">No options available</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : effectiveType === 'range' ? (
                    <div className="pt-2">
                        <input
                            type="range"
                            value={formData[field.key] || 0}
                            onChange={(e) => handleInputChange(field.key, parseInt(e.target.value))}
                            className="w-full accent-primary h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-2 font-mono">
                            <span>{formData[field.key] || 0}</span>
                        </div>
                    </div>
                ) : effectiveType === 'textarea' ? (
                    <textarea
                        value={formData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-ring transition-all min-h-[100px]"
                        placeholder={field.description || "Enter details..."}
                    />
                ) : (
                    <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-ring transition-all"
                        placeholder={field.description}
                    />
                )}
                {field.description && <p className="text-[10px] text-muted-foreground italic">{field.description}</p>}
            </div>
        );
    };

    if (loading) return (
        <div className="p-8 bg-card border border-border rounded-2xl animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center">
                <Settings className="text-muted-foreground animate-spin" size={20} />
            </div>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Loading input data form</p>
        </div>
    );

    if (error) return (
        <div className="p-8 bg-card border border-border rounded-2xl text-center space-y-3">
            <Info className="text-muted-foreground mx-auto" size={24} />
            <p className="text-muted-foreground text-sm font-medium">{error}</p>
        </div>
    );

    if (!form) return null;

    return (
        <div className="bg-card backdrop-blur-xl border border-border rounded-3xl p-6 md:p-8 space-y-8 animate-in zoom-in-95 duration-700 shadow-sm">
            <div className="space-y-8">
                {form.sections && form.sections.length > 0 ? (
                    form.sections.map((section, idx) => (
                        <div key={idx} className="space-y-4">
                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50 pb-2">{section.section_name}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {section.fields.map((field) => renderField(field))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {form.fields.map((field) => renderField(field))}
                    </div>
                )}
            </div>


            <button
                onClick={() => onSubmit(formData, qubits)}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-black/5"
            >
                Next <ChevronDown size={18} className="-rotate-90" />
            </button>
        </div>
    );
}

