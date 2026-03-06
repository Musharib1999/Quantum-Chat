"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Cpu, Layers, Zap, Loader2 } from 'lucide-react';

interface CentralWizardProps {
    step: 'industry' | 'service' | 'problem' | 'hardware';
    metadata: any;
    config: { industry: string | null, service: string | null };
    onSelect: (type: 'industry' | 'service' | 'problem' | 'hardware', value: string) => void;
}

export default function CentralWizard({ step, metadata, config, onSelect }: CentralWizardProps) {
    const [hardwareOptions, setHardwareOptions] = useState<any[]>([]);
    const [loadingHw, setLoadingHw] = useState(false);

    useEffect(() => {
        if (step === 'hardware') {
            setLoadingHw(true);
            fetch('/api/hardware')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setHardwareOptions(data);
                    }
                })
                .catch(err => console.error("Failed to fetch hardware", err))
                .finally(() => setLoadingHw(false));
        }
    }, [step]);
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
    };

    const renderStepContent = () => {
        switch (step) {
            case 'industry':
                return (
                    <div className="space-y-6 text-center">
                        <h2 className="text-3xl font-light text-foreground">Select Industry</h2>
                        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
                            {metadata.industries?.map((ind: any) => (
                                <button
                                    key={ind.label}
                                    onClick={() => onSelect('industry', ind.label)}
                                    className="p-6 bg-card border border-border rounded-xl hover:border-blue-500/50 hover:bg-secondary/50 transition-all group flex flex-col items-center gap-3 shadow-sm hover:shadow-md"
                                >
                                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                                        <Briefcase size={20} />
                                    </div>
                                    <span className="font-medium text-lg">{ind.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 'service':
                return (
                    <div className="space-y-6 text-center">
                        <h2 className="text-3xl font-light text-foreground">Select Service</h2>
                        <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
                            {metadata.services?.map((svc: any) => (
                                <button
                                    key={svc.label}
                                    onClick={() => onSelect('service', svc.label)}
                                    className="p-6 bg-card border border-border rounded-xl hover:border-blue-500/50 hover:bg-secondary/50 transition-all group flex items-center gap-4 text-left shadow-sm hover:shadow-md"
                                >
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors shrink-0">
                                        <Layers size={18} />
                                    </div>
                                    <span className="font-medium text-lg">{svc.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 'problem':
                // Drill down to specific problems
                const problems = (config.industry && config.service)
                    ? (metadata.problemMapping[config.industry]?.[config.service] || [])
                    : [];

                return (
                    <div className="space-y-6 text-center">
                        <h2 className="text-3xl font-light text-foreground">Select Problem</h2>
                        <div className="flex flex-wrap justify-center gap-3 max-w-xl mx-auto">
                            {problems.length > 0 ? (
                                problems.map((prob: any) => (
                                    <button
                                        key={prob.id || prob.label}
                                        onClick={() => onSelect('problem', prob.label)}
                                        className="p-4 bg-card border border-border rounded-xl hover:border-blue-500/50 hover:bg-secondary/50 transition-all group flex items-center gap-4 text-left shadow-sm hover:shadow-md"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors shrink-0">
                                            <Zap size={16} />
                                        </div>
                                        <span className="font-medium">{prob.label}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="text-muted-foreground py-8">
                                    No mapped problems found for this combination.
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'hardware':
                return (
                    <div className="space-y-6 text-center">
                        <h2 className="text-3xl font-light text-foreground">Select Hardware</h2>

                        {loadingHw ? (
                            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                                <Loader2 className="animate-spin w-8 h-8 mb-4" />
                                <p className="text-sm font-medium">Booting Simulators...</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
                                {hardwareOptions.map((hw) => (
                                    <button
                                        key={hw.id}
                                        onClick={() => onSelect('hardware', hw.name)}
                                        className="p-6 bg-card border border-border rounded-xl hover:border-blue-500/50 hover:bg-secondary/50 transition-all group flex flex-col items-start gap-2 text-left shadow-sm hover:shadow-md max-w-sm w-full md:w-auto flex-1"
                                    >
                                        <div className="w-full flex justify-between items-center mb-2">
                                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                                                {hw.provider === 'ibm' ? <Layers size={20} /> : <Cpu size={20} />}
                                            </div>
                                            <div className="text-xs font-mono text-green-500 border border-green-500/20 bg-green-500/10 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Online</div>
                                        </div>
                                        <span className="font-medium text-lg">{hw.name}</span>
                                        <span className="text-xs text-muted-foreground font-mono">{hw.qubits} Qubits</span>
                                        <span className="text-sm text-foreground/80 mt-1">{hw.description}</span>
                                    </button>
                                ))}
                                {hardwareOptions.length === 0 && (
                                    <div className="p-8 border border-border border-dashed rounded-xl w-full text-muted-foreground">
                                        No quantum simulators available.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-4">
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full"
                >
                    {renderStepContent()}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
