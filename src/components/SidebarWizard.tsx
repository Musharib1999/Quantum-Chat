"use client";

import React from 'react';
import { Check, ChevronRight, Briefcase, Zap, Cpu } from 'lucide-react';
import { useTheme } from './ThemeContext';

// Define Problems mapped by Service ID
const PROBLEMS: Record<string, { id: string, label: string }[]> = {
    'Optimization': [
        { id: 'protein_folding', label: 'Protein Folding' },
        { id: 'molecular_docking', label: 'Molecular Docking' },
        { id: 'gene_sequencing', label: 'Gene Sequencing Alignment' }
    ],
    'Simulation': [
        { id: 'chemical_dynamics', label: 'Chemical Dynamics' },
        { id: 'reaction_pathways', label: 'Reaction Pathways' },
        { id: 'enzyme_catalysis', label: 'Enzyme Catalysis' }
    ],
    'Quantum ML': [
        { id: 'biomarker_discovery', label: 'Biomarker Discovery' },
        { id: 'patient_classification', label: 'Patient Classification' },
        { id: 'genomic_analysis', label: 'Genomic Analysis' }
    ],
    'Encryption': [
        { id: 'secure_records', label: 'Secure Health Records' },
        { id: 'data_privacy', label: 'Patient Data Privacy' }
    ]
};

interface SidebarWizardProps {
    step: 'industry' | 'service' | 'problem' | 'hardware' | 'ready';
    config: {
        industry: string | null;
        service: string | null;
        problem: string | null;
        hardware: string | null;
    };
    onSelect: (type: 'industry' | 'service' | 'problem' | 'hardware', value: string) => void;
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

            {/* Step 1: Industry (Fixed/Pre-selected) */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <Briefcase size={12} />
                    <span>Industry (Active)</span>
                </div>
                <div className="space-y-1">
                    {INDUSTRIES.map(item => (
                        <div key={item.id} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary text-primary font-medium text-sm">
                            <span className="text-base">{item.icon}</span>
                            <span className="flex-1 text-left">{item.label}</span>
                            <Check size={14} className="text-primary" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Step 2: Service (Always Visible & Editable) */}
            <div className="space-y-2 animate-in slide-in-from-left duration-500 fade-in">
                <div className="flex items-center gap-2 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <Zap size={12} />
                    <span>Select Service</span>
                </div>
                <div className="space-y-1">
                    {SERVICES.map(item => renderItem(item, 'service', false, config.service === item.label))}
                </div>
            </div>

            {/* Step 3: Problem (Dependent on Service, Editable if Service set) */}
            {(config.service) && (
                <div className="space-y-2 animate-in slide-in-from-left duration-500 fade-in">
                    <div className="flex items-center gap-2 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <Briefcase size={12} /> {/* Reusing Briefcase for Problem */}
                        <span>Select Problem</span>
                    </div>
                    <div className="space-y-1">
                        {config.service && PROBLEMS[config.service]?.map(item => renderItem(item, 'problem', false, config.problem === item.label))}
                    </div>
                </div>
            )}

            {/* Step 4: Hardware (Dependent on Problem, Editable if Problem set) */}
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
