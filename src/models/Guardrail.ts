import mongoose from 'mongoose';

const GuardrailSchema = new mongoose.Schema({
    rule: {
        type: String,
        required: [true, 'Please provide a rule'],
    },
    type: {
        type: String,
        enum: ['banned_topic', 'safety_check', 'pii_masking'],
        required: true,
    },
    active: {
        type: Boolean,
        default: true,
    },
});

export default mongoose.models.Guardrail || mongoose.model('Guardrail', GuardrailSchema);
