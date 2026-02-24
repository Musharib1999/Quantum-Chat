"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Newspaper, Loader2, Newspaper as NewspaperIcon, Info, X, ArrowRight, FileText } from 'lucide-react';
import { getDbNews } from '@/app/actions/news-automation';

interface NewsItem {
    id: number;
    title: string;
    source: string;
    time: string;
    impact: string;
    trend: string;
    summary?: string;
    url?: string;
}

interface MarketNewsProps {
    onSelect?: (news: NewsItem) => void;
}

export default function MarketNews({ onSelect }: MarketNewsProps) {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [selectedSummaryItem, setSelectedSummaryItem] = useState<NewsItem | null>(null);
    const observer = useRef<IntersectionObserver | null>(null);

    const loadNews = useCallback(async (pageNum: number) => {
        if (isLoading || !hasMore) return;

        setIsLoading(true);
        try {
            const result = await getDbNews(20, pageNum);
            if (result.news.length === 0) {
                setHasMore(false);
            } else {
                setNews(prev => {
                    // Avoid duplicates by checking title/id
                    const newItems = result.news.filter(
                        (newItem: any) => !prev.some(oldItem => oldItem.title === newItem.title)
                    );
                    return [...prev, ...newItems];
                });
                setHasMore(result.hasMore);
            }
        } catch (error) {
            console.error("Failed to load news:", error);
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, hasMore]);

    // Initial load
    useEffect(() => {
        loadNews(1);
    }, []);

    const lastNewsElementRef = useCallback((node: HTMLDivElement) => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => {
                    const nextPage = prevPage + 1;
                    loadNews(nextPage);
                    return nextPage;
                });
            }
        });

        if (node) observer.current.observe(node);
    }, [isLoading, hasMore, loadNews]);

    return (
        <div className="flex flex-col h-full bg-card/30">
            <div className="p-6 border-b border-border">
                <h3 className="text-foreground mb-4 flex items-center gap-2">
                    <Newspaper className="text-blue-400" size={18} /> Quantum News Feed
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-border">
                {news.map((item, index) => {
                    const isLastElement = news.length === index + 1;
                    return (
                        <div
                            key={`${item.id}-${index}`}
                            ref={isLastElement ? lastNewsElementRef : null}
                            className="p-4 bg-card/40 rounded-xl border border-border/50 hover:bg-accent/5 transition-all group relative overflow-hidden flex flex-col gap-2"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{item.source}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.trend === 'up' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                    {item.trend === 'up' ? '▲' : '▼'}
                                </span>
                            </div>
                            <h4
                                className="text-sm font-medium leading-normal group-hover:text-blue-400 transition-colors line-clamp-3 cursor-pointer"
                                onClick={() => setSelectedSummaryItem(item)}
                            >
                                {item.title}
                            </h4>

                            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/30 pt-3">
                                <span>{item.time}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedSummaryItem(item); }}
                                    className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium bg-blue-400/10 px-2.5 py-1 rounded hover:bg-blue-400/20 transition-colors"
                                >
                                    <FileText size={12} /> Show Summary
                                </button>
                            </div>
                        </div>

                    );
                })}

                {isLoading && (
                    <div className="flex justify-center p-4">
                        <Loader2 className="animate-spin text-blue-400" size={24} />
                    </div>
                )}

                {!isLoading && news.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                        <NewspaperIcon size={32} className="text-muted-foreground/20 mb-4" />
                        <p className="text-xs text-muted-foreground">No recent news found.</p>
                    </div>
                )}
            </div>

            {/* Read Summary Modal */}
            {selectedSummaryItem && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedSummaryItem(null)}
                >
                    <div
                        className="bg-[#0f172a] border border-white/10 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
                            <div className="flex items-center gap-2 text-blue-400 font-semibold">
                                <FileText size={16} />
                                <span>Quantum Insight</span>
                            </div>
                            <button
                                onClick={() => setSelectedSummaryItem(null)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-white/10">
                            <div className="flex items-center gap-3 mb-4 text-xs font-mono text-slate-400">
                                <span className="uppercase text-blue-400">{selectedSummaryItem.source}</span>
                                <span>•</span>
                                <span>{selectedSummaryItem.time}</span>
                            </div>

                            <h4 className="text-xl md:text-2xl font-bold leading-tight mb-6 text-white">
                                {selectedSummaryItem.title}
                            </h4>

                            <div className="text-[15px] leading-relaxed text-slate-300 space-y-4">
                                {selectedSummaryItem.summary ? (
                                    selectedSummaryItem.summary.split('\\n').map((para, i) => (
                                        <p key={i}>{para}</p>
                                    ))
                                ) : (
                                    <p className="italic text-slate-500">No automated summary available for this article.</p>
                                )}
                            </div>
                        </div>

                        {selectedSummaryItem.url && selectedSummaryItem.url !== '#' && (
                            <div className="p-4 border-t border-white/10 bg-slate-900 flex justify-end">
                                <a
                                    href={selectedSummaryItem.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
                                >
                                    Read Full Article <ArrowRight size={14} />
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
