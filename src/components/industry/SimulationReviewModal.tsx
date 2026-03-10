"use client";

import React from 'react';
import { X, Play, Building, Zap, Cpu, Clock, Layers, Atom } from 'lucide-react';

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
}

export default function SimulationReviewModal({ isOpen, onClose, onExecute, config, formData, qubits }: SimulationReviewModalProps) {
    if (!isOpen) return null;

    // Filter relevant input details (exclude empty or technical fields if needed)
    const inputEntries = Object.entries(formData).filter(([_, v]) => v !== undefined && v !== '');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card border border-border rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-border flex items-center justify-between bg-secondary/30">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Simulation Review</h2>
                        <p className="text-sm text-muted-foreground italic">Verify your parameters before allocating quantum resources.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-secondary rounded-xl text-muted-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar max-h-[70vh]">
                    
                    {/* 1. Problem Definition */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary font-medium uppercase tracking-widest text-[10px]">
                            <Zap size={12} />
                            Problem Definition
                        </div>
                        <div className="bg-secondary/40 border border-border rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium text-foreground">{config.problem}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">{config.industry} &bull; {config.service}</p>
                            </div>
                            <Building className="text-muted-foreground opacity-20" size={32} />
                        </div>
                    </div>

                    {/* 2. Input Details */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary font-medium uppercase tracking-widest text-[10px]">
                            <Layers size={12} />
                            Input Details
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {inputEntries.map(([key, value]) => (
                                <div key={key} className="p-3 rounded-xl bg-secondary/20 border border-border/50 flex flex-col gap-1">
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                                    <span className="text-sm font-medium text-foreground truncate">
                                        {Array.isArray(value) ? value.join(', ') : String(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. Resource Allocation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-primary font-medium uppercase tracking-widest text-[10px]">
                                <Cpu size={12} />
                                Hardware
                            </div>
                            <div className="p-4 rounded-2xl bg-secondary/40 border border-border">
                                <span className="text-sm font-medium text-foreground">{config.hardware}</span>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] text-green-500 font-bold uppercase">Online</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-primary font-medium uppercase tracking-widest text-[10px]">
                                <Atom size={12} />
                                Qubits
                            </div>
                            <div className="p-4 rounded-2xl bg-secondary/40 border border-border">
                                <span className="text-sm font-medium text-foreground">{qubits} Active Qubits</span>
                                <p className="text-[10px] text-muted-foreground mt-2">Resource allocation confirmed.</p>
                            </div>
                        </div>
                    </div>

                    {/* 4. ETA & Status */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary font-medium uppercase tracking-widest text-[10px]">
                            <Clock size={12} />
                            ETA (Estimated Time)
                        </div>
                        <div className="p-4 rounded-2xl bg-secondary/40 border border-border flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">~45 - 90 Seconds</span>
                            <span className="text-[10px] text-muted-foreground">Queue Position: 1</span>
                        </div>
                    </div>
                </div>

                {/* Footer / Execute Action */}
                <div className="p-6 md:p-8 border-t border-border bg-secondary/10">
                    <button
                        onClick={onExecute}
                        className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-[0.98] shadow-xl shadow-primary/20"
                    >
                        <Play size={18} fill="currentColor" /> Execute Quantum Pipeline
                    </button>
                </div>
            </div>
        </div>
    );
}
