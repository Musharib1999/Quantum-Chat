/**
 * Next.js Middleware — Admin Route Protection
 *
 * Guards every /api/admin/* route by checking for a valid HttpOnly
 * session cookie set at admin login. No cookie = 401 immediately,
 * before any database query or business logic runs.
 *
 * The public exceptions (admin login + admin password-change) are
 * excluded so the admin can always authenticate even when logged out.
 */
import { NextRequest, NextResponse } from 'next/server';

// Routes that must be reachable without a session cookie
const PUBLIC_ADMIN_ROUTES = [
    '/api/admin/auth/login',
    '/api/admin/auth/change-password',
];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Only protect the admin API namespace
    if (!pathname.startsWith('/api/admin')) {
        return NextResponse.next();
    }

    // Allow public admin routes through
    if (PUBLIC_ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Check for valid session cookie
    const sessionToken = req.cookies.get('admin_session')?.value;

    if (!sessionToken || sessionToken !== process.env.ADMIN_SESSION_SECRET) {
        return NextResponse.json(
            { error: 'Unauthorized — admin session required.' },
            { status: 401 }
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/api/admin/:path*'],
};
