import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AcademyProgress from '@/models/AcademyProgress';
import { authenticateApiKey } from '@/lib/api-auth';
import User from '@/models/User';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        
        // Use current session user or API key
        // Note: authenticateApiKey might need update to handle session cookie
        // For now, let's assume session is handled by the middleware/context
        const user = await authenticateApiKey(req); 
        if (!user) return NextResponse.json([], { status: 200 });

        const progress = await AcademyProgress.find({ userId: user.email });
        return NextResponse.json(progress);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
