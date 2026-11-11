import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';
import { verifyUserSession } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Identity comes ONLY from the verified HttpOnly session cookie.
        // The `email` query param is accepted as a hint but must match the session owner;
        // otherwise anyone could read another user's profile (including apiKey).
        const sessionEmail = await verifyUserSession(req);
        if (!sessionEmail) {
            return NextResponse.json({ error: 'Unauthorized - user session required' }, { status: 401 });
        }

        await dbConnect();

        const requestedEmail = new URL(req.url).searchParams.get('email');
        if (requestedEmail && requestedEmail.trim().toLowerCase() !== sessionEmail.trim().toLowerCase()) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const user = await User.findOne({ email: sessionEmail });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone || '',
            plan: user.plan || 'Guest',
            role: user.role || 'user',
            tokenLimit: user.tokenLimit,
            tokensUsed: user.tokensUsed,
            simMinutesLimit: user.simMinutesLimit ?? 5,
            simMinutesUsed: user.simMinutesUsed ?? 0,
            apiKey: user.apiKey || '',
            demoExpiresAt: user.demoExpiresAt || null
        });

    } catch (error) {
        console.error('Fetch me error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
