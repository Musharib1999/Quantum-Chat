"use client";

import React, { useRef, useEffect } from 'react';
import { LogOut, Lock, Unlock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
    const { user, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const cardRef = useRef<HTMLDivElement>(null);

    // Close when clicking anywhere outside the card
    useEffect(() => {
        if (!isOpen) return;
        const handleMouseDown = (e: MouseEvent) => {
            if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        // Use capture phase so it fires before anything else
        document.addEventListener('mousedown', handleMouseDown, true);
        return () => document.removeEventListener('mousedown', handleMouseDown, true);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleLogin = () => {
        const redirect = encodeURIComponent(pathname || '/market');
        router.push(`/login?redirect=${redirect}`);
        onClose();
    };

    const handleLogout = () => {
        logout();
        onClose();
    };

    return (
        <div
            ref={cardRef}
            style={{ position: 'fixed', top: '68px', right: '16px', zIndex: 201, width: '220px' }}
            className="bg-card border border-border rounded-xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
            {/* Session info header */}
            <div className="px-4 py-3 border-b border-border rounded-t-xl">
                {isAuthenticated && user ? (
                    <div>
                        <p className="text-sm text-foreground truncate">
                            {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.name || 'Quantum User'}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                            <Unlock size={11} strokeWidth={2.5} />
                            <span>{user.plan || 'Pro'} Plan</span>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-foreground">Guest Session</p>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                            <Lock size={11} strokeWidth={2} />
                            <span>Limited Access</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Premium CTA */}
            <div className="px-1.5 pt-1.5">
                <button
                    onClick={() => {
                        router.push('/industry');
                        onClose();
                    }}
                    className="w-full flex items-center justify-start px-3 py-3 rounded-lg bg-white border border-transparent text-black hover:ring-1 hover:ring-inset hover:ring-[#00bcd4] transition-all group"
                >
                    <span className="text-xs font-semibold">Try Portfolio Optimization</span>
                </button>
            </div>

            {/* Action button */}
            <div className="p-1.5">
                {isAuthenticated && user ? (
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-sm text-black hover:ring-1 hover:ring-inset hover:ring-[#00bcd4] transition-all"
                    >
                        <LogOut size={14} className="text-black" />
                        Logout
                    </button>
                ) : (
                    <button
                        onClick={handleLogin}
                        className="w-full flex items-center justify-start px-3 py-2 rounded-lg text-sm text-black hover:ring-1 hover:ring-inset hover:ring-[#00bcd4] transition-all"
                    >
                        Login
                    </button>
                )}
            </div>
        </div>
    );
}
