"use client";

import React, { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { OnMount, BeforeMount } from "@monaco-editor/react";

// Dynamically import Monaco Editor without SSR to prevent hydration mismatches
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => null,
});

interface StudioCodeEditorProps {
  isDark: boolean;
  code: string;
  onChange: (code: string) => void;
  files?: string[];
  activeFile?: string;
  onSelectFile?: (file: string) => void;
  framework?: "dwave" | "qiskit";
  onRun?: () => void;
  isRunning?: boolean;
  terminalOutput?: string;
  showTerminal?: boolean;
  onToggleTerminal?: () => void;
  onToggleTheme?: () => void;
  specs?: any;
}

export function StudioCodeEditor({
  isDark,
  code,
  onChange,
  activeFile,
  framework = "qiskit",
  onRun,
}: StudioCodeEditorProps) {
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const onRunRef = useRef(onRun);

  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  // Determine file language
  const language = React.useMemo(() => {
    if (!activeFile) return "python";
    if (activeFile.endsWith(".json")) return "json";
    if (activeFile.endsWith(".md")) return "markdown";
    if (activeFile.endsWith(".qasm")) return "plaintext";
    return "python";
  }, [activeFile]);

  // Register Quantum Dark and Light Themes
  const handleBeforeMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco;

    monaco.editor.defineTheme("quantum-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64748B", fontStyle: "italic" },
        { token: "keyword", foreground: "38BDF8", fontStyle: "bold" },
        { token: "keyword.python", foreground: "38BDF8", fontStyle: "bold" },
        { token: "string", foreground: "34D399" },
        { token: "string.escape", foreground: "F59E0B" },
        { token: "number", foreground: "F472B6" },
        { token: "type", foreground: "A78BFA" },
        { token: "identifier", foreground: "F1F5F9" },
        { token: "delimiter", foreground: "94A3B8" },
        { token: "operator", foreground: "38BDF8" },
      ],
      colors: {
        "editor.background": "#090A0D",
        "editor.foreground": "#F1F5F9",
        "editor.lineHighlightBackground": "#11141A",
        "editor.lineHighlightBorder": "#00000000",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#38BDF8",
        "editorIndentGuide.background1": "#1E293B",
        "editorIndentGuide.activeBackground1": "#38BDF8",
        "editorCursor.foreground": "#38BDF8",
        "editor.selectionBackground": "#0284C740",
        "editor.inactiveSelectionBackground": "#0284C720",
        "scrollbarSlider.background": "#33415530",
        "scrollbarSlider.hoverBackground": "#47556950",
        "scrollbarSlider.activeBackground": "#64748B70",
      },
    });

    monaco.editor.defineTheme("quantum-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "94A3B8", fontStyle: "italic" },
        { token: "keyword", foreground: "0284C7", fontStyle: "bold" },
        { token: "string", foreground: "059669" },
        { token: "number", foreground: "DB2777" },
        { token: "type", foreground: "7C3AED" },
      ],
      colors: {
        "editor.background": "#FAFBFC",
        "editor.foreground": "#0F172A",
        "editor.lineHighlightBackground": "#F1F5F9",
        "editor.lineHighlightBorder": "#00000000",
        "editorLineNumber.foreground": "#94A3B8",
        "editorLineNumber.activeForeground": "#0284C7",
        "editorIndentGuide.background1": "#E2E8F0",
        "editorIndentGuide.activeBackground1": "#0284C7",
        "editorCursor.foreground": "#0284C7",
        "editor.selectionBackground": "#0284C720",
        "scrollbarSlider.background": "#CBD5E140",
        "scrollbarSlider.hoverBackground": "#94A3B860",
        "scrollbarSlider.activeBackground": "#64748B80",
      },
    });

    // Register Quantum Completion Provider (Qiskit & D-Wave)
    if (!monaco.languages.getLanguages().some((l: any) => l.id === "python")) {
      monaco.languages.register({ id: "python" });
    }

    try {
      monaco.languages.registerCompletionItemProvider("python", {
        provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const quantumKeywords = [
            // Qiskit
            { label: "QuantumCircuit", insertText: "QuantumCircuit(${1:num_qubits}, ${2:num_clbits})", detail: "Qiskit Quantum Circuit", documentation: "Construct a new quantum circuit with specified qubits and clbits." },
            { label: "AerSimulator", insertText: "AerSimulator()", detail: "Qiskit Aer Simulator", documentation: "High performance quantum simulator from qiskit_aer." },
            { label: "SparsePauliOp", insertText: "SparsePauliOp.from_list([(\"${1:Z}\", ${2:1.0})])", detail: "Qiskit Operator", documentation: "Sparse Pauli operator representation." },
            { label: "save_statevector", insertText: "save_statevector()", detail: "Aer Instruction", documentation: "Save the current statevector of the quantum simulator." },
            { label: "measure_all", insertText: "measure_all()", detail: "Qiskit Instruction", documentation: "Adds measurements from all quantum qubits to classical bits." },
            { label: "qc.h", insertText: "h(${1:qubit})", detail: "Hadamard Gate", documentation: "Single-qubit Hadamard gate." },
            { label: "qc.cx", insertText: "cx(${1:control}, ${2:target})", detail: "CNOT Gate", documentation: "Controlled-NOT gate." },
            { label: "qc.ry", insertText: "ry(${1:theta}, ${2:qubit})", detail: "RY Rotation Gate", documentation: "Single-qubit rotation about the Y axis." },
            { label: "qc.rz", insertText: "rz(${1:phi}, ${2:qubit})", detail: "RZ Rotation Gate", documentation: "Single-qubit rotation about the Z axis." },
            { label: "qc.x", insertText: "x(${1:qubit})", detail: "Pauli-X Gate", documentation: "Single-qubit bit flip gate." },
            { label: "qc.z", insertText: "z(${1:qubit})", detail: "Pauli-Z Gate", documentation: "Single-qubit phase flip gate." },
            // D-Wave / Optimization
            { label: "BinaryQuadraticModel", insertText: "BinaryQuadraticModel(${1:Vartype.BINARY})", detail: "dimod BQM", documentation: "Binary quadratic model for QUBO/Ising optimization." },
            { label: "SimulatedAnnealingSampler", insertText: "SimulatedAnnealingSampler()", detail: "dimod Sampler", documentation: "Classical simulated annealing sampler for QUBOs." },
            { label: "ExactSolver", insertText: "ExactSolver()", detail: "dimod Solver", documentation: "Exact solver that tests all possible states." },
          ];

          const suggestions = quantumKeywords.map((item) => ({
            label: item.label,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: item.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: item.detail,
            documentation: item.documentation,
            range,
          }));

          return { suggestions };
        },
      });
    } catch {
      // Provider may already be registered
    }
  };

  const handleOnMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    setIsEditorMounted(true);

    // Keyboard shortcut: Cmd+Enter / Ctrl+Enter to execute circuit
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRunRef.current) {
        onRunRef.current();
      }
    });

    // Keyboard shortcut: Cmd+S / Ctrl+S to prevent browser save dialog
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
      // Auto-saved by state
    });
  };

  return (
    <div
      id="tour-editor-pane"
      className="flex-1 flex flex-col h-full w-full overflow-hidden select-text relative"
    >
      {/* Fallback Skeleton until Monaco mounts */}
      {!isEditorMounted && (
        <div
          className={`absolute inset-0 flex flex-col font-mono text-xs z-0 pointer-events-none ${
            isDark ? "bg-[#090A0D] text-zinc-600" : "bg-[#FAFBFC] text-slate-400"
          }`}
        >
          <div className="flex h-full">
            <div
              className={`w-12 py-3 px-2 text-right shrink-0 border-r ${
                isDark
                  ? "bg-[#090A0D] border-white/[0.08]"
                  : "bg-[#F8FAFC] border-slate-200"
              }`}
            >
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i + 1} className="leading-5">
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="flex-1 p-3 leading-5 whitespace-pre opacity-40">
              {code.slice(0, 500)}...
            </div>
          </div>
        </div>
      )}

      {/* Monaco High-Performance Code Editor */}
      <div className="flex-1 w-full h-full relative z-10">
        <Editor
          height="100%"
          width="100%"
          language={language}
          theme={isDark ? "quantum-dark" : "quantum-light"}
          value={code}
          onChange={(value) => onChange(value ?? "")}
          beforeMount={handleBeforeMount}
          onMount={handleOnMount}
          options={{
            fontSize: 12.5,
            fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontLigatures: true,
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: "off",
            renderLineHighlight: "all",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            bracketPairColorization: { enabled: true },
            padding: { top: 12, bottom: 12 },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: "visible",
              horizontal: "auto",
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </div>
  );
}
