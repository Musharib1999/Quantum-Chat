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
            <header className="absolute top-0 left-0 right-0 z-50 flex items-start justify-between px-4 py-3 md:pt-4 md:px-8 pointer-events-none">
                {/* Left: Branding */}
                <div className="flex items-center pointer-events-auto">
                    <a href="https://www.quantumcomputers.guru/">
                        <img src="/logo.png" alt="Quantum Guru" className="h-[36px] md:h-[62px] w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity drop-shadow-sm" />
                    </a>
                </div>

                {/* Right: Token Indicator & Burger Menu */}
                <div className="pointer-events-auto flex items-start gap-4">
                    {/* On mobile, collapse the token indicator to save space */}
                    <div className="bg-card/90 backdrop-blur-xl border border-border shadow-lg rounded-2xl overflow-hidden hidden sm:block min-w-[200px]">
                        <div className="[&>div]:border-none [&>div]:px-3 [&>div]:py-2.5">
                            <TokenUsageIndicator onMenuClick={() => setIsProfileModalOpen(true)} />
                        </div>
                    </div>
                    {/* Mobile: compact profile/menu button only */}
                    <button
                        onClick={() => setIsProfileModalOpen(true)}
                        className="sm:hidden w-10 h-10 bg-card/90 backdrop-blur-md border border-border rounded-xl flex items-center justify-center text-foreground shadow-lg"
                        title="Account"
                    >
                        <span className="text-sm font-medium">QG</span>
                    </button>
                </div>
            </header>

            {/* Profile Modal */}
            <UserProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />

            {/* Main Chat Area */}
            <main className="flex-1 w-full h-full relative z-10 pt-16 md:pt-20">
                <AssistantChat />
            </main>
        </div>
    );
}
