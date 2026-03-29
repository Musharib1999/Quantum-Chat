import mongoose, { Schema, Document } from 'mongoose';

export interface IDataPipeline extends Document {
    enterpriseName: string;
    description?: string;
    problemId: string; // Refers to QuantumForm problem ID or ObjectID
    webhookUrl: string;
    apiKeyPreview: string; // Store last 4 chars for UI visibility
    status: 'active' | 'suspended' | 'draft';
    createdAt: Date;
    updatedAt: Date;
}

const DataPipelineSchema: Schema = new Schema({
    enterpriseName: { type: String, required: true },
    description: { type: String },
    problemId: { type: String, required: true }, // The B2B mapped blueprint
    webhookUrl: { type: String, required: true },
    apiKeyPreview: { type: String },
    status: { type: String, enum: ['active', 'suspended', 'draft'], default: 'draft' }
}, { timestamps: true });

export default mongoose.models.DataPipeline || mongoose.model<IDataPipeline>('DataPipeline', DataPipelineSchema);
