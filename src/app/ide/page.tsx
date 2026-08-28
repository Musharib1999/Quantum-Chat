'use client';

import React, { useState } from 'react';
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
  Maximize2, 
  Minimize2, 
  RotateCw, 
  Check, 
  Copy, 
  Send,
  Sliders,
  Database,
  GitBranch,
  ShieldAlert,
  Bot,
  X,
  SlidersHorizontal,
  Server,
  Wrench,
  Command
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
  const [activeFile, setActiveFile] = useState('main.py');
  const [activeBottomTab, setActiveBottomTab] = useState<'circuit' | 'results' | 'terminal' | 'statevector'>('circuit');
  const [activeModel, setActiveModel] = useState<'groq' | 'runpod'>('groq');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [targetBackend, setTargetBackend] = useState('aer_simulator');
  const [optimizationLevel, setOptimizationLevel] = useState<number>(2);
  const [shots, setShots] = useState<number>(1024);
  const [errorMitigation, setErrorMitigation] = useState(true);
  const [copilotInput, setCopilotInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

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

  // Starter file content dictionary
  const files: Record<string, { name: string; lang: string; content: string }> = {
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
    # 1. Quantum Data Encoding Layer (Phase Normalization [0, pi])
    feature_map = ZZFeatureMap(feature_dimension=num_qubits, reps=1, entanglement='linear')
    
    # 2. Parameterized Variational Ansatz Layer
    ansatz = RealAmplitudes(num_qubits=num_qubits, reps=2)
    
    # 3. Stack layers into unified quantum circuit
    qc = QuantumCircuit(num_qubits)
    qc.compose(feature_map, inplace=True)
    qc.compose(ansatz, inplace=True)
    return qc

def main():
    print("⚛️ Initializing Quantum Circuit on AerSimulator...")
    circuit = build_quantum_program(num_qubits=4)
    
    # 4. Simulate Statevector & Measure Pauli-Z Expectation
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
      content: `{
  "project_name": "quantum-alpha-scaffold",
  "version": "1.0.0",
  "target_backend": "aer_simulator",
  "default_shots": 1024,
  "optimization_level": 2,
  "active_qubits": 4,
  "error_mitigation": {
    "enabled": true,
    "method": "ZNE",
    "noise_scaling_factors": [1.0, 1.5, 2.0]
  },
  "compiler_passes": [
    "CommutativeCancellation",
    "ConsolidateBlocks",
    "Optimize1qGatesDecomposition"
  ]
}`
    },
    'README.md': {
      name: 'README.md',
      lang: 'markdown',
      content: `# ⚛️ Quantum Guru Project

Welcome to your Quantum Guru Development Workspace.

## 🚀 Chat Command Shortcuts
- \`/execute@program\` — Executes active script in solver terminal.
- \`/simulate@circuit\` — Renders continuous horizontal circuit canvas.
- \`/transpile@level2\` — Optimizes circuit depth and cancels redundant gates.
`
    },
    'requirements.txt': {
      name: 'requirements.txt',
      lang: 'text',
      content: `qiskit>=1.3.0
qiskit-aer>=0.14.0
numpy>=1.26.0
scipy>=1.12.0
openfermionpyscf>=0.5
matplotlib>=3.8.0
`
    }
  };

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

    // Add user message
    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    setCopilotInput('');

    // Process slash commands
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
    <div className="h-screen w-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans select-none overflow-hidden relative">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* BLOCK A: MINIMALIST UNCLUTTERED TOP COMMAND BAR               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-20 shadow-xs">
        
        {/* Left: Clean Brand & Workspace Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-sm">
              ⚛
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 font-heading">Quantum Guru <span className="text-[10px] text-blue-700 font-mono px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 font-bold">IDE</span></span>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Project Breadcrumb */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 cursor-pointer transition-colors font-medium">
            <Folder className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-mono text-slate-900 font-bold">my-quantum-project</span>
            <ChevronDown className="w-3 h-3 text-slate-500 ml-1" />
          </div>
        </div>

        {/* Center: Clean & Uncluttered */}
        <div className="flex items-center gap-2">
        </div>

        {/* Right: Settings Modal Trigger & User Profile */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-md text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            <span>Settings</span>
            <span className="text-[9px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.2 rounded font-bold ml-0.5">
              {activeModel === 'groq' ? 'Groq' : 'RunPod'}
            </span>
          </button>

          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-800 shadow-2xs font-heading">
            QD
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SETTINGS MODAL (HOUSES TARGET QPU, AI ENGINES & COMPILER)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">Quantum Environment Settings</h3>
                  <p className="text-[11px] text-slate-500">Configure AI copilot inference models, target backends, and compiler passes</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh] text-xs">
              
              {/* 1. AI Copilot Inference Engine */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider font-heading">
                  <Bot className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. AI Copilot Inference Engine</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setActiveModel('groq')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${activeModel === 'groq' ? 'bg-blue-50/60 border-blue-500 shadow-xs' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 flex items-center gap-1">⚡ Groq Llama-3.3</span>
                      {activeModel === 'groq' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Ultra-low latency streaming (~120ms), instant AST code edits, and rapid tool execution.
                    </p>
                  </div>

                  <div 
                    onClick={() => setActiveModel('runpod')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${activeModel === 'runpod' ? 'bg-blue-50/60 border-blue-500 shadow-xs' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 flex items-center gap-1">🧠 RunPod Qwen-27B</span>
                      {activeModel === 'runpod' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Deep mathematical rigor, Hamiltonian parsing, and specialized quantum domain weights.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Target Execution Backend */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider font-heading">
                    <Server className="w-3.5 h-3.5 text-emerald-600" />
                    <span>2. Target Execution Backend</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">Active: {targetBackend}</span>
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
                      className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${targetBackend === b.id ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <div className="text-xs">{b.label}</div>
                      <div className="text-[9px] text-slate-500 font-sans mt-0.5">{b.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Transpiler Optimization Level */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider font-heading">
                    <Wrench className="w-3.5 h-3.5 text-amber-600" />
                    <span>3. Compiler Optimization Level</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Level {optimizationLevel}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center font-mono">
                  {[0, 1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setOptimizationLevel(lvl)}
                      className={`py-1.5 rounded-md border text-xs font-bold transition-all ${optimizationLevel === lvl ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      Level {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Measurement Shots & Error Mitigation */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Default Shots Count</label>
                  <select 
                    value={shots}
                    onChange={(e) => setShots(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900 outline-hidden font-bold"
                  >
                    <option value={1024}>1024 Shots</option>
                    <option value={2048}>2048 Shots</option>
                    <option value={4096}>4096 Shots</option>
                    <option value={8192}>8192 Shots</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Quantum Error Mitigation (ZNE)</label>
                  <button 
                    onClick={() => setErrorMitigation(!errorMitigation)}
                    className={`w-full py-2 rounded-lg border text-xs font-bold transition-colors ${errorMitigation ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : 'bg-slate-100 border-slate-300 text-slate-600'}`}
                  >
                    {errorMitigation ? '✓ ZNE Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Apply & Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN WORKSPACE BODY (3-COLUMN SPLIT: EXPLORER / EDITOR / COPILOT) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* ─────────────────────────────────────────────────────────── */}
        {/* BLOCK B: LEFT FILE EXPLORER & QUANTUM REPOSITORY          */}
        {/* ─────────────────────────────────────────────────────────── */}
        <aside className="w-60 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
          
          {/* Section Header */}
          <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase tracking-wider bg-slate-100/60 font-heading">
            <span>Explorer</span>
            <span className="text-[9px] font-mono bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">Block B</span>
          </div>

          {/* Project File Tree */}
          <div className="p-2 space-y-0.5 text-xs flex-1 overflow-y-auto font-mono">
            <div className="flex items-center gap-1.5 px-2 py-1 text-slate-800 font-bold">
              <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
              <span>MY-QUANTUM-PROJECT</span>
            </div>

            {Object.keys(files).map((fName) => (
              <div 
                key={fName}
                onClick={() => setActiveFile(fName)}
                className={`flex items-center gap-2 px-6 py-1.5 rounded-md cursor-pointer transition-colors ${activeFile === fName ? 'bg-blue-50 text-blue-800 border border-blue-200 font-bold' : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900 font-medium'}`}
              >
                <FileCode className="w-3.5 h-3.5 text-slate-500" />
                <span>{fName}</span>
              </div>
            ))}

            <div className="pt-4 px-2">
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2 font-heading">
                Active Quantum Sub-Engines
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white text-slate-800 border border-slate-200 shadow-2xs font-medium">
                  <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-blue-600" /> Optimization</span>
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold">Ready</span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white text-slate-800 border border-slate-200 shadow-2xs font-medium">
                  <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-teal-600" /> Chemistry CAS</span>
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold">Ready</span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white text-slate-800 border border-slate-200 shadow-2xs font-medium">
                  <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-indigo-600" /> QML Engine</span>
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold">Ready</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ───────────────────────────────────────────────────────── */}
        {/* CENTER COLUMN: CODE EDITOR (TOP) + RUNTIME CANVAS (BOTTOM)*/}
        {/* ───────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          
          {/* ─────────────────────────────────────────────────────── */}
          {/* BLOCK C: CENTRAL QUANTUM CODE EDITOR                    */}
          {/* ─────────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-slate-200">
            
            {/* Editor Tab Bar */}
            <div className="h-9 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between px-2 shrink-0">
              <div className="flex items-center gap-1">
                {Object.keys(files).map((fName) => (
                  <button 
                    key={fName}
                    onClick={() => setActiveFile(fName)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono border-t-2 transition-colors ${activeFile === fName ? 'bg-white border-blue-600 text-slate-900 font-bold shadow-2xs' : 'border-transparent text-slate-600 hover:bg-slate-200/50 hover:text-slate-800 font-medium'}`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-blue-600" />
                    <span>{fName}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  title="Run Program (Ctrl+Enter)"
                  className="flex items-center gap-1 text-[11px] font-sans font-bold text-slate-700 hover:text-blue-700 bg-slate-200/70 hover:bg-blue-50 hover:border-blue-200 border border-slate-300/80 px-2 py-0.5 rounded transition-all cursor-pointer"
                >
                  {isRunning ? <RotateCw className="w-3 h-3 animate-spin text-blue-600" /> : <Play className="w-3 h-3 text-blue-600 fill-current" />}
                  <span>Run</span>
                  <span className="text-[9px] text-slate-400 font-mono">⌃↵</span>
                </button>
                <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[9px] font-bold">Block C (Monaco Editor)</span>
                <span className="font-semibold text-slate-800">Python 3.13</span>
              </div>
            </div>

            {/* Code Editor Canvas */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-900 leading-relaxed bg-[#FAFAFA] flex">
              {/* Line Numbers */}
              <div className="pr-4 text-slate-400 select-none text-right font-mono border-r border-slate-200 mr-4 space-y-0.5">
                {files[activeFile].content.split('\n').map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>

              {/* Code Contents */}
              <pre className="flex-1 overflow-x-auto text-slate-900 whitespace-pre font-medium font-mono">
                {files[activeFile].content}
              </pre>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────── */}
          {/* BLOCK E: BOTTOM QUANTUM RUNTIME & CONTINUOUS CIRCUIT CANVAS*/}
          {/* ─────────────────────────────────────────────────────── */}
          <div className="h-56 bg-slate-50 flex flex-col shrink-0">
            
            {/* Drawer Tabs & Metrics */}
            <div className="h-8 bg-slate-100 border-b border-slate-200 px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveBottomTab('circuit')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded transition-colors ${activeBottomTab === 'circuit' ? 'bg-white text-blue-700 border border-slate-300 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <Zap className="w-3 h-3 text-amber-600" />
                  <span>Continuous Circuit (fold=-1)</span>
                </button>

                <button 
                  onClick={() => setActiveBottomTab('results')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded transition-colors ${activeBottomTab === 'results' ? 'bg-white text-blue-700 border border-slate-300 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <Activity className="w-3 h-3 text-emerald-600" />
                  <span>Simulation Results & Metrics</span>
                </button>

                <button 
                  onClick={() => setActiveBottomTab('terminal')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded transition-colors ${activeBottomTab === 'terminal' ? 'bg-white text-blue-700 border border-slate-300 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <TerminalIcon className="w-3 h-3 text-slate-600" />
                  <span>Solver Terminal</span>
                </button>
              </div>

              {/* Circuit Telemetry */}
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600">
                <span>Active Qubits: <b className="text-slate-900">4</b></span>
                <span>Depth: <b className="text-slate-900">6</b></span>
                <span>CNOTs: <b className="text-slate-900">3</b></span>
                <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[9px] font-bold">Block E</span>
              </div>
            </div>

            {/* Bottom Panel Content View */}
            <div className="flex-1 overflow-x-auto overflow-y-auto p-3 font-mono text-xs text-slate-900 bg-white">
              
              {activeBottomTab === 'circuit' && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold mb-1">
                    Continuous Horizontal Circuit Canvas (Zero vertical wrapping — scroll horizontally):
                  </div>
                  <pre className="text-slate-900 font-mono text-[11px] font-semibold leading-tight select-text">
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
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-600 uppercase">Expectation Value</div>
                    <div className="text-xl font-bold text-blue-700 font-mono">-0.4125 Ha</div>
                    <div className="text-[10px] text-slate-600 font-medium">Target: Z ⊗ I ⊗ I ⊗ I</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-600 uppercase">Simulator Fidelity</div>
                    <div className="text-xl font-bold text-emerald-700 font-mono">99.82%</div>
                    <div className="text-[10px] text-slate-600 font-medium">Statevector exact match</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-600 uppercase">Execution Latency</div>
                    <div className="text-xl font-bold text-amber-700 font-mono">0.14s</div>
                    <div className="text-[10px] text-slate-600 font-medium">Aer C++ Statevector backend</div>
                  </div>
                </div>
              )}

              {activeBottomTab === 'terminal' && (
                <div className="space-y-1 text-slate-900 font-mono text-xs">
                  <div className="text-emerald-700 font-bold">➜ python3 main.py</div>
                  <div className="text-slate-800">⚛️ Initializing Quantum Circuit on AerSimulator...</div>
                  <div className="text-slate-900 font-bold">✅ Simulation Complete. Expectation &lt;Z_0&gt;: -0.4125</div>
                  <div className="text-slate-500">Process finished with exit code 0 (0.142s)</div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────── */}
        {/* BLOCK D: RIGHT AGENTIC QUANTUM COPILOT                  */}
        {/* ─────────────────────────────────────────────────────── */}
        <aside className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0">
          
          {/* Copilot Header */}
          <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-100/60">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-900 font-heading">Quantum Copilot</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">Live</span>
              <span className="text-[9px] font-mono bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">Block D</span>
            </div>
          </div>

          {/* Conversation Stream & Tool Execution Cards */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            
            {chatMessages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                {msg.sender === 'user' ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-slate-900 shadow-2xs font-medium">
                    <div className="text-[10px] font-bold text-slate-500 mb-1">You</div>
                    <div>{msg.text}</div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 text-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1 font-heading">
                        <Sparkles className="w-3 h-3" /> Quantum Guru Copilot
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 font-semibold">{activeModel === 'groq' ? 'Groq (118ms)' : 'RunPod (240ms)'}</span>
                    </div>

                    <p className="leading-relaxed text-slate-800">
                      {msg.text}
                    </p>

                    {/* Invoked Tool Badge if present */}
                    {msg.toolCall && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-900 flex items-center gap-1 font-heading">
                            <Check className="w-3 h-3 text-emerald-600" /> {msg.toolCall.name}
                          </span>
                          <span className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-bold text-[9px]">{msg.toolCall.badge}</span>
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono">
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
          <div className="p-3 border-t border-slate-200 bg-white space-y-2">
            
            {/* Interactive Slash Command Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono text-slate-700 font-bold">
              <button 
                onClick={() => handleSendMessage('/execute@program')}
                className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors shrink-0 flex items-center gap-1"
              >
                <Play className="w-2.5 h-2.5 fill-current" /> /execute@program
              </button>
              <button 
                onClick={() => handleSendMessage('/simulate@circuit')}
                className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 cursor-pointer transition-colors shrink-0 flex items-center gap-1"
              >
                <Zap className="w-2.5 h-2.5" /> /simulate@circuit
              </button>
              <button 
                onClick={() => handleSendMessage('/transpile@level2')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer transition-colors shrink-0"
              >
                /transpile@level2
              </button>
            </div>

            {/* Input form */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg p-1.5 focus-within:border-blue-500 focus-within:bg-white transition-all shadow-2xs">
              <input 
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                placeholder="Ask Copilot or try /execute@program..."
                className="flex-1 bg-transparent border-none outline-hidden text-xs text-slate-900 font-medium placeholder:text-slate-400 px-1 font-sans"
              />
              <button 
                onClick={() => handleSendMessage()}
                className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </aside>

      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* BLOCK F: BOTTOM GLOBAL STATUS BAR                         */}
      {/* ───────────────────────────────────────────────────────── */}
      <footer className="h-6 bg-slate-100 border-t border-slate-200 px-3 flex items-center justify-between text-[10px] font-mono text-slate-600 shrink-0 z-20 font-medium">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-slate-800 font-bold">
            <GitBranch className="w-3 h-3 text-blue-600" /> feature/quantum-cursor-ide
          </span>
          <span>Workspace: <b className="text-slate-800">Ready</b></span>
          <span>Target QPU: <b className="text-emerald-700">{targetBackend}</b></span>
          <span>AI Engine: <b className="text-blue-700">{activeModel === 'groq' ? 'Groq (Llama-3.3)' : 'RunPod (Qwen-27B)'}</b></span>
        </div>

        <div className="flex items-center gap-4">
          <span>Active File: <b className="text-slate-800">{activeFile}</b></span>
          <span>Optimization: <b className="text-slate-800">Level {optimizationLevel}</b></span>
          <span className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded text-[8px] font-bold">Block F (Status Bar)</span>
        </div>
      </footer>

    </div>
  );
}
