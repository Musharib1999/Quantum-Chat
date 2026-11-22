import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyUserSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const sessionEmail = await verifyUserSession(req);
        if (!sessionEmail) {
            return NextResponse.json({ error: 'Unauthorized — active session required' }, { status: 401 });
        }

        const body = await req.json();
        const { tokensDelta, simMinutesDelta } = body;

        const tDelta = tokensDelta !== undefined ? Number(tokensDelta) : 0;
        const sDelta = simMinutesDelta !== undefined ? Number(simMinutesDelta) : 0;

        if ((isNaN(tDelta) || tDelta < 0) || (isNaN(sDelta) || sDelta < 0) || (tDelta === 0 && sDelta === 0)) {
            return NextResponse.json({ error: 'Positive tokensDelta or simMinutesDelta required' }, { status: 400 });
        }

        await dbConnect();

        const updateData: any = {};
        if (tDelta > 0) {
            updateData.tokensUsed = tDelta;
        }
        if (sDelta > 0) {
            updateData.simMinutesUsed = sDelta;
        }

        // Use atomic $inc on the verified session owner's account only
        const updatedUser = await User.findOneAndUpdate(
            { email: sessionEmail },
            { $inc: updateData },
            { new: true }
        ).lean();

        if (!updatedUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            user: {
                tokensUsed: updatedUser.tokensUsed,
                simMinutesUsed: updatedUser.simMinutesUsed
            }
        });
    } catch (error: any) {
        console.error('Usage sync error:', error);
        return NextResponse.json({ error: 'Internal server error while syncing usage' }, { status: 500 });
    }
}
