'use server';

import { getLatestNews } from './market';
import News from '@/models/News';
import dbConnect from '@/lib/db';
import { chatWithGroq } from './chat';

/**
 * Automates scraping of news from Quantum Market Service,
 * summarizes them using Groq LLM, and persists them to MongoDB.
 */
export async function automateNewsSummarization() {
    try {
        await dbConnect();

        // 1. Fetch latest 20 news items from the external service
        console.log("[Automation] Fetching latest news from Market Service...");
        const result = await getLatestNews(undefined, 1, 20);
        const newsItems = result.news;

        if (!newsItems || newsItems.length === 0) {
            console.log("[Automation] No news found to process.");
            return { success: false, message: "No news found" };
        }

        let processedCount = 0;

        // 2. Process each news item
        for (const item of newsItems) {
            // Check if this news already exists in DB
            const existing = await News.findOne({ title: item.title });

            if (existing && existing.summary) {
                // If it exists and already has a summary, we can skip or update logic
                // For now, let's keep it if it's recent enough
                continue;
            }

            console.log(`[Automation] Summarizing: ${item.title}`);

            // 3. Use Groq to summarize (Industrial Prompt)
            const prompt = `Properly summarize this quantum computing news headline in exactly 200 words. 
            Focus on technical implications, market impact, and industrial importance. 
            Keep it professional and industrial.
            
            HEADLINE: ${item.title}
            SOURCE: ${item.source}
            `;

            try {
                const llmResponse = await chatWithGroq(prompt, 'chat', 'en');
                const summary = llmResponse.text;

                if (existing) {
                    await News.findByIdAndUpdate(existing._id, { summary });
                } else {
                    await News.create({
                        title: item.title,
                        source: item.source,
                        url: item.url || "#",
                        publishedAt: item.time || new Date().toISOString(),
                        impact: item.impact || 'medium',
                        trend: item.trend || 'up',
                        summary: summary
                    });
                }
                processedCount++;
            } catch (err) {
                console.error(`[Automation] Failed to summarize item: ${item.title}`, err);
            }
        }

        return {
            success: true,
            message: `Processed ${processedCount} news items.`,
            total: newsItems.length
        };

    } catch (error) {
        console.error("[Automation] Global news automation error:", error);
        return { success: false, error: String(error) };
    }
}

/**
 * Retrieves news from the local database (filtered by fresh items).
 */
export async function getDbNews(limit: number = 20, page: number = 1) {
    try {
        await dbConnect();
        const skip = (page - 1) * limit;

        const news = await News.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await News.countDocuments();

        return {
            news: news.map(n => ({
                id: n._id.toString(),
                title: n.title,
                source: n.source,
                time: n.publishedAt,
                impact: n.impact,
                trend: n.trend,
                summary: n.summary,
                url: n.url
            })),
            hasMore: skip + news.length < total,
            total
        };
    } catch (error) {
        console.error("Failed to fetch news from DB:", error);
        return { news: [], hasMore: false };
    }
}
