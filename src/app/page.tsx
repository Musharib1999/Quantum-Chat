"use client";

import React, { useState, useRef, useEffect } from 'react';
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
  Sparkles,
  ChevronDown
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      <div className="absolute top-6 left-6 md:top-8 md:left-10 z-20 flex items-center">
        <a href="https://www.quantumcomputers.guru/" className="flex items-center hover:opacity-90 transition-opacity">
          <img
            src="/logo.png"
            alt="Quantum Guru"
            style={{ height: '58px', width: 'auto' }}
            className="w-auto object-contain cursor-pointer drop-shadow-xs"
          />
        </a>
      </div>

      {/* Top Right Corner 'See what's coming next' Dropdown */}
      <div className="absolute top-6 right-6 md:top-8 md:right-10 z-30" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
          className="hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
        >
          <span>See what's coming next</span>
          <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Card (Right-aligned) */}
        {isDropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '360px',
              maxWidth: '90vw',
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.08)',
              padding: '10px',
              zIndex: 100
            }}
            className="animate-in fade-in zoom-in-95 duration-150"
          >
            <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Upcoming Studios &amp; Tools
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#2E65BF', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '9999px' }}>
                Roadmap
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {upcomingStudios.map((studio) => (
                <button
                  key={studio.id}
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleUpcomingClick(studio);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background-color 0.15s'
                  }}
                  className="hover:bg-slate-50 group"
                >
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', flexShrink: 0 }} className="group-hover:bg-blue-50 group-hover:text-[#2E65BF] transition-colors">
                    {studio.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', margin: 0 }} className="group-hover:text-[#2E65BF] transition-colors truncate">
                        {studio.title}
                      </p>
                      <span style={{ fontSize: '10px', fontWeight: 500, color: '#94A3B8', backgroundColor: '#F8FAFC', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        Coming Soon
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {studio.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main
        style={{
          paddingTop: '110px',
          paddingBottom: '48px',
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          paddingLeft: '28px',
          paddingRight: '28px',
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
          {/* Left Column: Heading + Featured Card (Expanded Breadth) */}
          <div
            style={{
              flex: '1 1 620px',
              maxWidth: '780px',
              minWidth: '320px'
            }}
          >
            {/* Hero Text with Generous Top Spacing */}
            <div style={{ textAlign: 'left', marginBottom: '32px', paddingTop: '12px' }}>
              <h1
                style={{
                  fontSize: 'clamp(2.5rem, 4.5vw, 3.6rem)',
                  fontWeight: 800,
                  lineHeight: 1.12,
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
                  marginBottom: '0px'
                }}
              >
                One platform. Every quantum workflow.
              </h2>

            </div>

            {/* Featured Hero Card (Increased Breadth, Pure White Elevation, No Outlines) */}
            <div
              onClick={handleLaunchIde}
              className="group relative bg-white hover:-translate-y-1 active:scale-[0.995] transition-all duration-300 cursor-pointer"
              style={{
                borderRadius: '24px',
                padding: '32px 38px',
                boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.06), 0 0 1px 0 rgba(0, 0, 0, 0.08)',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              {/* Status Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 14px',
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
                    padding: '5px 14px',
                    borderRadius: '9999px'
                  }}
                >
                  Build • Visualize • Simulate
                </span>
              </div>

              {/* Title & Icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
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
                    fontSize: '1.5rem',
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
                  gap: '20px',
                  marginTop: '14px'
                }}
              >
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: '#475569',
                    lineHeight: 1.6,
                    maxWidth: '470px',
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
                      padding: '13px 26px',
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

          {/* Right Column: Quantum Chandelier */}
          <div
            style={{
              flex: '0 1 400px',
              width: '400px',
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
                maxWidth: '390px',
                height: 'auto',
                maxHeight: '480px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 15px 25px rgba(46, 101, 191, 0.15))'
              }}
            />
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
      <footer style={{ marginTop: '48px', paddingTop: '40px', paddingBottom: '48px' }} className="border-t border-slate-200/50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs font-medium text-slate-700">
            © 2026 Quantum Guru Inc. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}


