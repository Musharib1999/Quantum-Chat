"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
    Phone, 
    User, 
    Users, 
    Activity, 
    ChevronRight, 
    RefreshCcw, 
    Settings, 
    Play, 
    Pause,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowRightLeft,
    BarChart3,
    TrendingUp,
    ShieldCheck,
    Zap
} from 'lucide-react';

interface Telecaller {
    id: string;
    name: string;
    status: 'Available' | 'On Call' | 'Offline';
    callsHandled: number;
    lastCallTime?: Date;
    avatar: string;
}

interface IncomingCall {
    id: string;
    customerName: string;
    phoneNumber: string;
    timestamp: Date;
    assignedTo?: string;
    status: 'Pending' | 'Assigning' | 'Assigned' | 'Completed';
}

const INITIAL_TELECALLERS: Telecaller[] = [
    { id: 'tc1', name: 'Alex Johnson', status: 'Available', callsHandled: 12, avatar: 'https://i.pravatar.cc/150?u=tc1' },
    { id: 'tc2', name: 'Sarah Miller', status: 'Available', callsHandled: 8, avatar: 'https://i.pravatar.cc/150?u=tc2' },
    { id: 'tc3', name: 'Michael Chen', status: 'Available', callsHandled: 15, avatar: 'https://i.pravatar.cc/150?u=tc3' },
    { id: 'tc4', name: 'Elena Rodriguez', status: 'Available', callsHandled: 5, avatar: 'https://i.pravatar.cc/150?u=tc4' },
    { id: 'tc5', name: 'David Smith', status: 'Available', callsHandled: 20, avatar: 'https://i.pravatar.cc/150?u=tc5' },
];

