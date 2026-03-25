"use client";

import React, { useRef, useEffect } from 'react';

interface CodeEditorProps {
    code: string;
    onChange: (code: string) => void;
}

export default function CodeEditor({ code, onChange }: CodeEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Basic auto-indent and tab support
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.currentTarget.selectionStart;
            const end = e.currentTarget.selectionEnd;
            const value = e.currentTarget.value;
            
            const newValue = value.substring(0, start) + '    ' + value.substring(end);
            onChange(newValue);
            
            // Set cursor position after update
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
                }
            }, 0);
        }
    };

    const lineCount = code.split('\n').length;

    return (
        <div className="flex-1 flex h-full overflow-hidden bg-white relative font-mono text-sm group">
            {/* Line Numbers */}
            <div className="w-12 bg-slate-50 border-r border-slate-100 flex flex-col items-center pt-6 text-slate-300 select-none pb-20">
                {Array.from({ length: Math.max(lineCount, 50) }).map((_, i) => (
                    <div key={i} className="h-6 leading-6 text-[10px] font-medium">
                        {i + 1}
                    </div>
                ))}
            </div>

            {/* Textarea */}
            <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                autoFocus
                className="flex-1 h-full p-6 pt-6 resize-none outline-none border-none bg-transparent text-slate-700 leading-6 selection:bg-[#3066bb]/20 placeholder:text-slate-300 overflow-y-auto pb-40"
                placeholder="# Enter your quantum code here..."
                style={{ tabSize: 4 }}
            />
            
            {/* Bottom Status Bar */}
            <div className="absolute bottom-4 right-6 flex items-center gap-4 text-[10px] font-bold text-slate-400 p-2 bg-white/80 backdrop-blur-md border border-slate-100 rounded-lg shadow-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                <span>UTF-8</span>
                <span>Python / Qiskit</span>
                <span>Ln {code.substring(0, textareaRef.current?.selectionStart || 0).split('\n').length}, Col { (textareaRef.current?.selectionStart || 0) - (code.lastIndexOf('\n', (textareaRef.current?.selectionStart || 1) - 1) + 1) }</span>
            </div>
        </div>
    );
}
