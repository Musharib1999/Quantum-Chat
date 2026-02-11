"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash, ExternalLink, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Article {
    _id: string;
    title: string;
    category: string;
    url: string;
}

const CATEGORIES = ['Research', 'News', 'Analysis', 'Tutorial'];

export default function ArticleManager() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [url, setUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const res = await axios.get('/api/articles');
            setArticles(res.data);
        } catch (error) {
            console.error('Failed to fetch articles', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !url) return;

        setIsSubmitting(true);
        try {
            const res = await axios.post('/api/articles', { title, category, url });
            setArticles([res.data, ...articles]);
            setTitle('');
            setUrl('');
        } catch (error) {
            console.error('Failed to add article', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await axios.delete(`/api/articles?id=${id}`);
            setArticles(articles.filter(a => a._id !== id));
        } catch (error) {
            console.error('Failed to delete article', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Research Library</h2>
            </div>

            {/* Add Form */}
            <form onSubmit={handleAdd} className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Article Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="md:col-span-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                        {CATEGORIES.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
                    </select>
                    <input
                        type="text"
                        placeholder="Source URL"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting || !title || !url}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add Article
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
                                <th className="px-4 py-3 font-medium">Title</th>
                                <th className="px-4 py-3 font-medium">Category</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {articles.map((article) => (
                                <tr key={article._id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-zinc-200">{article.title}</div>
                                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2">
                                            {article.url}
                                        </a>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-zinc-300">{article.category}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDelete(article._id)} className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded">
                                            <Trash size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {articles.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No articles found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
