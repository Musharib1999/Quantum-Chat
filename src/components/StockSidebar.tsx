"use client";

import React, { useState, useEffect } from 'react';
import { ExternalLink, TrendingUp, Search, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Stock {
    _id: string;
    name: string;
    url: string;
    symbol?: string;
}

interface StockSidebarProps {
    onSelect: (stock: Stock) => void;
    activeStockId?: string;
}

export default function StockSidebar({ onSelect, activeStockId }: StockSidebarProps) {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        axios.get('/api/stocks')
            .then(res => setStocks(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const filtered = stocks.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const parseStockName = (rawName: string, explicitSymbol?: string) => {
        if (explicitSymbol) {
            const cleanName = rawName.replace(new RegExp(`\\s*\\(?${explicitSymbol}\\)?\\s*|-?\\s*${explicitSymbol}`, 'i'), '').trim();
            return { name: cleanName, symbol: explicitSymbol.toUpperCase() };
        }
        const match = rawName.match(/(.+?)\s*[\(\-]\s*([A-Z0-9.\-]+)\s*\)?$/i);
        if (match) {
            return { name: match[1].trim(), symbol: match[2].toUpperCase().trim() };
        }
        return { name: rawName, symbol: null };
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border">
                <h3 className="text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="text-green-400" size={18} /> Quantum Stocks
                </h3>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-secondary/50 border border-input rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-ring transition-all placeholder:text-muted-foreground/50"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {loading ? (
                    Array(8).fill(0).map((_, i) => (
                        <div key={i} className="w-full text-left px-3 py-3 rounded-xl border border-transparent bg-transparent">
                            <div className="flex items-center justify-between">
                                <div className="h-4 w-2/3 bg-muted rounded animate-pulse"></div>
                            </div>
                        </div>
                    ))
                ) : filtered.map(stock => {
                    const parsed = parseStockName(stock.name, stock.symbol);
                    return (
                        <button
                            key={stock._id}
                            onClick={() => onSelect(stock)}
                            className={`w-full text-left px-3 py-3 rounded-xl border transition-all duration-200 group ${activeStockId === stock._id
                                ? 'bg-card border-ring shadow-md text-primary font-medium'
                                : 'bg-transparent border-transparent text-foreground hover:bg-card hover:border-ring hover:shadow-md'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col items-start gap-1.5">
                                    <span className="text-sm leading-tight">{parsed.name}</span>
                                    {parsed.symbol && (
                                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${activeStockId === stock._id ? 'bg-[#3066bb]/10 text-[#3066bb] border-[#3066bb]/20' : 'bg-muted text-muted-foreground border-border/50 group-hover:bg-muted/80'}`}>
                                            {parsed.symbol}
                                        </span>
                                    )}
                                </div>
                                {activeStockId === stock._id && <div className="w-1.5 h-1.5 rounded-full bg-[#3066bb] animate-pulse shrink-0" />}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
