import mongoose, { Schema, Document } from 'mongoose';

export interface IAcademyCourse extends Document {
    title: string;
    description: string;
    thumbnail?: string;
    category: string; // e.g. "Quantum Annealing", "Gate-Model", "Optimization"
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    points: number; // Total points for completing the course
    isPublished: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const AcademyCourseSchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: { type: String },
    category: { type: String, default: 'General Quantum' },
    difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    points: { type: Number, default: 100 },
    isPublished: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.AcademyCourse || mongoose.model<IAcademyCourse>('AcademyCourse', AcademyCourseSchema);
