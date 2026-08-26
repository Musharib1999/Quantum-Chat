import { NextRequest } from 'next/server';
import crypto from 'crypto';
import dbConnect from './db';
import UserSession from '../models/UserSession';
import User from '../models/User';

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
 * Validates the user session cookie in the incoming request.
 * Returns the user's email if valid, or null if unauthorized.
 */
export async function verifyUserSession(req: NextRequest): Promise<string | null> {
    try {
        await dbConnect();
        
        // Read session token from cookie
        const sessionToken = req.cookies.get('user_session')?.value;
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

        return session.email;
    } catch (e) {
        console.error("[verifyUserSession] Auth check failed:", e);
        return null;
    }
}
