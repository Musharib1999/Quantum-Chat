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
  GitBranch,
  History,
  Brain,
  FileDiff,
  Database
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
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [memoryLedger, setMemoryLedger] = useState<any>(null);
  const [isToolPaletteOpen, setIsToolPaletteOpen] = useState(false);
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [selectedStudioFilter, setSelectedStudioFilter] = useState<string>('all');

  // The 33 Quantum AI Tools Registry for the Connect Palette
  const allQuantumTools = [
    // 1. Optimization Studio (6)
    { id: 1, studio: 'Optimization', name: 'Problem Formulator', tag: 'tools.opt.formulate_problem', desc: 'Extracts decision variables, bounds & constraint equations from natural language specifications.', nature: 'Deterministic' },
    { id: 2, studio: 'Optimization', name: 'QUBO Matrix Synthesizer', tag: 'tools.opt.translate_to_qubo', desc: 'Converts constrained optimization models into binary quadratic forms (Q-matrix) via Lagrange multipliers.', nature: 'Deterministic' },
    { id: 3, studio: 'Optimization', name: 'Ising Hamiltonian Mapper', tag: 'tools.opt.map_quantum_solver', desc: 'Maps QUBO matrices to Pauli-Z Ising Spin Hamiltonians for QAOA or D-Wave BQM graph embeddings.', nature: 'Deterministic' },
    { id: 4, studio: 'Optimization', name: 'QAOA & Annealing Solver', tag: 'tools.opt.execute_solver', desc: 'Executes QAOA parameter optimization or D-Wave Simulated Annealing for lowest energy samples.', nature: 'Probabilistic' },
    { id: 5, studio: 'Optimization', name: 'Bitstring Solution Decoder', tag: 'tools.opt.decode_solution', desc: 'Decodes measured binary bitstrings into business decisions and validates constraint feasibility.', nature: 'Deterministic' },
    { id: 6, studio: 'Optimization', name: 'Optimization Benchmarker', tag: 'tools.opt.benchmark_classical', desc: 'Evaluates quantum optimization performance against exact classical solvers (PuLP, Gurobi, SimAn).', nature: 'Deterministic' },

    // 2. Quantum Academy (5)
    { id: 7, studio: 'Academy', name: 'Concept Decomposer', tag: 'tools.academy.concept_explainer', desc: 'Decomposes deep quantum mechanics concepts using physical and computational analogies.', nature: 'Deterministic' },
    { id: 8, studio: 'Academy', name: 'Dirac Proof Engine', tag: 'tools.academy.math_derivation', desc: 'Generates step-by-step mathematical proofs, Dirac bra-ket equations, and matrix Kronecker products.', nature: 'Deterministic' },
    { id: 9, studio: 'Academy', name: 'Tutorial Circuit Builder', tag: 'tools.academy.generate_tutorial_circuit', desc: 'Synthesizes educational starter circuits (Bell State, Teleportation) with state evolution checkpoints.', nature: 'Deterministic' },
    { id: 10, studio: 'Academy', name: 'Socratic Diagnostic', tag: 'tools.academy.socratic_assessment', desc: 'Generates adaptive diagnostic questions and multi-choice quizzes to verify student comprehension.', nature: 'Deterministic' },
    { id: 11, studio: 'Academy', name: 'Misconception Debugger', tag: 'tools.academy.misconception_debugger', desc: 'Analyzes student code or statements to detect and clarify fundamental quantum physics misunderstandings.', nature: 'Deterministic' },

    // 3. Quantum Algorithms (5)
    { id: 12, studio: 'Algorithms', name: 'Algorithm Classifier', tag: 'tools.algo.classify_algorithm', desc: 'Classifies computational tasks into optimal quantum algorithm families (Grover, Shor, QPE, HHL).', nature: 'Deterministic' },
    { id: 13, studio: 'Algorithms', name: 'Phase Oracle Synthesizer', tag: 'tools.algo.synthesize_oracle', desc: 'Constructs unitary phase or boolean quantum oracles for targeted marked search states.', nature: 'Deterministic' },
    { id: 14, studio: 'Algorithms', name: 'Grover Diffusion Architect', tag: 'tools.algo.build_diffusion_operator', desc: 'Builds Grover diffusion operators and computes optimal iteration count (pi/4 * sqrt(N)).', nature: 'Deterministic' },
    { id: 15, studio: 'Algorithms', name: 'Statevector Amplitude Analyzer', tag: 'tools.algo.simulate_statevector', desc: 'Computes exact statevector evolution, amplitude amplification tracking, and probability distributions.', nature: 'Deterministic' },
    { id: 16, studio: 'Algorithms', name: 'Quantum Advantage Evaluator', tag: 'tools.algo.analyze_quantum_speedup', desc: 'Calculates runtime crossover thresholds where quantum algorithms outperform classical baselines.', nature: 'Deterministic' },

    // 4. Quantum Circuits (5)
    { id: 17, studio: 'Circuit', name: 'Quantum Register Builder', tag: 'tools.circuit.build_quantum_circuit', desc: 'Instantiates base quantum/classical registers and appends single and multi-qubit gate operations.', nature: 'Deterministic' },
    { id: 18, studio: 'Circuit', name: 'Variational Parameter Binder', tag: 'tools.circuit.bind_parameters', desc: 'Declares symbolic variational parameter vectors and binds continuous numerical floating-point values.', nature: 'Deterministic' },
    { id: 19, studio: 'Circuit', name: 'Transpiler Pass Optimizer', tag: 'tools.circuit.transpile_passes', desc: 'Runs compiler optimization passes (Level 0-3) for 2-qubit CNOT depth and gate reduction.', nature: 'Deterministic' },
    { id: 20, studio: 'Circuit', name: 'Decoherence Noise Simulator', tag: 'tools.circuit.simulate_noisy', desc: 'Emulates real hardware decoherence by injecting thermal relaxation (T1, T2) and depolarizing error.', nature: 'Probabilistic' },
    { id: 21, studio: 'Circuit', name: 'Continuous Circuit Drawer', tag: 'tools.circuit.render_continuous', desc: 'Generates a continuous horizontal ASCII/Unicode circuit diagram without vertical line-wrapping.', nature: 'Deterministic' },

    // 5. Quantum Chemistry (6)
    { id: 22, studio: 'Chemistry', name: 'Molecular Geometry Ingester', tag: 'tools.chem.ingest_geometry', desc: 'Ingests molecular coordinates (XYZ / SMILES), charge, spin multiplicity, and selects basis sets.', nature: 'Deterministic' },
    { id: 23, studio: 'Chemistry', name: 'Hartree-Fock Integral Engine', tag: 'tools.chem.compute_scf_integrals', desc: 'Solves Hartree-Fock (SCF) to compute 1-electron (hpq) and 2-electron (hpqrs) molecular orbital tensors.', nature: 'Deterministic' },
    { id: 24, studio: 'Chemistry', name: 'CASCI Active Space Reducer', tag: 'tools.chem.select_active_space', desc: 'Performs Complete Active Space (CASCI) orbital reduction, pruning inactive core/virtual orbitals.', nature: 'Deterministic' },
    { id: 25, studio: 'Chemistry', name: 'Fermion-to-Pauli Mapper', tag: 'tools.chem.fermion_to_qubit_mapping', desc: 'Converts second-quantized fermionic creation/annihilation operators into Pauli strings via Jordan-Wigner.', nature: 'Deterministic' },
    { id: 26, studio: 'Chemistry', name: 'Chemistry Ansatz Synthesizer', tag: 'tools.chem.build_chemistry_ansatz', desc: 'Synthesizes UCCSD or Hardware-Efficient chemistry ansatz circuits preserving particle-number symmetry.', nature: 'Deterministic' },
    { id: 27, studio: 'Chemistry', name: 'VQE Ground State Solver', tag: 'tools.chem.solve_ground_state_vqe', desc: 'Minimizes ground state energy via VQE parameter optimization within chemical accuracy (<1.6 mHa).', nature: 'Probabilistic' },

    // 6. Quantum Machine Learning (6)
    { id: 28, studio: 'QML', name: 'Bloch Phase Normalizer', tag: 'tools.qml.normalize_features', desc: 'Applies PCA dimensionality reduction and maps continuous features to [0, pi] phase space.', nature: 'Deterministic' },
    { id: 29, studio: 'QML', name: 'Feature Map Generator', tag: 'tools.qml.build_feature_map', desc: 'Constructs quantum Hilbert space embedding circuits (ZZFeatureMap, PauliFeatureMap) with entanglement.', nature: 'Deterministic' },
    { id: 30, studio: 'QML', name: 'Variational QML Architect', tag: 'tools.qml.build_variational_ansatz', desc: 'Constructs parameterized variational ansatz layers (RealAmplitudes, EfficientSU2) with tunable rotation gates.', nature: 'Deterministic' },
    { id: 31, studio: 'QML', name: 'Quantum Kernel & VQC Trainer', tag: 'tools.qml.train_classifier', desc: 'Computes Quantum Kernel Gram Matrix for QSVM or trains VQC variational weights via COBYLA.', nature: 'Deterministic / Probabilistic' },
    { id: 32, studio: 'QML', name: 'Dual Q-Classical Benchmarker', tag: 'tools.qml.benchmark_classical', desc: 'Benchmarks QSVM & VQC accuracy against classical baselines (Logistic Regression, Random Forest, SVM-RBF).', nature: 'Deterministic' },
    { id: 33, studio: 'QML', name: 'Quantum Sample Predictor', tag: 'tools.qml.predict_sample', desc: 'Evaluates live single-sample queries and computes confidence scores side-by-side with classical models.', nature: 'Deterministic' },
  ];
  const [projectName, setProjectName] = useState('my-quantum-project');
  const [targetBackend, setTargetBackend] = useState('aer_simulator');
  const [optimizationLevel, setOptimizationLevel] = useState<number>(2);
  const [shots, setShots] = useState<number>(1024);
  const [errorMitigation, setErrorMitigation] = useState(true);
  const [copilotInput, setCopilotInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  // Section 1 (Left Sidebar) state: Open/Closed & Width (20% default ratio)
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(288); // 20% of 1440px
  const isLeftDragging = useRef(false);

  // Section 3 (Right Sidebar) state: Open/Closed & Width (40% default ratio)
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [rightWidth, setRightWidth] = useState(576); // 40% of 1440px
  const isRightDragging = useRef(false);

  // Configure initial 20% (Left) / 40% (Center) / 40% (Right) Ratio based on viewport
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      setLeftWidth(Math.round(w * 0.20));
      setRightWidth(Math.round(w * 0.40));
    }
    fetchProjectMemory();
  }, [projectName]);

  const fetchProjectMemory = async () => {
    try {
      const res = await fetch(`http://localhost:8002/v3/enterprise/ide/memory/${projectName}`);
      if (res.ok) {
        const data = await res.json();
        setMemoryLedger(data.ledger);
      }
    } catch (e) {
      console.error('Error fetching project memory:', e);
    }
  };

  const isDark = theme === 'dark';

  // ─────────────────────────────────────────────────────────────
  // 🎯 4 CLEAR SEMANTIC TEXT ROLES (DARK & LIGHT THEMES)
  // 1. textPrimary:  Crisp White / Deep Charcoal (#FFFFFF / #0F172A)
  // 2. textMuted:    Secondary Meta (#94A3B8 / #64748B)
  // 3. textCyan:     Titles & Section Headers (#38BDF8 / #0284C7)
  // 4. textEmerald:  Success, Status & Badges (#34D399 / #059669)
  // 5. textAmber:    Commands, Triggers & Prompts (#FBBF24 / #D97706)
  // 6. textSkyBlue:  Physics Values & Metrics (#60A5FA / #2563EB)
  // ─────────────────────────────────────────────────────────────
  const colors = {
    bgMain: isDark ? '#0D0D0D' : '#FAFAFA',
    bgHeader: isDark ? '#141414' : '#FFFFFF',
    bgSidebar: isDark ? '#101010' : '#FAFAFA',
    bgCard: isDark ? '#181818' : '#FFFFFF',
    bgEditor: isDark ? '#0D0D0D' : '#FFFFFF',
    bgInput: isDark ? '#141414' : '#F5F5F5',
    bgPill: isDark ? '#222222' : '#F0F0F0',
    border: isDark ? '#262626' : '#E5E5E5',
    borderSubtle: isDark ? '#1A1A1A' : '#F5F5F5',
    
    // Semantic Text Roles
    textPrimary: isDark ? '#FFFFFF' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    textCyan: isDark ? '#38BDF8' : '#0284C7',
    textEmerald: isDark ? '#34D399' : '#059669',
    textAmber: isDark ? '#FBBF24' : '#D97706',
    textSkyBlue: isDark ? '#60A5FA' : '#2563EB',
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
        'MEMORY.md': {
          name: 'MEMORY.md',
          lang: 'markdown',
          content: `# 🧠 Project Memory & Audit Ledger: my-quantum-project\n\n## Turn #1 — CNOT Depth Optimization\n- **User Prompt**: "Optimize the 2-qubit CNOT depth for the active circuit in main.py and explain the reduction."\n- **LLM Reasoning**: Inspected 4-qubit parameterized ansatz. Applied CommutativeCancellation & ConsolidateBlocks (Level 2).\n- **Agent Called**: Quantum Guru Transpiler Agent\n- **Tools Invoked**:\n  - [#19] tools.circuit.transpile_passes (Level 2) -> Depth: 6 to 4 (-33% Depth, 14.2ms)\n- **Code Changes Proposed**:\n  - [MODIFY] main.py (L12-16) -> Optimized commutative cancellation block\n- **Quantum State**:\n  - Target QPU: aer_simulator | Active Qubits: 4 | Depth: 4 | Fidelity: 99.82%`
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
        },
        'MEMORY.md': {
          name: 'MEMORY.md',
          lang: 'markdown',
          content: `# 🧠 Project Memory & Audit Ledger: portfolio-optimization\n\n## Turn #1 — QUBO Formulation\n- **User Prompt**: "Formulate 4-asset portfolio optimization into QUBO matrix."\n- **Agent Called**: Quantum Guru Optimization Agent\n- **Tools Invoked**: [#01] tools.opt.formulate_problem, [#02] tools.opt.translate_to_qubo`
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
        {/* Left: Brand & Project Breadcrumb */}
        <div className="flex items-center gap-2.5">
          {!isLeftOpen && (
            <button
              onClick={() => setIsLeftOpen(true)}
              title="Show Explorer Sidebar"
              style={{ 
                backgroundColor: colors.bgPill,
                borderColor: colors.border,
                color: colors.textCyan 
              }}
              className="p-1.5 rounded-md border transition-colors cursor-pointer hover:border-slate-400 mr-0.5"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center p-0.5 shrink-0 shadow-xs">
              <img 
                src="/qg-icon.png" 
                alt="Quantum Guru Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-extrabold text-sm tracking-tight font-heading" style={{ color: colors.textPrimary }}>
              Quantum Guru
            </span>
            <span 
              style={{ 
                backgroundColor: colors.bgPill, 
                borderColor: colors.border,
                color: colors.textCyan 
              }}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider"
            >
              IDE
            </span>
          </div>

          <div style={{ backgroundColor: colors.border }} className="h-4 w-px mx-1" />

          {/* Project Breadcrumb */}
          <div 
            style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors font-medium"
          >
            <Folder className="w-3.5 h-3.5" style={{ color: colors.textCyan }} />
            <span className="font-mono font-bold" style={{ color: colors.textPrimary }}>{projectName}</span>
            <ChevronDown className="w-3 h-3 ml-1" style={{ color: colors.textMuted }} />
          </div>
        </div>

        {/* Right: Project Memory & Audit Trail, Theme Switcher & Section 3 Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setIsMemoryOpen(true); fetchProjectMemory(); }}
            title="Open Project Memory & Audit Trail"
            style={{ 
              backgroundColor: colors.bgPill, 
              borderColor: colors.border,
              color: colors.textCyan
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors cursor-pointer text-xs font-bold hover:border-sky-500"
          >
            <Brain className="w-3.5 h-3.5" style={{ color: colors.textCyan }} />
            <span>Memory ({memoryLedger?.total_turns || 1})</span>
          </button>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
            style={{ 
              backgroundColor: colors.bgPill, 
              borderColor: colors.border,
              color: colors.textAmber
            }}
            className="p-1.5 rounded-md border transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsRightOpen(!isRightOpen)}
            title={isRightOpen ? "Hide Copilot" : "Show Copilot"}
            style={{ 
              backgroundColor: isRightOpen ? colors.bgPill : 'transparent',
              borderColor: colors.border,
              color: colors.textCyan 
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
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsSettingsOpen(false); }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in duration-150"
        >
          <div 
            style={{ backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }}
            className="border rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="px-5 py-3.5 border-b flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-bold font-heading" style={{ color: colors.textCyan }}>Quantum Environment Settings</h3>
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
                <div className="text-xs font-bold uppercase tracking-wider font-heading" style={{ color: colors.textCyan }}>
                  Theme Appearance
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setTheme('dark')}
                    style={{ 
                      backgroundColor: isDark ? colors.bgPill : 'transparent',
                      borderColor: isDark ? colors.textCyan : colors.border,
                      color: colors.textPrimary
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <Moon className="w-4 h-4" style={{ color: colors.textAmber }} />
                      <span>Dark Theme</span>
                    </div>
                    {isDark && <Check className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />}
                  </div>

                  <div 
                    onClick={() => setTheme('light')}
                    style={{ 
                      backgroundColor: !isDark ? colors.bgPill : 'transparent',
                      borderColor: !isDark ? colors.textCyan : colors.border,
                      color: colors.textPrimary
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <Sun className="w-4 h-4" style={{ color: colors.textAmber }} />
                      <span>Light Theme</span>
                    </div>
                    {!isDark && <Check className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />}
                  </div>
                </div>
              </div>

              {/* AI Copilot Model */}
              <div style={{ borderColor: colors.border }} className="space-y-2.5 pt-2 border-t">
                <div className="text-xs font-bold uppercase tracking-wider font-heading" style={{ color: colors.textCyan }}>
                  AI Copilot Inference Engine
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setActiveModel('groq')}
                    style={{ 
                      backgroundColor: activeModel === 'groq' ? colors.bgPill : 'transparent',
                      borderColor: activeModel === 'groq' ? colors.textCyan : colors.border,
                      color: colors.textPrimary
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold" style={{ color: colors.textAmber }}>Groq (Llama-3.3)</span>
                      {activeModel === 'groq' && <Check className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />}
                    </div>
                    <p style={{ color: colors.textMuted }} className="text-[11px] leading-relaxed">
                      Ultra-low latency streaming (~120ms), instant AST code edits, and rapid tool execution.
                    </p>
                  </div>

                  <div 
                    onClick={() => setActiveModel('runpod')}
                    style={{ 
                      backgroundColor: activeModel === 'runpod' ? colors.bgPill : 'transparent',
                      borderColor: activeModel === 'runpod' ? colors.textCyan : colors.border,
                      color: colors.textPrimary
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold" style={{ color: colors.textAmber }}>RunPod (Qwen-27B)</span>
                      {activeModel === 'runpod' && <Check className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />}
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
                  <div className="text-xs font-bold uppercase tracking-wider font-heading" style={{ color: colors.textCyan }}>
                    Target Execution Backend
                  </div>
                  <span 
                    style={{ 
                      backgroundColor: colors.bgPill, 
                      color: colors.textSkyBlue,
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
                        borderColor: targetBackend === b.id ? colors.textCyan : colors.border,
                        color: colors.textPrimary
                      }}
                      className="p-2.5 rounded-lg border text-center cursor-pointer transition-all"
                    >
                      <div className="text-xs font-bold" style={{ color: targetBackend === b.id ? colors.textCyan : colors.textPrimary }}>{b.label}</div>
                      <div className="text-[9px] font-sans mt-0.5" style={{ color: colors.textMuted }}>{b.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transpiler */}
              <div style={{ borderColor: colors.border }} className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider font-heading" style={{ color: colors.textCyan }}>
                    Compiler Optimization Level
                  </div>
                  <span 
                    style={{ 
                      backgroundColor: colors.bgPill, 
                      color: colors.textAmber, 
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
                        borderColor: optimizationLevel === lvl ? colors.textAmber : colors.border,
                        color: optimizationLevel === lvl ? colors.textAmber : colors.textPrimary
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
                style={{ backgroundColor: colors.bgPill, color: colors.textCyan, borderColor: colors.border }}
                className="px-4 py-1.5 font-bold text-xs rounded-lg border transition-opacity hover:opacity-80 cursor-pointer"
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
            {/* Start New Project Action Button Row with Left Sidebar Toggle */}
            <div style={{ backgroundColor: colors.bgSidebar, borderColor: colors.border }} className="p-2 border-b flex items-center gap-1.5">
              <button
                onClick={() => setIsLeftOpen(false)}
                title="Hide Explorer Sidebar"
                style={{ 
                  backgroundColor: colors.bgPill,
                  borderColor: colors.border,
                  color: colors.textCyan 
                }}
                className="p-1.5 rounded-md border transition-colors cursor-pointer hover:border-slate-400 shrink-0 flex items-center justify-center"
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsNewProjectOpen(true)}
                style={{ 
                  backgroundColor: colors.bgPill, 
                  borderColor: colors.border,
                  color: colors.textAmber 
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-bold transition-all shadow-2xs cursor-pointer group hover:border-slate-400"
              >
                <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" style={{ color: colors.textAmber }} />
                <span>Start New Project</span>
              </button>
            </div>

            {/* Project File Tree */}
            <div className="p-2 space-y-0.5 text-xs flex-1 overflow-y-auto font-mono">
              <div className="flex items-center gap-1.5 px-2 py-1 font-bold tracking-wider uppercase font-heading text-[11px]" style={{ color: colors.textCyan }}>
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
                  <FileCode className="w-3.5 h-3.5" style={{ color: activeFile === fName ? colors.textCyan : colors.textMuted }} />
                  <span className="truncate font-semibold">{fName}</span>
                </div>
              ))}

              <div className="pt-4 px-2">
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2 font-heading" style={{ color: colors.textCyan }}>
                  Active Quantum Sub-Engines
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md border shadow-2xs font-medium"
                  >
                    <span style={{ color: colors.textPrimary }}>Optimization</span>
                    <span style={{ backgroundColor: colors.bgPill, color: colors.textEmerald }} className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">READY</span>
                  </div>
                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md border shadow-2xs font-medium"
                  >
                    <span style={{ color: colors.textPrimary }}>Chemistry CAS</span>
                    <span style={{ backgroundColor: colors.bgPill, color: colors.textEmerald }} className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">READY</span>
                  </div>
                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md border shadow-2xs font-medium"
                  >
                    <span style={{ color: colors.textPrimary }}>QML Engine</span>
                    <span style={{ backgroundColor: colors.bgPill, color: colors.textEmerald }} className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">READY</span>
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
                    color: colors.textAmber, 
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
                  style={{ backgroundColor: colors.bgPill, color: colors.textCyan }}
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
            className="w-1.5 hover:w-2 bg-transparent hover:bg-sky-500/30 active:bg-sky-500 cursor-col-resize z-30 transition-all shrink-0 flex items-center justify-center -ml-0.5 group"
            title="Drag to resize Section 1 width"
          >
            <div style={{ backgroundColor: colors.border }} className="w-0.5 h-6 rounded group-hover:bg-sky-500" />
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
                    color: activeBottomTab === 'circuit' ? colors.textCyan : colors.textMuted
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded border transition-colors cursor-pointer"
                >
                  <Zap className="w-3 h-3" style={{ color: colors.textCyan }} />
                  <span>Continuous Circuit (fold=-1)</span>
                </button>

                <button 
                  onClick={() => setActiveBottomTab('results')}
                  style={{ 
                    backgroundColor: activeBottomTab === 'results' ? colors.bgPill : 'transparent',
                    borderColor: activeBottomTab === 'results' ? colors.border : 'transparent',
                    color: activeBottomTab === 'results' ? colors.textCyan : colors.textMuted
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
                    color: activeBottomTab === 'terminal' ? colors.textAmber : colors.textMuted
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded border transition-colors cursor-pointer"
                >
                  <TerminalIcon className="w-3 h-3" style={{ color: colors.textAmber }} />
                  <span>Solver Terminal</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: colors.textMuted }}>
                <span>Active Qubits: <b style={{ color: colors.textSkyBlue }}>4</b></span>
                <span>Depth: <b style={{ color: colors.textSkyBlue }}>6</b></span>
                <span>CNOTs: <b style={{ color: colors.textSkyBlue }}>3</b></span>
              </div>
            </div>

            {/* Bottom Content View */}
            <div 
              style={{ backgroundColor: colors.bgEditor, color: colors.textPrimary }}
              className="flex-1 overflow-x-auto overflow-y-auto p-3 font-mono text-xs"
            >
              {activeBottomTab === 'circuit' && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold mb-1" style={{ color: colors.textCyan }}>
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
                    <div className="text-[10px] font-bold uppercase" style={{ color: colors.textCyan }}>Expectation Value</div>
                    <div className="text-xl font-bold font-mono" style={{ color: colors.textSkyBlue }}>-0.4125 Ha</div>
                    <div className="text-[10px] font-medium" style={{ color: colors.textMuted }}>Target: Z ⊗ I ⊗ I ⊗ I</div>
                  </div>
                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="border rounded-lg p-3 space-y-1 shadow-2xs"
                  >
                    <div className="text-[10px] font-bold uppercase" style={{ color: colors.textCyan }}>Simulator Fidelity</div>
                    <div className="text-xl font-bold font-mono" style={{ color: colors.textEmerald }}>99.82%</div>
                    <div className="text-[10px] font-medium" style={{ color: colors.textMuted }}>Statevector exact match</div>
                  </div>
                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="border rounded-lg p-3 space-y-1 shadow-2xs"
                  >
                    <div className="text-[10px] font-bold uppercase" style={{ color: colors.textCyan }}>Execution Latency</div>
                    <div className="text-xl font-bold font-mono" style={{ color: colors.textAmber }}>0.14s</div>
                    <div className="text-[10px] font-medium" style={{ color: colors.textMuted }}>Aer C++ Statevector backend</div>
                  </div>
                </div>
              )}

              {activeBottomTab === 'terminal' && (
                <div className="space-y-1 font-mono text-xs">
                  <div className="font-bold" style={{ color: colors.textAmber }}>➜ python3 main.py</div>
                  <div style={{ color: colors.textMuted }}>Initializing Quantum Circuit on AerSimulator...</div>
                  <div className="font-bold" style={{ color: colors.textPrimary }}>Simulation Complete. Expectation &lt;Z_0&gt;: <span style={{ color: colors.textSkyBlue }}>-0.4125</span></div>
                  <div style={{ color: colors.textEmerald }}>Process finished with <span className="font-bold">exit code 0</span> (<span style={{ color: colors.textAmber }}>0.142s</span>)</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── DRAGGABLE RESIZER FOR SECTION 3 (RIGHT) ── */}
        {isRightOpen && (
          <div 
            onMouseDown={handleRightMouseDown}
            className="w-1.5 hover:w-2 bg-transparent hover:bg-sky-500/30 active:bg-sky-500 cursor-col-resize z-30 transition-all shrink-0 flex items-center justify-center -mr-0.5 group"
            title="Drag to resize Section 3 width"
          >
            <div style={{ backgroundColor: colors.border }} className="w-0.5 h-6 rounded group-hover:bg-sky-500" />
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
                      <div className="text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: colors.textCyan }}>You</div>
                      <div style={{ color: colors.textPrimary }}>{msg.text}</div>
                    </div>
                  ) : (
                    <div 
                      style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                      className="border rounded-xl p-3 space-y-2 shadow-2xs"
                    >
                      <div style={{ borderColor: colors.border }} className="flex items-center justify-between border-b pb-1.5">
                        <span className="text-[10px] font-bold flex items-center gap-1 font-heading uppercase tracking-wider" style={{ color: colors.textCyan }}>
                          <Sparkles className="w-3 h-3" /> Quantum Guru Copilot
                        </span>
                        <span className="text-[9px] font-mono font-semibold" style={{ color: colors.textMuted }}>
                          {activeModel === 'groq' ? 'Groq (118ms)' : 'RunPod (240ms)'}
                        </span>
                      </div>

                      <p className="leading-relaxed font-medium" style={{ color: colors.textPrimary }}>
                        {msg.text}
                      </p>

                      {msg.toolCall && (
                        <div 
                          style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
                          className="border rounded-lg p-2.5 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold flex items-center gap-1 font-heading" style={{ color: colors.textPrimary }}>
                              <Check className="w-3 h-3" style={{ color: colors.textEmerald }} /> {msg.toolCall.name}
                            </span>
                            <span 
                              style={{ 
                                backgroundColor: colors.bgCard, 
                                borderColor: colors.border,
                                color: colors.textEmerald 
                              }}
                              className="font-mono px-1.5 py-0.5 rounded font-bold text-[9px] border"
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
              {/* Interactive Slash Command Chips with Semantic Colors */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono font-bold">
                <button 
                  onClick={() => handleSendMessage('/execute@program')}
                  style={{ 
                    backgroundColor: colors.bgPill, 
                    borderColor: colors.border,
                    color: colors.textAmber 
                  }}
                  className="px-2 py-0.5 rounded border cursor-pointer transition-colors shrink-0 flex items-center gap-1 hover:border-amber-400"
                >
                  <Play className="w-2.5 h-2.5 fill-current" style={{ color: colors.textAmber }} /> /execute@program
                </button>
                <button 
                  onClick={() => handleSendMessage('/simulate@circuit')}
                  style={{ 
                    backgroundColor: colors.bgPill, 
                    borderColor: colors.border,
                    color: colors.textCyan 
                  }}
                  className="px-2 py-0.5 rounded border cursor-pointer transition-colors shrink-0 flex items-center gap-1 hover:border-sky-400"
                >
                  <Zap className="w-2.5 h-2.5" style={{ color: colors.textCyan }} /> /simulate@circuit
                </button>
                <button 
                  onClick={() => handleSendMessage('/transpile@level2')}
                  style={{ 
                    backgroundColor: colors.bgPill, 
                    borderColor: colors.border,
                    color: colors.textEmerald 
                  }}
                  className="px-2 py-0.5 rounded border cursor-pointer transition-colors shrink-0 hover:border-emerald-400"
                >
                  /transpile@level2
                </button>
              </div>

              {/* Input form with Dedicated '+' Tool Connect Action */}
              <div 
                style={{ backgroundColor: colors.bgInput, borderColor: colors.border }}
                className="flex flex-col justify-between border rounded-xl p-2.5 transition-all shadow-2xs focus-within:border-sky-500 min-h-[76px]"
              >
                <textarea 
                  rows={2}
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter' && !e.shiftKey) { 
                      e.preventDefault(); 
                      handleSendMessage(); 
                    } 
                  }}
                  placeholder="Ask Copilot, describe a quantum algorithm, or connect a tool with '+'..."
                  style={{ color: colors.textPrimary }}
                  className="w-full bg-transparent border-none outline-hidden text-xs font-medium font-sans resize-none placeholder:opacity-40 leading-relaxed"
                />
                
                <div className="flex items-center justify-between pt-1">
                  {/* Left: Plus Button (Opens Vertical Scrollable Modal) */}
                  <button 
                    onClick={() => setIsToolPaletteOpen(true)}
                    title="Open 33 Quantum Tools Modal"
                    style={{ 
                      backgroundColor: colors.bgPill, 
                      color: colors.textCyan, 
                      borderColor: colors.border 
                    }}
                    className="px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all hover:border-sky-500 shadow-2xs cursor-pointer border text-[11px] font-bold group"
                  >
                    <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" style={{ color: colors.textAmber }} />
                    <span>Connect Tool</span>
                  </button>

                  {/* Right: Send Button */}
                  <button 
                    onClick={() => handleSendMessage()}
                    style={{ backgroundColor: colors.bgPill, color: colors.textCyan, borderColor: colors.border }}
                    className="px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-opacity hover:opacity-80 shadow-2xs cursor-pointer border text-[11px] font-bold"
                  >
                    <span>Send</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        ) : null}

      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* BLOCK F: BOTTOM GLOBAL STATUS BAR (CLEAN & INTERACTIVE)   */}
      {/* ───────────────────────────────────────────────────────── */}
      <footer 
        style={{ backgroundColor: colors.bgHeader, borderColor: colors.border, color: colors.textMuted }}
        className="h-6 border-t px-3 flex items-center justify-between text-[10px] font-mono shrink-0 z-20 font-medium"
      >
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 font-bold" style={{ color: colors.textCyan }}>
            <GitBranch className="w-3 h-3" style={{ color: colors.textMuted }} /> feature/quantum-cursor-ide
          </span>
          
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>Workspace: <b style={{ color: colors.textEmerald }}>Ready</b></span>
          </span>

          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Click to configure Target QPU in Settings"
            className="hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1"
          >
            <span>Target QPU: <b className="underline decoration-dotted underline-offset-2" style={{ color: colors.textSkyBlue }}>{targetBackend}</b></span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Click to switch AI Engine in Settings"
            className="hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1"
          >
            <span>AI Engine: <b className="underline decoration-dotted underline-offset-2" style={{ color: colors.textAmber }}>{activeModel === 'groq' ? 'Groq (Llama-3.3)' : 'RunPod (Qwen-27B)'}</b></span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span>Active File: <b style={{ color: colors.textPrimary }}>{activeFile}</b></span>
          
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title="Click to toggle Theme"
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <span>Theme: <b className="underline decoration-dotted underline-offset-2" style={{ color: colors.textCyan }}>{isDark ? 'Dark' : 'Light'}</b></span>
          </button>
        </div>
      </footer>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* START NEW PROJECT TEMPLATE SELECTOR MODAL                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isNewProjectOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsNewProjectOpen(false); }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in duration-150"
        >
          <div 
            style={{ backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }}
            className="border rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="px-5 py-3.5 border-b flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-bold font-heading" style={{ color: colors.textCyan }}>Start a New Quantum Project</h3>
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
                  className="p-4 rounded-xl border cursor-pointer transition-all shadow-2xs group flex flex-col gap-1.5 hover:border-sky-500"
                >
                  <div className="text-xs font-bold flex items-center justify-between" style={{ color: colors.textPrimary }}>
                    <span className="group-hover:text-sky-400 transition-colors">{tpl.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" style={{ color: colors.textMuted }} />
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: colors.textMuted }}>
                    {tpl.desc}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono">
                    <span className="font-semibold" style={{ color: colors.textCyan }}>Files:</span>
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


      {/* ───────────────────────────────────────────────────────────── */}
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 33 QUANTUM TOOLS: VERTICAL SCROLLABLE MODAL (BULLETPROOF INLINE CSS) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isToolPaletteOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            overflow: 'hidden'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsToolPaletteOpen(false); }}
        >
          <div 
            style={{ 
              backgroundColor: colors.bgCard, 
              borderColor: colors.border, 
              color: colors.textPrimary,
              width: '100%',
              maxWidth: '760px',
              height: '80vh',
              maxHeight: '650px',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              borderWidth: '1px',
              borderStyle: 'solid',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)'
            }}
          >
            {/* 1. Modal Header (Strictly Locked - Never Scrolls) */}
            <div 
              style={{ 
                backgroundColor: colors.bgHeader, 
                borderColor: colors.border,
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Plus className="w-4 h-4" style={{ color: colors.textAmber }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold font-heading" style={{ color: colors.textCyan }}>
                      Connect Quantum Tool
                    </h3>
                    <span 
                      style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textAmber }}
                      className="text-[10px] font-mono px-1.5 py-0.2 rounded border font-bold uppercase"
                    >
                      33 Tools Available
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: colors.textMuted }}>
                    Select a specialized quantum primitive to connect directly to the active workspace
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsToolPaletteOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-75 transition-opacity cursor-pointer border border-slate-700/50"
                style={{ color: colors.textMuted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2. Filter & Search Bar (Strictly Locked - Never Scrolls) */}
            <div 
              style={{ 
                backgroundColor: colors.bgHeader, 
                borderColor: colors.border,
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                flexShrink: 0
              }}
            >
              <input 
                type="text"
                value={toolSearchQuery}
                onChange={(e) => setToolSearchQuery(e.target.value)}
                placeholder="Search tools by name, identifier (e.g. transpile, vqe), studio, or capability..."
                style={{ backgroundColor: colors.bgEditor, borderColor: colors.border, color: colors.textPrimary }}
                className="w-full border rounded-lg px-3 py-2 text-xs outline-hidden font-mono placeholder:opacity-40 focus:border-sky-500"
              />

              {/* Studio Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono font-bold pb-0.5">
                {[
                  { id: 'all', label: 'All Tools (33)' },
                  { id: 'Optimization', label: 'Optimization (6)' },
                  { id: 'Academy', label: 'Academy (5)' },
                  { id: 'Algorithms', label: 'Algorithms (5)' },
                  { id: 'Circuit', label: 'Circuit (5)' },
                  { id: 'Chemistry', label: 'Chemistry (6)' },
                  { id: 'QML', label: 'QML (6)' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedStudioFilter(tab.id)}
                    style={{ 
                      backgroundColor: selectedStudioFilter === tab.id ? colors.bgPill : 'transparent',
                      borderColor: selectedStudioFilter === tab.id ? colors.textCyan : 'transparent',
                      color: selectedStudioFilter === tab.id ? colors.textCyan : colors.textMuted
                    }}
                    className="px-2.5 py-1 rounded-md border transition-all cursor-pointer shrink-0 hover:border-slate-600"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Modal Body: Vertical Scrollable Tools List (ONLY THIS CONTAINER SCROLLS) */}
            <div 
              style={{
                flex: '1 1 0%',
                minHeight: 0,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {allQuantumTools
                .filter(t => selectedStudioFilter === 'all' || t.studio === selectedStudioFilter)
                .filter(t => 
                  t.name.toLowerCase().includes(toolSearchQuery.toLowerCase()) || 
                  t.studio.toLowerCase().includes(toolSearchQuery.toLowerCase()) ||
                  t.tag.toLowerCase().includes(toolSearchQuery.toLowerCase()) ||
                  t.desc.toLowerCase().includes(toolSearchQuery.toLowerCase())
                )
                .map((tool) => (
                  <div
                    key={tool.id}
                    onClick={() => {
                      setCopilotInput(`/${tool.tag}`);
                      setIsToolPaletteOpen(false);
                    }}
                    style={{ backgroundColor: colors.bgEditor, borderColor: colors.border }}
                    className="p-3 rounded-xl border cursor-pointer transition-all hover:border-sky-500 shadow-2xs group flex items-start justify-between gap-3 shrink-0"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span style={{ color: colors.textAmber }} className="font-mono text-xs font-bold">#{tool.id < 10 ? `0${tool.id}` : tool.id}</span>
                        <span className="font-bold text-xs group-hover:text-sky-400 transition-colors font-heading" style={{ color: colors.textPrimary }}>
                          {tool.name}
                        </span>
                        <span 
                          style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textCyan }} 
                          className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border"
                        >
                          {tool.studio}
                        </span>
                        <span 
                          style={{ backgroundColor: colors.bgPill, color: tool.nature.includes('Deterministic') ? colors.textEmerald : colors.textAmber }} 
                          className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold"
                        >
                          {tool.nature}
                        </span>
                      </div>

                      <p className="text-[11px] leading-relaxed font-sans" style={{ color: colors.textMuted }}>
                        {tool.desc}
                      </p>

                      <div className="text-[10px] font-mono" style={{ color: colors.textCyan }}>
                        Identifier: <span style={{ color: colors.textPrimary }}>{tool.tag}</span>
                      </div>
                    </div>

                    <button 
                      style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textCyan }}
                      className="px-3 py-1.5 rounded-lg border text-[11px] font-bold font-mono shrink-0 group-hover:border-sky-500 transition-all"
                    >
                      Connect ➔
                    </button>
                  </div>
                ))}
            </div>

            {/* 4. Modal Footer (Strictly Locked - Never Scrolls) */}
            <div 
              style={{ 
                backgroundColor: colors.bgHeader, 
                borderColor: colors.border,
                borderTopWidth: '1px',
                borderTopStyle: 'solid',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontFamily: 'monospace',
                flexShrink: 0
              }}
            >
              <span style={{ color: colors.textMuted }}>
                Tip: Click any tool to connect its execution command into Copilot chat
              </span>
              <button 
                onClick={() => setIsToolPaletteOpen(false)}
                style={{ backgroundColor: colors.bgPill, color: colors.textPrimary, borderColor: colors.border }}
                className="px-4 py-1.5 font-bold rounded-lg border transition-opacity hover:opacity-80 cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PROJECT MEMORY & AUDIT TRAIL MODAL                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isMemoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden animate-in fade-in duration-150">
          <div 
            style={{ backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }}
            className="border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="px-5 py-3.5 border-b flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
                  <Brain className="w-4 h-4" style={{ color: colors.textCyan }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading" style={{ color: colors.textCyan }}>
                    Quantum Project Memory & Audit Ledger
                  </h3>
                  <p className="text-[11px]" style={{ color: colors.textMuted }}>
                    Chronological trace of user intents, LLM reasoning, 33-tool calls, and code diff snapshots
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsMemoryOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-75 transition-opacity cursor-pointer"
                style={{ color: colors.textMuted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Memory Turns Timeline */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {memoryLedger?.turns && memoryLedger.turns.length > 0 ? (
                memoryLedger.turns.map((turn: any, idx: number) => (
                  <div 
                    key={turn.turn_id || idx}
                    style={{ backgroundColor: colors.bgEditor, borderColor: colors.border }}
                    className="border rounded-xl p-4 space-y-3 shadow-2xs font-mono"
                  >
                    {/* Turn Header */}
                    <div className="flex items-center justify-between border-b pb-2 text-[11px]" style={{ borderColor: colors.border }}>
                      <span className="font-bold flex items-center gap-1.5" style={{ color: colors.textCyan }}>
                        <span>Turn #{idx + 1}</span>
                        <span style={{ color: colors.textMuted }}>•</span>
                        <span style={{ color: colors.textAmber }}>{turn.agent_called}</span>
                      </span>
                      <span className="text-[10px]" style={{ color: colors.textMuted }}>
                        {turn.timestamp}
                      </span>
                    </div>

                    {/* 1. What User Said */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider font-sans" style={{ color: colors.textCyan }}>
                        1. What User Said
                      </div>
                      <div 
                        style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
                        className="p-2 rounded border text-xs font-sans font-medium"
                      >
                        "{turn.user_prompt}"
                      </div>
                    </div>

                    {/* 2. What LLM Suggested */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider font-sans" style={{ color: colors.textCyan }}>
                        2. What LLM Suggested & Reasoned
                      </div>
                      <div 
                        style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
                        className="p-2 rounded border text-xs font-sans leading-relaxed"
                      >
                        {turn.llm_reasoning}
                      </div>
                    </div>

                    {/* 3. Which Tool / Agent Was Called */}
                    {turn.tools_invoked && turn.tools_invoked.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider font-sans" style={{ color: colors.textEmerald }}>
                          3. Tool / Agent Invocation Trace ({turn.tools_invoked.length})
                        </div>
                        {turn.tools_invoked.map((t: any, tIdx: number) => (
                          <div 
                            key={tIdx}
                            style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                            className="p-2 rounded-lg border text-[11px] space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold font-mono" style={{ color: colors.textPrimary }}>
                                #{t.tool_id || 19} {t.tool_name}
                              </span>
                              <span style={{ color: colors.textEmerald }} className="font-bold text-[10px]">
                                {t.status?.toUpperCase() || 'SUCCESS'} ({t.execution_time_ms}ms)
                              </span>
                            </div>
                            <div className="text-[10px] space-y-0.5" style={{ color: colors.textMuted }}>
                              <div>Inputs: <span style={{ color: colors.textAmber }}>{JSON.stringify(t.inputs)}</span></div>
                              <div>Outputs: <span style={{ color: colors.textSkyBlue }}>{JSON.stringify(t.outputs)}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 4. Code Changes Proposed */}
                    {turn.code_changes && turn.code_changes.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider font-sans" style={{ color: colors.textAmber }}>
                          4. Code Diffs & File Changes
                        </div>
                        {turn.code_changes.map((c: any, cIdx: number) => (
                          <div 
                            key={cIdx}
                            style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                            className="p-2 rounded-lg border text-[11px] flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span style={{ color: colors.textAmber }} className="font-bold font-mono">{c.action}: {c.file_path}</span>
                              <span style={{ color: colors.textMuted }}>({c.lines_modified})</span>
                            </div>
                            <span className="font-sans text-[10px]" style={{ color: colors.textPrimary }}>{c.summary}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 5. Quantum Physical State Snapshot */}
                    {turn.quantum_state && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider font-sans" style={{ color: colors.textSkyBlue }}>
                          5. Quantum Physical State Snapshot
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
                          <div style={{ backgroundColor: colors.bgPill, borderColor: colors.border }} className="p-1.5 rounded border text-center">
                            <div style={{ color: colors.textMuted }}>Target QPU</div>
                            <div className="font-bold" style={{ color: colors.textSkyBlue }}>{turn.quantum_state.target_backend}</div>
                          </div>
                          <div style={{ backgroundColor: colors.bgPill, borderColor: colors.border }} className="p-1.5 rounded border text-center">
                            <div style={{ color: colors.textMuted }}>Active Qubits</div>
                            <div className="font-bold" style={{ color: colors.textSkyBlue }}>{turn.quantum_state.active_qubits}</div>
                          </div>
                          <div style={{ backgroundColor: colors.bgPill, borderColor: colors.border }} className="p-1.5 rounded border text-center">
                            <div style={{ color: colors.textMuted }}>Depth</div>
                            <div className="font-bold" style={{ color: colors.textSkyBlue }}>{turn.quantum_state.circuit_depth}</div>
                          </div>
                          <div style={{ backgroundColor: colors.bgPill, borderColor: colors.border }} className="p-1.5 rounded border text-center">
                            <div style={{ color: colors.textMuted }}>Fidelity</div>
                            <div className="font-bold" style={{ color: colors.textEmerald }}>{(turn.quantum_state.fidelity * 100).toFixed(2)}%</div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                ))
              ) : (
                <div className="text-center py-8" style={{ color: colors.textMuted }}>
                  No memory turns recorded yet for project: <b style={{ color: colors.textCyan }}>{projectName}</b>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="px-5 py-3 border-t flex items-center justify-between text-xs"
            >
              <span className="font-mono text-[11px]" style={{ color: colors.textMuted }}>
                Storage: <b style={{ color: colors.textCyan }}>.quantum_projects/{projectName}_memory.json</b>
              </span>
              <button 
                onClick={() => setIsMemoryOpen(false)}
                style={{ backgroundColor: colors.bgPill, color: colors.textCyan, borderColor: colors.border }}
                className="px-4 py-1.5 font-bold rounded-lg border transition-opacity hover:opacity-80 cursor-pointer"
              >
                Close Audit Trail
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
