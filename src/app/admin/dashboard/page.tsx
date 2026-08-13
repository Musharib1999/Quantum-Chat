"use client";

import React, { useState } from 'react';
import AdminSidebar from '../../../components/admin/AdminSidebar';
import AdminNavbar from '../../../components/admin/AdminNavbar';
import KnowledgeBaseManager from '../../../components/admin/KnowledgeBaseManager';
import { useAuth } from '@/context/AuthContext';
import GuardrailManager from '../../../components/admin/GuardrailManager';
import ChatLogViewer from '../../../components/admin/ChatLogViewer';
import PasswordModal from '../../../components/admin/PasswordModal';
import UserManager from '../../../components/admin/UserManager';
import PromptEditor from '../../../components/admin/PromptEditor';
import LLMSettingsManager from '../../../components/admin/LLMSettingsManager';
import HardwareManager from '../../../components/admin/HardwareManager';
import SystemLogViewer from '../../../components/admin/SystemLogViewer';

export default function AdminDashboard() {
    const { user } = useAuth();
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

    const initialTab = searchParams?.get('tab') || 'knowledge_base';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    return (
        <div className="flex h-screen w-full transition-colors duration-500 ease-in-out font-sans overflow-hidden bg-white text-slate-900">
            {/* Background Grid */}
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
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 transition-colors duration-500 ease-in-out">
                <AdminNavbar
                    setIsMobileMenuOpen={setIsMobileMenuOpen}
                    setShowPasswordModal={setShowPasswordModal}
                />

                <div className="flex-1 overflow-auto p-4 md:p-8 bg-transparent">
                    {activeTab === 'knowledge_base' && <KnowledgeBaseManager />}
                    {activeTab === 'guardrails' && <GuardrailManager />}
                    {activeTab === 'logs' && <ChatLogViewer />}
                    {activeTab === 'system_logs' && <SystemLogViewer />}
                    {activeTab === 'prompts' && (
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
                    {activeTab === 'llm_settings' && <LLMSettingsManager />}
                    {activeTab === 'hardware' && <HardwareManager />}
                    {activeTab === 'users' && <UserManager />}
                </div>
            </div>

            {showPasswordModal && <PasswordModal setShowPasswordModal={setShowPasswordModal} />}
        </div>
    );
}
