import mongoose, { Schema, Document } from 'mongoose';

export interface IArticle extends Document {
    title: string;
    category: string;
    url: string;
    createdAt: Date;
}

const ArticleSchema = new Schema<IArticle>({
    title: { type: String, required: true },
    category: { type: String, required: true },
    url: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Article || mongoose.model<IArticle>('Article', ArticleSchema);
