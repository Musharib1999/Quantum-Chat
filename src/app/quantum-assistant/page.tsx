"use client";

import React, { useState } from 'react';
import AssistantChat from '@/components/chat/AssistantChat';
import TokenUsageIndicator from '@/components/TokenUsageIndicator';
import UserProfileModal from '@/components/UserProfileModal';

export default function QuantumAssistantPage() {
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen w-full bg-background overflow-hidden relative">
            {/* Custom Header overlaying the chat */}
            <header className="absolute top-0 left-0 right-0 z-50 flex items-start justify-between p-4 md:pt-6 md:px-8 pointer-events-none">
                {/* Left: Branding */}
                <div className="flex items-center pointer-events-auto">
                    <a href="https://www.quantumcomputers.guru/">
                        <img src="/logo.png" alt="Quantum Guru" className="h-12 md:h-[80px] w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity drop-shadow-sm" />
                    </a>
                </div>

                {/* Right: Token Indicator & Burger Menu */}
                <div className="pointer-events-auto flex items-start gap-4">
                    {/* Re-using TokenUsageIndicator, but overriding its default border-b to look like a floating card */}
                    <div className="bg-card/90 backdrop-blur-xl border border-border shadow-lg rounded-2xl overflow-hidden min-w-[200px]">
                        {/* We use negative margins or just let its internal padding handle it */}
                        <div className="[&>div]:border-none [&>div]:px-3 [&>div]:py-2.5">
                            <TokenUsageIndicator onMenuClick={() => setIsProfileModalOpen(true)} />
                        </div>
                    </div>
                </div>
            </header>

            {/* Profile Modal */}
            <UserProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />

            {/* Main Chat Area */}
            <main className="flex-1 w-full h-full relative z-10 pt-20">
                <AssistantChat />
            </main>
        </div>
    );
}
