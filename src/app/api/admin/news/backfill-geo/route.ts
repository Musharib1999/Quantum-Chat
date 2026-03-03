import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import News from '@/models/News';
import { chatWithGroq } from '@/app/actions/chat';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        await dbConnect();

        // Find news items that don't have a countryCode or are marked as GLOBAL
        const itemsToUpdate = await News.find({
            $or: [
                { countryCode: { $exists: false } },
                { countryCode: 'GLOBAL' },
                { countryCode: null }
            ]
        }).limit(10); // Process in small batches to avoid timeouts

        let updatedCount = 0;

        for (const item of itemsToUpdate) {
            const prompt = `Identify the primary country associated with this quantum computing news headline.
Return the response in STRICT JSON format:
{
  "countryCode": "ISO 3166-1 alpha-3 code (e.g., USA, DEU, CHN)",
  "countryName": "Full name of the country"
}

HEADLINE: ${item.title}`;

            try {
                const llmResponse = await chatWithGroq(prompt, 'chat', 'en');
                const jsonMatch = llmResponse.text.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    await News.findByIdAndUpdate(item._id, {
                        countryCode: parsed.countryCode || "GLOBAL",
                        countryName: parsed.countryName || "International"
                    });
                    updatedCount++;
                }
            } catch (err) {
                console.error(`Failed to backfill item: ${item.title}`, err);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Backfilled ${updatedCount} items.`,
            remaining: await News.countDocuments({
                $or: [
                    { countryCode: { $exists: false } },
                    { countryCode: 'GLOBAL' },
                    { countryCode: null }
                ]
            })
        });

    } catch (error: any) {
        console.error("Backfill error:", error);
        return NextResponse.json({ error: 'Backfill failed' }, { status: 500 });
    }
}
