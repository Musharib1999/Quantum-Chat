"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, Plus, Loader2, Globe } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '@/components/ThemeContext';

interface BlockedSource {
    _id: string;
    name: string;
    createdAt: string;
}

export default function BlockedSourceManager() {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [sources, setSources] = useState<BlockedSource[]>([]);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

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

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setAdding(true);
        try {
            const res = await axios.post('/api/admin/blocked-sources', { name: newName.trim() });
            setSources([res.data, ...sources]);
            setNewName('');
        } catch (error) {
            console.error('Failed to add blocked source', error);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
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
                    <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <ShieldAlert className="text-red-500" size={24} /> News Portal Blocklist
                    </h2>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Blocked portals will have their news stored in the database but hidden from the frontend.
                    </p>
                </div>
            </div>

            {/* Add Form */}
            <form onSubmit={handleAdd} className={`p-4 rounded-xl border flex gap-3 ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Enter portal name (e.g. Google News, Reuters)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#3066bb] ${isDarkMode ? 'bg-slate-800 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    />
                </div>
                <button
                    type="submit"
                    disabled={adding || !newName.trim()}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-sm"
                >
                    {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Block Portal
                </button>
            </form>

            {/* List */}
            <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                <table className={`w-full text-left text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <thead className={isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-50 text-slate-900'}>
                        <tr>
                            <th className="px-5 py-4 font-medium">Portal Name</th>
                            <th className="px-5 py-4 font-medium">Added At</th>
                            <th className="px-5 py-4 font-medium text-right w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                        {loading ? (
                            <tr>
                                <td colSpan={3} className="px-5 py-12 text-center">
                                    <Loader2 className="animate-spin w-6 h-6 mx-auto mb-2 text-slate-500" />
                                    Loading blocklist...
                                </td>
                            </tr>
                        ) : sources.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-5 py-12 text-center text-slate-500">
                                    No portals blocked yet.
                                </td>
                            </tr>
                        ) : (
                            sources.map((source) => (
                                <tr key={source._id} className={`group transition-colors ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                                    <td className="px-5 py-4 font-medium tracking-tight">
                                        {source.name}
                                    </td>
                                    <td className="px-5 py-4 text-xs opacity-60 font-sans">
                                        {new Date(source.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(source._id)}
                                            className="text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Unblock Portal"
                                        >
                                            <Trash2 size={16} />
                                        </button>
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

