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
        enum: ['text', 'url', 'form'],
        default: 'text',
    },
    formConfig: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
    tags: {
        type: [String],
        default: [],
    },
});

export default mongoose.models.QaPair || mongoose.model('QaPair', QaPairSchema);
