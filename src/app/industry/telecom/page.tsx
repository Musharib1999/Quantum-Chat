"use strict";

import React from 'react';
import { ArrowLeft, Zap, Database, Code, BarChart3, Binary, Network, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function TelecomUseCase() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-[#3066bb]/10">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200 pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#3066bb] transition-colors mb-8 group">
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            Back to Platform
          </Link>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3066bb]/8 border border-[#3066bb]/15 text-[#3066bb] text-xs font-bold uppercase tracking-wider mb-6">
              Industry Use Case: Telecommunications
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
              Quantum-Optimized <span className="text-[#3066bb]">Telecaller Routing</span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Discover how Prime Blazar leverages D-Wave quantum annealing to solve the massive combinatorial challenge of matching customers to the right telecallers in real-time.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-16">
          
          {/* 1. Problem in Detail */}
          <section id="problem">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <ShieldCheck size={20} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Problem in Detail</h2>
            </div>
            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
              <p>
                In high-volume BPO and telecalling environments, every second of call-time and every mismatch between a customer and a telecaller directly impacts the bottom line. Traditional systems rely on <strong>Round Robin</strong> or <strong>First-Available</strong> logic.
              </p>
              <p>
                The complexity arises when we consider multiple attributes per telecaller: language proficiency (L1, L2), domain expertise (Technical, Billing, Sales), conversion history, and current fatigue levels.
              </p>
              <div className="bg-slate-900 rounded-2xl p-8 my-8 text-slate-300 border border-slate-800 shadow-xl">
                <div className="text-xs font-bold text-[#3066bb] uppercase tracking-widest mb-4">The Mathematical Explosion</div>
                <div className="text-2xl font-mono text-white mb-4">Complexity: 2ⁿ</div>
                <p className="text-sm italic">
                  With just 100 telecallers and multiple weighted attributes, the number of possible assignment combinations exceeds the number of atoms in the observable universe. This "combinatorial explosion" makes classical brute-force evaluation impossible in the 3-second window required for live call routing.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Methodology */}
          <section id="method">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#3066bb]/10 flex items-center justify-center text-[#3066bb]">
                <Binary size={20} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">The Methodology</h2>
            </div>
            <div className="space-y-8">
              <div className="flex gap-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-900 shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">QUBO Formulation</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    We map the routing problem into a Quadratic Unconstrained Binary Optimization (QUBO) matrix. The "Objective Function" rewards high-quality matches (e.g., matching a VIP customer with a high-conversion telecaller) while penalizing invalid states (e.g., assigning two calls to one telecaller).
                  </p>
                </div>
              </div>
              <div className="flex gap-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-900 shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Quantum Annealing (D-Wave)</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    The QUBO matrix is submitted to the D-Wave Leap Quantum Cloud. The annealer explores the 2ⁿ energy landscape, utilizing quantum tunneling to "teleport" through high-energy barriers that would trap classical algorithms in sub-optimal local minima.
                  </p>
                </div>
              </div>
              <div className="flex gap-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-900 shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Result Decoding</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    The low-energy state returned by the quantum processor is decoded into a specific Telecaller ID. This decision is then pushed to the dialer via a low-latency webhook.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3 & 4. API & Technical Specs */}
          <section id="api">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                <Code size={20} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">API Specification</h2>
            </div>
            
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">POST /api/v1/routing/optimize</span>
                <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">STABLE</span>
              </div>
              <div className="p-8 space-y-8">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Database size={16} className="text-[#3066bb]" />
                    Data Required
                  </h4>
                  <p className="text-sm text-slate-600 mb-4">
                    The system requires the current state of the telecaller pool and the incoming call metadata.
                  </p>
                  <div className="bg-slate-900 rounded-xl p-6 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed border border-slate-800">
                    <pre>{`{
  "call_id": "CALL_98231",
  "customer": {
    "language": "Hindi",
    "domain": "Home Loans",
    "priority": "VIP"
  },
  "pool_context": {
    "telecallers": [
      { "id": "T1", "skills": ["Hindi", "English"], "expertise": "Credit Cards" },
      { "id": "T2", "skills": ["Hindi"], "expertise": "Home Loans" }
    ],
    "timestamp": "2026-05-07T22:35:18Z"
  }
}`}</pre>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Network size={16} className="text-[#3066bb]" />
                    Method & Callback
                  </h4>
                  <ul className="text-sm text-slate-600 space-y-3 list-disc pl-5">
                    <li><strong>Method:</strong> POST (application/json)</li>
                    <li><strong>Authentication:</strong> Bearer Token (X-PB-API-KEY)</li>
                    <li><strong>Response Format:</strong> Synchronous JSON or Webhook Callback</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Results */}
          <section id="results">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <BarChart3 size={20} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Our Results</h2>
            </div>
            <div className="bg-[#3066bb] rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden">
              <Zap className="absolute top-10 right-10 w-32 h-32 text-white/10 -rotate-12" />
              <div className="relative z-10">
                <p className="text-lg leading-relaxed mb-8 opacity-90">
                  By moving from static rule-based routing to Quantum QUBO optimization, our enterprise telecalling partners observed a drastic reduction in dead-air and mismatch rates.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm">
                    <div className="text-3xl font-black mb-1">~3s</div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-60">Avg. Quantum Decision Latency</div>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm">
                    <div className="text-3xl font-black mb-1">60%+</div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-60">Language Matching Efficiency</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Sidebar / KPIs */}
        <div className="space-y-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sticky top-32">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">Performance KPIs</h3>
            
            <div className="space-y-10">
              <div>
                <div className="text-3xl font-black text-slate-900 mb-1">60%+</div>
                <div className="text-sm font-semibold text-slate-500 mb-2">Match Rate</div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#3066bb] h-full w-[60%]"></div>
                </div>
                <p className="text-xs text-slate-400 mt-2 italic">Optimal language & domain pairing</p>
              </div>

              <div>
                <div className="text-3xl font-black text-slate-900 mb-1">2ⁿ</div>
                <div className="text-sm font-semibold text-slate-500 mb-2">Search Space</div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-violet-500 h-full w-full"></div>
                </div>
                <p className="text-xs text-slate-400 mt-2 italic">Exhaustive exploration per decision</p>
              </div>

              <div>
                <div className="text-3xl font-black text-slate-900 mb-1">900+</div>
                <div className="text-sm font-semibold text-slate-500 mb-2">QUBO Variables</div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[85%]"></div>
                </div>
                <p className="text-xs text-slate-400 mt-2 italic">Attributes processed simultaneously</p>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-100">
              <button className="w-full py-4 px-6 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                Download Technical Spec
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer CTA */}
      <section className="bg-white border-t border-slate-200 py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-6">Ready to Optimize your Workforce?</h2>
          <p className="text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect your telephony stream to Prime Blazar and experience the difference of Quantum-first workforce optimization.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/login?redirect=/industry/telecom" className="px-10 py-4 rounded-2xl bg-[#3066bb] text-white font-bold transition-all shadow-xl hover:shadow-[#3066bb]/20 hover:-translate-y-1">
              Start Your Deployment
            </Link>
            <Link href="/contact" className="px-10 py-4 rounded-2xl border border-slate-200 text-slate-900 font-bold hover:bg-slate-50 transition-all">
              Consult with Architect
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
