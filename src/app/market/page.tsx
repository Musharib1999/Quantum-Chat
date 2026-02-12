"use client";

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import ChatInterface from '@/components/ChatInterface';
import StockSidebar from '@/components/StockSidebar';

export default function MarketPage() {
    const [selectedStock, setSelectedStock] = useState<{ _id: string, name: string, url: string } | null>(null);

    const handleStockSelect = (stock: any) => {
        setSelectedStock(stock);
    };

    const contextConfig = selectedStock ? {
        stockName: selectedStock.name,
        stockUrl: selectedStock.url
    } : {};

    return (
        <AppLayout
            currentMode="market"
            sidebarContent={
                <div className="h-full">
                    <StockSidebar onSelect={handleStockSelect} activeStockId={selectedStock?._id} />
                </div>
            }
        >
            <ChatInterface
                mode="market"
                contextConfig={contextConfig}
                placeholder="Ask Market Intelligence..."
            />
        </AppLayout>
    );
}
