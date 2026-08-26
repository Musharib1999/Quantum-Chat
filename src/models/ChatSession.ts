import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    text: { type: String },
    sender: { type: String, enum: ["user", "bot", "system"], required: true },
    timestamp: { type: String, required: true },
    isStreaming: { type: Boolean, default: false },
    // Code execution result attached to the message
    executionResult: {
        success: { type: Boolean },
        output: { type: String },
        error: { type: String }
    },
    // Optional workflow metadata
    workflowType: { type: String },
    workflowData: { type: mongoose.Schema.Types.Mixed },
    workflowSteps: { type: mongoose.Schema.Types.Mixed },
    chartData: { type: mongoose.Schema.Types.Mixed },
    portfolioMetrics: { type: mongoose.Schema.Types.Mixed },
    assignmentsTable: [{ type: mongoose.Schema.Types.Mixed }],
    outputTables: [{ type: mongoose.Schema.Types.Mixed }]
}, { _id: false });

const ChatSessionSchema = new mongoose.Schema({
    sessionId: { type: String, default: () => new mongoose.Types.ObjectId().toString(), unique: true },
    title: { type: String, default: "Untitled Session" },
    pipeline: { type: String, default: "general" },
    userEmail: { type: String, required: false },
    workflowSteps: { type: mongoose.Schema.Types.Mixed },
    shareId: { type: String, sparse: true },
    isPublic: { type: Boolean, default: false },
    messages: [MessageSchema]
}, { timestamps: true });

if (mongoose.models && mongoose.models.ChatSession) { delete mongoose.models.ChatSession; }
export default mongoose.models.ChatSession || mongoose.model("ChatSession", ChatSessionSchema);
