'use client';

import React, { useState, useRef, useCallback } from 'react';
import { 
  Play, 
  Zap, 
  Settings, 
  FileCode, 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  Sparkles, 
  Terminal as TerminalIcon, 
  Activity, 
  Layers, 
  Cpu, 
  RotateCw, 
  Check, 
  Send,
  Bot,
  X,
  Server,
  Wrench,
  PanelLeft,
  PanelRight,
  Plus,
  Sun,
  Moon,
  GitBranch
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  toolCall?: {
    name: string;
    badge: string;
    detail: string;
  };
}

export default function QuantumIDE() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeFile, setActiveFile] = useState('main.py');
  const [activeBottomTab, setActiveBottomTab] = useState<'circuit' | 'results' | 'terminal'>('circuit');
  const [activeModel, setActiveModel] = useState<'groq' | 'runpod'>('groq');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState('my-quantum-project');
  const [targetBackend, setTargetBackend] = useState('aer_simulator');
  const [optimizationLevel, setOptimizationLevel] = useState<number>(2);
  const [shots, setShots] = useState<number>(1024);
  const [errorMitigation, setErrorMitigation] = useState(true);
  const [copilotInput, setCopilotInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  // Section 1 (Left Sidebar) state: Open/Closed & Width
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(240);
  const isLeftDragging = useRef(false);

  // Section 3 (Right Sidebar) state: Open/Closed & Width
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [rightWidth, setRightWidth] = useState(340);
  const isRightDragging = useRef(false);

  const isDark = theme === 'dark';

  // ─────────────────────────────────────────────────────────────
  // STRICT 3-COLOR TEXT HIERARCHY FOR BOTH DARK & LIGHT MODES
  // 1. textPrimary: Main code, titles, active tabs (#FFFFFF / #0F172A)
  // 2. textMuted: Secondary info, line numbers, meta (#94A3B8 / #64748B)
  // 3. textAccent: Single focused Blue accent (#38BDF8 / #2563EB)
  // ─────────────────────────────────────────────────────────────
  // Toned-down, eye-friendly, glare-free color palette
  const colors = {
    bgMain: isDark ? '#070B14' : '#F8FAFC',
    bgHeader: isDark ? '#0C111D' : '#FFFFFF',
    bgSidebar: isDark ? '#090E1A' : '#F8FAFC',
    bgCard: isDark ? '#0F1626' : '#FFFFFF',
    bgEditor: isDark ? '#050912' : '#FFFFFF',
    bgInput: isDark ? '#0A0F1C' : '#F1F5F9',
    bgPill: isDark ? '#131C2E' : '#F1F5F9',
    border: isDark ? '#1E2B42' : '#E2E8F0',
    borderSubtle: isDark ? '#111827' : '#F1F5F9',
    textPrimary: isDark ? '#CBD5E1' : '#1E293B',    // Soft Slate 300 (toned down from blinding #FFFFFF)
    textMuted: isDark ? '#7E8C9F' : '#64748B',      // Gentle Slate 500
    textAccent: isDark ? '#7BA7DF' : '#3B82F6',     // Soft Steel Sky Blue (toned down from neon #38BDF8)
  };

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'user',
      text: 'Optimize the 2-qubit CNOT depth for the active circuit in main.py and explain the reduction.'
    },
    {
      id: '2',
      sender: 'agent',
      text: 'I inspected your 4-qubit parameterized ansatz in `main.py`. Reduced 2-qubit CNOT gate count from 6 to 4 (-33% depth) while preserving exact statevector fidelity (100.0%).',
      toolCall: {
        name: 'Transpiler Pass Completed',
        badge: '-33% Depth',
        detail: 'Applied CommutativeCancellation & ConsolidateBlocks (Level 2).'
      }
    }
  ]);

  // Handle Left Sidebar Drag Resize
  const handleLeftMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isLeftDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isLeftDragging.current) return;
      const newWidth = Math.max(160, Math.min(480, moveEvent.clientX));
      setLeftWidth(newWidth);
    };

    const onMouseUp = () => {
      isLeftDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // Handle Right Sidebar Drag Resize
  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isRightDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isRightDragging.current) return;
      const newWidth = Math.max(260, Math.min(650, window.innerWidth - moveEvent.clientX));
      setRightWidth(newWidth);
    };

    const onMouseUp = () => {
      isRightDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // Template Definitions for New Projects
  const projectTemplates: Record<string, { title: string; desc: string; files: Record<string, { name: string; lang: string; content: string }> }> = {
    'blank': {
      title: 'Blank Quantum Project',
      desc: 'Clean 4-qubit parametric ansatz and AerSimulator entrypoint.',
      files: {
        'main.py': {
          name: 'main.py',
          lang: 'python',
          content: `"""
Quantum Guru — Project Entrypoint
Author: Quantum Developer
Description: 4-Qubit Parameterized Entangled State & Statevector Simulation
"""

import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit.library import ZZFeatureMap, RealAmplitudes
from qiskit.quantum_info import Statevector, SparsePauliOp
from qiskit_aer import AerSimulator

def build_quantum_program(num_qubits: int = 4) -> QuantumCircuit:
    feature_map = ZZFeatureMap(feature_dimension=num_qubits, reps=1, entanglement='linear')
    ansatz = RealAmplitudes(num_qubits=num_qubits, reps=2)
    qc = QuantumCircuit(num_qubits)
    qc.compose(feature_map, inplace=True)
    qc.compose(ansatz, inplace=True)
    return qc

def main():
    print("Initializing Quantum Circuit on AerSimulator...")
    circuit = build_quantum_program(num_qubits=4)
    sample_x = np.array([0.931, 1.963, 0.306, 0.185])
    weights = np.zeros(12)
    bound_circuit = circuit.assign_parameters(np.concatenate([sample_x, weights]))
    state = Statevector(bound_circuit)
    observable = SparsePauliOp.from_list([("Z" + "I" * 3, 1.0)])
    exp_val = float(np.real(state.expectation_value(observable)))
    print(f"Simulation Complete. Expectation <Z_0>: {exp_val:.4f}")

if __name__ == "__main__":
    main()
`
        },
        'quantum.config.json': {
          name: 'quantum.config.json',
          lang: 'json',
          content: `{\n  "project_name": "my-quantum-project",\n  "target_backend": "aer_simulator",\n  "default_shots": 1024,\n  "optimization_level": 2\n}`
        },
        'README.md': {
          name: 'README.md',
          lang: 'markdown',
          content: `# Blank Quantum Project\n\nUse \`/execute@program\` or \`/simulate@circuit\` in Copilot chat to run this project.`
        }
      }
    },
    'optimization': {
      title: 'Optimization & QUBO Starter',
      desc: 'Binary quadratic models, constraint penalization, and D-Wave SA / QAOA.',
      files: {
        'portfolio_optimization.py': {
          name: 'portfolio_optimization.py',
          lang: 'python',
          content: `"""
Quantum Portfolio Optimization (QUBO & QAOA)
"""
import numpy as np

expected_returns = np.array([0.12, 0.18, 0.15, 0.22])
cov_matrix = np.array([
    [0.09, 0.02, 0.01, 0.04],
    [0.02, 0.16, 0.03, 0.05],
    [0.01, 0.03, 0.08, 0.02],
    [0.04, 0.05, 0.02, 0.25]
])

print("Building QUBO Objective Matrix...")
print("Target: Select 2 assets out of 4 to maximize Sharpe Ratio.")
`
        },
        'quantum.config.json': {
          name: 'quantum.config.json',
          lang: 'json',
          content: `{\n  "project_name": "portfolio-optimization",\n  "target_backend": "dwave_simulated_annealing",\n  "num_reads": 500\n}`
        }
      }
    },
    'chemistry': {
      title: 'Quantum Chemistry CAS-VQE',
      desc: 'Molecular orbital integrals, CAS active space, and Ground State Energy.',
      files: {
        'vqe_chemistry.py': {
          name: 'vqe_chemistry.py',
          lang: 'python',
          content: `"""
CAS-VQE Molecular Simulation for Lithium Hydride (LiH)
"""
print("Initializing CASCI Active-Space Molecular Hamiltonian...")
print("Active Spatial Orbitals: 4 | Active Electrons: 2 | Active Qubits: 8")
`
        },
        'quantum.config.json': {
          name: 'quantum.config.json',
          lang: 'json',
          content: `{\n  "project_name": "lih-cas-vqe",\n  "molecule": "LiH",\n  "basis": "sto-3g",\n  "active_orbitals": 4\n}`
        }
      }
    },
    'qml': {
      title: 'Quantum Machine Learning (QML)',
      desc: 'Quantum Kernel (QSVM) and Variational Classifiers with PCA reduction.',
      files: {
        'qml_classifier.py': {
          name: 'qml_classifier.py',
          lang: 'python',
          content: `"""
Quantum Kernel Classifier (QSVM) on Iris Flower Dataset
"""
print("Ingesting dataset & computing Quantum Kernel Fidelity Matrix...")
`
        },
        'quantum.config.json': {
          name: 'quantum.config.json',
          lang: 'json',
          content: `{\n  "project_name": "iris-qsvm-classifier",\n  "feature_map": "ZZFeatureMap",\n  "active_qubits": 4\n}`
        }
      }
    }
  };

  const [projectFiles, setProjectFiles] = useState<Record<string, { name: string; lang: string; content: string }>>(projectTemplates['blank'].files);

  const handleSelectTemplate = (templateKey: string) => {
    const selected = projectTemplates[templateKey];
    if (selected) {
      setProjectFiles(selected.files);
      const firstFile = Object.keys(selected.files)[0];
      setActiveFile(firstFile);
      setProjectName(templateKey === 'blank' ? 'my-quantum-project' : `${templateKey}-project`);
      setIsNewProjectOpen(false);
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'agent',
        text: `Initialized new workspace: **${selected.title}**. Created entrypoint \`${firstFile}\`.`,
        toolCall: {
          name: 'Workspace Scaffold Created',
          badge: 'Ready',
          detail: `Loaded ${Object.keys(selected.files).length} project files.`
        }
      }]);
    }
  };

  const files = projectFiles;

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setActiveBottomTab('terminal');
    }, 700);
  };

  const handleSimulate = () => {
    setActiveBottomTab('circuit');
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || copilotInput).trim();
    if (!text) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    setCopilotInput('');

    if (text === '/execute@program' || text.toLowerCase().includes('run program') || text.toLowerCase().includes('/run')) {
      handleRun();
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: 'Executed `main.py` on AerSimulator. Expectation value $\\langle Z_0 \\rangle = -0.4125$ (1024 shots). Output streamed to Solver Terminal.',
          toolCall: {
            name: 'Solver Execution',
            badge: 'Exit 0 (0.14s)',
            detail: 'Target: AerSimulator | Fidelity: 99.82%'
          }
        }]);
      }, 750);
    } else if (text === '/simulate@circuit' || text.toLowerCase().includes('simulate circuit')) {
      handleSimulate();
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: 'Generated continuous horizontal circuit diagram for active 4-qubit parameterized ansatz (`ZZFeatureMap + RealAmplitudes`). Canvas updated below.',
        toolCall: {
          name: 'Circuit Visualizer',
          badge: '4 Qubits | Depth 6',
          detail: 'Unfolded continuous horizontal track (fold=-1).'
        }
      }]);
    } else {
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: `Analyzing your quantum request: "${text}". I have mapped your intent and verified that all 4 active qubits are properly bound and phase-normalized in $[0, \\pi]$.`,
          toolCall: {
            name: 'Quantum Copilot Analysis',
            badge: activeModel === 'groq' ? 'Groq (110ms)' : 'RunPod (220ms)',
            detail: `Active Backend: ${targetBackend} | Level ${optimizationLevel}`
          }
        }]);
      }, 500);
    }
  };

  return (
    <div 
      style={{ backgroundColor: colors.bgMain, color: colors.textPrimary }}
      className="h-screen w-screen flex flex-col font-sans select-none overflow-hidden relative"
    >
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* BLOCK A: TOP GLOBAL COMMAND BAR                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header 
        style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
        className="h-12 border-b px-4 flex items-center justify-between shrink-0 z-20 shadow-xs"
      >
        {/* Left: Brand & Toggle Explorer */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsLeftOpen(!isLeftOpen)}
            title={isLeftOpen ? "Hide Explorer" : "Show Explorer"}
            style={{ 
              backgroundColor: isLeftOpen ? (isDark ? '#161B22' : '#F1F5F9') : 'transparent',
              borderColor: colors.border,
              color: colors.textPrimary 
            }}
            className="p-1.5 rounded-md border transition-colors cursor-pointer"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight font-heading" style={{ color: colors.textPrimary }}>
              Quantum Guru <span 
                style={{ 
                  backgroundColor: colors.bgPill, 
                  borderColor: colors.border,
                  color: colors.textAccent 
                }}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold"
              >IDE</span>
            </span>
          </div>

          <div style={{ backgroundColor: colors.border }} className="h-4 w-px mx-1" />

          {/* Project Breadcrumb */}
          <div 
            style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors font-medium"
          >
            <Folder className="w-3.5 h-3.5" style={{ color: colors.textMuted }} />
            <span className="font-mono font-bold" style={{ color: colors.textPrimary }}>{projectName}</span>
            <ChevronDown className="w-3 h-3 ml-1" style={{ color: colors.textMuted }} />
          </div>
        </div>

        {/* Right: Theme Switcher & Section 3 Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
            style={{ 
              backgroundColor: colors.bgPill, 
              borderColor: colors.border,
              color: colors.textPrimary
            }}
            className="p-1.5 rounded-md border transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsRightOpen(!isRightOpen)}
            title={isRightOpen ? "Hide Copilot" : "Show Copilot"}
            style={{ 
              backgroundColor: isRightOpen ? (isDark ? '#161B22' : '#F1F5F9') : 'transparent',
              borderColor: colors.border,
              color: colors.textPrimary 
            }}
            className="p-1.5 rounded-md border transition-colors cursor-pointer"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SETTINGS MODAL                                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div 
            style={{ backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }}
            className="border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="px-5 py-3.5 border-b flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-bold font-heading" style={{ color: colors.textPrimary }}>Quantum Environment Settings</h3>
                <p className="text-[11px]" style={{ color: colors.textMuted }}>Configure AI copilot models, theme appearance, target backends, and compiler passes</p>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-75 transition-opacity cursor-pointer"
                style={{ color: colors.textMuted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh] text-xs">
              
              {/* Theme */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider font-heading" style={{ color: colors.textMuted }}>
                  Theme Appearance
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setTheme('dark')}
                    style={{ 
                      backgroundColor: isDark ? colors.bgPill : 'transparent',
                      borderColor: isDark ? colors.textAccent : colors.border,
                      color: colors.textPrimary
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <Moon className="w-4 h-4" style={{ color: colors.textMuted }} />
                      <span>Dark Theme</span>
                    </div>
                    {isDark && <Check className="w-3.5 h-3.5" style={{ color: colors.textAccent }} />}
                  </div>

                  <div 
                    onClick={() => setTheme('light')}
                    style={{ 
                      backgroundColor: !isDark ? colors.bgPill : 'transparent',
                      borderColor: !isDark ? colors.textAccent : colors.border,
                      color: colors.textPrimary
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <Sun className="w-4 h-4" style={{ color: colors.textMuted }} />
                      <span>Light Theme</span>
                    </div>
                    {!isDark && <Check className="w-3.5 h-3.5" style={{ color: colors.textAccent }} />}
                  </div>
                </div>
              </div>

              {/* AI Copilot Model */}
              <div style={{ borderColor: colors.border }} className="space-y-2.5 pt-2 border-t">
                <div className="text-xs font-bold uppercase tracking-wider font-heading" style={{ color: colors.textMuted }}>
                  AI Copilot Inference Engine
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setActiveModel('groq')}
                    style={{ 
                      backgroundColor: activeModel === 'groq' ? colors.bgPill : 'transparent',
                      borderColor: activeModel === 'groq' ? colors.textAccent : colors.border,
                      color: colors.textPrimary
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">Groq (Llama-3.3)</span>
                      {activeModel === 'groq' && <Check className="w-3.5 h-3.5" style={{ color: colors.textAccent }} />}
                    </div>
                    <p style={{ color: colors.textMuted }} className="text-[11px] leading-relaxed">
                      Ultra-low latency streaming (~120ms), instant AST code edits, and rapid tool execution.
                    </p>
                  </div>

                  <div 
                    onClick={() => setActiveModel('runpod')}
                    style={{ 
                      backgroundColor: activeModel === 'runpod' ? colors.bgPill : 'transparent',
                      borderColor: activeModel === 'runpod' ? colors.textAccent : colors.border,
                      color: colors.textPrimary
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">RunPod (Qwen-27B)</span>
                      {activeModel === 'runpod' && <Check className="w-3.5 h-3.5" style={{ color: colors.textAccent }} />}
                    </div>
                    <p style={{ color: colors.textMuted }} className="text-[11px] leading-relaxed">
                      Deep mathematical rigor, Hamiltonian parsing, and specialized quantum domain weights.
                    </p>
                  </div>
                </div>
              </div>

              {/* Backend */}
              <div style={{ borderColor: colors.border }} className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider font-heading" style={{ color: colors.textMuted }}>
                    Target Execution Backend
                  </div>
                  <span 
                    style={{ 
                      backgroundColor: colors.bgPill, 
                      color: colors.textAccent,
                      borderColor: colors.border 
                    }} 
                    className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold"
                  >
                    Active: {targetBackend}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  {[
                    { id: 'aer_simulator', label: 'AerSimulator', desc: 'Local C++ Simulator (4Q)' },
                    { id: 'statevector', label: 'Statevector', desc: 'Exact Ideal Simulation' },
                    { id: 'ibm_heron', label: 'IBM Heron QPU', desc: 'Cloud QPU Bridge' }
                  ].map((b) => (
                    <div 
                      key={b.id}
                      onClick={() => setTargetBackend(b.id)}
                      style={{ 
                        backgroundColor: targetBackend === b.id ? colors.bgPill : 'transparent',
                        borderColor: targetBackend === b.id ? colors.textAccent : colors.border,
                        color: colors.textPrimary
                      }}
                      className="p-2.5 rounded-lg border text-center cursor-pointer transition-all"
                    >
                      <div className="text-xs font-bold">{b.label}</div>
                      <div className="text-[9px] font-sans mt-0.5" style={{ color: colors.textMuted }}>{b.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transpiler */}
              <div style={{ borderColor: colors.border }} className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider font-heading" style={{ color: colors.textMuted }}>
                    Compiler Optimization Level
                  </div>
                  <span 
                    style={{ 
                      backgroundColor: colors.bgPill, 
                      color: colors.textAccent, 
                      borderColor: colors.border 
                    }} 
                    className="font-mono text-xs font-bold px-2 py-0.5 rounded border"
                  >
                    Level {optimizationLevel}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center font-mono">
                  {[0, 1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setOptimizationLevel(lvl)}
                      style={{ 
                        backgroundColor: optimizationLevel === lvl ? colors.bgPill : 'transparent',
                        borderColor: optimizationLevel === lvl ? colors.textAccent : colors.border,
                        color: optimizationLevel === lvl ? colors.textAccent : colors.textPrimary
                      }}
                      className="py-1.5 rounded-md border text-xs font-bold transition-all cursor-pointer"
                    >
                      Level {lvl}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="px-5 py-3 border-t flex items-center justify-end"
            >
              <button 
                onClick={() => setIsSettingsOpen(false)}
                style={{ backgroundColor: isDark ? '#1D2E4A' : '#EFF6FF', color: colors.textAccent, borderColor: colors.border }} className="px-4 py-1.5 font-bold text-xs rounded-lg border transition-opacity hover:opacity-80 cursor-pointer"
                className="px-4 py-1.5 font-bold text-xs rounded-lg shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
              >
                Apply & Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN WORKSPACE                                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECTION 1 (LEFT): FILE EXPLORER & SUB-ENGINES              */}
        {/* ─────────────────────────────────────────────────────────── */}
        {isLeftOpen ? (
          <aside 
            style={{ 
              width: `${leftWidth}px`, 
              backgroundColor: colors.bgSidebar, 
              borderColor: colors.border 
            }}
            className="border-r flex flex-col shrink-0 relative transition-[width] duration-0"
          >
            {/* Start New Project Action Button */}
            <div style={{ backgroundColor: colors.bgSidebar, borderColor: colors.border }} className="p-2 border-b">
              <button
                onClick={() => setIsNewProjectOpen(true)}
                style={{ 
                  backgroundColor: colors.bgPill, 
                  borderColor: colors.border,
                  color: colors.textPrimary 
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-bold transition-all shadow-2xs cursor-pointer group hover:border-slate-400"
              >
                <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" style={{ color: colors.textAccent }} />
                <span>Start New Project</span>
              </button>
            </div>

            {/* Project File Tree */}
            <div className="p-2 space-y-0.5 text-xs flex-1 overflow-y-auto font-mono">
              <div className="flex items-center gap-1.5 px-2 py-1 font-bold" style={{ color: colors.textMuted }}>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>{projectName.toUpperCase()}</span>
              </div>

              {Object.keys(files).map((fName) => (
                <div 
                  key={fName}
                  onClick={() => setActiveFile(fName)}
                  style={{ 
                    backgroundColor: activeFile === fName ? colors.bgPill : 'transparent',
                    borderColor: activeFile === fName ? colors.border : 'transparent',
                    color: activeFile === fName ? colors.textPrimary : colors.textMuted
                  }}
                  className="flex items-center gap-2 px-6 py-1.5 rounded-md cursor-pointer transition-colors border font-medium"
                >
                  <FileCode className="w-3.5 h-3.5" style={{ color: activeFile === fName ? colors.textAccent : colors.textMuted }} />
                  <span className="truncate">{fName}</span>
                </div>
              ))}

              <div className="pt-4 px-2">
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2 font-heading" style={{ color: colors.textMuted }}>
                  Active Quantum Sub-Engines
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md border shadow-2xs font-medium"
                  >
                    <span style={{ color: colors.textPrimary }}>Optimization</span>
                    <span style={{ backgroundColor: colors.bgPill, color: colors.textMuted }} className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">Ready</span>
                  </div>
                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md border shadow-2xs font-medium"
                  >
                    <span style={{ color: colors.textPrimary }}>Chemistry CAS</span>
                    <span style={{ backgroundColor: colors.bgPill, color: colors.textMuted }} className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">Ready</span>
                  </div>
                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md border shadow-2xs font-medium"
                  >
                    <span style={{ color: colors.textPrimary }}>QML Engine</span>
                    <span style={{ backgroundColor: colors.bgPill, color: colors.textMuted }} className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">Ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Bottom Controls: Settings & Profile */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="p-2 border-t space-y-1 shrink-0"
            >
              <button
                onClick={() => setIsSettingsOpen(true)}
                style={{ borderColor: colors.border, color: colors.textPrimary }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-all cursor-pointer group hover:opacity-80"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 group-hover:rotate-45 transition-all" style={{ color: colors.textMuted }} />
                  <span>Settings</span>
                </div>
                <span 
                  style={{ 
                    backgroundColor: colors.bgPill, 
                    color: colors.textAccent, 
                    borderColor: colors.border 
                  }}
                  className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold border"
                >
                  {activeModel === 'groq' ? 'Groq' : 'RunPod'}
                </span>
              </button>

              <div 
                style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md border transition-all cursor-pointer"
              >
                <div 
                  style={{ backgroundColor: colors.bgPill, color: colors.textPrimary }}
                  className="w-6 h-6 rounded-full border border-slate-700/50 flex items-center justify-center text-[10px] font-bold font-heading shrink-0"
                >
                  QD
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold truncate" style={{ color: colors.textPrimary }}>{projectName === 'my-quantum-project' ? 'Quantum Dev' : 'Project Lead'}</div>
                  <div className="text-[9px] truncate font-mono" style={{ color: colors.textMuted }}>ms@qc.guru</div>
                </div>
              </div>
            </div>

          </aside>
        ) : null}

        {/* ── DRAGGABLE RESIZER FOR SECTION 1 (LEFT) ── */}
        {isLeftOpen && (
          <div 
            onMouseDown={handleLeftMouseDown}
            className="w-1.5 hover:w-2 bg-transparent hover:bg-blue-500/30 active:bg-blue-500 cursor-col-resize z-30 transition-all shrink-0 flex items-center justify-center -ml-0.5 group"
            title="Drag to resize Section 1 width"
          >
            <div style={{ backgroundColor: colors.border }} className="w-0.5 h-6 rounded group-hover:bg-blue-500" />
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* SECTION 2 (CENTER): CODE EDITOR + CONTINUOUS CANVAS       */}
        {/* ───────────────────────────────────────────────────────── */}
        <div style={{ backgroundColor: colors.bgEditor }} className="flex-1 flex flex-col min-w-0">
          
          {/* Upper Pane: Monaco Code Editor */}
          <div style={{ borderColor: colors.border }} className="flex-1 flex flex-col min-h-0 border-b">
            {/* Code Contents */}
            <div 
              style={{ backgroundColor: colors.bgEditor, color: colors.textPrimary }}
              className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed flex"
            >
              <div 
                style={{ borderColor: colors.border, color: colors.textMuted }}
                className="pr-4 select-none text-right font-mono border-r mr-4 space-y-0.5 opacity-50"
              >
                {files[activeFile].content.split('\n').map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>
              <pre className="flex-1 overflow-x-auto whitespace-pre font-medium font-mono" style={{ color: colors.textPrimary }}>
                {files[activeFile].content}
              </pre>
            </div>
          </div>

          {/* Lower Pane: Quantum Runtime & Continuous Circuit Canvas */}
          <div 
            style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
            className="h-56 flex flex-col shrink-0 border-t"
          >
            {/* Drawer Tabs & Metrics */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="h-8 border-b px-3 flex items-center justify-between shrink-0"
            >
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveBottomTab('circuit')}
                  style={{ 
                    backgroundColor: activeBottomTab === 'circuit' ? colors.bgPill : 'transparent',
                    borderColor: activeBottomTab === 'circuit' ? colors.border : 'transparent',
                    color: activeBottomTab === 'circuit' ? colors.textPrimary : colors.textMuted
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded border transition-colors cursor-pointer"
                >
                  <Zap className="w-3 h-3" style={{ color: colors.textAccent }} />
                  <span>Continuous Circuit (fold=-1)</span>
                </button>

                <button 
                  onClick={() => setActiveBottomTab('results')}
                  style={{ 
                    backgroundColor: activeBottomTab === 'results' ? colors.bgPill : 'transparent',
                    borderColor: activeBottomTab === 'results' ? colors.border : 'transparent',
                    color: activeBottomTab === 'results' ? colors.textPrimary : colors.textMuted
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded border transition-colors cursor-pointer"
                >
                  <Activity className="w-3 h-3" style={{ color: colors.textMuted }} />
                  <span>Simulation Results & Metrics</span>
                </button>

                <button 
                  onClick={() => setActiveBottomTab('terminal')}
                  style={{ 
                    backgroundColor: activeBottomTab === 'terminal' ? colors.bgPill : 'transparent',
                    borderColor: activeBottomTab === 'terminal' ? colors.border : 'transparent',
                    color: activeBottomTab === 'terminal' ? colors.textPrimary : colors.textMuted
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded border transition-colors cursor-pointer"
                >
                  <TerminalIcon className="w-3 h-3" style={{ color: colors.textMuted }} />
                  <span>Solver Terminal</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: colors.textMuted }}>
                <span>Active Qubits: <b style={{ color: colors.textPrimary }}>4</b></span>
                <span>Depth: <b style={{ color: colors.textPrimary }}>6</b></span>
                <span>CNOTs: <b style={{ color: colors.textPrimary }}>3</b></span>
              </div>
            </div>

            {/* Bottom Content View */}
            <div 
              style={{ backgroundColor: colors.bgEditor, color: colors.textPrimary }}
              className="flex-1 overflow-x-auto overflow-y-auto p-3 font-mono text-xs"
            >
              {activeBottomTab === 'circuit' && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold mb-1" style={{ color: colors.textMuted }}>
                    Continuous Horizontal Circuit Canvas (Zero vertical wrapping — scroll horizontally):
                  </div>
                  <pre className="font-mono text-[11px] font-semibold leading-tight select-text" style={{ color: colors.textPrimary }}>
{`     ┌───┐┌───────────┐                                        ┌──────────┐                                                                                                                           ┌──────────┐                          ┌──────────┐
q_0: ┤ H ├┤ P(2*x[0]) ├──■──────────────────────────────────■──┤ Ry(θ[0]) ├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────■──────┤ Ry(θ[4]) ├───────────────────■──────┤ Ry(θ[8]) ├
     ├───┤├───────────┤┌─┴─┐┌────────────────────────────┐┌─┴─┐└──────────┘                                   ┌──────────┐                                                                   ┌─┴─┐    ├──────────┤                 ┌─┴─┐    ├──────────┤
q_1: ┤ H ├┤ P(2*x[1]) ├┤ X ├┤ P(2*(π - x[0])*(π - x[1])) ├┤ X ├─────■──────────────────────────────────────■──┤ Ry(θ[1]) ├─────────────────────────────────────────────────────────■─────────┤ X ├────┤ Ry(θ[5]) ├──────■──────────┤ X ├────┤ Ry(θ[9]) ├
     ├───┤├───────────┤└───┘└────────────────────────────┘└───┘   ┌─┴─┐    ┌────────────────────────────┐┌─┴─┐└──────────┘                                   ┌──────────┐        ┌─┴─┐    ┌──┴───┴───┐└──────────┘    ┌─┴─┐    ┌───┴───┴───┐└──────────┘
q_2: ┤ H ├┤ P(2*x[2]) ├───────────────────────────────────────────┤ X ├────┤ P(2*(π - x[1])*(π - x[2])) ├┤ X ├─────■──────────────────────────────────────■──┤ Ry(θ[2]) ├──■─────┤ X ├────┤ Ry(θ[6]) ├─────■──────────┤ X ├────┤ Ry(θ[10]) ├────────────
     ├───┤├───────────┤                                           └───┘    └────────────────────────────┘└───┘   ┌─┴─┐    ┌────────────────────────────┐┌─┴─┐├──────────┤┌─┴─┐┌──┴───┴───┐└──────────┘   ┌─┴─┐    ┌───┴───┴───┐└───────────┘            
q_3: ┤ H ├┤ P(2*x[3]) ├──────────────────────────────────────────────────────────────────────────────────────────┤ X ├────┤ P(2*(π - x[2])*(π - x[3])) ├┤ X ├┤ Ry(θ[3]) ├┤ X ├┤ Ry(θ[7]) ├───────────────┤ X ├────┤ Ry(θ[11]) ├─────────────────────────
     └───┘└───────────┘                                                                                          └───┘    └────────────────────────────┘└───┘└──────────┘└───┘└──────────┘               └───┘    └───────────┘                         `}
                  </pre>
                </div>
              )}

              {activeBottomTab === 'results' && (
                <div className="grid grid-cols-3 gap-3">
                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="border rounded-lg p-3 space-y-1 shadow-2xs"
                  >
                    <div className="text-[10px] font-bold uppercase" style={{ color: colors.textMuted }}>Expectation Value</div>
                    <div className="text-xl font-bold font-mono" style={{ color: colors.textPrimary }}>-0.4125 Ha</div>
                    <div className="text-[10px] font-medium" style={{ color: colors.textMuted }}>Target: Z ⊗ I ⊗ I ⊗ I</div>
                  </div>
                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="border rounded-lg p-3 space-y-1 shadow-2xs"
                  >
                    <div className="text-[10px] font-bold uppercase" style={{ color: colors.textMuted }}>Simulator Fidelity</div>
                    <div className="text-xl font-bold font-mono" style={{ color: colors.textPrimary }}>99.82%</div>
                    <div className="text-[10px] font-medium" style={{ color: colors.textMuted }}>Statevector exact match</div>
                  </div>
                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="border rounded-lg p-3 space-y-1 shadow-2xs"
                  >
                    <div className="text-[10px] font-bold uppercase" style={{ color: colors.textMuted }}>Execution Latency</div>
                    <div className="text-xl font-bold font-mono" style={{ color: colors.textPrimary }}>0.14s</div>
                    <div className="text-[10px] font-medium" style={{ color: colors.textMuted }}>Aer C++ Statevector backend</div>
                  </div>
                </div>
              )}

              {activeBottomTab === 'terminal' && (
                <div className="space-y-1 font-mono text-xs">
                  <div className="font-bold" style={{ color: colors.textAccent }}>➜ python3 main.py</div>
                  <div style={{ color: colors.textMuted }}>Initializing Quantum Circuit on AerSimulator...</div>
                  <div className="font-bold" style={{ color: colors.textPrimary }}>Simulation Complete. Expectation &lt;Z_0&gt;: -0.4125</div>
                  <div style={{ color: colors.textMuted }}>Process finished with exit code 0 (0.142s)</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── DRAGGABLE RESIZER FOR SECTION 3 (RIGHT) ── */}
        {isRightOpen && (
          <div 
            onMouseDown={handleRightMouseDown}
            className="w-1.5 hover:w-2 bg-transparent hover:bg-blue-500/30 active:bg-blue-500 cursor-col-resize z-30 transition-all shrink-0 flex items-center justify-center -mr-0.5 group"
            title="Drag to resize Section 3 width"
          >
            <div style={{ backgroundColor: colors.border }} className="w-0.5 h-6 rounded group-hover:bg-blue-500" />
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECTION 3 (RIGHT): AGENTIC QUANTUM COPILOT                 */}
        {/* ─────────────────────────────────────────────────────────── */}
        {isRightOpen ? (
          <aside 
            style={{ 
              width: `${rightWidth}px`, 
              backgroundColor: colors.bgSidebar, 
              borderColor: colors.border 
            }}
            className="border-l flex flex-col shrink-0 relative transition-[width] duration-0"
          >
            {/* Conversation Stream & Tool Execution Cards */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {msg.sender === 'user' ? (
                    <div 
                      style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                      className="border rounded-xl p-3 shadow-2xs font-medium"
                    >
                      <div className="text-[10px] font-bold mb-1" style={{ color: colors.textMuted }}>You</div>
                      <div style={{ color: colors.textPrimary }}>{msg.text}</div>
                    </div>
                  ) : (
                    <div 
                      style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                      className="border rounded-xl p-3 space-y-2 shadow-2xs"
                    >
                      <div style={{ borderColor: colors.border }} className="flex items-center justify-between border-b pb-1.5">
                        <span className="text-[10px] font-bold flex items-center gap-1 font-heading" style={{ color: colors.textAccent }}>
                          <Sparkles className="w-3 h-3" /> Quantum Guru Copilot
                        </span>
                        <span className="text-[9px] font-mono font-semibold" style={{ color: colors.textMuted }}>
                          {activeModel === 'groq' ? 'Groq (118ms)' : 'RunPod (240ms)'}
                        </span>
                      </div>

                      <p className="leading-relaxed" style={{ color: colors.textPrimary }}>
                        {msg.text}
                      </p>

                      {msg.toolCall && (
                        <div 
                          style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
                          className="border rounded-lg p-2.5 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold flex items-center gap-1 font-heading" style={{ color: colors.textPrimary }}>
                              <Check className="w-3 h-3" style={{ color: colors.textAccent }} /> {msg.toolCall.name}
                            </span>
                            <span 
                              style={{ 
                                backgroundColor: colors.bgCard, 
                                borderColor: colors.border,
                                color: colors.textAccent 
                              }}
                              className="font-mono px-1 py-0.5 rounded font-bold text-[9px] border"
                            >
                              {msg.toolCall.badge}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono" style={{ color: colors.textMuted }}>
                            {msg.toolCall.detail}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Copilot Input Box & Slash Shortcuts */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="p-3 border-t space-y-2"
            >
              {/* Interactive Slash Command Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono font-bold">
                <button 
                  onClick={() => handleSendMessage('/execute@program')}
                  style={{ 
                    backgroundColor: colors.bgPill, 
                    borderColor: colors.border,
                    color: colors.textPrimary 
                  }}
                  className="px-2 py-0.5 rounded border cursor-pointer transition-colors shrink-0 flex items-center gap-1 hover:border-slate-400"
                >
                  <Play className="w-2.5 h-2.5 fill-current" style={{ color: colors.textAccent }} /> /execute@program
                </button>
                <button 
                  onClick={() => handleSendMessage('/simulate@circuit')}
                  style={{ 
                    backgroundColor: colors.bgPill, 
                    borderColor: colors.border,
                    color: colors.textPrimary 
                  }}
                  className="px-2 py-0.5 rounded border cursor-pointer transition-colors shrink-0 flex items-center gap-1 hover:border-slate-400"
                >
                  <Zap className="w-2.5 h-2.5" style={{ color: colors.textMuted }} /> /simulate@circuit
                </button>
                <button 
                  onClick={() => handleSendMessage('/transpile@level2')}
                  style={{ 
                    backgroundColor: colors.bgPill, 
                    borderColor: colors.border,
                    color: colors.textMuted 
                  }}
                  className="px-2 py-0.5 rounded border cursor-pointer transition-colors shrink-0 hover:border-slate-400"
                >
                  /transpile@level2
                </button>
              </div>

              {/* Input form */}
              <div 
                style={{ backgroundColor: colors.bgInput, borderColor: colors.border }}
                className="flex items-center gap-2 border rounded-lg p-1.5 transition-all shadow-2xs focus-within:border-blue-500"
              >
                <input 
                  type="text"
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                  placeholder="Ask Copilot or try /execute@program..."
                  style={{ color: colors.textPrimary }}
                  className="flex-1 bg-transparent border-none outline-hidden text-xs font-medium px-1 font-sans placeholder:opacity-40"
                />
                <button 
                  onClick={() => handleSendMessage()}
                  style={{ backgroundColor: isDark ? '#1D2E4A' : '#EFF6FF', color: colors.textAccent, borderColor: colors.border }} className="px-4 py-1.5 font-bold text-xs rounded-lg border transition-opacity hover:opacity-80 cursor-pointer"
                  className="w-6 h-6 rounded flex items-center justify-center transition-opacity hover:opacity-80 shadow-2xs cursor-pointer border"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </aside>
        ) : null}

      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* BLOCK F: BOTTOM GLOBAL STATUS BAR                         */}
      {/* ───────────────────────────────────────────────────────── */}
      <footer 
        style={{ backgroundColor: colors.bgHeader, borderColor: colors.border, color: colors.textMuted }}
        className="h-6 border-t px-3 flex items-center justify-between text-[10px] font-mono shrink-0 z-20 font-medium"
      >
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 font-bold" style={{ color: colors.textPrimary }}>
            <GitBranch className="w-3 h-3" style={{ color: colors.textMuted }} /> feature/quantum-cursor-ide
          </span>
          <span>Workspace: <b style={{ color: colors.textPrimary }}>Ready</b></span>
          <span>Target QPU: <b style={{ color: colors.textPrimary }}>{targetBackend}</b></span>
          <span>AI Engine: <b style={{ color: colors.textPrimary }}>{activeModel === 'groq' ? 'Groq (Llama-3.3)' : 'RunPod (Qwen-27B)'}</b></span>
        </div>

        <div className="flex items-center gap-4">
          <span>Active File: <b style={{ color: colors.textPrimary }}>{activeFile}</b></span>
          <span>Theme: <b style={{ color: colors.textAccent }}>{isDark ? 'Dark' : 'Light'}</b></span>
          <span>Section 1: <b style={{ color: colors.textPrimary }}>{isLeftOpen ? `${leftWidth}px` : 'Hidden'}</b></span>
          <span>Section 3: <b style={{ color: colors.textPrimary }}>{isRightOpen ? `${rightWidth}px` : 'Hidden'}</b></span>
        </div>
      </footer>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* START NEW PROJECT TEMPLATE SELECTOR MODAL                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isNewProjectOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div 
            style={{ backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }}
            className="border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="px-5 py-3.5 border-b flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-bold font-heading" style={{ color: colors.textPrimary }}>Start a New Quantum Project</h3>
                <p className="text-[11px]" style={{ color: colors.textMuted }}>Choose a quantum scaffold or blank workspace</p>
              </div>
              <button 
                onClick={() => setIsNewProjectOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-75 transition-opacity cursor-pointer"
                style={{ color: colors.textMuted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template List */}
            <div className="p-4 space-y-2.5 overflow-y-auto max-h-[65vh]">
              {Object.entries(projectTemplates).map(([key, tpl]) => (
                <div
                  key={key}
                  onClick={() => handleSelectTemplate(key)}
                  style={{ 
                    backgroundColor: colors.bgEditor, 
                    borderColor: colors.border 
                  }}
                  className="p-4 rounded-xl border cursor-pointer transition-all shadow-2xs group flex flex-col gap-1.5 hover:border-slate-400"
                >
                  <div className="text-xs font-bold flex items-center justify-between" style={{ color: colors.textPrimary }}>
                    <span>{tpl.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" style={{ color: colors.textMuted }} />
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: colors.textMuted }}>
                    {tpl.desc}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono">
                    <span className="font-semibold" style={{ color: colors.textMuted }}>Files:</span>
                    {Object.keys(tpl.files).map(f => (
                      <span 
                        key={f} 
                        style={{ 
                          backgroundColor: colors.bgPill, 
                          borderColor: colors.border,
                          color: colors.textMuted
                        }}
                        className="px-1.5 py-0.5 rounded border font-medium"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
