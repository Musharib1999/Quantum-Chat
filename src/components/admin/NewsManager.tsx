"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface NewsItem {
    _id: string;
    title: string;
    description: string;
    url: string;
    publishedAt: string;
    source?: string;
}

export default function NewsManager() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [source, setSource] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        fetchNews();
    }, []);

    const fetchNews = async () => {
        try {
            const res = await axios.get('/api/news');
            setNews(res.data);
        } catch (error) {
            console.error('Failed to fetch news', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setUrl('');
        setSource('');
        setEditingId(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !url) return;

        setIsSubmitting(true);
        try {
            if (editingId) {
                const res = await axios.put(`/api/news?id=${editingId}`, { title, description, url, source });
                setNews(news.map(n => n._id === editingId ? res.data : n));
            } else {
                const res = await axios.post('/api/news', { title, description, url, source });
                setNews([res.data, ...news]);
            }
            resetForm();
        } catch (error) {
            console.error('Failed to save news item', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (item: NewsItem) => {
        setTitle(item.title);
        setDescription(item.description);
        setUrl(item.url);
        setSource(item.source || '');
        setEditingId(item._id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this news item?")) return;
        try {
            await axios.delete(`/api/news?id=${id}`);
            setNews(news.filter(n => n._id !== id));
        } catch (error) {
            console.error('Failed to delete news item', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Quantum news feed</h2>
            </div>

            {/* Add/Edit Form */}
            <form onSubmit={handleSave} className="p-6 rounded-2xl border border-[#3066bb]/30 bg-white space-y-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="News title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="border border-[#3066bb]/30 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#3066bb] bg-[#3066bb]/5 text-slate-900"
                    />
                    <input
                        type="text"
                        placeholder="Source (e.g. Google News)"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="border border-[#3066bb]/30 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#3066bb] bg-[#3066bb]/5 text-slate-900"
                    />
                </div>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Article url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full border border-[#3066bb]/30 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#3066bb] bg-[#3066bb]/5 text-slate-900"
                    />
                    <textarea
                        placeholder="Short description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full border border-[#3066bb]/30 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#3066bb] resize-none bg-[#3066bb]/5 text-slate-900"
                    />
                </div>
                <div className="flex gap-2 pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting || !title || !url}
                        className="bg-[#3066bb] hover:bg-[#255299] text-white px-8 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : editingId ? 'Update news' : 'Add news item'}
                    </button>
                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-6 py-2.5 text-slate-500 hover:text-slate-900 text-sm font-semibold transition-all"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            {/* News List */}
            <div className="border border-[#3066bb]/30 rounded-xl overflow-hidden bg-white shadow-sm">
                {loading ? (
                    <div className="p-12 text-center text-sm text-slate-400">Loading news items...</div>
                ) : news.length === 0 ? (
                    <div className="p-12 text-center text-sm text-slate-500">No news found. add one above.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {news.map((item) => (
                            <div key={item._id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-[#3066bb]/5 transition-colors group">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <h4 className="font-semibold text-slate-900 truncate">
                                            {item.title}
                                        </h4>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#3066bb]/10 text-slate-600">
                                            {item.source || 'Standard source'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                                        {item.description}
                                    </p>
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2.5 text-xs text-[#3066bb] hover:underline">
                                        Read full article
                                    </a>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item._id)}
                                        className="text-red-500 hover:text-red-600 font-semibold text-xs transition-colors"
                                    >
                                        Delete
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
