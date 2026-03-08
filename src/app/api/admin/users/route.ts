import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();
        const users = await User.find({}).sort({ createdAt: -1 });
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();

        // Check if user already exists
        const existingUser = await User.findOne({ email: body.email });
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const { plan } = body;

        // Define plan-based limits
        let simMinutesLimit = 5;
        if (plan === 'Pro') simMinutesLimit = 30;
        if (plan === 'Enterprise') simMinutesLimit = 120;

        let tokenLimit = 100000;
        if (plan === 'Pro') tokenLimit = 500000;
        if (plan === 'Enterprise') tokenLimit = 2000000;

        const user = await User.create({
            ...body,
            simMinutesLimit: body.simMinutesLimit || simMinutesLimit,
            tokenLimit: body.tokenLimit || tokenLimit
        });
        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const { id, password, email, firstName, lastName, company, isApproved, phone, plan, tokenLimit, tokensUsed, simMinutesLimit, simMinutesUsed } = body;

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        console.log("PUT /api/admin/users received body:", body);

        const updateData: any = {};
        if (email !== undefined) updateData.email = email;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (company !== undefined) updateData.company = company;
        if (isApproved !== undefined) updateData.isApproved = isApproved;
        if (phone !== undefined) updateData.phone = phone;
        if (plan !== undefined) updateData.plan = plan;
        if (password) updateData.password = password; // Since plain text is okay for now like the POST endpoint
        if (tokenLimit !== undefined) updateData.tokenLimit = Number(tokenLimit);
        if (tokensUsed !== undefined) updateData.tokensUsed = Number(tokensUsed);
        if (simMinutesLimit !== undefined) updateData.simMinutesLimit = Number(simMinutesLimit);
        if (simMinutesUsed !== undefined) updateData.simMinutesUsed = Number(simMinutesUsed);

        console.log("PUT /api/admin/users updateData:", updateData);

        const user = await User.findByIdAndUpdate(id, updateData, { new: true });

        console.log("PUT /api/admin/users db response user tokenLimit:", user?.tokenLimit);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        await User.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
