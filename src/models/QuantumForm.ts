import mongoose, { Schema, Document } from 'mongoose';

export interface IQuantumField {
    label: string;
    key: string;
    type: 'text' | 'number' | 'select' | 'range';
    options?: string[];
    description?: string;
    defaultValue?: string;
}

export interface IQuantumForm extends Document {
    industry: string;
    service: string;
    problem: string;
    description: string;
    fields: IQuantumField[];
    active: boolean;
    createdAt: Date;
}

const QuantumFieldSchema = new Schema({
    label: { type: String, required: true },
    key: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'select', 'range'], required: true },
    options: [String],
    description: String,
    defaultValue: String
});

const QuantumFormSchema: Schema = new Schema({
    industry: { type: String, required: true },
    service: { type: String, required: true },
    problem: { type: String, required: true },
    description: { type: String },
    fields: [QuantumFieldSchema],
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// Ensure unique mapping for Industry + Service + Problem
QuantumFormSchema.index({ industry: 1, service: 1, problem: 1 }, { unique: true });

export default mongoose.models.QuantumForm || mongoose.model<IQuantumForm>('QuantumForm', QuantumFormSchema);
