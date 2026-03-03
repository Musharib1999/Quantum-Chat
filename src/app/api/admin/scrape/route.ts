import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import News from '@/models/News';

export const dynamic = 'force-dynamic';

const NEWS_SERVICE_URL = process.env.NEWS_SERVICE_URL || 'https://quantum-news.vercel.app';
const NEWS_SERVICE_KEY = process.env.NEWS_SERVICE_KEY;

export async function POST() {
    try {
        await dbConnect();

        if (!NEWS_SERVICE_KEY) {
            throw new Error("NEWS_SERVICE_KEY is missing from environment variables.");
        }

        // 1. Fetch from External Python News Service
        const response = await fetch(`${NEWS_SERVICE_URL}/api/news`, {
            headers: {
                'Authorization': `Bearer ${NEWS_SERVICE_KEY}`
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`News API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to scrape news');
        }

        const fetchedNews = data.news;
        let addedCount = 0;

        // 2. Insert into MongoDB, ignoring duplicates
        for (const item of fetchedNews) {
            try {
                // Upsert based on URL to prevent duplicates while updating trends if needed
                const result = await News.updateOne(
                    { url: item.url },
                    { $setOnInsert: item },
                    { upsert: true }
                );

                if (result.upsertedId) {
                    addedCount++;
                }
            } catch (err) {
                console.error("Error inserting news item:", err);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Scraping complete. Added ${addedCount} new articles.`,
            totalFetched: fetchedNews.length,
            added: addedCount
        });

    } catch (error: any) {
        console.error("Scraping error:", error);
        return NextResponse.json({ error: error.message || 'Scraping failed' }, { status: 500 });
    }
}