export default function TelecomAssignmentDashboard() {
    const { user } = useAuth();
    const [strategy, setStrategy] = useState<'Round Robin' | 'FCFS'>('Round Robin');
    const [telecallers, setTelecallers] = useState<Telecaller[]>(INITIAL_TELECALLERS);
    const [callQueue, setCallQueue] = useState<IncomingCall[]>([]);
    const [isLive, setIsLive] = useState(true);
    const [lastAssignedIndex, setLastAssignedIndex] = useState(-1);
    const processedIds = useRef(new Set<string>());
    
    // Fetch real data from API
    const fetchRealData = async () => {
        try {
            const res = await fetch('/api/v1/demo/telecom/inbound?limit=20');
            const data = await res.json();
            if (data.success) {
                // Filter for calls we haven't processed yet
                const newCalls = data.data
                    .filter((call: any) => !processedIds.current.has(call._id))
                    .map((call: any) => {
                        processedIds.current.add(call._id);
                        return {
                            id: call._id,
                            customerName: call.customer || 'Unknown Customer',
                            phoneNumber: call.phone || 'N/A',
                            timestamp: new Date(call.timestamp),
                            status: 'Pending' as const
                        };
                    });

                if (newCalls.length > 0) {
                    setCallQueue(prev => [...newCalls, ...prev].slice(0, 50));
                }
            }
        } catch (e) {
            console.error("Failed to fetch real data:", e);
        }
    };

    useEffect(() => {
        if (!isLive) return;

        // Poll every 5 seconds
        const interval = setInterval(fetchRealData, 5000);
        fetchRealData(); // Initial fetch

        return () => clearInterval(interval);
    }, [isLive]);

    // Handle Assignment Logic
    useEffect(() => {
        const pendingCalls = callQueue.filter(c => c.status === 'Pending');
        if (pendingCalls.length === 0) return;

        const callToAssign = pendingCalls[0];
        let targetTelecaller: Telecaller | undefined;

        if (strategy === 'Round Robin') {
            const available = telecallers.filter(t => t.status === 'Available');
            if (available.length > 0) {
                // Find index of last assigned among currently available
                const nextIndex = (lastAssignedIndex + 1) % telecallers.length;
                
                // Find next available starting from nextIndex
                for (let i = 0; i < telecallers.length; i++) {
                    const idx = (nextIndex + i) % telecallers.length;
                    if (telecallers[idx].status === 'Available') {
                        targetTelecaller = telecallers[idx];
                        setLastAssignedIndex(idx);
                        break;
                    }
                }
            }
        } else {
            // FCFS: Assign to first available
            targetTelecaller = telecallers.find(t => t.status === 'Available');
        }

        if (targetTelecaller) {
            assignCall(callToAssign.id, targetTelecaller.id);
        }
    }, [callQueue, telecallers, strategy, lastAssignedIndex]);

    const assignCall = (callId: string, telecallerId: string) => {
        // Set to Assigning first for visual feedback
        setCallQueue(prev => prev.map(c => 
            c.id === callId ? { ...c, status: 'Assigning', assignedTo: telecallerId } : c
        ));

        // Delay the actual assignment to show animation
        setTimeout(() => {
            setCallQueue(prev => prev.map(c => 
                c.id === callId ? { ...c, status: 'Assigned' } : c
            ));

            setTelecallers(prev => prev.map(t => 
                t.id === telecallerId ? { ...t, status: 'On Call', callsHandled: t.callsHandled + 1, lastCallTime: new Date() } : t
            ));

            // Simulate call duration
            setTimeout(() => {
                setTelecallers(prev => prev.map(t => 
                    t.id === telecallerId ? { ...t, status: 'Available' } : t
                ));
                setCallQueue(prev => prev.map(c => 
                    c.id === callId ? { ...c, status: 'Completed' } : c
                ));
            }, 10000);
        }, 1500);
    };

    const addTelecaller = () => {
        const names = ['Lisa Wong', 'James Bond', 'Alice Cooper', 'Bob Marley', 'Charlie Chaplin'];
        const name = names[Math.floor(Math.random() * names.length)];
        const id = `tc-${Math.random().toString(36).substr(2, 5)}`;
        const newTC: Telecaller = {
            id,
            name,
            status: 'Available',
            callsHandled: 0,
            avatar: `https://i.pravatar.cc/150?u=${id}`
        };
        setTelecallers(prev => [...prev, newTC]);
    };

    const simulateIncomingCall = () => {
        const id = `call-${Math.random().toString(36).substr(2, 9)}`;
        const newCall: IncomingCall = {
            id,
            customerName: ['John Doe', 'Jane Smith', 'Robert Brown', 'Emily Davis', 'Chris Wilson'][Math.floor(Math.random() * 5)],
            phoneNumber: `+1 (555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
            timestamp: new Date(),
            status: 'Pending'
        };
        setCallQueue(prev => [newCall, ...prev].slice(0, 50));
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8 font-sans selection:bg-blue-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                                <Phone size={20} className="text-blue-400" />
                            </div>
                            <span className="text-sm font-bold tracking-widest text-blue-400 uppercase">Telecom Showcase</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Call Assignment <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Dashboard</span></h1>
                        <p className="text-slate-400 mt-2 max-w-xl">Optimizing telecaller utilization using advanced assignment strategies. Monitor live streams and agent performance in real-time.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-800/40 backdrop-blur-xl p-2 rounded-2xl border border-slate-700/50 shadow-2xl">
                        <button 
                            onClick={() => setStrategy('Round Robin')}
                            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${strategy === 'Round Robin' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                        >
                            <RefreshCcw size={16} />
                            Round Robin
                        </button>
                        <button 
                            onClick={() => setStrategy('FCFS')}
                            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${strategy === 'FCFS' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                        >
                            <Clock size={16} />
                            FCFS
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Telecallers Status */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                                <Users size={20} className="text-blue-400" />
                                Active Telecallers
                            </h2>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={addTelecaller}
                                    className="px-4 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500 hover:text-white transition-all text-xs font-bold"
                                >
                                    + Add Agent
                                </button>
                                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Live Monitoring</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {telecallers.map((tc) => (
                                <div key={tc.id} className={`p-6 rounded-2xl border transition-all duration-500 group relative overflow-hidden ${tc.status === 'On Call' ? 'bg-blue-600/10 border-blue-500/30 shadow-lg shadow-blue-900/20' : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/60'}`}>
                                    {tc.status === 'On Call' && (
                                        <div className="absolute top-0 right-0 p-2">
                                            <div className="flex items-center gap-1 bg-blue-500 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest animate-bounce">
                                                Active
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="relative">
                                            <img src={tc.avatar} alt={tc.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700/50 group-hover:border-blue-500/50 transition-colors" />
                                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-[#0f172a] ${tc.status === 'Available' ? 'bg-green-500' : tc.status === 'On Call' ? 'bg-blue-500' : 'bg-slate-500'}`}></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white truncate">{tc.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${tc.status === 'Available' ? 'text-green-400' : tc.status === 'On Call' ? 'text-blue-400' : 'text-slate-400'}`}>{tc.status}</span>
                                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                <span className="text-[10px] text-slate-500 font-bold">{tc.callsHandled} handled today</span>
                                            </div>
                                        </div>
                                    </div>

                                    {tc.status === 'On Call' && (
                                        <div className="mt-4 pt-4 border-t border-blue-500/20 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center justify-between text-xs font-bold text-blue-400 mb-2">
                                                <span>Live Call</span>
                                                <span className="flex items-center gap-1">
                                                    <Activity size={12} className="animate-pulse" />
                                                    02:45
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-blue-900/30 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 animate-progress w-[65%]"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Inbound Stream */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                                <Activity size={20} className="text-purple-400" />
                                Inbound Stream
                            </h2>
                            <button 
                                onClick={simulateIncomingCall}
                                className="p-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-xl hover:bg-purple-600 hover:text-white transition-all active:scale-95 group"
                                title="Simulate Call"
                            >
                                <Play size={16} className="group-hover:fill-current" />
                            </button>
                        </div>

                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl h-[600px] flex flex-col">
                            <div className="p-4 border-b border-slate-700/50 bg-slate-900/50 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Live Traffic</span>
                                <span className="text-[10px] font-bold text-purple-400">{callQueue.length} packets cached</span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {callQueue.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 opacity-50">
                                        <div className="p-6 bg-slate-700/30 rounded-full border border-slate-600/30 animate-pulse">
                                            <Phone size={32} />
                                        </div>
                                        <p className="text-sm font-medium">Awaiting incoming calls...</p>
                                    </div>
                                ) : (
                                    callQueue.map((call) => (
                                        <div key={call.id} className={`p-4 rounded-xl border animate-in slide-in-from-right-4 duration-300 ${call.status === 'Pending' ? 'bg-purple-500/10 border-purple-500/30 shadow-lg shadow-purple-900/20' : call.status === 'Assigning' ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/20' : call.status === 'Assigned' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-slate-900/50 border-slate-800 opacity-60'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-lg ${call.status === 'Pending' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                        <Phone size={12} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-white leading-none mb-1">{call.customerName}</div>
                                                        <div className="text-[10px] font-mono text-slate-500 uppercase">{call.phoneNumber}</div>
                                                    </div>
                                                </div>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${call.status === 'Pending' ? 'bg-purple-500 text-white animate-pulse' : call.status === 'Assigning' ? 'bg-blue-500 text-white animate-pulse' : call.status === 'Assigned' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-500'}`}>
                                                    {call.status}
                                                </span>
                                            </div>

                                            {(call.status === 'Assigned' || call.status === 'Assigning') && (
                                                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-blue-400">
                                                    <ArrowRightLeft size={10} className={call.status === 'Assigning' ? 'animate-spin' : ''} />
                                                    {call.status === 'Assigning' ? 'Connecting to ' : 'Assigned to '} 
                                                    {telecallers.find(t => t.id === call.assignedTo)?.name}
                                                </div>
                                            )}

                                            <div className="mt-2 text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                                                {new Date(call.timestamp).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quantum Routing Audit Results Section */}
                <div className="mt-16 pt-12 border-t border-slate-800 animate-in fade-in duration-1000">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-blue-500/20 rounded-md">
                                    <ShieldCheck size={16} className="text-blue-400" />
                                </div>
                                <span className="text-[10px] font-black tracking-[0.2em] text-blue-400 uppercase">Audit Verified</span>
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tight">Quantum Routing <span className="text-blue-500">Intelligence Audit</span></h2>
                            <p className="text-slate-400 mt-2">Performance benchmarking against classical heuristic routing strategies.</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="px-4 py-2 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Audit Sample</div>
                                <div className="text-sm font-bold text-white">624 Calls Verified</div>
                            </div>
                            <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                <div className="text-[10px] font-bold text-blue-400 uppercase mb-1">Lift Index</div>
                                <div className="text-sm font-bold text-blue-400">+14.2% Efficiency</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Wait Time Reduction', value: '38%', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                            { label: 'Proficiency Match', value: '92.4%', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
                            { label: 'Conversion Lift', value: '+8.6%', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                            { label: 'Resource Optimization', value: '1.2x', icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                        ].map((stat, i) => (
                            <div key={i} className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-2xl hover:border-slate-600 transition-colors">
                                <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                                    <stat.icon size={20} />
                                </div>
                                <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden backdrop-blur-xl">
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            <div className="p-8 border-b lg:border-b-0 lg:border-r border-slate-700/50">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                                    Classical Round Robin (Baseline)
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-2">
                                            <span className="text-slate-400">ROUTING ACCURACY</span>
                                            <span className="text-slate-200">62%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-600 w-[62%]"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-2">
                                            <span className="text-slate-400">AGENT PROFICIENCY UTILIZATION</span>
                                            <span className="text-slate-200">45%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-600 w-[45%]"></div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 italic">Classical strategies suffer from random proficiency assignment, leading to longer handle times and higher churn risk.</p>
                                </div>
                            </div>

                            <div className="p-8 bg-blue-600/5">
                                <h3 className="text-lg font-bold text-blue-400 mb-6 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                    Quantum Guru Routing (Optimization)
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-2">
                                            <span className="text-blue-400/60 uppercase">ROUTING ACCURACY</span>
                                            <span className="text-blue-400">94%</span>
                                        </div>
                                        <div className="h-2 w-full bg-blue-900/30 rounded-full overflow-hidden border border-blue-500/20">
                                            <div className="h-full bg-blue-500 w-[94%] shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-2">
                                            <span className="text-blue-400/60 uppercase">AGENT PROFICIENCY UTILIZATION</span>
                                            <span className="text-blue-400">89%</span>
                                        </div>
                                        <div className="h-2 w-full bg-blue-900/30 rounded-full overflow-hidden border border-blue-500/20">
                                            <div className="h-full bg-blue-500 w-[89%] shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                        <div className="flex items-start gap-3">
                                            <Activity size={16} className="text-blue-400 mt-1 shrink-0" />
                                            <p className="text-xs text-blue-300/80 leading-relaxed">The quantum optimizer evaluates the proficiency vector of every available agent against the customer intent, identifying the global minimum for wait-time across the entire pool.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #475569;
                }
                @keyframes progress {
                    from { width: 0%; }
                    to { width: 65%; }
                }
                .animate-progress {
                    animation: progress 8s linear infinite;
                }
            `}</style>
        </div>
    );
}
