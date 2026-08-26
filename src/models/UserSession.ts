import mongoose from 'mongoose';

const UserSessionSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '7d', // Session automatically expires and gets deleted after 7 days
    }
});

export default mongoose.models.UserSession || mongoose.model('UserSession', UserSessionSchema);
