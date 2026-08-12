"use client";

import React from 'react';
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
    isCodeExecuting?: boolean;
    onUpdateExecutionResult?: (msgId: number, result: any) => void;
    hideRunButton?: boolean;
    isSidebar?: boolean;
}

// Helper runner component to keep execution states independent per code block
interface CodeBlockRunnerProps {
    code: string;
    language: string;
    suggestedSolver?: string;
    onExecute?: () => void;
    onUpdateExecutionResult?: (result: any) => void;
    executionResult?: any;
    isCodeExecuting?: boolean;
    props: any;
    hideRunButton?: boolean;
    isSidebar?: boolean;
}

function CodeBlockRunner({ code, language, suggestedSolver, onExecute, onUpdateExecutionResult, executionResult, isCodeExecuting, props, hideRunButton }: CodeBlockRunnerProps) {
    // isExecuting is derived from the parent message state (isCodeExecuting) to survive re-renders
    const isExecuting = isCodeExecuting ?? false;

    const handleCodeExecution = async () => {
        if (onExecute) onExecute(); // this sets isCodeExecuting=true in parent message state
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8002';
            const executionCode = code.replace(/sampling_compiler/g, "autoqubo");
            const res = await fetch(`${backendUrl}/v2/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: executionCode })
            });
            if (!res.ok) {
                throw new Error(`Server returned status ${res.status}`);
            }
            const data = await res.json();
            const result = { success: data.success, output: data.output, error: data.error };
            if (onUpdateExecutionResult) onUpdateExecutionResult(result);
        } catch (err: any) {
            const result = { success: false, error: err.message || "Failed to establish link with solver backend." };
            if (onUpdateExecutionResult) onUpdateExecutionResult(result); // this sets isCodeExecuting=false in parent
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
                                    Target: {suggestedSolver === 'GATE_BASED' ? 'Qiskit AerSimulator' : (suggestedSolver === 'QUBO' ? 'D-Wave SA' : suggestedSolver)}
                                </span>
                            )}
                        </div>
                        {!hideRunButton && (
                        <button 
                            onClick={handleCodeExecution}
                            disabled={isExecuting}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-80 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-md shadow transition-all flex items-center gap-1.5 cursor-pointer min-w-[130px] justify-center"
                        >
                            {isExecuting ? (
                                <>
                                    <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    Executing...
                                </>
                            ) : (
                                <>
                                    <span>▶</span> Execute Code
                                </>
                            )}
                        </button>
                        )}
                    </div>

                    {/* Execution Status / Loading */}
                    {isExecuting && (
                        <div className="bg-zinc-950 px-4 py-3 border-t border-zinc-800 text-xs font-mono flex items-center gap-2.5">
                            <svg className="animate-spin h-3.5 w-3.5 text-blue-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            <span className="text-blue-400">Execution in progress</span>
                            <span className="text-zinc-500">
                                {suggestedSolver === 'GATE_BASED' 
                                    ? "· Simulating quantum circuit on Qiskit Aer backend…" 
                                    : "· Submitting QUBO to D-Wave Simulated Annealing solver…"}
                            </span>
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

export default function MarkdownRenderer({ content, hideLinks, suggestedSolver, onExecute, messageId, executionResult, isCodeExecuting, onUpdateExecutionResult, hideRunButton, isSidebar }: MarkdownRendererProps) {
    const cleanContent = (content || "")
      .replace(/autoqubo/gi, "sampling_compiler")
      .replace(/auto_qubo/gi, "sampling_compiler")
      .replace(/auto qubo/gi, "sampling_compiler");

    const cleanExecutionResult = executionResult ? {
        ...executionResult,
        output: executionResult.output ? executionResult.output
            .replace(/autoqubo/gi, "sampling_compiler")
            .replace(/auto_qubo/gi, "sampling_compiler")
            .replace(/auto qubo/gi, "sampling_compiler") : undefined,
        error: executionResult.error ? executionResult.error
            .replace(/autoqubo/gi, "sampling_compiler")
            .replace(/auto_qubo/gi, "sampling_compiler")
            .replace(/auto qubo/gi, "sampling_compiler") : undefined
    } : undefined;

    if (isSidebar) {
        return (
            <div className="text-[10px] text-slate-700 leading-relaxed max-w-none">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        code({ node, inline, className, children, ...props }: any) {
                            return (
                                <code className="bg-slate-100 text-slate-600 rounded px-1 py-0.5 text-[9.5px] font-mono border border-slate-200" {...props}>
                                    {children}
                                </code>
                            );
                        },
                        ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 marker:text-slate-400 font-sans text-[10px] text-slate-600 leading-relaxed mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 marker:text-slate-400 font-sans text-[10px] text-slate-600 leading-relaxed mb-2">{children}</ol>,
                        li: ({ children }) => <li className="pl-0.5 font-sans text-[10px] text-slate-600 leading-relaxed">{children}</li>,
                        p: ({ children }) => <p className="font-sans text-[10px] text-slate-600 leading-relaxed mb-1.5">{children}</p>,
                        h1: ({ children }) => <h1 className="text-[11px] font-bold mb-1.5 mt-2.5 text-slate-700 font-sans tracking-wide">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-[10.5px] font-bold mb-1.5 mt-2 text-slate-700 font-sans tracking-wide">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-[10px] font-bold mb-1 mt-1.5 text-slate-700 font-sans tracking-wide">{children}</h3>,
                        blockquote: ({ children }) => (
                            <div className="border-l-2 border-slate-350 bg-slate-50 pl-2.5 py-1.5 my-2 italic text-slate-500 text-[10px]">
                                {children}
                            </div>
                        ),
                        a: ({ href, children }) => (
                            <span className="text-slate-500 border-b border-slate-200">
                                {children}
                            </span>
                        ),
                        table: ({ children }) => (
                            <div className="overflow-x-auto my-2 rounded-lg border border-slate-200">
                                <table className="w-full text-left text-[10px]">{children}</table>
                            </div>
                        ),
                        thead: ({ children }) => <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">{children}</thead>,
                        tbody: ({ children }) => <tbody className="divide-y divide-slate-100">{children}</tbody>,
                        tr: ({ children }) => <tr className="hover:bg-slate-50/50 transition-colors">{children}</tr>,
                        th: ({ children }) => <th className="px-2 py-1 font-semibold text-slate-700">{children}</th>,
                        td: ({ children }) => <td className="px-2 py-1 text-slate-500">{children}</td>,
                    }}
                >
                    {cleanContent}
                </ReactMarkdown>
            </div>
        );
    }

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
                                executionResult={cleanExecutionResult}
                                isCodeExecuting={isCodeExecuting}
                                hideRunButton={hideRunButton}
                                onUpdateExecutionResult={(res) => {
                                    if (onUpdateExecutionResult && messageId) {
                                        onUpdateExecutionResult(messageId, res);
                                    }
                                }}
                                props={props} 
                            />
                        ) : (
                            <code className="bg-muted text-pink-500 rounded px-1.5 py-0.5 text-sm font-mono border border-border" {...props}>
                                {children}
                            </code>
                        );
                    },
                    ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400 font-sans text-sm text-slate-700 leading-relaxed mb-3">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 marker:text-slate-400 font-sans text-sm text-slate-700 leading-relaxed mb-3">{children}</ol>,
                    li: ({ children }) => <li className="pl-0.5 font-sans text-sm text-slate-700 leading-relaxed">{children}</li>,
                    p: ({ children }) => <p className="font-sans text-sm text-slate-700 leading-relaxed mb-3">{children}</p>,
                    h1: ({ children }) => <h1 className="text-base font-bold mb-3 mt-5 text-slate-800 font-sans tracking-wide">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-sm font-bold mb-2.5 mt-4 text-slate-800 font-sans tracking-wide flex items-center gap-1.5"><span className="w-1 h-4 bg-violet-500 rounded-full inline-block"></span>{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold mb-2 mt-3.5 text-slate-800 font-sans tracking-wide">{children}</h3>,
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
                {cleanContent}
            </ReactMarkdown>
        </div>
    );
}
