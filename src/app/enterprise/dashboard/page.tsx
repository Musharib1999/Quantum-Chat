"use client";

import React, { useEffect, useState } from 'react';
import EnterpriseClientDashboard from '@/components/enterprise/EnterpriseClientDashboard';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
        <div className="flex bg-white h-screen w-full font-sans text-slate-900 overflow-hidden relative">
            {/* Fixed Logo (Matches AppLayout.tsx exactly) */}
            <div className="fixed z-[60] top-2 left-4 md:top-2 md:left-8 pointer-events-auto transition-all duration-300">
                <Link href="/">
                    <img src="/logo.png" alt="Quantum Guru" className="h-[40px] md:h-[62px] w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity drop-shadow-sm" />
                </Link>
            </div>

            {/* Left Sidebar */}
            <aside className="fixed inset-y-0 left-0 w-64 md:w-80 bg-slate-50 border-r border-slate-200 flex flex-col pt-20 z-40">
                <div className="p-6 border-b border-slate-200">
                     <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          <span className="text-[#3066bb]">Enterprise Portal</span>
                     </div>
                     <div className="font-bold text-slate-900 truncate">
                          {(user as any)?.company || (user as any)?.firstName || 'Dashboard'}
                     </div>
                </div>
                
                <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
                    <button className="w-full text-left px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-sm text-[#3066bb] font-bold text-sm tracking-wide transition-all">
                        Control Center
                    </button>
                    <button 
                        onClick={() => router.push('/industry')} 
                        className="w-full text-left px-4 py-3 rounded-xl border border-transparent hover:bg-slate-100/80 text-slate-600 hover:text-slate-900 font-bold text-sm tracking-wide transition-all"
                    >
                        Workspace
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-200">
                    <button 
                        onClick={() => { logout(); router.push('/login'); }} 
                        className="w-full text-left px-4 py-3 rounded-xl border border-transparent hover:bg-red-50 text-red-500 hover:text-red-600 font-bold text-sm tracking-wide transition-all"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-0 md:ml-80 h-full overflow-y-auto bg-white pt-20 md:pt-0 relative z-10 transition-all duration-500 ease-in-out">
                <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-full">
                    {/* Add top spacing for mobile to clear logo */}
                    <div className="h-16 md:h-0"></div>
                    <EnterpriseClientDashboard />
                </div>
            </main>
        </div>
    );
}
