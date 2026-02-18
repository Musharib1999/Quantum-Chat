"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import IndustryChat from '@/components/chat/IndustryChat';
import CentralWizard from '@/components/industry/CentralWizard';
import ExperimentHistoryList from '@/components/ExperimentHistoryList';
import ExperimentDetailsModal from '@/components/ExperimentDetailsModal';
import QuantumFormFetcher from '@/components/QuantumFormFetcher';
import { getExperiments } from '@/app/actions/experiment';
import axios from 'axios';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function IndustryPage() {
    // Flow State: 'wip' means using wizard, 'chat' means using chat
    const [flowStage, setFlowStage] = useState<'SELECTION' | 'CHAT'>('SELECTION');

    // Config State
    const [sessionConfig, setSessionConfig] = useState<{ industry: string | null, service: string | null, problem: string | null, hardware: string | null, formData?: any }>({ industry: null, service: null, problem: null, hardware: null });
    const [wizardStep, setWizardStep] = useState<'industry' | 'service' | 'problem' | 'hardware'>('industry');

    // Data State
    const [metadata, setMetadata] = useState<any>({ industries: [], services: [], problemMapping: {} });
    const [experiments, setExperiments] = useState<any[]>([]);
    const [loadingExperiments, setLoadingExperiments] = useState(true);

    // Modal State
    const [selectedExperiment, setSelectedExperiment] = useState<any | null>(null);

    // Fetch Metadata & Experiments on Mount
    useEffect(() => {
        const initData = async () => {
            try {
                const [metaRes, expRes] = await Promise.all([
                    axios.get('/api/quantum-forms/metadata'),
                    getExperiments()
                ]);
                setMetadata(metaRes.data);
                setExperiments(expRes);
                setLoadingExperiments(false);
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
            }
        };
        initData();

        // Poll for experiment updates
        const interval = setInterval(async () => {
            const exps = await getExperiments();
            setExperiments(exps);
        }, 5000);
        return () => clearInterval(interval);
    }, []);


    // Steps Handler
    const handleWizardSelect = (type: 'industry' | 'service' | 'problem' | 'hardware', value: string) => {
        setSessionConfig(prev => {
            const newConfig = { ...prev, [type]: value };
            // Reset downstream selections if going back (conceptually)
            if (type === 'industry') { newConfig.service = null; newConfig.problem = null; newConfig.hardware = null; }
            if (type === 'service') { newConfig.problem = null; newConfig.hardware = null; }
            if (type === 'problem') { newConfig.hardware = null; }
            return newConfig;
        });

        // Advance Wizard
        if (type === 'industry') setWizardStep('service');
        if (type === 'service') setWizardStep('problem');
        if (type === 'problem') setWizardStep('hardware');
        if (type === 'hardware') {
            // Wizard Complete -> Go to Next Stage (Form Entry -> Chat)
            // Ideally we might want a "Form Entry" step in the wizard or move straight to chat
            // Current logic assumes Chat handles form entry if formData is missing? 
            // Wait, previous code had QuantumFormFetcher. Let's start Chat but maybe show FormFetcher in Layout?
            setFlowStage('CHAT');
        }
    };

    // Form Submission (Happens inside the Chat Layout usually, or we can make it part of 'SELECTION' if we want)
    // For now, let's stick to the request: "Center of the page will have chat interface like other modules."
    // But we need the Form Data to start the simulation. 
    // Let's render the FormFetcher as an overlay or inside the chat area if no formData.

    const handleFormSubmit = (formData: any) => {
        setSessionConfig(prev => ({ ...prev, formData }));
    };

    // Re-Run Logic
    const handleReRun = (experiment: any) => {
        setSessionConfig({
            industry: experiment.industry,
            service: experiment.service,
            problem: experiment.problem,
            hardware: experiment.hardware,
            formData: experiment.parameters // Pre-fill
        });
        setFlowStage('CHAT');
        setSelectedExperiment(null); // Close modal
    };

    // Render Logic
    return (
        <>
            <ExperimentDetailsModal
                experiment={selectedExperiment}
                onClose={() => setSelectedExperiment(null)}
                onReRun={handleReRun}
            />

            <AppLayout
                currentMode="industry"
                // Left Sidebar: Only show in Chat Mode (Selections) OR minimal back button in Selection Mode
                sidebarContent={
                    flowStage === 'CHAT' ? (
                        <div className="p-4 space-y-6">
                            <button
                                onClick={() => { setFlowStage('SELECTION'); setWizardStep('industry'); setSessionConfig({ industry: null, service: null, problem: null, hardware: null }); }}
                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
                            >
                                <ArrowLeft size={14} /> Start New
                            </button>

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Configuration</h3>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Industry', value: sessionConfig.industry },
                                        { label: 'Service', value: sessionConfig.service },
                                        { label: 'Problem', value: sessionConfig.problem },
                                        { label: 'Hardware', value: sessionConfig.hardware },
                                    ].map((item) => (
                                        <div key={item.label} className="flex flex-col">
                                            <span className="text-[10px] text-muted-foreground uppercase">{item.label}</span>
                                            <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
                                                <CheckCircle2 size={12} /> {item.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : null // Blank sidebar during wizard as requested
                }
                // Right Sidebar: Experiment History
                rightSidebarContent={
                    <div className="h-full overflow-hidden">
                        <ExperimentHistoryList
                            experiments={experiments}
                            loading={loadingExperiments}
                            onSelectExperiment={setSelectedExperiment}
                        />
                    </div>
                }
            >
                <div className="flex flex-col h-full bg-background relative w-full">
                    {flowStage === 'SELECTION' && (
                        <CentralWizard
                            step={wizardStep}
                            metadata={metadata}
                            config={sessionConfig}
                            onSelect={handleWizardSelect}
                        />
                    )}

                    {flowStage === 'CHAT' && (
                        <>
                            {!sessionConfig.formData ? (
                                // Step 5 of Flow: Form Entry (Before actual Chat triggers)
                                <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
                                    <div className="max-w-2xl w-full">
                                        <QuantumFormFetcher
                                            industry={sessionConfig.industry!}
                                            service={sessionConfig.service!}
                                            problem={sessionConfig.problem!}
                                            initialData={sessionConfig.formData} // Handling re-run pre-fill
                                            onSubmit={handleFormSubmit}
                                        />
                                    </div>
                                </div>
                            ) : (
                                // Final Step: Chat Interface
                                <IndustryChat
                                    contextConfig={sessionConfig}
                                    placeholder={`Ask about ${sessionConfig.problem}...`}
                                />
                            )}
                        </>
                    )}
                </div>
            </AppLayout>
        </>
    );
}
