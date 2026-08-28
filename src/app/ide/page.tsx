'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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

  const isDark = theme === 'dark';

  return (
    <div className={`h-screen w-screen flex flex-col font-sans select-none overflow-hidden relative ${isDark ? 'bg-[#0B0F17] text-slate-200' : 'bg-[#F8FAFC] text-[#0F172A]'}`}>
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* BLOCK A: MINIMALIST TOP COMMAND BAR                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className={`h-12 border-b px-4 flex items-center justify-between shrink-0 z-20 shadow-xs ${isDark ? 'bg-[#111827] border-[#1F2937]' : 'bg-white border-slate-200'}`}>
        
        {/* Left: Brand & Toggle Explorer Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsLeftOpen(!isLeftOpen)}
            title={isLeftOpen ? "Hide Explorer (Section 1)" : "Show Explorer (Section 1)"}
            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${isLeftOpen ? (isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-300') : (isDark ? 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800' : 'bg-white text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-50')}`}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center font-black text-sm ${isDark ? 'bg-blue-900/30 border-blue-700/50 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
              ⚛
            </div>
            <span className={`font-extrabold text-sm tracking-tight font-heading ${isDark ? 'text-white' : 'text-slate-900'}`}>Quantum Guru <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold ${isDark ? 'bg-blue-950/60 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>IDE</span></span>
          </div>

          <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          {/* Project Breadcrumb */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors font-medium ${isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}>
            <Folder className="w-3.5 h-3.5 text-blue-500" />
            <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{projectName}</span>
            <ChevronDown className="w-3 h-3 text-slate-500 ml-1" />
          </div>
        </div>

        {/* Right: Section 3 Toggle & Theme Switcher Button */}
        <div className="flex items-center gap-2">
          {/* Theme Quick Toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${isDark ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Section 3 Toggle Button */}
          <button
            onClick={() => setIsRightOpen(!isRightOpen)}
            title={isRightOpen ? "Hide Copilot (Section 3)" : "Show Copilot (Section 3)"}
            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${isRightOpen ? (isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-300') : (isDark ? 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800' : 'bg-white text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-50')}`}
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SETTINGS MODAL                                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className={`border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 ${isDark ? 'bg-[#111827] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'}`}>
            
            {/* Modal Header */}
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${isDark ? 'bg-blue-900/30 border-blue-700/40 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading">Quantum Environment Settings</h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Configure AI copilot inference models, theme, target backends, and compiler passes</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
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
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isDark ? 'bg-blue-950/40 border-blue-500' : 'bg-slate-100 border-slate-200'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-blue-400" />
                      <span className="font-bold">Dark Cosmic Theme</span>
                    </div>
                    {isDark && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </div>

                  <div 
                    onClick={() => setTheme('light')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${!isDark ? 'bg-blue-50 border-blue-500 text-slate-900 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Light High-Contrast</span>
                    </div>
                    {!isDark && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                </div>
              </div>

              {/* 2. AI Copilot Inference Engine */}
              <div className={`space-y-2.5 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider font-heading">
                  <Bot className="w-3.5 h-3.5 text-blue-500" />
                  <span>AI Copilot Inference Engine</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setActiveModel('groq')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${activeModel === 'groq' ? (isDark ? 'bg-blue-950/40 border-blue-500' : 'bg-blue-50/60 border-blue-500') : (isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200')}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold flex items-center gap-1">⚡ Groq Llama-3.3</span>
                      {activeModel === 'groq' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Ultra-low latency streaming (~120ms), instant AST code edits, and rapid tool execution.
                    </p>
                  </div>

                  <div 
                    onClick={() => setActiveModel('runpod')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${activeModel === 'runpod' ? (isDark ? 'bg-blue-950/40 border-blue-500' : 'bg-blue-50/60 border-blue-500') : (isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200')}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold flex items-center gap-1">🧠 RunPod Qwen-27B</span>
                      {activeModel === 'runpod' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Deep mathematical rigor, Hamiltonian parsing, and specialized quantum domain weights.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Target Execution Backend */}
              <div className={`space-y-2.5 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider font-heading">
                    <Server className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Target Execution Backend</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${isDark ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>Active: {targetBackend}</span>
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
                      className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${targetBackend === b.id ? (isDark ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 font-bold' : 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold') : (isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100')}`}
                    >
                      <div className="text-xs">{b.label}</div>
                      <div className={`text-[9px] font-sans mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{b.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Transpiler Optimization Level */}
              <div className={`space-y-2.5 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider font-heading">
                    <Wrench className="w-3.5 h-3.5 text-amber-500" />
                    <span>Compiler Optimization Level</span>
                  </div>
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${isDark ? 'bg-blue-950/60 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>Level {optimizationLevel}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center font-mono">
                  {[0, 1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setOptimizationLevel(lvl)}
                      className={`py-1.5 rounded-md border text-xs font-bold transition-all cursor-pointer ${optimizationLevel === lvl ? (isDark ? 'bg-amber-950/60 border-amber-500 text-amber-300' : 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs') : (isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')}`}
                    >
                      Level {lvl}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className={`px-5 py-3 border-t flex items-center justify-end ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'}`}>
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
            style={{ width: `${leftWidth}px` }}
            className={`border-r flex flex-col shrink-0 relative transition-[width] duration-0 ${isDark ? 'bg-[#0E131F] border-[#1F2937]' : 'bg-slate-50 border-slate-200'}`}
          >
            {/* Section 1 Header */}
            <div className={`px-3.5 py-2.5 border-b flex items-center justify-between font-heading ${isDark ? 'bg-slate-900/40 border-[#1F2937]' : 'bg-slate-100/60 border-slate-200'}`}>
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Explorer</span>
                <span className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'}`}>{leftWidth}px</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsLeftOpen(false)}
                  title="Hide Explorer"
                  className={`p-1 rounded-md transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Start New Project Action Button */}
            <div className={`p-2 border-b ${isDark ? 'border-[#1F2937] bg-[#0E131F]' : 'border-slate-200 bg-white'}`}>
              <button
                onClick={() => setIsNewProjectOpen(true)}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-bold transition-all shadow-2xs cursor-pointer group ${isDark ? 'bg-blue-950/40 hover:bg-blue-900/60 text-blue-400 border-blue-800/80' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border-blue-200'}`}
              >
                <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                <span>Start New Project</span>
              </button>
            </div>

            {/* Project File Tree */}
            <div className="p-2 space-y-0.5 text-xs flex-1 overflow-y-auto font-mono">
              <div className={`flex items-center gap-1.5 px-2 py-1 font-bold ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>{projectName.toUpperCase()}</span>
              </div>

              {Object.keys(files).map((fName) => (
                <div 
                  key={fName}
                  onClick={() => setActiveFile(fName)}
                  className={`flex items-center gap-2 px-6 py-1.5 rounded-md cursor-pointer transition-colors ${activeFile === fName ? (isDark ? 'bg-blue-950/60 text-blue-400 border border-blue-800/60 font-bold' : 'bg-blue-50 text-blue-800 border border-blue-200 font-bold') : (isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900 font-medium')}`}
                >
                  <FileCode className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{fName}</span>
                </div>
              ))}

              <div className="pt-4 px-2">
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 font-heading ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Active Quantum Sub-Engines
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border shadow-2xs font-medium ${isDark ? 'bg-[#111827] text-slate-300 border-slate-800' : 'bg-white text-slate-800 border-slate-200'}`}>
                    <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-blue-500" /> Optimization</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${isDark ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>Ready</span>
                  </div>
                  <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border shadow-2xs font-medium ${isDark ? 'bg-[#111827] text-slate-300 border-slate-800' : 'bg-white text-slate-800 border-slate-200'}`}>
                    <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-teal-500" /> Chemistry CAS</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${isDark ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>Ready</span>
                  </div>
                  <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border shadow-2xs font-medium ${isDark ? 'bg-[#111827] text-slate-300 border-slate-800' : 'bg-white text-slate-800 border-slate-200'}`}>
                    <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-indigo-400" /> QML Engine</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${isDark ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>Ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Bottom Controls: Settings & Profile */}
            <div className={`p-2 border-t space-y-1 shrink-0 ${isDark ? 'border-[#1F2937] bg-slate-900/50' : 'border-slate-200 bg-slate-100/70'}`}>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-all cursor-pointer group ${isDark ? 'hover:bg-slate-800 text-slate-300 border-transparent hover:border-slate-700' : 'hover:bg-white text-slate-700 hover:text-slate-900 border-transparent hover:border-slate-200'}`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-500 group-hover:text-blue-500 group-hover:rotate-45 transition-all" />
                  <span>Settings</span>
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold border ${isDark ? 'bg-blue-950/60 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {activeModel === 'groq' ? 'Groq' : 'RunPod'}
                </span>
              </button>

              <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-all cursor-pointer ${isDark ? 'hover:bg-slate-800/80' : 'hover:bg-white'}`}>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold font-heading shrink-0 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-200 border-slate-300 text-slate-800'}`}>
                  QD
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Quantum Dev</div>
                  <div className={`text-[9px] truncate font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ms@qc.guru</div>
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
            <div className={`w-0.5 h-6 rounded ${isDark ? 'bg-slate-700 group-hover:bg-blue-500' : 'bg-slate-300 group-hover:bg-blue-600'}`} />
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* SECTION 2 (CENTER): CODE EDITOR + CONTINUOUS CANVAS       */}
        {/* ───────────────────────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col min-w-0 ${isDark ? 'bg-[#0B0F17]' : 'bg-white'}`}>
          
          {/* Upper Pane: Monaco Code Editor */}
          <div className={`flex-1 flex flex-col min-h-0 border-b ${isDark ? 'border-[#1F2937]' : 'border-slate-200'}`}>
            
            {/* Editor Tab Bar */}
            <div className={`h-9 border-b flex items-center justify-between px-2 shrink-0 ${isDark ? 'bg-[#111827] border-[#1F2937]' : 'bg-slate-100/70 border-slate-200'}`}>
              <div className="flex items-center gap-1">
                
                {/* Expand Section 1 Button if Hidden */}
                {!isLeftOpen && (
                  <button
                    onClick={() => setIsLeftOpen(true)}
                    title="Show Explorer (Section 1)"
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded mr-1.5 border shadow-2xs cursor-pointer ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white' : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'}`}
                  >
                    <PanelLeftOpen className="w-3.5 h-3.5 text-blue-500" />
                    <span>Explorer</span>
                  </button>
                )}

                {Object.keys(files).map((fName) => (
                  <button 
                    key={fName}
                    onClick={() => setActiveFile(fName)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono border-t-2 transition-colors ${activeFile === fName ? (isDark ? 'bg-[#0B0F17] border-blue-500 text-white font-bold' : 'bg-white border-blue-600 text-slate-900 font-bold shadow-2xs') : (isDark ? 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200' : 'border-transparent text-slate-600 hover:bg-slate-200/50 hover:text-slate-800 font-medium')}`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-blue-500" />
                    <span>{fName}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  title="Run Program (Ctrl+Enter)"
                  className={`flex items-center gap-1 text-[11px] font-sans font-bold px-2 py-0.5 rounded border transition-all cursor-pointer ${isDark ? 'bg-blue-950/50 hover:bg-blue-900 text-blue-300 border-blue-800/60' : 'bg-slate-200/70 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-700 border-slate-300/80'}`}
                >
                  {isRunning ? <RotateCw className="w-3 h-3 animate-spin text-blue-400" /> : <Play className="w-3 h-3 text-blue-500 fill-current" />}
                  <span>Run</span>
                  <span className={`text-[9px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>⌃↵</span>
                </button>

                {/* Expand Section 3 Button if Hidden */}
                {!isRightOpen && (
                  <button
                    onClick={() => setIsRightOpen(true)}
                    title="Show Copilot (Section 3)"
                    className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-sans font-bold rounded border shadow-2xs cursor-pointer ${isDark ? 'bg-blue-950/50 text-blue-300 border-blue-800/60' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                  >
                    <PanelRightOpen className="w-3.5 h-3.5" />
                    <span>Copilot</span>
                  </button>
                )}

                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-800'}`}>Block C</span>
              </div>
            </div>

            {/* Code Contents */}
            <div className={`flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed flex ${isDark ? 'bg-[#0B0F17] text-slate-200' : 'bg-[#FAFAFA] text-slate-900'}`}>
              <div className={`pr-4 select-none text-right font-mono border-r mr-4 space-y-0.5 ${isDark ? 'text-slate-400 border-slate-800' : 'text-slate-400 border-slate-200'}`}>
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
          <div className={`h-56 flex flex-col shrink-0 ${isDark ? 'bg-[#0E131F]' : 'bg-slate-50'}`}>
            
            {/* Drawer Tabs & Metrics */}
            <div className={`h-8 border-b px-3 flex items-center justify-between shrink-0 ${isDark ? 'bg-[#111827] border-[#1F2937]' : 'bg-slate-100 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveBottomTab('circuit')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded transition-colors ${activeBottomTab === 'circuit' ? (isDark ? 'bg-blue-950/60 text-blue-400 border border-blue-800' : 'bg-white text-blue-700 border border-slate-300 shadow-2xs') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')}`}
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Continuous Circuit (fold=-1)</span>
                </button>

                <button 
                  onClick={() => setActiveBottomTab('results')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded transition-colors ${activeBottomTab === 'results' ? (isDark ? 'bg-blue-950/60 text-blue-400 border border-blue-800' : 'bg-white text-blue-700 border border-slate-300 shadow-2xs') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')}`}
                >
                  <Activity className="w-3 h-3 text-emerald-500" />
                  <span>Simulation Results & Metrics</span>
                </button>

                <button 
                  onClick={() => setActiveBottomTab('terminal')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded transition-colors ${activeBottomTab === 'terminal' ? (isDark ? 'bg-blue-950/60 text-blue-400 border border-blue-800' : 'bg-white text-blue-700 border border-slate-300 shadow-2xs') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')}`}
                >
                  <TerminalIcon className="w-3 h-3 text-slate-400" />
                  <span>Solver Terminal</span>
                </button>
              </div>

              <div className={`flex items-center gap-3 text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <span>Active Qubits: <b className={isDark ? 'text-white' : 'text-slate-900'}>4</b></span>
                <span>Depth: <b className={isDark ? 'text-white' : 'text-slate-900'}>6</b></span>
                <span>CNOTs: <b className={isDark ? 'text-white' : 'text-slate-900'}>3</b></span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-800'}`}>Block E</span>
              </div>
            </div>

            {/* Bottom Content View */}
            <div className={`flex-1 overflow-x-auto overflow-y-auto p-3 font-mono text-xs ${isDark ? 'bg-[#0B0F17] text-slate-200' : 'bg-white text-slate-900'}`}>
              
              {activeBottomTab === 'circuit' && (
                <div className="space-y-1">
                  <div className={`text-[10px] font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
                  <div className={`border rounded-lg p-3 space-y-1 shadow-2xs ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Expectation Value</div>
                    <div className="text-xl font-bold text-blue-400 font-mono">-0.4125 Ha</div>
                    <div className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Target: Z ⊗ I ⊗ I ⊗ I</div>
                  </div>
                  <div className={`border rounded-lg p-3 space-y-1 shadow-2xs ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Simulator Fidelity</div>
                    <div className="text-xl font-bold text-emerald-400 font-mono">99.82%</div>
                    <div className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Statevector exact match</div>
                  </div>
                  <div className={`border rounded-lg p-3 space-y-1 shadow-2xs ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Execution Latency</div>
                    <div className="text-xl font-bold text-amber-400 font-mono">0.14s</div>
                    <div className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Aer C++ Statevector backend</div>
                  </div>
                </div>
              )}

              {activeBottomTab === 'terminal' && (
                <div className="space-y-1 font-mono text-xs">
                  <div className="text-emerald-400 font-bold">➜ python3 main.py</div>
                  <div>⚛️ Initializing Quantum Circuit on AerSimulator...</div>
                  <div className="font-bold text-blue-400">✅ Simulation Complete. Expectation &lt;Z_0&gt;: -0.4125</div>
                  <div className="text-slate-500">Process finished with exit code 0 (0.142s)</div>
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
            <div className={`w-0.5 h-6 rounded ${isDark ? 'bg-slate-700 group-hover:bg-blue-500' : 'bg-slate-300 group-hover:bg-blue-600'}`} />
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECTION 3 (RIGHT): AGENTIC QUANTUM COPILOT                 */}
        {/* ─────────────────────────────────────────────────────────── */}
        {isRightOpen ? (
          <aside 
            style={{ width: `${rightWidth}px` }}
            className={`border-l flex flex-col shrink-0 relative transition-[width] duration-0 ${isDark ? 'bg-[#0E131F] border-[#1F2937]' : 'bg-slate-50 border-slate-200'}`}
          >
            {/* Section 3 Header */}
            <div className={`px-3.5 py-2.5 border-b flex items-center justify-between font-heading ${isDark ? 'bg-slate-900/40 border-[#1F2937]' : 'bg-slate-100/60 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded border flex items-center justify-center font-bold ${isDark ? 'bg-blue-900/30 border-blue-700/40 text-blue-400' : 'bg-blue-100 border-blue-200 text-blue-700'}`}>
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Quantum Copilot</span>
                <span className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'}`}>{rightWidth}px</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800'}`}>Live</span>
                
                <button
                  onClick={() => setIsRightOpen(false)}
                  title="Hide Copilot"
                  className={`p-1 rounded-md transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
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
                    <div className={`border rounded-xl p-3 shadow-2xs font-medium ${isDark ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'}`}>
                      <div className={`text-[10px] font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>You</div>
                      <div>{msg.text}</div>
                    </div>
                  ) : (
                    <div className={`border rounded-xl p-3 space-y-2 shadow-2xs ${isDark ? 'bg-[#111827] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
                      <div className={`flex items-center justify-between border-b pb-1.5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1 font-heading">
                          <Sparkles className="w-3 h-3" /> Quantum Guru Copilot
                        </span>
                        <span className={`text-[9px] font-mono font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{activeModel === 'groq' ? 'Groq (118ms)' : 'RunPod (240ms)'}</span>
                      </div>

                      <p className="leading-relaxed">
                        {msg.text}
                      </p>

                      {msg.toolCall && (
                        <div className={`border rounded-lg p-2.5 space-y-1 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold flex items-center gap-1 font-heading">
                              <Check className="w-3 h-3 text-emerald-400" /> {msg.toolCall.name}
                            </span>
                            <span className={`font-mono px-1 py-0.5 rounded font-bold text-[9px] ${isDark ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>{msg.toolCall.badge}</span>
                          </div>
                          <div className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
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
            <div className={`p-3 border-t space-y-2 ${isDark ? 'border-[#1F2937] bg-[#111827]/60' : 'border-slate-200 bg-white'}`}>
              
              {/* Interactive Slash Command Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono font-bold">
                <button 
                  onClick={() => handleSendMessage('/execute@program')}
                  className={`px-2 py-0.5 rounded border cursor-pointer transition-colors shrink-0 flex items-center gap-1 ${isDark ? 'bg-blue-950/60 border-blue-800 text-blue-400 hover:bg-blue-900' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                >
                  <Play className="w-2.5 h-2.5 fill-current" /> /execute@program
                </button>
                <button 
                  onClick={() => handleSendMessage('/simulate@circuit')}
                  className={`px-2 py-0.5 rounded border cursor-pointer transition-colors shrink-0 flex items-center gap-1 ${isDark ? 'bg-amber-950/60 border-amber-800 text-amber-400 hover:bg-amber-900' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}
                >
                  <Zap className="w-2.5 h-2.5" /> /simulate@circuit
                </button>
                <button 
                  onClick={() => handleSendMessage('/transpile@level2')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors shrink-0 ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}
                >
                  /transpile@level2
                </button>
              </div>

              {/* Input form */}
              <div className={`flex items-center gap-2 border rounded-lg p-1.5 transition-all shadow-2xs ${isDark ? 'bg-[#0B0F17] border-slate-800 focus-within:border-blue-500' : 'bg-slate-50 border-slate-300 focus-within:border-blue-500 focus-within:bg-white'}`}>
                <input 
                  type="text"
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                  placeholder="Ask Copilot or try /execute@program..."
                  className={`flex-1 bg-transparent border-none outline-hidden text-xs font-medium px-1 font-sans ${isDark ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
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
      <footer className={`h-6 border-t px-3 flex items-center justify-between text-[10px] font-mono shrink-0 z-20 font-medium ${isDark ? 'bg-[#0B0F17] border-[#1F2937] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
        <div className="flex items-center gap-4">
          <span className={`flex items-center gap-1 font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            <GitBranch className="w-3 h-3 text-blue-500" /> feature/quantum-cursor-ide
          </span>
          <span>Workspace: <b className={isDark ? 'text-slate-200' : 'text-slate-800'}>Ready</b></span>
          <span>Target QPU: <b className="text-emerald-500">{targetBackend}</b></span>
          <span>AI Engine: <b className="text-blue-500">{activeModel === 'groq' ? 'Groq (Llama-3.3)' : 'RunPod (Qwen-27B)'}</b></span>
        </div>

        <div className="flex items-center gap-4">
          <span>Active File: <b className={isDark ? 'text-slate-200' : 'text-slate-800'}>{activeFile}</b></span>
          <span>Theme: <b className={isDark ? 'text-blue-400' : 'text-amber-600'}>{isDark ? 'Dark' : 'Light'}</b></span>
          <span>Section 1: <b className={isDark ? 'text-slate-200' : 'text-slate-800'}>{isLeftOpen ? `${leftWidth}px` : 'Hidden'}</b></span>
          <span>Section 3: <b className={isDark ? 'text-slate-200' : 'text-slate-800'}>{isRightOpen ? `${rightWidth}px` : 'Hidden'}</b></span>
        </div>
      </footer>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* START NEW PROJECT TEMPLATE SELECTOR MODAL                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isNewProjectOpen && (
        <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className={`border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 ${isDark ? 'bg-[#111827] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'}`}>
            
            {/* Header */}
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div>
                <h3 className="text-sm font-bold font-heading">Start a New Quantum Project</h3>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Choose a quantum scaffold or blank workspace</p>
              </div>
              <button 
                onClick={() => setIsNewProjectOpen(false)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
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
                  className={`p-4 rounded-xl border cursor-pointer transition-all shadow-2xs group flex flex-col gap-1.5 ${isDark ? 'border-slate-800 hover:border-blue-500 bg-slate-900/40 hover:bg-blue-950/30' : 'border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/30'}`}
                >
                  <div className={`text-xs font-bold flex items-center justify-between ${isDark ? 'text-slate-100 group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-700'}`}>
                    <span>{tpl.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {tpl.desc}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono">
                    <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Files:</span>
                    {Object.keys(tpl.files).map(f => (
                      <span key={f} className={`px-1.5 py-0.5 rounded border font-medium ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>{f}</span>
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
