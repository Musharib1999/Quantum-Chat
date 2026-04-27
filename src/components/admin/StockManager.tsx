"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Stock {
    _id: string;
    name: string;
    url: string;
}

export default function StockManager() {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

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

    const resetForm = () => {
        setName('');
        setUrl('');
        setEditingId(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !url) return;

        setIsSubmitting(true);
        try {
            if (editingId) {
                const res = await axios.put(`/api/stocks?id=${editingId}`, { name, url });
                setStocks(stocks.map(s => s._id === editingId ? res.data : s));
            } else {
                const res = await axios.post('/api/stocks', { name, url });
                setStocks([...stocks, res.data]);
            }
            resetForm();
        } catch (error) {
            console.error('Failed to save stock', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (stock: Stock) => {
        setName(stock.name);
        setUrl(stock.url);
        setEditingId(stock._id);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this stock?")) return;
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
                <h2 className="text-xl font-semibold text-[#0F172A]">Stock watchlist</h2>
            </div>

            {/* Add/Edit Form */}
            <form onSubmit={handleSave} className="p-4 rounded-lg border space-y-4 bg-white border-[rgb(27,176,206)]/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Stock name (e.g. IonQ Inc.)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border rounded px-3 py-2 text-sm focus:outline-none focus:border-[rgb(27,176,206)] bg-[rgb(27,176,206)]/5 border-[rgb(27,176,206)]/30 text-[#0F172A]"
                    />
                    <input
                        type="text"
                        placeholder="Analysis url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="border rounded px-3 py-2 text-sm focus:outline-none focus:border-[rgb(27,176,206)] bg-[rgb(27,176,206)]/5 border-[rgb(27,176,206)]/30 text-[#0F172A]"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={isSubmitting || !name || !url}
                        className="bg-[rgb(27,176,206)] hover:bg-[#255299] text-white px-6 py-2 rounded text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isSubmitting ? 'Saving...' : editingId ? 'Update stock' : 'Add stock'}
                    </button>
                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-6 py-2 text-[#0F172A] hover:text-[#0F172A] text-sm font-semibold transition-all"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-8 text-[#0F172A] text-sm">Loading stocks...</div>
            ) : (
                <div className="rounded-lg border overflow-hidden bg-white border-[rgb(27,176,206)]/30">
                    <table className="w-full text-left text-sm text-[#0F172A]">
                        <thead className="bg-[rgb(27,176,206)]/5 text-[#0F172A] border-b border-[rgb(27,176,206)]/30">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Name</th>
                                <th className="px-4 py-3 font-semibold">Link</th>
                                <th className="px-4 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {stocks.map((stock) => (
                                <tr key={stock._id} className="transition-colors hover:bg-[rgb(27,176,206)]/5">
                                    <td className="px-4 py-3 text-[#0F172A] font-medium">{stock.name}</td>
                                    <td className="px-4 py-3">
                                        <a href={stock.url} target="_blank" rel="noopener noreferrer" className="text-[rgb(27,176,206)] hover:underline">
                                            View analyst report
                                        </a>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => handleEdit(stock)}
                                                className="text-[#0F172A] hover:text-[#0F172A] font-semibold text-xs"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(stock._id)}
                                                className="text-red-500 hover:text-red-600 font-semibold text-xs"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {stocks.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-[#0F172A]">No stocks added yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
