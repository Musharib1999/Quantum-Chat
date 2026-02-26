import mongoose, { Schema, Document } from 'mongoose';

export interface IUseCase extends Document {
    title: string;
    industry: string;
    description: string;
    url?: string;
    createdAt: Date;
}

const UseCaseSchema: Schema = new Schema({
    title: { type: String, required: true },
    industry: { type: String, required: true },
    description: { type: String, required: true },
    url: { type: String },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.UseCase || mongoose.model<IUseCase>('UseCase', UseCaseSchema);
