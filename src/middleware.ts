/**
 * Next.js Middleware — Admin & Route Protection
 *
 * Guards all /admin/* pages and /api/admin/* endpoints by validating
 * the secure HttpOnly admin_session cookie against ADMIN_SESSION_SECRET.
 *
 * - Unauthorized page visits (/admin/dashboard) are redirected to /admin/login.
 * - Unauthorized API calls (/api/admin/*) are rejected with 401 Unauthorized.
 * - Public routes (/admin/login, /api/admin/auth/login, /api/admin/auth/logout) are exempt.
 */
import { NextRequest, NextResponse } from "next/server";

// Routes that must be reachable without an active admin session cookie
const PUBLIC_ADMIN_ROUTES = [
    "/admin/login",
    "/api/admin/auth/login",
    "/api/admin/auth/logout",
    "/api/admin/auth/change-password",
];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Allow public admin routes through without session check
    if (PUBLIC_ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    const sessionToken = req.cookies.get("admin_session")?.value;
    const ADMIN_SECRET = process.env.ADMIN_SESSION_SECRET;

    // 1. Protect all /admin UI pages (e.g. /admin/dashboard)
    if (pathname.startsWith("/admin")) {
        if (!sessionToken || !ADMIN_SECRET || sessionToken !== ADMIN_SECRET) {
            const loginUrl = new URL("/admin/login", req.url);
            loginUrl.searchParams.set("redirect", pathname);
            return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
    }

    // 2. Protect all /api/admin API routes
    if (pathname.startsWith("/api/admin")) {
        if (!sessionToken || !ADMIN_SECRET || sessionToken !== ADMIN_SECRET) {
            return NextResponse.json(
                { error: "Unauthorized — admin session required." },
                { status: 401 }
            );
        }
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*"],
};
