'use server';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'BY4WASP6OIOZJVLQ';
const BASE_URL = 'https://www.alphavantage.co/query';

export async function getStockPrice(symbol: string) {
    if (!symbol) return null;

    try {
        const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
        const response = await fetch(url, { next: { revalidate: 60 } }); // Cache for 1 min
        const data = await response.json();

        // Alpha Vantage Global Quote Response Structure
        const quote = data['Global Quote'];
        if (!quote) {
            console.error('Alpha Vantage Error:', data);
            return null;
        }

        return {
            symbol: quote['01. symbol'],
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: quote['10. change percent'],
            volume: parseInt(quote['06. volume']),
            latestTradingDay: quote['07. latest trading day'],
            previousClose: parseFloat(quote['08. previous close'])
        };

    } catch (error) {
        console.error("Failed to fetch stock price:", error);
        return null;
    }
}
