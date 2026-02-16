"use client";

import MarketNews from '@/components/MarketNews';
import { getMarketNews } from '@/app/actions/chat';
import { useEffect } from 'react';

export default function MarketPage() {
    const [selectedStock, setSelectedStock] = useState<{ _id: string, name: string, url: string } | null>(null);
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
            rightSidebarContent={<MarketNews news={news} isLoading={isNewsLoading} />}
        >
            <ChatInterface
                mode="market"
                contextConfig={contextConfig}
                placeholder="Ask Market Intelligence..."
            />
        </AppLayout>
    );
}
