'use server';

import { getLatestNews } from './market';
import News from '@/models/News';
import SystemPrompt from '@/models/SystemPrompt';
import dbConnect from '@/lib/db';
import { chatWithGroq } from './chat';

import { getDynamicPrompt } from './prompt-utils';

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

            // 3. Use LLM to summarize and extract location (Industrial Prompt)
            const fallbackPrompt = `Properly summarize this quantum computing news headline in exactly 200 words. 
Focus on technical implications, market impact, and industrial importance. 
Keep it professional and industrial.

Also, identify:
1. The primary country or region this news is associated with.
2. The Impact Level: Categorize as 'high', 'medium', or 'low' based on its significance to the global or regional market.
3. Quantum Exposure Score: A value from 0 to 5 based on how deeply the news involves quantum computing technologies (0 = minimal/indirect, 5 = breakthrough/direct).

Return the response in STRICT JSON format with these exact keys:
{
  "summary": "The 200-word summary here...",
  "countryCode": "ISO 3166-1 alpha-3 code (e.g., USA, DEU, CHN)",
  "countryName": "Full name of the country",
  "impact": "high | medium | low",
  "quantumExposureScore": number (0-5)
}

HEADLINE: ${item.title}
SOURCE: ${item.source}`;

            const prompt = await getDynamicPrompt('news_automation_v3', {
                title: item.title,
                source: item.source
            }, fallbackPrompt);

            try {
                const llmResponse = await chatWithGroq(prompt, 'chat', 'en');
                let summary = llmResponse.text;
                let countryCode = "GLOBAL";
                let countryName = "International";

                try {
                    // Try to parse JSON from the LLM response
                    const jsonMatch = llmResponse.text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        summary = parsed.summary || summary;
                        countryCode = parsed.countryCode || "GLOBAL";
                        countryName = parsed.countryName || "International";
                        if (parsed.impact) item.impact = parsed.impact;
                        if (parsed.quantumExposureScore !== undefined) item.quantumExposureScore = Number(parsed.quantumExposureScore);
                    }
                } catch (parseErr) {
                    console.warn("[Automation] Failed to parse JSON response, falling back to raw text", parseErr);
                }

                if (existing) {
                    await News.findByIdAndUpdate(existing._id, {
                        summary,
                        countryCode,
                        countryName,
                        impact: item.impact || existing.impact,
                        quantumExposureScore: item.quantumExposureScore || existing.quantumExposureScore
                    });
                } else {
                    await News.create({
                        title: item.title,
                        source: item.source,
                        url: item.url || "#",
                        publishedAt: item.time || new Date().toISOString(),
                        impact: item.impact || 'medium',
                        trend: item.trend || 'up',
                        summary: summary,
                        quantumExposureScore: item.quantumExposureScore || 0,
                        countryCode,
                        countryName
                    });
                }
                processedCount++;
            } catch (err) {
                console.error(`[Automation] Failed to process item: ${item.title}`, err);
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

        // 1. Fetch Blocked Sources
        const BlockedSource = (await import('@/models/BlockedSource')).default;
        const blockedDocs = await BlockedSource.find({}, { name: 1 });
        const blockedNames = blockedDocs.map(d => d.name);

        // 2. Build Query
        const query: any = {};
        if (blockedNames.length > 0) {
            query.source = { $nin: blockedNames };
        }

        const news = await News.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await News.countDocuments(query);

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
