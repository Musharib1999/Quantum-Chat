"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Key, Terminal, Info, Zap, BookOpen, Clock, ShieldCheck } from 'lucide-react';

export default function ApiDocsPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
            {/* Header / Nav */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center px-6">
                <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-[#3066bb] transition-colors font-medium">
                    <ChevronLeft size={18} />
                    <span>Back to Landing</span>
                </Link>
                <div className="ml-8 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#3066bb] flex items-center justify-center text-white">
                        <Zap size={16} />
                    </div>
                    <span className="font-bold text-slate-900">Developer API Documentation</span>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto px-6 pt-12">
                {/* Hero */}
                <header className="mb-16">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Prime Blazar Developer API</h1>
                    <p className="text-xl text-slate-500 leading-relaxed max-w-3xl">
                        Integrate quantum and classical simulation power directly into your own applications with our robust, high-performance developer gateway.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* Sidebar Nav */}
                    <aside className="lg:col-span-1 border-r border-slate-200 pr-8 hidden lg:block text-slate-400">
                        <div className="sticky top-28 space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-widest">Getting Started</h3>
                                <div className="space-y-1">
                                    <a href="#auth" className="block py-1 text-sm text-[rgb(48,102,187)] font-semibold underline underline-offset-4">Authentication</a>
                                    <a href="#endpoints" className="block py-1 text-sm hover:text-slate-900 transition-colors">Endpoints</a>
                                    <a href="#notes" className="block py-1 text-sm hover:text-slate-900 transition-colors">Important Notes</a>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-widest">Endpoints</h3>
                                <div className="space-y-2 pt-2">
                                    <code className="block py-1 text-[#3066bb] text-[10px]">POST /simulation/execute</code>
                                    <code className="block py-1 text-[#3066bb] text-[10px]">GET /user/usage</code>
                                    <code className="block py-1 text-[#3066bb] text-[10px]">GET /simulation/history</code>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Content Area */}
                    <main className="lg:col-span-3 space-y-20">
                        
                        {/* Authentication */}
                        <section id="auth" className="scroll-mt-28">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                                    <Key size={24} />
                                </div>
                                <h2 className="text-2xl font-bold">Authentication</h2>
                            </div>
                            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                                <p className="text-slate-600 leading-relaxed">
                                    All API requests require an **API Key**, which must be passed in the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-orange-600 font-mono text-xs">Authorization</code> header as a Bearer token.
                                </p>
                                <div className="bg-slate-900 rounded-xl p-5 text-indigo-300 font-mono text-sm overflow-x-auto">
                                    <span className="text-slate-500">{"// Header Example"}</span><br/>
                                    Authorization: <span className="text-slate-100">Bearer</span> <span className="text-emerald-400">pb_your_api_key_here</span>
                                </div>
                                <div className="flex items-start gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                    <Info className="text-[#3066bb] shrink-0 mt-0.5" size={16} />
                                    <p className="text-xs text-slate-600">
                                        You can find or generate your API keys in your <Link href="/login" className="text-[#3066bb] font-bold underline underline-offset-4">User Profile</Link> once your account has been approved by the platform administrator.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Endpoints */}
                        <section id="endpoints" className="scroll-mt-28 space-y-16">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-blue-50 text-[#3066bb]">
                                    <Terminal size={24} />
                                </div>
                                <h2 className="text-2xl font-bold">Endpoints</h2>
                            </div>

                            {/* Execute */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-lg border border-emerald-100 shadow-sm">POST</span>
                                    <h3 className="text-lg font-bold text-slate-800">/api/v1/simulation/execute</h3>
                                </div>
                                <p className="text-slate-600 leading-relaxed text-[15px]">
                                    Submit optimization code to a specific solver backend. Use this for programmatic execution of D-Wave QUBOs, Qiskit circuits, or OR-Tools solvers.
                                </p>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="bg-slate-900 rounded-2xl p-6 text-indigo-300 font-mono text-xs overflow-x-auto shadow-sm border border-slate-800">
                                        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                                            <span className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">JSON Payload Example</span>
                                            <span className="text-slate-600 text-[10px]">application/json</span>
                                        </div>
                                        {`{
  "provider": "dwave",    // Options: dwave, qiskit, or ortools
  "hardware": "hybrid",   // Options: simulator, qpu, or hybrid
  "code": "import dimod; # ... your logic",
  "metadata": {
    "project": "Logistics-A"
  }
}`}
                                    </div>
                                    <div className="space-y-3 p-1">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Parameter Breakdown</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                                <code className="text-[#3066bb] font-bold block mb-1">provider</code>
                                                <p className="text-[11px] text-slate-500">The backend ecosystem to handle the request.</p>
                                            </div>
                                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                                <code className="text-[#3066bb] font-bold block mb-1">hardware</code>
                                                <p className="text-[11px] text-slate-500">Target execution environment (SIM vs QPU).</p>
                                            </div>
                                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                                <code className="text-[#3066bb] font-bold block mb-1">code</code>
                                                <p className="text-[11px] text-slate-500">Standalone Python code string.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Usage */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded-lg border border-blue-100 shadow-sm">GET</span>
                                    <h3 className="text-lg font-bold text-slate-800">/api/v1/user/usage</h3>
                                </div>
                                <p className="text-slate-600 leading-relaxed text-[15px]">
                                    Retrieve your current quota limits and real-time consumption stats across simulation minutes and tokens.
                                </p>
                                <div className="bg-slate-900 rounded-2xl p-6 text-indigo-300 font-mono text-xs overflow-x-auto w-full shadow-sm border border-slate-800">
                                    <div className="flex items-center mb-4 border-b border-slate-800 pb-2">
                                        <span className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">Sample Response</span>
                                    </div>
                                    {`{
  "plan": "Enterprise",
  "simMinutesLimit": 100,
  "simMinutesUsed": 12.5,
  "tokensUsed": 5000,
  "apiEnabled": true
}`}
                                </div>
                            </div>
                        </section>

                        {/* Important Notes */}
                        <section id="notes" className="scroll-mt-28 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="text-[#3066bb]" size={28} />
                                <h2 className="text-2xl font-bold">Execution Safety</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 transition-transform hover:scale-110">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 mb-1">Strict Timeouts</h4>
                                        <p className="text-xs text-slate-500 leading-relaxed">Maximum execution time for any solver request is **300 seconds** (5 minutes).</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 transition-transform hover:scale-110">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 mb-1">Secured Sandbox</h4>
                                        <p className="text-xs text-slate-500 leading-relaxed">Code execution is strictly isolated. No outbound networking is permitted during simulation.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                    </main>
                </div>
            </div>
        </div>
    );
}
