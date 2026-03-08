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
import { ArrowLeft, CheckCircle2, BookOpen, ChevronRight, Layers } from 'lucide-react';

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
    const [hardwareList, setHardwareList] = useState<any[]>([]);
    const [loadingExperiments, setLoadingExperiments] = useState(true);

    // Modal State
    const [selectedExperiment, setSelectedExperiment] = useState<any | null>(null);

    // Fetch Metadata & Experiments on Mount/Auth
    const refreshExperiments = async () => {
        const exps = await getExperiments(user?.email);
        if (exps) setExperiments(exps);
    };

    useEffect(() => {
        const initData = async () => {
            try {
                const [metaRes, expRes, hwRes] = await Promise.all([
                    axios.get('/api/quantum-forms/metadata'),
                    getExperiments(user?.email),
                    axios.get('/api/hardware')
                ]);
                if (metaRes.data) setMetadata(metaRes.data);
                if (expRes) setExperiments(expRes);
                if (hwRes.data) setHardwareList(hwRes.data);
                setLoadingExperiments(false);
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
                setLoadingExperiments(false);
            }
        };

        if (!isInitializing) {
            initData();
            // No polling — experiments refresh only on load and after pipeline completes
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

    const handleWizardSelect = (type: 'industry' | 'service' | 'problem' | 'hardware', value: string) => {
        let nextService: string | null = null;
        let finalNextStep: any = null;

        if (type === 'industry') finalNextStep = 'problem';
        if (type === 'problem') {
            const problemMapping = metadata.problemMapping?.[sessionConfig.industry!]?.[value];
            const services = Object.keys(problemMapping || {});
            if (services.length === 1) {
                nextService = services[0];
                finalNextStep = 'hardware';
            } else {
                finalNextStep = 'service';
            }
        }
        if (type === 'service') finalNextStep = 'hardware';
        if (type === 'hardware') finalNextStep = 'CHAT';

        setSessionConfig(prev => {
            const newConfig = { ...prev, [type]: value };
            if (nextService) newConfig.service = nextService;

            // Reset downstream selections
            if (type === 'industry') { newConfig.problem = null; newConfig.service = null; newConfig.hardware = null; newConfig.formData = undefined; }
            if (type === 'problem' && !nextService) { newConfig.service = null; newConfig.hardware = null; newConfig.formData = undefined; }
            if (type === 'problem' && nextService) { newConfig.hardware = null; newConfig.formData = undefined; }
            if (type === 'service') { newConfig.hardware = null; newConfig.formData = undefined; }
            return newConfig;
        });

        if (finalNextStep === 'CHAT') {
            setFlowStage('CHAT');
        } else if (finalNextStep) {
            setWizardStep(finalNextStep);
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
                                                    setWizardStep('problem');
                                                }}
                                                className={`group flex items-center justify-start w-full py-2 px-3 rounded-lg text-sm transition-all cursor-pointer border ${isSelected ? 'bg-card text-foreground font-medium shadow-sm border-ring' : 'border-transparent hover:bg-secondary/40 text-muted-foreground'}`}
                                            >
                                                <span className="truncate">{ind.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Problem Section */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-muted-foreground tracking-wider px-2 text-left">Problem</h3>
                                <div className="space-y-1">
                                    {/* Dynamic Problems based on Industry selection */}
                                    {(() => {
                                        const problems = sessionConfig.industry
                                            ? Object.keys(metadata.problemMapping?.[sessionConfig.industry] || {})
                                            : [];

                                        if (problems.length === 0) return <div className="text-xs text-muted-foreground px-2 italic text-left">Select Industry</div>;

                                        return (
                                            <div className="space-y-1">
                                                {problems.map((prob: string) => {
                                                    const isSelected = sessionConfig.problem === prob;
                                                    return (
                                                        <div
                                                            key={prob}
                                                            onClick={() => handleWizardSelect('problem', prob)}
                                                            className={`group flex items-center justify-start w-full py-2 px-3 rounded-lg text-sm transition-all cursor-pointer border ${isSelected ? 'bg-card text-foreground font-medium shadow-sm border-ring' : 'border-transparent hover:bg-secondary/40 text-muted-foreground'}`}
                                                        >
                                                            <span className="truncate" title={prob}>{prob}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Service Section */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-muted-foreground tracking-wider px-2 text-left">Service</h3>
                                <div className="space-y-1">
                                    {/* Dynamic Services based on Problem selection */}
                                    {(() => {
                                        const services = (sessionConfig.industry && sessionConfig.problem)
                                            ? Object.keys(metadata.problemMapping?.[sessionConfig.industry]?.[sessionConfig.problem] || {})
                                            : [];

                                        if (services.length === 0) return <div className="text-xs text-muted-foreground px-2 italic text-left">Select Problem</div>;

                                        return (
                                            <div className="space-y-1">
                                                {services.map((svc: string) => {
                                                    const isSelected = sessionConfig.service === svc;
                                                    return (
                                                        <div
                                                            key={svc}
                                                            onClick={() => {
                                                                setSessionConfig(prev => ({ ...prev, service: svc, hardware: null, formData: undefined }));
                                                                setFlowStage('SELECTION');
                                                                setWizardStep('hardware');
                                                            }}
                                                            className={`group flex items-center justify-start w-full py-2 px-3 rounded-lg text-sm transition-all cursor-pointer border ${isSelected ? 'bg-card text-foreground font-medium shadow-sm border-ring' : 'border-transparent hover:bg-secondary/40 text-muted-foreground'}`}
                                                        >
                                                            <span className="truncate">{svc}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Hardware Section */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-muted-foreground tracking-wider px-2 text-left">Hardware</h3>
                                <div className="space-y-1">
                                    {(() => {
                                        const mappedHwNames = (sessionConfig.industry && sessionConfig.problem && sessionConfig.service)
                                            ? (metadata.problemMapping[sessionConfig.industry]?.[sessionConfig.problem]?.[sessionConfig.service] || [])
                                            : null;

                                        if (mappedHwNames === null) return <div className="text-xs text-muted-foreground px-2 italic text-left">Select Service</div>;

                                        // Filter hardwareList based on mappedHwNames (with normalization)
                                        const filteredHws = (!mappedHwNames || mappedHwNames.length === 0)
                                            ? hardwareList
                                            : hardwareList.filter(h => {
                                                const nameNorm = (h.name || '').toLowerCase().replace(/-/g, '').replace(/ /g, '');
                                                const providerNorm = (h.provider || '').toLowerCase().replace(/-/g, '').replace(/ /g, '');
                                                return mappedHwNames.some((m: string) => {
                                                    const mNorm = (m || '').toLowerCase().replace(/-/g, '').replace(/ /g, '');
                                                    return nameNorm.includes(mNorm) || mNorm.includes(providerNorm) || (mNorm === 'simulator' && nameNorm.includes('simulator'));
                                                });
                                            });

                                        if (filteredHws.length === 0 && hardwareList.length > 0) return <div className="text-xs text-muted-foreground px-2 italic text-left">No compatible hardware</div>;

                                        return (
                                            <div className="space-y-1">
                                                {filteredHws.map((hw: any) => {
                                                    const isSelected = sessionConfig.hardware === hw.name;
                                                    return (
                                                        <div
                                                            key={hw.id}
                                                            onClick={() => {
                                                                setSessionConfig(prev => ({ ...prev, hardware: hw.name }));
                                                            }}
                                                            className={`group flex items-center justify-between w-full gap-2 py-2 px-3 rounded-lg text-sm transition-all cursor-pointer border ${isSelected ? 'bg-card text-foreground font-medium shadow-sm border-ring' : 'border-transparent hover:bg-secondary/40 text-muted-foreground'}`}
                                                        >
                                                            <span className="truncate" title={hw.name}>{hw.name}</span>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-green-500 bg-green-500/10 border border-green-500/20 shrink-0 uppercase`}>Live</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
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
                            <a href="/article-learn" className="block w-full p-4 rounded-xl bg-card border border-border hover:border-ring hover:shadow-md transition-all duration-200 group">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                        Analyze Quantum Information
                                    </h3>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Feed and analyze your collateral like scientific papers, articles and latest news in the quantum domain
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
                                                hardware={sessionConfig.hardware!}
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
                                    onPipelineComplete={refreshExperiments}
                                />
                            )}
                        </>
                    )}
                </div>
            </AppLayout>
        </>
    );
}
