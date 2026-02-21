"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeContext';
import {
  TrendingUp,
  BookOpen,
  Moon,
  Sun,
  ArrowRight,
  Atom,
  Menu,
  X,
  Cpu,
  Lock as LockIcon,
  Unlock as UnlockIcon
} from 'lucide-react';

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Subtle mouse parallax effect for background
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 20,
        y: (e.clientY / window.innerHeight) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-500 ease-in-out font-sans ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>

      {/* Background - Clean White (or Dark Slate) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Subtle Grid Pattern Only - optional, keeping it minimal as requested */}
        <div className={`absolute inset-0 bg-grid-pattern opacity-[0.02] ${isDarkMode ? 'bg-white' : 'bg-black'}`}
          style={{ backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)' }}
        />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-all duration-300 ${isDarkMode ? 'border-white/10 bg-slate-950/70' : 'border-slate-200 bg-white/70'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          {/* Logo Section */}
          <div className="flex items-center gap-3 group cursor-pointer">
            <img src="/logo.png" alt="Quantum Guru" className="h-8 md:h-10 w-auto object-contain cursor-pointer" />
          </div>

          <div className="flex items-center gap-8">
            {/* Actions */}
            <div className="flex items-center gap-4">
              <Link
                href="/industry"
                className="px-6 py-1.5 bg-white text-[#3066bb] border-2 border-[#3066bb] hover:bg-[#3066bb] hover:text-white font-bold rounded-lg transition-all shadow-sm text-sm"
              >
                Login
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-slate-600 dark:text-slate-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-20 animate-fade-in-up">
          {/* System Status Removed */}

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            The Future of <br />
            <span className="text-[rgb(48,102,187)]">
              Quantum Analysis
            </span>
          </h1>

          <p className={`text-lg md:text-xl mb-10 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Select your specialized interface below to begin your journey of respective quantum domain
          </p>


        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8">

          {/* Card 1: Quantum Industry */}
          <FeatureCard
            href="/industry"
            icon={<Cpu size={32} />}
            title="Quantum Industry"
            description="Industry specific guided problem solving wizards based on hardware, use case and service selection"
            actionText="Launch"
            isDarkMode={isDarkMode}
            accentColor="indigo"
            status="locked"
            badgeText="Unlock with free account"
          />

          {/* Card 2: Market Intelligence */}
          <FeatureCard
            href="/market"
            icon={<TrendingUp size={32} />}
            title="Quantum Stocks and Market Intelligence"
            description="Current market analysis of your quantum asset"
            actionText="Access Data"
            isDarkMode={isDarkMode}
            accentColor="emerald"
            status="unlocked"
            badgeText="Try now"
          />

          {/* Card 3: Article & Learn */}
          <FeatureCard
            href="/article-learn"
            icon={<BookOpen size={32} />}
            title="Analyze Quantum Information"
            description="Feed and analyze your collateral like scientific papers, articles and latest news in the quantum domain"
            actionText="View"
            isDarkMode={isDarkMode}
            accentColor="rose"
            status="unlocked"
            badgeText="Try now"
          />

        </div>
      </main>

      {/* Footer */}
      <footer className={`py-12 border-t ${isDarkMode ? 'border-white/5 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col items-start gap-2">
            <p className="text-xs opacity-50">© 2026 Quantum Guru Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className={`fixed inset-0 z-40 md:hidden flex flex-col items-center justify-center space-y-8 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
          {/* Mobile Links - Removed */}
          <button onClick={toggleTheme} className="flex items-center gap-2 px-6 py-3 rounded-full border border-current opacity-60">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      )}

    </div>
  );
}

interface FeatureCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText: string;
  isDarkMode: boolean;
  accentColor: 'indigo' | 'emerald' | 'rose';
  status?: 'locked' | 'unlocked';
  badgeText?: string;
}

const FeatureCard = ({ href, icon, title, description, actionText, isDarkMode, accentColor, status = 'unlocked', badgeText }: FeatureCardProps) => {
  // Map color names to Tailwind classes
  const colorMap = {
    indigo: {
      light: 'bg-[rgb(48,102,187)]/10 text-[rgb(48,102,187)] group-hover:bg-[rgb(48,102,187)] group-hover:text-white',
      dark: 'bg-[rgb(48,102,187)]/20 text-[rgb(48,102,187)] group-hover:bg-[rgb(48,102,187)] group-hover:text-white',
      border: 'group-hover:border-[rgb(48,102,187)]/50'
    },
    emerald: {
      light: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
      dark: 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white',
      border: 'group-hover:border-emerald-500/50'
    },
    rose: {
      light: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
      dark: 'bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white',
      border: 'group-hover:border-rose-500/50'
    }
  };

  const colors = colorMap[accentColor];
  const isLocked = status === 'locked';

  return (
    <Link href={href} className={`group relative p-8 rounded-3xl border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden flex flex-col justify-between h-full
      ${isDarkMode
        ? `bg-slate-900/50 border-white/5 hover:bg-slate-900 ${colors.border}`
        : `bg-white border-slate-100 hover:border-slate-200`
      }
    `}>

      {/* Glow Effect on Hover */}
      <div className={`absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 
        ${accentColor === 'indigo' ? 'bg-[rgb(48,102,187)]' : accentColor === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'}`}
      />

      {/* Lock/Unlock Status Badge */}
      <div className={`absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-md border shadow-sm transition-all
        ${isLocked
          ? (isDarkMode ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100')
          : (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100')
        }
      `}>
        {isLocked ? <LockIcon size={10} /> : <UnlockIcon size={10} />}
        {badgeText || (isLocked ? 'Locked' : 'Unlocked')}
      </div>

      <div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${isDarkMode ? colors.dark : colors.light}`}>
          {icon}
        </div>

        <h3 className="text-2xl font-bold mb-3">{title}</h3>
        <p className={`text-sm leading-relaxed mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {description}
        </p>
      </div>

      <div className={`flex items-center gap-2 text-sm font-semibold transition-colors duration-300 cursor-pointer
        ${isDarkMode
          ? 'text-white group-hover:text-indigo-400'
          : 'text-slate-900 group-hover:text-blue-600'
        }
      `}>
        {actionText}
        <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </Link>
  );
};
