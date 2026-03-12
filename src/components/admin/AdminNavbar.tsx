"use client";

import React from 'react';
import { Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AdminNavbarProps {
    activeTab: string;
    setIsMobileMenuOpen: (open: boolean) => void;
    setShowPasswordModal: (show: boolean) => void;
}

export default function AdminNavbar({ activeTab, setIsMobileMenuOpen, setShowPasswordModal }: AdminNavbarProps) {
    const router = useRouter();

    const formatTabName = (tab: string) => {
        if (tab === 'forms') return 'Problem console';
        return tab.replace('_', ' ');
    };

    return (
        <header className="bg-transparent border-b h-16 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-30 transition-all duration-300 border-slate-200">
            <div className="flex items-center gap-4">
                <button
                    className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(true)}
                >
                    <Menu size={24} />
                </button>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm md:text-base">
                    {formatTabName(activeTab)}
                </h2>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowPasswordModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all font-medium text-xs border border-transparent hover:border-slate-200"
                    >
                        Password
                    </button>
                    <button
                        onClick={() => router.push('/admin/login')}
                        className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:bg-red-50/80 hover:text-red-600 rounded-lg transition-all font-medium text-xs border border-transparent hover:border-red-100"
                    >
                        Logout
                    </button>
                </div>

                <div className="h-4 w-px bg-slate-200" />

                <div className="text-xs text-right hidden sm:block">
                    <p className="font-semibold text-slate-900 text-sm">Administrator</p>
                    <p className="text-[10px] text-green-500 font-medium flex items-center justify-end gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Online
                    </p>
                </div>
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-900 border border-slate-200 font-semibold text-xs">A</div>
            </div>
        </header>
    );
}
