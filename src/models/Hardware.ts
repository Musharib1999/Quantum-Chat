import mongoose, { Schema, Document } from 'mongoose';

export interface IHardware extends Document {
    name: string;
    provider: 'ibm' | 'ionq' | 'rigetti' | 'dwave' | 'other';
    qubits: number;
    status: 'Online' | 'Offline' | 'Maintenance';
    description: string;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const HardwareSchema: Schema = new Schema({
    name: { type: String, required: true },
    provider: {
        type: String,
        required: true,
        enum: ['ibm', 'ionq', 'rigetti', 'dwave', 'other'],
        default: 'other'
    },
    qubits: { type: Number, required: true, default: 0 },
    status: {
        type: String,
        required: true,
        enum: ['Online', 'Offline', 'Maintenance'],
        default: 'Online'
    },
    description: { type: String, required: true },
    order: { type: Number, required: true, default: 0 },
}, {
    timestamps: true,
});

export default mongoose.models.Hardware || mongoose.model<IHardware>('Hardware', HardwareSchema);
