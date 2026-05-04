import mongoose, { Schema, Document } from 'mongoose';

export interface IAcademySection extends Document {
    courseId: mongoose.Types.ObjectId;
    title: string;
    type: 'text' | 'question';
    content: string; // Markdown content for text lessons
    order: number;
    // For Questions
    provider?: 'dwave' | 'qiskit' | 'ortools';
    boilerplateCode?: string;
    targetAnswer?: any; // The expected JSON output for exact match validation
    explanation?: string; // Shown after success
}

const AcademySectionSchema: Schema = new Schema({
    courseId: { type: Schema.Types.ObjectId, ref: 'AcademyCourse', required: true, index: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['text', 'question'], required: true },
    content: { type: String, required: true },
    order: { type: Number, required: true },
    provider: { type: String, enum: ['dwave', 'qiskit', 'ortools'] },
    boilerplateCode: { type: String },
    targetAnswer: { type: Schema.Types.Mixed },
    explanation: { type: String }
});

export default mongoose.models.AcademySection || mongoose.model<IAcademySection>('AcademySection', AcademySectionSchema);
