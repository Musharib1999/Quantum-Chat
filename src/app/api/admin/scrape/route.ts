import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import News from '@/models/News';

export const dynamic = 'force-dynamic';

const QUANTUM_API_URL = process.env.QUANTUM_API_URL || 'http://localhost:8000';
const QUANTUM_API_SECRET = process.env.QUANTUM_API_SECRET || 'dev_secret_key_123';

export async function POST() {
    try {
        await dbConnect();

        // 1. Fetch from Python Backend (pygooglenews)
        const response = await fetch(`${QUANTUM_API_URL}/api/news`, {
            headers: {
                'x-api-key': QUANTUM_API_SECRET
            },
            // Prevent caching so we get fresh news on trigger
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Python API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to scrape news from python backend');
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
