import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Cpu, Layers, Zap } from 'lucide-react';

interface CentralWizardProps {
    step: 'industry' | 'service' | 'problem' | 'hardware';
    metadata: any;
    onSelect: (type: 'industry' | 'service' | 'problem' | 'hardware', value: string) => void;
}

export default function CentralWizard({ step, metadata, onSelect }: CentralWizardProps) {
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
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
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
                return (
                    <div className="space-y-6 text-center">
                        <h2 className="text-3xl font-light text-foreground">Select Problem</h2>
                        <div className="grid grid-cols-1 gap-3 max-w-xl mx-auto">
                            {/* Assuming problems are fetched or static based on previous selection, but here using metadata directly or needing filtering logic in parent */}
                            {Object.keys(metadata.problemMapping || {}).map((prob: string) => (
                                <button
                                    key={prob}
                                    onClick={() => onSelect('problem', prob)}
                                    className="p-4 bg-card border border-border rounded-xl hover:border-blue-500/50 hover:bg-secondary/50 transition-all group flex items-center gap-4 text-left shadow-sm hover:shadow-md"
                                >
                                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors shrink-0">
                                        <Zap size={16} />
                                    </div>
                                    <span className="font-medium">{prob}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 'hardware':
                const hardwareOptions = [
                    { id: 'ibm_brisbane', label: 'IBM Brisbane (127 Qubits)' },
                    { id: 'ionq_aria', label: 'IonQ Aria (25 Qubits)' },
                    { id: 'rigetti_aspen', label: 'Rigetti Aspen-M-3 (80 Qubits)' },
                    { id: 'dwave_advantage', label: 'D-Wave Advantage (5000+ Qubits)' }
                ];
                return (
                    <div className="space-y-6 text-center">
                        <h2 className="text-3xl font-light text-foreground">Select Hardware</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                            {hardwareOptions.map((hw) => (
                                <button
                                    key={hw.id}
                                    onClick={() => onSelect('hardware', hw.label)}
                                    className="p-6 bg-card border border-border rounded-xl hover:border-blue-500/50 hover:bg-secondary/50 transition-all group flex flex-col items-start gap-2 text-left shadow-sm hover:shadow-md"
                                >
                                    <div className="w-full flex justify-between items-center mb-2">
                                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                                            <Cpu size={20} />
                                        </div>
                                        <div className="text-xs font-mono text-muted-foreground border border-border px-2 py-0.5 rounded">ONLINE</div>
                                    </div>
                                    <span className="font-medium text-lg">{hw.label}</span>
                                    <span className="text-sm text-muted-foreground">High-fidelity quantum processing unit.</span>
                                </button>
                            ))}
                        </div>
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
