import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();

        const { firstName, lastName, email, company, password } = body;

        // Basic validation (password is optional for invite-only access requests)
        if (!email || !firstName || !lastName) {
            return NextResponse.json({ error: 'Please provide your first name, last name, and email.' }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ error: 'An account or access request with this email already exists.' }, { status: 409 });
        }

        // Hash provided password or a cryptographically random unguessable placeholder for invite-only requests
        const secretToHash =
            typeof password === 'string' && password.trim().length > 0
                ? password
                : crypto.randomBytes(32).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(secretToHash, salt);

        // Create new user, explicitly setting isApproved to false and canonical 'learner' role
        const newUser = await User.create({
            firstName,
            lastName,
            email,
            company: company || '',
            password: hashedPassword,
            isApproved: false, // Requires admin approval
            role: 'learner',
        });

        return NextResponse.json(
            {
                message: 'Access request submitted. Our team will review your request and share your credentials once approved.',
                userId: newUser._id,
            },
            { status: 201 }
        );

    } catch (error: any) {
        console.error('Registration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
