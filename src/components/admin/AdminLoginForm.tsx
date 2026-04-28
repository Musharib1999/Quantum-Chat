"use client";

import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff, Loader2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminLoginForm() {
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
                const data = await res.json();
                const userRole = data.user?.role || 'admin';
                
                // Persist the API Key for administrative tool authorization
                if (data.user?.apiKey) {
                    localStorage.setItem('guru_api_key', data.user.apiKey);
                }
                
                if (userRole === 'builder') {
                    router.push("/builder/dashboard"); // New dedicated URL for Builders
                } else {
                    router.push("/admin/dashboard"); // Main dashboard for Admins
                }
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
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white0/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 w-full max-w-md p-8">
                <div className="bg-white backdrop-blur-xl border border-[rgb(27,176,206)]/30 shadow-2xl rounded-3xl p-8 space-y-6 animate-in zoom-in-95 fade-in duration-700">

                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white border border-[rgb(27,176,206)]/30 mb-2 shadow-inner overflow-hidden p-3">
                            <img src="/qg-icon.png" alt="Quantum Guru" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Quantum Guru</h1>
                        <p className="text-sm text-[#0F172A] uppercase tracking-widest font-medium">Administration Portal</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-[#0F172A] tracking-widest pl-1">Username</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <User size={16} className="text-[#0F172A] group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white border border-[rgb(27,176,206)]/20 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-[#0F172A] placeholder:text-[#0F172A]/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-white transition-all font-montserrat"
                                    placeholder=""
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-[#0F172A] tracking-widest pl-1">Password</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Lock size={16} className="text-[#0F172A] group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white border border-[rgb(27,176,206)]/20 rounded-xl py-3 pl-11 pr-12 text-sm font-medium text-[#0F172A] placeholder:text-[#0F172A]/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-white transition-all font-montserrat"
                                    placeholder=""
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0F172A] hover:text-[#0F172A] transition-colors"
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
                            className="w-full bg-[rgb(48,102,187)] text-white hover:bg-[#25529a] py-3.5 mt-2 rounded-xl font-semibold tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 group disabled:opacity-50 shadow-sm"
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
                </div>
            </div>
        </div>
    );
}
