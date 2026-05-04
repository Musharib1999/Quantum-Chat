"use client";

import React, { useState } from 'react';
import AdminSidebar from '../../../components/admin/AdminSidebar';
import AdminNavbar from '../../../components/admin/AdminNavbar';
import KnowledgeBaseManager from '../../../components/admin/KnowledgeBaseManager';
import { useAuth } from '@/context/AuthContext';
import GuardrailManager from '../../../components/admin/GuardrailManager';
import ChatLogViewer from '../../../components/admin/ChatLogViewer';
import PasswordModal from '../../../components/admin/PasswordModal';

import StockManager from '../../../components/admin/StockManager';
import ArticleManager from '../../../components/admin/ArticleManager';
import ProblemConsole from '../../../components/admin/ProblemConsole';
import UserManager from '../../../components/admin/UserManager';
import NewsManager from '../../../components/admin/NewsManager';
import PromptEditor from '../../../components/admin/PromptEditor';
import UseCaseManager from '../../../components/admin/UseCaseManager';
import ExperimentManager from '../../../components/admin/ExperimentManager';
import EnterpriseStreamManager from '../../../components/admin/EnterpriseStreamManager';
import MarketPromptManager from '../../../components/admin/MarketPromptManager';
import LLMSettingsManager from '../../../components/admin/LLMSettingsManager';
import StockSearchDebugger from '../../../components/admin/StockSearchDebugger';
import AcademyManager from '../../../components/admin/AcademyManager';
import HardwareManager from '../../../components/admin/HardwareManager';
import BlockedSourceManager from '../../../components/admin/BlockedSourceManager';

export default function AdminDashboard() {
    const { user } = useAuth();
    const isDarkMode = false;
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    
    // Default to 'forms' for builders, 'knowledge_base' for everyone else
    const defaultTab = user?.role === 'builder' ? 'forms' : 'knowledge_base';
    const initialTab = searchParams?.get('tab') || defaultTab;
    
    const [activeTab, setActiveTab] = useState(initialTab);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // Permission Check: Builders can only see 'forms'
    const canSee = (tab: string) => {
        if (user?.role === 'builder') return tab === 'forms';
        return true;
    };

    return (
        <div className="flex h-screen w-full transition-colors duration-500 ease-in-out font-sans overflow-hidden bg-white text-slate-900">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] bg-black"
                    style={{ backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)' }}
                />
            </div>

            <AdminSidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                isMobileMenuOpen={isMobileMenuOpen} 
                setIsMobileMenuOpen={setIsMobileMenuOpen} 
                role={user?.role}
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 transition-colors duration-500 ease-in-out">
                <AdminNavbar 
                    setIsMobileMenuOpen={setIsMobileMenuOpen} 
                    setShowPasswordModal={setShowPasswordModal} 
                />

                <div className="flex-1 overflow-auto p-4 md:p-8 bg-transparent">
                    {activeTab === 'knowledge_base' && canSee('knowledge_base') && <KnowledgeBaseManager />}
                    {activeTab === 'guardrails' && canSee('guardrails') && <GuardrailManager />}
                    {activeTab === 'logs' && canSee('logs') && <ChatLogViewer />}
                    
                    {activeTab === 'stocks' && canSee('stocks') && <StockManager />}
                    {activeTab === 'articles' && canSee('articles') && <ArticleManager />}
                    {activeTab === 'prompts' && canSee('prompts') && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto space-y-6">
                            <div className="p-6 rounded-2xl border border-slate-200 mb-6 backdrop-blur-md bg-white">
                                <h3 className="flex items-center gap-2 font-semibold text-slate-900 text-lg">
                                    System instructions (Prompts)
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">Dynamically control the underlying text strings injected into the LLM context.</p>
                            </div>
                            <PromptEditor />
                        </div>
                    )}
                    {activeTab === 'forms' && <ProblemConsole />}
                    {activeTab === 'hardware' && canSee('hardware') && <HardwareManager />}
                    {activeTab === 'market_prompts' && canSee('market_prompts') && <MarketPromptManager />}
                    {activeTab === 'news' && canSee('news') && <NewsManager />}
                    {activeTab === 'news_blocklist' && canSee('news_blocklist') && <BlockedSourceManager />}
                    {activeTab === 'use_cases' && canSee('use_cases') && <UseCaseManager />}
                    {activeTab === 'enterprise_streams' && canSee('enterprise_streams') && <EnterpriseStreamManager />}
                    {activeTab === 'experiments' && canSee('experiments') && <ExperimentManager />}
                    {activeTab === 'users' && canSee('users') && <UserManager />}
                    {activeTab === 'academy' && canSee('academy') && <AcademyManager />}
                    {activeTab === 'analytics' && canSee('analytics') && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <h3 className="text-xl font-semibold text-slate-900">Analytics module</h3>
                            <p className="text-sm">Usage statistics and query insights coming soon.</p>
                        </div>
                    )}
                    {activeTab === 'stock_debug' && canSee('stock_debug') && <StockSearchDebugger />}
                    {activeTab === 'llm_settings' && canSee('llm_settings') && <LLMSettingsManager />}
                </div>
            </div>

            {showPasswordModal && <PasswordModal setShowPasswordModal={setShowPasswordModal} />}
        </div>
    );
}

// -------------------------------------------------------------------------------- //
// TAB COMPONENTS
// -------------------------------------------------------------------------------- //
