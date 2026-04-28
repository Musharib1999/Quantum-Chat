import mongoose, { Schema, Document } from 'mongoose';

export interface IShot extends Document {
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
    assignmentsTable?: any[]; // Structured output data
    portfolioMetrics?: any; // Specialized finance metrics
    qubitCount?: number; 
    outputTables?: any[]; // Dynamic table configuration
    cacheKey?: string; // SHA-256 hash for result caching
    source: string; // "Web" or "API"
    executionTimeMs?: number; // Latency tracking for enterprise streams
}

const ShotSchema: Schema = new Schema({
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
    chartData: { type: Schema.Types.Mixed },
    assignmentsTable: { type: Schema.Types.Mixed },
    portfolioMetrics: { type: Schema.Types.Mixed },
    qubitCount: { type: Number, default: 0 },
    outputTables: { type: Schema.Types.Mixed },
    cacheKey: { type: String, index: true },
    source: { type: String, default: 'Web', index: true },
    executionTimeMs: { type: Number }
}, { collection: 'experiments' }); // <--- Explicit collection mapping to PRESERVE historical execution logs!

export default mongoose.models.Shot || mongoose.model<IShot>('Shot', ShotSchema);
