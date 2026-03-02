import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMarketPrompt extends Document {
    label: string;
    query: string;
    isActive: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const MarketPromptSchema: Schema = new Schema(
    {
        label: {
            type: String,
            required: [true, 'Please provide a label for this prompt'],
            trim: true,
            maxlength: [50, 'Label cannot be more than 50 characters'],
        },
        query: {
            type: String,
            required: [true, 'Please provide the query text to trigger'],
            trim: true,
            maxlength: [500, 'Query cannot be more than 500 characters'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        order: {
            type: Number,
            default: 0,
        }
    },
    {
        timestamps: true,
        collection: 'market_prompts'
    }
);

const MarketPrompt: Model<IMarketPrompt> = mongoose.models.MarketPrompt || mongoose.model<IMarketPrompt>('MarketPrompt', MarketPromptSchema);

export default MarketPrompt;
