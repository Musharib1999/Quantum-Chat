import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();

        const { firstName, lastName, email, company, password, role } = body;
        
        // Safety: only allow user or student roles to be requested
        const requestedRole = (role === 'student') ? 'student' : 'user';

        // Basic validation
        if (!email || !password || !firstName || !lastName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user, explicitly setting isApproved to false
        const newUser = await User.create({
            firstName,
            lastName,
            email,
            company: company || '',
            password: hashedPassword,
            isApproved: false, // Requires admin approval
            role: requestedRole,
            plan: requestedRole === 'student' ? 'Pro' : 'Guest' // Students get Pro tier features
        });

        return NextResponse.json(
            { message: 'Registration successful. Your account is pending admin approval.', userId: newUser._id },
            { status: 201 }
        );

    } catch (error: any) {
        console.error('Registration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
