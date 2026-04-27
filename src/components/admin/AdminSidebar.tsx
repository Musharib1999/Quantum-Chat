"use client";

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, FlaskConical, Eye, EyeOff } from 'lucide-react';

interface SidebarLinkProps {
    label: string;
    active: boolean;
    onClick: () => void;
    isExperimental?: boolean;
}

const SidebarLink = ({ label, active, onClick, isExperimental }: SidebarLinkProps) => {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-all border ${active
                ? 'bg-[#3066bb]/10 text-[#3066bb] border-[#3066bb]/50'
                : 'text-slate-600 hover:bg-[#3066bb]/10 hover:text-slate-900 border-transparent'
                } ${isExperimental ? 'opacity-80' : ''}`}
        >
            <span className={`font-medium text-sm flex items-center gap-2`}>
                {label}
                {isExperimental && <FlaskConical size={12} className="text-amber-500" />}
            </span>
        </button>
    );
};

interface AdminSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
    role?: string;
}

export default function AdminSidebar({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen, role }: AdminSidebarProps) {
    const [showFuture, setShowFuture] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('qg_admin_show_future');
        if (saved === 'true') setShowFuture(true);
    }, []);

    const toggleFuture = () => {
        const next = !showFuture;
        setShowFuture(next);
        localStorage.setItem('qg_admin_show_future', String(next));
    };

    const handleNav = (tab: string) => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
    };

    return (
        <>
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 border-r flex flex-col transition-all duration-300 ease-in-out backdrop-blur-md
                md:relative md:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                border-[#3066bb]/30 bg-white/70
            `}>
                <div className="p-6 border-b flex items-center justify-between border-[#3066bb]/30 h-20">
                    <a href="https://www.quantumcomputers.guru/" target="_self" className="flex items-center hover:opacity-90 transition-opacity">
                        <img src="/logo.png" alt="Quantum Guru" className="h-[40px] md:h-[62px] w-auto object-contain" />
                    </a>
                    <button className="md:hidden p-2 hover:bg-secondary/50 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                        <X size={20} className="text-slate-900" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
                    {role === 'builder' ? (
                        <>
                            <div className="px-4 py-2 mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Builder Hub</span>
                            </div>
                            <SidebarLink
                                label="Industry Pipeline"
                                active={false}
                                onClick={() => window.location.href = '/industry'}
                            />
                            <SidebarLink
                                label="Market Intelligence"
                                active={false}
                                onClick={() => window.location.href = '/market'}
                            />
                            <SidebarLink
                                label="Quantum Info Analysis"
                                active={false}
                                onClick={() => window.location.href = '/article-learn'}
                            />
                            <SidebarLink
                                label="Quantum Guru LLM"
                                active={false}
                                onClick={() => window.location.href = '/'}
                            />
                            <div className="pt-4 mt-4 border-t border-[#3066bb]/20">
                                <SidebarLink
                                    label="Problem Console"
                                    active={activeTab === 'forms'}
                                    onClick={() => handleNav('forms')}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <SidebarLink
                                label="Knowledge Base"
                                active={activeTab === 'knowledge_base'}
                                onClick={() => handleNav('knowledge_base')}
                            />
                            <SidebarLink
                                label="Guardrails (Safety)"
                                active={activeTab === 'guardrails'}
                                onClick={() => handleNav('guardrails')}
                            />
                            <SidebarLink
                                label="System Prompts"
                                active={activeTab === 'prompts'}
                                onClick={() => handleNav('prompts')}
                            />
                            <SidebarLink
                                label="Stocks"
                                active={activeTab === 'stocks'}
                                onClick={() => handleNav('stocks')}
                            />
                            
                            <SidebarLink
                                label="Problem Console"
                                active={activeTab === 'forms'}
                                onClick={() => handleNav('forms')}
                            />

                            <SidebarLink
                                label="Hardware"
                                active={activeTab === 'hardware'}
                                onClick={() => handleNav('hardware')}
                            />
                            <SidebarLink
                                label="News Integration"
                                active={activeTab === 'news'}
                                onClick={() => handleNav('news')}
                            />
                            <SidebarLink
                                label="Articles"
                                active={activeTab === 'articles'}
                                onClick={() => handleNav('articles')}
                            />
                            <SidebarLink
                                label="Users"
                                active={activeTab === 'users'}
                                onClick={() => handleNav('users')}
                            />
                            <SidebarLink
                                label="Chat Logs"
                                active={activeTab === 'logs'}
                                onClick={() => handleNav('logs')}
                            />
                            <SidebarLink
                                label="LLM Settings"
                                active={activeTab === 'llm_settings'}
                                onClick={() => handleNav('llm_settings')}
                            />
                        </>
                    )}

                    {showFuture && role !== 'builder' && (
                        <div className="pt-4 mt-4 border-t border-[#3066bb]/20 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="px-4 mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Future Scope</span>
                            </div>
                            <SidebarLink
                                label="Market Prompts"
                                active={activeTab === 'market_prompts'}
                                onClick={() => handleNav('market_prompts')}
                                isExperimental
                            />
                            <SidebarLink
                                label="Use Cases"
                                active={activeTab === 'use_cases'}
                                onClick={() => handleNav('use_cases')}
                                isExperimental
                            />
                            <SidebarLink
                                label="Enterprise Streams"
                                active={activeTab === 'enterprise_streams'}
                                onClick={() => handleNav('enterprise_streams')}
                                isExperimental
                            />
                            <SidebarLink
                                label="Shot Logs"
                                active={activeTab === 'experiments'}
                                onClick={() => handleNav('experiments')}
                                isExperimental
                            />
                            <SidebarLink
                                label="News Blocklist"
                                active={activeTab === 'news_blocklist'}
                                onClick={() => handleNav('news_blocklist')}
                                isExperimental
                            />
                            <SidebarLink
                                label="Analytics"
                                active={activeTab === 'analytics'}
                                onClick={() => handleNav('analytics')}
                                isExperimental
                            />
                            <SidebarLink
                                label="Stock Debugger"
                                active={activeTab === 'stock_debug'}
                                onClick={() => handleNav('stock_debug')}
                                isExperimental
                            />
                        </div>
                    )}
                </nav>

                <div className="p-4 border-t border-[#3066bb]/20 bg-white/50 backdrop-blur-sm">
                    <button
                        onClick={() => window.location.href = '/developer'}
                        className="w-full flex items-center px-4 py-2 rounded-lg transition-all border text-slate-600 hover:bg-[#3066bb]/5 hover:text-[#3066bb] border-transparent hover:border-[#3066bb]/30"
                    >
                        <span className="font-bold text-sm">Developer Console</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
