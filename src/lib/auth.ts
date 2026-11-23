import { NextRequest } from 'next/server';
import crypto from 'crypto';
import dbConnect from './db';
import UserSession from '../models/UserSession';
import User from '../models/User';
import { isDemoRole, normalizeRole, UserRole } from './roles';

export interface SessionIdentity {
    email: string;
    role: UserRole;
}

/**
 * Creates a new user session in the database.
 */
export async function createUserSession(email: string): Promise<string> {
    await dbConnect();
    const token = crypto.randomUUID();
    await UserSession.create({
        token,
        email,
        createdAt: new Date()
    });
    return token;
}

/**
 * Resolves the verified identity (email + role) from the `user_session` cookie on a request.
 * Returns null if the session is missing, unknown, unapproved or expired.
 */
export async function resolveSession(req: NextRequest): Promise<SessionIdentity | null> {
    return resolveSessionFromToken(req.cookies.get('user_session')?.value);
}

/**
 * Same checks as `resolveSession`, for callers that only have the raw cookie value
 * (e.g. server actions reading `cookies()` from next/headers).
 */
export async function resolveSessionFromToken(sessionToken: string | null | undefined): Promise<SessionIdentity | null> {
    try {
        await dbConnect();

        if (!sessionToken) {
            return null;
        }

        // Query the database to check if the session is active
        const session = await UserSession.findOne({ token: sessionToken });
        if (!session) {
            return null;
        }

        // Ensure the user still exists and is approved
        const user = await User.findOne({ email: session.email });
        if (!user || (user.role !== 'admin' && user.isApproved === false)) {
            return null;
        }

        // Demo expiration check (applies to demo_ide, demo_enterprise, and legacy demo)
        if (isDemoRole(user.role) && user.demoExpiresAt && new Date() > new Date(user.demoExpiresAt)) {
            console.log(`[verifyUserSession] Demo account expired for email: ${user.email}`);
            return null;
        }

        return { email: session.email, role: normalizeRole(user.role) };
    } catch (e) {
        console.error("[verifyUserSession] Auth check failed:", e);
        return null;
    }
}

/**
 * Validates the user session cookie in the incoming request.
 * Returns the user's email if valid, or null if unauthorized.
 */
export async function verifyUserSession(req: NextRequest): Promise<string | null> {
    const identity = await resolveSession(req);
    return identity ? identity.email : null;
}

function timingSafeEquals(a: string, b: string): boolean {
    if (!a || !b) return false;
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies admin authorization using `next/headers` cookies() — works in any
 * App Router Route Handler (`Request` or `NextRequest`) as well as Server Actions.
 * Accepts either a valid `admin_session` cookie matching `ADMIN_SESSION_SECRET`
 * (constant-time comparison) or an active DB-verified `user_session` with role === 'admin'.
 */
export async function verifyAdminCookies(): Promise<boolean> {
    try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        const adminCookie = cookieStore.get('admin_session')?.value || '';
        const adminSecret = process.env.ADMIN_SESSION_SECRET || '';
        if (adminSecret && adminCookie && timingSafeEquals(adminCookie, adminSecret)) {
            return true;
        }
        const userToken = cookieStore.get('user_session')?.value;
        if (userToken) {
            const identity = await resolveSessionFromToken(userToken);
            if (identity && identity.role === 'admin') {
                return true;
            }
        }
        return false;
    } catch (e) {
        console.error('[verifyAdminCookies] Admin auth check failed:', e);
        return false;
    }
}

/**
 * Throws an Error('Unauthorized: Admin session required.') if the caller is not an authenticated admin.
 * Designed for use at the top of Server Actions in `src/app/actions/admin.ts`.
 */
export async function requireAdminAction(): Promise<void> {
    const ok = await verifyAdminCookies();
    if (!ok) {
        throw new Error('Unauthorized — admin session required.');
    }
}
