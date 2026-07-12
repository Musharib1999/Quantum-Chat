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
