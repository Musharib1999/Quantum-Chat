import React, { useState } from 'react';
import { Mail, Lock, Atom, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface LoginUserData {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    plan?: 'Guest' | 'Pro' | 'Enterprise';
    role?: string;
}

interface IndustryLoginProps {
    onLogin: (userData: LoginUserData) => void;
}

export default function IndustryLogin({ onLogin }: IndustryLoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!email || !password) {
            setError('Please provide credentials to access the Quantum Interface.');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Login successful — pass full user object
            onLogin(data as LoginUserData);
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
            {/* Logo */}
            <div className="absolute top-4 left-4 md:top-6 md:left-8 z-20">
                <a href="https://www.quantumcomputers.guru/">
                    <img src="/logo.png" alt="Quantum Guru" className="h-10 md:h-[60px] w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity drop-shadow-sm" />
                </a>
            </div>

            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 w-full max-w-md p-8">
                <div className="bg-card/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 space-y-8 animate-in zoom-in-95 fade-in duration-700">

                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/50 border border-white/10 mb-4 shadow-inner">
                            <Atom size={32} className="text-primary animate-spin-slow" />
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'rgb(48, 102, 187)' }}>
                            Login
                        </h1>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground tracking-widest pl-1">Email</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Mail size={16} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-secondary/50 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-secondary/80 transition-all"
                                    placeholder="researcher@quantum.lab"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground tracking-widest pl-1">Password</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Lock size={16} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-secondary/50 border border-white/5 rounded-xl py-3.5 pl-11 pr-12 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-secondary/80 transition-all"
                                    placeholder="••••••••"
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
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-xl font-bold tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group border border-primary/50"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <ShieldCheck size={18} className="animate-pulse" /> Verifying...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Enter Workspace <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
