import mongoose, { Schema, Document } from 'mongoose';

export interface IStock extends Document {
    name: string;
    symbol?: string;
    url: string;
    quantumExposureScore?: number;
    patentCount?: number;
    patentLink?: string;
    createdAt: Date;
}

const StockSchema = new Schema<IStock>({
    name: { type: String, required: true },
    symbol: { type: String, required: false },
    url: { type: String, required: true },
    quantumExposureScore: { type: Number, default: 0 },
    patentCount: { type: Number, default: 0 },
    patentLink: { type: String },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Stock || mongoose.model<IStock>('Stock', StockSchema);
