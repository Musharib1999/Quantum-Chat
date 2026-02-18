"use client";

import React from 'react';
import EmbedChat from '@/components/chat/EmbedChat';

export default function EmbedChatPage() {
    return (
        <div className="h-screen w-screen bg-transparent flex flex-col overflow-hidden">
            {/* Header - Minimal */}
            <header className="h-12 bg-white/50 backdrop-blur-sm border-b border-gray-100 flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">QG</span>
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
