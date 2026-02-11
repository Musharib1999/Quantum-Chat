import mongoose, { Schema, Document } from 'mongoose';

export interface IStock extends Document {
    name: string;
    symbol?: string;
    url: string;
    createdAt: Date;
}

const StockSchema = new Schema<IStock>({
    name: { type: String, required: true },
    symbol: { type: String, required: false }, // Optional, can be derived or manually added
    url: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Stock || mongoose.model<IStock>('Stock', StockSchema);
