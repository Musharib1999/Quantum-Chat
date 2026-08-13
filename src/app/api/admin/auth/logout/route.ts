import { NextResponse } from 'next/server';

/**
 * POST /api/admin/auth/logout
 * Clears the admin session cookie, ending the admin session.
 * This route is public (no middleware guard) so it can always be called.
 */
export async function POST() {
    const response = NextResponse.json({ success: true });

    response.cookies.set('admin_session', '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0, // Immediately expire
    });

    return response;
}
