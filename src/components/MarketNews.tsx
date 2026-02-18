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
                <h3 className="text-foreground mb-4 flex items-center gap-2">
                    <Newspaper className="text-blue-400" size={18} /> Quantum News Feed
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
                    news.map((item) => (
                        <div
                            key={item.id}
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
                            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>{item.time}</span>
                                <span className={`px-1 rounded border ${item.impact === 'high' ? 'border-red-500/30 text-red-400' : 'border-border'}`}>
                                    {item.impact.toUpperCase()}
                                </span>
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


        </div>
    );
}
