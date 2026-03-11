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
                        <p className="text-base font-medium text-gray-900 dark:text-foreground">Verify your parameters before allocating quantum resources.</p>
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
                    
                    <div className="space-y-4">
                        <div className="text-primary font-medium text-[10px]">
                            Problem Definition
                        </div>
                        <div className="bg-secondary/40 border border-border rounded-2xl p-4">
                            <h3 className="text-lg font-medium text-foreground">{config.problem}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{config.industry} &bull; {config.service}</p>
                        </div>
                    </div>

                    {/* 2. Input Details */}
                    <div className="space-y-4">
                        <div className="text-primary font-medium text-[10px]">
                            Input Details
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {inputEntries.map(([key, value]) => (
                                <div key={key} className="p-3 rounded-xl bg-secondary/20 border border-border/50 flex flex-col gap-1">
                                    <span className="text-[10px] text-muted-foreground font-medium">{key.replace(/_/g, ' ')}</span>
                                    <span className="text-sm font-medium text-foreground truncate">
                                        {Array.isArray(value) ? value.join(', ') : String(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. Resource & Queue Metrics */}
                    <div className="space-y-4">
                        <div className="text-primary font-medium text-[10px]">
                            Resource Allocation & Status
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-secondary/40 border border-border rounded-2xl p-4">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground font-medium">Hardware</span>
                                <span className="text-xs font-semibold text-foreground truncate">{config.hardware}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground font-medium">Qubits</span>
                                <span className="text-xs font-semibold text-foreground truncate">{qubits} Active</span>
                                <span className="text-[9px] text-primary/80 font-medium">
                                    {getQuantumStateSpaceName(qubits)} States
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground font-medium">ETA</span>
                                <span className="text-xs font-semibold text-foreground">~45-90s</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground font-medium">Queue</span>
                                <span className="text-xs font-semibold text-foreground">Queue : 1</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / Execute Action */}
                <div className="p-6 md:p-8 border-t border-border bg-secondary/10">
                    <button
                        onClick={onExecute}
                        className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-[0.98] shadow-xl shadow-primary/20"
                    >
                        Execute
                    </button>
                </div>
            </div>
        </div>
    );
}
