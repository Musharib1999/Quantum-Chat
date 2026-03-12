"use client";

import React, { useState, Suspense } from 'react';
import { Mail, Lock, Atom, ArrowRight, ShieldCheck, Eye, EyeOff, Loader2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import QuantumBackground from '@/components/QuantumBackground';

function AdminLoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/admin/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password }),
            });

            if (res.ok) {
                router.push("/admin/dashboard");
            } else {
                const data = await res.json();
                setError(data.error || "Invalid credentials");
            }
        } catch (err) {
            setError("A network error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden selection:bg-purple-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <QuantumBackground />
            </div>
            <div className="fixed inset-0 bg-zinc-950/80 z-0 pointer-events-none backdrop-blur-[2px]" />
            
            {/* Logo */}
            <div className="absolute top-6 left-6 z-20">
                <a href="https://www.quantumcomputers.guru/">
                    <img src="/logo.png" alt="Quantum Guru" className="h-[40px] md:h-[62px] w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity invert brightness-0" />
                </a>
            </div>

            <div className="relative z-10 w-full max-w-md p-6 md:p-8">
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-3xl p-6 md:p-8 space-y-6 animate-in zoom-in-95 fade-in duration-700 group hover:border-white/20 transition-all duration-500">

                    {/* Header */}
                    <div className="text-center space-y-2 relative">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-white/10 mb-2 backdrop-blur-md shadow-2xl shadow-purple-500/10 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                             <ShieldCheck className="text-white w-10 h-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                        </div>
                        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 tracking-tight">Quantum Guru</h1>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-medium">Administration Portal</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground tracking-widest pl-1">Username</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <User size={16} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-zinc-950/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all shadow-inner"
                                    placeholder=""
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground tracking-widest pl-1">Password</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Lock size={16} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-zinc-950/50 border border-white/10 rounded-xl py-3 pl-11 pr-12 text-sm font-medium text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all shadow-inner"
                                    placeholder=""
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold text-center animate-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black hover:bg-zinc-200 py-3.5 mt-2 rounded-xl font-bold tracking-wide transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 group border border-white/20 disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 size={18} className="animate-spin" /> Authenticating...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Access System <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </button>
                    </form>
                    {/* Footer */}
                    <footer className="text-center pt-2">
                        <p className="text-[10px] text-zinc-700 font-mono tracking-wider">SECURE SYSTEM ACCESS • AUTHORIZED ONLY</p>
                    </footer>
                </div>
            </div>
        </div>
    );
}

export default function AdminLoginPage() {
    return (
        <Suspense>
            <AdminLoginForm />
        </Suspense>
    );
}
