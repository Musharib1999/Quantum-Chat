"use client";

import React, { useEffect, useState } from 'react';
import EnterpriseClientDashboard from '@/components/enterprise/EnterpriseClientDashboard';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import UserProfileModal from '@/components/UserProfileModal';

export default function EnterpriseDashboardPage() {
    const { user, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'datapoints' | 'telemetry' | 'pipelines'>('datapoints');

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
                     <div className="text-xs font-bold text-slate-500 mb-1">
                          <span className="text-[#3066bb]">Enterprise Portal</span>
                     </div>
                     <div className="font-bold text-slate-900 truncate">
                          {(user as any)?.company || (user as any)?.firstName || 'Dashboard'}
                     </div>
                </div>
                
                <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
                    <button 
                        onClick={() => setActiveTab('datapoints')}
                        className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm tracking-wide transition-all ${activeTab === 'datapoints' ? 'bg-white border border-slate-200 shadow-sm text-[#3066bb]' : 'border border-transparent hover:bg-slate-100/80 text-slate-600 hover:text-slate-900'}`}
                    >
                        Datapoints
                    </button>
                    <button 
                        onClick={() => setActiveTab('telemetry')}
                        className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm tracking-wide transition-all ${activeTab === 'telemetry' ? 'bg-white border border-slate-200 shadow-sm text-[#3066bb]' : 'border border-transparent hover:bg-slate-100/80 text-slate-600 hover:text-slate-900'}`}
                    >
                        Live Telemetry
                    </button>
                    <button 
                        onClick={() => setActiveTab('pipelines')}
                        className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm tracking-wide transition-all ${activeTab === 'pipelines' ? 'bg-white border border-slate-200 shadow-sm text-[#3066bb]' : 'border border-transparent hover:bg-slate-100/80 text-slate-600 hover:text-slate-900'}`}
                    >
                        Active Pipelines
                    </button>
                    <div className="my-2 border-t border-slate-200"></div>
                    <button 
                        onClick={() => router.push('/api-docs')} 
                        className="w-full text-left px-4 py-3 rounded-xl border border-transparent hover:bg-slate-100/80 text-slate-600 hover:text-slate-900 font-bold text-sm tracking-wide transition-all"
                    >
                        API Documentation
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
                        onClick={() => setIsProfileModalOpen(true)} 
                        className="w-full text-left px-4 py-3 rounded-xl border border-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-bold text-sm transition-all flex items-center gap-3"
                    >
                        <div className="w-8 h-8 rounded-full bg-[#3066bb] text-white flex items-center justify-center text-sm font-bold">
                            {(user as any)?.firstName?.[0] || user?.name?.[0] || 'U'}
                        </div>
                        <span className="truncate">Profile & Settings</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-0 md:ml-80 h-full overflow-y-auto bg-white pt-20 md:pt-0 relative z-10 transition-all duration-500 ease-in-out">
                <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-full">
                    {/* Add top spacing for mobile to clear logo */}
                    <div className="h-16 md:h-0"></div>
                    <EnterpriseClientDashboard viewMode={activeTab} />
                </div>
            </main>

            <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
        </div>
    );
}
