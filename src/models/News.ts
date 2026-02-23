import mongoose, { Schema, Document } from 'mongoose';

export interface INews extends Document {
    title: string;
    source: string;
    url: string;
    publishedAt: string;
    impact: 'high' | 'medium' | 'low';
    trend: 'up' | 'down';
    summary?: string;
    createdAt: Date;
}

const NewsSchema = new Schema<INews>({
    title: { type: String, required: true, unique: true },
    source: { type: String, required: true },
    url: { type: String, required: true },
    publishedAt: { type: String, required: true },
    impact: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    trend: { type: String, enum: ['up', 'down'], default: 'up' },
    summary: { type: String },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.News || mongoose.model<INews>('News', NewsSchema);
