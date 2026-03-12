"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Article {
    _id: string;
    title: string;
    description: string;
    category: string;
    content: string;
    author: string;
}

const CATEGORIES = ['Quantum Physics', 'Computing', 'Algorithm', 'Hardware', 'Software', 'General'];

export default function ArticleManager() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [description, setDescription] = useState('');
    const [content, setContent] = useState('');
    const [author, setAuthor] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

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

    const resetForm = () => {
        setTitle('');
        setCategory(CATEGORIES[0]);
        setDescription('');
        setContent('');
        setAuthor('');
        setEditingId(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) return;

        setIsSubmitting(true);
        try {
            if (editingId) {
                const res = await axios.put(`/api/articles?id=${editingId}`, { title, category, description, content, author });
                setArticles(articles.map(a => a._id === editingId ? res.data : a));
            } else {
                const res = await axios.post('/api/articles', { title, category, description, content, author });
                setArticles([res.data, ...articles]);
            }
            resetForm();
        } catch (error) {
            console.error('Failed to save article', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (article: Article) => {
        setTitle(article.title);
        setCategory(article.category);
        setDescription(article.description);
        setContent(article.content);
        setAuthor(article.author);
        setEditingId(article._id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this article?")) return;
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
                <h2 className="text-xl font-semibold text-slate-900">Quantum research articles</h2>
            </div>

            {/* Add/Edit Form */}
            <form onSubmit={handleSave} className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Article title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#3066bb] bg-slate-50 text-slate-900"
                    />
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#3066bb] bg-slate-50 text-slate-900"
                    >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Author"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#3066bb] bg-slate-50 text-slate-900"
                    />
                    <textarea
                        placeholder="Short description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#3066bb] resize-none bg-slate-50 text-slate-900"
                    />
                    <textarea
                        placeholder="Full article content (markdown supported)"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={6}
                        className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#3066bb] resize-none bg-slate-50 text-slate-900"
                    />
                </div>
                <div className="flex gap-2 pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting || !title || !content}
                        className="bg-[#3066bb] hover:bg-[#255299] text-white px-8 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : editingId ? 'Update article' : 'Add article'}
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

            {/* Article List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                {loading ? (
                    <div className="p-12 text-center text-sm text-slate-400">Loading articles...</div>
                ) : articles.length === 0 ? (
                    <div className="p-12 text-center text-sm text-slate-500">No articles found. add one above.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {articles.map((article) => (
                            <div key={article._id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-slate-50 transition-colors group">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <h4 className="font-semibold text-slate-900 truncate">
                                            {article.title}
                                        </h4>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                            {article.category}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-2">By {article.author}</p>
                                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                                        {article.description}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <button
                                        onClick={() => handleEdit(article)}
                                        className="text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(article._id)}
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
