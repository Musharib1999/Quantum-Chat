"use client";

import React, { useState } from 'react';
import AssistantChat from '@/components/chat/AssistantChat';
import TokenUsageIndicator from '@/components/TokenUsageIndicator';
import UserProfileModal from '@/components/UserProfileModal';

export default function QuantumAssistantPage() {
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen w-full bg-[oklch(0.985_0.003_260.000)] overflow-hidden text-slate-800">
            {/* Custom Header (Fixed at top, relative layout flow) */}
            <header className="w-full h-20 shrink-0 flex items-center justify-between px-6 bg-white z-50 shadow-sm">
                {/* Left: Branding */}
                <div className="flex items-center shrink-0">
                    <a href="https://www.quantumcomputers.guru/">
                        <img src="/logo.png" alt="Quantum Guru" className="h-[40px] md:h-[62px] w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity drop-shadow-sm" />
                    </a>
                </div>

                {/* Right: Account Menu */}
                <div className="flex items-center">
                    <TokenUsageIndicator onMenuClick={() => setIsProfileModalOpen(true)} />
                </div>
            </header>

            {/* Profile Modal */}
            <UserProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />

            {/* Main Chat Area - Occupies remaining height underneath header */}
            <main className="flex-1 w-full overflow-hidden relative z-10">
                <AssistantChat />
            </main>
        </div>
    );
}
