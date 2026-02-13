"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Link from 'next/link';

interface AppLayoutProps {
    children: React.ReactNode;
    sidebarContent: React.ReactNode;
    currentMode: 'industry' | 'market' | 'article';
}

export default function AppLayout({ children, sidebarContent, currentMode }: AppLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setIsSidebarOpen(false);
            else setIsSidebarOpen(true);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex h-screen bg-background font-sans overflow-hidden text-foreground relative selection:bg-zinc-500/30">
            <div className="fixed inset-0 bg-background z-0 pointer-events-none"></div>
            <div className="fixed inset-0 bg-background/80 z-0 pointer-events-none"></div>

            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside className={`
                z-40 bg-card/80 backdrop-blur-2xl border-r border-border flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${isMobile ? 'fixed inset-y-0 left-0 h-full shadow-2xl' : 'relative h-full'}
                ${isSidebarOpen ? 'w-80 translate-x-0 opacity-100' : 'w-0 -translate-x-10 opacity-0 overflow-hidden'}
            `}>
                <button
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-card hover:bg-secondary hover:text-foreground rounded-r-xl flex items-center justify-center transition-all z-50 backdrop-blur-md border border-l-0 border-border shadow-md text-muted-foreground"
                >
                    <ChevronLeft size={14} className={`transition-transform duration-500 ${!isSidebarOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className="p-6 border-b border-border flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center shadow-sm text-primary">
                        <span className="font-bold text-xs">QG</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-wide text-foreground">Quantum Guru</h1>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto overflow-x-hidden">
                    {sidebarContent}
                </nav>

                <div className="p-4 border-t border-border bg-card/50 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Appearance</span>
                        <ThemeToggle />
                    </div>

                    <div className="pt-4 border-t border-border space-y-2">
                        <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-secondary/50 border border-border">
                            <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-foreground font-black text-xs">US</div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-bold text-foreground truncate">User Session</p>
                                <p className="text-[10px] text-muted-foreground truncate">Pro Plan Active</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {isMobile && !isSidebarOpen && (
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="absolute top-4 left-4 z-50 w-10 h-10 bg-card/80 backdrop-blur-md border border-border rounded-xl flex items-center justify-center text-foreground shadow-lg"
                >
                    <div className="w-5 h-5 flex flex-col justify-center gap-1">
                        <div className="w-full h-0.5 bg-foreground rounded-full"></div>
                        <div className="w-full h-0.5 bg-foreground rounded-full"></div>
                        <div className="w-full h-0.5 bg-foreground rounded-full"></div>
                    </div>
                </button>
            )}

            <main className="flex-1 flex flex-col h-full relative min-w-0 w-full overflow-hidden z-10 bg-transparent">
                {children}
            </main>
        </div>
    );
}

