import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
    },
    firstName: {
        type: String,
        default: '',
    },
    lastName: {
        type: String,
        default: '',
    },
    phone: {
        type: String,
        default: '',
    },
    plan: {
        type: String,
        enum: ['Guest', 'Pro', 'Enterprise'],
        default: 'Guest',
    },
    role: {
        type: String,
        default: 'user', // 'user' or 'admin'
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
