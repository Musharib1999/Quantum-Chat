import mongoose, { Schema, Document } from 'mongoose';

export interface IAcademyProgress extends Document {
    userId: string;
    courseId: mongoose.Types.ObjectId;
    completedSections: mongoose.Types.ObjectId[]; // List of section IDs completed
    isCompleted: boolean;
    earnedBadge: boolean;
    certificateUrl?: string;
    attempts: Record<string, number>; // SectionId -> Attempt count
    lastAccessed: Date;
}

const AcademyProgressSchema: Schema = new Schema({
    userId: { type: String, required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'AcademyCourse', required: true, index: true },
    completedSections: [{ type: Schema.Types.ObjectId, ref: 'AcademySection' }],
    isCompleted: { type: Boolean, default: false },
    earnedBadge: { type: Boolean, default: false },
    certificateUrl: { type: String },
    attempts: { type: Schema.Types.Mixed, default: {} },
    lastAccessed: { type: Date, default: Date.now }
});

// Ensure one progress record per user per course
AcademyProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.models.AcademyProgress || mongoose.model<IAcademyProgress>('AcademyProgress', AcademyProgressSchema);
