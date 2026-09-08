"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Cpu,
  ArrowRight,
  Bot,
  Code2,
  Workflow,
  Boxes,
  GraduationCap,
  Clock,
  X,
  Sparkles
} from 'lucide-react';

interface UpcomingStudio {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor: 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose';
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [restrictedModalInfo, setRestrictedModalInfo] = useState<{ title: string; description: string } | null>(null);

  const upcomingStudios: UpcomingStudio[] = [
    {
      id: 'optimization',
      title: 'Optimization Studio',
      description: 'Solve real-world combinatorial optimization problems with guided formulation wizards.',
      icon: <Bot size={22} />,
      accentColor: 'indigo'
    },
    {
      id: 'circuits',
      title: 'Quantum Circuit Studio',
      description: 'Deep visual circuit synthesis, multi-pass transpiler optimization, and noise modeling.',
      icon: <Cpu size={22} />,
      accentColor: 'emerald'
    },
    {
      id: 'algorithms',
      title: 'Quantum Algorithm Studio',
      description: 'Explore quantum algorithms and archetypes including Grover search, QFT, and VQE chemistry.',
      icon: <Workflow size={22} />,
      accentColor: 'violet'
    },
    {
      id: 'marketplace',
      title: 'Quantum Capability Exchange',
      description: 'Enterprise catalog of 38 pre-built quantum microservices, solvers, and reusable capabilities.',
      icon: <Boxes size={22} />,
      accentColor: 'amber'
    },
    {
      id: 'academy',
      title: 'Quantum Academy',
      description: 'Learn quantum computing interactively with step-by-step Dirac mathematical breakdowns.',
      icon: <GraduationCap size={22} />,
      accentColor: 'rose'
    }
  ];

