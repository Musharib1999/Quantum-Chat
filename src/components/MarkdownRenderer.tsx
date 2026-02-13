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
}

export default function MarkdownRenderer({ content, hideLinks }: MarkdownRendererProps) {
    return (
        <div className="prose prose-zinc dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Code blocks with syntax highlighting
                    code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <div className="rounded-lg overflow-hidden border border-border my-4 shadow-lg shrink-0 w-full min-w-0">
                                <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground font-mono">{match[1]}</span>
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 mix-blend-screen" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 mix-blend-screen" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 mix-blend-screen" />
                                    </div>
                                </div>
                                <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{ margin: 0, padding: '1.5rem', background: '#09090b', fontSize: '0.875rem' }}
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            </div>
                        ) : (
                            <code className="bg-muted text-pink-500 rounded px-1.5 py-0.5 text-sm font-mono border border-border" {...props}>
                                {children}
                            </code>
                        );
                    },
                    // Custom styling for other elements
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
