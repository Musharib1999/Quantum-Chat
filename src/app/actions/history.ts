'use server';

import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import ChatSession from '@/models/ChatSession';
import UserSession from '@/models/UserSession';
import { Message } from '@/hooks/useQuantumChat';

async function getSessionUserEmail(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('user_session')?.value;
        if (!sessionToken) return null;
        await dbConnect();
        const userSession = await UserSession.findOne({ token: sessionToken });
        return userSession?.email || null;
    } catch {
        return null;
    }
}

export async function getChatHistory(sessionId: string) {
    try {
        await dbConnect();
        const session = await ChatSession.findOne({ sessionId }).lean() as any;
        if (!session) {
            return [];
        }
        if (session.isPublic) {
            return JSON.parse(JSON.stringify(session.messages));
        }
        if (session.userEmail) {
            const userEmail = await getSessionUserEmail();
            if (!userEmail || userEmail !== session.userEmail) {
                return []; // Strictly isolated
            }
        }
        return JSON.parse(JSON.stringify(session.messages));
    } catch (error) {
        console.error('Error fetching chat history:', error);
        return [];
    }
}

export async function shareSession(sessionId: string, currentMessages?: any[], title?: string, pipeline?: string) {
    try {
        await dbConnect();
        let session;
        if (sessionId.match(/^[0-9a-fA-F]{24}$/)) {
            session = await ChatSession.findById(sessionId);
        } else {
            session = await ChatSession.findOne({ sessionId });
        }
        
        if (!session) {
            const randomSlug = Math.random().toString(36).substring(2, 9);
            session = await ChatSession.create({
                sessionId: sessionId,
                title: title || 'Quantum Simulation',
                pipeline: pipeline || 'general',
                shareId: randomSlug,
                isPublic: true,
                messages: currentMessages || []
            });
        } else {
            if (!session.shareId) {
                const randomSlug = Math.random().toString(36).substring(2, 9);
                session.shareId = randomSlug;
            }
            session.isPublic = true;
            if (currentMessages && currentMessages.length > 0) {
                session.messages = currentMessages;
            }
            await session.save();
        }

        return { 
            success: true, 
            shareId: session.shareId,
            title: session.title || 'Quantum Simulation',
            pipeline: session.pipeline || 'general'
        };
    } catch (error: any) {
        console.error('Error sharing session:', error);
        return { success: false, error: error.message };
    }
}

export async function getSharedSession(shareId: string) {
    try {
        await dbConnect();
        const session = await ChatSession.findOne({ shareId, isPublic: true }).lean();
        if (!session) return null;
        return JSON.parse(JSON.stringify(session));
    } catch (error) {
        console.error('Error getting shared session:', error);
        return null;
    }
}

export async function saveMessages(sessionId: string, messages: Message[]) {
    try {
        await dbConnect();
        const userEmail = await getSessionUserEmail();
        const updatePayload: any = { messages };
        if (userEmail) {
            updatePayload.userEmail = userEmail;
        }

        // If session exists with a different userEmail, reject unauthorized overwrite
        const existing = await ChatSession.findOne({ sessionId });
        if (existing && existing.userEmail && userEmail && existing.userEmail !== userEmail) {
            console.warn(`[saveMessages] Blocked cross-user overwrite attempt for session ${sessionId}`);
            return { success: false, error: 'Unauthorized' };
        }

        await ChatSession.findOneAndUpdate(
            { sessionId },
            { "$set": updatePayload },
            { upsert: true, new: true }
        );
        return { success: true };
    } catch (error) {
        console.error('Error saving messages:', error);
        return { success: false };
    }
}
