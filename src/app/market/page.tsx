"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import ChatInterface from '@/components/ChatInterface';
import StockSidebar from '@/components/StockSidebar';
import MarketNews from '@/components/MarketNews';
import { getMarketNews } from '@/app/actions/chat';

export default function MarketPage() {
    const [selectedStock, setSelectedStock] = useState<{ _id: string, name: string, url: string } | null>(null);
    const [selectedNews, setSelectedNews] = useState<any | null>(null);
    const [news, setNews] = useState<any[]>([]);
    const [isNewsLoading, setIsNewsLoading] = useState(true);

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

    const handleStockSelect = (stock: any) => {
        setSelectedStock(stock);
    };

    const contextConfig = {
        ...(selectedStock ? {
            stockName: selectedStock.name,
            stockUrl: selectedStock.url
        } : {}),
        ...(selectedNews ? {
            newsTitle: selectedNews.title,
            newsSource: selectedNews.source
        } : {})
    };

    const handleAnalysisTriggered = () => {
        // Clear selection after analysis starts to prevent sticky context
        setSelectedStock(null);
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
