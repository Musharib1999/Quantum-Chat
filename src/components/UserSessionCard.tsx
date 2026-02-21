import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Lock, Unlock, User as UserIcon } from 'lucide-react';

export default function UserSessionCard() {
    const { user, isAuthenticated, logout } = useAuth();

    if (isAuthenticated) {
        return (
            <div className="p-4 border-b border-border bg-card/10">
                <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-sm uppercase shadow-inner">
                            {user?.name?.substring(0, 2) || 'QG'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">{user?.name || 'Quantum User'}</p>
                            <div className="flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-300 mt-0.5 font-medium">
                                <Unlock size={12} strokeWidth={2} />
                                <span>Pro Plan Active</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="p-2 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                        title="Logout"
                    >
                        <LogOut size={18} strokeWidth={1.5} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 border-b border-border bg-card/10">
            <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-border opacity-70">
                <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground text-xs">
                    <UserIcon size={16} className="text-muted-foreground" />
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-foreground truncate">Guest Session</p>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <Lock size={12} strokeWidth={2} />
                        <span>Limited Access</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
