import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UserSession from '@/models/UserSession';

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('user_session')?.value;
        if (token) {
            await dbConnect();
            await UserSession.deleteOne({ token });
        }
    } catch (e) {
        console.error('[Logout] Failed to revoke server session:', e);
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    // Clear user_session cookie with matching security attributes
    response.cookies.set('user_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(0),
        path: '/'
    });
    
    return response;
}
