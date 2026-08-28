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
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
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
  const [activeBottomTab, setActiveBottomTab] = useState<'circuit' | 'results' | 'terminal' | 'statevector'>('circuit');
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

  // Palette definitions for bulletproof dark/light rendering
  const colors = {
    bgMain: isDark ? '#0D1117' : '#F8FAFC',
    bgHeader: isDark ? '#161B22' : '#FFFFFF',
    bgSidebar: isDark ? '#0E131F' : '#F8FAFC',
    bgCard: isDark ? '#161B22' : '#FFFFFF',
    bgEditor: isDark ? '#0D1117' : '#FFFFFF',
    bgInput: isDark ? '#0D1117' : '#F1F5F9',
    border: isDark ? '#30363D' : '#E2E8F0',
    borderSubtle: isDark ? '#21262D' : '#F1F5F9',
    textMain: isDark ? '#F0F6FC' : '#0F172A',
    textMuted: isDark ? '#8B949E' : '#64748B',
    accentBlue: isDark ? '#58A6FF' : '#2563EB',
    accentGreen: isDark ? '#3FB950' : '#059669',
    accentAmber: isDark ? '#D29922' : '#D97706',
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
    print("⚛️ Initializing Quantum Circuit on AerSimulator...")
    circuit = build_quantum_program(num_qubits=4)
    sample_x = np.array([0.931, 1.963, 0.306, 0.185])
    weights = np.zeros(12)
    bound_circuit = circuit.assign_parameters(np.concatenate([sample_x, weights]))
    state = Statevector(bound_circuit)
    observable = SparsePauliOp.from_list([("Z" + "I" * 3, 1.0)])
    exp_val = float(np.real(state.expectation_value(observable)))
    print(f"✅ Simulation Complete. Expectation <Z_0>: {exp_val:.4f}")

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
          content: `# ⚛️ Blank Quantum Project\n\nUse \`/execute@program\` or \`/simulate@circuit\` in Copilot chat to run this project.`
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

print("⚡ Building QUBO Objective Matrix...")
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
print("🧪 Initializing CASCI Active-Space Molecular Hamiltonian...")
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
print("🤖 Ingesting dataset & computing Quantum Kernel Fidelity Matrix...")
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
      style={{ backgroundColor: colors.bgMain, color: colors.textMain }}
      className="h-screen w-screen flex flex-col font-sans select-none overflow-hidden relative"
    >
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* BLOCK A: MINIMALIST TOP COMMAND BAR                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header 
        style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
        className="h-12 border-b px-4 flex items-center justify-between shrink-0 z-20 shadow-xs"
      >
        {/* Left: Brand & Toggle Explorer Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsLeftOpen(!isLeftOpen)}
            title={isLeftOpen ? "Hide Explorer (Section 1)" : "Show Explorer (Section 1)"}
            style={{ 
              backgroundColor: isLeftOpen ? (isDark ? '#21262D' : '#F1F5F9') : 'transparent',
              borderColor: colors.border,
              color: colors.textMain 
            }}
            className="p-1.5 rounded-md border transition-colors cursor-pointer"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <div 
              style={{ 
                backgroundColor: isDark ? '#1F2937' : '#EFF6FF', 
                borderColor: isDark ? '#374151' : '#BFDBFE',
                color: colors.accentBlue 
              }}
              className="w-7 h-7 rounded-lg border flex items-center justify-center font-black text-sm"
            >
              ⚛
            </div>
            <span className="font-extrabold text-sm tracking-tight font-heading">
              Quantum Guru <span 
                style={{ 
                  backgroundColor: isDark ? '#1E293B' : '#EFF6FF', 
                  borderColor: isDark ? '#334155' : '#BFDBFE',
                  color: colors.accentBlue 
                }}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold"
              >IDE</span>
            </span>
          </div>

          <div style={{ backgroundColor: colors.border }} className="h-4 w-px mx-1" />

          {/* Project Breadcrumb */}
          <div 
            style={{ backgroundColor: isDark ? '#21262D' : '#F8FAFC', borderColor: colors.border }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors font-medium"
          >
            <Folder className="w-3.5 h-3.5" style={{ color: colors.accentBlue }} />
            <span className="font-mono font-bold">{projectName}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
          </div>
        </div>

        {/* Right: Section 3 Toggle & Theme Switcher Button */}
        <div className="flex items-center gap-2">
          {/* Theme Quick Toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
            style={{ 
              backgroundColor: isDark ? '#21262D' : '#FFFFFF', 
              borderColor: colors.border,
              color: isDark ? '#F59E0B' : '#0F172A'
            }}
            className="p-1.5 rounded-md border transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Section 3 Toggle Button */}
          <button
            onClick={() => setIsRightOpen(!isRightOpen)}
            title={isRightOpen ? "Hide Copilot (Section 3)" : "Show Copilot (Section 3)"}
            style={{ 
              backgroundColor: isRightOpen ? (isDark ? '#21262D' : '#F1F5F9') : 'transparent',
              borderColor: colors.border,
              color: colors.textMain 
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
            style={{ backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textMain }}
            className="border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div 
              style={{ backgroundColor: isDark ? '#0D1117' : '#F8FAFC', borderColor: colors.border }}
              className="px-5 py-3.5 border-b flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div 
                  style={{ backgroundColor: isDark ? '#1F2937' : '#EFF6FF', color: colors.accentBlue }}
                  className="w-7 h-7 rounded-lg border border-slate-700/50 flex items-center justify-center"
                >
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading">Quantum Environment Settings</h3>
                  <p className="text-[11px]" style={{ color: colors.textMuted }}>Configure AI copilot inference models, theme, target backends, and compiler passes</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-75 transition-opacity cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh] text-xs">
              
              {/* 1. Theme Selector */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider font-heading">
                  Theme Appearance
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setTheme('dark')}
                    style={{ 
                      backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                      borderColor: isDark ? colors.accentBlue : colors.border
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-blue-400" />
                      <span className="font-bold">Dark Cosmic Theme</span>
                    </div>
                    {isDark && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </div>

                  <div 
                    onClick={() => setTheme('light')}
                    style={{ 
                      backgroundColor: !isDark ? '#EFF6FF' : '#161B22',
                      borderColor: !isDark ? colors.accentBlue : colors.border
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span className="font-bold">Light High-Contrast</span>
                    </div>
                    {!isDark && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                </div>
              </div>

              {/* 2. AI Copilot Inference Engine */}
              <div style={{ borderColor: colors.border }} className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider font-heading">
                  <Bot className="w-3.5 h-3.5" style={{ color: colors.accentBlue }} />
                  <span>AI Copilot Inference Engine</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setActiveModel('groq')}
                    style={{ 
                      backgroundColor: activeModel === 'groq' ? (isDark ? '#1F2937' : '#EFF6FF') : (isDark ? '#0D1117' : '#F8FAFC'),
                      borderColor: activeModel === 'groq' ? colors.accentBlue : colors.border
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold flex items-center gap-1">⚡ Groq Llama-3.3</span>
                      {activeModel === 'groq' && <Check className="w-3.5 h-3.5" style={{ color: colors.accentBlue }} />}
                    </div>
                    <p style={{ color: colors.textMuted }} className="text-[11px] leading-relaxed">
                      Ultra-low latency streaming (~120ms), instant AST code edits, and rapid tool execution.
                    </p>
                  </div>

                  <div 
                    onClick={() => setActiveModel('runpod')}
                    style={{ 
                      backgroundColor: activeModel === 'runpod' ? (isDark ? '#1F2937' : '#EFF6FF') : (isDark ? '#0D1117' : '#F8FAFC'),
                      borderColor: activeModel === 'runpod' ? colors.accentBlue : colors.border
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold flex items-center gap-1">🧠 RunPod Qwen-27B</span>
                      {activeModel === 'runpod' && <Check className="w-3.5 h-3.5" style={{ color: colors.accentBlue }} />}
                    </div>
                    <p style={{ color: colors.textMuted }} className="text-[11px] leading-relaxed">
                      Deep mathematical rigor, Hamiltonian parsing, and specialized quantum domain weights.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Target Execution Backend */}
              <div style={{ borderColor: colors.border }} className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider font-heading">
                    <Server className="w-3.5 h-3.5" style={{ color: colors.accentGreen }} />
                    <span>Target Execution Backend</span>
                  </div>
                  <span 
                    style={{ 
                      backgroundColor: isDark ? '#064E3B' : '#ECFDF5', 
                      color: isDark ? '#6EE7B7' : '#047857',
                      borderColor: isDark ? '#059669' : '#A7F3D0' 
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
                        backgroundColor: targetBackend === b.id ? (isDark ? '#064E3B' : '#ECFDF5') : (isDark ? '#0D1117' : '#F8FAFC'),
                        borderColor: targetBackend === b.id ? colors.accentGreen : colors.border
                      }}
                      className="p-2.5 rounded-lg border text-center cursor-pointer transition-all"
                    >
                      <div className="text-xs font-bold">{b.label}</div>
                      <div className="text-[9px] font-sans mt-0.5" style={{ color: colors.textMuted }}>{b.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Transpiler Optimization Level */}
              <div style={{ borderColor: colors.border }} className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider font-heading">
                    <Wrench className="w-3.5 h-3.5" style={{ color: colors.accentAmber }} />
                    <span>Compiler Optimization Level</span>
                  </div>
                  <span 
                    style={{ 
                      backgroundColor: isDark ? '#1E293B' : '#EFF6FF', 
                      color: colors.accentBlue, 
                      borderColor: isDark ? '#334155' : '#BFDBFE' 
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
                        backgroundColor: optimizationLevel === lvl ? (isDark ? '#78350F' : '#FEF3C7') : (isDark ? '#0D1117' : '#F8FAFC'),
                        borderColor: optimizationLevel === lvl ? colors.accentAmber : colors.border,
                        color: optimizationLevel === lvl ? (isDark ? '#FDE68A' : '#92400E') : colors.textMain
                      }}
                      className="py-1.5 rounded-md border text-xs font-bold transition-all cursor-pointer"
                    >
                      Level {lvl}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div 
              style={{ backgroundColor: isDark ? '#0D1117' : '#F8FAFC', borderColor: colors.border }}
              className="px-5 py-3 border-t flex items-center justify-end"
            >
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
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
            {/* Section 1 Header */}
            <div 
              style={{ backgroundColor: isDark ? '#161B22' : '#F1F5F9', borderColor: colors.border }}
              className="px-3.5 py-2.5 border-b flex items-center justify-between font-heading"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.textMuted }}>Explorer</span>
                <span 
                  style={{ backgroundColor: isDark ? '#21262D' : '#E2E8F0', color: colors.textMain }}
                  className="text-[9px] font-mono px-1 py-0.2 rounded font-semibold"
                >
                  {leftWidth}px
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsLeftOpen(false)}
                  title="Hide Explorer"
                  className="p-1 rounded-md hover:opacity-75 transition-opacity cursor-pointer"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Start New Project Action Button */}
            <div style={{ backgroundColor: colors.bgSidebar, borderColor: colors.border }} className="p-2 border-b">
              <button
                onClick={() => setIsNewProjectOpen(true)}
                style={{ 
                  backgroundColor: isDark ? '#1F2937' : '#EFF6FF', 
                  borderColor: isDark ? '#374151' : '#BFDBFE',
                  color: colors.accentBlue 
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-bold transition-all shadow-2xs cursor-pointer group"
              >
                <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
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
                    backgroundColor: activeFile === fName ? (isDark ? '#1F2937' : '#EFF6FF') : 'transparent',
                    borderColor: activeFile === fName ? (isDark ? '#374151' : '#BFDBFE') : 'transparent',
                    color: activeFile === fName ? colors.accentBlue : colors.textMain
                  }}
                  className="flex items-center gap-2 px-6 py-1.5 rounded-md cursor-pointer transition-colors border font-medium"
                >
                  <FileCode className="w-3.5 h-3.5" style={{ color: colors.accentBlue }} />
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
                    <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-blue-400" /> Optimization</span>
                    <span style={{ backgroundColor: isDark ? '#064E3B' : '#ECFDF5', color: colors.accentGreen }} className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">Ready</span>
                  </div>
                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md border shadow-2xs font-medium"
                  >
                    <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-teal-400" /> Chemistry CAS</span>
                    <span style={{ backgroundColor: isDark ? '#064E3B' : '#ECFDF5', color: colors.accentGreen }} className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">Ready</span>
                  </div>
                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md border shadow-2xs font-medium"
                  >
                    <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-indigo-400" /> QML Engine</span>
                    <span style={{ backgroundColor: isDark ? '#064E3B' : '#ECFDF5', color: colors.accentGreen }} className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">Ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Bottom Controls: Settings & Profile */}
            <div 
              style={{ backgroundColor: isDark ? '#161B22' : '#F1F5F9', borderColor: colors.border }}
              className="p-2 border-t space-y-1 shrink-0"
            >
              <button
                onClick={() => setIsSettingsOpen(true)}
                style={{ borderColor: colors.border }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-all cursor-pointer group hover:opacity-80"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 group-hover:rotate-45 transition-all" style={{ color: colors.accentBlue }} />
                  <span>Settings</span>
                </div>
                <span 
                  style={{ 
                    backgroundColor: isDark ? '#1F2937' : '#EFF6FF', 
                    color: colors.accentBlue, 
                    borderColor: isDark ? '#374151' : '#BFDBFE' 
                  }}
                  className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold border"
                >
                  {activeModel === 'groq' ? 'Groq' : 'RunPod'}
                </span>
              </button>

              <div 
                style={{ backgroundColor: isDark ? '#21262D' : '#FFFFFF', borderColor: colors.border }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md border transition-all cursor-pointer"
              >
                <div 
                  style={{ backgroundColor: isDark ? '#30363D' : '#E2E8F0', color: colors.textMain }}
                  className="w-6 h-6 rounded-full border border-slate-700/50 flex items-center justify-center text-[10px] font-bold font-heading shrink-0"
                >
                  QD
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold truncate">{projectName === 'my-quantum-project' ? 'Quantum Dev' : 'Project Lead'}</div>
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
            <div style={{ backgroundColor: isDark ? '#30363D' : '#CBD5E1' }} className="w-0.5 h-6 rounded group-hover:bg-blue-500" />
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* SECTION 2 (CENTER): CODE EDITOR + CONTINUOUS CANVAS       */}
        {/* ───────────────────────────────────────────────────────── */}
        <div style={{ backgroundColor: colors.bgEditor }} className="flex-1 flex flex-col min-w-0">
          
          {/* Upper Pane: Monaco Code Editor */}
          <div style={{ borderColor: colors.border }} className="flex-1 flex flex-col min-h-0 border-b">
            
            {/* Editor Tab Bar */}
            <div 
              style={{ backgroundColor: isDark ? '#161B22' : '#F1F5F9', borderColor: colors.border }}
              className="h-9 border-b flex items-center justify-between px-2 shrink-0"
            >
              <div className="flex items-center gap-1">
                
                {/* Expand Section 1 Button if Hidden */}
                {!isLeftOpen && (
                  <button
                    onClick={() => setIsLeftOpen(true)}
                    title="Show Explorer (Section 1)"
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textMain }}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded mr-1.5 border shadow-2xs cursor-pointer"
                  >
                    <PanelLeftOpen className="w-3.5 h-3.5" style={{ color: colors.accentBlue }} />
                    <span>Explorer</span>
                  </button>
                )}

                {Object.keys(files).map((fName) => (
                  <button 
                    key={fName}
                    onClick={() => setActiveFile(fName)}
                    style={{ 
                      backgroundColor: activeFile === fName ? colors.bgEditor : 'transparent',
                      borderTopColor: activeFile === fName ? colors.accentBlue : 'transparent',
                      color: activeFile === fName ? colors.textMain : colors.textMuted
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono border-t-2 transition-colors font-bold"
                  >
                    <FileCode className="w-3.5 h-3.5" style={{ color: colors.accentBlue }} />
                    <span>{fName}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  title="Run Program (Ctrl+Enter)"
                  style={{ 
                    backgroundColor: isDark ? '#1F2937' : '#EFF6FF', 
                    color: colors.accentBlue, 
                    borderColor: isDark ? '#374151' : '#BFDBFE' 
                  }}
                  className="flex items-center gap-1 text-[11px] font-sans font-bold px-2 py-0.5 rounded border transition-all cursor-pointer"
                >
                  {isRunning ? <RotateCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                  <span>Run</span>
                  <span className="text-[9px] font-mono opacity-70">⌃↵</span>
                </button>

                {/* Expand Section 3 Button if Hidden */}
                {!isRightOpen && (
                  <button
                    onClick={() => setIsRightOpen(true)}
                    title="Show Copilot (Section 3)"
                    style={{ 
                      backgroundColor: isDark ? '#1F2937' : '#EFF6FF', 
                      color: colors.accentBlue, 
                      borderColor: isDark ? '#374151' : '#BFDBFE' 
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-sans font-bold rounded border shadow-2xs cursor-pointer"
                  >
                    <PanelRightOpen className="w-3.5 h-3.5" />
                    <span>Copilot</span>
                  </button>
                )}

                <span 
                  style={{ backgroundColor: isDark ? '#21262D' : '#E2E8F0', color: colors.textMuted }}
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                >
                  Block C
                </span>
              </div>
            </div>

            {/* Code Contents */}
            <div 
              style={{ backgroundColor: colors.bgEditor, color: colors.textMain }}
              className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed flex"
            >
              <div 
                style={{ borderColor: colors.border, color: colors.textMuted }}
                className="pr-4 select-none text-right font-mono border-r mr-4 space-y-0.5 opacity-60"
              >
                {files[activeFile].content.split('\n').map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>
              <pre className="flex-1 overflow-x-auto whitespace-pre font-medium font-mono">
                {files[activeFile].content}
              </pre>
            </div>
          </div>

          {/* Lower Pane: Quantum Runtime & Continuous Circuit Canvas */}
          <div 
            style={{ backgroundColor: isDark ? '#161B22' : '#F8FAFC', borderColor: colors.border }}
            className="h-56 flex flex-col shrink-0 border-t"
          >
            {/* Drawer Tabs & Metrics */}
            <div 
              style={{ backgroundColor: isDark ? '#0D1117' : '#F1F5F9', borderColor: colors.border }}
              className="h-8 border-b px-3 flex items-center justify-between shrink-0"
            >
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveBottomTab('circuit')}
                  style={{ 
                    backgroundColor: activeBottomTab === 'circuit' ? (isDark ? '#21262D' : '#FFFFFF') : 'transparent',
                    borderColor: activeBottomTab === 'circuit' ? colors.border : 'transparent',
                    color: activeBottomTab === 'circuit' ? colors.textMain : colors.textMuted
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded border transition-colors cursor-pointer"
                >
                  <Zap className="w-3 h-3" style={{ color: colors.accentAmber }} />
                  <span>Continuous Circuit (fold=-1)</span>
                </button>

                <button 
                  onClick={() => setActiveBottomTab('results')}
                  style={{ 
                    backgroundColor: activeBottomTab === 'results' ? (isDark ? '#21262D' : '#FFFFFF') : 'transparent',
                    borderColor: activeBottomTab === 'results' ? colors.border : 'transparent',
                    color: activeBottomTab === 'results' ? colors.textMain : colors.textMuted
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded border transition-colors cursor-pointer"
                >
                  <Activity className="w-3 h-3" style={{ color: colors.accentGreen }} />
                  <span>Simulation Results & Metrics</span>
                </button>

                <button 
                  onClick={() => setActiveBottomTab('terminal')}
                  style={{ 
                    backgroundColor: activeBottomTab === 'terminal' ? (isDark ? '#21262D' : '#FFFFFF') : 'transparent',
                    borderColor: activeBottomTab === 'terminal' ? colors.border : 'transparent',
                    color: activeBottomTab === 'terminal' ? colors.textMain : colors.textMuted
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded border transition-colors cursor-pointer"
                >
                  <TerminalIcon className="w-3 h-3" />
                  <span>Solver Terminal</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: colors.textMuted }}>
                <span>Active Qubits: <b style={{ color: colors.textMain }}>4</b></span>
                <span>Depth: <b style={{ color: colors.textMain }}>6</b></span>
                <span>CNOTs: <b style={{ color: colors.textMain }}>3</b></span>
                <span 
                  style={{ backgroundColor: isDark ? '#21262D' : '#E2E8F0', color: colors.textMuted }}
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                >
                  Block E
                </span>
              </div>
            </div>

            {/* Bottom Content View */}
            <div 
              style={{ backgroundColor: isDark ? '#0D1117' : '#FFFFFF', color: colors.textMain }}
              className="flex-1 overflow-x-auto overflow-y-auto p-3 font-mono text-xs"
            >
              {activeBottomTab === 'circuit' && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold mb-1" style={{ color: colors.textMuted }}>
                    Continuous Horizontal Circuit Canvas (Zero vertical wrapping — scroll horizontally):
                  </div>
                  <pre className="font-mono text-[11px] font-semibold leading-tight select-text">
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
                    style={{ backgroundColor: isDark ? '#161B22' : '#F8FAFC', borderColor: colors.border }}
                    className="border rounded-lg p-3 space-y-1 shadow-2xs"
                  >
                    <div className="text-[10px] font-bold uppercase" style={{ color: colors.textMuted }}>Expectation Value</div>
                    <div className="text-xl font-bold font-mono" style={{ color: colors.accentBlue }}>-0.4125 Ha</div>
                    <div className="text-[10px] font-medium" style={{ color: colors.textMuted }}>Target: Z ⊗ I ⊗ I ⊗ I</div>
                  </div>
                  <div 
                    style={{ backgroundColor: isDark ? '#161B22' : '#F8FAFC', borderColor: colors.border }}
                    className="border rounded-lg p-3 space-y-1 shadow-2xs"
                  >
                    <div className="text-[10px] font-bold uppercase" style={{ color: colors.textMuted }}>Simulator Fidelity</div>
                    <div className="text-xl font-bold font-mono" style={{ color: colors.accentGreen }}>99.82%</div>
                    <div className="text-[10px] font-medium" style={{ color: colors.textMuted }}>Statevector exact match</div>
                  </div>
                  <div 
                    style={{ backgroundColor: isDark ? '#161B22' : '#F8FAFC', borderColor: colors.border }}
                    className="border rounded-lg p-3 space-y-1 shadow-2xs"
                  >
                    <div className="text-[10px] font-bold uppercase" style={{ color: colors.textMuted }}>Execution Latency</div>
                    <div className="text-xl font-bold font-mono" style={{ color: colors.accentAmber }}>0.14s</div>
                    <div className="text-[10px] font-medium" style={{ color: colors.textMuted }}>Aer C++ Statevector backend</div>
                  </div>
                </div>
              )}

              {activeBottomTab === 'terminal' && (
                <div className="space-y-1 font-mono text-xs">
                  <div className="font-bold" style={{ color: colors.accentGreen }}>➜ python3 main.py</div>
                  <div>⚛️ Initializing Quantum Circuit on AerSimulator...</div>
                  <div className="font-bold" style={{ color: colors.accentBlue }}>✅ Simulation Complete. Expectation &lt;Z_0&gt;: -0.4125</div>
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
            <div style={{ backgroundColor: isDark ? '#30363D' : '#CBD5E1' }} className="w-0.5 h-6 rounded group-hover:bg-blue-500" />
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
            {/* Section 3 Header */}
            <div 
              style={{ backgroundColor: isDark ? '#161B22' : '#F1F5F9', borderColor: colors.border }}
              className="px-3.5 py-2.5 border-b flex items-center justify-between font-heading"
            >
              <div className="flex items-center gap-2">
                <div 
                  style={{ backgroundColor: isDark ? '#1F2937' : '#EFF6FF', color: colors.accentBlue }}
                  className="w-5 h-5 rounded border border-slate-700/50 flex items-center justify-center font-bold"
                >
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold">Quantum Copilot</span>
                <span 
                  style={{ backgroundColor: isDark ? '#21262D' : '#E2E8F0', color: colors.textMain }}
                  className="text-[9px] font-mono px-1 py-0.2 rounded font-semibold"
                >
                  {rightWidth}px
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span 
                  style={{ 
                    backgroundColor: isDark ? '#064E3B' : '#ECFDF5', 
                    color: colors.accentGreen,
                    borderColor: isDark ? '#059669' : '#A7F3D0' 
                  }}
                  className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border"
                >
                  Live
                </span>
                
                <button
                  onClick={() => setIsRightOpen(false)}
                  title="Hide Copilot"
                  className="p-1 rounded-md hover:opacity-75 transition-opacity cursor-pointer"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

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
                      <div>{msg.text}</div>
                    </div>
                  ) : (
                    <div 
                      style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                      className="border rounded-xl p-3 space-y-2 shadow-2xs"
                    >
                      <div style={{ borderColor: colors.border }} className="flex items-center justify-between border-b pb-1.5">
                        <span className="text-[10px] font-bold flex items-center gap-1 font-heading" style={{ color: colors.accentBlue }}>
                          <Sparkles className="w-3 h-3" /> Quantum Guru Copilot
                        </span>
                        <span className="text-[9px] font-mono font-semibold" style={{ color: colors.textMuted }}>
                          {activeModel === 'groq' ? 'Groq (118ms)' : 'RunPod (240ms)'}
                        </span>
                      </div>

                      <p className="leading-relaxed">
                        {msg.text}
                      </p>

                      {msg.toolCall && (
                        <div 
                          style={{ backgroundColor: isDark ? '#0D1117' : '#F8FAFC', borderColor: colors.border }}
                          className="border rounded-lg p-2.5 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold flex items-center gap-1 font-heading">
                              <Check className="w-3 h-3" style={{ color: colors.accentGreen }} /> {msg.toolCall.name}
                            </span>
                            <span 
                              style={{ 
                                backgroundColor: isDark ? '#064E3B' : '#ECFDF5', 
                                color: colors.accentGreen 
                              }}
                              className="font-mono px-1 py-0.5 rounded font-bold text-[9px]"
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
              style={{ backgroundColor: isDark ? '#161B22' : '#FFFFFF', borderColor: colors.border }}
              className="p-3 border-t space-y-2"
            >
              {/* Interactive Slash Command Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono font-bold">
                <button 
                  onClick={() => handleSendMessage('/execute@program')}
                  style={{ 
                    backgroundColor: isDark ? '#1E293B' : '#EFF6FF', 
                    borderColor: isDark ? '#334155' : '#BFDBFE',
                    color: colors.accentBlue 
                  }}
                  className="px-2 py-0.5 rounded border cursor-pointer transition-colors shrink-0 flex items-center gap-1 hover:opacity-80"
                >
                  <Play className="w-2.5 h-2.5 fill-current" /> /execute@program
                </button>
                <button 
                  onClick={() => handleSendMessage('/simulate@circuit')}
                  style={{ 
                    backgroundColor: isDark ? '#3E2A08' : '#FEF3C7', 
                    borderColor: isDark ? '#78350F' : '#FDE68A',
                    color: colors.accentAmber 
                  }}
                  className="px-2 py-0.5 rounded border cursor-pointer transition-colors shrink-0 flex items-center gap-1 hover:opacity-80"
                >
                  <Zap className="w-2.5 h-2.5" /> /simulate@circuit
                </button>
                <button 
                  onClick={() => handleSendMessage('/transpile@level2')}
                  style={{ 
                    backgroundColor: isDark ? '#21262D' : '#F1F5F9', 
                    borderColor: colors.border,
                    color: colors.textMain 
                  }}
                  className="px-2 py-0.5 rounded border cursor-pointer transition-colors shrink-0 hover:opacity-80"
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
                  style={{ color: colors.textMain }}
                  className="flex-1 bg-transparent border-none outline-hidden text-xs font-medium px-1 font-sans placeholder:opacity-40"
                />
                <button 
                  onClick={() => handleSendMessage()}
                  className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
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
          <span className="flex items-center gap-1 font-bold" style={{ color: colors.textMain }}>
            <GitBranch className="w-3 h-3 text-blue-500" /> feature/quantum-cursor-ide
          </span>
          <span>Workspace: <b style={{ color: colors.textMain }}>Ready</b></span>
          <span>Target QPU: <b style={{ color: colors.accentGreen }}>{targetBackend}</b></span>
          <span>AI Engine: <b style={{ color: colors.accentBlue }}>{activeModel === 'groq' ? 'Groq (Llama-3.3)' : 'RunPod (Qwen-27B)'}</b></span>
        </div>

        <div className="flex items-center gap-4">
          <span>Active File: <b style={{ color: colors.textMain }}>{activeFile}</b></span>
          <span>Theme: <b style={{ color: isDark ? colors.accentBlue : colors.accentAmber }}>{isDark ? 'Dark' : 'Light'}</b></span>
          <span>Section 1: <b style={{ color: colors.textMain }}>{isLeftOpen ? `${leftWidth}px` : 'Hidden'}</b></span>
          <span>Section 3: <b style={{ color: colors.textMain }}>{isRightOpen ? `${rightWidth}px` : 'Hidden'}</b></span>
        </div>
      </footer>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* START NEW PROJECT TEMPLATE SELECTOR MODAL                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isNewProjectOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div 
            style={{ backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textMain }}
            className="border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div 
              style={{ backgroundColor: isDark ? '#0D1117' : '#F8FAFC', borderColor: colors.border }}
              className="px-5 py-3.5 border-b flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-bold font-heading">Start a New Quantum Project</h3>
                <p className="text-[11px]" style={{ color: colors.textMuted }}>Choose a quantum scaffold or blank workspace</p>
              </div>
              <button 
                onClick={() => setIsNewProjectOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-75 transition-opacity cursor-pointer"
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
                    backgroundColor: isDark ? '#0D1117' : '#FFFFFF', 
                    borderColor: colors.border 
                  }}
                  className="p-4 rounded-xl border cursor-pointer transition-all shadow-2xs group flex flex-col gap-1.5 hover:border-blue-500"
                >
                  <div className="text-xs font-bold flex items-center justify-between group-hover:text-blue-400">
                    <span>{tpl.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5" />
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
                          backgroundColor: isDark ? '#161B22' : '#F1F5F9', 
                          borderColor: colors.border,
                          color: colors.textMain
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
