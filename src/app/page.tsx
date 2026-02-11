"use client";

import React from 'react';
import Link from 'next/link';
import { Beaker, TrendingUp, BookOpen, ArrowRight } from 'lucide-react';
import QuantumBackground from '@/components/QuantumBackground';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground relative selection:bg-purple-500/30 overflow-hidden">

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20 dark:opacity-100 transition-opacity duration-500">
        <QuantumBackground />
      </div>
      <div className="fixed inset-0 bg-background/80 z-0 pointer-events-none backdrop-blur-[1px]"></div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-12 flex flex-col justify-center min-h-screen">

        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center justify-center font-bold text-zinc-100 shadow-2xl mx-auto mb-6 text-2xl">
            Q
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">
            Quantum Guru
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Select your specialized interface to begin.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

          <Link href="/industry" className="group">
            <div className="h-full bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-zinc-800/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 flex flex-col relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center mb-6 text-zinc-100 group-hover:scale-105 transition-transform duration-300">
                <Beaker size={28} />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">Quantum Industry</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-1">
                Guided problem-solving wizard for industrial applications, hardware selection, and use-case analysis.
              </p>

              <div className="flex items-center text-sm font-bold text-zinc-100 group-hover:gap-2 transition-all">
                Launch Interface <ArrowRight size={16} className="ml-2 group-hover:ml-0" />
              </div>
            </div>
          </Link>

          <Link href="/market" className="group">
            <div className="h-full bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-zinc-800/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 flex flex-col relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center mb-6 text-zinc-100 group-hover:scale-105 transition-transform duration-300">
                <TrendingUp size={28} />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-green-300 transition-colors">Market Intelligence</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-1">
                Real-time analysis of financial assets, stock trends, and deep market insights powered by quantum algorithms.
              </p>

              <div className="flex items-center text-sm font-bold text-zinc-100 group-hover:gap-2 transition-all">
                Access Data <ArrowRight size={16} className="ml-2 group-hover:ml-0" />
              </div>
            </div>
          </Link>

          <Link href="/article-learn" className="group">
            <div className="h-full bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-zinc-800/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 flex flex-col relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center mb-6 text-zinc-100 group-hover:scale-105 transition-transform duration-300">
                <BookOpen size={28} />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">Research Lab</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-1">
                Explore curated scientific papers, articles, and educational resources in the quantum domain.
              </p>

              <div className="flex items-center text-sm font-bold text-zinc-100 group-hover:gap-2 transition-all">
                Enter Lab <ArrowRight size={16} className="ml-2 group-hover:ml-0" />
              </div>
            </div>
          </Link>

        </div>

        <footer className="mt-20 text-center text-xs text-zinc-600 font-medium">
          <p className="uppercase tracking-widest">Quantum Guru • System V2.5.0</p>
        </footer>

      </div>
    </div>
  );
}
