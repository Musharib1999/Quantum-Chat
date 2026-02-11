"use client";

import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import QuantumBackground from './QuantumBackground';
import ThemeToggle from './ThemeToggle';

interface AppLayoutProps {
    children: React.ReactNode; // The Chat Interface
    sidebarContent: React.ReactNode;
    currentMode: 'industry' | 'market' | 'article';
}

export default function AppLayout({ children, sidebarContent, currentMode }: AppLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen bg-background font-sans overflow-hidden text-foreground relative selection:bg-purple-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-20 dark:opacity-100 transition-opacity duration-500">
                <QuantumBackground />
            </div>
            <div className="fixed inset-0 bg-background/80 z-0 pointer-events-none backdrop-blur-[1px]"></div>

            {/* --- Left Sidebar (Dynamic) --- */}
            <aside className={`
                relative z-10 bg-black/20 backdrop-blur-2xl border-r border-white/5 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${isSidebarOpen ? 'w-80 translate-x-0 opacity-100' : 'w-0 -translate-x-10 opacity-0 overflow-hidden'}
            `}>
                {/* Toggle Button */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-border/50 hover:bg-purple-500 hover:text-white rounded-r-xl flex items-center justify-center transition-all z-50 backdrop-blur-md border border-l-0 border-white/10 shadow-lg"
                    aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                    <ChevronLeft size={14} className={`transition-transform duration-500 ${!isSidebarOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Brand Header */}
                <div className="p-6 border-b border-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <span className="font-bold text-white text-xs">QG</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Quantum Guru</h1>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">System Online</span>
                        </div>
                    </div>
                </div>

                {/* Sidebar Content */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden">
                    {sidebarContent}
                </nav>

                <div className="p-4 border-t border-border bg-card/20 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Appearance</span>
                        <ThemeToggle />
                    </div>
                </div>
            </aside>

            {/* --- Main Chat Area --- */}
            <main className="flex-1 flex flex-col h-full relative min-w-0 w-full overflow-hidden z-10 bg-transparent">
                {children}
            </main>
        </div>
    );
}
