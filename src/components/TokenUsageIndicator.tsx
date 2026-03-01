"use client";

import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const DEFAULT_GUEST_LIMIT = 100000;
const STORAGE_KEY = 'qg_session_tokens_used';

export default function TokenUsageIndicator({ onMenuClick }: { onMenuClick?: () => void }) {
    const { user, isAuthenticated } = useAuth();
    const [tokensUsed, setTokensUsed] = useState<number>(0);

    const sessionTokenLimit = user?.tokenLimit || DEFAULT_GUEST_LIMIT;

    useEffect(() => {
        if (isAuthenticated && user?.tokensUsed !== undefined) {
            setTokensUsed(user.tokensUsed);
            return;
        }

        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = parseInt(stored, 10);
            if (!isNaN(parsed)) setTokensUsed(parsed);
        }
    }, [isAuthenticated, user?.tokensUsed]);

    useEffect(() => {
        const handleTokenUpdate = (e: Event) => {
            const { delta } = (e as CustomEvent<{ delta: number }>).detail;
            if (typeof delta !== 'number' || isNaN(delta)) return;
            setTokensUsed((prev: number) => {
                const newTotal = Math.min(prev + delta, sessionTokenLimit);
                if (!isAuthenticated) {
                    sessionStorage.setItem(STORAGE_KEY, String(newTotal));
                }
                return newTotal;
            });
        };
        window.addEventListener('qg:token-update', handleTokenUpdate);
        return () => window.removeEventListener('qg:token-update', handleTokenUpdate);
    }, [isAuthenticated, sessionTokenLimit]);

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
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-foreground uppercase tracking-widest">
                        QG Tokens
                    </span>
                    <span className="text-[10px] font-mono tabular-nums ml-1 text-foreground">
                        {tokensUsed.toLocaleString()} / {sessionTokenLimit.toLocaleString()}
                    </span>
                </div>

                {/* Big highlighted circular burger button */}
                {onMenuClick && (
                    <button
                        onClick={onMenuClick}
                        title="Account"
                        className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm"
                    >
                        <Menu size={17} strokeWidth={2.2} />
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
            <div className="flex justify-between items-center">
                <span className="text-[9px] text-muted-foreground">
                    {isCritical ? '⚠️ Almost out' : isWarning ? '⚠️ Low tokens' : 'Session'}
                </span>
                <span className="text-[9px] font-semibold tabular-nums text-muted-foreground">
                    {remaining.toLocaleString()} remaining
                </span>
            </div>
        </div>
    );
}
