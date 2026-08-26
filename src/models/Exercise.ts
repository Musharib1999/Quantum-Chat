import mongoose, { Schema, Document } from 'mongoose';

export interface IExercise extends Document {
    courseId: string;
    title: string;
    type: 'code' | 'circuit' | 'optimization';
    qubits: number;
    bits: number;
    instructions: string;
    hints: string[];
    expectedGates: string[];
    targetState: string;
    referenceCode: string;
    createdAt: Date;
    updatedAt: Date;
}

const ExerciseSchema = new Schema({
    courseId: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['code', 'circuit', 'optimization'], default: 'circuit' },
    qubits: { type: Number, default: 2 },
    bits: { type: Number, default: 2 },
    instructions: { type: String, required: true },
    hints: { type: [String], default: [] },
    expectedGates: { type: [String], default: [] },
    targetState: { type: String, default: "" },
    referenceCode: { type: String, default: "" }
}, {
    timestamps: true
});

export default mongoose.models.Exercise || mongoose.model<IExercise>('Exercise', ExerciseSchema);
