import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';
import bcrypt from 'bcryptjs';
import { normalizeRole } from '@/lib/roles';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req: Request) {
    try {
        const ip = getClientIp(req);
        const rl = checkRateLimit(`login:${ip}`, 15, 15 * 60 * 1000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Too many sign-in attempts. Please wait a few minutes and try again.' },
                { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
            );
        }

        await dbConnect();
        const body = await req.json();
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        if (!email || !password || email.length > 254 || password.length > 128) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Compare password (bcrypt primary; auto-upgrade any legacy plaintext password on verified login)
        const isMatch = await bcrypt.compare(password, user.password).catch(() => false);
        const legacyMatch = !isMatch && user.password === password;

        if (!isMatch && !legacyMatch) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        if (legacyMatch) {
            try {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(password, salt);
                await user.save();
            } catch (upgradeErr) {
                console.error('Failed to auto-upgrade legacy password hash:', upgradeErr);
            }
        }

        // Check Admin Approval Status (Admin role bypasses this)
        if (user.role !== 'admin' && user.isApproved === false) {
            return NextResponse.json({ error: 'Account pending admin approval.' }, { status: 403 });
        }

        // Create secure session token
        const { createUserSession } = await import('@/lib/auth');
        const sessionToken = await createUserSession(user.email);

        const response = NextResponse.json({
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone || '',
            plan: user.plan || 'Guest',
            role: normalizeRole(user.role),
            tokenLimit: user.tokenLimit,
            tokensUsed: user.tokensUsed,
            simMinutesLimit: user.simMinutesLimit ?? 5,
            simMinutesUsed: user.simMinutesUsed ?? 0,
            apiKey: user.apiKey || ''
        });

        // Set HttpOnly user session cookie
        response.cookies.set('user_session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/'
        });

        return response;

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
