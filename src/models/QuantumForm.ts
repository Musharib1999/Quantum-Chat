import mongoose, { Schema, Document } from 'mongoose';

export interface IQuantumField {
    label: string;
    key: string;
    type: 'text' | 'number' | 'select' | 'multi-select' | 'range';
    options?: { label: string; value: string }[] | string[];
    description?: string;
    defaultValue?: string;
}

export interface IQuantumForm extends Document {
    industry: string;
    service: string;
    problem: string;
    hardware: string;
    description: string;
    fields: IQuantumField[];
    sections?: { section_name: string; fields: IQuantumField[] }[];
    codeTemplates?: { 
        hardware: string; 
        code: string;
        aiEnabled: boolean;
        llmModelId?: string;
    }[];
    active: boolean;
    batchingEnabled?: boolean;
    maxQubitsPerBatch?: number;
    qubitFormula?: string;
    batchKey?: string; // e.g. 'days' or 'time_steps'
    outputMapping?: {
        resultKey: string;
        label: string;
        type: 'text' | 'number' | 'percentage' | 'boolean';
        priority?: number;
    }[];
    outputTables?: {
        name: string;
        mapping: {
            resultKey: string;
            label: string;
            type: 'text' | 'number' | 'percentage' | 'boolean';
            priority?: number;
        }[];
    }[];
    interpretationPrompt?: string;
    chartConfig?: {
        type: 'bar' | 'line' | 'pie' | 'scatter';
        xKey: string;
        yKey: string;
        label: string;
    }[];
    executionEnvironment?: 'python-qiskit' | 'python-dwave';
    aiEnabled: boolean;
    llmModelId?: string;
    category?: 'public' | 'enterprise';
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string; // User ID
}

const OutputMappingSchema = new Schema({
    resultKey: String,
    label: String,
    type: { type: String, enum: ['text', 'number', 'percentage', 'boolean'] },
    priority: Number
});

const QuantumFieldSchema = new Schema({
    label: { type: String, required: true },
    key: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'select', 'multi-select', 'range', 'textarea', 'dropdown'], required: true },
    options: { type: [Schema.Types.Mixed], default: [] }, // Allow strings or objects
    description: String,
    defaultValue: String,
    required: { type: Boolean, default: false }
});

const QuantumFormSchema: Schema = new Schema({
    industry: { type: String, required: true },
    service: { type: String, required: true },
    problem: { type: String, required: true },
    hardware: { type: String, default: "Universal" },
    description: { type: String },
    fields: { type: [QuantumFieldSchema], default: [] },
    sections: [{
        section_name: { type: String, required: true },
        fields: [QuantumFieldSchema]
    }],
    codeTemplates: [{
        hardware: { type: String, required: true },
        code: { type: String, required: true },
        aiEnabled: { type: Boolean, default: false },
        llmModelId: { type: String }
    }],
    active: { type: Boolean, default: true },
    batchingEnabled: { type: Boolean, default: false },
    maxQubitsPerBatch: { type: Number, default: 64 },
    qubitFormula: { type: String, default: "" },
    batchKey: { type: String, default: "" },
    outputMapping: [OutputMappingSchema],
    outputTables: [{
        name: { type: String, required: true },
        mapping: [OutputMappingSchema]
    }],
    interpretationPrompt: { type: String },
    chartConfig: [{
        type: { type: String, enum: ['bar', 'line', 'pie', 'scatter'] },
        xKey: String,
        yKey: String,
        label: String
    }],
    executionEnvironment: { type: String, enum: ['python-qiskit', 'python-dwave'] },
    aiEnabled: { type: Boolean, default: false },
    llmModelId: { type: String },
    category: { type: String, enum: ['public', 'enterprise'], default: 'public' },
    createdBy: { type: String, index: true },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure unique mapping for Industry + Service + Problem
QuantumFormSchema.index({ industry: 1, service: 1, problem: 1 }, { unique: true });

export default mongoose.models.QuantumForm || mongoose.model<IQuantumForm>('QuantumForm', QuantumFormSchema);
