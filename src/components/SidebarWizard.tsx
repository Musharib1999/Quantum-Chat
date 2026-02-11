"use client";

import React from 'react';
import { Check, ChevronRight, Briefcase, Zap, Cpu } from 'lucide-react';
import { useTheme } from './ThemeContext';

interface SidebarWizardProps {
    step: 'industry' | 'service' | 'hardware' | 'ready';
    config: {
        industry: string | null;
        service: string | null;
        hardware: string | null;
    };
    onSelect: (type: 'industry' | 'service' | 'hardware', value: string) => void;
}

const INDUSTRIES = [
    { id: 'biochem', label: 'Biochemistry', icon: '🧬' },
    // { id: 'finance', label: 'Finance', icon: '💰' },
    // { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
    // { id: 'cybersecurity', label: 'Cybersecurity', icon: '🛡️' },
    // { id: 'logistics', label: 'Logistics', icon: '🚚' },
    // { id: 'energy', label: 'Energy', icon: '⚡' },
];

const SERVICES = [
    { id: 'optimization', label: 'Optimization', icon: '📈' },
    { id: 'simulation', label: 'Simulation', icon: '🧪' },
    { id: 'ml', label: 'Quantum ML', icon: '🤖' },
    { id: 'security', label: 'Encryption', icon: '🔒' },
];

const HARDWARE = [
    { id: 'ibm', label: 'IBM Qiskit', icon: '⚛️' },
    { id: 'dwave', label: 'D-Wave', icon: '🌊' },
    { id: 'ionq', label: 'IonQ', icon: '🔋' },
    { id: 'rigetti', label: 'Rigetti', icon: '📡' },
];

export default function SidebarWizard({ step, config, onSelect }: SidebarWizardProps) {
    const { theme } = useTheme();

    const renderItem = (item: any, type: 'industry' | 'service' | 'hardware', isLocked: boolean, isSelected: boolean) => (
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
            <span className="text-base">{item.icon}</span>
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
                    {INDUSTRIES.map(item => renderItem(item, 'industry', step === 'ready', config.industry === item.label))}
                </div>
            </div>

            {/* Step 2: Service */}
            {(config.industry || step === 'service' || step === 'hardware' || step === 'ready') && (
                <div className="space-y-2 animate-in slide-in-from-left duration-500 fade-in">
                    <div className="flex items-center gap-2 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <Zap size={12} />
                        <span>Select Service</span>
                    </div>
                    <div className="space-y-1">
                        {SERVICES.map(item => renderItem(item, 'service', !config.industry || step === 'ready' || step === 'industry', config.service === item.label))}
                    </div>
                </div>
            )}

            {/* Step 3: Hardware */}
            {(config.service || step === 'hardware' || step === 'ready') && (
                <div className="space-y-2 animate-in slide-in-from-left duration-500 fade-in">
                    <div className="flex items-center gap-2 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <Cpu size={12} />
                        <span>Select Hardware</span>
                    </div>
                    <div className="space-y-1">
                        {HARDWARE.map(item => renderItem(item, 'hardware', !config.service || step === 'ready' || step === 'industry' || step === 'service', config.hardware === item.label))}
                    </div>
                </div>
            )}

        </div>
    );
}
