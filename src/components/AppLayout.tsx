"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import Link from 'next/link';
import TokenUsageIndicator from '@/components/TokenUsageIndicator';
import UserProfileModal from '@/components/UserProfileModal';

interface AppLayoutProps {
    children: React.ReactNode;
    sidebarContent: React.ReactNode;
    rightSidebarContent?: React.ReactNode;
    currentMode: 'industry' | 'market' | 'article';
}

export default function AppLayout({ children, sidebarContent, rightSidebarContent, currentMode }: AppLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setIsSidebarOpen(false);
                setIsRightSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
                setIsRightSidebarOpen(true);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const toggleRightSidebar = () => setIsRightSidebarOpen(!isRightSidebarOpen);

    return (
        <>
            <div className="h-screen w-full bg-background text-foreground flex overflow-hidden relative font-sans antialiased text-sm">

                {/* Fixed Logo */}
                <div className={`fixed top-4 left-4 md:top-6 md:left-8 z-[60] transition-opacity duration-300 ${!isSidebarOpen && isMobile ? 'opacity-0' : 'opacity-100'}`}>
                    <a href="https://www.quantumcomputers.guru/">
                        <img src="/logo.png" alt="Quantum Guru" className="h-[40px] md:h-[70px] w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity drop-shadow-sm" />
                    </a>
                </div>

                <div className="fixed inset-0 bg-background z-0 pointer-events-none"></div>
                <div className="fixed inset-0 bg-background/80 z-0 pointer-events-none"></div>

                {isMobile && (isSidebarOpen || isRightSidebarOpen) && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-in fade-in duration-300"
                        onClick={() => {
                            setIsSidebarOpen(false);
                            setIsRightSidebarOpen(false);
                        }}
                    />
                )}

                {/* Left Sidebar */}
                <aside className={`
                z-40 bg-card/80 backdrop-blur-2xl border-r border-border flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${isMobile ? 'fixed inset-y-0 left-0 h-full shadow-2xl' : 'relative h-full'}
                ${isSidebarOpen ? 'w-80 translate-x-0 opacity-100' : 'w-0 -translate-x-10 opacity-0 overflow-hidden'}
            `}>
                    <nav className="flex-1 overflow-y-auto overflow-x-hidden pt-20">
                        {sidebarContent}
                    </nav>
                </aside>

                {/* Desktop Left Sidebar Toggle - Moved Outside */}
                {!isMobile && (
                    <button
                        onClick={toggleSidebar}
                        className={`absolute top-1/2 -translate-y-1/2 w-6 h-12 bg-card hover:bg-secondary hover:text-foreground rounded-r-xl flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-50 backdrop-blur-md border border-l-0 border-border shadow-md text-muted-foreground
                    ${isSidebarOpen ? 'left-80' : 'left-0'}
                    `}
                    >
                        <ChevronLeft size={14} className={`transition-transform duration-500 ${!isSidebarOpen ? 'rotate-180' : ''}`} />
                    </button>
                )}

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


                {/* Right Sidebar */}
                {(rightSidebarContent || ['industry', 'market', 'article'].includes(currentMode)) && (
                    <>
                        {/* Desktop Right Sidebar Toggle - Moved Outside */}
                        {!isMobile && (
                            <button
                                onClick={toggleRightSidebar}
                                className={`absolute top-1/2 -translate-y-1/2 w-6 h-12 bg-card hover:bg-secondary hover:text-foreground rounded-l-xl flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-50 backdrop-blur-md border border-r-0 border-border shadow-md text-muted-foreground
                            ${isRightSidebarOpen ? 'right-80' : 'right-0'}
                            `}
                            >
                                <ChevronLeft size={14} className={`transition-transform duration-500 ${isRightSidebarOpen ? 'rotate-180' : ''}`} />
                            </button>
                        )}

                        <aside className={`
                        z-40 bg-card/80 backdrop-blur-2xl border-l border-border flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                        ${isMobile ? 'fixed inset-y-0 right-0 h-full shadow-2xl' : 'relative h-full'}
                        ${isRightSidebarOpen ? 'w-80 translate-x-0 opacity-100' : 'w-0 translate-x-10 opacity-0 overflow-hidden'}
                    `}>
                            <div className="h-full flex flex-col">
                                <TokenUsageIndicator onMenuClick={() => setIsProfileModalOpen(true)} />
                                {rightSidebarContent && <div className="flex-1 overflow-hidden">{rightSidebarContent}</div>}
                            </div>
                        </aside>

                        {isMobile && !isRightSidebarOpen && (
                            <button
                                onClick={() => setIsRightSidebarOpen(true)}
                                className="absolute top-4 right-4 z-50 w-10 h-10 bg-card/80 backdrop-blur-md border border-border rounded-xl flex items-center justify-center text-foreground shadow-lg"
                            >
                                <Settings size={20} />
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Profile Modal — sibling to root div, outside all CSS transform stacking contexts */}
            <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
        </>
    );
}

