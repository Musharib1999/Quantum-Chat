import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Compare password (assuming user password might be hashed from new signup flow, or plaintext from legacy)
        // Since we introduced bcrypt in signup, we check for it here
        const isMatch = await bcrypt.compare(password, user.password).catch(() => false);
        const legacyMatch = user.password === password;

        if (!isMatch && !legacyMatch) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Check Admin Approval Status (Admin role bypasses this)
        if (user.role !== 'admin' && user.isApproved === false) {
            return NextResponse.json({ error: 'Account pending admin approval.' }, { status: 403 });
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
            apiKey: user.apiKey || ''
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
