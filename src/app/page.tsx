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
        style={{
          paddingTop: '64px',
          paddingBottom: '120px',
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          paddingLeft: '24px',
          paddingRight: '24px',
          boxSizing: 'border-box'
        }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Hero Section: 2-Column Side-by-Side Layout */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '36px',
            width: '100%',
            marginBottom: '40px'
          }}
        >
          {/* Left Column: Heading + Featured Card */}
          <div
            style={{
              flex: '1 1 540px',
              maxWidth: '680px',
              minWidth: '320px'
            }}
          >
            {/* Hero Text */}
            <div style={{ textAlign: 'left', marginBottom: '28px' }}>
              <h1
                style={{
                  fontSize: 'clamp(2.5rem, 4.5vw, 3.5rem)',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: '-0.025em',
                  color: '#0F172A',
                  marginBottom: '16px'
                }}
              >
                The Future of <br />
                <span style={{ color: '#2E65BF' }}>
                  Quantum Analysis
                </span>
              </h1>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#1E293B',
                  marginBottom: '8px'
                }}
              >
                One platform. Every quantum workflow.
              </h2>
              <p
                style={{
                  fontSize: '0.95rem',
                  color: '#64748B',
                  maxWidth: '520px',
                  lineHeight: 1.55
                }}
              >
                Choose the workspace built for the way you want to work with quantum computing.
              </p>
            </div>

            {/* Featured Hero Card (No Outlines, Pure White Elevation) */}
            <div
              onClick={handleLaunchIde}
              className="group relative bg-white hover:-translate-y-1 active:scale-[0.995] transition-all duration-300 cursor-pointer"
              style={{
                borderRadius: '24px',
                padding: '28px 32px',
                boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.06), 0 0 1px 0 rgba(0, 0, 0, 0.08)',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              {/* Status Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    backgroundColor: '#2E65BF',
                    color: '#ffffff',
                    textTransform: 'uppercase'
                  }}
                >
                  <Sparkles size={11} />
                  Available Now
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#2E65BF',
                    backgroundColor: '#EFF6FF',
                    padding: '4px 12px',
                    borderRadius: '9999px'
                  }}
                >
                  Build • Visualize • Simulate
                </span>
              </div>

              {/* Title & Icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: '#2E65BF',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Code2 size={20} />
                </div>
                <h3
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    letterSpacing: '-0.02em'
                  }}
                >
                  Quantum IDE &amp; Playground
                </h3>
              </div>

              {/* Description & Action Button */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '18px',
                  marginTop: '12px'
                }}
              >
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: '#475569',
                    lineHeight: 1.55,
                    maxWidth: '380px',
                    margin: 0
                  }}
                >
                  Your interactive environment for writing quantum code, visualizing multi-qubit circuits in real-time, and running simulations across dual Qiskit &amp; D-Wave backends.
                </p>
                <div style={{ flexShrink: 0 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLaunchIde();
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 24px',
                      backgroundColor: '#2E65BF',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '14px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(46, 101, 191, 0.25)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>Launch IDE</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Quantum Chandelier Sized & Positioned */}
          <div
            style={{
              flex: '0 1 420px',
              width: '420px',
              maxWidth: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              margin: '0 auto'
            }}
          >
            {/* Ambient Cyan/Blue Luminescence */}
            <div
              style={{
                position: 'absolute',
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                backgroundColor: 'rgba(46, 101, 191, 0.12)',
                filter: 'blur(50px)',
                pointerEvents: 'none'
              }}
            />
            <img
              src="/quantum-computer.png"
              alt="Quantum Computer Chandelier"
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                maxWidth: '400px',
                height: 'auto',
                maxHeight: '480px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 15px 25px rgba(46, 101, 191, 0.15))'
              }}
            />
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
