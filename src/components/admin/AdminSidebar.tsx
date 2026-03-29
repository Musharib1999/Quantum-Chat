"use client";

import React from 'react';
import { X } from 'lucide-react';

interface SidebarLinkProps {
    label: string;
    active: boolean;
    onClick: () => void;
}

const SidebarLink = ({ label, active, onClick }: SidebarLinkProps) => {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition-all border ${active
                ? 'bg-[#3066bb]/10 text-[#3066bb] border-[#3066bb]/50'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent'
                }`}
        >
            <span className="font-medium text-sm">{label}</span>
        </button>
    );
};

interface AdminSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
}

export default function AdminSidebar({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen }: AdminSidebarProps) {
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
                border-slate-200 bg-white/70
            `}>
                <div className="p-6 border-b flex items-center justify-between border-slate-200 h-20">
                    <a href="https://www.quantumcomputers.guru/" target="_self" className="flex items-center hover:opacity-90 transition-opacity">
                        <img src="/logo.png" alt="Quantum Guru" className="h-[40px] md:h-[62px] w-auto object-contain" />
                    </a>
                    <button className="md:hidden p-2 hover:bg-secondary/50 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                        <X size={20} className="text-slate-900" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1 mt-4 overflow-y-auto">
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
                        label="System Prompts (AI Logic)"
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
                        label="Market Prompts"
                        active={activeTab === 'market_prompts'}
                        onClick={() => handleNav('market_prompts')}
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
                        label="News Blocklist"
                        active={activeTab === 'news_blocklist'}
                        onClick={() => handleNav('news_blocklist')}
                    />
                    <SidebarLink
                        label="Use Cases"
                        active={activeTab === 'use_cases'}
                        onClick={() => handleNav('use_cases')}
                    />
                    <SidebarLink
                        label="Enterprise Streams"
                        active={activeTab === 'enterprise_streams'}
                        onClick={() => handleNav('enterprise_streams')}
                    />
                    <SidebarLink
                        label="Shot Logs"
                        active={activeTab === 'experiments'}
                        onClick={() => handleNav('experiments')}
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
                        label="Analytics"
                        active={activeTab === 'analytics'}
                        onClick={() => handleNav('analytics')}
                    />
                    <SidebarLink
                        label="Stock Debugger"
                        active={activeTab === 'stock_debug'}
                        onClick={() => handleNav('stock_debug')}
                    />
                    <SidebarLink
                        label="LLM Settings"
                        active={activeTab === 'llm_settings'}
                        onClick={() => handleNav('llm_settings')}
                    />
                    <div className="h-px bg-slate-100 my-4" />
                    <button
                        onClick={() => window.location.href = '/developer'}
                        className="w-full flex items-center px-4 py-3 rounded-lg transition-all border text-slate-600 hover:bg-[#3066bb]/5 hover:text-[#3066bb] border-transparent hover:border-[#3066bb]/30"
                    >
                        <span className="font-bold text-sm">Developer Console</span>
                    </button>
                </nav>
            </aside>
        </>
    );
}
