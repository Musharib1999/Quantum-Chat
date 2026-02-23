import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import News from '@/models/News';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function POST() {
    try {
        await dbConnect();

        // 1. Fetch from Local Vercel Python Function (pygooglenews)
        const response = await fetch(`${BASE_URL}/api/news`, {
            // Prevent caching so we get fresh news on trigger
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
