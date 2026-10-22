"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * Positioning preview — "One platform, two ways in."
 * Door 1: Quantum Studio (build it yourself) — available now.
 * Door 2: Autonomous Pipeline (hand us the problem) — early access.
 * Vision: both converge (clearly labelled as roadmap).
 */

const C = {
  bg: '#F8FAFC',
  ink: '#0F172A',
  body: '#475569',
  muted: '#64748B',
  faint: '#94A3B8',
  line: '#E2E8F0',
  blue: '#2E65BF',
  blueSoft: 'rgba(46, 101, 191, 0.08)',
  green: '#059669',
  greenSoft: '#ECFDF5',
  amber: '#B45309',
  amberSoft: '#FFFBEB'
};

/* ── Use cases by domain ───────────────────────────────────────── */
type Door = 'Autonomous' | 'Studio';
interface UseCase { t: string; d: string; door: Door }
interface Domain { id: string; name: string; blurb: string; cases: UseCase[] }

const USE_CASES: Domain[] = [
  {
    id: 'logistics',
    name: 'Logistics & Transport',
    blurb: 'Move more with fewer vehicles, miles and missed windows.',
    cases: [
      { t: 'Last-mile dispatch', d: 'Assign orders to vehicles within payload limits at the lowest cost.', door: 'Autonomous' },
      { t: 'Hazmat-compliant loading', d: 'Keep incompatible cargo apart while still filling every truck.', door: 'Autonomous' },
      { t: 'Delivery time windows', d: 'Respect customer and dock windows across the whole fleet.', door: 'Autonomous' },
      { t: 'Dock & yard scheduling', d: 'Sequence trailers through limited dock doors without queues.', door: 'Autonomous' }
    ]
  },
  {
    id: 'workforce',
    name: 'Workforce Management',
    blurb: 'Rosters that meet demand and labour rules on the first try.',
    cases: [
      { t: 'Nurse & clinical rostering', d: 'Cover every shift while honouring PTO and certifications.', door: 'Autonomous' },
      { t: 'Skill-based shift planning', d: 'Match operators to shifts that need their specific skills.', door: 'Autonomous' },
      { t: 'Rest & fatigue compliance', d: 'Prevent night-to-morning turnarounds and over-scheduling.', door: 'Autonomous' },
      { t: 'Demand-driven staffing', d: 'Staff each period to forecast demand without overtime spikes.', door: 'Autonomous' }
    ]
  },
  {
    id: 'construction',
    name: 'Construction',
    blurb: 'Schedules that respect physics, safety and the weather.',
    cases: [
      { t: 'Critical-path scheduling', d: 'Sequence activities with curing and inspection lags built in.', door: 'Autonomous' },
      { t: 'Crane & equipment allocation', d: 'Decide how many cranes each zone needs, and when.', door: 'Autonomous' },
      { t: 'Site safety sequencing', d: 'Keep overlapping drop zones from running at the same time.', door: 'Autonomous' },
      { t: 'Weather-aware rescheduling', d: 'Re-plan around storm and high-wind blackout periods.', door: 'Autonomous' }
    ]
  },
  {
    id: 'supply-chain',
    name: 'Supply Chain',
    blurb: 'Network decisions that balance cost, capacity and service.',
    cases: [
      { t: 'Distribution centre selection', d: 'Choose which facilities to open against fixed and shipping costs.', door: 'Autonomous' },
      { t: 'Single-source allocation', d: 'Assign each retailer to exactly one open, capacitated DC.', door: 'Autonomous' },
      { t: 'Shipment lot sizing', d: 'Pick reorder and reserve lot sizes within min/max bounds.', door: 'Autonomous' },
      { t: 'Supplier selection', d: 'Choose a supplier mix under budget and capacity limits.', door: 'Autonomous' }
    ]
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    blurb: 'Keep machines busy and lines moving.',
    cases: [
      { t: 'Job-shop scheduling', d: 'Route jobs through multi-stage machines with processing lags.', door: 'Autonomous' },
      { t: 'Maintenance windows', d: 'Plan production around preventive maintenance and calibration.', door: 'Autonomous' },
      { t: 'Batch sizing', d: 'Choose batch sizes that balance setup and holding cost.', door: 'Autonomous' },
      { t: 'Shared-machine conflicts', d: 'Stop two operations from claiming the same machine at once.', door: 'Autonomous' }
    ]
  },
  {
    id: 'finance',
    name: 'Finance',
    blurb: 'Discrete allocation decisions with risk built in.',
    cases: [
      { t: 'Portfolio selection', d: 'Pick assets that maximise return while penalising correlated risk.', door: 'Autonomous' },
      { t: 'Capital budgeting', d: 'Fund the best set of projects within a fixed budget.', door: 'Autonomous' },
      { t: 'Dependent investments', d: 'Respect prerequisites between tranches and project phases.', door: 'Autonomous' },
      { t: 'Algorithm research', d: 'Prototype quantum finance models hands-on in code.', door: 'Studio' }
    ]
  },
  {
    id: 'energy',
    name: 'Energy & Utilities',
    blurb: 'Reliable grids at lower cost and carbon.',
    cases: [
      { t: 'Unit commitment', d: 'Decide which generators run in each period of the day.', door: 'Autonomous' },
      { t: 'Reserve margin planning', d: 'Guarantee minimum online capacity during peak demand.', door: 'Autonomous' },
      { t: 'Ramp & cool-down rules', d: 'Respect how quickly thermal units can start and stop.', door: 'Autonomous' },
      { t: 'Storage dispatch', d: 'Schedule battery charge and discharge across load periods.', door: 'Autonomous' }
    ]
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Pharma',
    blurb: 'From operating rooms to molecules.',
    cases: [
      { t: 'Operating room scheduling', d: 'Fit procedures into slots with sterilisation turnaround.', door: 'Autonomous' },
      { t: 'Cleanroom batch scheduling', d: 'Sequence biologic batches without contamination conflicts.', door: 'Autonomous' },
      { t: 'Surgeon availability', d: 'Plan around specialist blackouts and room capabilities.', door: 'Autonomous' },
      { t: 'Molecular simulation', d: 'Explore ground-state chemistry with variational algorithms.', door: 'Studio' }
    ]
  },
  {
    id: 'telecom',
    name: 'Telecom & Infrastructure',
    blurb: 'Allocate spectrum, compute and coverage.',
    cases: [
      { t: 'Channel assignment', d: 'Assign frequencies so neighbouring links never interfere.', door: 'Autonomous' },
      { t: 'Satellite beam scheduling', d: 'Route satellites across wavelengths and time windows.', door: 'Autonomous' },
      { t: 'Workload placement', d: 'Place compute jobs across nodes within capacity.', door: 'Autonomous' },
      { t: 'Sensor placement', d: 'Cover a network with the fewest monitoring points.', door: 'Autonomous' }
    ]
  },
  {
    id: 'research',
    name: 'Research & Education',
    blurb: 'Learn, prototype and publish quantum work.',
    cases: [
      { t: 'Learn core algorithms', d: 'Build Grover, QFT and teleportation step by step.', door: 'Studio' },
      { t: 'Variational prototyping', d: 'Iterate on VQE and QAOA circuits with live visualisation.', door: 'Studio' },
      { t: 'Simulator vs hardware', d: 'Compare results on simulators and real backends.', door: 'Studio' },
      { t: 'Teaching labs', d: 'Run classroom exercises in a shared, ready-made workspace.', door: 'Studio' }
    ]
  }
];

