"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

// Synchronous, zero-flicker native KaTeX Component
function KaTeXMathInner({ math, displayMode = false }: { math: string; displayMode?: boolean }) {
  if (typeof window !== 'undefined' && (window as any).katex) {
    try {
      const rendered = (window as any).katex.renderToString(math.trim(), {
        displayMode,
        throwOnError: false
      });
      return (
        <span 
          dangerouslySetInnerHTML={{ __html: rendered }} 
          className={displayMode ? "block my-2 overflow-x-auto text-center p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60" : "inline-block align-middle px-0.5"} 
          suppressHydrationWarning 
        />
      );
    } catch (err) {
      console.error("KaTeX render error:", err);
    }
  }

  return (
    <span 
      className={displayMode ? "block my-2 font-mono text-xs text-sky-400 p-2 bg-zinc-900 rounded border border-zinc-800" : "font-mono text-xs text-sky-400 px-1"} 
      suppressHydrationWarning
    >
      {displayMode ? `$$${math}$$` : `$${math}$`}
    </span>
  );
}

const KaTeXMath = React.memo(KaTeXMathInner);

// Splits string by LaTeX patterns ($$...$$ or $...$ or \[...\] or \(...\))
function parseMathString(str: string): React.ReactNode[] {
  const results: React.ReactNode[] = [];
  const parts = str.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);

  parts.forEach((part, index) => {
    if (!part) return;

    if (part.startsWith('$$') && part.endsWith('$$')) {
      results.push(<KaTeXMath key={`b-${index}`} math={part.slice(2, -2)} displayMode={true} />);
    } else if (part.startsWith('$') && part.endsWith('$')) {
      results.push(<KaTeXMath key={`i-${index}`} math={part.slice(1, -1)} displayMode={false} />);
    } else {
      const subParts = part.split(/(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g);
      subParts.forEach((subPart, subIdx) => {
        if (!subPart) return;
        const key = `${index}-${subIdx}`;
        if (subPart.startsWith('\\[') && subPart.endsWith('\\]')) {
          results.push(<KaTeXMath key={`sb-${key}`} math={subPart.slice(2, -2)} displayMode={true} />);
        } else if (subPart.startsWith('\\(') && subPart.endsWith('\\)')) {
          results.push(<KaTeXMath key={`si-${key}`} math={subPart.slice(2, -2)} displayMode={false} />);
        } else {
          results.push(subPart);
        }
      });
    }
  });

  return results;
}

// Recursively processes React children to intercept text nodes for KaTeX rendering
function processMathInChildren(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') {
    return parseMathString(children);
  }

  if (Array.isArray(children)) {
    return React.Children.map(children, child => processMathInChildren(child));
  }

  if (React.isValidElement(children)) {
    const element = children as React.ReactElement<any>;
    if (element.props && element.props.children) {
      return React.cloneElement(element, {
        ...element.props,
        children: processMathInChildren(element.props.children)
      });
    }
  }

  return children;
}

// Code block with Copy button
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between px-3 py-1 bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-mono text-zinc-400 select-none">
        <span>{language || 'python'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-zinc-200 transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-2.5 text-[11px] font-mono leading-relaxed overflow-x-auto text-zinc-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

interface IdeMarkdownRendererProps {
  content: string;
  isDark?: boolean;
}

function IdeMarkdownRendererInner({ content, isDark = true }: IdeMarkdownRendererProps) {
  if (!content) return null;

  return (
    <div className="text-xs leading-relaxed font-sans space-y-2 select-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-bold text-sky-400 mt-3 mb-1.5 font-heading tracking-wide border-b border-zinc-800 pb-1">
              {processMathInChildren(children)}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold text-sky-300 mt-2.5 mb-1 font-heading tracking-wide flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
              {processMathInChildren(children)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-zinc-200 mt-2 mb-1">
              {processMathInChildren(children)}
            </h3>
          ),
          p: ({ children }) => (
            <p className="leading-relaxed mb-2 text-zinc-300 font-normal">
              {processMathInChildren(children)}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-100">
              {processMathInChildren(children)}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-zinc-300">
              {processMathInChildren(children)}
            </em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 space-y-1 mb-2 text-zinc-300">
              {processMathInChildren(children)}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-1 mb-2 text-zinc-300">
              {processMathInChildren(children)}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">
              {processMathInChildren(children)}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-sky-500/60 bg-sky-500/10 pl-2.5 py-1.5 my-2 rounded-r italic text-zinc-300">
              {processMathInChildren(children)}
            </blockquote>
          ),
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeStr = String(children).replace(/\n$/, '');
            if (!inline && (match || codeStr.includes('\n'))) {
              return <CodeBlock code={codeStr} language={match ? match[1] : 'python'} />;
            }
            return (
              <code className="bg-zinc-800/70 border border-zinc-700/60 text-sky-300 px-1.5 py-0.5 rounded text-[11px] font-mono" {...props}>
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded border border-zinc-800">
              <table className="w-full text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-zinc-900 text-zinc-200 border-b border-zinc-800 font-semibold">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-zinc-800/60">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-zinc-900/30 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-2 py-1.5 font-semibold text-zinc-200">{processMathInChildren(children)}</th>,
          td: ({ children }) => <td className="px-2 py-1.5 text-zinc-300">{processMathInChildren(children)}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

const IdeMarkdownRenderer = React.memo(IdeMarkdownRendererInner, (prev, next) => {
  return prev.content === next.content && prev.isDark === next.isDark;
});

export default IdeMarkdownRenderer;
