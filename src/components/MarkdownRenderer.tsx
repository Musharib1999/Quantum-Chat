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
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    return (
        <div className="prose prose-zinc dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Code blocks with syntax highlighting
                    code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <div className="rounded-lg overflow-hidden border border-white/10 my-4 shadow-lg shrink-0 w-full min-w-0">
                                <div className="bg-zinc-900/50 px-4 py-2 border-b border-white/5 flex items-center justify-between">
                                    <span className="text-xs text-zinc-400 font-mono">{match[1]}</span>
                                    <div className="flex gap-1.5 opacity-50">
                                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
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
                            <code className="bg-zinc-800/50 text-white rounded px-1.5 py-0.5 text-sm font-mono border border-white/5" {...props}>
                                {children}
                            </code>
                        );
                    },
                    // Custom styling for other elements
                    ul: ({ children }) => <ul className="list-disc pl-6 space-y-2 marker:text-zinc-500">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-6 space-y-2 marker:text-zinc-500">{children}</ol>,
                    li: ({ children }) => <li className="pl-1">{children}</li>,
                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-gradient inline-block">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-5 text-white flex items-center gap-2"><span className="w-1 h-5 bg-white rounded-full inline-block"></span>{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4 text-zinc-200">{children}</h3>,
                    blockquote: ({ children }) => (
                        <div className="border-l-4 border-zinc-500 bg-white/5 pl-4 py-3 my-4 rounded-r-lg italic text-zinc-300">
                            {children}
                        </div>
                    ),
                    a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white underline underline-offset-4 decoration-white/20 transition-colors">
                            {children}
                        </a>
                    ),
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-6 rounded-lg border border-white/10">
                            <table className="w-full text-left text-sm">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-white/5 text-zinc-100 font-medium border-b border-white/10">{children}</thead>,
                    tbody: ({ children }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
                    tr: ({ children }) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
                    th: ({ children }) => <th className="px-4 py-3 font-semibold">{children}</th>,
                    td: ({ children }) => <td className="px-4 py-3 text-zinc-400">{children}</td>,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
