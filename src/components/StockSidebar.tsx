"use client";

import React, { useState, useEffect } from 'react';
import { ExternalLink, TrendingUp, Search } from 'lucide-react';
import axios from 'axios';

interface Stock {
    _id: string;
    name: string;
    url: string;
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

    const filtered = stocks.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="text-green-400" size={18} /> Market Intelligence
                </h3>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                        className="w-full bg-secondary/30 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-green-500/50 transition-colors"
                        placeholder="Search assets..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">Loading assets...</div>
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
                            <span className="font-medium text-sm">{stock.name}</span>
                            {activeStockId === stock._id && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
