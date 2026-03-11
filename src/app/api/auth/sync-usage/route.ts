import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, tokensDelta, simMinutesDelta } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        if ((!tokensDelta || isNaN(tokensDelta)) && (!simMinutesDelta || isNaN(simMinutesDelta))) {
            return NextResponse.json({ error: 'Valid tokensDelta or simMinutesDelta required' }, { status: 400 });
        }

        await dbConnect();

        const updateData: any = {};
        if (tokensDelta && !isNaN(tokensDelta)) {
            updateData.tokensUsed = Number(tokensDelta);
        }
        if (simMinutesDelta && !isNaN(simMinutesDelta)) {
            updateData.simMinutesUsed = Number(simMinutesDelta);
        }

        // Use atomic $inc to safely add the delta to the existing DB values
        const updatedUser = await User.findOneAndUpdate(
            { email },
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
