"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Newspaper, Loader2, Newspaper as NewspaperIcon, Info, X, ArrowRight, FileText, Sparkles } from 'lucide-react';
import { getDbNews } from '@/app/actions/news-automation';
// import QuantumHeatMap from './QuantumHeatMap';

interface NewsItem {
    id: number | string;
    title: string;
    source: string;
    time: string;
    impact: string;
    trend: string;
    summary?: string;
    quantumExposureScore?: number;
    url?: string;
}

interface MarketNewsProps {
    onSelect?: (news: NewsItem) => void;
}

export default function MarketNews({ onSelect }: MarketNewsProps) {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
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
            <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Newspaper className="text-green-500 dark:text-green-400" size={18} /> Quantum News
                </h3>
                <button
                    onClick={async () => {
                        if (isRefreshing) return;
                        setIsRefreshing(true);
                        try {
                            await axios.get('/api/admin/news/refresh');
                            // Refresh current list from page 1
                            setNews([]);
                            setPage(1);
                            setHasMore(true);
                            await loadNews(1);
                        } catch (err) {
                            console.error("Refresh failed:", err);
                        } finally {
                            setIsRefreshing(false);
                        }
                    }}
                    disabled={isRefreshing}
                    className={`p-1.5 rounded-lg border border-border bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Refresh News Summaries"
                >
                    <Sparkles size={14} className={isRefreshing ? 'animate-spin text-[#3066bb]' : ''} />
                </button>
            </div>

            {/* <div className="p-4 border-b border-border/10">
                <QuantumHeatMap />
            </div> */}

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-border">
                {isLoading && news.length === 0 ? (
                    Array(5).fill(0).map((_, i) => (
                        <div key={i} className="p-4 bg-transparent border border-transparent rounded-xl flex flex-col gap-3">
                            <div className="flex justify-between items-start mb-1">
                                <div className="h-3 w-16 bg-muted rounded animate-pulse"></div>
                                <div className="h-3 w-8 bg-muted rounded animate-pulse"></div>
                            </div>
                            <div className="h-4 w-5/6 bg-muted rounded animate-pulse"></div>
                            <div className="h-4 w-4/6 bg-muted rounded animate-pulse"></div>
                            <div className="mt-2 border-t border-border/30 pt-3 flex justify-between">
                                <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
                                <div className="h-6 w-24 bg-muted rounded animate-pulse"></div>
                            </div>
                        </div>
                    ))
                ) : (
                    news.map((item, index) => {
                        const isLastElement = news.length === index + 1;
                        return (
                            <div
                                key={`${item.id}-${index}`}
                                ref={isLastElement ? lastNewsElementRef : null}
                                onClick={() => setSelectedSummaryItem(item)}
                                className="p-4 bg-transparent border border-transparent text-muted-foreground hover:bg-card hover:border-ring hover:text-foreground hover:shadow-md transition-all duration-200 rounded-xl group relative overflow-hidden flex flex-col gap-2 cursor-pointer"
                            >
                                <div className="flex flex-col gap-2">
                                    <span className="text-[12px] font-medium tracking-wider text-muted-foreground group-hover:text-[#3066bb] transition-colors">{item.source}</span>

                                    <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                        {item.title}
                                    </h4>

                                    <div className="pt-2 mt-1 border-t border-border/20">
                                        <span className={`text-sm font-medium tracking-wide ${(item.quantumExposureScore || 0) >= 4 ? 'text-green-500' :
                                            (item.quantumExposureScore || 0) >= 2 ? 'text-orange-500' :
                                                'text-red-500'
                                            }`}>
                                            Quantum exposure: {item.quantumExposureScore || 0}/5
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {isLoading && news.length > 0 && (
                    <div className="flex flex-col items-center justify-center p-4 text-[#3066bb] space-y-3">
                        <Loader2 className="animate-spin text-[#3066bb]" size={24} />
                        <span className="text-xs font-mono animate-pulse">Loading...</span>
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
                        className="bg-card border border-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                            <div className="flex items-center gap-2 text-[#3066bb] font-semibold">
                                <Sparkles size={16} />
                                <span>Quantum Guru Insight</span>
                            </div>
                            <button
                                onClick={() => setSelectedSummaryItem(null)}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-border">
                            <div className="flex items-center gap-3 mb-4 text-[14px] font-semibold text-muted-foreground">
                                <span className="text-blue-600 dark:text-blue-400">{selectedSummaryItem.source}</span>
                            </div>

                            <h4 className="text-xl md:text-2xl font-bold leading-tight mb-6 text-foreground">
                                {selectedSummaryItem.title}
                            </h4>

                            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-4">
                                {selectedSummaryItem.summary ? (
                                    selectedSummaryItem.summary
                                        .replace(/<[^>]*>?/gm, '') // Strip HTML tags
                                        .split('\\n')
                                        .map((para, i) => (
                                            <p key={i}>{para}</p>
                                        ))
                                ) : (
                                    <p className="italic text-muted-foreground/70">No automated summary available for this article.</p>
                                )}
                            </div>
                        </div>

                        {selectedSummaryItem.url && selectedSummaryItem.url !== '#' && (
                            <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
                                <a
                                    href={selectedSummaryItem.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-[#3066bb] hover:bg-[#255296] text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-[#3066bb]/20"
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
