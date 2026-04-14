"use client";

import React, { useState, useEffect } from 'react';
import DevNavbar from '@/components/developer/DevNavbar';
import CodeEditor from '@/components/developer/CodeEditor';
import OutputPanel from '@/components/developer/OutputPanel';
import { DEV_TEMPLATES } from '@/lib/developer/templates';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Hardware {
    id: string;
    name: string;
    status: 'Online' | 'Offline';
    qubits?: number;
    provider: string;
}

export default function DeveloperConsole() {
    const { user, isInitializing } = useAuth();
    const router = useRouter();
    const [selectedHardware, setSelectedHardware] = useState<Hardware | null>(null);
    const [code, setCode] = useState(DEV_TEMPLATES.qiskit);
    const [output, setOutput] = useState<any>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    // Identity check - only admin and builder can access
    useEffect(() => {
        if (!isInitializing && (!user || (user.role !== 'admin' && user.role !== 'builder'))) {
            router.push('/');
        }
    }, [user, isInitializing, router]);

    if (isInitializing || !user || (user.role !== 'admin' && user.role !== 'builder')) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#3066bb] border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 font-medium animate-pulse">Authenticating Genesis Node...</p>
                </div>
            </div>
        );
    }

    // Update code template when hardware changes
    const handleHardwareSelect = (hw: Hardware) => {
        const prevHw = selectedHardware;
        setSelectedHardware(hw);

        // Only update code if it was empty or matching the previous template 
        // (to avoid overwriting user changes unless it's a fresh start)
        const name = hw.name.toLowerCase();
        if (!prevHw || code === DEV_TEMPLATES.qiskit || code === DEV_TEMPLATES.dwave || code === DEV_TEMPLATES.ortools) {
            if (name.includes('qiskit')) setCode(DEV_TEMPLATES.qiskit);
            else if (name.includes('d-wave') || name.includes('annealer')) setCode(DEV_TEMPLATES.dwave);
            else if (name.includes('or-tools') || name.includes('solver')) setCode(DEV_TEMPLATES.ortools);
        }
    };

    const handleRun = async () => {
        if (!selectedHardware || !code.trim()) return;

        setIsExecuting(true);
        setOutput(null);

        try {
            const res = await fetch('/api/developer/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    hardwareId: selectedHardware.id,
                    hardwareName: selectedHardware.name
                })
            });

            const data = await res.json();
            setOutput(data);
        } catch (err) {
            setOutput({ error: "Failed to connect to the execution bridge." });
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="h-screen w-full flex flex-col bg-white overflow-hidden selection:bg-[#3066bb]/10">
            {/* Minimalist Navbar */}
            <DevNavbar 
                selectedHardware={selectedHardware}
                onHardwareSelect={handleHardwareSelect}
                onRun={handleRun}
                isExecuting={isExecuting}
            />

            {/* Split Screen Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Code Editor (Left) */}
                <div className="w-full md:w-1/2 h-1/2 md:h-full overflow-hidden">
                    <CodeEditor 
                        code={code}
                        onChange={setCode}
                    />
                </div>

                {/* Vertical Divider (Desktop Only) */}
                <div className="hidden md:block w-px h-full bg-slate-100 z-10" />

                {/* Output Panel (Right) */}
                <div className="w-full md:w-1/2 h-1/2 md:h-full overflow-hidden">
                    <OutputPanel 
                        output={output}
                        isExecuting={isExecuting}
                        hardwareName={selectedHardware?.name || "selected hardware"}
                    />
                </div>
            </div>
        </div>
    );
}
