"use client";

import React from 'react';
import ChatInterface from '@/components/ChatInterface';

export default function EmbedChatPage() {
    return (
        <div className="h-screen w-full bg-background flex flex-col">
            {/* Header for the Widget */}
            <div className="p-3 border-b border-border bg-card flex items-center gap-2 shadow-sm shrink-0">
                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    QG
                </div>
                <div>
                    <h3 className="font-bold text-sm">Quantum Guru</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs text-muted-foreground">System Online</span>
                    </div>
                </div>
            </div>

            {/* Chat Interface - Filling the rest */}
            <div className="flex-1 overflow-hidden">
                <ChatInterface
                    mode="embed"
                    placeholder="How can I help you today?"
                />
            </div>
        </div>
    );
}
