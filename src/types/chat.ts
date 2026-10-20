export interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot' | 'system';
    timestamp: string;
    isStreaming?: boolean;
    executionResult?: {
        success?: boolean;
        output?: string;
        error?: string;
        [key: string]: any;
    };
    isCodeExecuting?: boolean;
    chartData?: any;
    portfolioMetrics?: any;
    assignmentsTable?: any[];
    outputTables?: any[];
    workflowType?: 'form' | 'review' | 'pipeline' | 'result';
    workflowData?: {
        portfolio?: any;
        problemSpec?: any;
        selectedAssets?: string[];
        quboMatrix?: number[][];
        step?: number;
        [key: string]: any;
    };
    workflowSteps?: any;
    feedbackGiven?: 'up' | 'down';
    activePipeline?: string;
    reasoning?: string;
    isReasoningStreaming?: boolean;
}
