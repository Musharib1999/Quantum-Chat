import mongoose, { Schema, Document } from 'mongoose';

export interface IIssueReport extends Document {
    issueId: string;
    status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: 'code_execution' | 'ai_synthesis' | 'ui_editor' | 'journey' | 'performance' | 'other';
    title: string;
    description: string;
    userEmail?: string;
    userId?: string;
    isGuest: boolean;
    flowContext: {
        route?: string;
        framework?: string;
        projectId?: string;
        projectTitle?: string;
        activeFile?: string;
        activeTab?: string;
        codeSnippet?: string;
        projectFiles?: Record<string, string>;
        lastExecution?: {
            success?: boolean;
            stdout?: string;
            stderr?: string;
            simulatorId?: string;
            executionTimeMs?: number;
            backendUsed?: string;
            activeQubits?: number;
        };
        recentChatMessages?: Array<{
            sender: string;
            text: string;
            timestamp?: string;
        }>;
        clientEnv?: {
            userAgent?: string;
            screen?: string;
            url?: string;
        };
    };
    adminNotes?: string;
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const IssueReportSchema = new Schema<IIssueReport>({
    issueId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'dismissed'],
        default: 'open',
        index: true,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
        index: true,
    },
    category: {
        type: String,
        enum: ['code_execution', 'ai_synthesis', 'ui_editor', 'journey', 'performance', 'other'],
        default: 'other',
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    userEmail: {
        type: String,
        index: true,
        trim: true,
    },
    userId: {
        type: String,
        index: true,
    },
    isGuest: {
        type: Boolean,
        default: false,
    },
    flowContext: {
        route: { type: String },
        framework: { type: String },
        projectId: { type: String },
        projectTitle: { type: String },
        activeFile: { type: String },
        activeTab: { type: String },
        codeSnippet: { type: String },
        projectFiles: { type: Schema.Types.Mixed, default: {} },
        lastExecution: {
            success: { type: Boolean },
            stdout: { type: String },
            stderr: { type: String },
            simulatorId: { type: String },
            executionTimeMs: { type: Number },
            backendUsed: { type: String },
            activeQubits: { type: Number },
        },
        recentChatMessages: [
            {
                sender: { type: String },
                text: { type: String },
                timestamp: { type: String },
            }
        ],
        clientEnv: {
            userAgent: { type: String },
            screen: { type: String },
            url: { type: String },
        },
    },
    adminNotes: {
        type: String,
        default: '',
    },
    resolvedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

export default mongoose.models.IssueReport || mongoose.model<IIssueReport>('IssueReport', IssueReportSchema);
