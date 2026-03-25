"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft, Zap, Menu, X, ArrowRight } from 'lucide-react';

export default function ApiDocsPage() {
    const { isAuthenticated, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans pb-0">
            {/* Header / Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-all duration-300 border-slate-200 bg-white/70">
                <div className="w-full px-6 md:px-8 h-20 flex items-center justify-end font-sans">
                    
                    {/* Logo Section */}
                    <div className="absolute top-4 left-6 flex items-center group cursor-pointer hover:opacity-90 transition-opacity">
                        <Link href="/">
                            <img src="/logo.png" alt="Quantum Guru" className="h-[40px] md:h-[62px] w-auto object-contain cursor-pointer drop-shadow-sm" />
                        </Link>
                    </div>

                    <div className="flex items-center gap-8">
                        <Link 
                            href="/api-docs" 
                            className="hidden md:block text-sm font-semibold text-[#3066bb] transition-colors"
                        >
                            API Documentation
                        </Link>

                        {/* Actions */}
                        <div className="hidden md:flex items-center gap-4">
                            {isAuthenticated ? (
                                <button
                                    onClick={() => logout()}
                                    className="px-6 py-1.5 bg-white text-[#3066bb] border-2 border-[#3066bb] hover:bg-[#3066bb] hover:text-white font-semibold rounded transition-all shadow-sm text-sm"
                                >
                                    Logout
                                </button>
                            ) : (
                                <Link
                                    href="/login"
                                    className="px-6 py-1.5 bg-white text-[#3066bb] border-2 border-[#3066bb] hover:bg-[#3066bb] hover:text-white font-semibold rounded transition-all shadow-sm text-sm"
                                >
                                    Login
                                </Link>
                            )}
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            className="md:hidden p-2 text-slate-600"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 pt-32 pb-20">
                {/* Hero */}
                <header className="mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">
                        Quantum Guru <span className="text-[#3066bb]">Developer API</span>
                    </h1>
                    <p className="text-lg text-slate-500 leading-relaxed max-w-3xl">
                        Integrate quantum and classical simulation power directly into your own applications with our robust, high-performance developer gateway.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* Sidebar Nav */}
                    <aside className="lg:col-span-1 border-r border-slate-100 pr-8 hidden lg:block text-slate-400">
                        <div className="sticky top-32 space-y-8">
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Getting Started</h3>
                                <div className="space-y-2">
                                    <a href="#auth" className="block py-1 text-sm text-[rgb(48,102,187)] font-semibold border-l-2 border-[#3066bb] pl-4 -ml-[1px]">Authentication</a>
                                    <a href="#endpoints" className="block py-1 text-sm pl-4 hover:text-slate-900 transition-colors">Endpoints</a>
                                    <a href="#notes" className="block py-1 text-sm pl-4 hover:text-slate-900 transition-colors">Safety & Limits</a>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Reference</h3>
                                <div className="space-y-2 pl-4">
                                    <code className="block py-1 text-[#3066bb] text-[10px] font-bold">POST /simulation/execute</code>
                                    <code className="block py-1 text-[#3066bb] text-[10px] font-bold">GET /user/usage</code>
                                    <code className="block py-1 text-[#3066bb] text-[10px] font-bold">GET /simulation/history</code>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Content Area */}
                    <main className="lg:col-span-3 space-y-24">
                        
                        {/* Authentication */}
                        <section id="auth" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold mb-6">Authentication</h2>
                            <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-6">
                                <p className="text-slate-600 leading-relaxed text-[15px]">
                                    All API requests require an **API Key**, which must be passed in the <code className="bg-slate-50 px-2 py-0.5 rounded text-[#3066bb] font-mono text-xs border border-slate-100">Authorization</code> header as a Bearer token.
                                </p>
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-700 font-mono text-sm overflow-x-auto shadow-sm">
                                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Header Format</span>
                                        <span className="text-[10px] text-slate-400 leading-none">HTTP/1.1</span>
                                    </div>
                                    <div className="py-2">
                                        <span className="text-[#3066bb] font-bold">{"Authorization:"}</span> <span className="text-slate-400">Bearer</span> <span className="text-emerald-600 font-bold">pb_your_api_key_here</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <p className="text-[12px] text-slate-500 leading-relaxed">
                                        Tip: You can find or generate your API keys in your <Link href="/login" className="text-[#3066bb] font-bold underline underline-offset-4">User Profile</Link> once your account has been approved by the platform administrator.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Endpoints */}
                        <section id="endpoints" className="scroll-mt-32 space-y-20">
                            <h2 className="text-2xl font-bold">API Reference</h2>

                            {/* Execute */}
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <span className="px-3 py-1 bg-[#3066bb]/5 text-[#3066bb] text-[10px] font-bold uppercase rounded-lg border border-[#3066bb]/10 shadow-sm">POST</span>
                                    <h3 className="text-lg font-bold text-slate-800">/api/v1/simulation/execute</h3>
                                </div>
                                <p className="text-slate-600 leading-relaxed text-[15px]">
                                    Submit optimization code to a specific solver backend. Use this for programmatic execution of D-Wave QUBOs, Qiskit circuits, or OR-Tools solvers.
                                </p>
                                <div className="grid grid-cols-1 gap-8">
                                    <div className="bg-white border border-slate-200 rounded-3xl p-8 text-slate-700 font-mono text-xs overflow-x-auto shadow-md relative">
                                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                            <span className="text-slate-400 uppercase tracking-widest text-[10px] font-bold">Example Request Body</span>
                                            <span className="text-slate-400 text-[10px]">JSON / application/json</span>
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
                                    <div className="space-y-4 px-2">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Parameters</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="p-5 bg-white border border-slate-100 rounded-3xl group hover:border-[#3066bb]/20 transition-colors">
                                                <code className="text-[#3066bb] font-bold block mb-2 text-sm">provider</code>
                                                <p className="text-[12px] text-slate-500 leading-relaxed italic">Ecosystem identifier (e.g., dwave).</p>
                                            </div>
                                            <div className="p-5 bg-white border border-slate-100 rounded-3xl group hover:border-[#3066bb]/20 transition-colors">
                                                <code className="text-[#3066bb] font-bold block mb-2 text-sm">hardware</code>
                                                <p className="text-[12px] text-slate-500 leading-relaxed italic">Backend target (QPU/Hybrid/SIM).</p>
                                            </div>
                                            <div className="p-5 bg-white border border-slate-100 rounded-3xl group hover:border-[#3066bb]/20 transition-colors">
                                                <code className="text-[#3066bb] font-bold block mb-2 text-sm">code</code>
                                                <p className="text-[12px] text-slate-500 leading-relaxed italic">The core logic string to solve.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-50" />

                            {/* Usage */}
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase rounded-lg border border-slate-100 shadow-sm">GET</span>
                                    <h3 className="text-lg font-bold text-slate-800">/api/v1/user/usage</h3>
                                </div>
                                <p className="text-slate-600 leading-relaxed text-[15px]">
                                    Retrieve your current quota limits and real-time consumption stats across simulation minutes and tokens.
                                </p>
                                <div className="bg-white border border-slate-200 rounded-3xl p-8 text-slate-700 font-mono text-xs overflow-x-auto w-full shadow-md">
                                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                                        <span className="text-slate-400 uppercase tracking-widest text-[10px] font-bold">Standard Response</span>
                                        <span className="text-emerald-500 text-[10px] font-bold">200 OK</span>
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

                        {/* Safety Section */}
                        <section id="notes" className="scroll-mt-32 pb-12">
                            <h2 className="text-2xl font-bold mb-8">Platform Safety & Policy</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-8 bg-slate-50/80 rounded-3xl border border-slate-100 transition-all hover:shadow-lg">
                                    <h4 className="font-bold text-slate-900 mb-2">Maximum Timeouts</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">All execution requests are strictly capped at **300 seconds (5 minutes)** to ensure platform availability across all nodes.</p>
                                </div>
                                <div className="p-8 bg-slate-50/80 rounded-3xl border border-slate-100 transition-all hover:shadow-lg">
                                    <h4 className="font-bold text-slate-900 mb-2">Isolated Sandbox</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">Environments are non-persistent. No outbound networking is permitted during code execution for security.</p>
                                </div>
                            </div>
                        </section>

                    </main>
                </div>
            </div>

            {/* Footer */}
            <footer className="py-12 border-t border-slate-100 text-slate-400">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col items-start gap-2">
                        <p className="text-xs opacity-50">© 2026 Quantum Guru Inc. All rights reserved.</p>
                    </div>
                </div>
            </footer>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[60] md:hidden flex flex-col items-center justify-center space-y-8 bg-white text-slate-900 animate-in fade-in zoom-in duration-300">
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors"
                    >
                        <X size={32} />
                    </button>
                    
                    <Link 
                        href="/api-docs" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-2xl font-bold text-slate-900 flex items-center gap-3"
                    >
                        <Zap className="text-[#3066bb]" size={28} />
                        API Documentation
                    </Link>

                    <div className="w-12 h-0.5 bg-slate-100 rounded-full" />

                    {isAuthenticated ? (
                        <button
                            onClick={() => {
                                logout();
                                setIsMobileMenuOpen(false);
                            }}
                            className="text-2xl font-bold text-red-500"
                        >
                            Logout
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-2xl font-bold text-[#3066bb]"
                        >
                            Login
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
