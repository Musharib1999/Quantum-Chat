"use client";

import React, { useState, useEffect } from 'react';
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
    const [label, setLabel] = useState("");
    const [query, setQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

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

    const resetForm = () => {
        setLabel("");
        setQuery("");
        setEditingId(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!label.trim() || !query.trim()) return;
        setIsSubmitting(true);
        try {
            if (editingId) {
                const res = await axios.put(`/api/admin/market-prompts/${editingId}`, {
                    label,
                    query
                });
                setPrompts(prompts.map(p => p._id === editingId ? res.data : p));
            } else {
                const res = await axios.post('/api/admin/market-prompts', {
                    label,
                    query,
                    isActive: true,
                    order: prompts.length
                });
                setPrompts([res.data, ...prompts]);
            }
            resetForm();
        } catch (error) {
            console.error("Failed to save prompt:", error);
        } finally {
            setIsSubmitting(false);
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

    const handleEdit = (prompt: PromptItem) => {
        setEditingId(prompt._id);
        setLabel(prompt.label);
        setQuery(prompt.query);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#0F172A]">Market quick prompts</h2>
            </div>

            {/* Add/Edit Form */}
            <form onSubmit={handleSave} className="p-6 rounded-2xl border border-[rgb(27,176,206)]/30 bg-white space-y-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#0F172A]">Chip label</label>
                        <input
                            type="text"
                            placeholder="e.g. Top Movers"
                            className="w-full p-3 bg-[rgb(27,176,206)]/5 border border-[rgb(27,176,206)]/30 rounded-xl focus:ring-1 focus:ring-[rgb(27,176,206)] outline-none text-sm text-[#0F172A]"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0F172A]">Underlying query (triggers in chat)</label>
                    <input
                        type="text"
                        placeholder="e.g. Show me today's top moving stocks and market sentiment"
                        className="w-full p-3 bg-[rgb(27,176,206)]/5 border border-[rgb(27,176,206)]/30 rounded-xl focus:ring-1 focus:ring-[rgb(27,176,206)] outline-none text-sm text-[#0F172A]"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting || !label.trim() || !query.trim()}
                        className="bg-[rgb(27,176,206)] hover:bg-[#255299] text-white px-8 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : editingId ? 'Update prompt' : 'Add prompt'}
                    </button>
                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-6 py-2.5 text-[#0F172A] hover:text-[#0F172A] text-sm font-semibold"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            {/* List */}
            <div className="border border-[rgb(27,176,206)]/30 rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left text-sm text-[#0F172A]">
                    <thead className="bg-[rgb(27,176,206)]/5 text-[#0F172A] border-b border-[rgb(27,176,206)]/30 font-semibold">
                        <tr>
                            <th className="px-5 py-4 w-1/4">Label</th>
                            <th className="px-5 py-4">Query</th>
                            <th className="px-5 py-4 w-24">Status</th>
                            <th className="px-5 py-4 text-right w-48">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-5 py-12 text-center text-[#0F172A]">
                                    Loading prompts...
                                </td>
                            </tr>
                        ) : prompts.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-5 py-12 text-center text-[#0F172A]">
                                    No prompt chips defined yet.
                                </td>
                            </tr>
                        ) : (
                            prompts.map(prompt => (
                                <tr key={prompt._id} className={`group transition-colors ${prompt.isActive ? 'hover:bg-[rgb(27,176,206)]/5' : 'bg-[rgb(27,176,206)]/5/30 opacity-70'}`}>
                                    <td className="px-5 py-4 font-semibold text-[#0F172A]">
                                        {prompt.label}
                                    </td>
                                    <td className="px-5 py-4 text-xs text-[#0F172A] break-words">
                                        {prompt.query}
                                    </td>
                                    <td className="px-5 py-4">
                                        <button 
                                            onClick={() => handleToggleActive(prompt)}
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${prompt.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-[rgb(27,176,206)]/10 text-[#0F172A] border-[rgb(27,176,206)]/30'}`}
                                        >
                                            {prompt.isActive ? 'Active' : 'Hidden'}
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => handleEdit(prompt)}
                                                className="text-[#0F172A] hover:text-[#0F172A] font-semibold text-xs transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(prompt._id)}
                                                className="text-red-500 hover:text-red-600 font-semibold text-xs transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
