"use client";

import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Trash2, Edit2, CheckCircle, X, Save, AlertTriangle, Layers } from 'lucide-react';
import { getHardwares, addHardware, updateHardware, toggleHardwareStatus, deleteHardware, type HardwareType } from '@/app/actions/admin';

export default function HardwareManager() {
    const [hardwares, setHardwares] = useState<HardwareType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [newHw, setNewHw] = useState<Partial<HardwareType>>({
        provider: 'ibm',
        status: 'Online',
        qubits: 0,
        order: 0,
        name: '',
        description: ''
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
        setNewHw({ provider: 'ibm', status: 'Online', qubits: 0, order: 0, name: '', description: '' });
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
            await updateHardware(id, { name: item.name, description: item.description, qubits: item.qubits, order: item.order, provider: item.provider });
            setEditingId(null);
            loadHardware(); // refresh
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <Cpu className="animate-pulse text-muted-foreground w-8 h-8" />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
            <div className="flex justify-between items-end backdrop-blur-md bg-[#3066bb]/5 p-6 rounded-2xl border border-[#3066bb]/20">
                <div>
                    <h3 className="flex items-center gap-2 font-bold text-[#3066bb] text-xl">
                        <Cpu size={24} /> Quantum Hardware Registry
                    </h3>
                    <p className="text-[#3066bb]/80 text-sm mt-1">Manage the list of available quantum simulators and backend QPUs displayed to users.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-[#3066bb] hover:bg-[#255299] text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#3066bb]/20"
                >
                    {isAdding ? <X size={18} /> : <Plus size={18} />} {isAdding ? 'Cancel' : 'Add Simulator'}
                </button>
            </div>

            {isAdding && (
                <div className="bg-card/70 backdrop-blur-md p-6 rounded-2xl border border-border shadow-xl grid gap-4 grid-cols-1 md:grid-cols-2">
                    <div className="col-span-full">
                        <h4 className="font-bold text-foreground">New Hardware Node</h4>
                    </div>

                    <input
                        className="p-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-[#3066bb] outline-none text-foreground placeholder:text-muted-foreground transition-all"
                        placeholder="Name (e.g. IBM Brisbane)"
                        value={newHw.name || ''}
                        onChange={e => setNewHw({ ...newHw, name: e.target.value })}
                    />

                    <select
                        className="p-3 bg-secondary/30 border border-border rounded-xl outline-none text-foreground"
                        value={newHw.provider}
                        onChange={e => setNewHw({ ...newHw, provider: e.target.value as any })}
                    >
                        <option value="ibm">IBM Quantum</option>
                        <option value="ionq">IonQ</option>
                        <option value="rigetti">Rigetti</option>
                        <option value="dwave">D-Wave</option>
                        <option value="other">Other</option>
                    </select>

                    <input
                        type="number"
                        className="p-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-[#3066bb] outline-none text-foreground"
                        placeholder="Qubits"
                        value={newHw.qubits}
                        onChange={e => setNewHw({ ...newHw, qubits: parseInt(e.target.value) || 0 })}
                    />

                    <input
                        type="number"
                        className="p-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-[#3066bb] outline-none text-foreground"
                        placeholder="Display Order"
                        value={newHw.order}
                        onChange={e => setNewHw({ ...newHw, order: parseInt(e.target.value) || 0 })}
                    />

                    <textarea
                        className="p-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-[#3066bb] outline-none text-foreground col-span-full h-24"
                        placeholder="Description"
                        value={newHw.description || ''}
                        onChange={e => setNewHw({ ...newHw, description: e.target.value })}
                    />

                    <div className="col-span-full flex justify-end">
                        <button
                            onClick={handleAdd}
                            disabled={!newHw.name || !newHw.description}
                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50"
                        >
                            <Save size={18} /> Save Hardware
                        </button>
                    </div>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {hardwares.map(hw => (
                    <div key={hw.id} className={`p-6 bg-card/70 backdrop-blur-md rounded-2xl border transition-all ${hw.status === 'Online' ? 'border-[#3066bb]/30' : 'border-border opacity-70'} flex flex-col gap-4 relative group hover:shadow-md`}>
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-secondary/50 rounded-xl">
                                {hw.provider === 'ibm' ? <Layers className="text-[#3066bb]" size={24} /> : <Cpu size={24} className="text-muted-foreground" />}
                            </div>
                            <button
                                onClick={() => handleToggleStatus(hw.id)}
                                className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${hw.status === 'Online' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                    hw.status === 'Offline' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                        'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                    }`}
                            >
                                {hw.status}
                            </button>
                        </div>

                        {editingId === hw.id ? (
                            <div className="space-y-2 flex-1">
                                <input
                                    className="w-full p-2 bg-secondary border border-border rounded-lg text-sm font-bold text-foreground"
                                    value={hw.name}
                                    onChange={e => setHardwares(hardwares.map(h => h.id === hw.id ? { ...h, name: e.target.value } : h))}
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        className="w-1/2 p-2 bg-secondary border border-border rounded-lg text-xs"
                                        value={hw.qubits}
                                        onChange={e => setHardwares(hardwares.map(h => h.id === hw.id ? { ...h, qubits: parseInt(e.target.value) || 0 } : h))}
                                    />
                                    <input
                                        type="number"
                                        className="w-1/2 p-2 bg-secondary border border-border rounded-lg text-xs"
                                        value={hw.order}
                                        onChange={e => setHardwares(hardwares.map(h => h.id === hw.id ? { ...h, order: parseInt(e.target.value) || 0 } : h))}
                                    />
                                </div>
                                <textarea
                                    className="w-full p-2 bg-secondary border border-border rounded-lg text-xs h-20"
                                    value={hw.description}
                                    onChange={e => setHardwares(hardwares.map(h => h.id === hw.id ? { ...h, description: e.target.value } : h))}
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => handleSaveEdit(hw.id)} className="flex-1 bg-green-500/20 text-green-500 hover:bg-green-500/30 p-2 rounded-lg text-xs font-bold">Save</button>
                                    <button onClick={() => { setEditingId(null); loadHardware(); }} className="flex-1 bg-secondary text-muted-foreground hover:bg-secondary/80 p-2 rounded-lg text-xs font-bold">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1">
                                <h4 className="font-bold text-foreground text-lg">{hw.name}</h4>
                                <p className="text-xs text-muted-foreground font-mono mt-1 mb-2">{hw.qubits} Qubits • Option {hw.order}</p>
                                <p className="text-sm text-foreground/80 leading-relaxed">{hw.description}</p>
                            </div>
                        )}

                        {editingId !== hw.id && (
                            <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingId(hw.id)} className="p-2 bg-card border border-border rounded-lg text-zinc-500 hover:text-[#3066bb] shadow-sm">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDelete(hw.id)} className="p-2 bg-card border border-border rounded-lg text-zinc-500 hover:text-red-500 shadow-sm">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {hardwares.length === 0 && !loading && !isAdding && (
                <div className="p-12 text-center border border-border rounded-2xl bg-card border-dashed">
                    <Cpu className="text-muted-foreground/50 w-12 h-12 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-foreground">No Hardware Configured</h3>
                    <p className="text-muted-foreground text-sm mt-1 mb-6">Create the first quantum system to populate the dropdowns.</p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-[#3066bb] hover:bg-[#255299] text-white px-5 py-2.5 rounded-xl font-bold transition-all mx-auto shadow-lg"
                    >
                        Add Simulator
                    </button>
                </div>
            )}
        </div>
    );
}
