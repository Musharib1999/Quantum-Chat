import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/db';
import User from '../../../../../models/User';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // Find the user by email or username
        const user = await User.findOne({ 
            $or: [{ email: username }, { email: username.toLowerCase() }] 
        });

        if (!user) {
            // Auto-seed admin user ONLY if username is 'admin' and no users exist
            const count = await User.countDocuments();
            if (count === 0 && username === 'admin' && password === 'admin123') {
                const adminUser = await User.create({
                    email: 'admin',
                    password: 'admin123',
                    role: 'admin',
                    firstName: 'System',
                    lastName: 'Administrator',
                    plan: 'Enterprise',
                    tokenLimit: 99999999,
                    tokensUsed: 0
                });
                return NextResponse.json({ success: true, user: adminUser });
            }
            return NextResponse.json({ error: 'Account not found in system.' }, { status: 404 });
        }

        // Verify that the user is either an admin or a builder
        if (user.role !== 'admin' && user.role !== 'builder') {
            return NextResponse.json({ error: 'Access denied. Authorized personnel only.' }, { status: 403 });
        }

        if (user.password !== password) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        return NextResponse.json({ success: true, user });

    } catch (error) {
        console.error('Admin Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
