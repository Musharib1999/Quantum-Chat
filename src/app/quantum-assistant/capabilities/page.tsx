"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Layers, Bot, Cpu, Network, Database, Compass, Server, Info, CheckCircle, ExternalLink, Activity } from 'lucide-react';
import TokenUsageIndicator from '@/components/TokenUsageIndicator';
import UserProfileModal from '@/components/UserProfileModal';

interface HardwareItem {
    id: string;
    name: string;
    provider: string;
    qubits: number;
    description: string;
}

const Badge = ({ children, variant = 'gray' }: { children: React.ReactNode, variant?: string }) => {
  const variants: Record<string, string> = {
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    outline: 'bg-transparent text-slate-600 border-slate-300',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border ${variants[variant]}`}>
      {children}
    </span>
  );
};

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-medium bg-white text-slate-600 border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow transition-all cursor-default select-none">
    {children}
  </span>
);

const SectionHeader = ({ icon, title, description, badge }: { icon: React.ReactNode, title: string, description: string, badge?: React.ReactNode }) => (
  <div className="mb-6 flex items-start justify-between">
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-indigo-650 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
      </div>
      <p className="text-xs text-slate-500 max-w-xl">{description}</p>
    </div>
    {badge && <div className="shrink-0">{badge}</div>}
  </div>
);

export default function QuantumGuruDashboard() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [hardwareList, setHardwareList] = useState<HardwareItem[]>([]);
  const [loadingHardware, setLoadingHardware] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadHardware = async () => {
    try {
      const res = await fetch('/api/hardware');
      if (res.ok) {
        const data = await res.json();
        setHardwareList(data);
      }
    } catch (e) {
      console.error('Failed to fetch hardware:', e);
    } finally {
      setLoadingHardware(false);
    }
  };

  useEffect(() => {
    loadHardware();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadHardware();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const getProviderBadgeVariant = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'ibm': return 'indigo';
      case 'dwave': return 'emerald';
      case 'rigetti': return 'violet';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 pb-20 select-none">
      
      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div 
          onClick={() => window.location.href = "/quantum-assistant"}
          className="flex items-center cursor-pointer"
        >
          <img src="/logo.png" alt="Quantum Guru" className="h-[40px] md:h-[62px] w-auto object-contain hover:opacity-90 transition-opacity drop-shadow-sm" />
        </div>
        
        <div className="flex items-center gap-4">
          <TokenUsageIndicator onMenuClick={() => setIsProfileModalOpen(true)} />
        </div>
      </nav>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Main Container */}
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        
        {/* Page Hero */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold tracking-wider text-slate-500">Execution runtime active</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Platform capabilities
            </h1>
          </div>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            <span>Refresh status</span>
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Block: Optimization domains */}
          <div className="xl:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
             <SectionHeader 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>}
              title="Optimization domains"
              description="NLP compilers resolve natural language descriptions into structured mathematical models across these core domain areas."
              badge={<Badge variant="outline">3 active domains</Badge>}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Domain Card 1 */}
              <div className="group bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 hover:shadow-md hover:bg-white transition-all flex flex-col justify-between">
                <div>
                  <div className="mb-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-indigo-650 group-hover:border-indigo-200 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                    </div>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-2">Bipartite assignment</h4>
                  <p className="text-xs text-slate-650 mb-4 leading-relaxed">Matching slots and entities, hospital/shift scheduling, and employee-resource pairing.</p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                  <Tag>Duty rosters</Tag>
                  <Tag>Seat allocation</Tag>
                  <Tag>Job dispatch</Tag>
                </div>
              </div>

              {/* Domain Card 2 */}
              <div className="group bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 hover:shadow-md hover:bg-white transition-all flex flex-col justify-between">
                <div>
                  <div className="mb-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-indigo-650 group-hover:border-indigo-200 transition-colors">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                    </div>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-2">Selection & knapsack</h4>
                  <p className="text-xs text-slate-650 mb-4 leading-relaxed">Choosing optimal subsets under budget limits, facility selection, and project portfolios.</p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                  <Tag>Project bidding</Tag>
                  <Tag>Ad placement</Tag>
                  <Tag>Capital budget</Tag>
                </div>
              </div>

              {/* Domain Card 3 */}
              <div className="group bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 hover:shadow-md hover:bg-white transition-all flex flex-col justify-between">
                <div>
                  <div className="mb-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-indigo-650 group-hover:border-indigo-200 transition-colors">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-2">Routing & sequence</h4>
                  <p className="text-xs text-slate-650 mb-4 leading-relaxed">Vehicle routing (VRP), travelling salesperson sequencing, and multi-stop paths.</p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                  <Tag>Warehouse paths</Tag>
                  <Tag>Drone delivery</Tag>
                </div>
              </div>
            </div>
          </div>

          {/* Right Block: Hardware Registry */}
          <div className="xl:col-span-1 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[420px]">
            <div>
              <SectionHeader 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>}
                title="Hardware registry"
                description="Connected simulators & physical processors."
              />

              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {loadingHardware ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse">
                      <div className="space-y-2 flex-1">
                        <div className="h-3.5 bg-slate-200 rounded w-1/2"></div>
                        <div className="h-3 bg-slate-100 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))
                ) : hardwareList.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/20">
                    <p className="text-slate-400 text-xs">No active hardware nodes.</p>
                  </div>
                ) : (
                  hardwareList.map(hw => (
                    <div key={hw.id} className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-sm transition-all">
                      <div className="pr-2 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 mb-0.5 truncate">{hw.name}</h4>
                        <div className="flex items-center text-[10px] text-slate-500 font-medium whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shrink-0"></span>
                          <span>{hw.qubits > 0 ? `${hw.qubits} qubits active` : "Ready"}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <Badge variant={getProviderBadgeVariant(hw.provider)}>{hw.provider ? hw.provider.charAt(0).toUpperCase() + hw.provider.slice(1).toLowerCase() : ''}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            

          </div>

          {/* Bottom Block: Supported solvers */}
          <div className="xl:col-span-3 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
             <SectionHeader 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>}
              title="Supported solvers"
              description="QuantumGuru dynamically compiles mathematical formulations into appropriate solver environments based on problem structure."
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Solver 1 */}
              <div className="relative p-6 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 overflow-hidden group hover:border-indigo-300 hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-105 duration-300"></div>
                <div className="relative">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-base font-bold text-slate-900">Leap CQM</h4>
                    <Badge variant="indigo">Hybrid</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mb-6 leading-relaxed font-medium">Constrained Quadratic Model. Mixed-integer programming supporting linear and quadratic constraints.</p>
                  
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-400 tracking-wider mb-3">Target use cases</h5>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100 shadow-sm"><svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg> Portfolio optimization</div>
                      <div className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100 shadow-sm"><svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg> Nurse shift allocation</div>
                      <div className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100 shadow-sm"><svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg> Multi-hub server routing</div>
                    </div>
                  </div>
                </div>
              </div>

               {/* Solver 2 */}
               <div className="relative p-6 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 overflow-hidden group hover:border-emerald-300 hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-105 duration-300"></div>
                <div className="relative">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-base font-bold text-slate-900">Leap BQM</h4>
                    <Badge variant="emerald">Annealer</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mb-6 leading-relaxed font-medium">Binary Quadratic Model. High-scale Ising/QUBO optimizations for pure binary state spaces.</p>
                  
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-400 tracking-wider mb-3">Target use cases</h5>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100 shadow-sm"><svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg> Feature selection in ML</div>
                      <div className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100 shadow-sm"><svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg> Maximum clique discovery</div>
                      <div className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100 shadow-sm"><svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg> Graph partitioning</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Solver 3 */}
               <div className="relative p-6 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 overflow-hidden group hover:border-violet-300 hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-105 duration-300"></div>
                <div className="relative">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-base font-bold text-slate-900">Qiskit QAOA</h4>
                    <Badge variant="violet">Gate</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mb-6 leading-relaxed font-medium">Variational QAOA/VQE quantum circuits optimized for gate-based quantum computers.</p>
                  
                   <div>
                    <h5 className="text-[10px] font-bold text-slate-400 tracking-wider mb-3">Target use cases</h5>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100 shadow-sm"><svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg> Molecular simulation</div>
                      <div className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100 shadow-sm"><svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg> Quantum chemistry</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Floating Action Button */}
      <div 
        onClick={() => window.location.href = "/quantum-assistant"}
        className="fixed bottom-6 right-6 lg:left-6 lg:right-auto w-14 h-14 bg-slate-900 rounded-2xl shadow-xl flex items-center justify-center cursor-pointer hover:bg-indigo-600 hover:scale-105 transition-all group z-50"
      >
        <svg className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
      </div>
    </div>
  );
}