"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
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
    const [isStudent, setIsStudent] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Strictly enforce clean White Theme on Login Page (never dark theme)
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.style.backgroundColor = '#ffffff';
            document.body.style.backgroundColor = '#ffffff';
        }
    }, []);

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
                : { firstName, lastName, company, email, password, role: isStudent ? 'student' : 'user' };

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
                login(data);
                showToast('Login Successful', 'success');

                const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
                const activeRedirect = params?.get('redirect') || redirect;

                let targetRedirect = activeRedirect;
                if (activeRedirect === '/' || activeRedirect === '/industry') {
                    if (data.user?.role === 'admin') targetRedirect = '/admin';
                    else if (data.user?.role === 'enterprise') targetRedirect = '/enterprise/dashboard';
                    else targetRedirect = '/ide';
                }

                router.push(targetRedirect);
            } else {
                setSuccessMsg(data.message || 'Registration successful. Your account is pending admin approval');
                setMode('login');
                setPassword('');
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Please check your connection');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="min-h-screen w-full flex items-center justify-center text-slate-900 relative overflow-hidden font-sans"
            style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}
        >
            {/* Top-Left Corner Logo */}
            <div className="absolute top-6 left-6 md:top-8 md:left-10 z-20">
                <a href="https://www.quantumcomputers.guru/" className="flex items-center">
                    <img
                        src="/logo.png"
                        alt="Quantum Guru"
                        style={{ height: '56px', width: 'auto' }}
                        className="w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity drop-shadow-xs"
                    />
                </a>
            </div>

            {/* Main Auth Card (Pure White with Subtle Border & Depth) */}
            <div className="relative z-10 w-full max-w-md p-6 sm:p-8">
                <div 
                    className="bg-white rounded-3xl p-7 sm:p-9 space-y-6"
                    style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 20px 45px -12px rgba(0, 0, 0, 0.08), 0 1px 3px 0 rgba(0, 0, 0, 0.04)'
                    }}
                >
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50/80 border border-blue-100 mb-2 shadow-2xs overflow-hidden">
                            <img src="/qg-icon.png" alt="Quantum Guru" className="w-10 h-10 object-contain" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500">
                            {mode === 'login' ? 'Enter your credentials to access the workspace' : 'Request access to the Quantum Workspace'}
                        </p>
                    </div>

                    {/* Mode Toggle (Login / Register) */}
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                        <button
                            type="button"
                            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${mode === 'login' ? 'bg-[#3066bb] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
                            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${mode === 'signup' ? 'bg-[#3066bb] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'signup' && (
                            <>
                                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/60 mb-3">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">I am registering as a:</label>
                                    <div className="flex gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => setIsStudent(false)}
                                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${!isStudent ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'}`}
                                        >
                                            Professional
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setIsStudent(true)}
                                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${isStudent ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'}`}
                                        >
                                            Student
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3066bb]/30 focus:border-[#3066bb] focus:bg-white transition-all"
                                            placeholder="Jane"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3066bb]/30 focus:border-[#3066bb] focus:bg-white transition-all"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        {isStudent ? 'University / Institute' : 'Company / Organization'}
                                    </label>
                                    <input
                                        type="text"
                                        value={company}
                                        onChange={(e) => setCompany(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3066bb]/30 focus:border-[#3066bb] focus:bg-white transition-all"
                                        placeholder="Institution name"
                                    />
                                </div>
                            </>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                            <div className="relative group">
                                <div 
                                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                                    className="pointer-events-none text-slate-400 group-focus-within:text-[#3066bb] transition-colors"
                                >
                                    <Mail size={16} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{ paddingLeft: '42px', paddingRight: '14px' }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3066bb]/30 focus:border-[#3066bb] focus:bg-white transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                            <div className="relative group">
                                <div 
                                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                                    className="pointer-events-none text-slate-400 group-focus-within:text-[#3066bb] transition-colors"
                                >
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ paddingLeft: '42px', paddingRight: '42px' }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3066bb]/30 focus:border-[#3066bb] focus:bg-white transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                                    className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium text-center animate-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-medium text-center animate-in slide-in-from-top-2">
                                {successMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#3066bb] hover:bg-[#255299] text-white py-3 mt-2 rounded-xl font-semibold tracking-wide transition-all active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-70"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <ShieldCheck size={18} className="animate-pulse" /> Processing...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    {mode === 'login' ? 'Login' : 'Register'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
