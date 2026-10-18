"use client";

import React, { useState, useEffect } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface LatexMathProps {
  math: string;
  inline?: boolean;
  isDark?: boolean;
  className?: string;
}

export function sanitizeLatex(raw: string): string {
  let clean = (raw || "").trim();
  // Normalize accidental double backslashes before LaTeX command words
  clean = clean.replace(/\\([a-zA-Z]+)/g, "\\$1");
  // Wrap any subscript content with underscores into \text{...} with escaped underscores to avoid Double Subscript errors
  clean = clean.replace(/_\{([^}]+)\}/g, (m, inner) => {
    if (inner.includes("\\text") || !inner.includes("_")) return m;
    const escaped = inner.replace(/\\_/g, "_").replace(/_/g, "\\_");
    return `_{\\text{${escaped}}}`;
  });
  return clean;
}

export function LatexMath({ math, inline = true, isDark = true, className = "" }: LatexMathProps) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    try {
      const cleanMath = sanitizeLatex(math);
      const rendered = katex.renderToString(cleanMath, {
        displayMode: !inline,
        throwOnError: false,
      });
      setHtml(rendered);
    } catch (e) {
      console.error("KaTeX error:", e);
    }
  }, [math, inline]);

  if (html) {
    return (
      <span
        dangerouslySetInnerHTML={{ __html: html }}
        className={`${!inline ? "block my-1 text-center overflow-x-auto" : "inline-block align-middle px-0.5"} ${className}`}
        suppressHydrationWarning
      />
    );
  }

  return (
    <code className={`font-mono text-xs opacity-80 ${className}`} suppressHydrationWarning>
      {math}
    </code>
  );
}

export default LatexMath;
