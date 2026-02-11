"use client";

import React from 'react';
import { Beaker, TrendingUp, BookOpen, Settings } from 'lucide-react';

interface ModeSwitcherProps {
    currentMode: 'industry' | 'market' | 'article';
    onSwitch: (mode: 'industry' | 'market' | 'article') => void;
}

export default function ModeSwitcher({ currentMode, onSwitch }: ModeSwitcherProps) {
    const modes = [
        { id: 'industry', icon: <Beaker size={20} />, label: 'Industry' },
        { id: 'market', icon: <TrendingUp size={20} />, label: 'Market' },
        { id: 'article', icon: <BookOpen size={20} />, label: 'Research' },
    ] as const;

    return (
        <div className="w-16 bg-black/40 border-r border-border flex flex-col items-center py-4 gap-4 z-20 backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg mb-4">
                Q
            </div>

            {modes.map(mode => (
                <button
                    key={mode.id}
                    onClick={() => onSwitch(mode.id)}
                    className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group ${currentMode === mode.id
                            ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                            : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                        }`}
                    title={mode.label}
                >
                    {mode.icon}
                    {currentMode === mode.id && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-purple-500 rounded-r-full" />
                    )}

                    {/* Tooltip */}
                    <div className="absolute left-14 bg-zinc-900 border border-border px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {mode.label}
                    </div>
                </button>
            ))}
        </div>
    );
}
