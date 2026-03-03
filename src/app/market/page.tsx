"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import StockSidebar from '@/components/StockSidebar';
import MarketChat from '@/components/chat/MarketChat';
import MarketNews from '@/components/MarketNews';
import { getStockPrice } from '@/app/actions/market';

export default function MarketPage() {
    const [selectedStock, setSelectedStock] = useState<{ _id: string, name: string, url: string, symbol?: string } | null>(null);
    const [selectedStockData, setSelectedStockData] = useState<any | null>(null);
    const [selectedNews, setSelectedNews] = useState<any | null>(null);

    // Static Map for users who haven't migrated DB
    const SYMBOL_MAP: Record<string, string> = {
        'Apple': 'AAPL',
        'Tesla': 'TSLA',
        'Microsoft': 'MSFT',
        'NVIDIA': 'NVDA',
        'Google': 'GOOGL',
        'Alphabet (Google)': 'GOOGL',
        'Amazon': 'AMZN',
        'Meta': 'META',
        'Facebook': 'META',
        'Bitcoin': 'BTC-USD',
        'Ethereum': 'ETH-USD',
        'S&P 500': 'SPY',
        'Nasdaq 100': 'QQQ',
        'Netflix': 'NFLX',
        'IBM': 'IBM',
        'Intel': 'INTC',
        'AMD': 'AMD'
    };

    // Fetch Real-Time Price on Selection
    useEffect(() => {
        const fetchPrice = async () => {
            if (selectedStock) {
                const symbol = selectedStock.symbol || SYMBOL_MAP[selectedStock.name];
                if (symbol) {
                    const data = await getStockPrice(symbol);
                    setSelectedStockData({ ...data, symbol });
                } else {
                    console.warn("No symbol found for:", selectedStock.name);
                    setSelectedStockData(null);
                }
            } else {
                setSelectedStockData(null);
            }
        };
        fetchPrice();
    }, [selectedStock]);

    const handleStockSelect = useCallback((stock: any) => {
        setSelectedStock(stock);
        setSelectedNews(null); // Clear news context when stock is selected
    }, []);

    const handleNewsSelect = useCallback((n: any) => {
        setSelectedNews(n);
        setSelectedStock(null); // Clear stock context when news is selected
        setSelectedStockData(null);
    }, []);

    const handleAnalysisTriggered = useCallback(() => {
        setSelectedStock(null);
        setSelectedStockData(null);
        setSelectedNews(null);
    }, []);

    const resolvedSymbol = selectedStock ? (selectedStock.symbol || SYMBOL_MAP[selectedStock.name]) : undefined;

    return (
        <AppLayout
            currentMode="market"
            sidebarContent={
                <div className="h-full">
                    <StockSidebar onSelect={handleStockSelect} activeStockId={selectedStock?._id} />
                </div>
            }
            rightSidebarContent={
                <MarketNews onSelect={handleNewsSelect} />
            }
        >
            <div className="flex-1 overflow-hidden relative" style={{ height: 'calc(100vh - 64px)' }}>
                <MarketChat
                    contextConfig={{
                        stockUrl: selectedStock?.url,
                        stockName: selectedStock?.name,
                        symbol: resolvedSymbol,
                        realTimeData: selectedStockData,
                        newsTitle: selectedNews?.title,
                        newsSource: selectedNews?.source
                    }}
                    onAnalysisTriggered={handleAnalysisTriggered}
                />
            </div>
        </AppLayout>
    );
}
