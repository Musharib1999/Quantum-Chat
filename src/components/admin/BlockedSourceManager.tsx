"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface BlockedSource {
    _id: string;
    name: string;
    createdAt: string;
}

export default function BlockedSourceManager() {
    const [sources, setSources] = useState<BlockedSource[]>([]);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        fetchSources();
    }, []);

    const fetchSources = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/blocked-sources');
            setSources(res.data);
        } catch (error) {
            console.error('Failed to fetch blocked sources', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setEditingId(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            if (editingId) {
                const res = await axios.put(`/api/admin/blocked-sources?id=${editingId}`, { name: name.trim() });
                setSources(sources.map(s => s._id === editingId ? res.data : s));
            } else {
                const res = await axios.post('/api/admin/blocked-sources', { name: name.trim() });
                setSources([res.data, ...sources]);
            }
            resetForm();
        } catch (error) {
            console.error('Failed to save blocked source', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (source: BlockedSource) => {
        setName(source.name);
        setEditingId(source._id);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to unblock this source?")) return;
        try {
            await axios.delete(`/api/admin/blocked-sources?id=${id}`);
            setSources(sources.filter(s => s._id !== id));
        } catch (error) {
            console.error('Failed to delete blocked source', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-[#0F172A]">News portal blocklist</h2>
                    <p className="text-sm mt-1 text-[#0F172A]">
                        Blocked portals will have their news stored in the database but hidden from the frontend.
                    </p>
                </div>
            </div>

            {/* Add/Edit Form */}
            <form onSubmit={handleSave} className="p-4 rounded-xl border border-[rgb(27,176,206)]/30 flex gap-3 bg-white shadow-sm">
                <input
                    type="text"
                    placeholder="Enter portal name (e.g. Google News, Reuters)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[rgb(27,176,206)]/30 text-sm transition-all focus:outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] bg-[rgb(27,176,206)]/5 text-[#0F172A]"
                />
                <button
                    type="submit"
                    disabled={isSubmitting || !name.trim()}
                    className="bg-[rgb(27,176,206)] hover:bg-[#255299] text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                    {isSubmitting ? 'Saving...' : editingId ? 'Update portal' : 'Block portal'}
                </button>
                {editingId && (
                    <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2.5 text-[#0F172A] hover:text-[#0F172A] text-sm font-semibold"
                    >
                        Cancel
                    </button>
                )}
            </form>

            {/* List */}
            <div className="rounded-xl border border-[rgb(27,176,206)]/30 overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left text-sm text-[#0F172A]">
                    <thead className="bg-[rgb(27,176,206)]/5 text-[#0F172A] border-b border-[rgb(27,176,206)]/30">
                        <tr>
                            <th className="px-5 py-4 font-semibold">Portal name</th>
                            <th className="px-5 py-4 font-semibold">Added at</th>
                            <th className="px-5 py-4 font-semibold text-right w-40">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={3} className="px-5 py-12 text-center text-[#0F172A]">
                                    Loading blocklist...
                                </td>
                            </tr>
                        ) : sources.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-5 py-12 text-center text-[#0F172A]">
                                    No portals blocked yet.
                                </td>
                            </tr>
                        ) : (
                            sources.map((source) => (
                                <tr key={source._id} className="group transition-colors hover:bg-[rgb(27,176,206)]/5">
                                    <td className="px-5 py-4 font-semibold text-[#0F172A]">
                                        {source.name}
                                    </td>
                                    <td className="px-5 py-4 text-xs text-[#0F172A]">
                                        {new Date(source.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => handleEdit(source)}
                                                className="text-[#0F172A] hover:text-[#0F172A] font-semibold text-xs"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(source._id)}
                                                className="text-red-500 hover:text-red-600 font-semibold text-xs"
                                            >
                                                Unblock
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

