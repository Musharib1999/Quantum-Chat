"use client";

import React, { useEffect, useState } from 'react';
import EnterpriseClientDashboard from '@/components/enterprise/EnterpriseClientDashboard';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Layout } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function EnterpriseDashboardPage() {
    const { user, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Protect the route
    useEffect(() => {
        if (isClient && !isAuthenticated) {
            router.push('/login?redirect=/enterprise/dashboard');
        } else if (isClient && isAuthenticated && user?.role !== 'enterprise' && user?.role !== 'admin') {
            router.push('/industry'); // Redirect regular users
        }
    }, [isClient, isAuthenticated, user, router]);

    if (!isClient || !isAuthenticated) return null; // Avoid hydration mismatch or flash of content

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-6 md:px-12 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
                        <img src="/logo.png" alt="Quantum Guru" className="h-[46px] w-auto object-contain" />
                    </Link>
                    <div className="hidden md:flex items-center gap-2 pl-6 border-l border-slate-200 text-sm font-semibold text-slate-500">
                        <span className="text-[#3066bb]">Enterprise Portal</span>
                        <span>/</span>
                        <span>{(user as any)?.company || (user as any)?.firstName || 'Dashboard'}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push('/industry')}
                        className="hidden md:flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#3066bb] transition-colors"
                    >
                        <Layout size={16} /> Workspace
                    </button>
                    <div className="w-px h-6 bg-slate-200 hidden md:block"></div>
                    <button 
                        onClick={() => {
                            logout();
                            router.push('/login');
                        }}
                        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-500 transition-colors"
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </header>

            <main className="flex-1 py-12 px-4">
                <EnterpriseClientDashboard />
            </main>
        </div>
    );
}
