import mongoose from 'mongoose';

const SystemLogSchema = new mongoose.Schema({
    service: {
        type: String, // 'frontend' | 'backend' | 'engine'
        required: true,
    },
    logType: {
        type: String, // 'api_request' | 'model_engagement' | 'info' | 'error'
        required: true,
    },
    userId: {
        type: String, // User Email or MongoDB Object ID identifying the execution instigator
        required: false,
        index: true,
    },
    message: {
        type: String,
        required: true,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed, // Request payloads, model prompt inputs/outputs, errors
        default: {},
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    }
}, {
    capped: { size: 52428800, max: 5000 } // Cap at 50MB (max 5000 documents) for high-performance auto-overwrites
});

export default mongoose.models.SystemLog || mongoose.model('SystemLog', SystemLogSchema);