function DoorTag({ door, dark = false }: { door: Door; dark?: boolean }) {
  const isAuto = door === 'Autonomous';
  return (
    <span
      style={{
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        padding: '2px 7px',
        borderRadius: '5px',
        whiteSpace: 'nowrap',
        color: isAuto ? (dark ? '#E2E8F0' : '#0F172A') : '#2E65BF',
        backgroundColor: isAuto ? (dark ? 'rgba(255,255,255,0.1)' : '#F1F5F9') : 'rgba(46, 101, 191, 0.08)'
      }}
    >
      {door}
    </span>
  );
}

const eyebrow: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.16em',
  color: C.faint,
  textTransform: 'uppercase'
};

const h2: React.CSSProperties = {
  fontSize: '1.9rem',
  fontWeight: 800,
  color: C.ink,
  marginTop: '6px',
  letterSpacing: '-0.02em'
};

const card: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  border: `1px solid ${C.line}`,
  boxShadow: '0 4px 18px -4px rgba(0, 0, 0, 0.04)',
  boxSizing: 'border-box'
};

function Badge({ tone, children }: { tone: 'green' | 'amber' | 'blue'; children: React.ReactNode }) {
  const map = {
    green: { c: C.green, b: C.greenSoft },
    amber: { c: C.amber, b: C.amberSoft },
    blue: { c: C.blue, b: C.blueSoft }
  }[tone];
  return (
    <span
      style={{
        fontSize: '10.5px',
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: map.c,
        backgroundColor: map.b,
        padding: '4px 9px',
        borderRadius: '6px',
        textTransform: 'uppercase'
      }}
    >
      {children}
    </span>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 22px',
        backgroundColor: C.blue,
        color: '#ffffff',
        fontSize: '13.5px',
        fontWeight: 600,
        borderRadius: '11px',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(46, 101, 191, 0.25)'
      }}
      className="hover:bg-[#255299] active:scale-[0.98] transition-all"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 22px',
        backgroundColor: C.ink,
        color: '#ffffff',
        fontSize: '13.5px',
        fontWeight: 600,
        borderRadius: '11px',
        border: 'none',
        cursor: 'pointer'
      }}
      className="hover:bg-slate-800 active:scale-[0.98] transition-all"
    >
      {children}
    </button>
  );
}

