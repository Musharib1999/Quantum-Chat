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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center font-bold text-white shadow-2xl mx-auto mb-6 text-2xl">
            Q
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-zinc-400">
            Quantum Intelligence Suite
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Select your specialized interface to begin.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

          {/* Industry Card */}
          <Link href="/industry" className="group">
            <div className="h-full bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-zinc-800/60 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-purple-500/30 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-75"></div>

              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform duration-300">
                <Beaker size={28} />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">Quantum Industry</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-1">
                Guided problem-solving wizard for industrial applications, hardware selection, and use-case analysis.
              </p>

              <div className="flex items-center text-sm font-bold text-purple-400 group-hover:gap-2 transition-all">
                Launch Interface <ArrowRight size={16} className="ml-2 group-hover:ml-0" />
              </div>
            </div>
          </Link>

          {/* Market Card */}
          <Link href="/market" className="group">
            <div className="h-full bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-zinc-800/60 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-green-500/30 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-75"></div>

              <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center mb-6 text-green-400 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp size={28} />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-green-300 transition-colors">Market Intelligence</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-1">
                Real-time analysis of financial assets, stock trends, and deep market insights powered by quantum algorithms.
              </p>

              <div className="flex items-center text-sm font-bold text-green-400 group-hover:gap-2 transition-all">
                Access Data <ArrowRight size={16} className="ml-2 group-hover:ml-0" />
              </div>
            </div>
          </Link>

          {/* Research Card */}
          <Link href="/article-learn" className="group">
            <div className="h-full bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-zinc-800/60 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-blue-500/30 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-75"></div>

              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                <BookOpen size={28} />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">Research Lab</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-1">
                Explore curated scientific papers, articles, and educational resources in the quantum domain.
              </p>

              <div className="flex items-center text-sm font-bold text-blue-400 group-hover:gap-2 transition-all">
                Enter Lab <ArrowRight size={16} className="ml-2 group-hover:ml-0" />
              </div>
            </div>
          </Link>

        </div>

        <footer className="mt-20 text-center text-xs text-zinc-600 font-medium">
          <p className="uppercase tracking-widest">Quantum Intelligence System • System V2.5.0</p>
        </footer>

      </div>
    </div>
  );
}
