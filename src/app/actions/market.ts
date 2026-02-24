'use server';

const MARKET_SERVICE_URL = process.env.MARKET_SERVICE_URL || 'http://localhost:3001';
const MARKET_SERVICE_KEY = process.env.MARKET_SERVICE_KEY;

export async function getStockPrice(symbol: string) {
    if (!symbol) return null;

    try {
        const url = `${MARKET_SERVICE_URL}/api/stocks?symbol=${symbol}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${MARKET_SERVICE_KEY}` },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`Stock API responded with status: ${response.status}`);
            return null;
        }

        const data = await response.json();
        console.log("MARKET_SERVICE DEBUG [Stocks]:", data);

        if (data.error) {
            console.error('Stock API Error:', data.error);
            return null;
        }

        return {
            symbol: data.symbol,
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
            volume: data.volume,
            latestTradingDay: data.latestTradingDay,
            previousClose: data.previousClose
        };

    } catch (error) {
        console.error("Failed to fetch stock price:", error);
        return null;
    }
}

export async function getLatestNews(query?: string, page: number = 1, limit: number = 20) {
    try {
        const queryParams = new URLSearchParams();
        if (query) queryParams.append('query', query);
        queryParams.append('page', page.toString());
        queryParams.append('limit', limit.toString());

        const url = `${MARKET_SERVICE_URL}/api/news?${queryParams.toString()}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${MARKET_SERVICE_KEY}` },
            next: { revalidate: 300 }
        });

        if (!response.ok) {
            console.error(`News API responded with status: ${response.status}`);
            return { news: [], hasMore: false };
        }

        const data = await response.json();
        console.log("MARKET_SERVICE DEBUG [News]:", data?.news?.length, "items found");

        if (!data.success) {
            console.error('News API Error:', data.error);
            return { news: [], hasMore: false };
        }

        return {
            news: data.news,
            hasMore: data.hasMore || false,
            total: data.total || 0
        };

    } catch (error) {
        console.error("Failed to fetch market news:", error);
        return { news: [], hasMore: false };
    }
}
