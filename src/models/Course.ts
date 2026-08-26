import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseModule {
    name: string;
    topics: string[];
}

export interface ICourse extends Document {
    level: number;
    title: string;
    subtitle: string;
    modules: ICourseModule[];
    handsOn: string[];
    outcome: string;
    prompt: string;
    posts: string[];
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const CourseModuleSchema = new Schema({
    name: { type: String, required: true },
    topics: { type: [String], default: [] }
});

const CourseSchema: Schema = new Schema({
    level: { type: Number, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    modules: { type: [CourseModuleSchema], default: [] },
    handsOn: { type: [String], default: [] },
    outcome: { type: String, required: true },
    prompt: { type: String, required: true },
    posts: { type: [String], default: [] },
    order: { type: Number, required: true, default: 0 }
}, {
    timestamps: true
});

export default mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);
