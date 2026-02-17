"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import ChatInterface from '@/components/ChatInterface';
import StockSidebar from '@/components/StockSidebar';
import MarketNews from '@/components/MarketNews';
import { getMarketNews } from '@/app/actions/chat';
import { getStockPrice } from '@/app/actions/market';

export default function MarketPage() {
    const [selectedStock, setSelectedStock] = useState<{ _id: string, name: string, url: string, symbol?: string } | null>(null);
    const [selectedStockData, setSelectedStockData] = useState<any | null>(null);
    const [selectedNews, setSelectedNews] = useState<any | null>(null);
    const [news, setNews] = useState<any[]>([]);
    const [isNewsLoading, setIsNewsLoading] = useState(true);

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

    useEffect(() => {
        const fetchNews = async () => {
            setIsNewsLoading(true);
            try {
                const results = await getMarketNews();
                setNews(results);
            } catch (error) {
                console.error("Failed to fetch news:", error);
            } finally {
                setIsNewsLoading(false);
            }
        };
        fetchNews();
    }, []);

    // Fetch Real-Time Price on Selection
    useEffect(() => {
        const fetchPrice = async () => {
            if (selectedStock) {
                // Use DB symbol OR fallback to static map
                const symbol = selectedStock.symbol || SYMBOL_MAP[selectedStock.name];

                if (symbol) {
                    const data = await getStockPrice(symbol);
                    setSelectedStockData({ ...data, symbol }); // Ensure symbol is linked
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

    const handleStockSelect = (stock: any) => {
        setSelectedStock(stock);
    };

    const contextConfig = {
        ...(selectedStock ? {
            stockName: selectedStock.name,
            stockUrl: selectedStock.url,
            symbol: selectedStock.symbol,
            realTimeData: selectedStockData // Pass the fetched data
        } : {}),
        ...(selectedNews ? {
            newsTitle: selectedNews.title,
            newsSource: selectedNews.source
        } : {})
    };

    const handleAnalysisTriggered = () => {
        // Clear selection after analysis starts to prevent sticky context
        setSelectedStock(null);
        setSelectedStockData(null);
        setSelectedNews(null);
    };

    return (
        <AppLayout
            currentMode="market"
            sidebarContent={
                <div className="h-full">
                    <StockSidebar onSelect={handleStockSelect} activeStockId={selectedStock?._id} />
                </div>
            }
            rightSidebarContent={
                <MarketNews
                    news={news}
                    isLoading={isNewsLoading}
                    onSelect={(n) => setSelectedNews(n)}
                />
            }
        >
            <ChatInterface
                mode="market"
                contextConfig={contextConfig}
                placeholder="Ask Market Intelligence..."
                onAnalysisTriggered={handleAnalysisTriggered}
            />
        </AppLayout>
    );
}
