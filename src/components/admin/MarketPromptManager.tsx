"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, FileText, ToggleLeft, ToggleRight, Loader2, ArrowUpCircle } from 'lucide-react';
import axios from 'axios';

interface PromptItem {
    _id: string;
    label: string;
    query: string;
    isActive: boolean;
    order: number;
}

export default function MarketPromptManager() {
    const [prompts, setPrompts] = useState<PromptItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [newLabel, setNewLabel] = useState("");
    const [newQuery, setNewQuery] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState("");
    const [editQuery, setEditQuery] = useState("");

    const fetchPrompts = async () => {
        try {
            const res = await axios.get('/api/admin/market-prompts');
            setPrompts(res.data);
        } catch (error) {
            console.error("Failed to fetch market prompts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrompts();
    }, []);

    const handleAddPrompt = async () => {
        if (!newLabel.trim() || !newQuery.trim()) return;
        setIsSaving(true);
        try {
            const res = await axios.post('/api/admin/market-prompts', {
                label: newLabel,
                query: newQuery,
                isActive: true,
                order: prompts.length
            });
            setPrompts([res.data, ...prompts]);
            setNewLabel("");
            setNewQuery("");
        } catch (error) {
            console.error("Failed to add prompt:", error);
            alert("Error adding prompt");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this prompt?")) return;
        try {
            await axios.delete(`/api/admin/market-prompts/${id}`);
            setPrompts(prompts.filter(p => p._id !== id));
        } catch (error) {
            console.error("Failed to delete prompt:", error);
        }
    };

    const handleToggleActive = async (prompt: PromptItem) => {
        try {
            const res = await axios.put(`/api/admin/market-prompts/${prompt._id}`, {
                isActive: !prompt.isActive
            });
            setPrompts(prompts.map(p => p._id === prompt._id ? res.data : p));
        } catch (error) {
            console.error("Failed to toggle prompt:", error);
        }
    };

    const startEditing = (prompt: PromptItem) => {
        setEditingId(prompt._id);
        setEditLabel(prompt.label);
        setEditQuery(prompt.query);
    };

    const saveEdit = async (id: string) => {
        if (!editLabel.trim() || !editQuery.trim()) return;
        try {
            const res = await axios.put(`/api/admin/market-prompts/${id}`, {
                label: editLabel,
                query: editQuery
            });
            setPrompts(prompts.map(p => p._id === id ? res.data : p));
            setEditingId(null);
        } catch (error) {
            console.error("Failed to update prompt:", error);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-[#3066bb]/10 p-6 rounded-2xl border border-[#3066bb]/20 mb-8 backdrop-blur-md">
                <h3 className="flex items-center gap-2 font-bold text-[#3066bb] text-lg">
                    <ArrowUpCircle size={24} /> UI Prompts (Market Chips)
                </h3>
                <p className="text-[#3066bb]/80 text-sm mt-1">Manage the quick-action chips displayed above the chatbox in the Market module.</p>
            </div>

            {/* Add New Form */}
            <div className="bg-card/70 backdrop-blur-md p-6 rounded-2xl border border-border shadow-md">
                <h4 className="font-bold mb-4 flex items-center gap-2">
                    <Plus size={18} className="text-green-500" /> Add New UI Prompt
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Chip Label</label>
                        <input
                            type="text"
                            placeholder="e.g. Top Movers"
                            className="w-full p-3 bg-secondary/50 border border-border rounded-xl focus:ring-2 focus:ring-[#3066bb] outline-none text-sm placeholder:text-muted-foreground"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-2 flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Underlying Query (Triggers in Chat)</label>
                            <input
                                type="text"
                                placeholder="e.g. Show me today's top moving stocks and market sentiment"
                                className="w-full p-3 bg-secondary/50 border border-border rounded-xl focus:ring-2 focus:ring-[#3066bb] outline-none text-sm placeholder:text-muted-foreground"
                                value={newQuery}
                                onChange={(e) => setNewQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddPrompt()}
                            />
                        </div>
                        <button
                            onClick={handleAddPrompt}
                            disabled={isSaving || !newLabel.trim() || !newQuery.trim()}
                            className="bg-[#3066bb] hover:bg-[#255296] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                            Save
                        </button>
                    </div>
                </div>
            </div>

            {/* Existing List */}
            <div className="space-y-4 pt-4">
                <h4 className="font-bold text-muted-foreground uppercase text-xs tracking-wider">Active Prompts ({prompts.length})</h4>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#3066bb]" />
                    </div>
                ) : prompts.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground bg-secondary/20 rounded-2xl border border-dashed border-border flex flex-col items-center gap-3">
                        <ArrowUpCircle size={32} className="opacity-20" />
                        <p>No prompt chips defined yet.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {prompts.map(prompt => (
                            <div key={prompt._id} className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all backdrop-blur-sm ${prompt.isActive ? 'bg-card border-border shadow-sm' : 'bg-secondary/20 border-border opacity-60'}`}>
                                <div className="flex-1 w-full">
                                    {editingId === prompt._id ? (
                                        <div className="flex flex-col md:flex-row gap-3 w-full">
                                            <input
                                                className="w-full md:w-1/3 p-2 bg-secondary border border-border rounded-lg text-sm"
                                                value={editLabel}
                                                onChange={e => setEditLabel(e.target.value)}
                                                placeholder="Label"
                                            />
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    className="flex-1 p-2 bg-secondary border border-border rounded-lg text-sm"
                                                    value={editQuery}
                                                    onChange={e => setEditQuery(e.target.value)}
                                                    placeholder="Query"
                                                />
                                                <button onClick={() => saveEdit(prompt._id)} className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg">
                                                    <Save size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            <p className={`font-bold text-sm ${prompt.isActive ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{prompt.label}</p>
                                            <p className="text-xs text-muted-foreground break-all">{prompt.query}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 self-end md:self-auto">
                                    {editingId !== prompt._id && (
                                        <button
                                            onClick={() => startEditing(prompt)}
                                            className="p-2 text-zinc-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                            title="Edit Prompt"
                                        >
                                            <FileText size={18} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleToggleActive(prompt)}
                                        className={`p-2 rounded-lg transition-colors ${prompt.isActive ? 'text-green-500 hover:bg-green-500/10' : 'text-zinc-500 hover:bg-zinc-500/10'}`}
                                        title={prompt.isActive ? "Deactivate" : "Activate"}
                                    >
                                        {prompt.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(prompt._id)}
                                        className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Delete Prompt"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
