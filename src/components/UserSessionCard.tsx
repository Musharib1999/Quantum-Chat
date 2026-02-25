"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, Unlock, User as UserIcon, Menu } from 'lucide-react';

interface UserSessionCardProps {
    onOpenModal: () => void;
}

export default function UserSessionCard({ onOpenModal }: UserSessionCardProps) {
    const { user, isAuthenticated } = useAuth();

    return (
        <div className="p-4 border-b border-border bg-card/10">
            {isAuthenticated ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-card border border-border shadow-sm" style={{ borderLeft: '3px solid #3066bb' }}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm uppercase shadow-inner shrink-0" style={{ backgroundColor: '#3066bb' }}>
                            {user?.firstName
                                ? `${user.firstName[0]}${user.lastName?.[0] || ''}`.toUpperCase()
                                : user?.name?.substring(0, 2) || 'QG'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <p className="text-sm font-bold text-zinc-950 dark:text-white truncate leading-tight">
                                {user?.firstName
                                    ? `${user.firstName} ${user.lastName || ''}`.trim()
                                    : user?.name || 'Quantum User'}
                            </p>
                            <div className="flex items-center gap-1 text-[11px] text-zinc-800 dark:text-zinc-200 mt-0.5 font-bold">
                                <Unlock size={12} strokeWidth={2.5} />
                                <span>{user?.plan || 'Pro'} Plan Active</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onOpenModal} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors shrink-0" title="Account">
                        <Menu size={16} strokeWidth={2} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-border">
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-foreground truncate">Guest Session</p>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                            <Lock size={12} strokeWidth={2} />
                            <span>Limited Access</span>
                        </div>
                    </div>
                    <button onClick={onOpenModal} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-muted-foreground hover:text-foreground transition-colors shrink-0" title="Account">
                        <Menu size={16} strokeWidth={2} />
                    </button>
                </div>
            )}
        </div>
    );
}
