"use client";

import React from 'react';
import { X, Play } from 'lucide-react';
import { getQuantumStateSpaceName } from '@/lib/quantum-utils';

interface SimulationReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExecute: () => void;
    config: {
        industry: string | null;
        problem: string | null;
        service: string | null;
        hardware: string | null;
    };
    formData: Record<string, any>;
    qubits: number;
    batches: number;
}

export default function SimulationReviewModal({ isOpen, onClose, onExecute, config, formData, qubits, batches }: SimulationReviewModalProps) {
    if (!isOpen) return null;

    // Filter relevant input details (exclude empty or technical fields if needed)
    const inputEntries = Object.entries(formData).filter(([_, v]) => v !== undefined && v !== '');

    const formatETA = (seconds: number) => {
        if (seconds < 60) return `~${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `~${mins}m${secs > 0 ? ` ${secs}s` : ''}`;
    };

    const formatLabel = (key: string) => {
        return key.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card border border-border rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-border flex items-center justify-between bg-white dark:bg-card">
                    <div className="space-y-1">
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-secondary rounded-xl text-muted-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar max-h-[75vh]">
                    
                    <div className="space-y-4">
                        <div className="bg-secondary/40 border border-border rounded-2xl p-6">
                            <h3 className="text-xl font-bold text-[#111827] dark:text-foreground tracking-tight">{config.problem}</h3>
                            <p className="text-sm text-[#111827]/70 mt-1 mb-6 flex items-center gap-2">
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{config.industry}</span>
                                <span className="text-border">|</span>
                                <span className="font-medium text-sm">{config.service}</span>
                            </p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 pt-6 border-t border-border">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm text-[#111827]/60 font-semibold tracking-wide">Hardware</span>
                                    <span className="text-sm text-[#111827] dark:text-foreground font-bold">{config.hardware}</span>
                                </div>
                                <div className="flex flex-col gap-1 md:border-l md:border-border md:pl-6">
                                    <span className="text-sm text-[#111827]/60 font-semibold tracking-wide">Scale</span>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-[#111827] dark:text-foreground font-bold">{qubits} Qubits</span>
                                        <span className="text-sm text-[#3066bb] font-bold">
                                            {getQuantumStateSpaceName(qubits)} States
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 md:border-l md:border-border md:pl-6">
                                    <span className="text-sm text-[#111827]/60 font-semibold tracking-wide">ETA</span>
                                    <span className="text-sm text-[#111827] dark:text-foreground font-bold">{formatETA(batches * 25)}</span>
                                </div>
                                <div className="flex flex-col gap-1 md:border-l md:border-border md:pl-6">
                                    <span className="text-sm text-[#111827]/60 font-semibold tracking-wide">Batches</span>
                                    <span className="text-sm text-[#111827] dark:text-foreground font-bold">{batches}</span>
                                </div>
                                <div className="flex flex-col gap-1 md:border-l md:border-border md:pl-6">
                                    <span className="text-sm text-[#111827]/60 font-semibold tracking-wide">Queue</span>
                                    <span className="text-sm text-[#111827] dark:text-foreground font-bold">#1</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Input Details */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <span className="text-[#111827] font-bold text-sm tracking-wide">Solution Parameters</span>
                            <div className="h-px bg-border flex-1" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {inputEntries.map(([key, value]) => (
                                <div key={key} className="p-4 rounded-2xl bg-white dark:bg-card border border-border flex flex-col gap-1.5 hover:shadow-md transition-all duration-300">
                                    <span className="text-sm text-[#111827]/60 font-semibold tracking-wide">{formatLabel(key)}</span>
                                    <span className="text-sm font-bold text-[#111827] dark:text-foreground truncate">
                                        {Array.isArray(value) ? value.join(', ') : String(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer / Execute Action */}
                <div className="p-6 md:p-8 border-t border-border bg-white dark:bg-card">
                    <button
                        onClick={onExecute}
                        className="w-full bg-[#3066bb] text-white py-4.5 rounded-2xl font-bold text-base flex items-center justify-center gap-3 hover:bg-[#3066bb]/90 transition-all active:scale-[0.99] shadow-xl shadow-[#3066bb]/20"
                    >
                        <Play size={18} fill="currentColor" />
                        Execute
                    </button>
                </div>
            </div>
        </div>
    );
}
