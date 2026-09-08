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
    <div className="relative min-h-screen transition-colors duration-500 ease-in-out font-sans text-slate-900" style={{ backgroundColor: "#F8FAFC" }}>



      {/* Top Left Corner Logo */}
      <div className="absolute top-6 left-6 md:top-8 md:left-10 z-20 flex items-center group cursor-pointer hover:opacity-90 transition-opacity">
        <a href="https://www.quantumcomputers.guru/" className="flex items-center">
          <img
            src="/logo.png"
            alt="Quantum Guru"
            style={{ height: '62px', width: 'auto' }}
            className="w-auto object-contain cursor-pointer drop-shadow-xs"
          />
        </a>
      </div>

      {/* Main Content */}
      <main
        style={{ paddingTop: '72px', paddingBottom: '120px' }}
        className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 flex flex-col items-center"
      >
        {/* Hero Section: 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center w-full mb-10">
          
          {/* Left Column: Heading + Featured Card */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            
            {/* Hero Text */}
            <div className="text-left mb-6">
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight mb-3 leading-[1.1] text-slate-900">
                The Future of <br />
                <span className="text-[#3066bb]">
                  Quantum Analysis
                </span>
              </h1>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-1.5">
                One platform. Every quantum workflow.
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-slate-500 max-w-xl">
                Choose the workspace built for the way you want to work with quantum computing.
              </p>
            </div>

            {/* Featured Hero Card */}
            <div
              onClick={handleLaunchIde}
              className="group relative p-6 sm:p-8 rounded-3xl bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.995] transition-all duration-300 cursor-pointer overflow-hidden border border-slate-200/70"
            >
              <div className="relative z-10">
                {/* Status Pills */}
                <div className="flex flex-wrap items-center gap-2 mb-3.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider bg-[#3066bb] text-white shadow-xs uppercase">
                    <Sparkles size={11} />
                    Available Now
                  </span>
                  <span className="text-[11px] font-medium text-[#3066bb] bg-blue-50 px-2.5 py-1 rounded-full">
                    Build • Visualize • Simulate
                  </span>
                </div>

                {/* Title & Icon */}
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#3066bb] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                    <Code2 size={20} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight group-hover:text-[#3066bb] transition-colors">
                    Quantum IDE & Playground
                  </h3>
                </div>

                {/* Description & Action Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md">
                    Your interactive environment for writing quantum code, visualizing multi-qubit circuits in real-time, and running simulations across dual Qiskit &amp; D-Wave backends.
                  </p>
                  <div className="shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchIde();
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#3066bb] hover:bg-[#255299] text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
                    >
                      <span>Launch IDE</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Quantum Chandelier Floating Visual */}
          <div className="lg:col-span-5 flex items-center justify-center relative py-4 lg:py-0">
            {/* Soft Luminescent Ambient Glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-72 h-72 rounded-full bg-blue-400/10 blur-3xl" />
            </div>

            {/* Chandelier Image */}
            <div className="relative z-10 flex items-center justify-center transition-transform duration-700 hover:scale-[1.03]">
              <img
                src="/quantum-computer.png"
                alt="Quantum Computer Chandelier"
                className="w-full max-w-[340px] sm:max-w-[400px] lg:max-w-[450px] h-auto object-contain drop-shadow-xl"
              />
            </div>
          </div>

        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SECTION DIVIDER: COMING SOON WITH SUBTLE HORIZONTAL LINES    */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="w-full flex items-center justify-center gap-4 my-10">
          <div className="h-px bg-slate-200/80 flex-1 max-w-[120px]" />
          <span className="text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase">
            Coming Soon
          </span>
          <div className="h-px bg-slate-200/80 flex-1 max-w-[120px]" />
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
      <footer style={{ marginTop: '72px', paddingTop: '40px', paddingBottom: '48px' }} className="border-t border-slate-200/50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs font-medium text-slate-700">
            © 2026 Quantum Guru Inc. All rights reserved.
          </p>
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


    </div>
  );
};
