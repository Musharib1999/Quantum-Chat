"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Cpu,
  ArrowRight,
  Bot,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Code2,
  Workflow,
  Boxes,
  GraduationCap,
  Clock,
  Menu,
  X
} from 'lucide-react';

interface StudioCard {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  accentColor: 'electric' | 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose';
  adminOnly: boolean;
  badgeText: string;
  actionText: string;
}

export default function LandingPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [restrictedModalInfo, setRestrictedModalInfo] = useState<{ title: string; description: string } | null>(null);

  const isAdmin = isAuthenticated && user?.role === 'admin';

  const studioCards: StudioCard[] = [
    {
      id: 'ide',
      title: 'Quantum IDE & Playground',
      description: 'Interactive quantum code editor, live multi-qubit visual circuit canvas, and dual Qiskit & D-Wave simulation backends.',
      href: '/ide',
      icon: <Code2 size={28} />,
      accentColor: 'electric',
      adminOnly: false,
      badgeText: isAuthenticated ? 'Available with login' : 'Unlock with free account',
      actionText: 'Launch IDE'
    },
    {
      id: 'optimization',
      title: 'Optimization Studio',
      description: 'Industry specific guided problem solving wizards based on hardware, use case, and mathematical formulation.',
      href: '/quantum-assistant',
      icon: <Bot size={28} />,
      accentColor: 'indigo',
      adminOnly: true,
      badgeText: 'Will be available soon',
      actionText: 'Explore Studio'
    },
    {
      id: 'circuits',
      title: 'Quantum Circuit Studio',
      description: 'Deep visual circuit synthesis, multi-pass transpiler optimization passes, noise modeling, and unitary analysis.',
      href: '/ide?tab=circuit',
      icon: <Cpu size={28} />,
      accentColor: 'emerald',
      adminOnly: true,
      badgeText: 'Will be available soon',
      actionText: 'Explore Circuits'
    },
    {
      id: 'algorithms',
      title: 'Quantum Algorithm Studio',
      description: 'Algorithmic archetypes including Grover search, QFT, VQE chemistry, and variational quantum classification.',
      href: '/ide',
      icon: <Workflow size={28} />,
      accentColor: 'violet',
      adminOnly: true,
      badgeText: 'Will be available soon',
      actionText: 'Explore Algorithms'
    },
    {
      id: 'marketplace',
      title: 'Quantum Capability Exchange',
      description: 'Enterprise catalog of 38 pre-built quantum microservices across optimization, chemistry, circuits, and machine learning.',
      href: '/marketplace',
      icon: <Boxes size={28} />,
      accentColor: 'amber',
      adminOnly: true,
      badgeText: 'Will be available soon',
      actionText: 'Explore Exchange'
    },
    {
      id: 'academy',
      title: 'Quantum Academy',
      description: 'Interactive educational environment with step-by-step Dirac mathematical breakdowns and algorithmic derivations.',
      href: '/ide',
      icon: <GraduationCap size={28} />,
      accentColor: 'rose',
      adminOnly: true,
      badgeText: 'Will be available soon',
      actionText: 'Explore Academy'
    }
  ];

  const handleCardClick = (e: React.MouseEvent, card: StudioCard) => {
    e.preventDefault();

    // 1. Require login for every card
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(card.href)}`);
      return;
    }

    // 2. If card is admin-only and user is not admin, show "Will be available soon" modal
    if (card.adminOnly && !isAdmin) {
      setRestrictedModalInfo({
        title: card.title,
        description: card.description
      });
      return;
    }

    // 3. User is authorized -> navigate
    router.push(card.href);
  };

  return (
    <div className="min-h-screen transition-colors duration-500 ease-in-out font-sans bg-white text-slate-900">

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

      {/* Navigation */}
      <nav className="sticky top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-all duration-300 border-slate-200 bg-white/80">
        <div className="w-full px-6 md:px-8 h-20 flex items-center justify-between">

          {/* Logo Section */}
          <div className="flex items-center group cursor-pointer hover:opacity-90 transition-opacity">
            <a href="https://www.quantumcomputers.guru/">
              <img
                src="/logo.png"
                alt="Quantum Guru"
                className="h-[40px] md:h-[58px] w-auto object-contain cursor-pointer drop-shadow-xs"
              />
            </a>
          </div>

          {/* Right Action: Clean Authentication State (Test suite removed) */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {user?.email && (
                  <span className="hidden md:inline text-xs text-slate-500 font-mono">
                    {user.email}
                  </span>
                )}
                <button
                  onClick={logout}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-all bg-white shadow-2xs cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-5 py-1.5 bg-[#3066bb] text-white border-2 border-[#3066bb] hover:bg-white hover:text-[#3066bb] font-semibold rounded-lg transition-all shadow-xs text-xs"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-20 flex flex-col items-center">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-3 leading-tight">
            The Future of <br />
            <span className="text-[rgb(48,102,187)]">
              Quantum Analysis
            </span>
          </h1>
          <p className="text-sm md:text-base mb-4 leading-relaxed text-slate-600 max-w-2xl mx-auto">
            Select your specialized interface below to begin your journey of respective quantum domain
          </p>
        </div>

        {/* 6 Studio Cards Grid (Responsive 3x2 on desktop, 2x3 on tablet, 1 col on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
          {studioCards.map((card) => (
            <FeatureCard
              key={card.id}
              card={card}
              onClick={(e) => handleCardClick(e, card)}
            />
          ))}
        </div>
      </main>

      {/* Restricted / Available Soon Dialog Modal */}
      {restrictedModalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setRestrictedModalInfo(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-2xs">
              <Clock size={24} />
            </div>

            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60 uppercase tracking-wider mb-2">
              <Clock size={11} />
              Will be available soon
            </div>

            <h3 className="text-xl font-bold text-slate-900 mt-2 mb-2">
              {restrictedModalInfo.title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              This studio is currently in private preview for administrators and will be publicly available soon. In the meantime, you have full access to our active <strong>Quantum IDE & Playground</strong>!
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
      <footer className="py-10 border-t border-slate-100 text-slate-400">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
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

interface FeatureCardProps {
  card: StudioCard;
  onClick: (e: React.MouseEvent) => void;
}

const FeatureCard = ({ card, onClick }: FeatureCardProps) => {
  const colorMap = {
    electric: {
      light: 'bg-[rgb(27,176,206)]/10 text-[rgb(27,176,206)] group-hover:bg-[rgb(27,176,206)] group-hover:text-white',
      glow: 'bg-[rgb(27,176,206)]'
    },
    indigo: {
      light: 'bg-[rgb(48,102,187)]/10 text-[rgb(48,102,187)] group-hover:bg-[rgb(48,102,187)] group-hover:text-white',
      glow: 'bg-[rgb(48,102,187)]'
    },
    emerald: {
      light: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
      glow: 'bg-emerald-500'
    },
    violet: {
      light: 'bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white',
      glow: 'bg-violet-500'
    },
    amber: {
      light: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
      glow: 'bg-amber-500'
    },
    rose: {
      light: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
      glow: 'bg-rose-500'
    }
  };

  const colors = colorMap[card.accentColor];
  const isAvailableSoon = card.adminOnly;

  return (
    <div
      onClick={onClick}
      className="group relative p-6 md:p-7 rounded-3xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.99] overflow-hidden flex flex-col justify-between bg-white border-slate-100 hover:border-slate-200 cursor-pointer"
    >
      {/* Glow Effect on Hover */}
      <div className={`absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${colors.glow}`} />

      {/* Status Badge */}
      <div
        className={`absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide border shadow-2xs transition-all ${
          isAvailableSoon
            ? 'bg-amber-50/80 text-amber-700 border-amber-200/60'
            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
        }`}
      >
        {isAvailableSoon ? <Clock size={10} /> : <UnlockIcon size={10} />}
        <span>{card.badgeText}</span>
      </div>

      <div>
        {/* Icon Pill */}
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-colors duration-300 ${colors.light}`}>
          {card.icon}
        </div>

        <h3 className="text-xl font-semibold mb-2.5 text-slate-900 tracking-tight">
          {card.title}
        </h3>
        <p className="text-xs md:text-sm leading-relaxed mb-6 text-slate-500">
          {card.description}
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs md:text-sm font-semibold transition-colors duration-300 text-slate-800 group-hover:text-[#3066bb] pt-2 border-t border-slate-50">
        <span>{card.actionText}</span>
        <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </div>
  );
};
