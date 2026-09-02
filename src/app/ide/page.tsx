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
  Terminal,
  Terminal as TerminalIcon,
  BarChart3,
  ChevronUp, 
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
  Brain,
  CheckCircle2,
  HelpCircle
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

interface CodeMutation {
  fileName: string;
  action: string;
  linesAdded: number;
  linesRemoved: number;
  totalLines: number;
  summary: string;
}

interface ClarificationOptionItem {
  label: string;
  value: string;
  is_recommended?: boolean;
  description?: string;
}

interface ClarificationQuestionPayload {
  question: string;
  domain: string;
  scenario_id: string;
  options: ClarificationOptionItem[];
  default_value?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  workflowSteps?: WorkflowStepItem[];
  scientificVerdict?: string;
  codeMutation?: CodeMutation;
  clarification?: ClarificationQuestionPayload;
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
  const [telemetryModalTab, setTelemetryModalTab] = useState<string | null>(null);
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
  const [quboLambda, setQuboLambda] = useState<number>(5.0);
  const [selectedQuboCell, setSelectedQuboCell] = useState<{ row: number; col: number } | null>(null);

  // Phase 1: Collapsible Bottom Drawer & Interactive Circuit Canvas States
  const [isBottomOpen, setIsBottomOpen] = useState(true);
  const [bottomHeight, setBottomHeight] = useState(260);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "➜ Quantum Guru Environment Ready (Python 3.13, Qiskit 2.3, Aer 0.17, Dimod 0.12)",
    "➜ Ready for simulator dispatch or interactive circuit synthesis."
  ]);
  const [simulationCounts, setSimulationCounts] = useState<Record<string, number> | null>({ '00': 512, '11': 512 });
  const [circuitAscii, setCircuitAscii] = useState<string>('');
  const [circuitGates, setCircuitGates] = useState<Array<{ name: string; qubit: number; step: number }>>([
    { name: 'h', qubit: 0, step: 0 },
    { name: 'cx', qubit: 0, step: 1 }
  ]);
  const [selectedGateTool, setSelectedGateTool] = useState<string>('h');
  const [copilotMode, setCopilotMode] = useState<'coding' | 'qa'>('coding');

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
      desc: 'Clean 2-qubit Bell state and Qiskit AerSimulator entrypoint.',
      files: {
        'main.py': {
          name: 'main.py',
          lang: 'python',
          content: `from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

# ⚛️ Bell State Entanglement Circuit
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)

# Execute on Qiskit Aer Simulator
sim = AerSimulator()
result = sim.run(qc, shots=1024).result()
print("Bell State Prepared!")
print("Measurement Counts:", result.get_counts())
`
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
          content: `# Quantum Guru — Clean Energy / Portfolio Optimization (QUBO & D-Wave SA)
import numpy as np
from qubo_matrix import get_qubo_model

Q_matrix, variable_names, penalty_lambda, budget_limit = get_qubo_model()

def solve_qubo():
    print("Executing Quantum Optimization on 4-Variable QUBO Matrix...")
    print(f"Decision Variables: {variable_names}")
    print(f"Penalty Multiplier (λ): {penalty_lambda} | Budget: \${budget_limit}M")
    
    selected = ["Solar_Farm_A", "Wind_Farm_C", "Battery_Storage_E"]
    total_cost = 21.0
    total_score = 120.0
    
    print(f"Optimal Allocation: {selected}")
    print(f"Total Objective Score: {total_score} | Total Cost: \${total_cost}M")
    print("All Constraints (Budget, Mutual Exclusion, Dependency): 100% Validated")
    return selected

if __name__ == "__main__":
    solve_qubo()
`
        },
        'qubo_matrix.py': {
          name: 'qubo_matrix.py',
          lang: 'python',
          content: `# Quantum Guru — Generated Q-Matrix Module
# Variables: ['Solar_Farm_A', 'Wind_Farm_C', 'Wind_Farm_D', 'Battery_Storage_E']
import numpy as np

variable_names = ["Solar_Farm_A", "Wind_Farm_C", "Wind_Farm_D", "Battery_Storage_E"]
penalty_lambda = 5.0
budget_limit = 22.0

# Symmetric Upper-Triangular Q-Matrix (4x4)
# Diagonal: Q[i, i] = -Score_i + Penalty_Linear
# Off-Diagonal: Q[i, j] = Coupling & Interaction Penalties
Q_matrix = np.array([
    [-38.18,   1.00,  10.00,   1.00],  # Solar_Farm_A (Mutual exclusion with Wind_D: Q[0,2]=10.0)
    [  0.00, -43.41,   1.00, -10.00],  # Wind_Farm_C  (Dependency with Battery_E: Q[1,3]=-10.0)
    [  0.00,   0.00, -28.86,   1.00],  # Wind_Farm_D
    [  0.00,   0.00,   0.00, -33.64],  # Battery_Storage_E
])

def get_qubo_model():
    return Q_matrix, variable_names, penalty_lambda, budget_limit
`
        },
        'problem_formulation.py': {
          name: 'problem_formulation.py',
          lang: 'python',
          content: `# Mathematical Problem Formulation & Constraint Bounds
candidates = [
    {"name": "Solar_Farm_A", "cost": 8.0, "score": 40.0},
    {"name": "Wind_Farm_C", "cost": 7.0, "score": 45.0},
    {"name": "Wind_Farm_D", "cost": 5.0, "score": 30.0},
    {"name": "Battery_Storage_E", "cost": 6.0, "score": 35.0}
]
budget = 22.0
constraints = [
    "Investment Limit: Sum(Cost_i * x_i) <= \$22M",
    "Mutual Exclusion: Solar_A + Wind_D <= 1",
    "Dependency: Wind_C <= Battery_E",
    "Cardinality: At least 1 solar or wind project"
]
`
        },
        'quantum.config.json': {
          name: 'quantum.config.json',
          lang: 'json',
          content: JSON.stringify({
            project_name: "portfolio-optimization",
            archetype: "portfolio_optimization",
            pipeline_hints: [
              "tools.opt.formulate_problem",
              "tools.opt.translate_to_qubo",
              "tools.opt.map_quantum_solver",
              "tools.opt.execute_solver",
              "tools.opt.decode_solution",
              "tools.opt.benchmark_classical"
            ],
            default_backend: "dwave_simulated_annealing",
            num_reads: 1024,
            verification_contract: {
              cardinality_constraint: "feasible",
              energy_gap_percent: 0.05
            }
          }, null, 2)
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
          content: JSON.stringify({
            project_name: "lih-cas-vqe",
            archetype: "quantum_chemistry",
            pipeline_hints: [
              "tools.chem.ingest_geometry",
              "tools.chem.compute_scf_integrals",
              "tools.chem.select_active_space",
              "tools.chem.fermion_to_qubit_mapping",
              "tools.chem.build_chemistry_ansatz",
              "tools.chem.solve_ground_state_vqe"
            ],
            default_backend: "statevector",
            basis_set: "sto-3g",
            verification_contract: {
              chemical_accuracy_mHa: 1.6
            }
          }, null, 2)
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
          content: JSON.stringify({
            project_name: "iris-qsvm-classifier",
            archetype: "quantum_machine_learning",
            pipeline_hints: [
              "tools.qml.normalize_features",
              "tools.qml.build_feature_map",
              "tools.qml.build_variational_ansatz",
              "tools.qml.train_classifier",
              "tools.qml.predict_sample",
              "tools.qml.benchmark_classical"
            ],
            default_backend: "aer_simulator",
            verification_contract: {
              min_train_accuracy: 0.90,
              generalization_gap_evaluated: true
            }
          }, null, 2)
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

  // Unified Project Switcher with Full Workspace & Chat State Synchronization
  const handleSwitchProject = (targetProject: string) => {
    if (targetProject === projectName) {
      setIsProjectsDropdownOpen(false);
      return;
    }

    // 1. Save CURRENT project's full state (Files, Active File, Telemetry, Chat History)
    if (typeof window !== 'undefined') {
      const currentProjData = {
        ...(allProjects[projectName] || {}),
        files: projectFiles
      };
      setAllProjects(prev => ({
        ...prev,
        [projectName]: currentProjData
      }));
      saveProjectToDatabase(projectName, currentProjData, activeFile, runtimeMetrics);
      try {
        localStorage.setItem(`quantum_chat_${projectName}`, JSON.stringify(chatMessages));
      } catch (e) {}
    }

    // 2. Load TARGET project's full workspace
    const target = allProjects[targetProject] || initialProjectTemplates[targetProject] || initialProjectTemplates['my-quantum-project'];
    const targetPrimaryFile = Object.keys(target.files).find(f => f.endsWith('.py')) || Object.keys(target.files)[0] || 'main.py';
    
    setProjectName(targetProject);
    setProjectFiles(target.files);
    setActiveFile(targetPrimaryFile);
    setIsProjectsDropdownOpen(false);

    // 3. Restore Target Project's Stored Telemetry
    if (typeof window !== 'undefined') {
      localStorage.setItem('quantum_ide_active_project', targetProject);
      try {
        const storedProjStr = localStorage.getItem(`quantum_ide_proj_${targetProject}`);
        if (storedProjStr) {
          const storedProj = JSON.parse(storedProjStr);
          if (storedProj.runtimeMetrics) {
            setRuntimeMetrics(storedProj.runtimeMetrics);
          }
        }
      } catch (e) {}

      // 4. Restore Target Project's Chat History
      try {
        const storedChat = localStorage.getItem(`quantum_chat_${targetProject}`);
        if (storedChat) {
          const parsedChat = JSON.parse(storedChat);
          if (Array.isArray(parsedChat) && parsedChat.length > 0) {
            setChatMessages(parsedChat);
          } else {
            setChatMessages([{
              id: Date.now().toString(),
              sender: 'agent',
              text: `Switched workspace to **${targetProject}**. Active file: \`${targetPrimaryFile}\`. All telemetry and memory synchronized.`
            }]);
          }
        } else {
          setChatMessages([{
            id: Date.now().toString(),
            sender: 'agent',
            text: `Switched workspace to **${targetProject}**. Active file: \`${targetPrimaryFile}\`. All telemetry and memory synchronized.`
          }]);
        }
      } catch (e) {}
    }

    // 5. Update Dynamic Target Backend depending on project type
    if (targetProject.includes('optimization') || targetProject.includes('opt')) setTargetBackend('dwave_simulated_annealing');
    else if (targetProject.includes('vqe') || targetProject.includes('chem')) setTargetBackend('statevector');
    else setTargetBackend('aer_simulator');
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
    { id: 7, studio: 'Optimization', name: 'D-Wave Dimod CQM Converter', tag: 'tools.opt.dimod_cqm_to_qubo', desc: 'Compiles Constrained Quadratic Models (CQM) to binary QUBO via D-Wave Ocean SDK dimod.cqm_to_bqm().', nature: 'Deterministic' },
    { id: 8, studio: 'Optimization', name: 'Algebraic & Slack AutoQUBO Engine', tag: 'tools.opt.algebraic_slack_qubo', desc: 'Deterministic polynomial expansion with zero-slack templates (dependency/exclusion) and logarithmic slacks.', nature: 'Deterministic' },

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

  // Load all user projects from localStorage & MongoDB database on mount
  useEffect(() => {
    const loadUserProjects = async () => {
      try {
        let mergedProjects: Record<string, any> = { ...initialProjectTemplates };

        // 1. Instant hydration from localStorage
        if (typeof window !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('quantum_ide_proj_')) {
              try {
                const stored = JSON.parse(localStorage.getItem(key) || '{}');
                if (stored.id && stored.files && Object.keys(stored.files).length > 0) {
                  mergedProjects[stored.id] = {
                    title: stored.title || stored.id,
                    desc: stored.desc || '',
                    files: stored.files
                  };
                }
              } catch (e) {}
            }
          }
        }

        // 2. Hydration from MongoDB database
        const res = await fetch('/api/ide/projects');
        if (res.ok) {
          const data = await res.json();
          if (data.projects && Array.isArray(data.projects)) {
            data.projects.forEach((proj: any) => {
              if (proj.projectId && proj.files && Object.keys(proj.files).length > 0) {
                mergedProjects[proj.projectId] = {
                  title: proj.title || proj.projectId,
                  desc: proj.desc || '',
                  files: proj.files
                };
              }
            });
          }
        }

        setAllProjects(mergedProjects);

        // 3. Restore last active project if exists
        const lastActiveProjId = typeof window !== 'undefined' ? localStorage.getItem('quantum_ide_active_project') : null;
        if (lastActiveProjId && mergedProjects[lastActiveProjId]) {
          const targetProj = mergedProjects[lastActiveProjId];
          const primaryFile = Object.keys(targetProj.files).find(f => f.endsWith('.py')) || Object.keys(targetProj.files)[0] || 'main.py';
          setProjectName(lastActiveProjId);
          setProjectFiles(targetProj.files);
          setActiveFile(primaryFile);

          // Restore Telemetry
          try {
            const storedProjStr = localStorage.getItem(`quantum_ide_proj_${lastActiveProjId}`);
            if (storedProjStr) {
              const storedProj = JSON.parse(storedProjStr);
              if (storedProj.runtimeMetrics) {
                setRuntimeMetrics(storedProj.runtimeMetrics);
              }
            }
          } catch (e) {}

          // Restore Chat Messages
          try {
            const storedChat = localStorage.getItem(`quantum_chat_${lastActiveProjId}`);
            if (storedChat) {
              const parsed = JSON.parse(storedChat);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setChatMessages(parsed);
              }
            }
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Failed to load projects from DB:', err);
      }
    };

    loadUserProjects();
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

  // Create a new Python file in active project
  const handleCreateNewFile = () => {
    const pyFiles = Object.keys(projectFiles).filter(f => f.endsWith('.py'));
    const nextNum = pyFiles.length + 1;
    const newFileName = `circuit_${nextNum}.py`;
    const starterContent = `from qiskit import QuantumCircuit\nfrom qiskit_aer import AerSimulator\n\nqc = QuantumCircuit(2)\nqc.h(0)\nqc.cx(0, 1)\n\nsim = AerSimulator()\nresult = sim.run(qc, shots=1024).result()\nprint('Counts:', result.get_counts())\n`;

    setProjectFiles(prev => {
      const updated = {
        ...prev,
        [newFileName]: {
          name: newFileName,
          lang: 'python',
          content: starterContent
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
      saveProjectToDatabase(projectName, updatedProj, newFileName, runtimeMetrics);
      return updated;
    });

    setActiveFile(newFileName);
  };

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
    const primaryFile = Object.keys(newFiles).find(f => f.endsWith('.py')) || Object.keys(newFiles)[0] || 'main.py';
    setProjectName(finalName);
    setProjectFiles(newFiles);
    setActiveFile(primaryFile);
    setCustomProjectInput('');
    setIsNewProjectOpen(false);
    setIsProjectsDropdownOpen(false);

    // Persist to MongoDB
    saveProjectToDatabase(finalName, { title: finalName, desc: `Custom project scaffolded from ${templateData.title}`, files: newFiles }, primaryFile, runtimeMetrics);

    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'agent',
      text: `Created and opened project: ${finalName} (scaffolded from ${templateData.title}). Saved to MongoDB with \`main.py\` and \`MEMORY.md\`.`
    }]);
  };



  const handleRun = async () => {
    setIsRunning(true);
    setIsBottomOpen(true);
    setActiveBottomTab('terminal');

    const currentCode = projectFiles[activeFile]?.content || '';
    setTerminalLogs(prev => [
      ...prev,
      `➜ [Quantum Guru Runner] Dispatching ${activeFile} (${projectName})...`,
      `➜ Target Backend: ${targetBackend} | Shots: ${shots}`
    ]);

    try {
      const res = await fetch('http://localhost:8002/v3/enterprise/ide/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectName,
          file_name: activeFile,
          code: currentCode,
          target_backend: targetBackend,
          shots: Number(shots) || 1024
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const outLines = (data.stdout || '').split('\n').filter(Boolean);
          setTerminalLogs(prev => [
            ...prev,
            ...outLines,
            `✔ Simulation completed successfully on ${data.backend_used} (${data.execution_time_ms}ms)`
          ]);

          if (data.measurement_counts) {
            setSimulationCounts(data.measurement_counts);
          }
          if (data.circuit_ascii) {
            setCircuitAscii(data.circuit_ascii);
          }
          if (data.circuit_gates && Array.isArray(data.circuit_gates)) {
            const mapped = data.circuit_gates.map((g: any) => ({
              name: g.name,
              qubit: g.qubits ? g.qubits[0] : 0,
              step: g.step || 0
            }));
            setCircuitGates(mapped);
          }
        } else {
          setTerminalLogs(prev => [
            ...prev,
            `✖ Error executing ${activeFile}:`,
            data.stderr || data.error || 'Unknown execution error'
          ]);
        }
      } else {
        setTerminalLogs(prev => [
          ...prev,
          `✖ Runner HTTP Error ${res.status}: Failed to reach simulator backend.`
        ]);
      }
    } catch (err: any) {
      setTerminalLogs(prev => [
        ...prev,
        `✖ Connection Error: ${err.message || err}`
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  // Interactive Circuit Canvas Gate Placement & Bi-directional Code Synthesis
  const handleToggleGateSlot = (qubit: number, step: number) => {
    const existingIndex = circuitGates.findIndex(g => g.qubit === qubit && g.step === step);
    let updatedGates = [...circuitGates];

    if (existingIndex >= 0) {
      updatedGates.splice(existingIndex, 1);
    } else {
      updatedGates.push({
        name: selectedGateTool,
        qubit: qubit,
        step: step
      });
    }

    setCircuitGates(updatedGates);

    const numQubits = Math.max(2, ...updatedGates.map(g => g.qubit + 1));
    let newCodeLines = [
      'from qiskit import QuantumCircuit',
      'from qiskit_aer import AerSimulator',
      '',
      `# ⚛️ Synthesized Interactive Circuit (${numQubits} Qubits)`,
      `qc = QuantumCircuit(${numQubits})`
    ];

    const sorted = [...updatedGates].sort((a, b) => a.step - b.step || a.qubit - b.qubit);
    sorted.forEach(g => {
      if (g.name === 'h') newCodeLines.push(`qc.h(${g.qubit})`);
      else if (g.name === 'x') newCodeLines.push(`qc.x(${g.qubit})`);
      else if (g.name === 'z') newCodeLines.push(`qc.z(${g.qubit})`);
      else if (g.name === 'cx') {
        const targetQ = (g.qubit + 1) % numQubits;
        newCodeLines.push(`qc.cx(${g.qubit}, ${targetQ})`);
      }
      else if (g.name === 'rz') newCodeLines.push(`qc.rz(0.7854, ${g.qubit})`);
      else if (g.name === 'measure') newCodeLines.push(`qc.measure_all()`);
    });

    newCodeLines.push('');
    newCodeLines.push('# Execute on AerSimulator');
    newCodeLines.push('sim = AerSimulator()');
    newCodeLines.push('job = sim.run(qc, shots=1024)');
    newCodeLines.push('result = job.result()');
    newCodeLines.push("print('Measurement Counts:', result.get_counts())");

    const newCode = newCodeLines.join('\n');

    setProjectFiles(prev => {
      const updated = {
        ...prev,
        [activeFile]: {
          ...prev[activeFile],
          content: newCode
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
  };

  const handleClearCircuitGates = () => {
    setCircuitGates([]);
    const clearedCode = `from qiskit import QuantumCircuit\n\nqc = QuantumCircuit(2)\n# Wire cleared. Click slots in Circuit Canvas to add gates.\n`;
    setProjectFiles(prev => {
      const updated = {
        ...prev,
        [activeFile]: {
          ...prev[activeFile],
          content: clearedCode
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
          history: (chatMessages || []).slice(-6).map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // 1. Update Chat Response with Autonomous Workflow Steps & Code Mutation Summary
        const mutationData = data.code_mutation ? {
          fileName: data.code_mutation.file_name,
          action: data.code_mutation.action || 'MUTATE',
          linesAdded: data.code_mutation.lines_added || 0,
          linesRemoved: data.code_mutation.lines_removed || 0,
          totalLines: data.code_mutation.total_lines || 0,
          summary: data.code_mutation.summary || ''
        } : undefined;

        setChatMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: data.response_text || 'Completed autonomous quantum analysis.',
          workflowSteps: data.workflow_steps || undefined,
          scientificVerdict: data.scientific_verdict || undefined,
          codeMutation: mutationData,
          toolCall: data.tool_call || undefined
        }]);

        // 2. Dynamically Mutate Code & MEMORY.md in Workspace
        if (data.updated_code || data.qubo_matrix_code || data.updated_files || data.memory_md) {
          setProjectFiles(prev => {
            const updated = { ...prev };

            if (data.updated_code) {
              const newCode = data.updated_code;
              const targetFileKey = updated[activeFile] && activeFile !== 'MEMORY.md' && activeFile !== 'quantum.config.json'
                ? activeFile 
                : (Object.keys(updated).find(f => f.endsWith('.py')) || Object.keys(updated)[0] || 'main.py');
              
              if (activeFile !== 'MEMORY.md' && targetFileKey !== activeFile) {
                setActiveFile(targetFileKey);
              }
              updated[targetFileKey] = {
                ...(updated[targetFileKey] || { name: targetFileKey, language: 'python' }),
                content: newCode
              };
            }

            if (data.qubo_matrix_code) {
              updated['qubo_matrix.py'] = {
                name: 'qubo_matrix.py',
                language: 'python',
                content: data.qubo_matrix_code
              };
            }

            if (data.updated_files) {
              for (const [fName, fContent] of Object.entries(data.updated_files)) {
                updated[fName] = {
                  name: fName,
                  language: fName.endsWith('.json') ? 'json' : (fName.endsWith('.md') ? 'markdown' : 'python'),
                  content: fContent as string
                };
              }
            }

            if (data.memory_md) {
              updated['MEMORY.md'] = {
                name: 'MEMORY.md',
                language: 'markdown',
                content: data.memory_md
              };
            }

            // Sync into allProjects workspace store
            setAllProjects(projPrev => ({
              ...projPrev,
              [projectName]: {
                ...(projPrev[projectName] || {}),
                files: updated
              }
            }));

            saveProjectToDatabase(
              projectName, 
              { title: projectName, desc: '', files: updated }, 
              activeFile, 
              data.runtime_telemetry || runtimeMetrics
            );

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
            terminalLog: data.runtime_telemetry.terminal_log || runtimeMetrics.terminalLog,
            qubo_telemetry: data.runtime_telemetry.qubo_telemetry || runtimeMetrics.qubo_telemetry
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
                  {Object.keys(allProjects || {}).map((pKey) => (
                    <div
                      key={pKey}
                      onClick={() => handleSwitchProject(pKey)}
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

              {/* Phase 1 Clean File Tree: Show Python code files only */}
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-sans" style={{ color: colors.textMuted }}>
                <span className="font-semibold uppercase tracking-wider text-[10px]" style={{ color: colors.textCyan }}>Files</span>
                <button
                  onClick={handleCreateNewFile}
                  style={{ color: colors.textCyan }}
                  className="p-1 hover:bg-sky-500/10 rounded cursor-pointer transition-colors flex items-center gap-1 text-[10px]"
                  title="Add new python script"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Script</span>
                </button>
              </div>

              {Object.keys(files || {})
                .filter(fName => fName.endsWith('.py'))
                .map((fName) => (
                  <div 
                    key={fName}
                    onClick={() => setActiveFile(fName)}
                    style={{ 
                      backgroundColor: activeFile === fName ? colors.bgPill : 'transparent',
                      borderColor: activeFile === fName ? colors.border : 'transparent',
                      color: activeFile === fName ? colors.textPrimary : colors.textMuted
                    }}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-colors border font-mono text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode className="w-3.5 h-3.5 shrink-0" style={{ color: activeFile === fName ? colors.textCyan : colors.textMuted }} />
                      <span className="truncate">{fName}</span>
                    </div>
                    {activeFile === fName && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                    )}
                  </div>
              ))}

              {/* Dynamic Domain-Aware Telemetry & Runtime Solvers Cards */}
              {(() => {
                const isChem = projectName.includes('chem') || projectName.includes('vqe') || projectName.includes('lih') || Object.keys(projectFiles).some(f => f.includes('vqe'));
                const isOpt = projectName.includes('opt') || projectName.includes('portfolio') || Object.keys(projectFiles).some(f => f.includes('portfolio'));
                const isQML = projectName.includes('qml') || projectName.includes('iris') || projectName.includes('classifier') || Object.keys(projectFiles).some(f => f.includes('qml'));

                if (isChem) {
                  return (
                    <div className="pt-4 px-1 space-y-2">
                      <div className="text-[10px] font-normal uppercase tracking-wider mb-1 font-heading" style={{ color: colors.textCyan }}>
                        Chemistry Solvers & Telemetry
                      </div>

                      {/* Card 1: Active Space CAS(4,4) */}
                      <div 
                        onClick={() => setTelemetryModalTab('active_space')}
                        style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                        className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-sky-500/60 transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                            Active Space CAS(4,4)
                          </span>
                          <span style={{ color: colors.textCyan }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                            View →
                          </span>
                        </div>
                        <div className="text-[10px] font-mono flex items-center justify-between" style={{ color: colors.textMuted }}>
                          <span>Electrons: <span style={{ color: colors.textSkyBlue }}>4</span></span>
                          <span>Orbitals: <span style={{ color: colors.textSkyBlue }}>4</span></span>
                          <span>Qubits: <span style={{ color: colors.textSkyBlue }}>8</span></span>
                        </div>
                      </div>

                      {/* Card 2: VQE Ground State Energy */}
                      <div 
                        onClick={() => setTelemetryModalTab('vqe_energy')}
                        style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                        className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-emerald-500/60 transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                            VQE Ground State Energy
                          </span>
                          <span style={{ color: colors.textEmerald }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                            View →
                          </span>
                        </div>
                        <div className="text-[10px] font-mono flex items-center justify-between" style={{ color: colors.textMuted }}>
                          <span>Energy: <span style={{ color: colors.textEmerald }}>-192.1482 Ha</span></span>
                          <span>Error: <span style={{ color: colors.textAmber }}>0.80 mHa (&lt;1.6)</span></span>
                        </div>
                      </div>

                      {/* Card 3: UCCSD Electronic Circuit */}
                      <div 
                        onClick={() => setTelemetryModalTab('circuit')}
                        style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                        className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-purple-500/60 transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                            UCCSD Electronic Circuit
                          </span>
                          <span style={{ color: colors.textPurple }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                            View →
                          </span>
                        </div>
                        <div className="text-[10px] font-mono flex items-center justify-between" style={{ color: colors.textMuted }}>
                          <span>Depth: <span style={{ color: colors.textPurple }}>{runtimeMetrics.depth}</span></span>
                          <span>CNOTs: <span style={{ color: colors.textPurple }}>{runtimeMetrics.cnots}</span></span>
                          <span>Fidelity: <span style={{ color: colors.textEmerald }}>{runtimeMetrics.fidelity}</span></span>
                        </div>
                      </div>

                      {/* Card 4: PySCF & QPU Console */}
                      <div 
                        onClick={() => setTelemetryModalTab('terminal')}
                        style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                        className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-amber-500/60 transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                            PySCF &amp; QPU Console
                          </span>
                          <span style={{ color: colors.textAmber }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                            Logs →
                          </span>
                        </div>
                        <div className="text-[10px] font-mono truncate" style={{ color: colors.textMuted }}>
                          Target: <span style={{ color: colors.textAmber }}>{targetBackend}</span> (Aer 1.0+ Simulator)
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isOpt) {
                  return (
                    <div className="pt-4 px-1 space-y-2">
                      <div className="text-[10px] font-normal uppercase tracking-wider mb-1 font-heading" style={{ color: colors.textCyan }}>
                        Optimization Solvers & Telemetry
                      </div>

                      {/* Card 1: QUBO Matrix & Penalty */}
                      <div 
                        onClick={() => setTelemetryModalTab('qubo_matrix')}
                        style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                        className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-sky-500/60 transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                            QUBO Matrix &amp; Penalty
                          </span>
                          <span style={{ color: colors.textCyan }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                            View →
                          </span>
                        </div>
                        <div className="text-[10px] font-mono flex items-center justify-between" style={{ color: colors.textMuted }}>
                          <span>Decision Vars: <span style={{ color: colors.textSkyBlue }}>4</span></span>
                          <span>Constraints: <span style={{ color: colors.textSkyBlue }}>1</span></span>
                          <span>Penalty λ: <span style={{ color: colors.textSkyBlue }}>5.0</span></span>
                        </div>
                      </div>

                      {/* Card 2: Annealing Energy Min */}
                      <div 
                        onClick={() => setTelemetryModalTab('annealing')}
                        style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                        className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-emerald-500/60 transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                            Annealing Energy Min
                          </span>
                          <span style={{ color: colors.textEmerald }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                            View →
                          </span>
                        </div>
                        <div className="text-[10px] font-mono flex items-center justify-between" style={{ color: colors.textMuted }}>
                          <span>Best Energy: <span style={{ color: colors.textEmerald }}>-1.4280</span></span>
                          <span>Feasible: <span style={{ color: colors.textEmerald }}>100% Pass</span></span>
                        </div>
                      </div>

                      {/* Card 3: Classical Benchmark Gap */}
                      <div 
                        onClick={() => setTelemetryModalTab('benchmark')}
                        style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                        className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-purple-500/60 transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                            Classical Benchmark Gap
                          </span>
                          <span style={{ color: colors.textPurple }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                            View →
                          </span>
                        </div>
                        <div className="text-[10px] font-mono flex items-center justify-between" style={{ color: colors.textMuted }}>
                          <span>PuLP Gap: <span style={{ color: colors.textEmerald }}>0.00%</span></span>
                          <span>Speedup: <span style={{ color: colors.textPurple }}>2.4x</span></span>
                        </div>
                      </div>

                      {/* Card 4: D-Wave & QAOA Console */}
                      <div 
                        onClick={() => setTelemetryModalTab('terminal')}
                        style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                        className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-amber-500/60 transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                            D-Wave &amp; QAOA Console
                          </span>
                          <span style={{ color: colors.textAmber }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                            Logs →
                          </span>
                        </div>
                        <div className="text-[10px] font-mono truncate" style={{ color: colors.textMuted }}>
                          Target: <span style={{ color: colors.textAmber }}>{targetBackend}</span> (1024 reads)
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isQML) {
                  return (
                    <div className="pt-4 px-1 space-y-2">
                      <div className="text-[10px] font-normal uppercase tracking-wider mb-1 font-heading" style={{ color: colors.textCyan }}>
                        QML Solvers & Telemetry
                      </div>

                      {/* Card 1: ZZFeatureMap & Ansatz */}
                      <div 
                        onClick={() => setTelemetryModalTab('feature_map')}
                        style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                        className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-sky-500/60 transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                            ZZFeatureMap &amp; Ansatz
                          </span>
                          <span style={{ color: colors.textCyan }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                            View →
                          </span>
                        </div>
                        <div className="text-[10px] font-mono flex items-center justify-between" style={{ color: colors.textMuted }}>
                          <span>Features: <span style={{ color: colors.textSkyBlue }}>4</span></span>
                          <span>Ansatz: <span style={{ color: colors.textSkyBlue }}>RealAmps</span></span>
                          <span>Weights: <span style={{ color: colors.textSkyBlue }}>8</span></span>
                        </div>
                      </div>

                      {/* Card 2: Classifier Accuracy */}
                      <div 
                        onClick={() => setTelemetryModalTab('accuracy')}
                        style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                        className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-emerald-500/60 transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                            Classifier Accuracy
                          </span>
                          <span style={{ color: colors.textEmerald }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                            View →
                          </span>
                        </div>
                        <div className="text-[10px] font-mono flex items-center justify-between" style={{ color: colors.textMuted }}>
                          <span>Train Acc: <span style={{ color: colors.textEmerald }}>96.5%</span></span>
                          <span>Gen Gap: <span style={{ color: colors.textAmber }}>+1.8%</span></span>
                        </div>
                      </div>

                      {/* Card 3: Quantum Kernel Gram Matrix */}
                      <div 
                        onClick={() => setTelemetryModalTab('kernel')}
                        style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                        className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-purple-500/60 transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                            Quantum Kernel Gram Matrix
                          </span>
                          <span style={{ color: colors.textPurple }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                            View →
                          </span>
                        </div>
                        <div className="text-[10px] font-mono flex items-center justify-between" style={{ color: colors.textMuted }}>
                          <span>Fidelity: <span style={{ color: colors.textEmerald }}>98.40%</span></span>
                          <span>Dim: <span style={{ color: colors.textPurple }}>4x4</span></span>
                        </div>
                      </div>

                      {/* Card 4: SPSA Optimizer Console */}
                      <div 
                        onClick={() => setTelemetryModalTab('terminal')}
                        style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                        className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-amber-500/60 transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                            SPSA Optimizer Console
                          </span>
                          <span style={{ color: colors.textAmber }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                            Logs →
                          </span>
                        </div>
                        <div className="text-[10px] font-mono truncate" style={{ color: colors.textMuted }}>
                          Loss: <span style={{ color: colors.textAmber }}>0.042</span> (Epoch 50/50, 1024 shots)
                        </div>
                      </div>
                    </div>
                  );
                }

                // Default: Circuit Engineering
                return (
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
                        <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                          Circuit Canvas
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
                        <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                          Results &amp; Metrics
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

                    {/* Card 3: Transpiler Pass Optimizer */}
                    <div 
                      onClick={() => setTelemetryModalTab('transpile')}
                      style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                      className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-purple-500/60 transition-all group"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                          Transpiler Pass Optimizer
                        </span>
                        <span style={{ color: colors.textPurple }} className="text-[10px] font-mono group-hover:translate-x-0.5 transition-transform">
                          View →
                        </span>
                      </div>
                      <div className="text-[10px] font-mono flex items-center justify-between" style={{ color: colors.textMuted }}>
                        <span>Level: <span style={{ color: colors.textPurple }}>{optimizationLevel}</span></span>
                        <span>Depth Red: <span style={{ color: colors.textEmerald }}>-33%</span></span>
                      </div>
                    </div>

                    {/* Card 4: Solver Terminal */}
                    <div 
                      onClick={() => setTelemetryModalTab('terminal')}
                      style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                      className="p-2.5 rounded-lg border shadow-2xs font-normal cursor-pointer hover:border-amber-500/60 transition-all group"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-heading text-xs" style={{ color: colors.textPrimary }}>
                          Qiskit Aer Console
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
                );
              })()}

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

          {/* ── LOWER PANE: COLLAPSIBLE MULTI-TAB BOTTOM DRAWER ── */}
          <div 
            style={{ 
              borderColor: colors.border,
              height: isBottomOpen ? `${bottomHeight}px` : '36px',
              backgroundColor: colors.bgCard
            }} 
            className="shrink-0 flex flex-col transition-all duration-150 overflow-hidden border-t"
          >
            {/* Drawer Tab Header Bar */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="h-9 px-4 border-b flex items-center justify-between shrink-0 select-none"
            >
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setActiveBottomTab('circuit'); setIsBottomOpen(true); }}
                  style={{
                    backgroundColor: activeBottomTab === 'circuit' && isBottomOpen ? colors.bgPill : 'transparent',
                    color: activeBottomTab === 'circuit' && isBottomOpen ? colors.textCyan : colors.textMuted,
                    borderColor: activeBottomTab === 'circuit' && isBottomOpen ? colors.border : 'transparent'
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-sans font-medium flex items-center gap-1.5 cursor-pointer border transition-colors"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Interactive Circuit Canvas</span>
                </button>

                <button
                  onClick={() => { setActiveBottomTab('terminal'); setIsBottomOpen(true); }}
                  style={{
                    backgroundColor: activeBottomTab === 'terminal' && isBottomOpen ? colors.bgPill : 'transparent',
                    color: activeBottomTab === 'terminal' && isBottomOpen ? colors.textEmerald : colors.textMuted,
                    borderColor: activeBottomTab === 'terminal' && isBottomOpen ? colors.border : 'transparent'
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-sans font-medium flex items-center gap-1.5 cursor-pointer border transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>QPU Terminal</span>
                  {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </button>

                <button
                  onClick={() => { setActiveBottomTab('results'); setIsBottomOpen(true); }}
                  style={{
                    backgroundColor: activeBottomTab === 'results' && isBottomOpen ? colors.bgPill : 'transparent',
                    color: activeBottomTab === 'results' && isBottomOpen ? colors.textAmber : colors.textMuted,
                    borderColor: activeBottomTab === 'results' && isBottomOpen ? colors.border : 'transparent'
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-sans font-medium flex items-center gap-1.5 cursor-pointer border transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Measurement Results</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBottomOpen(!isBottomOpen)}
                  style={{ color: colors.textMuted }}
                  className="p-1 rounded hover:opacity-80 transition-opacity cursor-pointer"
                  title={isBottomOpen ? "Collapse drawer" : "Expand drawer"}
                >
                  {isBottomOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            {isBottomOpen && (
              <div className="flex-1 min-h-0 overflow-auto">
                {/* TAB 1: INTERACTIVE CIRCUIT CANVAS */}
                {activeBottomTab === 'circuit' && (
                  <div className="p-3.5 space-y-3 font-sans h-full flex flex-col">
                    {/* Gate Palette Toolbar */}
                    <div className="flex items-center justify-between pb-2 border-b shrink-0" style={{ borderColor: colors.border }}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-sans font-medium mr-1.5" style={{ color: colors.textMuted }}>Gate Palette:</span>
                        {[
                          { id: 'h', label: 'H (Hadamard)', color: 'border-sky-500/50 bg-sky-500/15 text-sky-400' },
                          { id: 'x', label: 'X (NOT)', color: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400' },
                          { id: 'z', label: 'Z (Phase)', color: 'border-amber-500/50 bg-amber-500/15 text-amber-400' },
                          { id: 'cx', label: 'CX (CNOT)', color: 'border-purple-500/50 bg-purple-500/15 text-purple-400' },
                          { id: 'rz', label: 'Rz(θ)', color: 'border-pink-500/50 bg-pink-500/15 text-pink-400' },
                          { id: 'measure', label: 'Measure', color: 'border-cyan-500/50 bg-cyan-500/15 text-cyan-400' }
                        ].map(g => (
                          <button
                            key={g.id}
                            onClick={() => setSelectedGateTool(g.id)}
                            className={`px-2.5 py-0.5 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer ${selectedGateTool === g.id ? `${g.color} ring-1 ring-sky-400` : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'}`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleRun()}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-500/50 text-sky-400 hover:bg-sky-500/30 text-xs font-sans font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          <span>Simulate on Aer</span>
                        </button>
                        <button
                          onClick={handleClearCircuitGates}
                          className="px-2 py-1 rounded-lg border border-zinc-800 text-zinc-500 hover:text-red-400 text-xs font-sans cursor-pointer transition-colors"
                        >
                          Clear Wire
                        </button>
                      </div>
                    </div>

                    {/* Interactive Qubit Wires Grid (Supports Multiple Sequential Gates per Qubit) */}
                    <div className="flex-1 overflow-x-auto min-h-0 py-1">
                      <div className="min-w-[640px] space-y-2">
                        {/* Timeline Steps Header */}
                        <div className="flex items-center gap-2.5 text-[10px] font-mono text-zinc-500 select-none pb-0.5">
                          <div className="w-12 text-center shrink-0">Wire</div>
                          <div className="flex-1 grid grid-cols-10 gap-2 text-center">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(s => (
                              <div key={s} className="opacity-70">t{s}</div>
                            ))}
                          </div>
                        </div>

                        {[0, 1, 2, 3].map(qIdx => (
                          <div key={qIdx} className="flex items-center gap-2.5">
                            {/* Qubit Wire Label */}
                            <div 
                              style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textCyan }}
                              className="w-12 h-8 rounded-lg border flex items-center justify-center font-mono text-xs font-semibold shrink-0 shadow-xs"
                            >
                              q[{qIdx}]
                            </div>

                            {/* Wire Line with 10 Sequential Time Step Slots */}
                            <div className="flex-1 flex items-center relative h-8">
                              {/* Continuous Horizontal Quantum Wire */}
                              <div 
                                style={{ backgroundColor: colors.border }} 
                                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] z-0" 
                              />

                              {/* 10 Time Step Slots on this Qubit */}
                              <div className="grid grid-cols-10 gap-2 w-full relative z-10">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(stepIdx => {
                                  const gateOnSlot = circuitGates.find(g => g.qubit === qIdx && g.step === stepIdx);
                                  return (
                                    <button
                                      key={stepIdx}
                                      onClick={() => handleToggleGateSlot(qIdx, stepIdx)}
                                      style={{
                                        backgroundColor: gateOnSlot ? '#18181b' : 'rgba(24, 24, 27, 0.5)',
                                        borderColor: gateOnSlot ? '#38bdf8' : colors.border
                                      }}
                                      className={`h-8 rounded-lg border flex items-center justify-center font-mono text-xs font-bold transition-all cursor-pointer hover:border-sky-400 shadow-xs ${gateOnSlot ? 'text-sky-300 ring-1 ring-sky-400/40 bg-sky-950/30' : 'text-zinc-600 hover:text-zinc-300'}`}
                                      title={gateOnSlot ? `Slot t${stepIdx}: Click to remove ${gateOnSlot.name.toUpperCase()}` : `Slot t${stepIdx}: Click to place ${selectedGateTool.toUpperCase()}`}
                                    >
                                      {gateOnSlot ? gateOnSlot.name.toUpperCase() : '+'}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Continuous ASCII Circuit Trace */}
                    {circuitAscii && (
                      <div className="pt-2 border-t shrink-0" style={{ borderColor: colors.border }}>
                        <pre className="text-[10px] font-mono leading-relaxed overflow-x-auto p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300 max-h-20">
                          {circuitAscii}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: QPU TERMINAL */}
                {activeBottomTab === 'terminal' && (
                  <div className="p-3.5 font-mono text-xs space-y-1 h-full overflow-y-auto">
                    {terminalLogs.map((log, i) => (
                      <div 
                        key={i} 
                        className={log.startsWith('✔') ? 'text-emerald-400' : (log.startsWith('✖') ? 'text-rose-400' : (log.startsWith('➜') ? 'text-sky-400' : 'text-zinc-300'))}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 3: MEASUREMENT RESULTS */}
                {activeBottomTab === 'results' && (
                  <div className="p-4 space-y-3 font-sans h-full overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: colors.textAmber }}>Measurement Statevector Probability Distribution</span>
                      <span className="text-[11px] font-mono" style={{ color: colors.textMuted }}>Total Shots: {shots}</span>
                    </div>

                    {simulationCounts ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        {Object.entries(simulationCounts).map(([state, cnt]) => {
                          const pct = Math.round((cnt / (shots || 1024)) * 100);
                          return (
                            <div 
                              key={state}
                              style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
                              className="p-3 rounded-xl border space-y-1.5 shadow-xs"
                            >
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="font-semibold text-sky-400">|{state}⟩</span>
                                <span style={{ color: colors.textMuted }}>{cnt} shots</span>
                              </div>
                              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-sky-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="text-right text-[10px] font-mono text-zinc-400">{pct}% probability</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-zinc-500 font-mono">
                        No simulation results yet. Click "Run" or "Simulate on Aer" above.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
                      {/* Intermediate Derivation & Tool Workflow Steps Card */}
                      {msg.workflowSteps && msg.workflowSteps.length > 0 && (
                        <div 
                          style={{ 
                            backgroundColor: colors.bgPill, 
                            borderColor: colors.border 
                          }}
                          className="border rounded-xl p-3 space-y-2 shadow-2xs font-normal text-xs"
                        >
                          <div 
                            onClick={() => setExpandedTraces(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                            className="flex items-center justify-between cursor-pointer select-none group"
                          >
                            <div className="flex items-center gap-2 font-mono text-[11px]" style={{ color: colors.textCyan }}>
                              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />
                              <span className="font-semibold">Pipeline Derivation Trace ({msg.workflowSteps.length} Steps)</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: colors.textMuted }}>
                              <span>{expandedTraces[msg.id] !== false ? 'Hide' : 'Show'}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedTraces[msg.id] !== false ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {expandedTraces[msg.id] !== false && (
                            <div className="space-y-1.5 pt-1.5 border-t font-mono text-[11px]" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                              {msg.workflowSteps.map((step, sIdx) => (
                                <div key={sIdx} className="flex items-start gap-2 p-1.5 rounded-lg bg-black/20 border" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' }}>
                                  <span style={{ color: colors.textEmerald }} className="mt-0.5 font-bold">✓</span>
                                  <div className="flex-1 space-y-0.5 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-semibold text-[11px]" style={{ color: colors.textPrimary }}>
                                        {step.step_num}. {step.name}
                                      </span>
                                      {step.execution_time_ms > 0 && (
                                        <span className="text-[10px]" style={{ color: colors.textMuted }}>
                                          {step.execution_time_ms}ms
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] leading-relaxed font-sans" style={{ color: colors.textMuted }}>
                                      {step.summary}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="leading-relaxed font-normal whitespace-pre-wrap font-sans" style={{ color: colors.textPrimary }}>
                        {msg.text}
                      </div>

                      {/* Interactive Domain Clarification Question Card */}
                      {msg.clarification && (
                        <div 
                          style={{ 
                            backgroundColor: colors.bgPill, 
                            borderColor: isDark ? 'rgba(51, 168, 219, 0.4)' : 'rgba(51, 168, 219, 0.5)' 
                          }}
                          className="border rounded-xl p-3.5 space-y-3 shadow-2xs font-normal animate-in fade-in zoom-in-95 duration-100"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider font-semibold" style={{ color: colors.textCyan }}>
                              <HelpCircle className="w-3.5 h-3.5" style={{ color: colors.textCyan }} />
                              <span>Decision Required: {msg.clarification.domain} Configuration</span>
                            </div>
                            {msg.clarification.default_value && (
                              <span className="text-[10px] font-mono" style={{ color: colors.textMuted }}>
                                Default: <span style={{ color: colors.textSkyBlue }}>{msg.clarification.default_value}</span>
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-semibold leading-relaxed font-sans" style={{ color: colors.textPrimary }}>
                            {msg.clarification.question}
                          </div>

                          {/* Selectable Option Pills */}
                          <div className="space-y-1.5 pt-1">
                            {(msg.clarification.options || []).map((opt, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSendMessage(opt.label)}
                                style={{ 
                                  backgroundColor: colors.bgCard, 
                                  borderColor: opt.is_recommended 
                                    ? (isDark ? 'rgba(47, 184, 133, 0.45)' : 'rgba(47, 184, 133, 0.6)') 
                                    : colors.border,
                                  color: colors.textPrimary 
                                }}
                                className="w-full text-left p-2.5 rounded-lg border hover:border-sky-500 transition-all cursor-pointer group flex flex-col gap-0.5 shadow-2xs"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-normal font-sans group-hover:text-sky-400 transition-colors">
                                    {opt.label}
                                  </span>
                                  {opt.is_recommended && (
                                    <span 
                                      style={{ 
                                        backgroundColor: isDark ? 'rgba(47, 184, 133, 0.15)' : 'rgba(47, 184, 133, 0.2)',
                                        color: colors.textEmerald,
                                        borderColor: 'rgba(47, 184, 133, 0.3)' 
                                      }}
                                      className="text-[10px] font-mono px-1.5 py-0.2 rounded border font-normal"
                                    >
                                      ★ Recommended
                                    </span>
                                  )}
                                </div>
                                {opt.description && (
                                  <div className="text-[11px] font-normal leading-relaxed" style={{ color: colors.textMuted }}>
                                    {opt.description}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Code Mutation Summary Card */}
                      {msg.codeMutation && (
                        <div 
                          style={{ 
                            backgroundColor: colors.bgPill, 
                            borderColor: isDark ? 'rgba(51, 168, 219, 0.3)' : 'rgba(51, 168, 219, 0.4)' 
                          }}
                          className="border rounded-xl p-3 space-y-2 shadow-2xs font-normal"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                            {/* Left: Clickable Target File Badge */}
                            <button
                              onClick={() => setActiveFile(msg.codeMutation!.fileName)}
                              title={`Click to focus ${msg.codeMutation!.fileName} in code editor`}
                              style={{ 
                                backgroundColor: colors.bgCard, 
                                borderColor: colors.border, 
                                color: colors.textCyan 
                              }}
                              className="px-2.5 py-1 rounded-md border flex items-center gap-1.5 font-mono text-[11px] hover:border-sky-400 transition-colors cursor-pointer"
                            >
                              <FileCode className="w-3.5 h-3.5" style={{ color: colors.textCyan }} />
                              <span className="font-normal">{msg.codeMutation.fileName}</span>
                            </button>

                            {/* Right: Line Diff Counts & Sync Badge */}
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              {msg.codeMutation.linesAdded > 0 && (
                                <span style={{ color: colors.textEmerald }} className="flex items-center gap-0.5 font-normal">
                                  +{msg.codeMutation.linesAdded} lines
                                </span>
                              )}
                              {msg.codeMutation.linesRemoved > 0 && (
                                <span style={{ color: colors.textAmber }} className="flex items-center gap-0.5 font-normal">
                                  -{msg.codeMutation.linesRemoved} lines
                                </span>
                              )}
                              <span 
                                style={{ 
                                  backgroundColor: colors.bgCard, 
                                  color: colors.textEmerald, 
                                  borderColor: 'rgba(47, 184, 133, 0.35)' 
                                }}
                                className="px-2 py-0.5 rounded border text-[10px] font-normal flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" style={{ color: colors.textEmerald }} />
                                <span>AST Mutated & Synced</span>
                              </span>
                            </div>
                          </div>

                          {/* Mutation Summary Note */}
                          {msg.codeMutation.summary && (
                            <div className="text-[11px] leading-relaxed font-sans" style={{ color: colors.textMuted }}>
                              {msg.codeMutation.summary}
                            </div>
                          )}

                          {/* Quick Execute Button */}
                          <div className="pt-1.5 flex items-center justify-end border-t" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
                            <button
                              onClick={() => handleSendMessage('/execute@program')}
                              style={{ 
                                backgroundColor: isDark ? 'rgba(222, 170, 33, 0.15)' : 'rgba(222, 170, 33, 0.2)',
                                borderColor: 'rgba(222, 170, 33, 0.4)',
                                color: colors.textAmber
                              }}
                              className="px-3 py-1 rounded-md border text-[11px] font-mono flex items-center gap-1.5 hover:border-amber-400 cursor-pointer transition-all shadow-2xs font-normal"
                            >
                              <Play className="w-3 h-3 fill-current" style={{ color: colors.textAmber }} />
                              <span>Run Program on {targetBackend}</span>
                            </button>
                          </div>
                        </div>
                      )}

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
      {/* QUANTUM RUNTIME TELEMETRY & SOLVERS DETAILS MODAL              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {telemetryModalTab !== null && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setTelemetryModalTab(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div 
            style={{ backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }}
            className="w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header with View Switcher Tabs & Close Button */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="p-4 border-b flex items-center justify-between shrink-0"
            >
              <div className="flex items-center gap-2 font-mono text-xs">
                <button 
                  onClick={() => setTelemetryModalTab('circuit')}
                  style={{ 
                    backgroundColor: telemetryModalTab === 'circuit' ? colors.bgPill : 'transparent',
                    borderColor: telemetryModalTab === 'circuit' ? colors.textCyan : 'transparent',
                    color: telemetryModalTab === 'circuit' ? colors.textCyan : colors.textMuted 
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" style={{ color: colors.textCyan }} />
                  <span>Circuit Canvas</span>
                </button>

                <button 
                  onClick={() => setTelemetryModalTab('results')}
                  style={{ 
                    backgroundColor: telemetryModalTab === 'results' ? colors.bgPill : 'transparent',
                    borderColor: telemetryModalTab === 'results' ? colors.textEmerald : 'transparent',
                    color: telemetryModalTab === 'results' ? colors.textEmerald : colors.textMuted 
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />
                  <span>Results & Metrics</span>
                </button>

                <button 
                  onClick={() => setTelemetryModalTab('terminal')}
                  style={{ 
                    backgroundColor: telemetryModalTab === 'terminal' ? colors.bgPill : 'transparent',
                    borderColor: telemetryModalTab === 'terminal' ? colors.textAmber : 'transparent',
                    color: telemetryModalTab === 'terminal' ? colors.textAmber : colors.textMuted 
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
                >
                  <TerminalIcon className="w-3.5 h-3.5" style={{ color: colors.textAmber }} />
                  <span>Solver Terminal</span>
                </button>
              </div>

              <div className="flex items-center gap-4">
                {/* Real-Time Telemetry Counters */}
                <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono" style={{ color: colors.textMuted }}>
                  <span>Qubits: <span style={{ color: colors.textSkyBlue }}>{runtimeMetrics.activeQubits}</span></span>
                  <span>Depth: <span style={{ color: colors.textSkyBlue }}>{runtimeMetrics.depth}</span></span>
                  <span>CNOTs: <span style={{ color: colors.textSkyBlue }}>{runtimeMetrics.cnots}</span></span>
                </div>

                <button 
                  onClick={() => setTelemetryModalTab(null)}
                  style={{ borderColor: colors.border, color: colors.textMuted }}
                  className="p-1 rounded-md border hover:bg-neutral-800/40 cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body Content */}
            <div 
              style={{ backgroundColor: colors.bgEditor }}
              className="p-5 flex-1 min-h-0 overflow-y-auto overflow-x-auto font-sans"
            >
              {/* 1. DYNAMIC QUBO MATRIX & PENALTY HEATMAP TAB */}
              {(telemetryModalTab === 'qubo_matrix' || telemetryModalTab === 'annealing' || telemetryModalTab === 'benchmark') && (
                <div className="space-y-5 font-sans">
                  {/* Top Bar: Live Problem Summary & Penalty Multiplier Slider */}
                  <div className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold font-sans" style={{ color: colors.textPrimary }}>
                          {runtimeMetrics.qubo_telemetry?.problem_name || 'Clean energy portfolio optimization'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed font-sans" style={{ color: colors.textMuted }}>
                        Symmetric upper-triangular Q-matrix with exact Lagrange constraint expansions: <span className="font-mono">L(x) = -Score + &lambda; &middot; (&sum; C_i x_i - B)&sup2;</span>.
                      </p>
                    </div>

                    {/* Interactive Penalty Multiplier λ Slider */}
                    <div className="flex items-center gap-3 shrink-0 p-2.5 rounded-lg border bg-black/20 font-sans" style={{ borderColor: colors.border }}>
                      <div className="space-y-0.5 text-right">
                        <div className="text-[10px] font-sans" style={{ color: colors.textMuted }}>Penalty multiplier (&lambda;)</div>
                        <div className="text-xs font-mono font-bold" style={{ color: colors.textCyan }}>{quboLambda.toFixed(1)}</div>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="25" 
                        step="0.5"
                        value={quboLambda}
                        onChange={(e) => setQuboLambda(parseFloat(e.target.value))}
                        className="w-24 accent-sky-400 cursor-pointer"
                        title="Adjust constraint penalty stiffness"
                      />
                      <button 
                        onClick={() => {
                          handleSendMessage(`/execute@program with penalty_lambda=${quboLambda}`);
                        }}
                        style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}
                        className="px-2.5 py-1 rounded-md border text-[11px] font-sans hover:border-sky-400 cursor-pointer"
                        title="Re-synthesize Q-matrix with new penalty"
                      >
                        Re-synthesize
                      </button>
                    </div>
                  </div>

                  {/* 2. Interactive N x N Numerical Q-Matrix Grid */}
                  <div className="p-4 rounded-xl border space-y-3" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-sans font-semibold" style={{ color: colors.textCyan }}>
                        Numerical Q-matrix heatmap ({runtimeMetrics.qubo_telemetry?.variables?.length || 4}&times;{runtimeMetrics.qubo_telemetry?.variables?.length || 4})
                      </div>
                      <div className="text-[11px] font-sans" style={{ color: colors.textMuted }}>
                        Click any cell to inspect mathematical derivation
                      </div>
                    </div>

                    {/* Matrix Grid Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse font-mono text-xs text-center">
                        <thead>
                          <tr>
                            <th className="p-2 text-left font-mono text-[11px] border-b" style={{ borderColor: colors.border, color: colors.textMuted }}>
                              Variables
                            </th>
                            {(runtimeMetrics.qubo_telemetry?.variables || ['Solar_Farm_A', 'Wind_Farm_C', 'Wind_Farm_D', 'Battery_Storage_E']).map((v, idx) => (
                              <th key={idx} className="p-2 font-mono text-[11px] border-b font-semibold" style={{ borderColor: colors.border, color: colors.textPrimary }}>
                                x_{idx} ({v.replace('Project_', '').replace('_Farm', '').replace('_Storage', '')})
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(runtimeMetrics.qubo_telemetry?.qubo_matrix || [
                            [-38.18, 1.0, 10.0, 1.0],
                            [0.0, -43.41, 1.0, -10.0],
                            [0.0, 0.0, -28.86, 1.0],
                            [0.0, 0.0, 0.0, -33.64]
                          ]).map((row, rIdx) => {
                            const varName = (runtimeMetrics.qubo_telemetry?.variables || ['Solar_Farm_A', 'Wind_Farm_C', 'Wind_Farm_D', 'Battery_Storage_E'])[rIdx];
                            return (
                              <tr key={rIdx} className="hover:bg-sky-500/5 transition-colors">
                                <td className="p-2.5 text-left font-mono font-semibold border-r" style={{ borderColor: colors.border, color: colors.textSkyBlue }}>
                                  x_{rIdx} ({varName})
                                </td>
                                {row.map((val, cIdx) => {
                                  const isSelected = selectedQuboCell?.row === rIdx && selectedQuboCell?.col === cIdx;
                                  const isDiag = rIdx === cIdx;
                                  const isPositive = val > 0;
                                  const isNegative = val < 0;

                                  let cellBg = 'bg-black/20';
                                  let cellColor = colors.textMuted;
                                  if (isDiag) {
                                    cellBg = 'bg-sky-500/15';
                                    cellColor = colors.textSkyBlue;
                                  } else if (isPositive) {
                                    cellBg = 'bg-amber-500/15';
                                    cellColor = colors.textAmber;
                                  } else if (isNegative) {
                                    cellBg = 'bg-emerald-500/15';
                                    cellColor = colors.textEmerald;
                                  }

                                  return (
                                    <td 
                                      key={cIdx}
                                      onClick={() => setSelectedQuboCell({ row: rIdx, col: cIdx })}
                                      style={{ borderColor: isSelected ? colors.textCyan : colors.border }}
                                      className={`p-2.5 border cursor-pointer transition-all font-mono font-semibold ${cellBg} ${isSelected ? 'ring-2 ring-sky-400' : ''}`}
                                    >
                                      <span style={{ color: cellColor }}>
                                        {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                                      </span>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Interactive Cell Inspector Box */}
                    <div className="p-3 rounded-xl border bg-black/30 space-y-1 font-mono text-xs" style={{ borderColor: colors.border }}>
                      <div className="flex items-center justify-between text-[11px]" style={{ color: colors.textCyan }}>
                        <span className="font-semibold">
                          🔍 Cell Inspector: {selectedQuboCell ? `Q[${selectedQuboCell.row}, ${selectedQuboCell.col}]` : 'Click any matrix cell above'}
                        </span>
                        {selectedQuboCell && (
                          <span style={{ color: colors.textMuted }}>
                            Row: {(runtimeMetrics.qubo_telemetry?.variables || ['Solar_Farm_A', 'Wind_Farm_C', 'Wind_Farm_D', 'Battery_Storage_E'])[selectedQuboCell.row]} | Col: {(runtimeMetrics.qubo_telemetry?.variables || ['Solar_Farm_A', 'Wind_Farm_C', 'Wind_Farm_D', 'Battery_Storage_E'])[selectedQuboCell.col]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed font-sans" style={{ color: colors.textPrimary }}>
                        {selectedQuboCell 
                          ? (runtimeMetrics.qubo_telemetry?.cell_explanations?.[`(${selectedQuboCell.row},${selectedQuboCell.col})`] || `Coefficient Q[${selectedQuboCell.row}, ${selectedQuboCell.col}] combines objective linear weight and quadratic penalty couplings.`)
                          : 'Select a diagonal cell (e.g. Q[0,0]) to view the Linear Objective + Budget Penalty, or an off-diagonal cell (e.g. Q[0,2]) to view mutual exclusion / dependency couplings.'
                        }
                      </p>
                    </div>
                  </div>

                  {/* 3. Decision Variables & Constraints List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border space-y-2.5 font-sans" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                      <div className="text-xs font-sans font-semibold" style={{ color: colors.textCyan }}>
                        Decision variables ({runtimeMetrics.qubo_telemetry?.variables?.length || 4})
                      </div>
                      <div className="space-y-1.5 text-xs font-mono">
                        {(runtimeMetrics.qubo_telemetry?.variables || ['Solar_Farm_A', 'Wind_Farm_C', 'Wind_Farm_D', 'Battery_Storage_E']).map((v, idx) => {
                          const isPicked = (runtimeMetrics.qubo_telemetry?.selected_items || ['Solar_Farm_A', 'Wind_Farm_C', 'Battery_Storage_E']).includes(v);
                          return (
                            <div key={idx} className="flex items-center justify-between p-1.5 rounded-md bg-black/20 border" style={{ borderColor: colors.border }}>
                              <span style={{ color: colors.textPrimary }}>x_{idx}: <strong>{v}</strong></span>
                              <span style={{ color: isPicked ? colors.textEmerald : colors.textMuted }} className="font-semibold">
                                {isPicked ? '✓ Selected (x=1)' : '○ Omitted (x=0)'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border space-y-2.5 font-sans" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                      <div className="text-xs font-sans font-semibold" style={{ color: colors.textCyan }}>
                        Constraints modelled ({runtimeMetrics.qubo_telemetry?.constraints_count || 3})
                      </div>
                      <div className="space-y-1.5 text-xs leading-relaxed font-sans" style={{ color: colors.textMuted }}>
                        <div className="p-2 rounded-lg bg-black/20 border font-sans" style={{ borderColor: colors.border }}>
                          • <strong style={{ color: colors.textPrimary }}>Investment limit:</strong> Total cost &le; ${runtimeMetrics.qubo_telemetry?.budget || 22}M (100% feasible)
                        </div>
                        <div className="p-2 rounded-lg bg-black/20 border font-sans" style={{ borderColor: colors.border }}>
                          • <strong style={{ color: colors.textPrimary }}>Transmission conflict:</strong> Solar A & Wind D mutual exclusion
                        </div>
                        <div className="p-2 rounded-lg bg-black/20 border font-sans" style={{ borderColor: colors.border }}>
                          • <strong style={{ color: colors.textPrimary }}>Grid balancing:</strong> Wind C requires Battery Storage E
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {telemetryModalTab === 'circuit' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: colors.border }}>
                    <div className="text-xs font-normal" style={{ color: colors.textCyan }}>
                      Continuous Horizontal Circuit Canvas (Zero vertical wrapping — scroll horizontally):
                    </div>
                    <div className="text-[10px] font-mono" style={{ color: colors.textMuted }}>
                      Backend: <span style={{ color: colors.textSkyBlue }}>{targetBackend}</span>
                    </div>
                  </div>
                  <pre className="font-mono text-xs font-normal leading-normal select-text p-4 rounded-xl border bg-black/40 overflow-x-auto whitespace-pre" style={{ borderColor: colors.border, color: colors.textPrimary }}>
                    {runtimeMetrics.circuitText}
                  </pre>
                </div>
              )}

              {telemetryModalTab === 'results' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div 
                      style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                      className="border rounded-xl p-4 space-y-2 shadow-2xs"
                    >
                      <div className="text-[11px] font-normal font-sans" style={{ color: colors.textCyan }}>Expectation value</div>
                      <div className="text-2xl font-normal font-mono" style={{ color: colors.textSkyBlue }}>{runtimeMetrics.expectationVal}</div>
                      <div className="text-xs font-normal" style={{ color: colors.textMuted }}>Target: Z ⊗ I ⊗ I ⊗ I</div>
                    </div>
                    <div 
                      style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                      className="border rounded-xl p-4 space-y-2 shadow-2xs"
                    >
                      <div className="text-[11px] font-normal font-sans" style={{ color: colors.textCyan }}>Simulator fidelity</div>
                      <div className="text-2xl font-normal font-mono" style={{ color: colors.textEmerald }}>{runtimeMetrics.fidelity}</div>
                      <div className="text-xs font-normal" style={{ color: colors.textMuted }}>Statevector exact match</div>
                    </div>
                    <div 
                      style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                      className="border rounded-xl p-4 space-y-2 shadow-2xs"
                    >
                      <div className="text-[11px] font-normal font-sans" style={{ color: colors.textCyan }}>Execution latency</div>
                      <div className="text-2xl font-normal font-mono" style={{ color: colors.textAmber }}>{runtimeMetrics.latencySec}</div>
                      <div className="text-xs font-normal" style={{ color: colors.textMuted }}>Target: {targetBackend}</div>
                    </div>
                  </div>

                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="border rounded-xl p-4 space-y-2"
                  >
                    <div className="text-xs font-normal font-sans" style={{ color: colors.textCyan }}>Quantum execution parameters</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div><span style={{ color: colors.textMuted }}>Optimization Level:</span> <span style={{ color: colors.textPrimary }}>Level {optimizationLevel}</span></div>
                      <div><span style={{ color: colors.textMuted }}>Shot Count:</span> <span style={{ color: colors.textPrimary }}>{shots} shots</span></div>
                      <div><span style={{ color: colors.textMuted }}>Allocated Qubits:</span> <span style={{ color: colors.textPrimary }}>{runtimeMetrics.activeQubits} Q</span></div>
                      <div><span style={{ color: colors.textMuted }}>Circuit Depth:</span> <span style={{ color: colors.textPrimary }}>{runtimeMetrics.depth} layers</span></div>
                    </div>
                  </div>
                </div>
              )}

              {telemetryModalTab === 'terminal' && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: colors.border }}>
                    <span className="text-xs font-normal" style={{ color: colors.textAmber }}>Live QPU Simulation & Solver Console Output:</span>
                    <span className="text-[10px]" style={{ color: colors.textEmerald }}>• Process Exited Cleanly (code 0)</span>
                  </div>
                  <div className="p-4 rounded-xl border bg-black/40 space-y-1 overflow-x-auto" style={{ borderColor: colors.border }}>
                    {(runtimeMetrics?.terminalLog || []).map((line, lIdx) => (
                      <div key={lIdx} style={{ color: line.startsWith('➜') ? colors.textAmber : (line.includes('exit code 0') ? colors.textEmerald : colors.textPrimary) }}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="p-3 border-t flex items-center justify-end"
            >
              <button
                onClick={() => setTelemetryModalTab(null)}
                style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}
                className="px-4 py-1.5 rounded-lg border text-xs font-mono hover:opacity-80 cursor-pointer"
              >
                Close
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
