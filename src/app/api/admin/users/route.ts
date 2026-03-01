import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';

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

        const user = await User.create(body);
        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const { id, password, email, firstName, lastName, phone, plan, tokenLimit, tokensUsed } = body;

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const updateData: any = {};
        if (email !== undefined) updateData.email = email;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (phone !== undefined) updateData.phone = phone;
        if (plan !== undefined) updateData.plan = plan;
        if (password) updateData.password = password; // Since plain text is okay for now like the POST endpoint
        if (tokenLimit !== undefined) updateData.tokenLimit = Number(tokenLimit);
        if (tokensUsed !== undefined) updateData.tokensUsed = Number(tokensUsed);

        const user = await User.findByIdAndUpdate(id, updateData, { new: true });

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
