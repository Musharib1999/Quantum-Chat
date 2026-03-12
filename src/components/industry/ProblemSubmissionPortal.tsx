"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Code, Terminal, CheckCircle2, ChevronRight, ChevronLeft, Layout, Send, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Field {
    label: string;
    key: string;
    type: 'text' | 'number' | 'select' | 'range' | 'textarea';
    required: boolean;
    options?: string[];
}

interface ProblemSubmissionPortalProps {
    industry: string;
    service: string;
    hardware: string;
    userEmail: string;
    onReset: () => void;
}

export default function ProblemSubmissionPortal({ industry, service, hardware, userEmail, onReset }: ProblemSubmissionPortalProps) {
    const [step, setStep] = useState(1);
    const [problemName, setProblemName] = useState('');
    const [description, setDescription] = useState('');
    const [fields, setFields] = useState<Field[]>([
        { label: 'Sample Parameter', key: 'sample_param', type: 'number', required: true }
    ]);
    const [quantumCode, setQuantumCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const addField = () => {
        setFields([...fields, { label: '', key: '', type: 'text', required: true }]);
    };

    const removeField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const updateField = (index: number, updates: Partial<Field>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        setFields(newFields);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await axios.post('/api/industry/submit', {
                industry,
                service,
                hardware,
                problem: problemName,
                description,
                fields,
                code: quantumCode,
                userEmail
            });
            setIsSubmitted(true);
        } catch (error) {
            console.error("Submission failed:", error);
            alert("Failed to submit experiment. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center p-12 text-center space-y-6"
            >
                <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={48} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-foreground">Submission Successful</h2>
                    <p className="text-muted-foreground text-lg max-w-md">
                        Your experiment <strong>{problemName}</strong> has been submitted. It will be live in your dashboard once approved by an admin.
                    </p>
                </div>
                <button
                    onClick={onReset}
                    className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
                >
                    Back to Industry
                </button>
            </motion.div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-8">
            {/* Progress Header */}
            <div className="flex items-center justify-between mb-8 px-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                            step >= i ? 'bg-[#3066bb] text-white shadow-lg' : 'bg-muted text-muted-foreground'
                        }`}>
                            {i}
                        </div>
                        {i < 3 && (
                            <div className={`h-1 w-12 md:w-24 mx-2 rounded-full transition-all ${
                                step > i ? 'bg-[#3066bb]' : 'bg-muted'
                            }`} />
                        )}
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div 
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6 bg-card border border-border p-8 rounded-[32px] shadow-sm"
                    >
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-[#111827] dark:text-foreground">Problem Identity</h2>
                            <p className="text-muted-foreground">Give your quantum experiment a clear name and mission.</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground/70 ml-1">Problem Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Molecular Docking Optimization"
                                    value={problemName}
                                    onChange={(e) => setProblemName(e.target.value)}
                                    className="w-full p-4 bg-secondary/50 border border-border rounded-2xl focus:ring-2 focus:ring-[#3066bb] outline-none transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground/70 ml-1">Description</label>
                                <textarea 
                                    placeholder="Describe the scientific or business objective..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className="w-full p-4 bg-secondary/50 border border-border rounded-2xl focus:ring-2 focus:ring-[#3066bb] outline-none transition-all font-medium resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={() => setStep(2)}
                                disabled={!problemName}
                                className="px-8 py-3.5 bg-[#3066bb] text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-[#3066bb]/90 transition-all disabled:opacity-50"
                            >
                                Next Step <ChevronRight size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div 
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="bg-card border border-border p-8 rounded-[32px] shadow-sm space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-[#111827] dark:text-foreground line-clamp-1">Define Input Parameters</h2>
                                    <p className="text-muted-foreground line-clamp-1">Add variables that users will input to run this experiment.</p>
                                </div>
                                <button
                                    onClick={addField}
                                    className="px-4 py-2 bg-[#3066bb]/10 text-[#3066bb] rounded-xl font-bold flex items-center gap-2 hover:bg-[#3066bb]/20 transition-all border border-[#3066bb]/20 w-fit"
                                >
                                    <Plus size={18} /> Add Parameter
                                </button>
                            </div>

                            <div className="space-y-3 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar">
                                {fields.map((field, idx) => (
                                    <div key={idx} className="p-5 bg-secondary/30 border border-border rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end group">
                                        <div className="space-y-1.5 md:col-span-1">
                                            <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider ml-1">Label</label>
                                            <input 
                                                type="text"
                                                placeholder="e.g. Iterations"
                                                value={field.label}
                                                onChange={(e) => updateField(idx, { label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                                className="w-full p-2.5 bg-white border border-border rounded-xl focus:ring-2 focus:ring-[#3066bb] outline-none text-sm font-medium"
                                            />
                                        </div>
                                        <div className="space-y-1.5 md:col-span-1">
                                            <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider ml-1">Unique Key</label>
                                            <input 
                                                type="text"
                                                placeholder="e.g. iter_count"
                                                value={field.key}
                                                readOnly
                                                className="w-full p-2.5 bg-muted/30 border border-border rounded-xl text-sm font-mono text-muted-foreground"
                                            />
                                        </div>
                                        <div className="space-y-1.5 md:col-span-1">
                                            <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider ml-1">Type</label>
                                            <select 
                                                value={field.type}
                                                onChange={(e) => updateField(idx, { type: e.target.value as any })}
                                                className="w-full p-2.5 bg-white border border-border rounded-xl focus:ring-2 focus:ring-[#3066bb] outline-none text-sm font-medium"
                                            >
                                                <option value="text">Text</option>
                                                <option value="number">Number</option>
                                                <option value="range">Range</option>
                                                <option value="select">Select</option>
                                                <option value="textarea">Multi-line</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => removeField(idx)}
                                            className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all h-[42px] flex items-center justify-center border border-transparent hover:border-red-500/20"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between pt-6">
                                <button
                                    onClick={() => setStep(1)}
                                    className="px-6 py-3 text-muted-foreground font-bold flex items-center gap-2 hover:bg-secondary rounded-2xl transition-all"
                                >
                                    <ChevronLeft size={18} /> Back
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={fields.length === 0 || fields.some(f => !f.label)}
                                    className="px-8 py-3.5 bg-[#3066bb] text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-[#3066bb]/90 transition-all shadow-lg shadow-[#3066bb]/20 disabled:opacity-50"
                                >
                                    Code Configuration <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div 
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="bg-card border border-border p-8 rounded-[32px] shadow-sm space-y-6">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-[#111827] dark:text-foreground">Quantum Script (Optional)</h2>
                                <p className="text-muted-foreground">Attach the Qiskit or D-Wave Python code for this experiment.</p>
                            </div>

                            <div className="relative group">
                                <div className="absolute top-4 left-4 p-2 bg-[#3066bb]/10 text-[#3066bb] rounded-lg">
                                    <Terminal size={18} />
                                </div>
                                <textarea 
                                    value={quantumCode}
                                    onChange={(e) => setQuantumCode(e.target.value)}
                                    placeholder="import qiskit\n# User parameters are available as 'parameters.key'\n# e.g. circuit = QuantumCircuit(parameters.iterations)..."
                                    className="w-full p-12 bg-[#1e1e1e] text-green-400 font-mono text-sm rounded-2xl focus:ring-2 focus:ring-[#3066bb] outline-none h-80 shadow-inner scrollbar-none"
                                />
                            </div>

                            <div className="flex justify-between pt-6">
                                <button
                                    onClick={() => setStep(2)}
                                    className="px-6 py-3 text-muted-foreground font-bold flex items-center gap-2 hover:bg-secondary rounded-2xl transition-all"
                                >
                                    <ChevronLeft size={18} /> Parameters
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="px-10 py-3.5 bg-[#3066bb] text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-[#3066bb]/90 transition-all shadow-xl shadow-[#3066bb]/30 active:scale-[0.98]"
                                >
                                    {isSubmitting ? <><Loader2 className="animate-spin" size={18} /> Submitting...</> : <><Send size={18} /> Final Submission</>}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
