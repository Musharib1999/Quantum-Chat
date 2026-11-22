import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';
import UserSession from '../../../../models/UserSession';
import { verifyUserSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const sessionEmail = await verifyUserSession(req);
        if (!sessionEmail) {
            return NextResponse.json({ error: 'Unauthorized — active session required' }, { status: 401 });
        }

        await dbConnect();
        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
        }

        const user = await User.findOne({ email: sessionEmail });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Verify Current Password (Bcrypt or Legacy)
        const isMatch = await bcrypt.compare(currentPassword, user.password).catch(() => false);
        const legacyMatch = user.password === currentPassword;

        if (!isMatch && !legacyMatch) {
            return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 });
        }

        // Hash New Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update User
        user.password = hashedPassword;
        await user.save();

        // Revoke any other active sessions for this user except the current cookie
        const currentToken = req.cookies.get('user_session')?.value;
        if (currentToken) {
            await UserSession.deleteMany({ email: sessionEmail, token: { $ne: currentToken } });
        }

        console.log(`Password updated for user: ${sessionEmail}`);

        return NextResponse.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error('Password change error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
