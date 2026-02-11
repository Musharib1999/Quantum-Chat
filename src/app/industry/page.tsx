"use client";

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import ChatInterface from '@/components/ChatInterface';
import SidebarWizard from '@/components/SidebarWizard';

export default function IndustryPage() {
    const [sessionConfig, setSessionConfig] = useState<{ industry: string | null, service: string | null, problem: string | null, hardware: string | null }>({ industry: 'Biochemistry', service: null, problem: null, hardware: null });
    const [sidebarStep, setSidebarStep] = useState<'industry' | 'service' | 'problem' | 'hardware' | 'ready'>('service');

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

    return (
        <AppLayout
            currentMode="industry"
            sidebarContent={
                <div className="p-4 space-y-2">
                    <SidebarWizard step={sidebarStep} config={sessionConfig} onSelect={handleWizardSelection} />
                </div>
            }
        >
            <ChatInterface
                mode="industry"
                contextConfig={sessionConfig}
                placeholder="Ask Quantum Assistant (Industry Mode)..."
                initialMessage="Quantum Interface Initialized. Systems Online.\n\nPlease complete the configuration sequence in the sidebar to begin your session."
            />
        </AppLayout>
    );
}
