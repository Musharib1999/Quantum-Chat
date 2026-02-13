"use client";
import React from 'react';
import { useTheme } from './ThemeContext';

export default function LogoOrHeader() {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    if (isDarkMode) {
        return (
            <div className="flex items-center gap-3 w-full justify-start">
                <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center shadow-sm text-primary">
                    <span className="font-bold text-xs">QG</span>
                </div>
                <div>
                    <h1 className="font-bold text-lg tracking-wide text-foreground">Quantum Guru</h1>
                </div>
            </div>
        );
    }

    return <img src="/logo.png" alt="Quantum Guru" className="h-10 w-auto object-contain" />;
}
