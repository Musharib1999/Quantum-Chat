"use client";

import React from 'react';
import { Check, Zap, Briefcase, Cpu } from 'lucide-react';

interface SidebarWizardProps {
    step: 'industry' | 'service' | 'problem' | 'hardware' | 'ready';
    config: {
        industry: string | null;
        service: string | null;
        problem: string | null;
        hardware: string | null;
    };
    metadata: {
        industries: { id: string, label: string, icon?: string }[];
        services: { id: string, label: string, icon?: string }[];
        problemMapping: Record<string, { id: string, label: string }[]>;
    };
    onSelect: (type: 'industry' | 'service' | 'problem' | 'hardware', value: string) => void;
}

const HARDWARE = [
    { id: 'ibm', label: 'IBM Qiskit', icon: '⚛️' },
    { id: 'dwave', label: 'D-Wave', icon: '🌊' },
    { id: 'ionq', label: 'IonQ', icon: '🔋' },
    { id: 'rigetti', label: 'Rigetti', icon: '📡' },
];

export default function SidebarWizard({ step, config, metadata, onSelect }: SidebarWizardProps) {

    const renderItem = (item: any, type: 'industry' | 'service' | 'problem' | 'hardware', isLocked: boolean, isSelected: boolean) => (
        <button
            key={item.id}
            onClick={() => !isLocked && onSelect(type, item.label)}
            disabled={isLocked}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm border ${isSelected
                ? 'bg-primary/10 border-primary text-primary font-medium'
                : isLocked
                    ? 'opacity-40 cursor-not-allowed border-transparent text-muted-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
        >
            <span className="text-base">{item.icon || '🔸'}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {isSelected && <Check size={14} className="text-primary animate-in fade-in zoom-in" />}
        </button>
    );

    return (
        <div className="space-y-6 animate-in slide-in-from-left duration-500">

            {/* Step 1: Industry */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <Briefcase size={12} />
                    <span>Select Industry</span>
                </div>
                <div className="space-y-1">
                    {metadata.industries.map(item => renderItem(item, 'industry', false, config.industry === item.label))}
                </div>
            </div>

            {/* Step 2: Service */}
            <div className="space-y-2 animate-in slide-in-from-left duration-500 fade-in">
                <div className="flex items-center gap-2 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <Zap size={12} />
                    <span>Select Service</span>
                </div>
                <div className="space-y-1">
                    {metadata.services.map(item => renderItem(item, 'service', false, config.service === item.label))}
                </div>
            </div>

            {/* Step 3: Problem */}
            {(config.service) && (
                <div className="space-y-2 animate-in slide-in-from-left duration-500 fade-in">
                    <div className="flex items-center gap-2 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <Briefcase size={12} />
                        <span>Select Problem</span>
                    </div>
                    <div className="space-y-1">
                        {metadata.problemMapping[config.service]?.map(item => renderItem(item, 'problem', false, config.problem === item.label))}
                    </div>
                </div>
            )}

            {/* Step 4: Hardware */}
            {(config.problem) && (
                <div className="space-y-2 animate-in slide-in-from-left duration-500 fade-in">
                    <div className="flex items-center gap-2 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <Cpu size={12} />
                        <span>Select Hardware</span>
                    </div>
                    <div className="space-y-1">
                        {HARDWARE.map(item => renderItem(item, 'hardware', false, config.hardware === item.label))}
                    </div>
                </div>
            )}

        </div>
    );
}
