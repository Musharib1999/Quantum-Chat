"use client";

import React, { useState, useEffect } from 'react';
import { 
    Play, 
    Settings, 
    Save, 
    FileCode, 
    Activity, 
    Cpu, 
    Zap, 
    Terminal, 
    Layout, 
    ChevronRight,
    Search,
    Share2,
    Database,
    Cloud,
    Lock,
    Atom
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- Sub-Components ---

const TelemetryCard = ({ label, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md group hover:bg-white/10 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform`}>
                <Icon size={18} />
            </div>
            {trend && <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full">{trend}</span>}
        </div>
        <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</span>
            <div className="text-xl font-bold text-white tracking-tight">{value}</div>
        </div>
    </div>
);

const EditorSidebarIcon = ({ icon: Icon, active, onClick, tooltip }: any) => (
    <button 
        onClick={onClick}
        title={tooltip}
        className={`p-3 rounded-xl transition-all duration-200 group relative ${active ? 'bg-[#3066bb] text-white shadow-[0_0_15px_rgba(48,102,187,0.3)]' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
    >
        <Icon size={20} />
        {active && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-full" />}
    </button>
);

export default function SolverStudio() {
    const { user, isAuthenticated, isInitializing } = useAuth();
    const router = useRouter();
    const [code, setCode] = useState(`import qiskit\nfrom qiskit import QuantumCircuit, execute, Aer\n\n# Initialize a 24-qubit circuit\nqc = QuantumCircuit(24, 2)\n\ndef quantum_circuit():\n    qc.h(0)\n    qc.h(1)\n    qc.cx(0, 1)\n    qc.cx(1, 2)\n    qc.cx(3, 3)\n    qc.cx(4, 4)\n    qc.cx(5, 1)\n    qc.cx(8, 2)\n    qc.cx(9, 3)\n\n# Execute on local simulator\nsimulator = Aer.get_backend('qasm_simulator')\njob = execute(qc, simulator, shots=1024)\nresult = job.result()\n\nprint("Quantum Simulation Complete")`);
    const [isExecuting, setIsExecuting] = useState(false);
    const [activeTab, setActiveTab] = useState('files');
    const [output, setOutput] = useState<string[]>(["[System] Quantum Kernel Initialized...", "[Info] Connected to IBM-Q Cloud (Latency: 42ms)", "[Ready] Simulation Engine Standby."]);

    useEffect(() => {
        if (!isInitializing && !isAuthenticated) {
            router.push('/login?redirect=/builder/studio');
        }
    }, [isAuthenticated, isInitializing, router]);

    if (isInitializing || !isAuthenticated) return null;

    const handleExecute = () => {
        setIsExecuting(true);
        setOutput(prev => [...prev, `[Execution] Starting simulation for job_qc_${Math.floor(Math.random()*1000)}...`]);
        
        setTimeout(() => {
            setIsExecuting(false);
            setOutput(prev => [...prev, "[Result] Circuit depth: 14 operations", "[Success] Job completed in 1.4s."]);
        }, 2000);
    };

    return (
        <div className="h-screen w-full bg-[#020617] text-white flex flex-col font-sans overflow-hidden selection:bg-[#3066bb]/30">
            {/* Top Navbar */}
            <header className="h-16 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl flex items-center justify-between px-6 z-30">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push('/builder/dashboard')}>
                        <div className="w-8 h-8 bg-gradient-to-br from-[#3066bb] to-[#1bb0ce] rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(48,102,187,0.4)] group-hover:scale-110 transition-transform">
                            <Atom className="text-white" size={18} />
                        </div>
                        <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Solver Studio</span>
                    </div>

                    <nav className="hidden md:flex items-center gap-6 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                        <button className="hover:text-white transition-colors">File</button>
                        <button className="hover:text-white transition-colors">Edit</button>
                        <button className="hover:text-white transition-colors">Kernel</button>
                        <button className="hover:text-white transition-colors">Settings</button>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-4 mr-4 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-300 uppercase">System Active</span>
                        </div>
                        <div className="w-px h-3 bg-white/10" />
                        <div className="flex items-center gap-2">
                            <Cloud size={12} className="text-[#1bb0ce]" />
                            <span className="text-[10px] font-bold text-slate-300 uppercase">IBM-Q Cloud Connected</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleExecute}
                        disabled={isExecuting}
                        className={`px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 active:scale-95 ${isExecuting ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-[#3066bb] to-[#1bb0ce] text-white shadow-[0_0_30px_rgba(48,102,187,0.4)] hover:shadow-[0_0_40px_rgba(48,102,187,0.6)]'}`}
                    >
                        {isExecuting ? <Zap size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                        {isExecuting ? 'Simulating...' : 'Simulate'}
                    </button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Slim Left Sidebar */}
                <aside className="w-16 border-r border-white/5 bg-[#020617] flex flex-col items-center py-6 gap-4 z-20">
                    <EditorSidebarIcon icon={Layout} active={activeTab === 'files'} onClick={() => setActiveTab('files')} tooltip="Project Explorer" />
                    <EditorSidebarIcon icon={Search} active={activeTab === 'search'} onClick={() => setActiveTab('search')} tooltip="Global Search" />
                    <EditorSidebarIcon icon={Database} active={activeTab === 'db'} onClick={() => setActiveTab('db')} tooltip="Quantum Registry" />
                    <div className="mt-auto flex flex-col gap-4 pb-4">
                        <EditorSidebarIcon icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} tooltip="Studio Settings" />
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs shadow-lg">
                            {user?.name?.[0] || 'U'}
                        </div>
                    </div>
                </aside>

                {/* Sub-Sidebar (Project Explorer) */}
                <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#020617]/50 backdrop-blur-md flex-col">
                    <div className="p-6 border-b border-white/5">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Project Explorer</h3>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 text-[#1bb0ce] text-xs font-semibold cursor-pointer">
                                <FileCode size={14} />
                                <span>quantum_circuit.py</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 text-xs font-medium cursor-pointer transition-colors">
                                <FileCode size={14} />
                                <span>optimization_core.py</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 text-xs font-medium cursor-pointer transition-colors">
                                <Settings size={14} />
                                <span>circuit_config.json</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 p-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Saved Blueprints</h3>
                        <div className="space-y-4">
                            {['Aviation Optimization', 'Portfolio Solver v2', 'Chemical Binding'].map(bp => (
                                <div key={bp} className="group cursor-pointer">
                                    <div className="text-xs font-bold text-slate-300 group-hover:text-[#1bb0ce] transition-colors">{bp}</div>
                                    <div className="text-[10px] text-slate-500 mt-1">Last edited 2h ago</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Workspace (Editor + Output) */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#020617]">
                    {/* Tabs Bar */}
                    <div className="h-10 bg-[#020617] border-b border-white/5 flex items-center px-4">
                        <div className="h-full px-4 flex items-center gap-2 border-b-2 border-[#3066bb] bg-white/[0.02]">
                            <FileCode size={12} className="text-[#1bb0ce]" />
                            <span className="text-[11px] font-bold text-white uppercase tracking-wider">quantum_circuit.py</span>
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[#020617]">
                            {/* Line Numbers Simulation */}
                            <div className="absolute left-0 top-0 bottom-0 w-12 bg-black/20 border-r border-white/5 flex flex-col items-center py-6 text-slate-600 text-[10px] font-mono select-none">
                                {Array.from({ length: 40 }).map((_, i) => <div key={i} className="h-6 leading-6">{i + 1}</div>)}
                            </div>
                            
                            {/* Raw Textarea Editor */}
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="absolute left-12 right-0 top-0 bottom-0 p-6 bg-transparent text-slate-300 font-mono text-[13px] leading-6 outline-none resize-none selection:bg-[#3066bb]/40"
                                spellCheck={false}
                            />
                        </div>

                        {/* Breadcrumbs */}
                        <div className="absolute bottom-4 left-16 flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
                            <span>workspace</span>
                            <ChevronRight size={10} />
                            <span>prime_blazar</span>
                            <ChevronRight size={10} />
                            <span className="text-[#1bb0ce]">quantum_circuit.py</span>
                        </div>
                    </div>

                    {/* Output Terminal Area */}
                    <div className="h-1/3 border-t border-white/5 bg-black/40 backdrop-blur-xl flex flex-col">
                        <div className="h-10 px-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <Terminal size={14} className="text-[#1bb0ce]" />
                                <span>Output Console</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setOutput([])} className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors">Clear</button>
                                <div className="w-px h-3 bg-white/10" />
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-[10px] font-bold text-slate-300 uppercase">Simulator Ready</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-6 font-mono text-[11px] leading-relaxed text-slate-400 space-y-1.5">
                            {output.map((line, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <span className="text-slate-600 select-none">{new Date().toLocaleTimeString()}</span>
                                    <span className={line.includes('[Success]') ? 'text-green-400 font-bold' : line.includes('[Error]') ? 'text-red-400 font-bold' : ''}>
                                        {line}
                                    </span>
                                </div>
                            ))}
                            {isExecuting && (
                                <div className="flex gap-4 animate-pulse">
                                    <span className="text-slate-600">{new Date().toLocaleTimeString()}</span>
                                    <span className="text-[#1bb0ce]">Running optimization kernel...</span>
                                </div>
                            )}
                            <div className="h-4" />
                        </div>
                    </div>
                </div>

                {/* Right Telemetry Sidebar */}
                <aside className="hidden xl:flex w-80 border-l border-white/5 bg-[#020617]/80 backdrop-blur-3xl flex-col">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-[#1bb0ce]" />
                            <h3 className="text-sm font-bold tracking-tight">Quantum Telemetry</h3>
                        </div>
                        <button className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500">
                            <Settings size={14} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto p-6 space-y-6 custom-scrollbar">
                        <div className="grid grid-cols-1 gap-4">
                            <TelemetryCard label="System Status" value="ACTIVE" icon={Zap} color="green" />
                            <TelemetryCard label="Qubit Depth" value="24" icon={Cpu} color="blue" trend="+2.4%" />
                            <TelemetryCard label="Energy Level" value="-4.32 eV" icon={Activity} color="purple" />
                            <TelemetryCard label="Coherence Time" value="78.5 µs" icon={Zap} color="amber" trend="Stable" />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quantum Topology</h4>
                                <Lock size={12} className="text-slate-600" />
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 relative overflow-hidden group">
                                {/* Simulated Topology Map */}
                                <div className="grid grid-cols-4 gap-4 relative z-10">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <div key={i} className={`w-3 h-3 rounded-full ${i % 3 === 0 ? 'bg-[#1bb0ce] shadow-[0_0_10px_rgba(27,176,206,0.8)]' : 'bg-slate-700'} transition-all duration-500`} />
                                    ))}
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Falcon r5.11 Engine</div>
                                
                                {/* Glow Effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#3066bb]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>

                        <div className="p-6 bg-gradient-to-br from-[#3066bb]/20 to-transparent border border-[#3066bb]/20 rounded-2xl space-y-3 relative overflow-hidden">
                            <div className="flex items-center gap-2 text-white">
                                <Zap size={16} />
                                <span className="text-xs font-bold">Optimization Suggestion</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                                Your current circuit depth exceeds the T2 coherence limit of the target Falcon processor. Consider using **Variational Quantum Eigensolver (VQE)** to reduce gate count.
                            </p>
                            <button className="text-[10px] font-black text-[#1bb0ce] uppercase hover:underline">Apply Optimization</button>
                            
                            {/* Decorative Grid */}
                            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-grid-pattern opacity-[0.05] -rotate-12" />
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-black/20">
                        <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95">
                            <Share2 size={14} />
                            Deploy to Production
                        </button>
                    </div>
                </aside>
            </main>

            <style jsx global>{`
                .bg-grid-pattern {
                    background-size: 20px 20px;
                    background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                                    linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.2);
                }
            `}</style>
        </div>
    );
}
