"use client";

import React, { useState, useEffect } from 'react';
import { X, FileText, TrendingUp, TrendingDown, ExternalLink, Newspaper, Loader2, Award, Info } from 'lucide-react';
import axios from 'axios';

interface NewsItem {
    id: number | string;
    title: string;
    source: string;
    summary?: string;
    url?: string;
}

interface QuantumExposureModalProps {
    isOpen: boolean;
    onClose: () => void;
    stock: {
        _id: string;
        name: string;
        symbol?: string;
        quantumExposureScore?: number;
        patentCount?: number;
        patentLink?: string;
    } | null;
}

export default function QuantumExposureModal({ isOpen, onClose, stock }: QuantumExposureModalProps) {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loadingNews, setLoadingNews] = useState(false);

    useEffect(() => {
        if (isOpen && stock) {
            fetchRecentNews();
        }
    }, [isOpen, stock]);

    const fetchRecentNews = async () => {
        if (!stock) return;
        setLoadingNews(true);
        try {
            // Fetch news relevant to the specific company
            const res = await axios.get(`/api/news?query=${encodeURIComponent(stock.name)}&limit=3`);
            setNews(res.data.news || []);
        } catch (err) {
            console.error("Failed to fetch news for modal:", err);
        } finally {
            setLoadingNews(false);
        }
    };

    if (!isOpen || !stock) return null;

    const getScoreColor = (score: number) => {
        if (score >= 4) return 'text-green-500';
        if (score >= 2) return 'text-orange-500';
        return 'text-red-500';
    };

    const getScoreGlow = (score: number) => {
        if (score >= 4) return 'shadow-[0_0_20px_rgba(34,197,94,0.3)] border-green-500/30';
        if (score >= 2) return 'shadow-[0_0_20px_rgba(249,115,22,0.3)] border-orange-500/30';
        return 'shadow-[0_0_20px_rgba(239,68,68,0.3)] border-red-500/30';
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="bg-card w-full max-w-2xl rounded-3xl border border-border overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Award className="text-blue-500" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-foreground leading-none">{stock.name} Intelligence</h3>
                            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-mono">{stock.symbol || 'QUANTUM HUB'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto max-h-[80vh] custom-scrollbar">
                    {/* Top Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Exposure Score Card */}
                        <div className={`p-6 rounded-2xl border bg-gradient-to-br from-card to-muted/10 ${getScoreGlow(stock.quantumExposureScore || 0)}`}>
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">Quantum Exposure</h4>
                            <div className="flex items-end gap-3">
                                <span className={`text-5xl font-black ${getScoreColor(stock.quantumExposureScore || 0)}`}>
                                    {stock.quantumExposureScore || 0}
                                </span>
                                <span className="text-lg font-bold text-muted-foreground mb-1">/ 5</span>
                                <div className="ml-auto flex gap-1 mb-2">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <div
                                            key={s}
                                            className={`w-1.5 h-6 rounded-full transition-all duration-500 ${s <= (stock.quantumExposureScore || 0) ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-muted'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-4 leading-relaxed italic">
                                "{stock.name} shows a strong correlation with quantum technological breakthroughs and supply chain integration."
                            </p>
                        </div>

                        {/* Patents Card */}
                        <div className="p-6 rounded-2xl border border-border bg-card">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">Intellectual Property</h4>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl">
                                    <FileText className="text-blue-500" size={24} />
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-foreground">{stock.patentCount || '0'}</div>
                                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Registered Patents</div>
                                </div>
                                <a
                                    href={stock.patentLink || `https://patents.google.com/?q=assignee:${encodeURIComponent(stock.name)}+quantum`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-auto p-2 bg-muted hover:bg-blue-500/10 hover:text-blue-500 rounded-lg transition-all border border-transparent hover:border-blue-500/20"
                                    title="Verify on Google Patents"
                                >
                                    <ExternalLink size={16} />
                                </a>
                            </div>
                            <div className="mt-6 flex items-center justify-between text-[11px] font-mono text-muted-foreground border-t border-border/10 pt-4">
                                <span>MARKET TREND:</span>
                                <div className="flex items-center gap-1.5 text-green-500 font-bold">
                                    <TrendingUp size={14} />
                                    <span>BULLISH ACCUMULATION</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* News Feed */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                                <Newspaper size={14} className="text-blue-400" />
                                Real-time Intelligence Feed
                            </h4>
                            <span className="text-[9px] font-mono text-muted-foreground animate-pulse">LIVE SYNC</span>
                        </div>

                        <div className="space-y-3">
                            {loadingNews ? (
                                Array(2).fill(0).map((_, i) => (
                                    <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />
                                ))
                            ) : news.length > 0 ? (
                                news.map((item, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-muted/10 border border-border/30 hover:bg-muted/20 transition-all group cursor-pointer">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-mono text-blue-400">{item.source}</span>
                                        </div>
                                        <h5 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-blue-400 transition-colors uppercase">{item.title}</h5>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 border border-dashed border-border rounded-xl">
                                    <p className="text-xs text-muted-foreground italic">No recent specific signals detected.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-center gap-3">
                        <Info className="text-blue-400 shrink-0" size={16} />
                        <p className="text-[10px] md:text-[11px] text-muted-foreground leading-tight italic">
                            This exposure score is a composite index derived from R&D investment, patent trajectory, and high-frequency news sentiment analysis. Past performance is not indicative of future results.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
