"use client";

import React from 'react';
import { Beaker, TrendingUp, BookOpen, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface ModeSwitcherProps {
    currentMode?: 'industry' | 'market' | 'article'; // Optional prop if we want to force highlight, but path check is better
}

export default function ModeSwitcher({ }: ModeSwitcherProps) {
    const pathname = usePathname();

    const modes = [
        { id: 'industry', icon: <Beaker size={20} />, label: 'Industry', href: '/industry' },
        { id: 'market', icon: <TrendingUp size={20} />, label: 'Market', href: '/market' },
        { id: 'article', icon: <BookOpen size={20} />, label: 'Research', href: '/article-learn' },
    ] as const;

    const isActive = (href: string) => {
        if (href === '/industry' && (pathname === '/' || pathname === '/industry')) return true;
        return pathname?.startsWith(href);
    };

    return (
        <div className="w-16 bg-black/40 border-r border-border flex flex-col items-center py-4 gap-4 z-20 backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-white shadow-lg mb-4 border border-white/10">
                Q
            </div>

            {modes.map(mode => (
                <Link
                    key={mode.id}
                    href={mode.href}
                    className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group ${isActive(mode.href)
                        ? 'bg-white/10 text-white'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                        }`}
                    title={mode.label}
                >
                    {mode.icon}
                    {isActive(mode.href) && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
                    )}

                    {/* Tooltip */}
                    <div className="absolute left-14 bg-zinc-900 border border-border px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {mode.label}
                    </div>
                </Link>
            ))}
        </div>
    );
}
