import mongoose from 'mongoose';

const ChatLogSchema = new mongoose.Schema({
    userQuery: {
        type: String,
        required: true,
    },
    aiResponse: {
        type: String,
        required: true,
    },
    source: {
        type: String, // 'direct', 'rag', 'gemini', 'blocked'
        default: 'gemini',
    },
    context: {
        type: String, // The snippet used for RAG, if any
    },
    guardrailsStatus: {
        type: String, // 'passed', 'violated'
        default: 'passed'
    },
    activeGuardrails: [String], // List of rules checked
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.ChatLog || mongoose.model('ChatLog', ChatLogSchema);
