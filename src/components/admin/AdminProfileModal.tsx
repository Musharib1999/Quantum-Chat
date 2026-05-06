"use client";

import React, { useRef, useEffect } from 'react';
import { LogOut, Lock, User as UserIcon, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface AdminProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onShowPassword: () => void;
}

export default function AdminProfileModal({ isOpen, onClose, onShowPassword }: AdminProfileModalProps) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const cardRef = useRef<HTMLDivElement>(null);

    // Close when clicking anywhere outside the card
    useEffect(() => {
        if (!isOpen) return;
        const handleMouseDown = (e: MouseEvent) => {
            if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleMouseDown, true);
        return () => document.removeEventListener('mousedown', handleMouseDown, true);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleLogout = () => {
        logout();
        router.push('/admin/login');
        onClose();
    };

    const handlePasswordReset = () => {
        onShowPassword();
        onClose();
    };

    return (
        <div
            ref={cardRef}
            style={{ position: 'fixed', top: '64px', right: '16px', zIndex: 201, width: '260px' }}
            className="bg-white/95 backdrop-blur-xl border border-[rgb(27,176,206)]/30 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden"
        >
            {/* Admin Info Header */}
            <div className="p-5 border-b border-[rgb(27,176,206)]/20">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-[rgb(27,176,206)]/20 flex items-center justify-center text-[#0F172A] font-bold">
                            {user?.firstName ? user.firstName[0].toUpperCase() : 'A'}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-[#0F172A] truncate">
                                {user?.role === 'builder' ? 'Quantum Builder' : 'Administrator'}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate">{user?.email || 'admin@quantumguru.com'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-100 w-fit">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider text-xs">System Online</span>
                    </div>

                    {/* API Key Section */}
                    {user?.apiKey && (
                        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>Master API Key</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-[10px] font-mono p-1.5 bg-white border border-slate-200 rounded text-slate-500 truncate">
                                    {user.apiKey}
                                </code>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(user.apiKey || '');
                                        alert("API Key copied!");
                                    }}
                                    className="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-[#3066bb]"
                                    title="Copy to clipboard"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-2 space-y-1">
                <button
                    onClick={handlePasswordReset}
                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-[#0F172A] hover:text-[#0F172A] hover:bg-white transition-all"
                >
                    <Lock size={16} />
                    <span>Security Settings</span>
                </button>

                <div className="pt-1 border-t border-slate-50 mt-1">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:text-red-500 hover:bg-red-50 transition-all font-semibold"
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
