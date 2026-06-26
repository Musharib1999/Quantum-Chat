"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Cpu, ArrowRight, Bot, Lock as LockIcon, Unlock as UnlockIcon, Menu, X } from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated, logout } = useAuth();
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
    <div className="min-h-screen transition-colors duration-500 ease-in-out font-sans bg-white text-slate-900">

      {/* Background - Clean White */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] bg-black"
          style={{ backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)' }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-all duration-300 border-slate-200 bg-white/70">
        <div className="w-full px-6 md:px-8 h-20 flex items-center justify-end">

          {/* Logo Section */}
          <div className="absolute top-4 left-6 flex items-center group cursor-pointer hover:opacity-90 transition-opacity">
            <a href="https://www.quantumcomputers.guru/">
              <img src="/logo.png" alt="Quantum Guru" className="h-[40px] md:h-[62px] w-auto object-contain cursor-pointer drop-shadow-sm" />
            </a>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <button
                  onClick={() => logout()}
                  className="px-6 py-1.5 bg-white text-[#3066bb] border-2 border-[#3066bb] hover:bg-[#3066bb] hover:text-white font-semibold rounded transition-all shadow-sm text-sm"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  className="px-6 py-1.5 bg-[#3066bb] text-white border-2 border-[#3066bb] hover:bg-white hover:text-[#3066bb] font-semibold rounded transition-all shadow-sm text-sm"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-36 pb-24 flex flex-col justify-center min-h-[calc(100vh-80px)]">
        <div className="text-center mb-16 animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6 leading-tight">
            The Future of <br />
            <span className="text-[rgb(48,102,187)]">
              Quantum Analysis
            </span>
          </h1>
          <p className="text-lg md:text-xl mb-8 leading-relaxed text-slate-600 max-w-2xl mx-auto">
            Select your specialized interface below to begin your journey of respective quantum domain
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">

          {/* Card 1: Optimization Studio */}
          <FeatureCard
            href={isAuthenticated ? "/industry" : "/login?redirect=/industry"}
            icon={<Cpu size={32} />}
            title="Optimization Studio"
            description="Industry specific guided problem solving wizards based on hardware, use case and service selection"
            actionText="Launch"
            isDarkMode={false}
            accentColor="indigo"
            status="locked"
            badgeText="Unlock with free account"
          />

          {/* Card 2: Quantum Guru LLM */}
          <FeatureCard
            href="/quantum-assistant"
            icon={<Bot size={32} />}
            title="Quantum Guru LLM"
            description="A frontier AI model fine-tuned on 240 million high-fidelity quantum computing data points, designed to generate quantum algorithms, analyze quantum information and solve complex scientific queries"
            actionText="Chat Now"
            isDarkMode={false}
            accentColor="electric"
            status="unlocked"
            badgeText="Try now"
          />

        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col items-start gap-2">
            <p className="text-xs opacity-50">© 2026 Quantum Guru Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden flex flex-col items-center justify-center space-y-8 bg-white text-slate-900 animate-in fade-in zoom-in duration-300">
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X size={32} />
          </button>
          
          <div className="w-12 h-0.5 bg-slate-100 rounded-full" />

          {isAuthenticated ? (
            <button
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }}
              className="text-2xl font-bold text-red-500"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-2xl font-bold text-[#3066bb]"
            >
              Login
            </Link>
          )}
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
  accentColor: 'indigo' | 'emerald' | 'rose' | 'assistant' | 'electric' | 'amber' | 'violet';
  status?: 'locked' | 'unlocked';
  badgeText?: string;
  className?: string;
}

const FeatureCard = ({ href, icon, title, description, actionText, isDarkMode, accentColor, status = 'unlocked', badgeText, className = '' }: FeatureCardProps) => {
  // Map color names to Tailwind classes
  const colorMap = {
    indigo: {
      light: 'bg-[rgb(48,102,187)]/10 text-[rgb(48,102,187)] group-hover:bg-[rgb(48,102,187)] group-hover:text-white',
      dark: 'bg-[rgb(48,102,187)]/20 text-[rgb(48,102,187)] group-hover:bg-[rgb(48,102,187)] group-hover:text-white',
      border: 'group-hover:border-[rgb(48,102,187)]/50'
    },
    electric: {
      light: 'bg-[rgb(27,176,206)]/10 text-[rgb(27,176,206)] group-hover:bg-[rgb(27,176,206)] group-hover:text-white',
      dark: 'bg-[rgb(27,176,206)]/20 text-[rgb(27,176,206)] group-hover:bg-[rgb(27,176,206)] group-hover:text-white',
      border: 'group-hover:border-[rgb(27,176,206)]/50'
    },
    amber: {
      light: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
      dark: 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white',
      border: 'group-hover:border-amber-500/50'
    },
    violet: {
      light: 'bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white',
      dark: 'bg-violet-500/10 text-violet-400 group-hover:bg-violet-500 group-hover:text-white',
      border: 'group-hover:border-violet-500/50'
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
    },
    assistant: {
      light: 'bg-white text-black border border-slate-200 shadow-sm group-hover:bg-black group-hover:text-white group-hover:border-black',
      dark: 'bg-slate-800 text-white border border-slate-700 group-hover:bg-white group-hover:text-black group-hover:border-white',
      border: 'group-hover:border-black/50'
    }
  };

  const colors = colorMap[accentColor];
  const isLocked = status === 'locked';

  return (
    <Link
      href={href}
      onClick={(e) => href === '#' && e.preventDefault()}
      className={`group relative p-6 md:p-8 rounded-3xl border transition-all duration-300 ${href === '#' ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-2xl hover:-translate-y-1 active:scale-[0.99]'} overflow-hidden flex flex-col justify-between bg-white border-slate-100 ${href !== '#' ? 'hover:border-slate-200' : ''} ${className}`}>

      {/* Glow Effect on Hover */}
      <div className={`absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 
        ${(accentColor === 'indigo' || accentColor === 'assistant') ? 'bg-[rgb(48,102,187)]' : 
          accentColor === 'electric' ? 'bg-[rgb(27,176,206)]' :
          accentColor === 'amber' ? 'bg-amber-500' :
          accentColor === 'violet' ? 'bg-violet-500' :
          accentColor === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'}`}
      />

      {/* Lock/Unlock Status Badge */}
      <div className={`absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wide backdrop-blur-md border shadow-sm transition-all bg-emerald-50 text-emerald-600 border-emerald-100`}>
        {isLocked ? <LockIcon size={10} /> : <UnlockIcon size={10} />}
        {badgeText || (isLocked ? 'Locked' : 'Unlocked')}
      </div>

      <div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${colors.light}`}>
          {icon}
        </div>

        <h3 className="text-2xl font-semibold mb-3">{title}</h3>
        <p className={`text-sm leading-relaxed mb-8 text-slate-500`}>
          {description}
        </p>
      </div>

      <div className={`flex items-center gap-2 text-sm font-semibold transition-colors duration-300 cursor-pointer text-slate-900 group-hover:text-blue-600`}>
        {actionText}
        <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </Link>
  );
};
