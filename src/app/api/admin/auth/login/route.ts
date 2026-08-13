import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '../../../../../lib/db';
import User from '../../../../../models/User';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // Lookup admin by email
        const user = await User.findOne({
            $or: [{ email: username }, { email: username.toLowerCase() }]
        });

        if (!user) {
            return NextResponse.json({ error: 'Account not found in system.' }, { status: 404 });
        }

        // Only admins may access this endpoint
        if (user.role !== 'admin') {
            return NextResponse.json({ error: 'Access denied. Authorized personnel only.' }, { status: 403 });
        }

        // Verify password using bcrypt
        const isMatch = await bcrypt.compare(password, user.password).catch(() => false);
        if (!isMatch) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Build response and attach HttpOnly session cookie
        const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;
        if (!ADMIN_SESSION_SECRET) {
            console.error('[Admin Login] ADMIN_SESSION_SECRET is not set in environment variables.');
            return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
        }

        const response = NextResponse.json({
            success: true,
            user: {
                email: user.email,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                role: user.role,
                plan: user.plan || 'Enterprise',
            }
        });

        // HttpOnly: not accessible from JavaScript — protects against XSS
        // SameSite=Lax: blocks cross-site request forgery
        // Secure: only sent over HTTPS in production
        response.cookies.set('admin_session', ADMIN_SESSION_SECRET, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 8, // 8 hours
        });

        return response;

    } catch (error) {
        console.error('Admin Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
