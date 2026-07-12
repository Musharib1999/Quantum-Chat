"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import ts from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Register languages for syntax highlighting
SyntaxHighlighter.registerLanguage('typescript', ts);
SyntaxHighlighter.registerLanguage('javascript', ts);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('json', json);

interface MarkdownRendererProps {
    content: string;
    hideLinks?: boolean;
    suggestedSolver?: string;
    onExecute?: () => void;
    messageId?: number;
    executionResult?: any;
    onUpdateExecutionResult?: (msgId: number, result: any) => void;
}

// Helper runner component to keep execution states independent per code block
interface CodeBlockRunnerProps {
    code: string;
    language: string;
    suggestedSolver?: string;
    onExecute?: () => void;
    onUpdateExecutionResult?: (result: any) => void;
    executionResult?: any;
    props: any;
}

function CodeBlockRunner({ code, language, suggestedSolver, onExecute, onUpdateExecutionResult, executionResult: initialExecutionResult, props }: CodeBlockRunnerProps) {
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState<{
        success: boolean;
        output?: string;
        error?: string;
    } | null>(initialExecutionResult || null);

    const handleCodeExecution = async () => {
        setIsExecuting(true);
        setExecutionResult(null);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8002';
            const res = await fetch(`${backendUrl}/v2/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            if (!res.ok) {
                throw new Error(`Server returned status ${res.status}`);
            }
            const data = await res.json();
            const result = { success: data.success, output: data.output, error: data.error };
            setExecutionResult(result);
            if (onUpdateExecutionResult) onUpdateExecutionResult(result);
            
            // Dispatch a visual callback event if needed
            if (onExecute) onExecute();
        } catch (err: any) {
            const result = { success: false, error: err.message || "Failed to establish link with solver backend." };
            setExecutionResult(result);
            if (onUpdateExecutionResult) onUpdateExecutionResult(result);
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="rounded-lg overflow-hidden border border-border my-4 shadow-lg shrink-0 w-full min-w-0">
            <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">{language}</span>
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 mix-blend-screen" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 mix-blend-screen" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 mix-blend-screen" />
                </div>
            </div>
            <div className="w-full overflow-x-auto">
                <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={language}
                    PreTag="div"
                    customStyle={{ margin: 0, padding: '1.5rem', background: '#09090b', fontSize: '0.875rem' }}
                    {...props}
                >
                    {code}
                </SyntaxHighlighter>
            </div>
            {language === 'python' && (
                <>
                    <div className="bg-[#1e1e1e] px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {suggestedSolver && (
                                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Target: {suggestedSolver}
                                </span>
                            )}
                        </div>
                        <button 
                            onClick={handleCodeExecution}
                            disabled={isExecuting}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-semibold rounded-md shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                        >
                            {isExecuting ? (
                                <>
                                    <span className="animate-spin">⏳</span> Executing...
                                </>
                            ) : (
                                <>
                                    <span>▶</span> Execute Code
                                </>
                            )}
                        </button>
                    </div>

                    {/* Execution Status / Loading */}
                    {isExecuting && (
                        <div className="bg-zinc-950 px-4 py-3 border-t border-zinc-800 text-xs text-blue-400 font-mono flex items-center gap-2 animate-pulse">
                            <span>⚡</span> Connecting to solver engine and allocating QPU bounds...
                        </div>
                    )}

                    {/* Execution Terminal Result */}
                    {executionResult && (
                        <div className="bg-zinc-950 border-t border-zinc-800">
                            <div className="px-4 py-2 bg-zinc-900/50 flex items-center justify-between text-[10px] text-zinc-500 font-mono border-b border-zinc-900">
                                <span>SOLVER TERMINAL OUTPUT</span>
                                <span className={executionResult.success ? "text-emerald-400" : "text-rose-400"}>
                                    {executionResult.success ? "● SUCCESS" : "● ERROR"}
                                </span>
                            </div>
                            <pre className="p-4 text-xs font-mono overflow-x-auto max-h-60 leading-relaxed text-zinc-300">
                                {executionResult.output && (
                                    <div className="text-emerald-400/90 whitespace-pre-wrap">{executionResult.output}</div>
                                )}
                                {executionResult.error && (
                                    <div className="text-rose-400 whitespace-pre-wrap">{executionResult.error}</div>
                                )}
                            </pre>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default function MarkdownRenderer({ content, hideLinks, suggestedSolver, onExecute, messageId, executionResult, onUpdateExecutionResult }: MarkdownRendererProps) {
    return (
        <div className="prose prose-zinc dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-6 prose-pre:p-0 prose-pre:bg-transparent">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Code blocks with syntax highlighting
                    code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeStr = String(children).replace(/\n$/, '');
                        return !inline && match ? (
                            <CodeBlockRunner 
                                code={codeStr} 
                                language={match[1]} 
                                suggestedSolver={suggestedSolver} 
                                onExecute={onExecute} 
                                props={props} 
                            />
                        ) : (
                            <code className="bg-muted text-pink-500 rounded px-1.5 py-0.5 text-sm font-mono border border-border" {...props}>
                                {children}
                            </code>
                        );
                    },
                    ul: ({ children }) => <ul className="list-disc pl-6 space-y-2 marker:text-primary">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-6 space-y-2 marker:text-primary">{children}</ol>,
                    li: ({ children }) => <li className="pl-1 text-foreground">{children}</li>,
                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-foreground inline-block">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-5 text-foreground flex items-center gap-2"><span className="w-1 h-5 bg-primary rounded-full inline-block"></span>{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4 text-foreground/90">{children}</h3>,
                    blockquote: ({ children }) => (
                        <div className="border-l-4 border-primary/50 bg-primary/5 pl-4 py-3 my-4 rounded-r-lg italic text-muted-foreground">
                            {children}
                        </div>
                    ),
                    a: ({ href, children }) => hideLinks ? (
                        <span className="text-muted-foreground border-b border-border">
                            {children}
                        </span>
                    ) : (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 underline underline-offset-4 decoration-blue-500/30 transition-colors">
                            {children}
                        </a>
                    ),
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-6 rounded-lg border border-border">
                            <table className="w-full text-left text-sm">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-muted text-foreground font-medium border-b border-border">{children}</thead>,
                    tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
                    tr: ({ children }) => <tr className="hover:bg-muted/50 transition-colors">{children}</tr>,
                    th: ({ children }) => <th className="px-4 py-3 font-semibold text-foreground">{children}</th>,
                    td: ({ children }) => <td className="px-4 py-3 text-muted-foreground">{children}</td>,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
