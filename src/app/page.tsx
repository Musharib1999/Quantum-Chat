"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface StudioPillar {
  id: string;
  badge: string;
  title: string;
  description: string;
  features: string[];
  ctaText: string;
  route?: string;
  isAvailable: boolean;
  accentColor: string;
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [restrictedModalInfo, setRestrictedModalInfo] = useState<{ title: string; description: string } | null>(null);

  const pillars: StudioPillar[] = [
    {
      id: 'ai-assistant',
      badge: 'PHASE 2 ENGINE',
      title: 'AI Quantum Assistant',
      description: 'Turn natural language business problems into mathematically verified, hardware-ready formulations without in-house quantum talent.',
      features: ['Plain Intent Ingress', 'Canonical Math Modeling', 'Zero Math Hallucinations'],
      ctaText: 'Enterprise Preview',
      isAvailable: false,
      accentColor: '#2E65BF'
    },
    {
      id: 'ide',
      badge: 'ACTIVE WORKSPACE',
      title: 'Quantum IDE & Studio',
      description: 'Build, visualize, simulate, and execute quantum circuits in an interactive environment with Qiskit and D-Wave workflows in one place.',
      features: ['Monaco AST Code Canvas', 'Real-Time Circuit Visualizer', 'Pre-Flight Aer Sandbox'],
      ctaText: 'Launch IDE →',
      route: '/ide',
      isAvailable: true,
      accentColor: '#059669'
    },
    {
      id: 'optimization',
      badge: 'COMBINATORIAL SOLVER',
      title: 'Optimization Studio',
      description: 'Turn complex real-world operational bottlenecks into high-performance QUBO, CQM, and Ising models with automated penalty tuning.',
      features: ['Routing & Fleet Dispatch', 'Shift & Crew Scheduling', 'Portfolio Rebalancing'],
      ctaText: 'Explore Studio →',
      isAvailable: false,
      accentColor: '#2563EB'
    },
    {
      id: 'circuits',
      badge: 'CIRCUIT SYNTHESIS',
      title: 'Quantum Circuit Studio',
      description: 'Design, synthesize, optimize, and analyze quantum circuits visually across foundational algorithms and custom gate decompositions.',
      features: ['Multi-Pass Transpilation', 'Grover, QFT & VQE Ansätze', 'Statevector & Noise Telemetry'],
      ctaText: 'Explore Studio →',
      isAvailable: false,
      accentColor: '#7C3AED'
    }
  ];

  const problemDomains = [
    {
      category: 'LOGISTICS & FLEET',
      title: 'Vehicle Routing & Logistics',
      description: 'Optimize multi-depot vehicle routes, last-mile dispatch, and flight crew schedules under strict SLA constraints.'
    },
    {
      category: 'OPERATIONS & WORKFORCE',
      title: 'Production & Shift Scheduling',
      description: 'Solve complex job-shop manufacturing sequences, robotic assembly lines, and regulatory maintenance windows.'
    },
    {
      category: 'CAPITAL & RISK',
      title: 'Portfolio Risk & Arbitrage',
      description: 'Discrete asset allocation, multi-currency hedging, and real-time risk-return frontier generation in seconds.'
    },
    {
      category: 'INFRASTRUCTURE',
      title: 'Resource & Cloud Allocation',
      description: 'Dynamic edge compute load balancing, spectrum allocation, and multi-tenant resource optimization.'
    },
    {
      category: 'DEEP TECH & PHARMA',
      title: 'Quantum Chemistry & Materials',
      description: 'Active-space VQE molecular ground states and variational electronic structure simulation for drug discovery.'
    },
    {
      category: 'CRYPTOGRAPHY & SEARCH',
      title: 'Algorithmic Search & Security',
      description: 'Grover oracular database search, quantum Fourier transforms, and verifiable quantum state transfer protocols.'
    }
  ];

  const handleNavigate = (path: string) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(path)}`);
    } else {
      router.push(path);
    }
  };

  const handlePillarClick = (pillar: StudioPillar) => {
    if (pillar.isAvailable && pillar.route) {
      handleNavigate(pillar.route);
    } else {
      setRestrictedModalInfo({
        title: pillar.title,
        description: pillar.description
      });
    }
  };

  const scrollToPlatform = () => {
    const el = document.getElementById('platform-pillars');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen font-sans text-slate-900 selection:bg-blue-100" style={{ backgroundColor: "#F8FAFC" }}>

      {/* Top Left Corner Logo */}
      <header className="absolute top-6 left-6 md:top-8 md:left-10 z-20 flex items-center">
        <a href="https://www.quantumcomputers.guru/" className="flex items-center hover:opacity-90 transition-opacity">
          <img
            src="/logo.png"
            alt="Quantum Guru"
            style={{ height: '52px', width: 'auto' }}
            className="w-auto object-contain cursor-pointer drop-shadow-xs"
          />
        </a>
      </header>

      {/* Top Right Navigation Links */}
      <nav className="absolute top-6 right-6 md:top-8 md:right-10 z-30 flex items-center gap-3">
        <button
          onClick={scrollToPlatform}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: '#ffffff',
            color: '#1E293B',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s'
          }}
          className="hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
        >
          Explore Platform
        </button>

        <button
          onClick={() => handleNavigate('/ide')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: '#2E65BF',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(46, 101, 191, 0.25)',
            transition: 'all 0.2s'
          }}
          className="hover:bg-[#255299] active:scale-[0.98]"
        >
          Launch IDE
        </button>
      </nav>

      {/* Main Container */}
      <main
        style={{
          paddingTop: '110px',
          paddingBottom: '80px',
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
        {/* SECTION 1: HERO (HEADLINE + CALL TO ACTION + CHANDELIER)     */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '40px',
            width: '100%',
            marginBottom: '72px'
          }}
        >
          {/* Left Column: Headline, Subtitle, Dual CTAs, Interactive Ingress Card */}
          <div style={{ flex: '1 1 560px', maxWidth: '680px', minWidth: '320px' }}>
            
            {/* Category Tag */}
            <div style={{ marginBottom: '16px' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: '#2E65BF',
                  backgroundColor: 'rgba(46, 101, 191, 0.08)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  textTransform: 'uppercase'
                }}
              >
                Autonomous Quantum Computing
              </span>
            </div>

            {/* Core Headline */}
            <h1
              style={{
                fontSize: 'clamp(2.6rem, 4.4vw, 3.8rem)',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: '#0F172A',
                marginBottom: '16px'
              }}
            >
              From Problems to <br />
              <span style={{ color: '#2E65BF' }}>
                Quantum Solutions.
              </span>
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: '1.15rem',
                fontWeight: 500,
                lineHeight: 1.55,
                color: '#475569',
                maxWidth: '580px',
                margin: '0 0 28px 0'
              }}
            >
              An AI-native platform to formulate, build, optimize, and execute quantum solutions — without in-house quantum talent or custom plumbing.
            </p>

            {/* Hero CTA Button (Zero Icons) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '32px' }}>
              <button
                onClick={() => handleNavigate('/ide')}
                style={{
                  padding: '14px 28px',
                  backgroundColor: '#2E65BF',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(46, 101, 191, 0.25)',
                  transition: 'all 0.2s'
                }}
                className="hover:bg-[#255299] active:scale-[0.98]"
              >
                Launch Quantum IDE →
              </button>
            </div>

            {/* Interactive Formulation Ingress Preview Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '18px 20px',
                boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.04)',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748B', textTransform: 'uppercase' }}>
                  Natural Language Ingress Preview
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '4px' }}>
                  Verified Mathematical Model
                </span>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '2px' }}>Input intent:</span>
                <p style={{ margin: 0, fontSize: '13px', color: '#1E293B', fontStyle: 'italic', lineHeight: 1.4 }}>
                  "Optimize 120 delivery routes across 15 regional warehouses under strict 4-hour customer SLAs."
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: '#475569' }}>
                <span>Problem: <strong>Vehicle Routing (VRP)</strong></span>
                <span>Model: <strong>QUBO / CQM</strong></span>
                <span>Variables: <strong>1,240</strong></span>
                <span>Target: <strong>D-Wave Hybrid / GPU</strong></span>
              </div>
            </div>

          </div>

          {/* Right Column: Quantum Hardware Chandelier */}
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
            <div
              style={{
                position: 'absolute',
                width: '380px',
                height: '380px',
                borderRadius: '50%',
                backgroundColor: 'rgba(46, 101, 191, 0.12)',
                filter: 'blur(60px)',
                pointerEvents: 'none'
              }}
            />
            <img
              src="/quantum-computer.png"
              alt="Quantum Computer Architecture"
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                maxWidth: '460px',
                height: 'auto',
                maxHeight: '520px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 16px 30px rgba(46, 101, 191, 0.15))'
              }}
            />
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SECTION 2: THE 5-STEP WORKFLOW BACKBONE                       */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section style={{ width: '100%', marginBottom: '84px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', color: '#94A3B8', textTransform: 'uppercase' }}>
              Execution Lifecycle
            </span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F172A', marginTop: '6px', letterSpacing: '-0.02em' }}>
              From Business Intent to Quantum Result
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '16px',
              width: '100%'
            }}
          >
            {[
              { num: '01', title: 'DESCRIBE', desc: 'State operational goals and constraints in natural language.' },
              { num: '02', title: 'FORMULATE', desc: 'AI builds Canonical Mathematical Model (CMM) and QUBO matrices.' },
              { num: '03', title: 'BUILD', desc: 'Deterministic compilation generates verified Qiskit circuits and solver code.' },
              { num: '04', title: 'EXECUTE', desc: 'Auto-routes to GPU simulators, D-Wave annealers, or QPU backends.' },
              { num: '05', title: 'ANALYZE', desc: 'Pre-flight audited results and measurement histograms return in milliseconds.' }
            ].map((step, idx) => (
              <div
                key={step.num}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '22px 20px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#2E65BF', marginBottom: '8px', letterSpacing: '0.05em' }}>
                  {step.num}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px', letterSpacing: '0.04em' }}>
                  {step.title}
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SECTION 3: THE QUANTUM GURU PLATFORM (4 CORE PILLARS)         */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section id="platform-pillars" style={{ width: '100%', marginBottom: '84px', scrollMarginTop: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', color: '#94A3B8', textTransform: 'uppercase' }}>
              Integrated Architecture
            </span>
            <h2 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', letterSpacing: '-0.02em' }}>
              The Quantum Guru Platform
            </h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#64748B', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
              Modular software components built to span both combinatorial optimization and gate-based quantum workflows.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
              gap: '20px',
              width: '100%'
            }}
          >
            {pillars.map((pillar) => (
              <div
                key={pillar.id}
                onClick={() => handlePillarClick(pillar)}
                className="group relative bg-white hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                style={{
                  borderRadius: '20px',
                  padding: '26px 24px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 18px -4px rgba(0, 0, 0, 0.04)',
                  boxSizing: 'border-box'
                }}
              >
                <div>
                  {/* Badge Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(46, 101, 191, 0.08)',
                        color: pillar.accentColor
                      }}
                    >
                      {pillar.badge}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: pillar.isAvailable ? '#ECFDF5' : '#F8FAFC',
                        color: pillar.isAvailable ? '#059669' : '#94A3B8'
                      }}
                    >
                      {pillar.isAvailable ? 'Available Now' : 'Enterprise Preview'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      color: '#0F172A',
                      marginBottom: '10px',
                      letterSpacing: '-0.015em'
                    }}
                    className="group-hover:text-[#2E65BF] transition-colors"
                  >
                    {pillar.title}
                  </h3>

                  {/* Description */}
                  <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.55, margin: '0 0 16px 0' }}>
                    {pillar.description}
                  </p>

                  {/* Feature Bullets */}
                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', marginBottom: '16px' }}>
                    {pillar.features.map((feat, fIdx) => (
                      <div key={fIdx} style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>
                        • {feat}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom CTA Text */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: pillar.accentColor }}>
                    {pillar.ctaText}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SECTION 4: REAL-WORLD PROBLEM DOMAINS (WHAT CAN YOU SOLVE?)  */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section style={{ width: '100%', marginBottom: '84px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', color: '#94A3B8', textTransform: 'uppercase' }}>
              Applied Computational Value
            </span>
            <h2 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', letterSpacing: '-0.02em' }}>
              Solve Real-World Computational Bottlenecks
            </h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#64748B', maxWidth: '620px', marginLeft: 'auto', marginRight: 'auto' }}>
              Stop settling for 30-year-old heuristics. Formulate and solve complex NP-hard challenges with mathematically verified quantum pipelines.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
              gap: '18px',
              width: '100%'
            }}
          >
            {problemDomains.map((prob, pIdx) => (
              <div
                key={pIdx}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '24px 22px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                  boxSizing: 'border-box'
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#2E65BF',
                    backgroundColor: 'rgba(46, 101, 191, 0.08)',
                    padding: '3px 7px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    display: 'inline-block',
                    marginBottom: '10px'
                  }}
                >
                  {prob.category}
                </span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  {prob.title}
                </h4>
                <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  {prob.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SECTION 5: MULTI-BACKEND RUNTIME STRIP                        */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section
          style={{
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            padding: '32px 28px',
            boxShadow: '0 4px 16px -4px rgba(0, 0, 0, 0.04)',
            boxSizing: 'border-box',
            marginBottom: '72px',
            textAlign: 'center'
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#94A3B8', textTransform: 'uppercase' }}>
            Universal Execution Engine
          </span>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A', marginTop: '6px', marginBottom: '16px' }}>
            One Workflow. Multiple Backends.
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '580px', margin: '0 auto 20px auto' }}>
            Automatic routing across classical GPU simulators, D-Wave quantum annealers, and gate-based QPU hardware without code rewrites.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {['Qiskit AerSimulator', 'D-Wave Leap Advantage', 'IBM Quantum QPUs', 'Simulated Annealing', 'GPU Solvers', 'Rigetti & IonQ'].map((b, bIdx) => (
              <span
                key={bIdx}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#334155',
                  backgroundColor: '#F1F5F9',
                  padding: '5px 12px',
                  borderRadius: '6px'
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SECTION 6: CLOSING CONVERSION ACTION BOX                      */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section
          style={{
            width: '100%',
            backgroundColor: '#0F172A',
            color: '#ffffff',
            borderRadius: '24px',
            padding: '48px 32px',
            boxSizing: 'border-box',
            textAlign: 'center'
          }}
        >
          <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.3rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Ready to Solve Your Hardest Operational Problem?
          </h2>
          <p style={{ fontSize: '14px', color: '#94A3B8', maxWidth: '540px', margin: '0 auto 28px auto', lineHeight: 1.55 }}>
            Experience autonomous mathematical formulation and hardware execution today — zero quantum talent or infrastructure setup required.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleNavigate('/ide')}
              style={{
                padding: '14px 28px',
                backgroundColor: '#2E65BF',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(46, 101, 191, 0.35)',
                transition: 'all 0.2s'
              }}
              className="hover:bg-[#255299] active:scale-[0.98]"
            >
              Launch Quantum IDE →
            </button>
          </div>
        </section>

      </main>

      {/* Restricted / Available Soon Dialog Modal (Zero Icons) */}
      {restrictedModalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setRestrictedModalInfo(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>

            <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider mb-2">
              Enterprise Preview
            </span>

            <h3 className="text-xl font-bold text-slate-900 mt-2 mb-2">
              {restrictedModalInfo.title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              This studio is part of our Phase 2 enterprise rollout. You have full, unrestricted access to the live <strong>Quantum IDE & Studio</strong> right now.
            </p>

            <div className="flex items-center gap-3">
              <Link
                href="/ide"
                onClick={() => setRestrictedModalInfo(null)}
                className="flex-1 text-center py-2.5 px-4 bg-[#2E65BF] text-white text-xs font-semibold rounded-xl hover:bg-[#255299] transition-all shadow-xs"
              >
                Launch Quantum IDE →
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

      {/* Footer (Zero Icons) */}
      <footer style={{ marginTop: '56px', paddingTop: '32px', paddingBottom: '40px' }} className="border-t border-slate-200/60">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs font-medium text-slate-500">
            © 2026 Quantum Guru Inc. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
