"use client";

import React from 'react';
import { useTheme } from './ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = "" }: { className?: string }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-all duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-orange-500 dark:hover:text-blue-400 ${className}`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {theme === 'dark' ? (
                <Sun size={20} className="animate-in spin-in-180 duration-500" />
            ) : (
                <Moon size={20} className="animate-in spin-in-180 duration-500" />
            )}
        </button>
    );
}
