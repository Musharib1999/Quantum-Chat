import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
    try {
        const ip = getClientIp(req);
        const rl = checkRateLimit(`signup:${ip}`, 5, 15 * 60 * 1000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Too many access requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
            );
        }

        await dbConnect();
        const body = await req.json();

        const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
        const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const company = typeof body.company === 'string' ? body.company.trim() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        // Strict field & length validation (password is optional for invite-only access requests)
        if (!email || !firstName || !lastName) {
            return NextResponse.json({ error: 'Please provide your first name, last name, and email.' }, { status: 400 });
        }
        if (!EMAIL_RE.test(email) || email.length > 254) {
            return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }
        if (firstName.length > 80 || lastName.length > 80 || company.length > 120 || password.length > 128) {
            return NextResponse.json({ error: 'One or more fields exceed the maximum allowed length.' }, { status: 400 });
        }

        // Case-insensitive duplicate check
        const existingUser = await User.findOne({ email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
        if (existingUser) {
            return NextResponse.json({ error: 'An account or access request with this email already exists.' }, { status: 409 });
        }

        // Hash provided password or a cryptographically random unguessable placeholder for invite-only requests
        const secretToHash =
            password.trim().length > 0
                ? password
                : crypto.randomBytes(32).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(secretToHash, salt);

        // Create new user, explicitly hardcoding isApproved: false and role: 'learner' (never trust client role)
        const newUser = await User.create({
            firstName,
            lastName,
            email,
            company,
            password: hashedPassword,
            isApproved: false,
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
