"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Newspaper, Loader2, Newspaper as NewspaperIcon, Info } from 'lucide-react';
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
    const observer = useRef<IntersectionObserver | null>(null);

    const loadNews = useCallback(async (pageNum: number) => {
        if (isLoading || !hasMore) return;

        setIsLoading(true);
        try {
            const result = await getLatestNews(undefined, pageNum, 20);
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
                            onClick={() => onSelect?.(item)}
                            className="p-3 bg-card/50 rounded-lg border border-border/50 hover:bg-accent/10 hover:border-blue-500/50 cursor-pointer transition-all group"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{item.source}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.trend === 'up' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {item.trend === 'up' ? '▲' : '▼'}
                                </span>
                            </div>
                            <h4 className="text-sm font-medium leading-snug group-hover:text-blue-400 transition-colors line-clamp-2">
                                {item.title}
                            </h4>
                            {item.summary && (
                                <p className="mt-2 text-[11px] text-muted-foreground/80 line-clamp-3 italic border-l border-blue-500/30 pl-2">
                                    {item.summary.length > 150 ? item.summary.substring(0, 150) + "..." : item.summary}
                                </p>
                            )}
                            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>{item.time}</span>
                                <span className={`px-1 rounded border ${item.impact === 'high' ? 'border-red-500/30 text-red-400' : 'border-border'}`}>
                                    {item.impact.toUpperCase()}
                                </span>
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
        </div>
    );
}
