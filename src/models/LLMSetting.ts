import mongoose, { Schema, Document } from 'mongoose';

export interface ILLMSetting extends Document {
    name: string; // Friendly name for the UI
    activeProvider: 'groq' | 'gemini';
    activeModel: string;
    description?: string;
    isDefault: boolean;
    updatedAt: Date;
}

const LLMSettingSchema = new Schema<ILLMSetting>({
    name: { type: String, required: true },
    activeProvider: { type: String, enum: ['groq', 'gemini'], default: 'gemini' },
    activeModel: { type: String, default: 'gemini-2.0-flash-lite' },
    description: { type: String },
    isDefault: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.LLMSetting || mongoose.model<ILLMSetting>('LLMSetting', LLMSettingSchema);
