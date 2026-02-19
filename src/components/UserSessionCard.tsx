import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Lock, Unlock, User as UserIcon } from 'lucide-react';

export default function UserSessionCard() {
    const { user, isAuthenticated, logout } = useAuth();

    if (isAuthenticated) {
        return (
            <div className="p-4 border-b border-border bg-card/30">
                <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-sm relative overflow-hidden group">
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-primary/5 blur-xl group-hover:bg-primary/10 transition-colors" />

                    <div className="relative z-10 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                        {user?.name?.substring(0, 2) || 'QG'}
                    </div>
                    <div className="relative z-10 flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-foreground truncate">{user?.name || 'Quantum User'}</p>
                        <div className="flex items-center gap-1 text-[10px] text-primary font-medium">
                            <Unlock size={10} />
                            <span>Access Unlocked</span>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="relative z-10 p-1.5 hover:bg-background/50 rounded-lg text-muted-foreground hover:text-red-400 transition-colors"
                        title="Logout"
                    >
                        <LogOut size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 border-b border-border bg-card/30">
            <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-secondary/50 border border-border opacity-70">
                <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-foreground text-xs">
                    <UserIcon size={14} className="text-muted-foreground" />
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-foreground truncate">Guest Session</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Lock size={10} />
                        <span>Limited Access</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
