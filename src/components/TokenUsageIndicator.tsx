"use client";

import React, { useState, useEffect } from 'react';
import { Menu, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const DEFAULT_GUEST_LIMIT = 100000;
const STORAGE_KEY = 'qg_session_tokens_used';

export default function TokenUsageIndicator({ onMenuClick }: { onMenuClick?: () => void }) {
    const { user, isAuthenticated, updateUser } = useAuth();
    const [tokensUsed, setTokensUsed] = useState<number>(0);
    const [simMinutesUsed, setSimMinutesUsed] = useState<number>(0);

    const sessionTokenLimit = user?.tokenLimit || DEFAULT_GUEST_LIMIT;
    const sessionSimLimit = user?.simMinutesLimit || 5;
    const SIM_STORAGE_KEY = 'qg_session_sim_minutes_used';

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
                } else if (updateUser) {
                    updateUser({ tokensUsed: newTotal });
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
                } else if (updateUser) {
                    updateUser({ simMinutesUsed: newTotal });
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
    const textColor = isCritical ? 'text-red-500' : isWarning ? 'text-orange-400' : 'text-muted-foreground';

    return (
        <div className="px-4 py-3 border-b border-border">
            {/* Top row: token label + count + big circular burger button */}
            <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-1.5 transition-colors">
                    <span className="text-sm font-medium text-foreground leading-normal">
                        QG Token
                    </span>
                    <span className="text-sm font-medium tabular-nums ml-1 text-foreground leading-normal">
                        {tokensUsed.toLocaleString()} / {sessionTokenLimit.toLocaleString()}
                    </span>
                </div>

                {/* Big highlighted circular burger button */}
                {onMenuClick && (
                    <button
                        onClick={onMenuClick}
                        title="Account"
                        className="w-9 h-9 shrink-0 rounded-[14px] bg-secondary border border-border flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm"
                    >
                        {isAuthenticated && user ? (
                            <span className="text-sm font-medium">{(user.firstName || user.email || 'U').substring(0, 2).toLowerCase()}</span>
                        ) : (
                            <UserIcon size={17} strokeWidth={2.2} />
                        )}
                    </button>
                )}
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-border rounded-full overflow-hidden mb-1.5">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                    style={{ width: `${fillPercent}%` }}
                />
            </div>

            {/* Remaining label */}
            <div className="flex justify-between items-center mb-4">
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none">
                    {isCritical ? '⚠️ Almost out' : isWarning ? '⚠️ Low tokens' : 'Tokens'}
                </span>
                <span className="text-[9px] font-semibold tabular-nums text-muted-foreground leading-none">
                    {remaining.toLocaleString()} remaining
                </span>
            </div>

            {/* Sim Minutes Section */}
            <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-1.5 transition-colors">
                    <span className="text-sm font-medium text-foreground leading-normal">
                        Simulator minutes
                    </span>
                    <span className="text-sm font-medium tabular-nums ml-1 text-foreground leading-normal">
                        {simMinutesUsed.toFixed(1)} / {sessionSimLimit} min
                    </span>
                </div>
            </div>

            {/* Sim Minutes Progress bar */}
            <div className="w-full h-1 bg-border rounded-full overflow-hidden mb-1.5">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${simMinutesUsed / sessionSimLimit >= 0.9 ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min((simMinutesUsed / sessionSimLimit) * 100, 100)}%` }}
                />
            </div>

            <div className="flex justify-between items-center">
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none">
                    {simMinutesUsed >= sessionSimLimit ? '⚠️ Exhausted' : 'Quota'}
                </span>
                <span className="text-[9px] font-semibold tabular-nums text-muted-foreground leading-none">
                    {(sessionSimLimit - simMinutesUsed).toFixed(1)} min left
                </span>
            </div>
        </div>
    );
}