  const handleLaunchIde = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=%2Fide');
      return;
    }
    router.push('/ide');
  };

  const handleUpcomingClick = (studio: UpcomingStudio) => {
    setRestrictedModalInfo({
      title: studio.title,
      description: studio.description
    });
  };

  return (
    <div className="min-h-screen transition-colors duration-500 ease-in-out font-sans bg-[#F8FAFC] text-slate-900">

      {/* Background - Clean White with subtle grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-grid-pattern opacity-[0.02] bg-black"
          style={{
            backgroundSize: '40px 40px',
            backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)'
          }}
        />
      </div>

      {/* Main Content */}
      <main
        style={{ paddingTop: '80px', paddingBottom: '120px' }}
        className="relative z-10 max-w-5xl mx-auto px-6 flex flex-col items-center"
      >
        {/* Hero Section */}
        <div style={{ marginBottom: '52px' }} className="text-center animate-fade-in-up max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-4 leading-tight text-slate-900">
            The Future of <br />
            <span className="text-[rgb(48,102,187)]">
              Quantum Analysis
            </span>
          </h1>
          <h2 className="text-base sm:text-lg md:text-xl font-medium text-slate-800 mb-2">
            One platform. Every quantum workflow.
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-slate-500 max-w-xl mx-auto">
            Choose the workspace built for the way you want to work with quantum computing.
          </p>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* FEATURED HERO CARD: NO OUTLINES, SOFT ELEVATION              */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div
          onClick={handleLaunchIde}
          className="group relative p-8 sm:p-10 md:p-11 rounded-3xl bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.995] transition-all duration-300 cursor-pointer overflow-hidden w-full"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              {/* Top Status & Capabilities Pills (No outlines) */}
              <div className="flex flex-wrap items-center gap-2.5 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider bg-[#3066bb] text-white shadow-xs uppercase">
                  <Sparkles size={12} />
                  Available Now
                </span>
                <span className="text-xs font-medium text-[#3066bb] bg-blue-100/70 px-3 py-1 rounded-full">
                  Build • Visualize • Simulate
                </span>
              </div>

              {/* Title & Icon */}
              <div className="flex items-center gap-3.5 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-[#3066bb] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Code2 size={24} />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight group-hover:text-[#3066bb] transition-colors">
                  Quantum IDE & Playground
                </h3>
              </div>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                Your interactive environment for writing quantum code, visualizing multi-qubit circuits in real-time, and running simulations across dual Qiskit &amp; D-Wave backends.
              </p>
            </div>

            {/* Launch Action Button */}
            <div className="flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLaunchIde();
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#3066bb] hover:bg-[#255299] text-white text-sm font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all transform group-hover:translate-x-0.5 cursor-pointer"
              >
                <span>Launch IDE</span>
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SECTION HEADER: CLEAN SPACED TYPOGRAPHIC LABEL (NO BARS)     */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div style={{ marginTop: '72px', marginBottom: '36px' }} className="text-center">
          <span className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
            Coming Soon
          </span>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 5 UPCOMING STUDIOS: SOFT, BORDERLESS CARDS                   */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {upcomingStudios.map((studio) => (
            <UpcomingStudioCard
              key={studio.id}
              studio={studio}
              onClick={() => handleUpcomingClick(studio)}
            />
          ))}
        </div>
      </main>

      {/* Restricted / Available Soon Dialog Modal */}
      {restrictedModalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setRestrictedModalInfo(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-2xs">
              <Clock size={24} />
            </div>

            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider mb-2">
              <Clock size={11} />
              Will be available soon
            </div>

            <h3 className="text-xl font-bold text-slate-900 mt-2 mb-2">
              {restrictedModalInfo.title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              This studio is currently under private development and will be available soon. In the meantime, you have full access to our active <strong>Quantum IDE & Playground</strong>!
            </p>

            <div className="flex items-center gap-3">
              <Link
                href="/ide"
                onClick={() => setRestrictedModalInfo(null)}
                className="flex-1 text-center py-2.5 px-4 bg-[#3066bb] text-white text-xs font-semibold rounded-xl hover:bg-[#255299] transition-all shadow-xs"
              >
                Launch Quantum IDE
              </Link>
              <button
                onClick={() => setRestrictedModalInfo(null)}
                className="py-2.5 px-4 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: '72px', paddingTop: '48px', paddingBottom: '48px' }} className="border-t border-slate-200/50 text-slate-400">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col items-start gap-1">
            <p className="text-xs opacity-60">© 2026 Quantum Guru Inc. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span className="hover:text-slate-800 transition-colors cursor-pointer">Enterprise Infrastructure</span>
            <span>•</span>
            <span className="hover:text-slate-800 transition-colors cursor-pointer">Security Boundary</span>
            <span>•</span>
            <span className="hover:text-slate-800 transition-colors cursor-pointer">Support</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

interface UpcomingStudioCardProps {
  studio: UpcomingStudio;
  onClick: () => void;
}

const UpcomingStudioCard = ({ studio, onClick }: UpcomingStudioCardProps) => {
  const colorMap = {
    indigo: 'bg-[rgb(48,102,187)]/10 text-[rgb(48,102,187)]',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600'
  };

  return (
    <div
      onClick={onClick}
      className="group relative p-7 rounded-3xl bg-white shadow-xs hover:shadow-lg hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Header: Icon + Quiet Muted Badge (No outlines) */}
        <div className="flex items-center justify-between mb-5">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${colorMap[studio.accentColor]}`}>
            {studio.icon}
          </div>
          <span className="text-[10px] font-medium text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-full">
            Coming soon
          </span>
        </div>

        {/* Title */}
        <h4 className="text-lg font-semibold text-slate-900 mb-2.5 tracking-tight group-hover:text-slate-700 transition-colors">
          {studio.title}
        </h4>

        {/* Standardized Fixed Height Description */}
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed min-h-[44px]">
          {studio.description}
        </p>
      </div>

      {/* Card Footer: Quiet Action */}
      <div className="pt-4 flex items-center justify-between text-xs font-medium text-slate-400 group-hover:text-[#3066bb] transition-colors mt-2">
        <span>Explore Studio</span>
        <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-1" />
      </div>
    </div>
  );
};
