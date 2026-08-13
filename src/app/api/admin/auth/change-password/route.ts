import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '../../../../../lib/db';
import User from '../../../../../models/User';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Both current and new passwords are required' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
        }

        const adminUser = await User.findOne({ role: 'admin' });

        if (!adminUser) {
            return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
        }

        // Verify current password using bcrypt
        const isMatch = await bcrypt.compare(currentPassword, adminUser.password).catch(() => false);
        if (!isMatch) {
            return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 });
        }

        // Hash the new password before saving — never store plaintext
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        adminUser.password = hashedNewPassword;
        await adminUser.save();

        return NextResponse.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error('Admin password change error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
