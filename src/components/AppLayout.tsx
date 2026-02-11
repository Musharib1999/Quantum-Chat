"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface AppLayoutProps {
    children: React.ReactNode; // The Chat Interface
    sidebarContent: React.ReactNode;
    currentMode: 'industry' | 'market' | 'article';
}

export default function AppLayout({ children, sidebarContent, currentMode }: AppLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // --- Responsive Logic ---
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768; // md breakpoint
            setIsMobile(mobile);
            if (mobile) {
                setIsSidebarOpen(false); // Default closed on mobile
            } else {
                setIsSidebarOpen(true); // Default open on desktop
            }
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex h-screen bg-background font-sans overflow-hidden text-foreground relative selection:bg-zinc-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-background z-0 pointer-events-none"></div>
            <div className="fixed inset-0 bg-background/80 z-0 pointer-events-none"></div>

            {/* --- Mobile Overlay (only visible when sidebar is open on mobile) --- */}
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* --- Left Sidebar (Dynamic) --- */}
            {/* 
                Desktop: relative, pushes content.
                Mobile: fixed, overlays content.
            */}
            <aside className={`
                z-40 bg-black/20 backdrop-blur-2xl border-r border-white/5 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${isMobile ? 'fixed inset-y-0 left-0 h-full shadow-2xl' : 'relative h-full'}
                ${isSidebarOpen ? 'w-80 translate-x-0 opacity-100' : 'w-0 -translate-x-10 opacity-0 overflow-hidden'}
            `}>
                {/* Toggle Button */}
                <button
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-zinc-900/80 hover:bg-zinc-800 hover:text-white rounded-r-xl flex items-center justify-center transition-all z-50 backdrop-blur-md border border-l-0 border-white/10 shadow-lg"
                    aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                    <ChevronLeft size={14} className={`transition-transform duration-500 ${!isSidebarOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className="p-6 border-b border-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center shadow-lg shadow-black/20">
                        <span className="font-bold text-white text-xs text-zinc-400">QG</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-wide text-zinc-100">Quantum Guru</h1>
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

            {/* --- Mobile Header / Toggle (Visible only when sidebar is closed on mobile) --- */}
            {isMobile && !isSidebarOpen && (
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="absolute top-4 left-4 z-50 w-10 h-10 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center text-white shadow-lg"
                >
                    <div className="w-5 h-5 flex flex-col justify-center gap-1">
                        <div className="w-full h-0.5 bg-white rounded-full"></div>
                        <div className="w-full h-0.5 bg-white rounded-full"></div>
                        <div className="w-full h-0.5 bg-white rounded-full"></div>
                    </div>
                </button>
            )}

            {/* --- Main Chat Area --- */}
            <main className="flex-1 flex flex-col h-full relative min-w-0 w-full overflow-hidden z-10 bg-transparent">
                {children}
            </main>
        </div>
    );
}
