"use client";

import React from 'react';
import Link from 'next/link';
import { Beaker, TrendingUp, BookOpen, ArrowRight } from 'lucide-react';
import QuantumBackground from '@/components/QuantumBackground';

import ThemeToggle from '@/components/ThemeToggle';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground relative selection:bg-primary/30 overflow-hidden">

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20 dark:opacity-100 transition-opacity duration-500">
        <QuantumBackground />
      </div>
      <div className="fixed inset-0 bg-background/80 z-0 pointer-events-none backdrop-blur-[1px]"></div>

      {/* Header / Nav */}
      <header className="absolute top-0 w-full z-50 p-6 flex justify-end">
        <ThemeToggle />
      </header>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-12 flex flex-col justify-center min-h-screen">

        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center font-bold text-foreground shadow-2xl mx-auto mb-6 text-2xl">
            QG
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground">
            Quantum Guru
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Select your specialized interface to begin.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

          <Link href="/industry" className="group">
            <div className="h-full bg-card/50 backdrop-blur-xl border border-border rounded-3xl p-8 hover:bg-secondary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20 flex flex-col relative overflow-hidden group-hover:ring-1 group-hover:ring-primary/20">
              <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-6 text-foreground group-hover:scale-105 transition-transform duration-300 group-hover:bg-primary/10 group-hover:text-primary">
                <Beaker size={28} />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">Quantum Industry</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8 flex-1">
                Guided problem-solving wizard for industrial applications, hardware selection, and use-case analysis.
              </p>

              <div className="flex items-center text-sm font-bold text-foreground group-hover:text-primary group-hover:gap-2 transition-all">
                Launch Interface <ArrowRight size={16} className="ml-2 group-hover:ml-0" />
              </div>
            </div>
          </Link>

          <Link href="/market" className="group">
            <div className="h-full bg-card/50 backdrop-blur-xl border border-border rounded-3xl p-8 hover:bg-secondary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-green-500/20 flex flex-col relative overflow-hidden group-hover:ring-1 group-hover:ring-green-500/20">
              <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-6 text-foreground group-hover:scale-105 transition-transform duration-300 group-hover:bg-green-500/10 group-hover:text-green-500">
                <TrendingUp size={28} />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-green-500 transition-colors">Market Intelligence</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8 flex-1">
                Real-time analysis of financial assets, stock trends, and deep market insights powered by quantum algorithms.
              </p>

              <div className="flex items-center text-sm font-bold text-foreground group-hover:text-green-500 group-hover:gap-2 transition-all">
                Access Data <ArrowRight size={16} className="ml-2 group-hover:ml-0" />
              </div>
            </div>
          </Link>

          <Link href="/article-learn" className="group">
            <div className="h-full bg-card/50 backdrop-blur-xl border border-border rounded-3xl p-8 hover:bg-secondary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-500/20 flex flex-col relative overflow-hidden group-hover:ring-1 group-hover:ring-blue-500/20">
              <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-6 text-foreground group-hover:scale-105 transition-transform duration-300 group-hover:bg-blue-500/10 group-hover:text-blue-500">
                <BookOpen size={28} />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-blue-500 transition-colors">Article & Learn</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8 flex-1">
                Stay updated with curated scientific papers, tutorials, and latest news in the quantum domain.
              </p>

              <div className="flex items-center text-sm font-bold text-foreground group-hover:text-blue-500 group-hover:gap-2 transition-all">
                Start Learning <ArrowRight size={16} className="ml-2 group-hover:ml-0" />
              </div>
            </div>
          </Link>

        </div>

        <footer className="mt-20 text-center text-xs text-muted-foreground font-medium">
          <p className="uppercase tracking-widest">Quantum Guru</p>
        </footer>

      </div>
    </div>
  );
}
