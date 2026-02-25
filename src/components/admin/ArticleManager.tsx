"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash, ExternalLink, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '@/components/ThemeContext';

interface Article {
    _id: string;
    title: string;
    category: string;
    url: string;
}

const CATEGORIES = ['Research', 'News', 'Analysis', 'Tutorial'];

export default function ArticleManager() {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

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
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Research Library</h2>
            </div>

            {/* Add Form */}
            <form onSubmit={handleAdd} className={`p-4 rounded-lg border space-y-4 ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Article Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={`md:col-span-1 border rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3066bb] ${isDarkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    />
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={`border rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3066bb] ${isDarkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input
                        type="text"
                        placeholder="Source URL"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className={`border rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3066bb] ${isDarkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting || !title || !url}
                    className="bg-[#3066bb] hover:bg-[#255299] text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add Article
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
                                <th className="px-4 py-3 font-medium">Title</th>
                                <th className="px-4 py-3 font-medium">Category</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                            {articles.map((article) => (
                                <tr key={article._id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                                    <td className="px-4 py-3">
                                        <div className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{article.title}</div>
                                        <a href={article.url} target="_blank" rel="noopener noreferrer" className={`text-xs underline underline-offset-2 ${isDarkMode ? 'text-[#3066bb] hover:text-[#255299]' : 'text-[#3066bb] hover:text-[#255299]'}`}>
                                            {article.url}
                                        </a>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{article.category}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDelete(article._id)} className="text-red-500 hover:text-red-400 p-1 hover:bg-red-500/10 rounded">
                                            <Trash size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {articles.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">No articles found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
