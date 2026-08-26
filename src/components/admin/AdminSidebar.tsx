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
            className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-all border ${active
                ? 'bg-white text-[#0F172A] border-[rgb(27,176,206)]/50'
                : 'text-[#0F172A] hover:bg-white hover:text-[#0F172A] border-transparent'
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
                border-[rgb(27,176,206)]/30 bg-white/70
            `}>
                <div className="p-6 border-b flex items-center justify-between border-[rgb(27,176,206)]/30 h-20">
                    <a href="https://www.quantumcomputers.guru/" target="_self" className="flex items-center hover:opacity-90 transition-opacity">
                        <img src="/logo.png" alt="Quantum Guru" className="h-[40px] md:h-[62px] w-auto object-contain" />
                    </a>
                    <button className="md:hidden p-2 hover:bg-secondary/50 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                        <X size={20} className="text-[#0F172A]" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
                    {/* Core Management */}
                    <div className="px-4 py-2 mb-2">
                        <span className="text-[10px] font-bold text-[#0F172A] uppercase tracking-widest">Platform</span>
                    </div>
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
                        label="LLM Settings"
                        active={activeTab === 'llm_settings'}
                        onClick={() => handleNav('llm_settings')}
                    />
                    <SidebarLink
                        label="Hardware"
                        active={activeTab === 'hardware'}
                        onClick={() => handleNav('hardware')}
                    />
                    <SidebarLink
                        label="Academy"
                        active={activeTab === 'academy'}
                        onClick={() => handleNav('academy')}
                    />

                    {/* User Management */}
                    <div className="pt-4 mt-4 border-t border-[rgb(27,176,206)]/20">
                        <div className="px-4 mb-2">
                            <span className="text-[10px] font-bold text-[#0F172A] uppercase tracking-widest">Users & Logs</span>
                        </div>
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
                            label="System Logs"
                            active={activeTab === 'system_logs'}
                            onClick={() => handleNav('system_logs')}
                        />
                    </div>
                </nav>
            </aside>
        </>
    );
}
