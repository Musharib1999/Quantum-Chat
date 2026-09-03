"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

// Synchronous, zero-flicker native KaTeX Component with full light/dark theme support
function KaTeXMathInner({ math, displayMode = false, isDark = true }: { math: string; displayMode?: boolean; isDark?: boolean }) {
  if (typeof window !== 'undefined' && (window as any).katex) {
    try {
      const rendered = (window as any).katex.renderToString(math.trim(), {
        displayMode,
        throwOnError: false
      });
      return (
        <span 
          dangerouslySetInnerHTML={{ __html: rendered }} 
          className={displayMode 
            ? `block my-2 overflow-x-auto text-center p-2 rounded-lg border ${
                isDark ? 'bg-zinc-950/70 border-zinc-800/80 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-900'
              }` 
            : `inline-block align-middle px-0.5 ${isDark ? 'text-zinc-100' : 'text-slate-900 font-medium'}`
          } 
          suppressHydrationWarning 
        />
      );
    } catch (err) {
      console.error("KaTeX render error:", err);
    }
  }

  return (
    <span 
      className={displayMode 
        ? `block my-2 font-mono text-xs p-2 rounded border ${
            isDark ? 'text-sky-400 bg-zinc-900 border-zinc-800' : 'text-sky-700 bg-sky-50 border-sky-200'
          }` 
        : `font-mono text-xs px-1 ${isDark ? 'text-sky-400' : 'text-sky-700'}`
      } 
      suppressHydrationWarning
    >
      {displayMode ? `$$${math}$$` : `$${math}$`}
    </span>
  );
}

const KaTeXMath = React.memo(KaTeXMathInner);

// Splits string by LaTeX patterns ($$...$$ or $...$ or \[...\] or \(...\))
function parseMathString(str: string, isDark: boolean): React.ReactNode[] {
  const results: React.ReactNode[] = [];
  const parts = str.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);

  parts.forEach((part, index) => {
    if (!part) return;

    if (part.startsWith('$$') && part.endsWith('$$')) {
      results.push(<KaTeXMath key={`b-${index}`} math={part.slice(2, -2)} displayMode={true} isDark={isDark} />);
    } else if (part.startsWith('$') && part.endsWith('$')) {
      results.push(<KaTeXMath key={`i-${index}`} math={part.slice(1, -1)} displayMode={false} isDark={isDark} />);
    } else {
      const subParts = part.split(/(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g);
      subParts.forEach((subPart, subIdx) => {
        if (!subPart) return;
        const key = `${index}-${subIdx}`;
        if (subPart.startsWith('\\[') && subPart.endsWith('\\]')) {
          results.push(<KaTeXMath key={`sb-${key}`} math={subPart.slice(2, -2)} displayMode={true} isDark={isDark} />);
        } else if (subPart.startsWith('\\(') && subPart.endsWith('\\)')) {
          results.push(<KaTeXMath key={`si-${key}`} math={subPart.slice(2, -2)} displayMode={false} isDark={isDark} />);
        } else {
          results.push(subPart);
        }
      });
    }
  });

  return results;
}

// Recursively processes React children to intercept text nodes for KaTeX rendering
function processMathInChildren(children: React.ReactNode, isDark: boolean): React.ReactNode {
  if (typeof children === 'string') {
    return parseMathString(children, isDark);
  }

  if (Array.isArray(children)) {
    return React.Children.map(children, child => processMathInChildren(child, isDark));
  }

  if (React.isValidElement(children)) {
    const element = children as React.ReactElement<any>;
    if (element.props && element.props.children) {
      return React.cloneElement(element, {
        ...element.props,
        children: processMathInChildren(element.props.children, isDark)
      });
    }
  }

  return children;
}

// Code block with Copy button
function CodeBlock({ code, language, isDark }: { code: string; language?: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`my-2 rounded-lg overflow-hidden border ${isDark ? 'border-zinc-800 bg-zinc-950' : 'border-slate-300 bg-slate-900 text-slate-100 shadow-sm'}`}>
      <div className={`flex items-center justify-between px-3 py-1 border-b text-[10px] font-mono select-none ${isDark ? 'bg-zinc-900/80 border-zinc-800 text-zinc-400' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
        <span>{language || 'python'}</span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1 transition-colors cursor-pointer ${isDark ? 'hover:text-zinc-200' : 'hover:text-white'}`}
          title="Copy code"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-2.5 text-[11px] font-mono leading-relaxed overflow-x-auto text-slate-100">
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
    <div className={`text-xs leading-relaxed font-sans space-y-2 select-text ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className={`text-sm font-bold mt-3 mb-1.5 font-heading tracking-wide border-b pb-1 ${
              isDark ? 'text-sky-400 border-zinc-800' : 'text-sky-800 border-slate-200'
            }`}>
              {processMathInChildren(children, isDark)}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-xs font-bold mt-2.5 mb-1 font-heading tracking-wide flex items-center gap-1.5 ${
              isDark ? 'text-sky-300' : 'text-sky-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${isDark ? 'bg-sky-400' : 'bg-sky-600'}`} />
              {processMathInChildren(children, isDark)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-xs font-semibold mt-2 mb-1 ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
              {processMathInChildren(children, isDark)}
            </h3>
          ),
          p: ({ children }) => (
            <p className={`leading-relaxed mb-2 font-normal ${isDark ? 'text-zinc-300' : 'text-slate-800 font-medium'}`}>
              {processMathInChildren(children, isDark)}
            </p>
          ),
          strong: ({ children }) => (
            <strong className={`font-bold ${isDark ? 'text-zinc-100' : 'text-slate-950'}`}>
              {processMathInChildren(children, isDark)}
            </strong>
          ),
          em: ({ children }) => (
            <em className={`italic ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
              {processMathInChildren(children, isDark)}
            </em>
          ),
          ul: ({ children }) => (
            <ul className={`list-disc pl-4 space-y-1 mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
              {processMathInChildren(children, isDark)}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className={`list-decimal pl-4 space-y-1 mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
              {processMathInChildren(children, isDark)}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">
              {processMathInChildren(children, isDark)}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className={`border-l-2 pl-2.5 py-1.5 my-2 rounded-r italic ${
              isDark ? 'border-sky-500/60 bg-sky-500/10 text-zinc-300' : 'border-sky-600 bg-sky-50 text-slate-800'
            }`}>
              {processMathInChildren(children, isDark)}
            </blockquote>
          ),
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeStr = String(children).replace(/\n$/, '');
            if (!inline && (match || codeStr.includes('\n'))) {
              return <CodeBlock code={codeStr} language={match ? match[1] : 'python'} isDark={isDark} />;
            }
            return (
              <code className={`px-1.5 py-0.5 rounded text-[11px] font-mono border ${
                isDark 
                  ? 'bg-zinc-800/70 border-zinc-700/60 text-sky-300' 
                  : 'bg-sky-50 border-sky-200 text-sky-800 font-semibold'
              }`} {...props}>
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className={`overflow-x-auto my-2 rounded border ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
              <table className="w-full text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className={`border-b font-semibold ${
              isDark ? 'bg-zinc-900 text-zinc-200 border-zinc-800' : 'bg-slate-100 text-slate-800 border-slate-200'
            }`}>
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-200'}`}>
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className={isDark ? 'hover:bg-zinc-900/30 transition-colors' : 'hover:bg-slate-50 transition-colors'}>
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className={`px-2 py-1.5 font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
              {processMathInChildren(children, isDark)}
            </th>
          ),
          td: ({ children }) => (
            <td className={`px-2 py-1.5 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
              {processMathInChildren(children, isDark)}
            </td>
          ),
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
