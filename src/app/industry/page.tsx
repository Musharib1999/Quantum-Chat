"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import ChatInterface from '@/components/ChatInterface';
import ExperimentHistory from '@/components/ExperimentHistory';
import SidebarWizard from '@/components/SidebarWizard';
import QuantumFormFetcher from '@/components/QuantumFormFetcher';
import axios from 'axios';

export default function IndustryPage() {
    const [sessionConfig, setSessionConfig] = useState<{ industry: string | null, service: string | null, problem: string | null, hardware: string | null, formData?: any }>({ industry: null, service: null, problem: null, hardware: null });
    const [sidebarStep, setSidebarStep] = useState<'industry' | 'service' | 'problem' | 'hardware' | 'ready'>('industry');
    const [metadata, setMetadata] = useState<any>({ industries: [], services: [], problemMapping: {} });
    const [loadingMetadata, setLoadingMetadata] = useState(true);

    const [selectedExperimentId, setSelectedExperimentId] = useState<string | undefined>(undefined);

    // Fetch Metadata on Mount
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const { data } = await axios.get('/api/quantum-forms/metadata');
                setMetadata(data);
                if (data.industries.length > 0) {
                    setSessionConfig(prev => ({ ...prev, industry: data.industries[0].label }));
                }
            } catch (error) {
                console.error("Failed to fetch industry metadata:", error);
            } finally {
                setLoadingMetadata(false);
            }
        };
        fetchMetadata();
    }, []);

    const handleWizardSelection = (type: 'industry' | 'service' | 'problem' | 'hardware', value: string) => {
        setSessionConfig(prev => {
            const newConfig = { ...prev, [type]: value };
            if (type === 'service') {
                newConfig.problem = null;
                newConfig.hardware = null;
            }
            if (type === 'problem') {
                newConfig.hardware = null;
            }
            return newConfig;
        });

        if (type === 'industry') setSidebarStep('service');
        if (type === 'service') setSidebarStep('problem');
        if (type === 'problem') setSidebarStep('hardware');
        if (type === 'hardware') setSidebarStep('ready');
    };

    const handleFormSubmit = (formData: any) => {
        setSessionConfig(prev => ({ ...prev, formData }));
    };

    const handleExperimentSelect = (experiment: any) => {
        setSelectedExperimentId(experiment._id);

        // Restore Session Config from History
        setSessionConfig({
            industry: experiment.industry,
            service: experiment.service,
            problem: experiment.problem,
            hardware: experiment.hardware,
            formData: experiment.parameters
        });

        setSidebarStep('ready');
    };

    return (
        <>
            <ExperimentHistory onSelectExperiment={handleExperimentSelect} currentExperimentId={selectedExperimentId} />

            <AppLayout
                currentMode="industry"
                sidebarContent={
                    <div className="p-4 space-y-2">
                        {loadingMetadata ? (
                            <div className="p-4 animate-pulse space-y-4">
                                <div className="h-4 bg-white/5 rounded w-1/2"></div>
                                <div className="space-y-2">
                                    <div className="h-10 bg-white/5 rounded"></div>
                                    <div className="h-10 bg-white/5 rounded"></div>
                                </div>
                            </div>
                        ) : (
                            <SidebarWizard
                                step={sidebarStep}
                                config={sessionConfig}
                                metadata={metadata}
                                onSelect={handleWizardSelection}
                            />
                        )}
                    </div>
                }
            >
                <div className="flex flex-col h-full">
                    {/* Form Fetcher / Wizard View */}
                    {sidebarStep === 'ready' && !sessionConfig.formData && (
                        <div className="p-4 md:p-8 flex-1 flex items-center justify-center overflow-y-auto">
                            <div className="max-w-2xl w-full">
                                <QuantumFormFetcher
                                    industry={sessionConfig.industry!}
                                    service={sessionConfig.service!}
                                    problem={sessionConfig.problem!}
                                    onSubmit={handleFormSubmit}
                                />
                            </div>
                        </div>
                    )}

                    {/* Chat Interface (Active or Historical) */}
                    {(sessionConfig.formData) && (
                        <ChatInterface
                            mode="industry"
                            contextConfig={sessionConfig}
                            placeholder="Ask Quantum Assistant (Industry Mode)..."
                        />
                    )}

                    {/* Placeholder when nothing is selected */}
                    {sidebarStep !== 'ready' && !sessionConfig.formData && (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 animate-in fade-in duration-500">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-ping"></div>
                            </div>
                            <p className="font-medium">Select parameters from the sidebar to begin.</p>
                        </div>
                    )}
                </div>
            </AppLayout>
        </>
    );
}
