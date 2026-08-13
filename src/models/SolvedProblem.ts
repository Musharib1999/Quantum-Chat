import mongoose from 'mongoose';

const SolvedProblemSchema = new mongoose.Schema({
    promptHash: {
        type: String,
        required: true,
        unique: true,
    },
    normalizedPrompt: {
        type: String,
        required: true,
    },
    originalPrompt: {
        type: String,
        required: true,
    },
    response: {
        type: String,
        required: true,
    },
    workflowSteps: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 604800, // Automatic MongoDB TTL index (7 days = 604,800 seconds)
    },
});

export default mongoose.models.SolvedProblem || mongoose.model('SolvedProblem', SolvedProblemSchema);
