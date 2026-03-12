"use client";

import React, { useState, Suspense } from 'react';
import { Mail, Lock, Atom, ArrowRight, ShieldCheck, Eye, EyeOff, Loader2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
        <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
            {/* Logo */}
            <div className="absolute top-6 left-6 z-20">
                <a href="https://www.quantumcomputers.guru/">
                    <img src="/logo.png" alt="Quantum Guru" className="h-[40px] md:h-[62px] w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity" />
                </a>
            </div>

            {/* Background glow effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 w-full max-w-md p-8">
                <div className="bg-card/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 space-y-6 animate-in zoom-in-95 fade-in duration-700">

                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-secondary/30 border border-white/10 mb-2 shadow-inner overflow-hidden">
                            <ShieldCheck className="w-12 h-12 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Quantum Guru</h1>
                        <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium">Administration Portal</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground tracking-widest pl-1">Username</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <User size={16} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-secondary/50 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-secondary/80 transition-all font-montserrat"
                                    placeholder=""
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground tracking-widest pl-1">Password</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Lock size={16} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-secondary/50 border border-white/5 rounded-xl py-3 pl-11 pr-12 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-secondary/80 transition-all font-montserrat"
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
                            className="w-full bg-[#3066bb] text-white hover:bg-[#25529a] py-3.5 mt-2 rounded-xl font-semibold tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 group disabled:opacity-50"
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
                    <footer className="text-center pt-2 border-t border-white/5">
                        <p className="text-[10px] text-muted-foreground font-mono tracking-wider">SECURE SYSTEM ACCESS • AUTHORIZED ONLY</p>
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
