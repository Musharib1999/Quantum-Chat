import { getStockPrice } from './market';

/**
 * Dependencies injected from chat.ts to avoid circular imports 
 * and avoid initializing heavy LLM SDKs multiple times.
 */
interface PipelineDeps {
    activeProvider: 'groq' | 'gemini';
    activeModel: string;
    genAI: any;
    groq: any;
    getDynamicPrompt: (category: string, replacements: Record<string, any>, fallback: string) => Promise<string>;
    scrapeUrl: (url: string) => Promise<string | null>;
}

export async function buildMarketContext(
    prompt: string,
    contextConfig: any,
    deps: PipelineDeps
): Promise<{
    systemInstructions: string;
    logTicker: string | null;
    logRawData: any;
}> {
    const { genAI, groq, activeProvider, activeModel, getDynamicPrompt, scrapeUrl } = deps;

    let autonomousContext = "";
    let systemInstructions = "";
    let logTicker = contextConfig.symbol || null;
    let logRawData = contextConfig.realTimeData || null;

    const now = new Date();
    const timeString = now.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        dateStyle: 'full',
        timeStyle: 'long'
    });

    // 1. Ticker Extraction Layer
    let targetSymbol = contextConfig.symbol;

    // If no explicit symbol selected, extract from user prompt via LLM
    if (!targetSymbol) {
        try {
            const tickerInstruction = await getDynamicPrompt(
                'ticker_extraction',
                { prompt },
                "Identify the stock ticker symbol from the user's text. Return ONLY the ticker (e.g., AAPL). If none, return 'NULL'."
            );

            let extracted = "";
            if (activeProvider === 'groq' && groq) {
                const completion = await groq.chat.completions.create({
                    messages: [{ role: 'system', content: tickerInstruction }, { role: 'user', content: prompt }],
                    model: activeModel,
                });
                extracted = completion.choices[0]?.message?.content?.trim() || "";
            } else if (genAI) {
                const model = genAI.getGenerativeModel({ model: activeModel });
                const extraction = await model.generateContent([
                    tickerInstruction,
                    prompt
                ]);
                extracted = extraction.response.text().trim();
            }

            if (extracted && extracted !== 'NULL' && extracted.length < 10) {
                targetSymbol = extracted.replace(/[^a-zA-Z0-9-]/g, '');
            }
        } catch (e) {
            console.error("Ticker extraction failed:", e);
        }
    }

    // 2. Data Fetching Layer (Real-time Market Data)
    let realTimeData = contextConfig.realTimeData;
    if (targetSymbol && !realTimeData) {
        realTimeData = await getStockPrice(targetSymbol);
        logTicker = targetSymbol;
        logRawData = realTimeData;
    }

    systemInstructions += `\n\nMODE: MARKET INTELLIGENCE`;
    systemInstructions += `\nCURRENT SYSTEM TIME (NY): ${timeString}`;

    // 3. Inject Data into Context Strings
    if (realTimeData) {
        const rt = realTimeData;
        systemInstructions += `\n\nREAL-TIME DATA (ALPHA VANTAGE):
        - Symbol: ${rt.symbol}
        - Price: $${rt.price}
        - Change: ${rt.change} (${rt.changePercent})
        - Volume: ${rt.volume}
        - Latest Trading Day: ${rt.latestTradingDay}
        - Previous Close: ${rt.previousClose}
        
        IMPORTANT: Use this REAL-TIME data as the primary source.`;
    } else if (targetSymbol) {
        systemInstructions += `\nFOCUS ASSET: ${targetSymbol} (Real-time data unavailable, use general knowledge)`;
    }

    if (contextConfig.stockName && !targetSymbol) {
        systemInstructions += `\nFOCUS ASSET: ${contextConfig.stockName}`;
    }

    // 4. Extract Web Content if URL is provided
    if (contextConfig.stockUrl) {
        systemInstructions += `\nREFERENCE URL: ${contextConfig.stockUrl}`;
        const scrapedData = await scrapeUrl(contextConfig.stockUrl);
        if (scrapedData) autonomousContext = scrapedData;
    }

    const fmtNumeric = (val: any) => {
        if (!val) return "0.00";
        const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
        return isNaN(n) ? "0.00" : n.toFixed(2);
    };

    // 5. Finalize System Prompt Assembly
    if (realTimeData || contextConfig.realTimeData) {
        const rt = realTimeData || contextConfig.realTimeData;
        systemInstructions = await getDynamicPrompt('market_inquiry', {
            time: timeString,
            symbol: rt.symbol,
            price: fmtNumeric(rt.price),
            change: fmtNumeric(rt.change),
            changePercent: rt.changePercent,
            volume: rt.volume,
            date: rt.latestTradingDay,
            close: fmtNumeric(rt.previousClose),
            scrapedData: autonomousContext ? `\nREFERENCE CONTEXT:\n${autonomousContext}\n` : ''
        }, systemInstructions);
    } else {
        systemInstructions = await getDynamicPrompt('market_news_fallback', {
            targetSymbol: targetSymbol || (contextConfig.stockName ? contextConfig.stockName : "N/A"),
            scrapedData: autonomousContext ? `\nREFERENCE CONTEXT:\n${autonomousContext}\n` : ''
        }, systemInstructions);
    }

    return {
        systemInstructions,
        logTicker,
        logRawData
    };
}
