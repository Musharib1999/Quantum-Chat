'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
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
  Brain
} from 'lucide-react';

type AgentPhase = 
  | 'idle' 
  | 'thinking' 
  | 'planning' 
  | 'calling_tool' 
  | 'tool_name' 
  | 'writing_code' 
  | 'simulating' 
  | 'generating_output';

interface WorkflowStepItem {
  step_num: number;
  tool_tag: string;
  name: string;
  status: string;
  execution_time_ms: number;
  summary: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  workflowSteps?: WorkflowStepItem[];
  scientificVerdict?: string;
  toolCall?: {
    name: string;
    badge: string;
    detail: string;
  };
}

export default function QuantumIDE() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeBottomTab, setActiveBottomTab] = useState<'circuit' | 'results' | 'terminal'>('circuit');
  const [activeModel, setActiveModel] = useState<'groq' | 'runpod'>('groq');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [customProjectInput, setCustomProjectInput] = useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('optimization');
  const [isProjectsDropdownOpen, setIsProjectsDropdownOpen] = useState(false);
  const [targetBackend, setTargetBackend] = useState('aer_simulator');
  const [optimizationLevel, setOptimizationLevel] = useState<number>(2);
  const [shots, setShots] = useState<number>(1024);
  const [copilotInput, setCopilotInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);
  const [agentPhase, setAgentPhase] = useState<AgentPhase>('idle');
  const [activeToolDisplay, setActiveToolDisplay] = useState<string>('');
  const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});
  const [isToolPaletteOpen, setIsToolPaletteOpen] = useState(false);
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [selectedStudioFilter, setSelectedStudioFilter] = useState<string>('all');

  // Section 1 (Left Sidebar) state: Open/Closed & Width (20% default)
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(288);
  const isLeftDragging = useRef(false);

  // Section 3 (Right Sidebar) state: Open/Closed & Width (40% default)
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [rightWidth, setRightWidth] = useState(576);
  const isRightDragging = useRef(false);

  const isDark = theme === 'dark';

  // ─────────────────────────────────────────────────────────────
  // 🎯 4 CLEAR SEMANTIC TEXT ROLES (DARK & LIGHT THEMES)
  // ─────────────────────────────────────────────────────────────
  const colors = {
    bgMain: isDark ? '#0D0D0D' : '#FAFAFA',
    bgHeader: isDark ? '#141414' : '#FFFFFF',
    bgSidebar: isDark ? '#101010' : '#FAFAFA',
    bgCard: isDark ? '#181818' : '#FFFFFF',
    bgEditor: isDark ? '#0D0D0D' : '#FFFFFF',
    bgInput: isDark ? '#141414' : '#F5F5F5',
    bgPill: isDark ? '#1E1E1E' : '#F0F0F0',
    border: isDark ? '#262626' : '#E5E5E5',
    borderSubtle: isDark ? '#1A1A1A' : '#F5F5F5',
    
    // 10% Toned Down Semantic Text Roles (Soft, Non-Glare)
    textPrimary: isDark ? '#DDE2E8' : '#1E293B',
    textMuted: isDark ? '#808D9E' : '#64748B',
    textCyan: isDark ? '#33A8DB' : '#0376AD',
    textEmerald: isDark ? '#2FB885' : '#0A8760',
    textAmber: isDark ? '#DEAA21' : '#BF6C08',
    textSkyBlue: isDark ? '#5390DD' : '#2A5BC7',
  };

  // ─────────────────────────────────────────────────────────────
  // ⚡ DYNAMIC QUANTUM RUNTIME STATE (UPDATED BY AGENT & TOOLS)
  // ─────────────────────────────────────────────────────────────
  const [runtimeMetrics, setRuntimeMetrics] = useState({
    activeQubits: 4,
    depth: 6,
    cnots: 3,
    circuitText: `     ┌───┐┌───────────┐                                        ┌──────────┐                                                                                                                           ┌──────────┐                          ┌──────────┐
q_0: ┤ H ├┤ P(2*x[0]) ├──■──────────────────────────────────■──┤ Ry(θ[0]) ├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────■──────┤ Ry(θ[4]) ├───────────────────■──────┤ Ry(θ[8]) ├
     ├───┤├───────────┤┌─┴─┐┌────────────────────────────┐┌─┴─┐└──────────┘                                   ┌──────────┐                                                                   ┌─┴─┐    ├──────────┤                 ┌─┴─┐    ├──────────┤
q_1: ┤ H ├┤ P(2*x[1]) ├┤ X ├┤ P(2*(π - x[0])*(π - x[1])) ├┤ X ├─────■──────────────────────────────────────■──┤ Ry(θ[1]) ├─────────────────────────────────────────────────────────■─────────┤ X ├────┤ Ry(θ[5]) ├──────■──────────┤ X ├────┤ Ry(θ[9]) ├
     ├───┤├───────────┤└───┘└────────────────────────────┘└───┘   ┌─┴─┐    ┌────────────────────────────┐┌─┴─┐└──────────┘                                   ┌──────────┐        ┌─┴─┐    ┌──┴───┴───┐└──────────┘    ┌─┴─┐    ┌───┴───┴───┐└──────────┘
q_2: ┤ H ├┤ P(2*x[2]) ├───────────────────────────────────────────┤ X ├────┤ P(2*(π - x[1])*(π - x[2])) ├┤ X ├─────■──────────────────────────────────────■──┤ Ry(θ[2]) ├──■─────┤ X ├────┤ Ry(θ[6]) ├─────■──────────┤ X ├────┤ Ry(θ[10]) ├────────────
     ├───┤├───────────┤                                           └───┘    └────────────────────────────┘└───┘   ┌─┴─┐    ┌────────────────────────────┐┌─┴─┐├──────────┤┌─┴─┐┌──┴───┴───┐└──────────┘   ┌─┴─┐    ┌───┴───┴───┐└───────────┘            
q_3: ┤ H ├┤ P(2*x[3]) ├──────────────────────────────────────────────────────────────────────────────────────────┤ X ├────┤ P(2*(π - x[2])*(π - x[3])) ├┤ X ├┤ Ry(θ[3]) ├┤ X ├┤ Ry(θ[7]) ├───────────────┤ X ├────┤ Ry(θ[11]) ├─────────────────────────
     └───┘└───────────┘                                                                                          └───┘    └────────────────────────────┘└───┘└──────────┘└───┘└──────────┘               └───┘    └───────────┘                         `,
    expectationVal: '-0.4125 Ha',
    fidelity: '99.82%',
    latencySec: '0.142s',
    terminalLog: [
      '➜ python3 main.py --backend aer_simulator --shots 1024',
      'Initializing Quantum Circuit on AerSimulator...',
      'Statevector Simulation Complete. Expectation <Z_0>: -0.4125',
      'Process finished with exit code 0 (0.142s)'
    ]
  });

  // ─────────────────────────────────────────────────────────────
  // 📂 MULTI-PROJECT WORKSPACE SYSTEM (SWITCH & CREATE AT WILL)
  // ─────────────────────────────────────────────────────────────
  const initialProjectTemplates: Record<string, { title: string; desc: string; files: Record<string, { name: string; lang: string; content: string }> }> = {
    'my-quantum-project': {
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
          content: `# 🧠 Project Memory: my-quantum-project\n\n## Turn #1 — CNOT Depth Optimization\n- User Prompt: "Optimize CNOT depth in main.py"\n- Agent: Quantum Guru Transpiler Agent\n- Tool: [#19] tools.circuit.transpile_passes (Level 2) -> Depth: 6 to 4 (-33%)\n- State: aer_simulator | Active Qubits: 4 | Fidelity: 99.82%`
        },
        'README.md': {
          name: 'README.md',
          lang: 'markdown',
          content: `# Quantum Project\n\nUse \`/execute@program\` or \`/transpile@level2\` in Copilot chat.`
        }
      }
    },
    'portfolio-optimization': {
      title: 'Portfolio Optimization & QUBO',
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

print("Building QUBO Objective Matrix for 4 Assets...")
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
          content: `# 🧠 Project Memory: portfolio-optimization\n\n## Turn #1 — QUBO Formulation\n- Tool: [#01] tools.opt.formulate_problem`
        }
      }
    },
    'lih-cas-vqe': {
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
        },
        'MEMORY.md': {
          name: 'MEMORY.md',
          lang: 'markdown',
          content: `# 🧠 Project Memory: lih-cas-vqe\n\n## Turn #1 — Active Space CAS(2,4)\n- Tool: [#24] tools.chem.select_active_space`
        }
      }
    },
    'iris-qsvm-classifier': {
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
        },
        'MEMORY.md': {
          name: 'MEMORY.md',
          lang: 'markdown',
          content: `# 🧠 Project Memory: iris-qsvm-classifier\n\n## Turn #1 — Quantum Kernel Training\n- Tool: [#31] tools.qml.train_classifier`
        }
      }
    }
  };

  const [allProjects, setAllProjects] = useState(initialProjectTemplates);
  const [projectName, setProjectName] = useState('my-quantum-project');
  const [projectFiles, setProjectFiles] = useState(initialProjectTemplates['my-quantum-project'].files);
  const [activeFile, setActiveFile] = useState('main.py');

  // Switch to an existing project or create new
  const switchProject = (pName: string) => {
    if (allProjects[pName]) {
      setProjectName(pName);
      setProjectFiles(allProjects[pName].files);
      const firstF = Object.keys(allProjects[pName].files)[0];
      setActiveFile(firstF);
      setIsProjectsDropdownOpen(false);
      
      // Update dynamic target backend depending on project
      if (pName.includes('optimization')) setTargetBackend('dwave_simulated_annealing');
      else if (pName.includes('vqe')) setTargetBackend('statevector');
      else setTargetBackend('aer_simulator');
    }
  };

  // The 33 Quantum AI Tools Registry for the Connect Palette
  const allQuantumTools = [
    // 1. Optimization Studio (6)
    { id: 1, studio: 'Optimization', name: 'Problem Formulator', tag: 'tools.opt.formulate_problem', desc: 'Extracts decision variables, bounds & constraint equations from natural language specs.', nature: 'Deterministic' },
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

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'user',
      text: 'Optimize the 2-qubit CNOT depth for the active circuit in main.py and explain the reduction.'
    },
    {
      id: '2',
      sender: 'agent',
      text: 'I analyzed your quantum circuit in `main.py` and ran Transpiler Pass Optimization (Level 2).\n\n- Depth Reduction: `6` $\\longrightarrow$ `4` (-33.3%)\n- 2-Qubit CNOTs: Reduced to 4 gates.\n- Code Mutation: `main.py` has been updated with the optimized commutative block.',
      toolCall: {
        name: 'Transpiler Pass Completed',
        badge: '-33.3% Depth',
        detail: 'Applied CommutativeCancellation & ConsolidateBlocks (Level 2).'
      }
    }
  ]);

  // Handle Drag Resizing
  const handleLeftMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isLeftDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isLeftDragging.current) return;
      const newWidth = Math.max(180, Math.min(480, moveEvent.clientX));
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

  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isRightDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isRightDragging.current) return;
      const newWidth = Math.max(280, Math.min(750, window.innerWidth - moveEvent.clientX));
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      setLeftWidth(Math.round(w * 0.20));
      setRightWidth(Math.round(w * 0.40));
    }
  }, []);

  // Synchronize project workspace to localStorage and MongoDB backend
  const saveProjectToDatabase = useCallback(async (
    projId: string, 
    projData: { title: string; desc: string; files: Record<string, { name: string; content: string; language: string }> },
    currActiveFile: string,
    metrics: typeof runtimeMetrics
  ) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('quantum_ide_active_project', projId);
        localStorage.setItem(`quantum_ide_proj_${projId}`, JSON.stringify({
          id: projId,
          title: projData.title,
          desc: projData.desc,
          files: projData.files,
          activeFile: currActiveFile,
          runtimeMetrics: metrics,
          updatedAt: new Date().toISOString()
        }));
      }

      await fetch('/api/ide/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projId,
          title: projData.title,
          desc: projData.desc,
          files: projData.files,
          activeFile: currActiveFile,
          runtimeMetrics: metrics
        })
      });
    } catch (err) {
      console.warn('Failed to sync project to MongoDB:', err);
    }
  }, []);

  // Create a new project with custom name and chosen scaffold template
  const handleCreateCustomProject = () => {
    const rawName = customProjectInput.trim();
    const finalName = rawName ? rawName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '') : `quantum-project-${Date.now().toString().slice(-4)}`;
    
    // Get scaffold files from selected template
    const templateData = initialProjectTemplates[selectedTemplateKey] || initialProjectTemplates['my-quantum-project'];
    const newFiles = { ...templateData.files };

    // Update allProjects dictionary
    setAllProjects(prev => ({
      ...prev,
      [finalName]: {
        title: finalName,
        desc: `Custom project scaffolded from ${templateData.title}`,
        files: newFiles
      }
    }));

    // Switch active workspace
    setProjectName(finalName);
    setProjectFiles(newFiles);
    setActiveFile('main.py');
    setCustomProjectInput('');
    setIsNewProjectOpen(false);
    setIsProjectsDropdownOpen(false);

    // Persist to MongoDB
    saveProjectToDatabase(finalName, { title: finalName, desc: `Custom project scaffolded from ${templateData.title}`, files: newFiles }, 'main.py', runtimeMetrics);

    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'agent',
      text: `Created and opened project: ${finalName} (scaffolded from ${templateData.title}). Saved to MongoDB with \`main.py\` and \`MEMORY.md\`.`
    }]);
  };

  // Switch between existing projects while preserving file edits
  const handleSwitchProject = (targetProject: string) => {
    if (targetProject === projectName) {
      setIsProjectsDropdownOpen(false);
      return;
    }

    // 1. Save current project's files before switching (local + MongoDB)
    const currentProjData = {
      ...(allProjects[projectName] || {}),
      files: projectFiles
    };
    setAllProjects(prev => ({
      ...prev,
      [projectName]: currentProjData
    }));
    saveProjectToDatabase(projectName, currentProjData, activeFile, runtimeMetrics);

    // 2. Load target project's files
    const target = allProjects[targetProject] || initialProjectTemplates[targetProject] || initialProjectTemplates['my-quantum-project'];
    setProjectName(targetProject);
    setProjectFiles(target.files);
    setActiveFile('main.py');
    setIsProjectsDropdownOpen(false);
  };

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setActiveBottomTab('terminal');
    }, 600);
  };

  const handleSimulate = () => {
    setActiveBottomTab('circuit');
  };

  // ─────────────────────────────────────────────────────────────
  // 🧠 LIVE CONTEXT-AWARE AGENT REASONING + LIVE CODE & TELEMETRY MUTATION
  // ─────────────────────────────────────────────────────────────
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || copilotInput).trim();
    if (!text || isCopilotThinking) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    setCopilotInput('');
    setIsCopilotThinking(true);

    if (text === '/execute@program' || text.toLowerCase().includes('run program') || text.toLowerCase().includes('/run')) {
      handleRun();
    } else if (text === '/simulate@circuit' || text.toLowerCase().includes('simulate circuit')) {
      handleSimulate();
    }

    try {
      const res = await fetch('http://localhost:8002/v3/enterprise/ide/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectName,
          user_message: text,
          active_file: activeFile,
          file_content: projectFiles[activeFile]?.content || '',
          target_backend: targetBackend,
          optimization_level: optimizationLevel,
          model_engine: activeModel,
          history: chatMessages.slice(-6).map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // 1. Update Chat Response with Autonomous Workflow Steps
        setChatMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: data.response_text || 'Completed autonomous quantum analysis.',
          workflowSteps: data.workflow_steps || undefined,
          scientificVerdict: data.scientific_verdict || undefined,
          toolCall: data.tool_call || undefined
        }]);

        // 2. Dynamically Mutate Code in Monaco Editor & Persist to Workspace
        if (data.updated_code) {
          const newCode = data.updated_code;
          setProjectFiles(prev => {
            const updated = {
              ...prev,
              [activeFile]: {
                ...prev[activeFile],
                content: newCode
              }
            };
            // Also sync into allProjects workspace store
            setAllProjects(projPrev => ({
              ...projPrev,
              [projectName]: {
                ...projPrev[projectName],
                files: updated
              }
            }));
            return updated;
          });
        }

        // 3. Dynamically Mutate Real-Time Runtime Telemetry
        if (data.runtime_telemetry) {
          setRuntimeMetrics({
            activeQubits: data.runtime_telemetry.active_qubits || runtimeMetrics.activeQubits,
            depth: data.runtime_telemetry.depth || runtimeMetrics.depth,
            cnots: data.runtime_telemetry.cnots || runtimeMetrics.cnots,
            circuitText: data.runtime_telemetry.circuit_text || runtimeMetrics.circuitText,
            expectationVal: data.runtime_telemetry.expectation_val || runtimeMetrics.expectationVal,
            fidelity: data.runtime_telemetry.fidelity || runtimeMetrics.fidelity,
            latencySec: data.runtime_telemetry.latency_sec || runtimeMetrics.latencySec,
            terminalLog: data.runtime_telemetry.terminal_log || runtimeMetrics.terminalLog
          });
        }
      } else {
        throw new Error('Backend agent error');
      }
    } catch (err) {
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: `### ⚛️ Quantum Analysis & Contextual Response\n\nRegarding your query: *"${text}"*\n\n1. Active Code Context (\`${activeFile}\`):\nYour current workspace is running ${runtimeMetrics.activeQubits} qubits (depth ${runtimeMetrics.depth}) on ${targetBackend}.\n\n2. Mathematical State:\n$$\\vert\\psi(\\theta)\\rangle = U_{\\text{ansatz}}(\\theta) U_{\\Phi}(\\mathbf{x})\\vert 0^{\\otimes 4}\\rangle$$\n- Statevector fidelity: ${runtimeMetrics.fidelity}\n- Expectation value: $\\langle Z_0 \\rangle = ${runtimeMetrics.expectationVal}$\n\n3. Recommended Actions:\n- Type \`/execute@program\` to stream results.\n- Click \`+ Connect Tool\` to attach any of the 33 quantum primitives.`,
          toolCall: {
            name: `Quantum Copilot (${activeModel.toUpperCase()})`,
            badge: 'Context Synced',
            detail: `Target: ${targetBackend} | Level ${optimizationLevel}`
          }
        }]);
      }, 400);
    } finally {
      setIsCopilotThinking(false);
    }
  };

  const files = projectFiles;

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
        {/* Left: Brand & Project Breadcrumb Dropdown */}
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
            <span className="font-normal text-sm tracking-tight font-heading" style={{ color: colors.textPrimary }}>
              Quantum Guru
            </span>
            <span 
              style={{ 
                backgroundColor: colors.bgPill, 
                borderColor: colors.border,
                color: colors.textCyan 
              }}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border font-normal uppercase tracking-wider"
            >
              IDE
            </span>
          </div>

          <div style={{ backgroundColor: colors.border }} className="h-4 w-px mx-1" />

          {/* Project Switcher Dropdown */}
          <div className="relative">
            <div 
              onClick={() => setIsProjectsDropdownOpen(!isProjectsDropdownOpen)}
              style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors font-normal hover:border-sky-500"
            >
              <Folder className="w-3.5 h-3.5" style={{ color: colors.textCyan }} />
              <span className="font-mono font-normal" style={{ color: colors.textPrimary }}>{projectName}</span>
              <ChevronDown className="w-3 h-3 ml-1" style={{ color: colors.textMuted }} />
            </div>

            {/* Project List Popover */}
            {isProjectsDropdownOpen && (
              <div 
                style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                className="absolute top-full left-0 mt-1.5 w-64 border rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="text-[10px] font-normal uppercase tracking-wider px-2 py-1 mb-1 font-heading" style={{ color: colors.textCyan }}>
                  Switch Workspace Project
                </div>
                <div className="space-y-1">
                  {Object.keys(allProjects).map((pKey) => (
                    <div
                      key={pKey}
                      onClick={() => switchProject(pKey)}
                      style={{ 
                        backgroundColor: projectName === pKey ? colors.bgPill : 'transparent',
                        borderColor: projectName === pKey ? colors.textCyan : 'transparent',
                        color: projectName === pKey ? colors.textPrimary : colors.textMuted
                      }}
                      className="px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center justify-between cursor-pointer hover:border-sky-500 transition-colors"
                    >
                      <span className="truncate">{pKey}</span>
                      {projectName === pKey && <Check className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />}
                    </div>
                  ))}
                </div>
                <div className="pt-2 mt-1 border-t" style={{ borderColor: colors.border }}>
                  <button
                    onClick={() => { setIsProjectsDropdownOpen(false); setIsNewProjectOpen(true); }}
                    style={{ backgroundColor: colors.bgPill, color: colors.textAmber, borderColor: colors.border }}
                    className="w-full py-1 text-xs rounded-md border font-normal flex items-center justify-center gap-1 hover:border-amber-400 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create New Project</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Marketplace Link, Theme Switcher & Section 3 Toggle */}
        <div className="flex items-center gap-2">
          <Link
            href="/marketplace"
            title="Browse 33 Quantum Capabilities Marketplace"
            style={{ 
              backgroundColor: colors.bgPill, 
              borderColor: colors.border,
              color: colors.textCyan 
            }}
            className="px-2.5 py-1.5 rounded-md border text-xs font-mono transition-all hover:border-sky-400 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Zap className="w-3.5 h-3.5" style={{ color: colors.textAmber }} />
            <span>Marketplace</span>
          </Link>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
            style={{ 
              backgroundColor: colors.bgPill, 
              borderColor: colors.border,
              color: colors.textAmber
            }}
            className="p-1.5 rounded-md border transition-colors cursor-pointer hover:border-amber-400"
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
            className="p-1.5 rounded-md border transition-colors cursor-pointer hover:border-sky-500"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN WORKSPACE (20% Left / 40% Center / 40% Right)            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECTION 1 (LEFT): FILE EXPLORER, PROJECTS & ENGINES        */}
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
            {/* Start New Project Button Row with Sidebar Collapse */}
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
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-normal transition-all shadow-2xs cursor-pointer group hover:border-amber-400"
              >
                <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" style={{ color: colors.textAmber }} />
                <span>Start New Project</span>
              </button>
            </div>

            {/* Project File Tree & Sub-Engines */}
            <div className="p-2 space-y-0.5 text-xs flex-1 overflow-y-auto font-mono">
              <div className="flex items-center gap-1.5 px-2 py-1 font-normal tracking-wider uppercase font-heading text-[11px]" style={{ color: colors.textCyan }}>
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
                  className="flex items-center gap-2 px-6 py-1.5 rounded-md cursor-pointer transition-colors border font-normal"
                >
                  <FileCode className="w-3.5 h-3.5" style={{ color: activeFile === fName ? colors.textCyan : colors.textMuted }} />
                  <span className="truncate font-normal">{fName}</span>
                </div>
              ))}

              {/* Quantum Telemetry & Runtime Solvers Cards */}
              <div className="pt-4 px-1 space-y-2">
                <div className="text-[10px] font-normal uppercase tracking-wider mb-1 font-heading" style={{ color: colors.textCyan }}>
                  Runtime Solvers & Telemetry
                </div>

                {/* Card 1: Continuous Circuit Canvas */}
                <div 
                  onClick={() => setTelemetryModalTab('circuit')}
                  style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                  className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-sky-500/60 transition-all group"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 font-heading text-xs" style={{ color: colors.textPrimary }}>
                      <Zap className="w-3.5 h-3.5" style={{ color: colors.textCyan }} /> Circuit Canvas
                    </span>
                    <span style={{ color: colors.textCyan }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                      View →
                    </span>
                  </div>
                  <div className="text-[10px] font-mono flex items-center justify-between" style={{ color: colors.textMuted }}>
                    <span>Qubits: <span style={{ color: colors.textSkyBlue }}>{runtimeMetrics.activeQubits}</span></span>
                    <span>Depth: <span style={{ color: colors.textSkyBlue }}>{runtimeMetrics.depth}</span></span>
                    <span>CNOTs: <span style={{ color: colors.textSkyBlue }}>{runtimeMetrics.cnots}</span></span>
                  </div>
                </div>

                {/* Card 2: Simulation Results & Metrics */}
                <div 
                  onClick={() => setTelemetryModalTab('results')}
                  style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                  className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-emerald-500/60 transition-all group"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 font-heading text-xs" style={{ color: colors.textPrimary }}>
                      <Activity className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} /> Results & Metrics
                    </span>
                    <span style={{ color: colors.textEmerald }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                      View →
                    </span>
                  </div>
                  <div className="text-[10px] font-mono flex items-center justify-between" style={{ color: colors.textMuted }}>
                    <span>Fidelity: <span style={{ color: colors.textEmerald }}>{runtimeMetrics.fidelity}</span></span>
                    <span>Latency: <span style={{ color: colors.textAmber }}>{runtimeMetrics.latencySec}</span></span>
                  </div>
                </div>

                {/* Card 3: Solver Terminal */}
                <div 
                  onClick={() => setTelemetryModalTab('terminal')}
                  style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                  className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-amber-500/60 transition-all group"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 font-heading text-xs" style={{ color: colors.textPrimary }}>
                      <TerminalIcon className="w-3.5 h-3.5" style={{ color: colors.textAmber }} /> Solver Terminal
                    </span>
                    <span style={{ color: colors.textAmber }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                      Logs →
                    </span>
                  </div>
                  <div className="text-[10px] font-mono truncate" style={{ color: colors.textMuted }}>
                    Target: <span style={{ color: colors.textAmber }}>{targetBackend}</span> (1024 shots)
                  </div>
                </div>
              </div>

            </div>

            {/* Pinned Bottom Controls: Settings */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="p-2 border-t shrink-0"
            >
              <button
                onClick={() => setIsSettingsOpen(true)}
                style={{ borderColor: colors.border, color: colors.textPrimary }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs font-normal transition-all cursor-pointer group hover:opacity-80 shadow-2xs"
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
                  className="text-[9px] font-mono px-2 py-0.5 rounded font-normal border"
                >
                  {activeModel === 'groq' ? 'Qwen 3.6 (Groq)' : 'RunPod'}
                </span>
              </button>
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
        <div style={{ backgroundColor: colors.bgEditor }} className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
          
          {/* Upper Pane: Interactive Monaco Code Canvas */}
          <div style={{ borderColor: colors.border }} className="flex-1 flex flex-col min-h-0 overflow-hidden border-b">
            <div 
              style={{ backgroundColor: colors.bgEditor, color: colors.textPrimary }}
              className="flex-1 min-h-0 overflow-auto p-4 font-mono text-xs leading-relaxed flex"
            >
              {/* Line Numbers */}
              <div 
                style={{ borderColor: colors.border, color: colors.textMuted }}
                className="pr-4 select-none text-right font-mono border-r mr-4 space-y-0.5 opacity-50"
              >
                {(projectFiles[activeFile]?.content || '# Empty file').split('\n').map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>

              {/* Editable Code Canvas */}
              <textarea
                value={projectFiles[activeFile]?.content || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setProjectFiles(prev => {
                    const updated = {
                      ...prev,
                      [activeFile]: {
                        ...prev[activeFile],
                        content: val
                      }
                    };
                    const updatedProj = {
                      ...(allProjects[projectName] || {}),
                      files: updated
                    };
                    setAllProjects(pPrev => ({
                      ...pPrev,
                      [projectName]: updatedProj
                    }));
                    saveProjectToDatabase(projectName, updatedProj, activeFile, runtimeMetrics);
                    return updated;
                  });
                }}
                spellCheck={false}
                style={{ 
                  backgroundColor: colors.bgEditor, 
                  color: colors.textPrimary,
                  caretColor: colors.textCyan,
                  outline: 'none',
                  border: 'none',
                  boxShadow: 'none'
                }}
                className="flex-1 overflow-x-auto whitespace-pre font-normal font-mono outline-none focus:outline-none focus:ring-0 border-none shadow-none resize-none bg-transparent w-full h-full"
              />
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
            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-sm">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {msg.sender === 'user' ? (
                    <div 
                      style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                      className="border rounded-xl p-3 shadow-2xs font-normal"
                    >
                      <div className="leading-relaxed" style={{ color: colors.textPrimary }}>{msg.text}</div>
                    </div>
                  ) : (
                    <div 
                      style={{ backgroundColor: 'transparent' }}
                      className="px-1 py-1.5 space-y-2.5 font-normal"
                    >
                      <div className="leading-relaxed font-normal whitespace-pre-wrap font-sans" style={{ color: colors.textPrimary }}>
                        {msg.text}
                      </div>

                      {msg.toolCall && (
                        <div 
                          style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
                          className="border rounded-lg p-2.5 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-normal flex items-center gap-1 font-heading" style={{ color: colors.textPrimary }}>
                              <Check className="w-3 h-3" style={{ color: colors.textEmerald }} /> {msg.toolCall.name}
                            </span>
                            <span 
                              style={{ 
                                backgroundColor: colors.bgCard, 
                                borderColor: colors.border,
                                color: colors.textEmerald 
                              }}
                              className="font-mono px-1.5 py-0.5 rounded font-normal text-[9px] border"
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

              {isCopilotThinking && (
                <div 
                  style={{ backgroundColor: 'transparent' }}
                  className="p-3 space-y-1.5 animate-pulse font-normal"
                >
                  <div className="flex items-center gap-2 text-[10px] font-normal" style={{ color: colors.textCyan }}>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Quantum Copilot is inspecting `{activeFile}`, dispatching tools & compiling telemetry...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Copilot Input Box & Integrated Slash Shortcuts */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="p-3 border-t"
            >
              {/* Input Form with Integrated Slash Actions in Footer */}
              <div 
                style={{ backgroundColor: colors.bgInput, borderColor: colors.border }}
                className={`flex flex-col justify-between border rounded-xl p-2.5 transition-all shadow-2xs min-h-[82px] space-y-2 ${
                  isDark ? 'focus-within:border-[#444444]' : 'focus-within:border-[#CBD5E1]'
                }`}
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
                  placeholder="Ask Quantum Copilot or describe a quantum objective (e.g. optimize portfolio)..."
                  style={{ color: colors.textPrimary, outline: 'none', border: 'none', boxShadow: 'none' }}
                  className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm font-normal font-sans resize-none placeholder:opacity-40 leading-relaxed"
                />
                
                <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                  {/* Left: Quick Slash Action Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono font-normal">
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

                  {/* Right: Send Button */}
                  <button 
                    onClick={() => handleSendMessage()}
                    style={{ backgroundColor: colors.bgPill, color: colors.textCyan, borderColor: colors.border }}
                    className="px-3 py-1 rounded-md flex items-center gap-1.5 transition-opacity hover:opacity-80 shadow-2xs cursor-pointer border text-xs font-normal shrink-0"
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
                <h3 className="text-sm font-normal font-heading" style={{ color: colors.textCyan }}>Quantum Environment Settings</h3>
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
              
              {/* User Profile & Account */}
              <div className="space-y-2.5">
                <div className="text-xs font-normal uppercase tracking-wider font-heading" style={{ color: colors.textCyan }}>
                  User Profile & Account
                </div>
                <div 
                  style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
                  className="p-3.5 rounded-xl border flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      style={{ backgroundColor: colors.bgCard, color: colors.textCyan, borderColor: 'rgba(51, 168, 219, 0.4)' }}
                      className="w-10 h-10 rounded-full border flex items-center justify-center text-sm font-normal font-heading shrink-0"
                    >
                      QD
                    </div>
                    <div>
                      <div className="text-sm font-normal" style={{ color: colors.textPrimary }}>Quantum Dev</div>
                      <div className="text-xs font-mono" style={{ color: colors.textMuted }}>ms@qc.guru</div>
                    </div>
                  </div>
                  <span 
                    style={{ backgroundColor: colors.bgCard, color: colors.textEmerald, borderColor: colors.border }}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-md border font-normal"
                  >
                    Pro Developer
                  </span>
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-2.5">
                <div className="text-xs font-normal uppercase tracking-wider font-heading" style={{ color: colors.textCyan }}>
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
                    <div className="flex items-center gap-2 font-normal">
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
                    <div className="flex items-center gap-2 font-normal">
                      <Sun className="w-4 h-4" style={{ color: colors.textAmber }} />
                      <span>Light Theme</span>
                    </div>
                    {!isDark && <Check className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />}
                  </div>
                </div>
              </div>

              {/* AI Copilot Model */}
              <div style={{ borderColor: colors.border }} className="space-y-2.5 pt-2 border-t">
                <div className="text-xs font-normal uppercase tracking-wider font-heading" style={{ color: colors.textCyan }}>
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
                      <span className="font-normal" style={{ color: colors.textAmber }}>Groq (Llama-3.3)</span>
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
                      <span className="font-normal" style={{ color: colors.textAmber }}>RunPod (Qwen-27B)</span>
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
                  <div className="text-xs font-normal uppercase tracking-wider font-heading" style={{ color: colors.textCyan }}>
                    Target Execution Backend
                  </div>
                  <span 
                    style={{ 
                      backgroundColor: colors.bgPill, 
                      color: colors.textSkyBlue,
                      borderColor: colors.border 
                    }} 
                    className="text-[10px] font-mono px-2 py-0.5 rounded border font-normal"
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
                      <div className="text-xs font-normal" style={{ color: targetBackend === b.id ? colors.textCyan : colors.textPrimary }}>{b.label}</div>
                      <div className="text-[9px] font-sans mt-0.5" style={{ color: colors.textMuted }}>{b.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transpiler */}
              <div style={{ borderColor: colors.border }} className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-normal uppercase tracking-wider font-heading" style={{ color: colors.textCyan }}>
                    Compiler Optimization Level
                  </div>
                  <span 
                    style={{ 
                      backgroundColor: colors.bgPill, 
                      color: colors.textAmber, 
                      borderColor: colors.border 
                    }} 
                    className="font-mono text-xs font-normal px-2 py-0.5 rounded border"
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
                      className="py-1.5 rounded-md border text-xs font-normal transition-all cursor-pointer"
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
                className="px-4 py-1.5 font-normal text-xs rounded-lg border transition-opacity hover:opacity-80 cursor-pointer"
              >
                Apply & Close
              </button>
            </div>

          </div>
        </div>
      )}

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
                <h3 className="text-sm font-normal font-heading" style={{ color: colors.textCyan }}>Start a New Quantum Project</h3>
                <p className="text-[11px]" style={{ color: colors.textMuted }}>Choose a quantum scaffold or create a blank workspace</p>
              </div>
              <button 
                onClick={() => setIsNewProjectOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-75 transition-opacity cursor-pointer"
                style={{ color: colors.textMuted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Project Creation Form */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[65vh]">
              {/* 1. Project Name Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider" style={{ color: colors.textCyan }}>
                  Project Name
                </label>
                <input 
                  type="text"
                  placeholder="e.g. quantum-portfolio-qaoa"
                  value={customProjectInput}
                  onChange={(e) => setCustomProjectInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCustomProject(); }}
                  style={{ 
                    backgroundColor: colors.bgEditor, 
                    borderColor: colors.border, 
                    color: colors.textPrimary 
                  }}
                  className="w-full px-3 py-2 rounded-lg border text-xs font-mono outline-hidden focus:border-sky-500"
                  autoFocus
                />
                <p className="text-[10px] font-mono" style={{ color: colors.textMuted }}>
                  Will create an isolated workspace with main.py, quantum.config.json & MEMORY.md
                </p>
              </div>

              {/* 2. Template Scaffold Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-wider" style={{ color: colors.textCyan }}>
                  Select Quantum Scaffold
                </label>

                <div className="space-y-2">
                  {Object.entries(initialProjectTemplates).map(([key, tpl]) => (
                    <div
                      key={key}
                      onClick={() => setSelectedTemplateKey(key)}
                      style={{ 
                        backgroundColor: selectedTemplateKey === key ? colors.bgPill : colors.bgEditor, 
                        borderColor: selectedTemplateKey === key ? colors.textCyan : colors.border 
                      }}
                      className="p-3 rounded-lg border cursor-pointer transition-all flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-normal flex items-center gap-2" style={{ color: colors.textPrimary }}>
                          <span style={{ color: selectedTemplateKey === key ? colors.textCyan : colors.textPrimary }}>{tpl.title}</span>
                          {selectedTemplateKey === key && (
                            <span style={{ color: colors.textEmerald }} className="text-[10px] font-mono">[Selected]</span>
                          )}
                        </div>
                        <p className="text-[11px] leading-relaxed" style={{ color: colors.textMuted }}>
                          {tpl.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: colors.border }}>
                <button
                  onClick={() => setIsNewProjectOpen(false)}
                  style={{ borderColor: colors.border, color: colors.textMuted }}
                  className="px-3 py-1.5 rounded-lg border text-xs font-mono hover:bg-neutral-800/40 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustomProject}
                  style={{ backgroundColor: colors.bgPill, borderColor: colors.textCyan, color: colors.textCyan }}
                  className="px-4 py-1.5 rounded-lg border text-xs font-mono hover:opacity-80 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" style={{ color: colors.textAmber }} />
                  <span>Create & Open Project</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
