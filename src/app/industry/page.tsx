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
import { ArrowLeft, CheckCircle2, BookOpen, ChevronRight } from 'lucide-react';

import IndustryLogin from '@/components/industry/IndustryLogin';
import { useAuth } from '@/context/AuthContext';

export default function IndustryPage() {
    // Auth Context
    const { isAuthenticated, user, login, isInitializing } = useAuth();

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

    // Fetch Metadata & Experiments on Mount/Auth
    useEffect(() => {
        const initData = async () => {
            try {
                const [metaRes, expRes] = await Promise.all([
                    axios.get('/api/quantum-forms/metadata'),
                    getExperiments(user?.email)
                ]);
                if (metaRes.data) setMetadata(metaRes.data);
                if (expRes) setExperiments(expRes);
                setLoadingExperiments(false);
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
                setLoadingExperiments(false);
            }
        };

        // Only run when we know auth state
        if (!isInitializing) {
            initData();

            // Poll for experiment updates
            const interval = setInterval(async () => {
                const exps = await getExperiments(user?.email);
                if (exps) setExperiments(exps);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [user?.email, isInitializing]);

    const handleLogin = (userData: { email: string; firstName?: string; lastName?: string; phone?: string; plan?: 'Guest' | 'Pro' | 'Enterprise'; role?: string }) => {
        login(userData);
    };

    if (isInitializing) {
        return <div className="min-h-screen bg-background flex items-center justify-center" />;
    }

    if (!isAuthenticated) {
        return <IndustryLogin onLogin={handleLogin} />;
    }


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
                        <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-100px)] custom-scrollbar">
                            {/* Industry Section */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-muted-foreground tracking-wider px-2 text-left">Industry</h3>
                                <div className="space-y-1">
                                    {metadata.industries?.map((ind: any) => {
                                        const isSelected = sessionConfig.industry === ind.label;
                                        return (
                                            <div
                                                key={ind.label}
                                                onClick={() => {
                                                    setSessionConfig({ industry: ind.label, service: null, problem: null, hardware: null });
                                                    setFlowStage('SELECTION');
                                                    setWizardStep('service');
                                                }}
                                                className={`group flex items-center justify-start w-full py-2 px-3 rounded-lg text-sm transition-all cursor-pointer border ${isSelected ? 'bg-card text-foreground font-medium shadow-sm border-ring ring-1 ring-ring' : 'border-transparent hover:bg-secondary/40 text-muted-foreground'}`}
                                            >
                                                <span className="truncate">{ind.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Service Section */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-muted-foreground tracking-wider px-2 text-left">Service</h3>
                                <div className="space-y-1">
                                    {metadata.services?.map((svc: any) => {
                                        const isSelected = sessionConfig.service === svc.label;
                                        return (
                                            <div
                                                key={svc.label}
                                                onClick={() => {
                                                    setSessionConfig(prev => ({ ...prev, service: svc.label, problem: null, hardware: null, formData: undefined }));
                                                    setFlowStage('SELECTION');
                                                    setWizardStep('problem');
                                                }}
                                                className={`group flex items-center justify-start w-full py-2 px-3 rounded-lg text-sm transition-all cursor-pointer border ${isSelected ? 'bg-card text-foreground font-medium shadow-sm border-ring ring-1 ring-ring' : 'border-transparent hover:bg-secondary/40 text-muted-foreground'}`}
                                            >
                                                <span className="truncate">{svc.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Problem Section */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-muted-foreground tracking-wider px-2 text-left">Problem</h3>
                                <div className="space-y-1">
                                    {/* Dynamic Problems based on Ind/Svc selection */}
                                    {(() => {
                                        const problems = (sessionConfig.industry && sessionConfig.service)
                                            ? (metadata.problemMapping?.[sessionConfig.industry]?.[sessionConfig.service] || [])
                                            : [];

                                        if (problems.length === 0) return <div className="text-xs text-muted-foreground px-2 italic text-left">Select Industry & Service</div>;

                                        return problems.map((prob: any) => {
                                            const isSelected = sessionConfig.problem === prob.label;
                                            return (
                                                <div
                                                    key={prob.label}
                                                    onClick={() => {
                                                        setSessionConfig(prev => ({ ...prev, problem: prob.label, hardware: null, formData: undefined }));
                                                        setFlowStage('SELECTION');
                                                        setWizardStep('hardware');
                                                    }}
                                                    className={`group flex items-center justify-start w-full py-2 px-3 rounded-lg text-sm transition-all cursor-pointer border ${isSelected ? 'bg-card text-foreground font-medium shadow-sm border-ring ring-1 ring-ring' : 'border-transparent hover:bg-secondary/40 text-muted-foreground'}`}
                                                >
                                                    <span className="truncate" title={prob.label}>{prob.label}</span>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            {/* Hardware Section */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-muted-foreground tracking-wider px-2 text-left">Hardware</h3>
                                <div className="space-y-1">
                                    {[
                                        { id: 'ibm_brisbane', label: 'IBM Brisbane (127 Qubits)' },
                                        { id: 'ionq_aria', label: 'IonQ Aria (25 Qubits)' },
                                        { id: 'rigetti_aspen', label: 'Rigetti Aspen-M-3 (80 Qubits)' },
                                        { id: 'dwave_advantage', label: 'D-Wave Advantage (500+) Qubits' }
                                    ].map((hw: any) => {
                                        const isSelected = sessionConfig.hardware === hw.label;
                                        return (
                                            <div
                                                key={hw.id}
                                                onClick={() => {
                                                    // Just update hardware, stay in place
                                                    setSessionConfig(prev => ({ ...prev, hardware: hw.label }));
                                                }}
                                                className={`group flex items-center justify-between w-full gap-2 py-2 px-3 rounded-lg text-sm transition-all cursor-pointer border ${isSelected ? 'bg-card text-foreground font-medium shadow-sm border-ring ring-1 ring-ring' : 'border-transparent hover:bg-secondary/40 text-muted-foreground'}`}
                                            >
                                                <span className="truncate" title={hw.label}>{hw.label}</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-muted-foreground bg-muted shrink-0`}>Offline</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : null // Blank sidebar during wizard as requested
                }
                // Right Sidebar: Experiment History
                rightSidebarContent={
                    <div className="h-full overflow-hidden flex flex-col">
                        {/* Article & Learn Link Card */}
                        <div className="p-4 border-b border-border shrink-0 mt-1">
                            <a href="/article-learn" className="block w-full p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all group">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <BookOpen className="text-blue-400 w-4 h-4" />
                                        Article & Learn
                                    </h3>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Deepen your quantum knowledge with curated articles.
                                </p>
                            </a>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <ExperimentHistoryList
                                experiments={experiments}
                                loading={loadingExperiments}
                                onSelectExperiment={setSelectedExperiment}
                                isGuest={!isAuthenticated}
                            />
                        </div>
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
                                <div className="absolute inset-0 p-4">
                                    <div className="h-full w-full overflow-y-auto custom-scrollbar flex justify-center py-4">
                                        <div className="max-w-3xl w-full my-auto">
                                            <QuantumFormFetcher
                                                industry={sessionConfig.industry!}
                                                service={sessionConfig.service!}
                                                problem={sessionConfig.problem!}
                                                initialData={sessionConfig.formData} // Handling re-run pre-fill
                                                onSubmit={handleFormSubmit}
                                            />
                                        </div>
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
