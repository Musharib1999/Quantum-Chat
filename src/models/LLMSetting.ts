import mongoose, { Schema, Document } from 'mongoose';

export interface ILLMSetting extends Document {
    key: string; // "global_llm_settings"
    activeProvider: 'groq' | 'gemini';
    activeModel: string;
    updatedAt: Date;
}

const LLMSettingSchema = new Schema<ILLMSetting>({
    key: { type: String, required: true, unique: true, default: "global_llm_settings" },
    activeProvider: { type: String, enum: ['groq', 'gemini'], default: 'gemini' },
    activeModel: { type: String, default: 'gemini-2.0-flash-lite' },
    updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.LLMSetting || mongoose.model<ILLMSetting>('LLMSetting', LLMSettingSchema);
