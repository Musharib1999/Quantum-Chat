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

export function LatexMath({ math, inline = true, isDark = true, className = "" }: LatexMathProps) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    try {
      const rendered = katex.renderToString(math.trim(), {
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
