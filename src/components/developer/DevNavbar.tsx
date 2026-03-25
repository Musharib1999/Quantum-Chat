"use client";

import React, { useState, useEffect } from 'react';
import { Play, Cpu, ChevronDown, Loader2 } from 'lucide-react';
import TokenUsageIndicator from '@/components/TokenUsageIndicator';
import Link from 'next/link';

interface Hardware {
    id: string;
    name: string;
    status: 'Online' | 'Offline';
    qubits?: number;
    provider: string;
}

interface DevNavbarProps {
    selectedHardware: Hardware | null;
    onHardwareSelect: (hw: Hardware) => void;
    onRun: () => void;
    isExecuting: boolean;
}

export default function DevNavbar({ selectedHardware, onHardwareSelect, onRun, isExecuting }: DevNavbarProps) {
    const [hardwares, setHardwares] = useState<Hardware[]>([]);
    const [isLoadingHw, setIsLoadingHw] = useState(true);
    const [showHwDropdown, setShowHwDropdown] = useState(false);

    useEffect(() => {
        fetch('/api/hardware')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Mapping standard data to our Hardware interface
                    const mapped = data.map((hw: any) => ({
                        id: hw.id || hw._id,
                        name: hw.name,
                        status: (hw.status as 'Online' | 'Offline') || 'Online',
                        qubits: hw.qubits,
                        provider: hw.provider || 'Generic'
                    }));
                    setHardwares(mapped);
                    if (mapped.length > 0 && !selectedHardware) {
                        onHardwareSelect(mapped[0]);
                    }
                }
            })
            .catch(err => console.error("Failed to fetch hardware", err))
            .finally(() => setIsLoadingHw(false));
    }, []);

    return (
        <nav className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-6 z-50 sticky top-0 shadow-sm">
            {/* Left: Branding */}
            <div className="flex items-center gap-4">
                <Link href="/">
                    <img src="/logo.png" alt="Quantum Guru" className="h-[32px] md:h-[50px] w-auto object-contain cursor-pointer transition-opacity hover:opacity-90" />
                </Link>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                {/* Hardware Selector */}
                <div className="relative w-64">
                    <button
                        onClick={() => setShowHwDropdown(!showHwDropdown)}
                        className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all text-sm font-medium text-slate-700"
                    >
                        <div className="flex items-center gap-2.5 truncate">
                            <div className={`w-2 h-2 rounded-full ${selectedHardware?.status === 'Online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`} />
                            <span className="truncate">{selectedHardware?.name || 'Select Hardware'}</span>
                        </div>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${showHwDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showHwDropdown && (
                        <div className="absolute top-full left-auto right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[60] min-w-[240px]">
                            <div className="p-1 max-h-64 overflow-y-auto">
                                {hardwares.map((hw) => (
                                    <button
                                        key={hw.id}
                                        onClick={() => {
                                            onHardwareSelect(hw);
                                            setShowHwDropdown(false);
                                        }}
                                        className={`w-full flex flex-col items-start gap-0.5 px-4 py-3 rounded-lg text-left transition-all hover:bg-slate-50 ${selectedHardware?.id === hw.id ? 'bg-[#3066bb]/5 text-[#3066bb]' : 'text-slate-600'}`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-sm font-bold truncate">{hw.name}</span>
                                            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${hw.status === 'Online' ? 'text-green-600 bg-green-50' : 'text-slate-400 bg-slate-50'}`}>
                                                {hw.status}
                                            </div>
                                        </div>
                                        {hw.qubits && <span className="text-[10px] text-slate-400 font-mono">{hw.qubits} Qubits</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Run Button */}
                <button
                    onClick={onRun}
                    disabled={isExecuting || !selectedHardware}
                    className="flex items-center justify-center bg-[#3066bb] hover:bg-[#255299] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-[#3066bb]/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none min-w-[120px]"
                >
                    {isExecuting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                    <span>Run code</span>
                </button>
            </div>
        </nav>
    );
}
