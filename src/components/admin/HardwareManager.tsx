"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getHardwares, addHardware, updateHardware, toggleHardwareStatus, deleteHardware, type HardwareType } from '@/app/actions/admin';

export default function HardwareManager() {
    const [hardwares, setHardwares] = useState<HardwareType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [checkingIds, setCheckingIds] = useState<string[]>([]);

    // Form State
    const [newHw, setNewHw] = useState<Partial<HardwareType>>({
        provider: 'ibm',
        status: 'Online',
        qubits: 0,
        order: 0,
        name: '',
        description: '',
        serviceUrl: '',
        testCode: '',
        testOutput: ''
    });

    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        loadHardware();
    }, []);

    const loadHardware = async () => {
        setLoading(true);
        try {
            const data = await getHardwares();
            setHardwares(data);
        } catch (e) {
            console.error("Failed to load hardware", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newHw.name || !newHw.description) return;
        await addHardware({ ...newHw } as any);
        setIsAdding(false);
        setNewHw({ provider: 'ibm', status: 'Online', qubits: 0, order: 0, name: '', description: '', serviceUrl: '', testCode: '', testOutput: '' });
        loadHardware();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this hardware node?')) return;
        await deleteHardware(id);
        loadHardware();
    };

    const handleToggleStatus = async (id: string) => {
        await toggleHardwareStatus(id);
        loadHardware();
    };

    const handleSaveEdit = async (id: string) => {
        const item = hardwares.find(h => h.id === id);
        if (item) {
            await updateHardware(id, { 
                name: item.name, 
                description: item.description, 
                qubits: item.qubits, 
                order: item.order, 
                provider: item.provider,
                serviceUrl: item.serviceUrl,
                testCode: item.testCode,
                testOutput: item.testOutput
            });
            setEditingId(null);
            loadHardware();
        }
    };

    const handleCheckStatus = async (hw: HardwareType) => {
        setCheckingIds(prev => [...prev, hw.id]);
        try {
            const res = await axios.post('/api/admin/hardware/status', {
                serviceUrl: hw.serviceUrl,
                provider: hw.provider,
                testCode: hw.testCode,
                testOutput: hw.testOutput
            });
            
            if (res?.data?.success) {
                // Persistent status update: If the check passed, the node IS online.
                // We update the DB so the dashboard label reflects this across sessions.
                await updateHardware(hw.id, { ...hw, status: 'Online' });
                await loadHardware(); // Refresh UI to show the new 'Online' badge
                
                alert(`✅ ${hw.name} is ONLINE.\nSuccessfully passed execution test at: ${hw.serviceUrl}`);
            } else if (res?.data?.status === 'Unauthorized') {
                alert(`⚠️ ${hw.name} is UNAUTHORIZED.\n${res.data.error}\n\nAction: Ensure your API_SECRET_KEY matches the one on the backend simulator.`);
            } else {
                alert(`❌ ${hw.name} is OFFLINE.\nReason: ${res?.data?.error || 'No response from server'}`);
            }
        } catch (e: any) {
            alert(`❌ Error pinging ${hw.name}: ${e.message}`);
        } finally {
            setCheckingIds(prev => prev.filter(id => id !== hw.id));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-12 text-[#0F172A] text-sm">
            Loading quantum infrastructure...
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-[#0F172A]">Quantum hardware registry</h2>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-[rgb(48,102,187)] hover:bg-[#255299] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                    {isAdding ? 'Cancel' : 'Add simulator'}
                </button>
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-2xl border border-[rgb(27,176,206)]/30 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-[#0F172A]">New hardware node</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#0F172A] uppercase">Node name</label>
                            <input
                                className="w-full p-3 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-sm text-[#0F172A]"
                                placeholder="e.g. IBM Brisbane"
                                value={newHw.name || ''}
                                onChange={e => setNewHw({ ...newHw, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#0F172A] uppercase">Provider ecosystem</label>
                            <select
                                className="w-full p-3 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-sm text-[#0F172A]"
                                value={newHw.provider}
                                onChange={e => setNewHw({ ...newHw, provider: e.target.value as any })}
                            >
                                <option value="ibm">IBM Quantum</option>
                                <option value="ionq">IonQ</option>
                                <option value="rigetti">Rigetti</option>
                                <option value="dwave">D-Wave</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#0F172A] uppercase">Qubit count</label>
                            <input
                                type="number"
                                className="w-full p-3 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-sm text-[#0F172A]"
                                placeholder="0"
                                value={newHw.qubits}
                                onChange={e => setNewHw({ ...newHw, qubits: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#0F172A] uppercase">Display priority</label>
                            <input
                                type="number"
                                className="w-full p-3 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-sm text-[#0F172A]"
                                placeholder="0"
                                value={newHw.order}
                                onChange={e => setNewHw({ ...newHw, order: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-bold text-[#0F172A] uppercase">Technical description</label>
                            <textarea
                                className="w-full p-3 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-sm text-[#0F172A] h-24"
                                placeholder="Briefly describe the backend architecture..."
                                value={newHw.description || ''}
                                onChange={e => setNewHw({ ...newHw, description: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-bold text-[#0F172A] uppercase">Service URL (For Backend Routing)</label>
                            <input
                                className="w-full p-3 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-sm text-[#0F172A] font-mono"
                                placeholder="https://your-service-url.com"
                                value={newHw.serviceUrl || ''}
                                onChange={e => setNewHw({ ...newHw, serviceUrl: e.target.value })}
                            />
                            <p className="text-[10px] font-bold text-amber-600 bg-amber-50 p-2 border border-amber-100 rounded-lg">
                                ⚠️ Note: The remote simulator must be explicitly configured to accept the gateway's global API Secret.
                            </p>
                        </div>

                        <div className="space-y-1.5 md:col-span-2 border-t border-[rgb(27,176,206)]/20 pt-4 mt-2">
                            <label className="text-[10px] font-bold text-[#0F172A] uppercase">Health Check Python Script (Optional)</label>
                            <textarea
                                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-xs text-green-400 font-mono h-24"
                                placeholder="print('PONG')"
                                value={newHw.testCode || ''}
                                onChange={e => setNewHw({ ...newHw, testCode: e.target.value })}
                            />
                            <p className="text-[9px] text-[#0F172A] font-semibold">This tiny, minimal code script will be sent when checking the hardware status.</p>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-bold text-[#0F172A] uppercase">Expected Health Check Output (Optional)</label>
                            <input
                                className="w-full p-3 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-sm text-[#0F172A] font-mono"
                                placeholder="PONG"
                                value={newHw.testOutput || ''}
                                onChange={e => setNewHw({ ...newHw, testOutput: e.target.value })}
                            />
                            <p className="text-[9px] text-[#0F172A] font-semibold">The health check passes only if the runtime prints an exact match to this string.</p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleAdd}
                            disabled={!newHw.name || !newHw.description}
                            className="bg-[rgb(48,102,187)] hover:bg-[#255299] text-white px-8 py-2.5 rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50"
                        >
                            Save hardware node
                        </button>
                    </div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {hardwares.map(hw => (
                    <div key={hw.id} className={`p-6 bg-white rounded-2xl border transition-all ${hw.status === 'Online' ? 'border-[rgb(27,176,206)]/30' : 'border-[rgb(27,176,206)]/20 opacity-70'} flex flex-col gap-4 shadow-sm hover:shadow-md group`}>
                        <div className="flex justify-between items-start">
                            <div className="text-[10px] font-bold text-[#0F172A] uppercase tracking-widest">
                                {hw.provider}
                            </div>
                            <button
                                onClick={() => handleToggleStatus(hw.id)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${hw.status === 'Online' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-[rgb(48,102,187)]/10 text-[#0F172A] border-[rgb(27,176,206)]/30'}`}
                            >
                                {hw.status}
                            </button>
                        </div>

                        {editingId === hw.id ? (
                            <div className="space-y-3 flex-1">
                                <input
                                    className="w-full p-2 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-lg text-sm font-semibold text-[#0F172A]"
                                    value={hw.name}
                                    onChange={e => setHardwares(hardwares.map(h => h.id === hw.id ? { ...h, name: e.target.value } : h))}
                                />
                                <div className="space-y-1">
                                    <label className="text-[9px] text-[#0F172A] uppercase font-bold">Provider ecosystem</label>
                                    <select
                                        className="w-full p-2 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-lg text-xs"
                                        value={hw.provider}
                                        onChange={e => setHardwares(hardwares.map(h => h.id === hw.id ? { ...h, provider: e.target.value as any } : h))}
                                    >
                                        <option value="ibm">IBM Quantum</option>
                                        <option value="ionq">IonQ</option>
                                        <option value="rigetti">Rigetti</option>
                                        <option value="dwave">D-Wave</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[9px] text-[#0F172A] uppercase font-bold">Qubits</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-lg text-xs"
                                            value={hw.qubits}
                                            onChange={e => setHardwares(hardwares.map(h => h.id === hw.id ? { ...h, qubits: parseInt(e.target.value) || 0 } : h))}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[9px] text-[#0F172A] uppercase font-bold">Order</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-lg text-xs"
                                            value={hw.order}
                                            onChange={e => setHardwares(hardwares.map(h => h.id === hw.id ? { ...h, order: parseInt(e.target.value) || 0 } : h))}
                                        />
                                    </div>
                                </div>
                                <textarea
                                    className="w-full p-2 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-lg text-xs h-20"
                                    value={hw.description}
                                    onChange={e => setHardwares(hardwares.map(h => h.id === hw.id ? { ...h, description: e.target.value } : h))}
                                />
                                <div className="space-y-1">
                                    <label className="text-[9px] text-[#0F172A] uppercase font-bold">Service URL</label>
                                    <input
                                        className="w-full p-2 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-lg text-xs font-mono"
                                        value={hw.serviceUrl || ''}
                                        onChange={e => setHardwares(hardwares.map(h => h.id === hw.id ? { ...h, serviceUrl: e.target.value } : h))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-[#0F172A] uppercase font-bold">Health Check Code (Python)</label>
                                    <textarea
                                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-green-400 h-16"
                                        value={hw.testCode || ''}
                                        placeholder="print('PONG')"
                                        onChange={e => setHardwares(hardwares.map(h => h.id === hw.id ? { ...h, testCode: e.target.value } : h))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-[#0F172A] uppercase font-bold">Expected Output</label>
                                    <input
                                        className="w-full p-2 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-lg text-xs font-mono"
                                        value={hw.testOutput || ''}
                                        placeholder="PONG"
                                        onChange={e => setHardwares(hardwares.map(h => h.id === hw.id ? { ...h, testOutput: e.target.value } : h))}
                                    />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button onClick={() => handleSaveEdit(hw.id)} className="flex-1 bg-[rgb(48,102,187)] text-white p-2 rounded-lg text-xs font-bold">Save</button>
                                    <button onClick={() => { setEditingId(null); loadHardware(); }} className="flex-1 bg-[rgb(48,102,187)]/10 text-[#0F172A] p-2 rounded-lg text-xs font-bold">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1">
                                <h4 className="font-bold text-[#0F172A] text-base">{hw.name}</h4>
                                <p className="text-[10px] text-[#0F172A] font-medium mt-0.5 mb-2">{hw.qubits} Qubits • Priority {hw.order}</p>
                                <p className="text-sm text-[#0F172A] leading-relaxed line-clamp-3">{hw.description}</p>
                            </div>
                        )}

                        {editingId !== hw.id && (
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={() => setEditingId(hw.id)}
                                    className="text-[#0F172A] hover:text-[#0F172A] font-semibold text-xs"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleCheckStatus(hw)}
                                    disabled={checkingIds.includes(hw.id)}
                                    className="text-[#0F172A] hover:underline font-semibold text-xs disabled:opacity-50"
                                >
                                    {checkingIds.includes(hw.id) ? 'Checking...' : 'Check Status'}
                                </button>
                                <button
                                    onClick={() => handleDelete(hw.id)}
                                    className="text-red-500 hover:text-red-600 font-semibold text-xs"
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {hardwares.length === 0 && !loading && !isAdding && (
                <div className="p-12 text-center border border-[rgb(27,176,206)]/30 rounded-2xl bg-white border-dashed">
                    <p className="text-[#0F172A] text-sm mb-6">No quantum simulators have been configured yet.</p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-[rgb(48,102,187)] hover:bg-[#255299] text-white px-8 py-2.5 rounded-xl text-sm font-semibold shadow-sm"
                    >
                        Configure first simulator
                    </button>
                </div>
            )}
        </div>
    );
}
