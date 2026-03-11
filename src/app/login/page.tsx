"use client";

import React, { useState, Suspense } from 'react';
import { Mail, Lock, Atom, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
    const { login } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect') || '/';
    const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

    const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [company, setCompany] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        if (!email || !password || (mode === 'signup' && (!firstName || !lastName))) {
            setError('Please provide all required fields');
            setLoading(false);
            return;
        }

        try {
            const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
            const bodyPayload = mode === 'login'
                ? { email, password }
                : { firstName, lastName, company, email, password, role: 'user' };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || `${mode === 'login' ? 'Login' : 'Registration'} failed`);
            }

            if (mode === 'login') {
                // Store full user profile in AuthContext
                login(data);
                showToast('Login Successful', 'success');
                router.push(redirect);
            } else {
                setSuccessMsg(data.message || 'Registration successful Your account is pending admin approval');
                setMode('login'); // Switch back to login view
                setPassword(''); // Clear password for security
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed Please check your connection');
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
                            <img src="/qg-icon.png" alt="Quantum Guru" className="w-14 h-14 object-contain" />
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'rgb(48, 102, 187)' }}>
                            {mode === 'login' ? 'Login' : 'Register'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {mode === 'login' ? 'Enter your credentials to access the workspace' : 'Request approval from administrator'}
                        </p>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex p-1 bg-secondary/50 rounded-xl">
                        <button
                            type="button"
                            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'login' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'signup' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'signup' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground tracking-widest pl-1">First Name</label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="w-full bg-secondary/50 border border-white/5 rounded-xl py-3 px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-secondary/80 transition-all"
                                            placeholder=""
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground tracking-widest pl-1">Last Name</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="w-full bg-secondary/50 border border-white/5 rounded-xl py-3 px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-secondary/80 transition-all"
                                            placeholder=""
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground tracking-widest pl-1">Company / Institution</label>
                                    <input
                                        type="text"
                                        value={company}
                                        onChange={(e) => setCompany(e.target.value)}
                                        className="w-full bg-secondary/50 border border-white/5 rounded-xl py-3 px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-secondary/80 transition-all"
                                        placeholder=""
                                    />
                                </div>
                            </>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground tracking-widest pl-1">Email</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Mail size={16} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-secondary/50 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-secondary/80 transition-all"
                                    placeholder=""
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
                                    className="w-full bg-secondary/50 border border-white/5 rounded-xl py-3 pl-11 pr-12 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-secondary/80 transition-all"
                                    placeholder=""
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

                        {successMsg && (
                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs font-bold text-center animate-in slide-in-from-top-2">
                                {successMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 mt-2 rounded-xl font-bold tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group border border-primary/50"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <ShieldCheck size={18} className="animate-pulse" /> Processing...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    {mode === 'login' ? 'Login' : 'Register'} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
