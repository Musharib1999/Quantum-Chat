"use client";

import React from 'react';
import { Newspaper, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface NewsItem {
    id: number;
    title: string;
    source: string;
    time: string;
    impact: string;
    trend: string;
}

interface MarketNewsProps {
    news: NewsItem[];
    isLoading: boolean;
    onSelect?: (news: NewsItem) => void;
}

export default function MarketNews({ news, isLoading, onSelect }: MarketNewsProps) {
    return (
        <div className="flex flex-col h-full bg-card/30">
            <div className="p-6 border-b border-border">
                <h3 className="text-sm uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <Newspaper size={14} className="text-primary" />
                    Latest Market News
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                    // Loading State
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-secondary/20 border border-border/30 animate-pulse">
                            <div className="flex justify-between mb-4">
                                <div className="h-2 w-16 bg-muted-foreground/20 rounded"></div>
                                <div className="h-2 w-10 bg-muted-foreground/20 rounded"></div>
                            </div>
                            <div className="h-4 w-full bg-muted-foreground/20 rounded mb-2"></div>
                            <div className="h-4 w-2/3 bg-muted-foreground/20 rounded"></div>
                        </div>
                    ))
                ) : news.length > 0 ? (
                    news.map((newsItem) => (
                        <div
                            key={newsItem.id}
                            className="group p-4 rounded-2xl bg-secondary/30 border border-border/50 hover:border-primary/20 transition-all cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className="text-[10px] text-primary/60 uppercase tracking-widest">{newsItem.source}</span>
                                <span className="text-[10px] text-muted-foreground">{newsItem.time}</span>
                            </div>

                            <h4 className="text-sm text-foreground leading-tight mb-3 group-hover:text-primary transition-colors">
                                {newsItem.title}
                            </h4>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {newsItem.trend === 'up' ? (
                                        <div className="flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                            <TrendingUp size={10} /> POSITIVE
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-[10px] text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                                            <TrendingDown size={10} /> VOLATILE
                                        </div>
                                    )}
                                </div>
                                <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                        <Newspaper size={32} className="text-muted-foreground/20 mb-4" />
                        <p className="text-xs text-muted-foreground">No recent news found.</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-border bg-secondary/20">
                <p className="text-[10px] text-center text-muted-foreground tracking-wide">
                    REAL-TIME QUANTUM NEWS FEED • ENCRYPTED
                </p>
            </div>
        </div>
    );
}
