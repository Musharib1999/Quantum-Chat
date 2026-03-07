import mongoose, { Schema, Document } from 'mongoose';

export interface IBlockedSource extends Document {
    name: string;
    createdAt: Date;
}

const BlockedSourceSchema = new Schema<IBlockedSource>({
    name: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.BlockedSource || mongoose.model<IBlockedSource>('BlockedSource', BlockedSourceSchema);
