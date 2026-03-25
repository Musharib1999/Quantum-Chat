import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import dbConnect from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        // 1. Authenticate Request via API Key
        const user = await authenticateApiKey(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Invalid or missing API Key' }, { status: 401 });
        }

        // 2. Return real-time usage and plan data
        return NextResponse.json({
            success: true,
            user: {
                email: user.email,
                plan: user.plan
            },
            usage: {
                simMinutesUsed: parseFloat(user.simMinutesUsed.toFixed(5)),
                simMinutesLimit: user.simMinutesLimit,
                tokensUsed: user.tokensUsed,
                tokensLimit: user.tokenLimit
            },
            apiEnabled: user.apiEnabled
        });

    } catch (error: any) {
        console.error('API Usage Error:', error);
        return NextResponse.json({ 
            error: 'Internal Gateway Error',
            message: error.message 
        }, { status: 500 });
    }
}
