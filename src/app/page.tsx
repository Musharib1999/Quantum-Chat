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
  Clock,
  X,
  Sparkles,
  ArrowDown
} from 'lucide-react';

interface UpcomingStudio {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor: 'indigo' | 'emerald' | 'violet';
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
      icon: <Bot size={20} />,
      accentColor: 'indigo'
    },
    {
      id: 'circuits',
      title: 'Quantum Circuit Studio',
      description: 'Deep visual circuit synthesis, multi-pass transpiler optimization, and noise modeling.',
      icon: <Cpu size={20} />,
      accentColor: 'emerald'
    },
    {
      id: 'algorithms',
      title: 'Quantum Algorithm Studio',
      description: 'Explore quantum algorithms and archetypes including Grover search, QFT, and VQE chemistry.',
      icon: <Workflow size={20} />,
      accentColor: 'violet'
    }
  ];

  const handleLaunchIde = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=%2Fide');
    } else {
      router.push('/ide');
    }
  };

  const handleUpcomingClick = (studio: UpcomingStudio) => {
    setRestrictedModalInfo({
      title: studio.title,
      description: studio.description
    });
  };

  const scrollToExplore = () => {
    const el = document.getElementById('explore-next');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen transition-colors duration-500 ease-in-out font-sans text-slate-900" style={{ backgroundColor: "#F8FAFC" }}>

      {/* Top Left Corner Logo */}
      <div className="absolute top-6 left-6 md:top-8 md:left-10 z-20 flex items-center">
        <a href="https://www.quantumcomputers.guru/" className="flex items-center hover:opacity-90 transition-opacity">
          <img
            src="/logo.png"
            alt="Quantum Guru"
            style={{ height: '56px', width: 'auto' }}
            className="w-auto object-contain cursor-pointer drop-shadow-xs"
          />
        </a>
      </div>

      {/* Top Right Corner 'Explore what's next' Anchor */}
      <div className="absolute top-6 right-6 md:top-8 md:right-10 z-30">
        <button
          onClick={scrollToExplore}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: '#ffffff',
            color: '#1E293B',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.2s'
          }}
          className="hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] group"
        >
          <span>Explore what's next</span>
          <ArrowDown size={14} className="text-slate-400 group-hover:text-[#2E65BF] group-hover:translate-y-0.5 transition-all" />
        </button>
      </div>

      {/* Main Content */}
      <main
        style={{
          paddingTop: '104px',
          paddingBottom: '56px',
          maxWidth: '1240px',
          width: '100%',
          margin: '0 auto',
          paddingLeft: '24px',
          paddingRight: '24px',
          boxSizing: 'border-box'
        }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* ───────────────────────────────────────────────────────────── */}
        {/* HERO SECTION: TRUE 2-COLUMN HARMONIC COMPOSITION             */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '32px',
            width: '100%',
            marginBottom: '64px'
          }}
        >
          {/* Left Column: Headline + Tagline + Featured IDE Card */}
          <div
            style={{
              flex: '1 1 580px',
              maxWidth: '700px',
              minWidth: '320px'
            }}
          >
            {/* Hero Text */}
            <div style={{ textAlign: 'left', marginBottom: '28px', paddingTop: '4px' }}>
              <h1
                style={{
                  fontSize: 'clamp(2.5rem, 4.2vw, 3.5rem)',
                  fontWeight: 800,
                  lineHeight: 1.12,
                  letterSpacing: '-0.025em',
                  color: '#0F172A',
                  marginBottom: '14px'
                }}
              >
                The Future of <br />
                <span style={{ color: '#2E65BF' }}>
                  Quantum Analysis
                </span>
              </h1>
              <h2
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: '#1E293B',
                  marginBottom: '0px'
                }}
              >
                One platform. Every quantum workflow.
              </h2>
            </div>

            {/* Featured Hero Card (Pure White Soft Elevation, No Outlines) */}
            <div
              onClick={handleLaunchIde}
              className="group relative bg-white hover:-translate-y-1 active:scale-[0.995] transition-all duration-300 cursor-pointer"
              style={{
                borderRadius: '24px',
                padding: '30px 34px',
                boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05), 0 0 1px 0 rgba(0, 0, 0, 0.08)',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              {/* Status Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
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
                  <Code2 size={22} />
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

              {/* Description */}
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#475569',
                  lineHeight: 1.6,
                  maxWidth: '560px',
                  margin: '0 0 18px 0'
                }}
              >
                Your interactive environment for writing quantum code, visualizing multi-qubit circuits in real-time, and running simulations across dual Qiskit &amp; D-Wave backends.
              </p>

              {/* Bottom Row Inside Card: Workflow Capability Statement + CTA */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  paddingTop: '14px',
                  borderTop: '1px solid #F1F5F9'
                }}
              >
                {/* Embedded Capability Statement */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#2E65BF' }}>
                    Code → Visualize → Simulate → Explore
                  </span>
                </div>

                {/* Launch Button */}
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
                      padding: '11px 22px',
                      backgroundColor: '#2E65BF',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(46, 101, 191, 0.22)',
                      whiteSpace: 'nowrap'
                    }}
                    className="hover:bg-[#255299] transition-all"
                  >
                    <span>Launch IDE</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Quantum Chandelier (~25% Larger, Vertically Centered Across Hero) */}
          <div
            style={{
              flex: '0 1 480px',
              width: '480px',
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
                width: '380px',
                height: '380px',
                borderRadius: '50%',
                backgroundColor: 'rgba(46, 101, 191, 0.14)',
                filter: 'blur(60px)',
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
                maxWidth: '470px',
                height: 'auto',
                maxHeight: '520px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 20px 35px rgba(46, 101, 191, 0.16))'
              }}
            />
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* EXPLORE WHAT'S NEXT SECTION (ELIMINATES DEAD SPACE)          */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div id="explore-next" style={{ width: '100%', scrollMarginTop: '40px' }}>
          {/* Section Divider Line with Label */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              marginBottom: '32px'
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.22em',
                color: '#94A3B8',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                padding: '0 8px'
              }}
            >
              Explore What's Next
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
          </div>

          {/* 3 Compact Teaser Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '22px',
              width: '100%'
            }}
          >
            {upcomingStudios.map((studio) => (
              <div
                key={studio.id}
                onClick={() => handleUpcomingClick(studio)}
                className="group relative bg-white hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 cursor-pointer flex flex-col justify-between"
                style={{
                  borderRadius: '20px',
                  padding: '24px 26px',
                  boxShadow: '0 4px 18px -4px rgba(0, 0, 0, 0.04), 0 0 1px 0 rgba(0, 0, 0, 0.06)',
                  boxSizing: 'border-box'
                }}
              >
                <div>
                  {/* Card Header: Icon + Coming Soon Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: studio.accentColor === 'indigo' ? 'rgba(46, 101, 191, 0.1)' : studio.accentColor === 'emerald' ? '#ECFDF5' : '#F5F3FF',
                        color: studio.accentColor === 'indigo' ? '#2E65BF' : studio.accentColor === 'emerald' ? '#059669' : '#7C3AED'
                      }}
                    >
                      {studio.icon}
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#94A3B8',
                        backgroundColor: '#F8FAFC',
                        padding: '3px 9px',
                        borderRadius: '9999px',
                        letterSpacing: '0.02em'
                      }}
                    >
                      Coming soon
                    </span>
                  </div>

                  {/* Title */}
                  <h4
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: '#0F172A',
                      marginBottom: '8px',
                      letterSpacing: '-0.015em'
                    }}
                    className="group-hover:text-[#2E65BF] transition-colors"
                  >
                    {studio.title}
                  </h4>

                  {/* Compact Description */}
                  <p
                    style={{
                      fontSize: '0.825rem',
                      color: '#64748B',
                      lineHeight: 1.55,
                      margin: 0
                    }}
                  >
                    {studio.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
      <footer style={{ marginTop: '56px', paddingTop: '32px', paddingBottom: '40px' }} className="border-t border-slate-200/50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs font-medium text-slate-600">
            © 2026 Quantum Guru Inc. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
