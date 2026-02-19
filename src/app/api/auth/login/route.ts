import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // Find user by email
        const user = await User.findOne({ email });

        // Check if user exists and password matches
        // NOTE: In a real app, use bcrypt.compare(password, user.password)
        // For this demo/prototype, we are comparing plain text as stored.
        if (!user || user.password !== password) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Return user info (excluding password)
        return NextResponse.json({
            email: user.email,
            name: user.email.split('@')[0],
            role: user.role
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
