"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash, ExternalLink, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Stock {
    _id: string;
    name: string;
    url: string;
}

export default function StockManager() {
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
                <h2 className="text-xl font-semibold text-white">Stock Watchlist</h2>
            </div>

            {/* Add Form */}
            <form onSubmit={handleAdd} className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Stock Name (e.g. IonQ Inc.)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                    <input
                        type="text"
                        placeholder="Analysis URL"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting || !newName || !newUrl}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add Stock
                </button>
            </form>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                    <table className="w-full text-left text-sm text-zinc-300">
                        <thead className="bg-white/5 text-zinc-100">
                            <tr>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Link</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {stocks.map((stock) => (
                                <tr key={stock._id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3">{stock.name}</td>
                                    <td className="px-4 py-3">
                                        <a href={stock.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                            View <ExternalLink size={12} />
                                        </a>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDelete(stock._id)} className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded">
                                            <Trash size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {stocks.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No stocks added yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
