import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage {
    id: number;
    sender: 'user' | 'bot';
    text: string;
    workflowSteps?: IWorkflowSteps;
}

export interface IWorkflowSteps {
    nlp?: string;
    reasoner?: string;
    suggestor?: string;
    solver?: string;
    verifier?: string;
    dcc?: boolean;
    loading?: boolean;
    latex_model?: string;
    optimization_stats?: any;
    solver_routing?: any;
    qa_report?: any;
    compiler_metrics?: any;
}

export interface IChatSession extends Document {
    title: string;
    messages: IChatMessage[];
    workflowSteps: IWorkflowSteps;
    createdAt: Date;
    updatedAt: Date;
}

const WorkflowStepsSchema = new Schema({
    nlp: String,
    reasoner: String,
    suggestor: String,
    solver: String,
    verifier: String,
    dcc: Boolean,
    latex_model: String,
    optimization_stats: Schema.Types.Mixed,
    solver_routing: Schema.Types.Mixed,
    qa_report: Schema.Types.Mixed,
    compiler_metrics: Schema.Types.Mixed
});

const ChatMessageSchema = new Schema({
    id: { type: Number, required: true },
    sender: { type: String, enum: ['user', 'bot'], required: true },
    text: { type: String, required: true },
    workflowSteps: WorkflowStepsSchema
});

const ChatSessionSchema = new Schema({
    title: { type: String, required: true },
    messages: [ChatMessageSchema],
    workflowSteps: WorkflowStepsSchema
}, {
    timestamps: true
});

if (mongoose.models && mongoose.models.ChatSession) {
    delete mongoose.models.ChatSession;
}
export default mongoose.models.ChatSession || mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