export default function PositioningPreview() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const launchStudio = () => {
    if (!isAuthenticated) router.push(`/login?redirect=${encodeURIComponent('/ide')}`);
    else router.push('/ide');
  };

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  // Use Cases dropdown + section state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuDomain, setMenuDomain] = useState(USE_CASES[0].id);
  const [sectionDomain, setSectionDomain] = useState(USE_CASES[0].id);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const openDomainInSection = (id: string) => {
    setSectionDomain(id);
    setMenuOpen(false);
    scrollTo('use-cases');
  };

  const menuData = USE_CASES.find((d) => d.id === menuDomain) || USE_CASES[0];
  const sectionData = USE_CASES.find((d) => d.id === sectionDomain) || USE_CASES[0];

  // TODO: wire to the real early-access form / destination.
  const requestAccess = () => scrollTo('get-started');

  return (
    <div className="relative min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.ink }}>
      {/* ── Header (matches current landing page placement) ─────── */}
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

      {/* Top Right Navigation */}
      <nav className="absolute top-6 right-6 md:top-8 md:right-10 z-30 flex items-center gap-3">
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Use Cases dropdown */}
            <div
              ref={menuRef}
              style={{ position: 'relative' }}
              onMouseEnter={() => setMenuOpen(true)}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
                style={{
                  padding: '7px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: menuOpen ? C.ink : C.body,
                  background: menuOpen ? 'rgba(226, 232, 240, 0.6)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                className="hover:text-slate-900 transition-colors"
              >
                Use Cases
                <span
                  style={{
                    fontSize: '9px',
                    display: 'inline-block',
                    transform: menuOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s'
                  }}
                >
                  ▼
                </span>
              </button>

              {menuOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, paddingTop: '10px', zIndex: 40 }}>
                  <div
                    style={{
                      width: '680px',
                      maxWidth: 'calc(100vw - 32px)',
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      border: `1px solid ${C.line}`,
                      boxShadow: '0 20px 40px -12px rgba(15, 23, 42, 0.18)',
                      display: 'grid',
                      gridTemplateColumns: '220px 1fr',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Domain list */}
                    <div style={{ backgroundColor: C.bg, borderRight: `1px solid ${C.line}`, padding: '10px' }}>
                      <div style={{ ...eyebrow, fontSize: '10px', padding: '6px 10px 8px' }}>By domain</div>
                      {USE_CASES.map((d) => {
                        const active = d.id === menuDomain;
                        return (
                          <button
                            key={d.id}
                            onMouseEnter={() => setMenuDomain(d.id)}
                            onFocus={() => setMenuDomain(d.id)}
                            onClick={() => openDomainInSection(d.id)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 10px',
                              fontSize: '13px',
                              fontWeight: active ? 700 : 500,
                              color: active ? C.blue : C.body,
                              backgroundColor: active ? '#ffffff' : 'transparent',
                              border: active ? `1px solid ${C.line}` : '1px solid transparent',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            {d.name}
                            {active && <span style={{ fontSize: '11px' }}>›</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Use cases for hovered domain */}
                    <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: C.ink }}>{menuData.name}</div>
                      <div style={{ fontSize: '12.5px', color: C.muted, margin: '2px 0 14px' }}>{menuData.blurb}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        {menuData.cases.map((u) => (
                          <button
                            key={u.t}
                            onClick={() => openDomainInSection(menuData.id)}
                            style={{
                              textAlign: 'left',
                              padding: '9px 10px',
                              borderRadius: '9px',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer'
                            }}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: C.ink }}>{u.t}</span>
                              <DoorTag door={u.door} />
                            </div>
                            <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px', lineHeight: 1.45 }}>{u.d}</div>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => openDomainInSection(menuData.id)}
                        style={{
                          marginTop: '12px',
                          alignSelf: 'flex-start',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: C.blue,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px 10px'
                        }}
                      >
                        View all use cases →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
        </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={requestAccess}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: C.ink,
                backgroundColor: '#ffffff',
                border: `1px solid ${C.line}`,
                borderRadius: '10px',
                cursor: 'pointer'
              }}
              className="hover:bg-slate-50 transition-colors"
            >
              Request Access
            </button>
            <button
              onClick={launchStudio}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: C.blue,
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
              className="hover:bg-[#255299] transition-colors"
            >
              Launch Studio
            </button>
          </div>
      </nav>

      <main style={{ maxWidth: '1180px', margin: '0 auto', padding: '110px 24px 80px', boxSizing: 'border-box' }}>
        {/* ── Hero: umbrella + two doors ─────────────────────────── */}
        <section style={{ textAlign: 'center', marginBottom: '96px' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: C.blue,
              backgroundColor: C.blueSoft,
              padding: '5px 12px',
              borderRadius: '6px',
              textTransform: 'uppercase',
              marginBottom: '18px'
            }}
          >
            One Quantum Platform · Two Ways In
          </span>
          <h1
            style={{
              fontSize: 'clamp(2.4rem, 4.6vw, 3.7rem)',
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              margin: '0 auto 18px',
              maxWidth: '820px'
            }}
          >
            Build quantum yourself.
            <br />
            <span style={{ color: C.blue }}>Or hand us the problem.</span>
          </h1>
          <p style={{ fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.6, color: C.body, maxWidth: '620px', margin: '0 auto 48px' }}>
            A hands-on studio for people who write quantum code, and an autonomous pipeline for teams who just need the answer.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
              textAlign: 'left',
              maxWidth: '980px',
              margin: '0 auto'
            }}
          >
            {/* Door 1 */}
            <div style={{ ...card, padding: '30px 28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: C.muted }}>For developers, learners & researchers</span>
                <Badge tone="green">Available now</Badge>
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Quantum Studio</h3>
              <p style={{ fontSize: '14px', color: C.body, lineHeight: 1.6, margin: '0 0 20px' }}>
                Learn, write, visualize and run quantum programs in one workspace — Qiskit and D-Wave, side by side.
              </p>
              <div style={{ fontSize: '13px', color: C.ink, lineHeight: 2, marginBottom: '24px', flex: 1 }}>
                <div>— Code editor with live circuit view</div>
                <div>— Simulate before you spend hardware time</div>
                <div>— Guided learning built in</div>
              </div>
              <div>
                <PrimaryButton onClick={launchStudio}>Launch Studio →</PrimaryButton>
              </div>
            </div>

            {/* Door 2 */}
            <div style={{ ...card, padding: '30px 28px', display: 'flex', flexDirection: 'column', backgroundColor: C.ink, border: `1px solid ${C.ink}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: C.faint }}>For enterprise & applied research</span>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#FCD34D',
                    backgroundColor: 'rgba(252, 211, 77, 0.12)',
                    padding: '4px 9px',
                    borderRadius: '6px',
                    textTransform: 'uppercase'
                  }}
                >
                  Early access
                </span>
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px', color: '#ffffff' }}>
                Autonomous Pipeline
              </h3>
              <p style={{ fontSize: '14px', color: '#CBD5E1', lineHeight: 1.6, margin: '0 0 20px' }}>
                Describe an operational problem in plain language or structured data. We formulate, verify, solve and return the answer.
              </p>
              <div style={{ fontSize: '13px', color: '#E2E8F0', lineHeight: 2, marginBottom: '24px', flex: 1 }}>
                <div>— No quantum team required</div>
                <div>— Feasibility checked before any compute is spent</div>
                <div>— Results in your business terms, not qubits</div>
              </div>
              <div>
                <button
                  onClick={requestAccess}
                  style={{
                    padding: '12px 22px',
                    backgroundColor: '#ffffff',
                    color: C.ink,
                    fontSize: '13.5px',
                    fontWeight: 700,
                    borderRadius: '11px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  className="hover:bg-slate-100 active:scale-[0.98] transition-all"
                >
                  Request early access →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Door 1 detail: Studio ─────────────────────────────── */}
        <section id="studio" style={{ marginBottom: '96px', scrollMarginTop: '90px' }}>
          <div style={{ marginBottom: '28px' }}>
            <span style={eyebrow}>Quantum Studio</span>
            <h2 style={h2}>For people who build.</h2>
            <p style={{ fontSize: '14px', color: C.muted, maxWidth: '560px', margin: '6px 0 0' }}>
              From your first circuit to production-grade experiments — one ecosystem instead of five tools.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
            {[
              { k: 'Learn', t: 'Understand the concepts', d: 'Guided lessons and worked examples that run in the same workspace you build in.' },
              { k: 'Build', t: 'Write and visualize', d: 'A full code editor with a real-time circuit view, for Qiskit and D-Wave workflows.' },
              { k: 'Run', t: 'Simulate, then execute', d: 'Pre-flight on simulators, then send to real backends without rewriting code.' }
            ].map((x) => (
              <div key={x.k} style={{ ...card, padding: '26px 24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: C.blue, letterSpacing: '0.06em', marginBottom: '10px' }}>{x.k.toUpperCase()}</div>
                <div style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: '6px' }}>{x.t}</div>
                <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.55, margin: 0 }}>{x.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Door 2 detail: Autonomous ─────────────────────────── */}
        <section id="autonomous" style={{ marginBottom: '96px', scrollMarginTop: '90px' }}>
          <div style={{ marginBottom: '28px' }}>
            <span style={eyebrow}>Autonomous Pipeline</span>
            <h2 style={h2}>For teams with a problem, not a quantum team.</h2>
            <p style={{ fontSize: '14px', color: C.muted, maxWidth: '600px', margin: '6px 0 0' }}>
              You describe the problem. The pipeline does the rest — and tells you upfront if it can&apos;t be solved.
            </p>
          </div>

          <div style={{ ...card, padding: '32px 28px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '24px',
                alignItems: 'start'
              }}
            >
              {[
                { n: '01', t: 'You describe', d: 'Plain language, or structured exports from the systems you already use.' },
                { n: '02', t: 'We formulate & verify', d: 'The problem becomes a verified mathematical model. Impossible constraints are caught before solving.' },
                { n: '03', t: 'You get the answer', d: 'An optimized schedule, route or allocation — in your terms, ready to act on.' }
              ].map((s, i) => (
                <div key={s.n} style={{ position: 'relative' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: C.blue, marginBottom: '8px' }}>{s.n}</div>
                  <div style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: '6px' }}>{s.t}</div>
                  <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.55, margin: 0 }}>{s.d}</p>
                  {i < 2 && (
                    <div
                      className="hidden md:block"
                      style={{ position: 'absolute', top: '6px', right: '-14px', color: C.faint, fontSize: '14px' }}
                    >
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ borderTop: `1px solid ${C.line}`, marginTop: '28px', paddingTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['Logistics', 'Workforce scheduling', 'Construction', 'Supply chain', 'Manufacturing', 'Portfolio'].map((d) => (
                  <span key={d} style={{ fontSize: '12px', fontWeight: 600, color: '#334155', backgroundColor: '#F1F5F9', padding: '5px 11px', borderRadius: '6px' }}>
                    {d}
                  </span>
                ))}
              </div>
              <SecondaryButton onClick={requestAccess}>Request early access →</SecondaryButton>
            </div>
          </div>
        </section>

        {/* ── Use cases by domain ───────────────────────────────── */}
        <section id="use-cases" style={{ marginBottom: '96px', scrollMarginTop: '90px' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={eyebrow}>Use cases</span>
            <h2 style={h2}>What you can solve, by domain.</h2>
            <p style={{ fontSize: '14px', color: C.muted, maxWidth: '600px', margin: '6px 0 0' }}>
              Each use case is tagged with the way in: <strong style={{ color: C.ink }}>Autonomous</strong> (hand us the problem) or{' '}
              <strong style={{ color: C.blue }}>Studio</strong> (build it yourself).
            </p>
          </div>

          {/* Domain tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {USE_CASES.map((d) => {
              const active = d.id === sectionDomain;
              return (
                <button
                  key={d.id}
                  onClick={() => setSectionDomain(d.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '9px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: active ? C.ink : '#ffffff',
                    color: active ? '#ffffff' : C.body,
                    border: `1px solid ${active ? C.ink : C.line}`,
                    transition: 'all 0.15s'
                  }}
                >
                  {d.name}
                </button>
              );
            })}
          </div>

          {/* Domain panel */}
          <div style={{ ...card, padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.015em' }}>{sectionData.name}</div>
                <div style={{ fontSize: '13.5px', color: C.muted, marginTop: '2px' }}>{sectionData.blurb}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {sectionData.cases.map((u) => (
                <div
                  key={u.t}
                  style={{
                    border: `1px solid ${C.line}`,
                    borderRadius: '14px',
                    padding: '18px',
                    backgroundColor: C.bg,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div>
                    <DoorTag door={u.door} />
                  </div>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: C.ink }}>{u.t}</div>
                  <p style={{ fontSize: '12.5px', color: C.muted, lineHeight: 1.55, margin: 0, flex: 1 }}>{u.d}</p>
                  <button
                    onClick={u.door === 'Studio' ? launchStudio : requestAccess}
                    style={{
                      alignSelf: 'flex-start',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: C.blue,
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer'
                    }}
                  >
                    {u.door === 'Studio' ? 'Try in Studio →' : 'Request early access →'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Vision: convergence (clearly labelled roadmap) ─────── */}
        <section id="vision" style={{ marginBottom: '96px', scrollMarginTop: '90px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span style={eyebrow}>Where this is going</span>
            <h2 style={h2}>Two paths. One platform.</h2>
            <p style={{ fontSize: '14px', color: C.muted, maxWidth: '560px', margin: '6px auto 0' }}>
              Studio and the Autonomous Pipeline are converging — so you can go hands-on, hand it off, or switch between the two.
            </p>
          </div>

          <div style={{ ...card, padding: '32px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: C.muted, marginBottom: '8px', letterSpacing: '0.06em' }}>HANDS-ON</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                    {['Experiment', 'Build', 'Execute', 'Deploy'].map((s, i, a) => (
                      <React.Fragment key={s}>
                        <span style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${C.line}`, backgroundColor: C.bg }}>{s}</span>
                        {i < a.length - 1 && <span style={{ color: C.faint }}>→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: C.muted, marginBottom: '8px', letterSpacing: '0.06em' }}>HANDS-OFF</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                    <span style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${C.line}`, backgroundColor: C.bg }}>Give us the problem</span>
                    <span style={{ color: C.faint }}>→</span>
                    <span style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${C.line}`, backgroundColor: C.bg }}>We handle everything</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: C.ink,
                  color: '#ffffff',
                  borderRadius: '16px',
                  padding: '26px 24px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.12em', color: '#93C5FD', marginBottom: '8px' }}>ROADMAP</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>The complete quantum workflow</div>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0, lineHeight: 1.55 }}>
                  Start with code or start with a problem — end with a deployed, verified result.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Backends strip (kept from current page) ────────────── */}
        <section style={{ textAlign: 'center', marginBottom: '80px' }}>
          <span style={eyebrow}>Runs on</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '14px' }}>
            {['Qiskit Aer', 'IBM Quantum', 'D-Wave Leap', 'Simulated Annealing', 'GPU Solvers'].map((b) => (
              <span key={b} style={{ fontSize: '12px', fontWeight: 600, color: '#334155', backgroundColor: '#ffffff', border: `1px solid ${C.line}`, padding: '6px 13px', borderRadius: '7px' }}>
                {b}
              </span>
            ))}
          </div>
        </section>

        {/* ── Closing: two doors again ──────────────────────────── */}
        <section
          id="get-started"
          style={{
            backgroundColor: C.ink,
            color: '#ffffff',
            borderRadius: '24px',
            padding: '48px 32px',
            textAlign: 'center',
            scrollMarginTop: '90px'
          }}
        >
          <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 10px' }}>
            Which way in?
          </h2>
          <p style={{ fontSize: '14px', color: '#94A3B8', maxWidth: '480px', margin: '0 auto 28px', lineHeight: 1.55 }}>
            Start building in the Studio today, or join early access for the Autonomous Pipeline.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <PrimaryButton onClick={launchStudio}>Launch Studio →</PrimaryButton>
            <button
              onClick={() => {
                /* TODO: open early-access form */
              }}
              style={{
                padding: '12px 22px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 600,
                borderRadius: '11px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer'
              }}
              className="hover:bg-white/15 transition-all"
            >
              Request early access
            </button>
          </div>
        </section>
      </main>

      <footer style={{ paddingTop: '28px', paddingBottom: '36px' }} className="border-t border-slate-200/60">
        <p className="text-xs font-medium text-slate-500 text-center">© 2026 Quantum Guru Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
