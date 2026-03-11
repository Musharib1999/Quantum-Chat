"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Cpu, Layers, Zap, Loader2, PlaneTakeoff, Shield, TrendingUp, Share2, CalendarClock, Atom } from 'lucide-react';

interface CentralWizardProps {
    step: 'industry' | 'service' | 'problem' | 'hardware';
    metadata: any;
    config: { industry: string | null, service: string | null, problem: string | null, hardware: string | null };
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

    const getIndustryIcon = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('aviation')) return <PlaneTakeoff size={24} />;
        if (l.includes('cyber') || l.includes('security')) return <Shield size={24} />;
        if (l.includes('finance')) return <TrendingUp size={24} />;
        return <Briefcase size={24} />;
    };

    const getServiceIcon = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('route') || l.includes('logistics') || l.includes('market')) return <Share2 size={20} />;
        if (l.includes('schedule') || l.includes('rostering') || l.includes('article') || l.includes('calendar')) return <CalendarClock size={20} />;
        if (l.includes('simulate') || l.includes('optimize') || l.includes('assistant') || l.includes('portfolio') || l.includes('atom')) return <Atom size={20} />;
        return <Layers size={20} />;
    };

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
                        <h2 className="text-3xl font-light text-foreground tracking-tight">Select Industry</h2>
                        <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
                            {metadata.industries?.map((ind: any) => {
                                const isActive = config.industry === ind.label;
                                return (
                                    <button
                                        key={ind.label}
                                        onClick={() => onSelect('industry', ind.label)}
                                        className={`p-8 bg-card border rounded-2xl transition-all group flex flex-col items-center gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300 w-48 ${isActive
                                            ? 'border-foreground ring-1 ring-foreground/20 shadow-[0_0_20px_rgba(0,0,0,0.15)] bg-secondary/80'
                                            : 'border-border hover:border-ring hover:bg-card hover:shadow-md'
                                            }`}
                                    >
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-inner ${isActive
                                            ? 'bg-foreground/10 text-foreground'
                                            : 'bg-secondary text-muted-foreground group-hover:text-foreground group-hover:bg-foreground/10'
                                            }`}>
                                            {getIndustryIcon(ind.label)}
                                        </div>
                                        <span className={`font-semibold text-xl tracking-tight transition-colors ${isActive ? 'text-foreground' : 'text-foreground/90 group-hover:text-foreground'
                                            }`}>{ind.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'problem':
                const problems = config.industry
                    ? Object.keys(metadata.problemMapping?.[config.industry] || {})
                    : [];

                return (
                    <div className="space-y-6 text-center">
                        <h2 className="text-3xl font-light text-foreground tracking-tight">Select Problem</h2>
                        <div className="flex flex-wrap justify-center gap-3 max-w-xl mx-auto">
                            {problems.length > 0 ? (
                                problems.map((prob: string) => (
                                    <button
                                        key={prob}
                                        onClick={() => onSelect('problem', prob)}
                                        className="p-4 bg-card border border-border rounded-xl hover:border-ring hover:bg-card transition-all group flex items-center gap-4 text-left shadow-sm hover:shadow-md"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-foreground/10 transition-colors shrink-0">
                                            <Zap size={16} />
                                        </div>
                                        <span className="text-xl font-semibold tracking-tight group-hover:text-foreground transition-colors">{prob}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="text-muted-foreground py-8">
                                    No mapped problems found for this industry.
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'service':
                const availableServices = (config.industry && config.problem)
                    ? Object.keys(metadata.problemMapping?.[config.industry]?.[config.problem] || {})
                    : [];

                return (
                    <div className="space-y-6 text-center">
                        <h2 className="text-3xl font-light text-foreground tracking-tight">Select Service</h2>
                        <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
                            {availableServices.length > 0 ? (
                                availableServices.map((svc: string) => {
                                    const isActive = config.service === svc;
                                    return (
                                        <button
                                            key={svc}
                                            onClick={() => onSelect('service', svc)}
                                            className={`p-6 bg-card border rounded-xl transition-all group flex items-center gap-4 text-left shadow-sm hover:shadow-md ${isActive
                                                ? 'border-foreground bg-foreground/5'
                                                : 'border-border hover:border-ring hover:bg-card'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${isActive
                                                ? 'bg-foreground/10 text-foreground'
                                                : 'bg-secondary text-muted-foreground group-hover:text-foreground group-hover:bg-foreground/10'
                                                }`}>
                                                {getServiceIcon(svc)}
                                            </div>
                                            <span className={`text-xl font-semibold tracking-tight transition-colors ${isActive ? 'text-foreground' : 'text-foreground'}`}>{svc}</span>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="text-muted-foreground py-8">
                                    No mapped services found for this problem.
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
                                {(() => {
                                    const mappedHws = (config.industry && config.problem && config.service)
                                        ? (metadata.problemMapping[config.industry]?.[config.problem]?.[config.service] || [])
                                        : [];

                                    // If no specific hardware is restricted, show all online hardware
                                    if (mappedHws.length === 0) {
                                        return hardwareOptions.map((hw) => (
                                            <button
                                                key={hw.id}
                                                onClick={() => onSelect('hardware', hw.name)}
                                                className="p-6 bg-card border border-border rounded-xl hover:border-ring hover:bg-card transition-all group flex flex-col items-start gap-2 text-left shadow-sm hover:shadow-md max-w-sm w-full md:w-auto flex-1"
                                            >
                                                <div className="w-full flex justify-between items-center mb-1">
                                                    <span className="text-xl font-semibold tracking-tight">{hw.name}</span>
                                                <div className="text-sm font-medium text-green-500 uppercase tracking-wider">Online</div>
                                                </div>
                                                <span className="text-sm text-muted-foreground font-mono">{hw.qubits} Qubits</span>
                                                <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{hw.description}</p>
                                            </button>
                                        ));
                                    }

                                    const filtered = hardwareOptions.filter(h => {
                                        const nameNorm = h.name.toLowerCase().replace(/-/g, '').replace(/ /g, '');
                                        const providerNorm = h.provider.toLowerCase().replace(/-/g, '').replace(/ /g, '');
                                        return mappedHws.some((m: string) => {
                                            const mNorm = m.toLowerCase().replace(/-/g, '').replace(/ /g, '');
                                            return nameNorm.includes(mNorm) ||
                                                mNorm.includes(providerNorm) ||
                                                (mNorm === 'simulator' && nameNorm.includes('simulator'));
                                        });
                                    });

                                    if (filtered.length === 0) return (
                                        <div className="p-8 border border-border border-dashed rounded-xl w-full text-muted-foreground">
                                            No quantum simulators available for this problem.
                                        </div>
                                    );

                                    return filtered.map((hw) => (
                                        <button
                                            key={hw.id}
                                            onClick={() => onSelect('hardware', hw.name)}
                                            className="p-6 bg-card border border-border rounded-xl hover:border-ring hover:bg-card transition-all group flex flex-col items-start gap-2 text-left shadow-sm hover:shadow-md max-w-sm w-full md:w-auto flex-1"
                                        >
                                            <div className="w-full flex justify-between items-center mb-1">
                                                <span className="text-xl font-semibold tracking-tight">{hw.name}</span>
                                                <div className="text-sm font-semibold text-green-500 uppercase tracking-wider">Online</div>
                                            </div>
                                            <span className="text-sm text-muted-foreground font-mono">{hw.qubits} Qubits</span>
                                            <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{hw.description}</p>
                                        </button>
                                    ));
                                })()}
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
