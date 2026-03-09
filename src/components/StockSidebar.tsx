"use client";

import React, { useState, useEffect } from 'react';
import { ExternalLink, TrendingUp, Search, Loader2, Info } from 'lucide-react';
import axios from 'axios';
import QuantumExposureModal from './QuantumExposureModal';

interface Stock {
    _id: string;
    name: string;
    url: string;
    symbol?: string;
    quantumExposureScore?: number;
    patentCount?: number;
    patentLink?: string;
}

interface StockSidebarProps {
    onSelect: (stock: Stock) => void;
    activeStockId?: string;
}

export default function StockSidebar({ onSelect, activeStockId }: StockSidebarProps) {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [exposureStock, setExposureStock] = useState<Stock | null>(null);

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
                ) : filtered.map(stock => (
                    <button
                        key={stock._id}
                        onClick={() => onSelect(stock)}
                        className={`w-full text-left px-3 py-3 rounded-xl border transition-all duration-200 group ${activeStockId === stock._id
                            ? 'bg-card border-ring shadow-md text-primary font-medium'
                            : 'bg-transparent border-transparent text-foreground hover:bg-card hover:border-ring hover:shadow-md'
                            }`}
                    >
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className="text-sm line-clamp-1">{stock.name}</span>
                                {activeStockId === stock._id && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                            </div>

                            <div className="flex items-center justify-start mt-1 pt-1 border-t border-border/20">
                                <span className={`text-[11px] font-normal ${(stock.quantumExposureScore || 0) >= 4 ? 'text-green-600' :
                                    (stock.quantumExposureScore || 0) >= 2 ? 'text-orange-600' :
                                        'text-red-600'
                                    }`}>
                                    Quantum exposure: {stock.quantumExposureScore || 0}/5
                                </span>
                            </div>

                            {/* Exposure Action Section */}
                            {/* <div className="mt-2 border-t border-border/10 pt-2 flex justify-between items-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setExposureStock(stock);
                                    }}
                                    className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-tighter bg-blue-500/5 px-2 py-1 rounded-md border border-blue-500/10 hover:border-blue-500/30 group-hover:bg-blue-500/10"
                                >
                                    <Info size={12} />
                                    Check quantum exposure
                                </button>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-1 h-3 rounded-full bg-blue-500/40" />
                                    <div className="w-1 h-3 rounded-full bg-blue-500/60" />
                                    <div className="w-1 h-3 rounded-full bg-blue-500/80" />
                                </div>
                            </div> */}
                        </div>
                    </button>
                ))}
            </div>

            {/* Quantum Exposure Modal */}
            {/* <QuantumExposureModal 
                isOpen={!!exposureStock}
                onClose={() => setExposureStock(null)}
                stock={exposureStock}
            /> */}
        </div>
    );
}
