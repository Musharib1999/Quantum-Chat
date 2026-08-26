'use server';

import dbConnect from '@/lib/db';
import ChatSession from '@/models/ChatSession';
import { Message } from '@/hooks/useQuantumChat';

export async function getChatHistory(sessionId: string) {
    try {
        await dbConnect();
        const session = await ChatSession.findOne({ sessionId }).lean();
        if (!session) {
            return [];
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
        await ChatSession.findOneAndUpdate(
            { sessionId },
            { "$set": { messages } },
            { upsert: true, new: true }
        );
        return { success: true };
    } catch (error) {
        console.error('Error saving messages:', error);
        return { success: false };
    }
}
