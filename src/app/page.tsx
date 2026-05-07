"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Shield, Cpu, ArrowRight, TrendingUp, BookOpen, Bot, Lock as LockIcon, Unlock as UnlockIcon, LogOut, Sun, Moon, CheckCircle, Menu, X, Atom, Zap, GraduationCap } from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated, logout } = useAuth();
  const theme = 'light';
  const isDarkMode = false;
  const toggleTheme = () => {};
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
            <Link 
              href="/api-docs" 
              className="text-sm font-semibold text-slate-500 hover:text-[#3066bb] transition-colors"
            >
              API Documentation
            </Link>

            {/* Actions */}
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
                  className="px-6 py-1.5 bg-white text-[#3066bb] border-2 border-[#3066bb] hover:bg-[#3066bb] hover:text-white font-semibold rounded transition-all shadow-sm text-sm"
                >
                  Login
                </Link>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-slate-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 pt-32 md:pt-40 pb-12 md:pb-20 px-4 md:px-8 max-w-7xl mx-auto">

        {/* Hero Section - Centered */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">

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

          {/* Card 3: Market Intelligence */}
          <FeatureCard
            href="/market"
            icon={<TrendingUp size={32} />}
            title="Quantum Stocks and Market Intelligence"
            description="Current market analysis of your quantum asset"
            actionText="Launch"
            isDarkMode={false}
            accentColor="amber"
            status="unlocked"
            badgeText="Try now"
          />

          {/* Card 4: Quantum Solver Studio */}
          <FeatureCard
            href={isAuthenticated ? "/builder/dashboard" : "/login?redirect=/builder/dashboard"}
            icon={<Atom size={32} />}
            title="Quantum Solver Studio"
            description="Write, test and run quantum and hybrid optimization solutions from a single interface. Integrates leading frameworks with built-in simulators for rapid experimentation"
            actionText="Launch Studio"
            isDarkMode={false}
            accentColor="violet"
            status="locked"
            badgeText="Unlock with free account"
          />

          {/* Card 5: Quantum Academy */}
          <FeatureCard
            href={isAuthenticated ? "/academy" : "/login?redirect=/academy"}
            icon={<GraduationCap size={32} />}
            title="Quantum Academy"
            description="Master quantum computing through structured curriculum, text lessons, and interactive code challenges. Earn badges and professional certificates upon completion."
            actionText="Start Learning"
            isDarkMode={false}
            accentColor="emerald"
            status="locked"
            badgeText="Unlock with free account"
          />

        </div>
      </main>

      {/* Use Case Section */}
      <section className="relative z-10 py-24 px-4 md:px-8 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">

          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-[#3066bb] bg-[#3066bb]/8 px-4 py-1.5 rounded-full border border-[#3066bb]/20 mb-4">
              Industry Use Case
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Quantum-Optimized Call Routing
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
              Real-world simulation results: how QUBO-based quantum annealing outperforms static BPO routing rules at combinatorial scale.
            </p>
          </div>

          {/* Title + Description + Methodology */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">

            {/* Left: Description */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 md:p-10 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#3066bb]/10 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgb(48,102,187)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
                </div>
                <h3 className="text-2xl font-semibold text-slate-900">The Problem</h3>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed mb-6">
                Traditional BPO and telecalling platforms still route calls using rigid round robin or first available logic without truly understanding who the best agent is for that customer. Factors like language fluency, product expertise, conversion history, customer intent and real time agent availability are often ignored.
              </p>
              <p className="text-sm text-slate-700 leading-relaxed mb-6">
                When scaled to 100+ agents with multiple skill and performance attributes, the routing challenge becomes a massive combinatorial optimization problem with nearly 2ⁿ possible assignment combinations. This is far beyond what classical brute force systems can evaluate in real time.
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                The outcome is slower resolutions, lower conversions, agent overload and lost revenue.
              </p>
              <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Problem Scale</div>
                <div className="font-mono text-sm text-slate-700 space-y-1">
                  <div>Variables: <span className="text-[#3066bb]">n+</span> per QUBO instance</div>
                  <div>Search space: <span className="text-[#3066bb]">2ⁿ</span> combinations</div>
                  <div>Model: <span className="text-[#3066bb]">Simulated Annealing (D-Wave)</span></div>
                </div>
              </div>
            </div>

            {/* Right: Methodology */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 md:p-10 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgb(139,92,246)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                <h3 className="text-2xl font-semibold text-slate-900">Methodology</h3>
              </div>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Call Ingress', desc: 'Incoming call attributes (language, domain, callback preference) are captured and streamed via API.', color: 'bg-[#3066bb]' },
                  { step: '02', title: 'QUBO Formulation', desc: 'Call-agent match scores are encoded into a binary optimization matrix with language, domain, and proficiency weights.', color: 'bg-violet-500' },
                  { step: '03', title: 'Quantum Annealing', desc: 'D-Wave Simulated Annealing solver explores the 2ⁿ energy landscape to find the global minimum — the optimal agent.', color: 'bg-emerald-500' },
                  { step: '04', title: 'Routing Decision', desc: 'Matched agent ID is returned via webhook and compared against the classical static-rule result.', color: 'bg-amber-500' },
                ].map(({ step, title, desc, color }) => (
                  <div key={step} className="flex gap-5">
                    <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center text-white text-xs font-black shrink-0 mt-1 shadow-sm`}>{step}</div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 mb-1">{title}</div>
                      <div className="text-sm text-slate-700 leading-relaxed">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Outcome KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[
              { value: '>50%', label: 'Calls Better Routed', sub: 'vs classical static rules', color: 'text-[#3066bb]', bg: 'bg-[#3066bb]/5 border-[#3066bb]/15' },
              { value: 'n+', label: 'QUBO Variables', sub: 'per routing decision', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
              { value: '2ⁿ', label: 'Search Space', sub: 'explored by quantum solver', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
              { value: '~3s', label: 'Avg Solve Time', sub: 'per call via D-Wave', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
            ].map(({ value, label, sub, color, bg }) => (
              <div key={label} className={`rounded-3xl border p-8 text-center transition-all hover:scale-[1.02] ${bg}`}>
                <div className={`text-4xl md:text-5xl font-black mb-2 ${color}`}>{value}</div>
                <div className="text-sm font-semibold text-slate-700 mb-1 uppercase tracking-wider">{label}</div>
                <div className="text-xs text-slate-400">{sub}</div>
              </div>
            ))}
          </div>

          {/* Comparison Block */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="text-left px-8 py-5 text-sm font-semibold text-slate-500 uppercase tracking-wider">Criteria</th>
                    <th className="text-center px-6 py-5 text-sm font-bold uppercase tracking-wider text-[#3066bb]">
                      <span className="inline-flex items-center gap-2 bg-[#3066bb]/8 px-4 py-2 rounded-full border border-[#3066bb]/20">
                        <span className="w-2 h-2 rounded-full bg-[#3066bb] animate-pulse"></span>
                        Quantum (QUBO)
                      </span>
                    </th>
                    <th className="text-center px-6 py-5 text-sm font-bold uppercase tracking-wider text-slate-500">
                      <span className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
                        Classical (Static Rules)
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    { criteria: 'Routing Algorithm', quantum: 'QUBO Simulated Annealing', classical: 'Round Robin / FCFS' },
                    { criteria: 'Language Match Rate', quantum: '60%+ Match', classical: '15.4% Match', qBetter: true },
                    { criteria: 'Domain Match Rate', quantum: 'Optimized per call', classical: 'Ignored in routing', qBetter: true },
                    { criteria: 'Variables Considered', quantum: 'n+ simultaneously', classical: '1–2 (queue position)', qBetter: true },
                    { criteria: 'Search Space Explored', quantum: '2ⁿ', classical: 'O(n) linear scan', qBetter: true },
                    { criteria: 'Handles Combinatorial Explosion', quantum: '✓ Native capability', classical: '✗ Not feasible', qBetter: true },
                    { criteria: 'Adaptability', quantum: 'Dynamic per call features', classical: 'Static rule-based', qBetter: true },
                  ].map(({ criteria, quantum, classical, qBetter }) => (
                    <tr key={criteria} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-5 font-semibold text-slate-700">{criteria}</td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-block px-4 py-2 rounded-xl text-sm font-semibold ${qBetter ? 'bg-[#3066bb]/8 text-[#3066bb] border border-[#3066bb]/15' : 'bg-slate-100 text-slate-600'}`}>
                          {quantum}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-block px-4 py-2 rounded-xl text-sm font-semibold ${!qBetter ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                          {classical}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-8 py-6 bg-gradient-to-r from-[#3066bb]/5 to-transparent border-t border-slate-100 flex items-center justify-end gap-6 flex-wrap">
              <a href="/industry" className="text-sm font-bold text-[#3066bb] hover:underline whitespace-nowrap flex items-center gap-2 group">
                Run your own simulation
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </a>
            </div>
          </div>

        </div>
      </section>

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
          
          <Link 
            href="/api-docs" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-2xl font-bold text-slate-900 flex items-center gap-3"
          >
            <Zap className="text-[#3066bb]" size={28} />
            API Documentation
          </Link>

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
