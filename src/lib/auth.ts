import { NextRequest } from 'next/server';
import crypto from 'crypto';
import dbConnect from './db';
import UserSession from '../models/UserSession';
import User from '../models/User';

export interface SessionIdentity {
    email: string;
    role: string;
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

        // Demo expiration check
        if (user.role === 'demo' && user.demoExpiresAt && new Date() > new Date(user.demoExpiresAt)) {
            console.log(`[verifyUserSession] Demo account expired for email: ${user.email}`);
            return null;
        }

        return { email: session.email, role: user.role || 'user' };
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
