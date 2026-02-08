import mongoose from 'mongoose';

const QaPairSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, 'Please provide a question'],
    },
    answer: {
        type: String,
        required: [true, 'Please provide an answer'],
    },
    type: {
        type: String,
        enum: ['text', 'url'],
        default: 'text',
    },
    tags: {
        type: [String],
        default: [],
    },
});

export default mongoose.models.QaPair || mongoose.model('QaPair', QaPairSchema);
