"use client";

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import ChatInterface from '@/components/ChatInterface';
import SidebarWizard from '@/components/SidebarWizard';
import QuantumFormFetcher from '@/components/QuantumFormFetcher';

export default function IndustryPage() {
    const [sessionConfig, setSessionConfig] = useState<{ industry: string | null, service: string | null, problem: string | null, hardware: string | null, formData?: any }>({ industry: 'Biochemistry', service: null, problem: null, hardware: null });
    const [sidebarStep, setSidebarStep] = useState<'industry' | 'service' | 'problem' | 'hardware' | 'ready'>('service');
    const [formSubmitted, setFormSubmitted] = useState(false);

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

    return (
        <AppLayout
            currentMode="industry"
            sidebarContent={
                <div className="p-4 space-y-2">
                    <SidebarWizard step={sidebarStep} config={sessionConfig} onSelect={handleWizardSelection} />
                </div>
            }
        >
            <div className="flex flex-col h-full">
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

                {(sidebarStep !== 'ready' || sessionConfig.formData) && (
                    <ChatInterface
                        mode="industry"
                        contextConfig={sessionConfig}
                        placeholder="Ask Quantum Assistant (Industry Mode)..."
                    />
                )}
            </div>
        </AppLayout>
    );
}
