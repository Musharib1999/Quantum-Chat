"use client";

import React, { useState, useEffect } from 'react';
import { BookOpen, Search, ExternalLink, FileText } from 'lucide-react';
import axios from 'axios';

interface Article {
    _id: string;
    title: string;
    category: string;
    url: string;
}

interface ArticleSidebarProps {
    onSelect: (article: Article) => void;
    activeArticleId?: string;
}

export default function ArticleSidebar({ onSelect, activeArticleId }: ArticleSidebarProps) {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        axios.get('/api/articles')
            .then(res => setArticles(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const categories = ['All', ...Array.from(new Set(articles.map(a => a.category)))];
    const filtered = articles.filter(a =>
        (filter === 'All' || a.category === filter) &&
        a.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border space-y-4">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="text-blue-400" size={18} /> Article & Learn
                </h3>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                        className="w-full bg-secondary/30 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500/50 transition-colors"
                        placeholder="Search research..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${filter === cat
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                : 'bg-secondary/20 text-muted-foreground border-transparent hover:bg-secondary/40'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">Loading library...</div>
                ) : filtered.map(article => (
                    <button
                        key={article._id}
                        onClick={() => onSelect(article)}
                        className={`w-full text-left px-3 py-3 rounded-lg border transition-all group ${activeArticleId === article._id
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            : 'bg-transparent border-transparent hover:bg-white/5 text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <FileText size={16} className={`shrink-0 mt-0.5 ${activeArticleId === article._id ? 'text-blue-400' : 'text-muted-foreground/50'}`} />
                            <div className="min-w-0">
                                <div className="font-medium text-sm leading-snug break-words">{article.title}</div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{article.category}</span>
                                    {article.url && (
                                        <a href={article.url} target="_blank" rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="text-[10px] opacity-50 flex items-center gap-0.5 hover:text-blue-400 hover:opacity-100 transition-opacity">
                                            Link <ExternalLink size={8} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
