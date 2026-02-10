"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ArrowRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import QuantumBackground from '../../../components/QuantumBackground';

export default function AdminLogin() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        // Mock Authentication Logic
        setTimeout(() => {
            if (email === "admin" && password === "admin123") {
                router.push("/admin/dashboard");
            } else {
                setError("Invalid credentials. Try 'admin' / 'admin123'");
                setIsLoading(false);
            }
        }, 1500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 font-sans relative overflow-hidden selection:bg-purple-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <QuantumBackground />
            </div>
            <div className="fixed inset-0 bg-zinc-950/80 z-0 pointer-events-none backdrop-blur-[2px]" />

            <div className="w-full max-w-md relative z-10 perspective-1000">
                <div className="bg-zinc-900/40 backdrop-blur-xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10 group hover:border-white/20 transition-all duration-500">

                    {/* Header */}
                    <div className="bg-gradient-to-b from-white/5 to-transparent p-8 text-center border-b border-white/5 relative">
                        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:16px_16px]" />
                        <div className="relative">
                            <div className="w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/10 shadow-2xl shadow-purple-500/10 group-hover:scale-105 transition-transform duration-500">
                                <ShieldCheck className="text-white w-10 h-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                            </div>
                            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 mb-2 tracking-tight">Quantum Guru</h1>
                            <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] font-medium">Administration Portal</p>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="p-8 space-y-6">
                        <form onSubmit={handleLogin} className="space-y-5">

                            {error && (
                                <div className="bg-red-500/10 text-red-200 text-sm p-4 rounded-xl flex items-center gap-3 border border-red-500/20 animate-in fade-in slide-in-from-top-2 backdrop-blur-sm shadow-inner">
                                    <AlertCircle size={18} className="shrink-0 text-red-400" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2 group/input">
                                <label className="text-xs font-bold text-zinc-500 ml-1 uppercase tracking-wider group-focus-within/input:text-zinc-300 transition-colors">Username</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-3.5 text-zinc-600 w-5 h-5 group-focus-within/input:text-white transition-colors" />
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-white/10 focus:border-white/20 outline-none transition-all text-zinc-200 placeholder:text-zinc-700 shadow-inner"
                                        placeholder="Enter username"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 group/input">
                                <label className="text-xs font-bold text-zinc-500 ml-1 uppercase tracking-wider group-focus-within/input:text-zinc-300 transition-colors">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 text-zinc-600 w-5 h-5 group-focus-within/input:text-white transition-colors" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-zinc-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-white/10 focus:border-white/20 outline-none transition-all text-zinc-200 placeholder:text-zinc-700 shadow-inner"
                                        placeholder="Enter password"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-white text-black hover:bg-zinc-200 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        Access System
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        <footer className="text-center pt-2">
                            <p className="text-[10px] text-zinc-700 font-mono">SECURE SYSTEM ACCESS • AUTHORIZED ONLY</p>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
}
