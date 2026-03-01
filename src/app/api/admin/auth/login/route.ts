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

        // Try to find the admin user by role or email
        let adminUser = await User.findOne({ role: 'admin' });

        // Auto-seed admin user if it doesn't exist for fresh setups
        if (!adminUser && username === 'admin' && password === 'admin123') {
            adminUser = await User.create({
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

        if (!adminUser) {
            return NextResponse.json({ error: 'Admin account not found in system.' }, { status: 404 });
        }

        if (adminUser.email !== username && username !== 'admin') {
            return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
        }

        if (adminUser.password !== password) {
            return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
        }

        return NextResponse.json({ success: true, user: adminUser });

    } catch (error) {
        console.error('Admin Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
