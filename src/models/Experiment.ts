import mongoose, { Schema, Document } from 'mongoose';

export interface IExperiment extends Document {
    userId?: string; // Optional for now, useful for future auth
    timestamp: Date;
    industry: string;
    service: string;
    problem: string;
    hardware: string;
    parameters: any; // JSON object of input params
    qiskitCode: string; // The generated code
    results: any; // The simulation results (counts, etc.)
    analysis: string; // The LLM explanation
    chartData?: any; // The chart configuration
}

const ExperimentSchema: Schema = new Schema({
    userId: { type: String, index: true },
    timestamp: { type: Date, default: Date.now },
    industry: { type: String, required: true },
    service: { type: String, required: true },
    problem: { type: String, required: true },
    hardware: { type: String, required: true },
    parameters: { type: Schema.Types.Mixed, required: true },
    qiskitCode: { type: String, required: true },
    results: { type: Schema.Types.Mixed, required: true },
    analysis: { type: String, required: true },
    chartData: { type: Schema.Types.Mixed }
});

export default mongoose.models.Experiment || mongoose.model<IExperiment>('Experiment', ExperimentSchema);
