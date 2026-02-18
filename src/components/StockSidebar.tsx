"use client";

import React, { useState, useEffect } from 'react';
import { ExternalLink, TrendingUp, Search } from 'lucide-react';
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
    const [search, setSearch] = useState('');

    useEffect(() => {
        axios.get('/api/stocks')
            .then(res => setStocks(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const filtered = stocks.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

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
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-secondary/50 border border-input rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400/50 transition-all placeholder:text-muted-foreground/50"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground space-y-3">
                        <Loader2 className="animate-spin text-green-400" size={24} />
                        <span className="text-xs font-mono animate-pulse">Loading...</span>
                    </div>
                ) : filtered.map(stock => (
                    <button
                        key={stock._id}
                        onClick={() => onSelect(stock)}
                        className={`w-full text-left px-3 py-3 rounded-lg border transition-all group ${activeStockId === stock._id
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-transparent border-transparent hover:bg-white/5 text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm">{stock.name}</span>
                            {activeStockId === stock._id && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
