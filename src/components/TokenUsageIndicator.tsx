"use client";

import React, { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const DEFAULT_GUEST_LIMIT = 100000;
const STORAGE_KEY = 'qg_session_tokens_used';
const SIM_STORAGE_KEY = 'qg_session_sim_minutes_used';

export function TokenUsageStats() {
    const { user, isAuthenticated, updateUser } = useAuth();
    const [tokensUsed, setTokensUsed] = useState<number>(0);
    const [simMinutesUsed, setSimMinutesUsed] = useState<number>(0);

    const sessionTokenLimit = user?.tokenLimit || DEFAULT_GUEST_LIMIT;
    const sessionSimLimit = user?.simMinutesLimit || 5;

    useEffect(() => {
        // Tokens
        if (isAuthenticated && user?.tokensUsed !== undefined) {
            setTokensUsed(user.tokensUsed);
        } else {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = parseInt(stored, 10);
                if (!isNaN(parsed)) setTokensUsed(parsed);
            }
        }

        // Sim Minutes
        if (isAuthenticated && user?.simMinutesUsed !== undefined) {
            setSimMinutesUsed(user.simMinutesUsed);
        } else {
            const stored = sessionStorage.getItem(SIM_STORAGE_KEY);
            if (stored) {
                const parsed = parseFloat(stored);
                if (!isNaN(parsed)) setSimMinutesUsed(parsed);
            }
        }
    }, [isAuthenticated, user?.tokensUsed, user?.simMinutesUsed]);

    useEffect(() => {
        const handleTokenUpdate = (e: Event) => {
            const { delta } = (e as CustomEvent<{ delta: number }>).detail;
            if (typeof delta !== 'number' || isNaN(delta)) return;
            setTokensUsed((prev: number) => {
                const newTotal = Math.min(prev + delta, sessionTokenLimit);
                if (!isAuthenticated) {
                    sessionStorage.setItem(STORAGE_KEY, String(newTotal));
                } else if (updateUser && user?.email) {
                    updateUser({ tokensUsed: newTotal });
                    fetch('/api/auth/sync-usage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: user.email, tokensDelta: delta })
                    }).catch(err => console.error("Failed to sync token usage", err));
                }
                return newTotal;
            });
        };

        const handleSimUpdate = (e: Event) => {
            const { delta } = (e as CustomEvent<{ delta: number }>).detail;
            if (typeof delta !== 'number' || isNaN(delta)) return;
            setSimMinutesUsed((prev: number) => {
                const newTotal = Math.min(prev + delta, sessionSimLimit);
                if (!isAuthenticated) {
                    sessionStorage.setItem(SIM_STORAGE_KEY, String(newTotal));
                } else if (updateUser && user?.email) {
                    updateUser({ simMinutesUsed: newTotal });
                    fetch('/api/auth/sync-usage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: user.email, simMinutesDelta: delta })
                    }).catch(err => console.error("Failed to sync sim minutes usage", err));
                }
                return newTotal;
            });
        };

        window.addEventListener('qg:token-update', handleTokenUpdate);
        window.addEventListener('qg:simminutes-update', handleSimUpdate);
        return () => {
            window.removeEventListener('qg:token-update', handleTokenUpdate);
            window.removeEventListener('qg:simminutes-update', handleSimUpdate);
        };
    }, [isAuthenticated, sessionTokenLimit, sessionSimLimit, updateUser]);

    const remaining = Math.max(sessionTokenLimit - tokensUsed, 0);
    const fillPercent = Math.min((tokensUsed / sessionTokenLimit) * 100, 100);
    const remainingPercent = 100 - fillPercent;

    const isWarning = remainingPercent <= 10;
    const isCritical = remainingPercent <= 5;
    const barColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-primary';

    return (
        <div className="space-y-4">
            {/* Tokens Section */}
            <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-foreground">QG Token</span>
                    <span className="font-medium text-muted-foreground tabular-nums">
                        {tokensUsed.toLocaleString()} / {sessionTokenLimit.toLocaleString()}
                    </span>
                </div>
                <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mb-1.5">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                        style={{ width: `${fillPercent}%` }}
                    />
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground/80 font-medium">
                    <span className="uppercase tracking-wider">
                        {isCritical ? '⚠️ Almost out' : isWarning ? '⚠️ Low tokens' : 'Tokens'}
                    </span>
                    <span>{remaining.toLocaleString()} remaining</span>
                </div>
            </div>

            {/* Sim Minutes Section */}
            <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-foreground">Simulator minutes</span>
                    <span className="font-medium text-muted-foreground tabular-nums">
                        {simMinutesUsed.toFixed(1)} / {sessionSimLimit} min
                    </span>
                </div>
                <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mb-1.5">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${simMinutesUsed / sessionSimLimit >= 0.9 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min((simMinutesUsed / sessionSimLimit) * 100, 100)}%` }}
                    />
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground/80 font-medium">
                    <span className="uppercase tracking-wider">
                        {simMinutesUsed >= sessionSimLimit ? '⚠️ Exhausted' : 'Quota'}
                    </span>
                    <span>{(sessionSimLimit - simMinutesUsed).toFixed(1)} min left</span>
                </div>
            </div>
        </div>
    );
}

export default function TokenUsageIndicator({ onMenuClick }: { onMenuClick?: () => void }) {
    const { user, isAuthenticated } = useAuth();

    if (!onMenuClick) return null;

    return (
        <div className="flex items-center justify-end p-2.5">
            <button
                onClick={onMenuClick}
                title="Account"
                className="w-9 h-9 shrink-0 rounded-[14px] bg-secondary border border-border flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm"
            >
                {isAuthenticated && user ? (
                    <span className="text-sm font-medium">
                        {user.firstName && user.lastName 
                            ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                            : (user.firstName || user.email || 'U').substring(0, 2).toUpperCase()}
                    </span>
                ) : (
                    <UserIcon size={17} strokeWidth={2.2} />
                )}
            </button>
        </div>
    );
}
