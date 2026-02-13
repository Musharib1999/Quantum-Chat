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
  Cpu
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
    <div className={`min-h-screen transition-colors duration-500 ease-in-out font-sans ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Gradients */}
        <div
          className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-40 transition-transform duration-1000 ${isDarkMode ? 'bg-indigo-900' : 'bg-blue-200'}`}
          style={{ transform: `translate(${mousePosition.x * -1}px, ${mousePosition.y * -1}px)` }}
        />
        <div
          className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-40 transition-transform duration-1000 ${isDarkMode ? 'bg-violet-900' : 'bg-purple-200'}`}
          style={{ transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)` }}
        />

        {/* Grid Pattern */}
        <div className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20`} />
        <div className={`absolute inset-0 bg-grid-pattern opacity-[0.03] ${isDarkMode ? 'bg-white' : 'bg-black'}`}
          style={{ backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)' }}
        />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-all duration-300 ${isDarkMode ? 'border-white/10 bg-slate-950/70' : 'border-slate-200 bg-white/70'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          {/* Logo Section (Top Left) */}
          <div className="flex items-center gap-3 group cursor-pointer">
            {isDarkMode ? (
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transform transition-transform group-hover:rotate-180 duration-700 bg-indigo-500 text-white shadow-lg shadow-indigo-500/20`}>
                  <Atom size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg tracking-tight leading-none">Quantum</span>
                  <span className="text-xs font-medium tracking-widest uppercase text-slate-400">Guru</span>
                </div>
              </div>
            ) : (
              <img src="/logo.png" alt="Quantum Guru" className="h-12 w-auto object-contain" />
            )}
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {['Platform', 'Solutions', 'Research', 'Pricing'].map((item) => (
              <a
                key={item}
                href="#"
                className={`text-sm font-medium transition-colors hover:text-indigo-500 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-yellow-300' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all transform hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white text-slate-950 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
              Connect Wallet
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-20 animate-fade-in-up">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 border ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            System Online v2.4
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            The Future of <br />
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isDarkMode ? 'from-indigo-400 via-purple-400 to-indigo-400' : 'from-blue-600 via-indigo-600 to-blue-600'}`}>
              Quantum Analysis
            </span>
          </h1>

          <p className={`text-lg md:text-xl mb-10 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Access next-generation computational power. Select your specialized interface below to begin your journey into quantum-accelerated workflows.
          </p>

          {/* Stats Row */}
          <div className={`grid grid-cols-3 gap-4 md:gap-12 py-8 border-y ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
            <div className="flex flex-col">
              <span className="text-3xl font-bold">128Q</span>
              <span className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Processing Power</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold">0.02ms</span>
              <span className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Latency</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold">99.9%</span>
              <span className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Uptime</span>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8">

          {/* Card 1: Quantum Industry */}
          <FeatureCard
            href="/industry"
            icon={<Cpu size={32} />}
            title="Quantum Industry"
            description="Guided problem-solving wizard for industrial applications, hardware selection, and use-case analysis."
            actionText="Launch Interface"
            isDarkMode={isDarkMode}
            accentColor="indigo"
          />

          {/* Card 2: Market Intelligence */}
          <FeatureCard
            href="/market"
            icon={<TrendingUp size={32} />}
            title="Market Intelligence"
            description="Real-time analysis of financial assets, stock trends, and deep market insights powered by quantum algorithms."
            actionText="Access Data"
            isDarkMode={isDarkMode}
            accentColor="emerald"
          />

          {/* Card 3: Article & Learn */}
          <FeatureCard
            href="/article-learn"
            icon={<BookOpen size={32} />}
            title="Article & Learn"
            description="Stay updated with curated scientific papers, tutorials, and latest news in the quantum domain."
            actionText="Start Learning"
            isDarkMode={isDarkMode}
            accentColor="rose"
          />

        </div>
      </main>

      {/* Footer */}
      <footer className={`py-12 text-center border-t ${isDarkMode ? 'border-white/5 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
          <Atom size={16} />
          <span className="font-semibold tracking-widest text-sm">QUANTUM GURU</span>
        </div>
        <p className="text-xs">© 2026 Quantum Guru Inc. All rights reserved.</p>
      </footer>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className={`fixed inset-0 z-40 md:hidden flex flex-col items-center justify-center space-y-8 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
          {['Platform', 'Solutions', 'Research', 'Pricing'].map((item) => (
            <a key={item} href="#" className="text-2xl font-bold" onClick={() => setIsMobileMenuOpen(false)}>
              {item}
            </a>
          ))}
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
}

const FeatureCard = ({ href, icon, title, description, actionText, isDarkMode, accentColor }: FeatureCardProps) => {
  // Map color names to Tailwind classes
  const colorMap = {
    indigo: {
      light: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
      dark: 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white',
      border: 'group-hover:border-indigo-500/50'
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

  return (
    <Link href={href} className={`group relative p-8 rounded-3xl border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden flex flex-col justify-between h-full
      ${isDarkMode
        ? `bg-slate-900/50 border-white/5 hover:bg-slate-900 ${colors.border}`
        : `bg-white border-slate-100 hover:border-slate-200`
      }
    `}>

      {/* Glow Effect on Hover */}
      <div className={`absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 
        ${accentColor === 'indigo' ? 'bg-indigo-500' : accentColor === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'}`}
      />

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
