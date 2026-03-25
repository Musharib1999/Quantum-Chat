import { NextRequest } from 'next/server';
import User from '@/models/User';
import dbConnect from '@/lib/db';

/**
 * Validates the API key from the Authorization header.
 * Returns the user object if valid, null otherwise.
 */
export async function authenticateApiKey(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const apiKey = authHeader.split(' ')[1];
    if (!apiKey) return null;

    await dbConnect();
    
    const user = await User.findOne({ 
        apiKey, 
        apiEnabled: true,
        isApproved: true
    });

    return user;
}
