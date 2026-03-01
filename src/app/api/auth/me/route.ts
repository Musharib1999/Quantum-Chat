import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await User.findOne({ email });

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
            tokensUsed: user.tokensUsed
        });

    } catch (error) {
        console.error('Fetch me error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
