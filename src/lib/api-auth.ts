import { NextRequest } from 'next/server';
import User from '@/models/User';
import dbConnect from '@/lib/db';

/**
 * Validates the API key from either the Authorization (Bearer) or X-API-Key header.
 * Returns the user object if valid, null otherwise.
 */
export async function authenticateApiKey(req: NextRequest) {
    let apiKey = '';
    
    // 1. Try Authorization: Bearer <key>
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.split(' ')[1];
    } 
    
    // 2. Fallback to X-API-Key header (used by Telecom Showcase and simpler B2B scripts)
    if (!apiKey) {
        apiKey = req.headers.get('x-api-key') || '';
    }

    if (!apiKey) return null;

    await dbConnect();
    
    const user = await User.findOne({ 
        apiKey, 
        apiEnabled: true,
        isApproved: true
    });

    return user;
}
