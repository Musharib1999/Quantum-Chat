"use client";

import React, { useState } from 'react';
import { Menu, ChevronDown } from 'lucide-react';
import AdminProfileModal from './AdminProfileModal';

interface AdminNavbarProps {
    setIsMobileMenuOpen: (open: boolean) => void;
    setShowPasswordModal: (show: boolean) => void;
}

export default function AdminNavbar({ setIsMobileMenuOpen, setShowPasswordModal }: AdminNavbarProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    return (
        <header className="bg-transparent border-b h-20 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-[100] transition-all duration-300 border-[rgb(27,176,206)]/20">
            <div className="flex items-center gap-4">
                <button
                    className="md:hidden p-2 text-[#0F172A] hover:bg-white rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(true)}
                >
                    <Menu size={24} />
                </button>
            </div>

            <div className="flex items-center gap-4">
                {/* Profile Toggle */}
                <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2.5 pl-2.5 pr-2 py-1.5 hover:bg-white rounded-xl border border-transparent hover:border-[rgb(27,176,206)]/20 transition-all group"
                >
                    <div className="w-8 h-8 rounded-lg bg-white border border-[rgb(27,176,206)]/20 flex items-center justify-center text-[#0F172A] font-bold text-xs shadow-sm transition-transform group-hover:scale-105">
                        A
                    </div>
                    <ChevronDown size={14} className={`text-[#0F172A] transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Admin Profile Modal — same design as UserProfileModal */}
                <AdminProfileModal 
                    isOpen={isProfileOpen} 
                    onClose={() => setIsProfileOpen(false)} 
                    onShowPassword={() => setShowPasswordModal(true)}
                />
            </div>
        </header>
    );
}
