'use server';

const MARKET_SERVICE_URL = process.env.MARKET_SERVICE_URL || 'http://localhost:3001';
const MARKET_SERVICE_KEY = process.env.MARKET_SERVICE_KEY;

export async function getStockPrice(symbol: string) {
    if (!symbol) return null;

    try {
        const url = `${MARKET_SERVICE_URL}/api/stocks?symbol=${symbol}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${MARKET_SERVICE_KEY}` },
            next: { revalidate: 300 }
        });

        if (!response.ok) {
            console.error(`Stock API responded with status: ${response.status}`);
            return null;
        }

        const data = await response.json();

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

export async function getLatestNews(query?: string) {
    try {
        const url = `${MARKET_SERVICE_URL}/api/news${query ? `?query=${encodeURIComponent(query)}` : ''}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${MARKET_SERVICE_KEY}` },
            next: { revalidate: 300 }
        });

        if (!response.ok) {
            console.error(`News API responded with status: ${response.status}`);
            return [];
        }

        const data = await response.json();

        if (!data.success) {
            console.error('News API Error:', data.error);
            return [];
        }

        return data.news;

    } catch (error) {
        console.error("Failed to fetch market news:", error);
        return [];
    }
}
