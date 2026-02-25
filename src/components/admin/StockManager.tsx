"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash, ExternalLink, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '@/components/ThemeContext';

interface Stock {
    _id: string;
    name: string;
    url: string;
}

export default function StockManager() {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [stocks, setStocks] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchStocks();
    }, []);

    const fetchStocks = async () => {
        try {
            const res = await axios.get('/api/stocks');
            setStocks(res.data);
        } catch (error) {
            console.error('Failed to fetch stocks', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newUrl) return;

        setIsSubmitting(true);
        try {
            const res = await axios.post('/api/stocks', { name: newName, url: newUrl });
            setStocks([...stocks, res.data]);
            setNewName('');
            setNewUrl('');
        } catch (error) {
            console.error('Failed to add stock', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await axios.delete(`/api/stocks?id=${id}`);
            setStocks(stocks.filter(s => s._id !== id));
        } catch (error) {
            console.error('Failed to delete stock', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Stock Watchlist</h2>
            </div>

            {/* Add Form */}
            <form onSubmit={handleAdd} className={`p-4 rounded-lg border space-y-4 ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Stock Name (e.g. IonQ Inc.)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className={`border rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3066bb] ${isDarkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    />
                    <input
                        type="text"
                        placeholder="Analysis URL"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        className={`border rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3066bb] ${isDarkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting || !newName || !newUrl}
                    className="bg-[#3066bb] hover:bg-[#255299] text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add Stock
                </button>
            </form>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className={`animate-spin ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} /></div>
            ) : (
                <div className={`rounded-lg border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                    <table className={`w-full text-left text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        <thead className={isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-50 text-slate-900'}>
                            <tr>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Link</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                            {stocks.map((stock) => (
                                <tr key={stock._id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                                    <td className="px-4 py-3">{stock.name}</td>
                                    <td className="px-4 py-3">
                                        <a href={stock.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 ${isDarkMode ? 'text-[#3066bb] hover:text-[#255299]' : 'text-[#3066bb] hover:text-[#255299]'}`}>
                                            View <ExternalLink size={12} />
                                        </a>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDelete(stock._id)} className="text-red-500 hover:text-red-400 p-1 hover:bg-red-500/10 rounded">
                                            <Trash size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {stocks.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">No stocks added yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
