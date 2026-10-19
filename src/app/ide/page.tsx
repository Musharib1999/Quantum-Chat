"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Code,
  FileCode,
  Layers,
  Activity,
  BarChart2,
  Cpu,
  Sparkles,
  Zap,
  Play,
  RotateCw,
  Terminal as TerminalIcon,
  CheckCircle2,
  AlertTriangle,
  Folder,
  Clock,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  JOURNEY_101_MILESTONES,
  getJourneyMilestone,
  evaluateQuizResponse,
  isAskingForHint,
  isUncertainOrStuck,
  isWantingToSkipOrProceed,
  getSupportiveTutorResponse,
  buildJourneyTutorPrompt,
} from "@/lib/quantumJourney101";
import {
  StudioHeader,
  GuidedTourModal,
  ProjectExplorer,
  StudioCodeEditor,
  StudioBottomBar,
  CircuitCanvasView,
  ProjectSwitcherModal,
  NewProjectModal,
  AlgorithmStudioModal,
  AlgorithmBankItem,
  ProjectItem,
  FrameworkType,
  HeroTabType,
} from "@/components/ide";
import { DataConnectorsModal } from "@/components/optimization/DataConnectorsModal";
import {
  FormulationCanvas,
  QMatrixHeatmap,
  EnergySpectrumView,
  OptimizationCopilot,
  ThemeColors,
  MathFormulationParams,
  OptimizationSectionId,
  CopilotMessage,
  EnergyDistributionItem,
  OptimizationResults,
} from "@/components/optimization";

const darkColors: ThemeColors = {
  bgSection1: "#090A0D",
  bgSection2: "#0E0F13",
  bgSection3: "#13141A",
  bgMain: "#090A0D",
  bgHeader: "#0E0F13",
  bgSidebar: "#090A0D",
  bgEditor: "#0E0F13",
  bgBottomDrawer: "#13141A",
  bgBottomDrawerHeader: "#13141A",
  bgCard: "#13141A",
  bgInput: "#090A0D",
  bgPill: "#191A23",
  border: "rgba(255, 255, 255, 0.08)",
  borderSection2: "rgba(255, 255, 255, 0.12)",
  borderSubtle: "rgba(255, 255, 255, 0.05)",
  textPrimary: "#F1F5F9",
  textMuted: "#94A3B8",
  textCyan: "#38BDF8",
  textEmerald: "#34D399",
  textAmber: "#FBBF24",
  textSkyBlue: "#60A5FA",
};

const lightColors: ThemeColors = {
  bgSection1: "#FFFFFF",
  bgSection2: "#EEF2F6",
  bgSection3: "#F4F7FA",
  bgMain: "#F1F5F9",
  bgHeader: "#FFFFFF",
  bgSidebar: "#F4F7FA",
  bgEditor: "#FAFBFC",
  bgBottomDrawer: "#0B0F17",
  bgBottomDrawerHeader: "#0E131F",
  bgCard: "#FFFFFF",
  bgInput: "#FFFFFF",
  bgPill: "#EEF2F6",
  border: "#E2E8F0",
  borderSection2: "#E2E8F0",
  borderSubtle: "#E2E8F0",
  textPrimary: "#172033",
  textMuted: "#526174",
  textCyan: "#087FC3",
  textEmerald: "#009B72",
  textAmber: "#D97706",
  textSkyBlue: "#087FC3",
};

const DEFAULT_VARIABLES = ["Wind_A", "Solar_B", "Battery_C", "Hydro_D"];
const ASSET_COSTS = [9.0, 7.0, 6.0, 8.0];
const ASSET_YIELDS = [12.5, 9.0, 8.0, 10.5];

const CLEAN_ENERGY_PORTFOLIO_CODE = `# Quantum Guru — Clean Energy Portfolio Selection (QUBO)
# Solver: D-Wave BinaryQuadraticModel & Simulated Annealer
import dimod
from dwave.samplers import SimulatedAnnealingSampler
from qubo_matrix import get_qubo_model

# 1. Ingest problem matrix & penalty multipliers
Q_matrix, variable_names, penalty_lambda, offset = get_qubo_model()

# 2. Assemble D-Wave BQM Hamiltonian
bqm = dimod.BinaryQuadraticModel.from_qubo(Q_matrix, offset=offset)

# 3. Execute Quantum-Classical Annealing
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=2048)

best = sampleset.first
print(f"⚡ Ground Energy: {best.energy:.4f}")
print("Optimal Decisions:", [variable_names[i] for i, v in enumerate(best.sample) if v == 1])`;

const NEW_DWAVE_STARTER_CODE = `# Quantum Guru — D-Wave Binary Quadratic Model Starter
import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Define a binary quadratic model (BQM)
# Example: Minimize objective E(x, y) = -x - y + 2xy
bqm = dimod.BinaryQuadraticModel({'x': -1.0, 'y': -1.0}, {('x', 'y'): 2.0}, 0.0, dimod.BINARY)

# Solve using Simulated Annealing
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)

best = sampleset.first
print("Optimal Decisions:", best.sample)
print(f"⚡ Ground Energy: {best.energy:.4f}")`;

const NEW_QISKIT_STARTER_CODE = `# Quantum Guru — Qiskit Starter Circuit
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

# Create a 2-qubit Bell state circuit
qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure([0, 1], [0, 1])

# Execute on Aer simulator
sim = AerSimulator()
res = sim.run(qc, shots=1024).result()
print("Measurement Counts:", res.get_counts())`;

const DWAVE_INITIAL_CODE = CLEAN_ENERGY_PORTFOLIO_CODE;

const QUANTUM_JOURNEY_CODE = JOURNEY_101_MILESTONES[0].starterCode;

const QISKIT_INITIAL_CODE = `# Quantum Guru — Qiskit Quantum Teleportation Protocol
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
import numpy as np

qc = QuantumCircuit(3, 3)

# 1. State preparation on qubit 0 (Alice state)
qc.rx(np.pi / 3, 0)
qc.barrier()

# 2. Entangled Bell pair between Alice (q1) and Bob (q2)
qc.h(1)
qc.cx(1, 2)
qc.barrier()

# 3. Bell measurement protocol
qc.cx(0, 1)
qc.h(0)
qc.measure([0, 1], [0, 1])
qc.barrier()

# 4. Bob conditional recovery corrections
qc.cx(1, 2)
qc.cz(0, 2)
qc.measure(2, 2)

# Simulated execution on Aer backend
sim = AerSimulator()
res = sim.run(qc, shots=4096).result()
print("Teleportation Counts:", res.get_counts())`;

const MAXCUT_INITIAL_CODE = `# Quantum Guru — Max-Cut 12-Node Graph Partition (QUBO)
import dimod
from dwave.samplers import SimulatedAnnealingSampler

edges = [(i, (i + 1) % 12) for i in range(12)] + [(0, 6), (2, 8), (4, 10)]
linear = {f"n_{i}": 0.0 for i in range(12)}
quadratic = {(f"n_{u}", f"n_{v}"): 2.0 for u, v in edges}

bqm = dimod.BinaryQuadraticModel(linear, quadratic, -float(len(edges)), dimod.SPIN)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=1024)

best = sampleset.first
print(f"⚡ Max-Cut Ground Energy: {best.energy:.4f}")
print("Partition Set A:", [k for k, v in best.sample.items() if v == 1])
print("Partition Set B:", [k for k, v in best.sample.items() if v == -1])`;

const VQE_INITIAL_CODE = `# Quantum Guru — VQE Molecular H2 Ground State
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
import numpy as np

qc = QuantumCircuit(2, 2)
qc.x(0)
qc.barrier()

theta = 0.7854  # pi / 4 variational ansatz parameter
qc.ry(theta, 1)
qc.cx(1, 0)
qc.barrier()
qc.measure([0, 1], [0, 1])

sim = AerSimulator()
res = sim.run(qc, shots=2048).result()
print("VQE H2 State Counts:", res.get_counts())`;

const INITIAL_PROJECTS: ProjectItem[] = [
  {
    id: "quantum_journey_101",
    title: "Quantum Journey — Interactive 101",
    desc: "Guided hands-on exploration of qubits, superposition, entanglement & circuits with Guru AI.",
    framework: "qiskit",
    updated: "Just now",
    files: ["journey.py", "circuit.qasm", "deployment.json"],
    activeFile: "journey.py",
    fileContents: { "journey.py": QUANTUM_JOURNEY_CODE },
  },
  {
    id: "clean_energy_portfolio",
    title: "Clean Energy Portfolio",
    desc: "4-asset capital budgeting with mutual exclusions and grid stability dependencies.",
    framework: "dwave",
    updated: "2 mins ago",
    files: ["main.py", "qubo_matrix.py", "deployment.json", "input.sample.json"],
    activeFile: "main.py",
    fileContents: { "main.py": CLEAN_ENERGY_PORTFOLIO_CODE },
  },
  {
    id: "quantum_teleportation",
    title: "Quantum Teleportation",
    desc: "3-qubit entangled Bell channel with Bob classical feed-forward corrections.",
    framework: "qiskit",
    updated: "1 hour ago",
    files: ["teleportation.py", "circuit.qasm", "deployment.json"],
    activeFile: "teleportation.py",
    fileContents: { "teleportation.py": QISKIT_INITIAL_CODE },
  },
  {
    id: "maxcut_bipartite_graph",
    title: "Max-Cut 12-Node Partition",
    desc: "Unconstrained binary quadratic model for bipartite graph cut maximization.",
    framework: "dwave",
    updated: "Yesterday",
    files: ["maxcut.py", "graph_edges.json", "deployment.json"],
    activeFile: "maxcut.py",
    fileContents: { "maxcut.py": MAXCUT_INITIAL_CODE },
  },
  {
    id: "vqe_h2_molecule",
    title: "VQE H2 Ground Energy",
    desc: "Variational Quantum Eigensolver for molecular hydrogen ground state energy curve.",
    framework: "qiskit",
    updated: "3 days ago",
    files: ["vqe_h2.py", "ansatz.py", "deployment.json"],
    activeFile: "vqe_h2.py",
    fileContents: { "vqe_h2.py": VQE_INITIAL_CODE },
  },
];


// =============================================================================
// Enterprise Project Templates & Manifest Contracts
// =============================================================================
const ENTERPRISE_PROJECT_TEMPLATES: Record<string, any> = {
  "portfolio-optimization": {
    name: "Clean Energy Portfolio Optimization",
    backend: "dwave_simulated_annealing",
    archetype: "dwave-annealing",
    title: "Quantum Annealing (D-Wave)",
    files: {
      "portfolio_optimization.py": { lang: 'python', content: DWAVE_INITIAL_CODE },
      "quantum.config.json": {
        lang: 'json',
        content: JSON.stringify({
          $schema: "https://quantumguru.ai/schemas/v1/deployment.json",
          target_backend: "dwave_simulated_annealing",
          sla: { min_approximation_ratio: 0.85, auto_classical_fallback: true, fallback_solver: "classical_baseline.py" },
          handlers: { ingress: "ingress.py:parse_ingress", egress: "egress.py:format_egress" }
        }, null, 2)
      },
      "data/input.sample.json": {
        lang: 'json',
        content: JSON.stringify({
          budget_limit: 18.0,
          items: [
            { id: "Solar_Farm_A", cost: 7.0, score: 9.0 },
            { id: "Battery_Storage_C", cost: 6.0, score: 8.0 },
            { id: "Hydro_Plant_D", cost: 8.0, score: 10.5 }
          ]
        }, null, 2)
      },
      "memory.md": {
        lang: "markdown",
        content: "# Project Memory: portfolio-optimization\nTurn 1: tools.opt.formulate_problem active."
      }
    }
  },
  "quantum-journey": {
    name: "Quantum Journey — Interactive 101",
    backend: "aer_simulator",
    files: { "journey.py": { lang: "python", content: QUANTUM_JOURNEY_CODE } }
  },
  "my-quantum-project": {
    name: "Bell State & Teleportation",
    backend: "aer_simulator",
    files: { "circuit.py": { lang: 'python', content: QISKIT_INITIAL_CODE } }
  },
  "lih-cas-vqe": {
    name: "Molecular LiH Chemistry VQE",
    desc: "Molecular orbital integrals & CAS-CI ansatz",
    backend: "aer_simulator"
  },
  "iris-qsvm-classifier": {
    name: "Quantum Machine Learning Classifier",
    desc: "Quantum Machine Learning kernel estimator",
    backend: "aer_simulator"
  }
};

function handleRevertCode(codeSnapshots: string[]): string {
  return codeSnapshots[codeSnapshots.length - 1] || "";
}

async function saveProjectToDatabase(project_files: Record<string, any>): Promise<string> {
  return JSON.stringify({ status: "saved", files: Object.keys(project_files) });
}

function resolveBackend(templateData: any): string {
  return templateData.backend || "dwave_simulated_annealing";
}

const OFFLINE_GUARD = "Offline Sandbox: Cloud QPU sampler detected without active Leap credentials";

const DWAVE_INITIAL_MESSAGES: CopilotMessage[] = [
  {
    id: 1,
    sender: "assistant",
    text: "Quantum Guru Studio initialized. I am your quantum formulation & optimization copilot. Ask me to adjust Lagrange multipliers, enforce mutual exclusion, or analyze eigenstate distributions.",
    timestamp: "Just now",
  },
];

// Helper to cleanse any previously cached corrupted LaTeX strings from localStorage
function sanitizeCachedChatText(text: string): string {
  if (!text) return "";
  if (text.includes("CAS-VQE") || text.includes("Target Molecule")) {
    return "Close guess! But **Pauli-X (PX)** is the **bit-flip** (NOT) gate: it turns |0⟩ into |1⟩. The question asks which gate flips the **quantum phase (±)** without changing probabilities: **Pauli-Y** or **Pauli-Z**? Try typing **Z**!";
  }
  return text
    .replace(/\$\$[\s\S]*?(?:vert|ertpsi|rac\{)[\s\S]*?\$\$/gi, "> **|ψ⟩ = (|0⟩ + |1⟩) / √2**")
    .replace(/\$\$\vert[\s\S]*?\$\$/gi, "> **|ψ⟩ = (|0⟩ + |1⟩) / √2**");
}

const QUANTUM_JOURNEY_INITIAL_MESSAGES: CopilotMessage[] = [
  {
    id: 1,
    sender: "assistant",
    text: JOURNEY_101_MILESTONES[0].introPrompt,
    timestamp: "Just now",
  },
];

const QISKIT_INITIAL_MESSAGES: CopilotMessage[] = [
  {
    id: 1,
    sender: "assistant",
    text: "Qiskit Quantum Studio initialized. I am your quantum circuit & algorithm copilot. Ask me to verify Bell state entanglement, calculate circuit depth, synthesize unitary gates, or configure Aer noise models.",
    timestamp: "Just now",
  },
];


function extractQubit(str: string): number {
  if (!str) return NaN;
  const m = str.match(/\d+/);
  return m ? parseInt(m[0], 10) : NaN;
}

function parseQiskitCodeToCircuit(code: string): { numQubits: number; gates: any[]; depth: number } {
  const qcMatch = code.match(/QuantumCircuit\(\s*(\d+)/);
  let numQubits = qcMatch ? Math.min(30, Math.max(1, parseInt(qcMatch[1], 10))) : 2;
  const stepTrack: Record<number, number> = {};
  for (let i = 0; i < 30; i++) stepTrack[i] = 0;

  const gates: any[] = [];
  const lines = code.split("\n");

  // Detect user circuit variable name (e.g. qc = QuantumCircuit(...) or circuit = QuantumCircuit(...))
  const varMatch = code.match(/([a-zA-Z0-9_]+)\s*=\s*(?:[a-zA-Z0-9_]+\.)?QuantumCircuit/);
  const primaryVar = varMatch ? varMatch[1] : "qc";
  const qcCallRegex = new RegExp(`^(?:${primaryVar}|qc|circuit|circ|qcirc)\\.([a-zA-Z0-9_]+)\\((.*)\\)`);

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const callMatch = line.match(qcCallRegex);
    if (!callMatch) continue;

    const opName = callMatch[1].toLowerCase();
    const argsStr = callMatch[2].trim();

    if (opName === "delay") continue;

    if (opName === "save_statevector" || opName.startsWith("save_")) {
      const qIndices = Array.from({ length: numQubits }, (_, i) => i);
      const currentStep = Math.max(0, ...qIndices.map((q) => stepTrack[q] ?? 0));
      for (const q of qIndices) {
        gates.push({
          name: "|ψ⟩",
          qubit: q,
          qubits: qIndices,
          step: currentStep,
          role: "probe",
          params: [],
        });
        stepTrack[q] = currentStep + 1;
      }
      continue;
    }

    if (opName === "barrier") {
      const nums = Array.from(argsStr.matchAll(/\b(\d+)\b/g)).map((m) => parseInt(m[1], 10));
      const qIndices = nums.length > 0 ? nums : Array.from({ length: numQubits }, (_, i) => i);
      const currentStep = Math.max(0, ...qIndices.map((q) => stepTrack[q] ?? 0));
      for (const q of qIndices) {
        if (q >= numQubits) numQubits = Math.min(30, q + 1);
        gates.push({
          name: "barrier",
          qubit: q,
          qubits: qIndices,
          step: currentStep,
          role: "barrier",
          params: [],
        });
        stepTrack[q] = currentStep + 1;
      }
      continue;
    }

    if (opName === "measure_all") {
      const qIndices = Array.from({ length: numQubits }, (_, i) => i);
      const barrierStep = Math.max(0, ...qIndices.map((q) => stepTrack[q] ?? 0));
      for (const q of qIndices) {
        gates.push({
          name: "barrier",
          qubit: q,
          qubits: qIndices,
          step: barrierStep,
          role: "barrier",
          params: [],
        });
        gates.push({
          name: "measure",
          qubit: q,
          qubits: [q],
          step: barrierStep + 1,
          role: "single",
          params: [],
        });
        stepTrack[q] = barrierStep + 2;
      }
      continue;
    }

    if (opName === "measure") {
      const listMatch = argsStr.match(/^\[\s*([\d,\s]+)\s*\]/);
      let qList: number[] = [];
      if (listMatch) {
        qList = Array.from(listMatch[1].matchAll(/\b(\d+)\b/g)).map((m) => parseInt(m[1], 10));
      } else {
        const firstInt = extractQubit(argsStr);
        if (!isNaN(firstInt)) qList = [firstInt];
      }
      for (const q of qList) {
        if (q >= numQubits) numQubits = Math.min(30, q + 1);
        const currentStep = stepTrack[q] ?? 0;
        gates.push({
          name: "measure",
          qubit: q,
          qubits: [q],
          step: currentStep,
          role: "single",
          params: [],
        });
        stepTrack[q] = currentStep + 1;
      }
      continue;
    }

    const parts = argsStr.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) continue;

    if (["cx", "cnot", "cz", "swap", "ch", "cy", "cp", "crx", "cry", "crz"].includes(opName)) {
      if (parts.length >= 2) {
        const ctrl = extractQubit(parts[parts.length - 2]);
        const tgt = extractQubit(parts[parts.length - 1]);
        if (!isNaN(ctrl) && !isNaN(tgt)) {
          if (Math.max(ctrl, tgt) >= numQubits) numQubits = Math.min(30, Math.max(ctrl, tgt) + 1);
          const currentStep = Math.max(stepTrack[ctrl] ?? 0, stepTrack[tgt] ?? 0);
          const normalizedName = opName === "cnot" ? "cx" : opName;
          gates.push({
            name: normalizedName,
            qubit: ctrl,
            target: tgt,
            qubits: [ctrl, tgt],
            step: currentStep,
            role: "control",
            params: [],
          });
          gates.push({
            name: normalizedName,
            qubit: tgt,
            target: ctrl,
            qubits: [ctrl, tgt],
            step: currentStep,
            role: "target",
            params: [],
          });
          stepTrack[ctrl] = currentStep + 1;
          stepTrack[tgt] = currentStep + 1;
        }
      }
      continue;
    }

    if (["ccx", "toffoli", "cswap"].includes(opName) && parts.length >= 3) {
      const c1 = extractQubit(parts[parts.length - 3]);
      const c2 = extractQubit(parts[parts.length - 2]);
      const tgt = extractQubit(parts[parts.length - 1]);
      if (!isNaN(c1) && !isNaN(c2) && !isNaN(tgt)) {
        const qIndices = [c1, c2, tgt];
        const currentStep = Math.max(...qIndices.map((q) => stepTrack[q] ?? 0));
        gates.push({ name: opName, qubit: c1, target: tgt, qubits: qIndices, step: currentStep, role: "control", params: [] });
        gates.push({ name: opName, qubit: c2, target: tgt, qubits: qIndices, step: currentStep, role: "control", params: [] });
        gates.push({ name: opName, qubit: tgt, target: c1, qubits: qIndices, step: currentStep, role: "target", params: [] });
        for (const q of qIndices) stepTrack[q] = currentStep + 1;
      }
      continue;
    }

    const lastArg = extractQubit(parts[parts.length - 1]);
    if (!isNaN(lastArg)) {
      if (lastArg >= numQubits) numQubits = Math.min(30, lastArg + 1);
      const currentStep = stepTrack[lastArg] ?? 0;
      gates.push({
        name: opName,
        qubit: lastArg,
        qubits: [lastArg],
        step: currentStep,
        role: "single",
        params: [],
      });
      stepTrack[lastArg] = currentStep + 1;
    }
  }

  const maxStepVal = Math.max(1, ...Object.values(stepTrack));
  return { numQubits, gates, depth: maxStepVal };
}

function classifyOptimizationIntent(text: string): "CHAT" | "FORMULATE" {
  const clean = text.trim().toLowerCase();
  if (!clean) return "CHAT";

  // Tier 1: Definite greetings and casual conversational triggers
  const greetings = [
    "hi", "hello", "hey", "hola", "howdy", "sup", "yo",
    "good morning", "good afternoon", "good evening", "good night",
    "who are you", "what can you do", "help", "test", "thanks", "thank you",
    "nice to meet you", "bye", "goodbye"
  ];
  if (greetings.includes(clean)) return "CHAT";
  if (/^(hi|hello|hey|yo)\b/i.test(clean) && clean.split(/\s+/).length <= 4) return "CHAT";

  // Tier 2: Pure questions, inquiries, and explanations
  const questionStarters = [
    "what is", "what are", "what does", "how does", "how do", "why is",
    "why does", "explain", "tell me about", "describe", "define",
    "can you explain", "could you explain", "is lambda", "is penalty"
  ];
  const isQuestion = questionStarters.some((prefix) => clean.startsWith(prefix));

  const explicitFormulateVerbs = [
    "formulate", "synthesize", "generate qubo", "build qubo", "create model",
    "write model", "solve problem", "solve for", "optimize this", "allocate"
  ];
  const asksToFormulate = explicitFormulateVerbs.some((v) => clean.includes(v));

  if (isQuestion && !asksToFormulate) {
    return "CHAT";
  }

  // Tier 3: Optimization Problem Formulation Triggers
  const hasNumbersAndUnits = /\b\d+\s*(workers|shifts|hours|days|assets|plants|items|kg|mw|dollars|\$|cost|budget|variables|nodes|edges)/i.test(clean);
  const hasConstrainedProblemStructure = /\b(minimize|maximize)\b.*\b(subject to|constraints?|budget|capacity)\b/i.test(clean) ||
    /\b(knapsack|maxcut|max-cut|traveling salesperson|tsp|portfolio optimization|graph coloring|set cover)\b/i.test(clean);

  if (asksToFormulate || (hasNumbersAndUnits && hasConstrainedProblemStructure)) {
    return "FORMULATE";
  }

  // Default to conversational CHAT to prevent general queries from breaking the mathematical formulation pipeline
  return "CHAT";
}

interface ExecutionHistoryItem {
  id: string;
  projectId?: string;
  timestamp: string;
  formattedDate: string;
  framework: "dwave" | "qiskit";
  status: "success" | "error";
  latencyMs: number;
  shots?: number;
  summary: string;
  stdout?: string;
  stderr?: string;
  jobId?: string;
}

export default function QuantumGuruStudioPage() {
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [codeSnapshots, setCodeSnapshots] = useState<string[]>([]);
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistoryItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("project") || params.get("projectId");
        const savedId = urlId || localStorage.getItem("quantum_ide_active_project_id") || "clean_energy_portfolio";
        const stored = localStorage.getItem(`quantum_ide_history_${savedId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed.filter((item: any) => !item.projectId || item.projectId === savedId);
          }
        }
      } catch (e) {}
    }
    return [];
  });
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const handleClearHistory = () => {
    setExecutionHistory([]);
    if (typeof window !== "undefined" && activeProject?.id) {
      try {
        localStorage.removeItem(`quantum_ide_history_${activeProject.id}`);
      } catch {}
    }
  };

  const [targetBackend, setTargetBackend] = useState<string>("dwave_simulated_annealing");
  const { user, isAuthenticated, logout } = useAuth();

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const isDark = theme === "dark";
  const colors = isDark ? darkColors : lightColors;

  // Persist theme to localStorage and keep DOM synchronized across reloads
  useEffect(() => {
    try {
      const saved = localStorage.getItem("qg_theme") as "dark" | "light" | null;
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
        document.documentElement.classList.toggle("dark", saved === "dark");
        document.documentElement.setAttribute("data-theme", saved);
      }
    } catch (e) {}
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("qg_theme", nextTheme);
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
        document.documentElement.setAttribute("data-theme", nextTheme);
      } catch (e) {}
      return nextTheme;
    });
  };

  const handleLogout = () => {
    try {
      logout();
    } catch (e) {
      console.error("Logout error", e);
    }
    window.location.replace("/login");
  };

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const localCustom = localStorage.getItem("quantum_ide_custom_projects");
        if (localCustom) {
          const parsed = JSON.parse(localCustom);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Auto-sanitize existing custom projects that may have been contaminated with Clean Energy Portfolio template
            const sanitizedList = parsed.map((p: any) => {
              if (p.id !== "clean_energy_portfolio") {
                const mainContent = p.fileContents?.["main.py"] || "";
                const isContaminated =
                  mainContent.includes("# Quantum Guru — Clean Energy Portfolio Selection") ||
                  mainContent.includes("from qubo_matrix import get_qubo_model");

                const updatedContents = { ...p.fileContents };
                if (isContaminated) {
                  updatedContents["main.py"] = p.framework === "dwave" ? NEW_DWAVE_STARTER_CODE : NEW_QISKIT_STARTER_CODE;
                  try {
                    localStorage.setItem(`quantum_ide_code_${p.id}_main.py`, updatedContents["main.py"]);
                  } catch (e) {}
                }

                // If qubo_matrix.py was auto-added by old template bug, remove it
                let updatedFiles = Array.isArray(p.files) ? [...p.files] : ["main.py"];
                if (updatedFiles.includes("qubo_matrix.py")) {
                  const quboContent = p.fileContents?.["qubo_matrix.py"] || "";
                  if (!quboContent || quboContent.includes("def get_qubo_model") || quboContent.trim() === "# qubo_matrix.py") {
                    updatedFiles = updatedFiles.filter((f: string) => f !== "qubo_matrix.py");
                    delete updatedContents["qubo_matrix.py"];
                    try {
                      localStorage.removeItem(`quantum_ide_code_${p.id}_qubo_matrix.py`);
                    } catch (e) {}
                  }
                }

                return {
                  ...p,
                  files: updatedFiles,
                  fileContents: updatedContents,
                };
              }
              return p;
            });

            try {
              localStorage.setItem("quantum_ide_custom_projects", JSON.stringify(sanitizedList));
              localStorage.removeItem("quantum_ide_last_dwave_code");
              localStorage.removeItem("quantum_ide_last_qiskit_code");
            } catch (e) {}

            const journey = INITIAL_PROJECTS.find((p) => p.id === "quantum_journey_101")!;
            const listWithoutJourney = sanitizedList.filter((p: any) => p.id !== "quantum_journey_101");
            const ids = new Set(listWithoutJourney.map((p: any) => p.id));
            const remainingInitial = INITIAL_PROJECTS.filter((p) => p.id !== "quantum_journey_101" && !ids.has(p.id));
            return [journey, ...listWithoutJourney, ...remainingInitial];
          }
        }
      } catch (e) {}
    }
    return INITIAL_PROJECTS;
  });

  // Fetch cloud projects from MongoDB Atlas when authenticated
  useEffect(() => {
    async function loadCloudProjects() {
      if (!user?.email) return;
      try {
        setIsSyncing(true);
        const res = await fetch(`/api/ide/projects?email=${encodeURIComponent(user.email)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.projects) && data.projects.length > 0) {
          const cloudList: ProjectItem[] = data.projects.map((doc: any) => {
            const filesMap = doc.files && typeof doc.files === "object" ? doc.files : {};
            const fileNames = Object.keys(filesMap);

            const contentsMap: Record<string, string> = {};
            Object.entries(filesMap).forEach(([k, v]: [string, any]) => {
              contentsMap[k] = typeof v === "string" ? v : v?.content || "";
            });

            const date = doc.updatedAt ? new Date(doc.updatedAt) : new Date();
            const dateStr = date.toLocaleDateString();

            return {
              id: doc.projectId,
              title: doc.title || doc.projectId,
              desc: doc.desc || "Cloud project stored in MongoDB Atlas",
              framework: (doc.framework || (doc.templateKey === "qiskit" ? "qiskit" : "dwave")) as FrameworkType,
              updated: dateStr,
              files: fileNames.length > 0 ? fileNames : ["main.py"],
              activeFile: doc.activeFile || fileNames[0] || "main.py",
              isCustom: true,
              fileContents: contentsMap,
              cloudSynced: true,
            };
          });

          setProjects((prev) => {
            const cloudIds = new Set(cloudList.map((c) => c.id));
            const nonDuplicates = prev.filter((p) => !cloudIds.has(p.id));
            return [...cloudList, ...nonDuplicates];
          });

          // Activate targeted project if specified in URL or last active session
          if (typeof window !== "undefined") {
            try {
              const params = new URLSearchParams(window.location.search);
              const targetId = params.get("project") || params.get("projectId") || localStorage.getItem("quantum_ide_active_project_id");
              if (targetId) {
                const matchedCloud = cloudList.find((p) => p.id === targetId);
                if (matchedCloud && activeProject.id !== matchedCloud.id) {
                  handleSelectProject(matchedCloud);
                }
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn("Failed to load cloud projects:", err);
      } finally {
        setIsSyncing(false);
      }
    }

    if (isAuthenticated && user?.email) {
      loadCloudProjects();
    }
  }, [isAuthenticated, user?.email]);

  const [activeProject, setActiveProject] = useState<ProjectItem>(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("project") || params.get("projectId");
        const savedId = urlId || localStorage.getItem("quantum_ide_active_project_id");
        if (savedId) {
          const localCustom = localStorage.getItem("quantum_ide_custom_projects");
          const customList: ProjectItem[] = localCustom ? JSON.parse(localCustom) : [];
          const all = [...customList, ...INITIAL_PROJECTS];
          const matched = all.find((p) => p.id === savedId);
          if (matched) return matched;
        }
      } catch (e) {}
    }
    return INITIAL_PROJECTS[0];
  });

  const framework = activeProject.framework;

// Synchronize Execution History whenever active project switches
  useEffect(() => {
    if (typeof window !== "undefined" && activeProject?.id) {
      try {
        const stored = localStorage.getItem(`quantum_ide_history_${activeProject.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setExecutionHistory(parsed.filter((item: any) => !item.projectId || item.projectId === activeProject.id));
            return;
          }
        }
      } catch (e) {}
      setExecutionHistory([]);
    }
  }, [activeProject?.id]);

  const [heroTab, setHeroTab] = useState<HeroTabType>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedTab = localStorage.getItem("quantum_ide_hero_tab") as HeroTabType | null;
        if (savedTab) return savedTab;
      } catch (e) {}
    }
    return "code";
  });

  const [activeFile, setActiveFile] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedFile = localStorage.getItem("quantum_ide_active_file");
        if (savedFile && activeProject.files?.includes(savedFile)) return savedFile;
      } catch (e) {}
    }
    return activeProject.activeFile || activeProject.files?.[0] || "main.py";
  });

  const [dwaveCode, setDwaveCode] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("project") || params.get("projectId");
        const savedId = urlId || localStorage.getItem("quantum_ide_active_project_id") || "clean_energy_portfolio";
        const savedFile = localStorage.getItem("quantum_ide_active_file") || "main.py";
        const savedCode = localStorage.getItem(`quantum_ide_code_${savedId}_${savedFile}`);
        if (savedCode) {
          if (savedId !== "clean_energy_portfolio" && (savedCode.includes("# Quantum Guru — Clean Energy Portfolio Selection") || savedCode.includes("from qubo_matrix import get_qubo_model"))) {
            return NEW_DWAVE_STARTER_CODE;
          }
          return savedCode;
        }
      } catch (e) {}
    }
    return CLEAN_ENERGY_PORTFOLIO_CODE;
  });

  const [qiskitCode, setQiskitCode] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("project") || params.get("projectId");
        const savedId = urlId || localStorage.getItem("quantum_ide_active_project_id") || "quantum_journey_101";
        const savedFile = localStorage.getItem("quantum_ide_active_file") || (savedId === "quantum_journey_101" ? "journey.py" : "teleportation.py");
        const savedCode = localStorage.getItem(`quantum_ide_code_${savedId}_${savedFile}`);
        if (savedCode) return savedCode;
        if (savedId === "quantum_journey_101") return QUANTUM_JOURNEY_CODE;
      } catch (e) {}
    }
    return QUANTUM_JOURNEY_CODE;
  });

  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false);
  const [showAlgorithmStudioModal, setShowAlgorithmStudioModal] = useState<boolean>(false);

  // 🎓 Quantum Journey 101 Sequential Milestone & Quiz State
  const [journeyMilestoneId, setJourneyMilestoneId] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("quantum_journey_101_milestone");
        if (saved) return Math.min(4, Math.max(1, parseInt(saved, 10)));
      } catch (e) {}
    }
    return 1;
  });

  const [journeyStage, setJourneyStage] = useState<"explore" | "quiz" | "challenge" | "completed">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("quantum_journey_101_stage");
        if (saved === "quiz" || saved === "challenge" || saved === "completed") return saved;
      } catch (e) {}
    }
    return "explore";
  });

  // 🧭 Product Walkthrough Tour State
  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const [tourStep, setTourStep] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const seen = localStorage.getItem("quantum_tour_seen");
      if (!seen) {
        const timer = setTimeout(() => {
          setIsTourActive(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleStartTour = useCallback(() => {
    setTourStep(0);
    setHeroTab("code");
    setShowTerminal(false);
    setIsTourActive(true);
  }, []);

  const handleEndTour = useCallback(() => {
    setIsTourActive(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("quantum_tour_seen", "true");
    }
  }, []);

  const handleTourStepChange = useCallback((newStep: number) => {
    setTourStep(newStep);
    if (newStep === 0 || newStep === 1) {
      setHeroTab("code");
    } else if (newStep === 2) {
      setHeroTab("visual");
    } else if (newStep === 3) {
      setShowTerminal(true);
    }
  }, []);
  const [isDataConnectorsOpen, setIsDataConnectorsOpen] = useState<boolean>(false);

  const [isModelDirty, setIsModelDirty] = useState<boolean>(false);
  const [isRunningOrRecompiling, setIsRunningOrRecompiling] = useState<boolean>(false);
  const [terminalOutput, setTerminalOutput] = useState<string>("");
  const [showTerminal, setShowTerminal] = useState<boolean>(false);

  const handleCopyCode = () => {
    const currentCode = framework === "dwave" ? dwaveCode : qiskitCode;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(currentCode);
    }
  };
  const [latencyMs, setLatencyMs] = useState<number>(18.5);

  const [selectedMathSection, setSelectedMathSection] = useState<OptimizationSectionId>("01");

  const [mathParams, setMathParams] = useState<MathFormulationParams>({
    budgetMax: 18.0,
    yieldWeight: 1.0,
    minDiversity: 2,
    penaltyLambda: 3.5,
    hasMutualExclusion: true,
    hasCarbonCeiling: false,
    isMarkowitz: false,
  });

  const isPortfolio = activeProject.id === "clean_energy_portfolio";

  const DEFAULT_PORTFOLIO_RESULT: OptimizationResults = {
    energy: -62.2,
    sample: { Wind_A: 0, Solar_B: 0, Battery_C: 1, Hydro_D: 1 },
    num_variables: 4,
    variables: DEFAULT_VARIABLES,
    qubo_matrix: [
      [-11.25, 15.7, 7.7, 9.9],
      [15.7, -9.5, 5.1, 7.7],
      [7.7, 5.1, -18.0, 6.6],
      [9.9, 7.7, 6.6, -50.8],
    ],
    energy_distribution: [
      {
        energy: -62.2,
        sample: { Wind_A: 0, Solar_B: 0, Battery_C: 1, Hydro_D: 1 },
        num_occurrences: 540,
        bitstring: "0011",
      },
      {
        energy: -55.6,
        sample: { Wind_A: 0, Solar_B: 1, Battery_C: 0, Hydro_D: 1 },
        num_occurrences: 280,
        bitstring: "0101",
      },
      {
        energy: -48.1,
        sample: { Wind_A: 1, Solar_B: 0, Battery_C: 0, Hydro_D: 1 },
        num_occurrences: 120,
        bitstring: "1001",
      },
      {
        energy: -32.4,
        sample: { Wind_A: 0, Solar_B: 1, Battery_C: 1, Hydro_D: 0 },
        num_occurrences: 60,
        bitstring: "0110",
      },
    ],
  };

  const [solverResult, setSolverResult] = useState<OptimizationResults>(() => {
    if (typeof window !== "undefined") {
      try {
        const targetId = localStorage.getItem("quantum_ide_active_project_id") || "clean_energy_portfolio";
        if (targetId === "clean_energy_portfolio") {
          return DEFAULT_PORTFOLIO_RESULT;
        }
        const stored = localStorage.getItem(`quantum_ide_result_${targetId}`);
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }
    return activeProject.id === "clean_energy_portfolio"
      ? DEFAULT_PORTFOLIO_RESULT
      : {
          energy: 0,
          sample: {},
          num_variables: 0,
          variables: [],
          qubo_matrix: [],
          energy_distribution: [],
        };
  });

  const [qiskitSimulatorId, setQiskitSimulatorId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const targetId = localStorage.getItem("quantum_ide_active_project_id");
        if (targetId) {
          const stored = localStorage.getItem(`quantum_ide_qiskit_result_${targetId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.simulator_id) return parsed.simulator_id;
          }
        }
      } catch (e) {}
    }
    return "";
  });
  const [qiskitCounts, setQiskitCounts] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const targetId = localStorage.getItem("quantum_ide_active_project_id");
        if (targetId) {
          const stored = localStorage.getItem(`quantum_ide_qiskit_result_${targetId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.measurement_counts) return parsed.measurement_counts;
          }
        }
      } catch (e) {}
    }
    return {};
  });
  const [qiskitQubits, setQiskitQubits] = useState<number>(2);
  const [qiskitDepth, setQiskitDepth] = useState<number>(0);
  const [qiskitShots, setQiskitShots] = useState<number>(1024);
  const [circuitGates, setCircuitGates] = useState<any[]>([]);
  const [circuitAscii, setCircuitAscii] = useState<string>("");
  const [isCircuitSynced, setIsCircuitSynced] = useState<boolean>(true);

  const [dwaveCopilotMessages, setDwaveCopilotMessages] = useState<CopilotMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("quantum_ide_chat_clean_energy_portfolio");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((m: any) => ({ ...m, isStreaming: false }));
          }
        }
      } catch (e) {}
    }
    return DWAVE_INITIAL_MESSAGES;
  });
  const [qiskitCopilotMessages, setQiskitCopilotMessages] = useState<CopilotMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const activeId = new URLSearchParams(window.location.search).get("project") || localStorage.getItem("quantum_ide_active_project_id") || "quantum_journey_101";
        const saved = localStorage.getItem(`quantum_ide_chat_${activeId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((m: any) => ({
              ...m,
              isStreaming: false,
              text: sanitizeCachedChatText(m.text || ""),
            }));
          }
        }
        if (activeId === "quantum_journey_101") {
          return QUANTUM_JOURNEY_INITIAL_MESSAGES;
        }
      } catch (e) {}
    }
    return QUANTUM_JOURNEY_INITIAL_MESSAGES;
  });
  const copilotMessages = framework === "dwave" ? dwaveCopilotMessages : qiskitCopilotMessages;

  // Compute Q-Matrix analytically based on current sliders
  const currentMatrix = useMemo(() => {
    const N = DEFAULT_VARIABLES.length;
    const mat: number[][] = Array(N)
      .fill(0)
      .map(() => Array(N).fill(0));

    for (let i = 0; i < N; i++) {
      const yieldTerm = -ASSET_YIELDS[i] * mathParams.yieldWeight;
      const penaltySelf =
        mathParams.penaltyLambda *
        ASSET_COSTS[i] *
        (ASSET_COSTS[i] - 2 * mathParams.budgetMax) *
        0.005;
      mat[i][i] = parseFloat((yieldTerm + penaltySelf).toFixed(2));

      for (let j = i + 1; j < N; j++) {
        let coupler =
          mathParams.penaltyLambda * ASSET_COSTS[i] * ASSET_COSTS[j] * 0.035;

        if (i === 0 && j === 1 && mathParams.hasMutualExclusion) {
          coupler += 8.0;
        }

        const rounded = parseFloat(coupler.toFixed(2));
        mat[i][j] = rounded;
        mat[j][i] = rounded;
      }
    }
    return mat;
  }, [mathParams]);

  useEffect(() => {
    setIsModelDirty(true);
  }, [mathParams]);

  // Restore active project, file, and code on refresh from URL or localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlProjectId = params.get("project") || params.get("projectId");
      const savedProjectId = urlProjectId || localStorage.getItem("quantum_ide_active_project_id");
      const savedFile = localStorage.getItem("quantum_ide_active_file");
      const savedTab = localStorage.getItem("quantum_ide_hero_tab") as HeroTabType | null;

      if (savedProjectId) {
        const matched = projects.find((p) => p.id === savedProjectId);
        if (matched) {
          setActiveProject(matched);
          const initialFile =
            savedFile && matched.files.includes(savedFile)
              ? savedFile
              : matched.activeFile || matched.files?.[0] || "main.py";
          setActiveFile(initialFile);
          if (savedTab) {
            setHeroTab(savedTab);
          }

          // Restore code from localStorage or project fileContents
          let savedCode = localStorage.getItem(`quantum_ide_code_${matched.id}_${initialFile}`);
          if (!savedCode && matched.fileContents && matched.fileContents[initialFile]) {
            savedCode = matched.fileContents[initialFile];
          }

          // Check if custom project has cross-contaminated portfolio code
          if (matched.id !== "clean_energy_portfolio" && savedCode && (savedCode.includes("# Quantum Guru — Clean Energy Portfolio Selection") || savedCode.includes("from qubo_matrix import get_qubo_model"))) {
            savedCode = matched.framework === "dwave" ? NEW_DWAVE_STARTER_CODE : NEW_QISKIT_STARTER_CODE;
            try {
              localStorage.setItem(`quantum_ide_code_${matched.id}_${initialFile}`, savedCode);
            } catch (e) {}
          }

          if (savedCode) {
            if (matched.framework === "dwave") {
              setDwaveCode(savedCode);
            } else {
              setQiskitCode(savedCode);
            }
          }

          // Restore chat from localStorage for the active project
          let savedChat: CopilotMessage[] | null = null;
          try {
            const stored = localStorage.getItem(`quantum_ide_chat_${matched.id}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                savedChat = parsed.map((m: any) => ({ ...m, isStreaming: false }));
              }
            }
          } catch (e) {}

          if (savedChat) {
            if (matched.framework === "dwave") {
              setDwaveCopilotMessages(savedChat);
            } else {
              setQiskitCopilotMessages(savedChat);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to restore active project from storage:", e);
    }
  }, [projects]);

  // Synchronize Circuit Canvas (including qc.barrier step alignment) whenever qiskitCode updates
  useEffect(() => {
    if (framework === "dwave") return;
    const hasQc = /QuantumCircuit\(/.test(qiskitCode);
    if (!hasQc) return;

    const parsed = parseQiskitCodeToCircuit(qiskitCode);
    setCircuitGates(parsed.gates);
    setQiskitQubits(parsed.numQubits);
    setQiskitDepth(parsed.depth);
  }, [qiskitCode, framework]);

  // Real-time auto-save of current editor code to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const currentCode = framework === "dwave" ? dwaveCode : qiskitCode;
      localStorage.setItem(`quantum_ide_code_${activeProject.id}_${activeFile}`, currentCode);
    } catch (e) {
      console.warn("Failed to auto-save code to localStorage:", e);
    }
  }, [dwaveCode, qiskitCode, activeProject.id, activeFile, framework]);

  // Real-time auto-save of copilot messages to localStorage per active project
  useEffect(() => {
    if (typeof window === "undefined" || !activeProject?.id) return;
    try {
      const msgs = framework === "dwave" ? dwaveCopilotMessages : qiskitCopilotMessages;
      localStorage.setItem(`quantum_ide_chat_${activeProject.id}`, JSON.stringify(msgs));
    } catch (e) {
      console.warn("Failed to auto-save copilot messages to localStorage:", e);
    }
  }, [dwaveCopilotMessages, qiskitCopilotMessages, activeProject.id, framework]);

  const handleSelectHeroTab = (tab: HeroTabType) => {
    setHeroTab(tab);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("quantum_ide_hero_tab", tab);
      } catch (e) {}
    }
  };

  const handleSelectFile = (file: string) => {
    setActiveFile(file);
    let loadedCode = "";
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("quantum_ide_active_file", file);
        loadedCode = localStorage.getItem(`quantum_ide_code_${activeProject.id}_${file}`) || "";
      } catch (e) {}
    }
    if (!loadedCode && activeProject.fileContents && activeProject.fileContents[file]) {
      loadedCode = activeProject.fileContents[file];
    }
    if (!loadedCode) {
      loadedCode = `# ${file}\n`;
    }
    if (framework === "dwave") {
      setDwaveCode(loadedCode);
    } else {
      setQiskitCode(loadedCode);
    }
  };

  // Framework & Project Switch Handler
  const handleSelectProject = (proj: ProjectItem) => {
    setActiveProject(proj);
    const targetFile = proj.activeFile || proj.files?.[0] || "main.py";
    setActiveFile(targetFile);
    const targetTab: HeroTabType = "code";
    setHeroTab(targetTab);

    // Retrieve saved code for this project and file from localStorage or fileContents
    let loadedCode = "";
    if (typeof window !== "undefined") {
      try {
        loadedCode = localStorage.getItem(`quantum_ide_code_${proj.id}_${targetFile}`) || "";
      } catch (e) {}
    }
    if (!loadedCode && proj.fileContents && proj.fileContents[targetFile]) {
      loadedCode = proj.fileContents[targetFile];
    }
    // Check for contamination in custom projects
    if (proj.id !== "clean_energy_portfolio" && loadedCode && (loadedCode.includes("# Quantum Guru — Clean Energy Portfolio Selection") || loadedCode.includes("from qubo_matrix import get_qubo_model"))) {
      loadedCode = proj.framework === "dwave" ? NEW_DWAVE_STARTER_CODE : NEW_QISKIT_STARTER_CODE;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`quantum_ide_code_${proj.id}_${targetFile}`, loadedCode);
        } catch (e) {}
      }
    }

    if (!loadedCode) {
      if (proj.id === "clean_energy_portfolio") {
        loadedCode = CLEAN_ENERGY_PORTFOLIO_CODE;
      } else if (proj.id === "quantum_journey_101") {
        loadedCode = QUANTUM_JOURNEY_CODE;
      } else if (proj.id === "quantum_teleportation") {
        loadedCode = QISKIT_INITIAL_CODE;
      } else if (proj.id === "maxcut_bipartite_graph") {
        loadedCode = MAXCUT_INITIAL_CODE;
      } else if (proj.id === "vqe_h2_molecule") {
        loadedCode = VQE_INITIAL_CODE;
      } else {
        loadedCode = proj.framework === "dwave" ? NEW_DWAVE_STARTER_CODE : NEW_QISKIT_STARTER_CODE;
      }
    }

    if (proj.framework === "dwave") {
      setDwaveCode(loadedCode);
    } else {
      setQiskitCode(loadedCode);
    }

    // Clear console terminal upon project switch
    setTerminalOutput("");
    setShowTerminal(false);

    // Save outgoing project's copilot messages before switching
    if (activeProject?.id) {
      const currentMsgs = framework === "dwave" ? dwaveCopilotMessages : qiskitCopilotMessages;
      try {
        localStorage.setItem(`quantum_ide_chat_${activeProject.id}`, JSON.stringify(currentMsgs));
      } catch (e) {}
    }

    // Restore or initialize AI Copilot messages for the target project
    let savedChat: CopilotMessage[] | null = null;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`quantum_ide_chat_${proj.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            savedChat = parsed.map((m: any) => ({
              ...m,
              isStreaming: false,
              text: sanitizeCachedChatText(m.text || ""),
            }));
          }
        }
      } catch (e) {}
    }

    if (proj.framework === "dwave") {
      setDwaveCopilotMessages(savedChat || [...DWAVE_INITIAL_MESSAGES]);
    } else if (proj.id === "quantum_journey_101") {
      setQiskitCopilotMessages(savedChat || [...QUANTUM_JOURNEY_INITIAL_MESSAGES]);
    } else {
      setQiskitCopilotMessages(savedChat || [...QISKIT_INITIAL_MESSAGES]);
    }

    if (proj.id === "clean_energy_portfolio") {
      setSolverResult(DEFAULT_PORTFOLIO_RESULT);
    } else {
      let savedRes = null;
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(`quantum_ide_result_${proj.id}`);
          if (stored) savedRes = JSON.parse(stored);
        } catch (e) {}
      }
      setSolverResult(
        savedRes || {
          energy: 0,
          sample: {},
          num_variables: 0,
          variables: [],
          qubo_matrix: [],
          energy_distribution: [],
          latex_formula: "",
        }
      );
    }

    if (proj.framework === "qiskit") {
      let savedQiskit = null;
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(`quantum_ide_qiskit_result_${proj.id}`);
          if (stored) savedQiskit = JSON.parse(stored);
        } catch (e) {}
      }
      if (savedQiskit) {
        setQiskitCounts(savedQiskit.measurement_counts || {});
        setCircuitGates(savedQiskit.circuit_gates || []);
        setCircuitAscii(savedQiskit.circuit_ascii || "");
        setQiskitQubits(savedQiskit.active_qubits || 2);
        setQiskitDepth(savedQiskit.circuit_depth || 0);
        setQiskitSimulatorId(savedQiskit.simulator_id || "");
      } else {
        setQiskitCounts({});
        setCircuitGates([]);
        setCircuitAscii("");
        setQiskitQubits(2);
        setQiskitDepth(0);
        setQiskitSimulatorId("");
      }
    }

    // Restore project-isolated Execution History
    if (typeof window !== "undefined") {
      try {
        const storedHistory = localStorage.getItem(`quantum_ide_history_${proj.id}`);
        if (storedHistory) {
          const parsed = JSON.parse(storedHistory);
          const filtered = Array.isArray(parsed)
            ? parsed.filter((item: any) => !item.projectId || item.projectId === proj.id)
            : [];
          setExecutionHistory(filtered);
        } else {
          setExecutionHistory([]);
        }
      } catch (e) {
        setExecutionHistory([]);
      }
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("quantum_ide_active_project_id", proj.id);
        localStorage.setItem("quantum_ide_active_file", targetFile);
        localStorage.setItem("quantum_ide_hero_tab", targetTab);
        window.history.replaceState(null, "", `/ide?project=${encodeURIComponent(proj.id)}`);
      } catch (e) {}
    }
  };

    const handleAddFile = (fileName: string) => {
    if (!fileName || !fileName.trim()) return;
    const cleanName = fileName.trim();
    if (!activeProject.files.includes(cleanName)) {
      const updated = {
        ...activeProject,
        files: [...activeProject.files, cleanName],
        activeFile: cleanName,
      };
      setActiveProject(updated);
      setProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setActiveFile(cleanName);
      setHeroTab("code");
    } else {
      setActiveFile(cleanName);
      setHeroTab("code");
    }
  };

  const handleCreateProjectFromAlgorithm = (algo: AlgorithmBankItem, projectName: string) => {
    const fw = algo.primaryFramework || algo.framework || "dwave";
    const targetFile = "main.py";
    const finalName = projectName.trim() || `my-${algo.slug}`;
    const projId = `algo_${finalName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;
    const newProj: ProjectItem = {
      id: projId,
      title: finalName,
      desc: algo.description,
      framework: fw,
      updated: "Just now",
      files: [targetFile],
      activeFile: targetFile,
      fileContents: { [targetFile]: algo.code },
      isCustom: true,
      cloudSynced: false,
    };
    handleCreateProject(newProj);
  };

  const handleCreateProject = async (newProj: ProjectItem) => {
    const targetFile = newProj.activeFile || newProj.files?.[0] || "main.py";
    const initialCode =
      newProj.fileContents?.[targetFile] ||
      (newProj.framework === "dwave" ? NEW_DWAVE_STARTER_CODE : NEW_QISKIT_STARTER_CODE);

    const customProj: ProjectItem = {
      ...newProj,
      isCustom: true,
      cloudSynced: false,
      fileContents: newProj.fileContents || { [targetFile]: initialCode },
    };

    setProjects((prev) => [customProj, ...prev]);
    setActiveProject(customProj);
    setActiveFile(targetFile);
    setHeroTab("code");

    // Save outgoing project's copilot messages before switching
    if (activeProject?.id) {
      const currentMsgs = framework === "dwave" ? dwaveCopilotMessages : qiskitCopilotMessages;
      try {
        localStorage.setItem(`quantum_ide_chat_${activeProject.id}`, JSON.stringify(currentMsgs));
      } catch (e) {}
    }

    // 1. Reset AI block clean for the newly created project
    const freshMessages = customProj.framework === "dwave" ? [...DWAVE_INITIAL_MESSAGES] : [...QISKIT_INITIAL_MESSAGES];
    setDwaveCopilotMessages([...DWAVE_INITIAL_MESSAGES]);
    setQiskitCopilotMessages([...QISKIT_INITIAL_MESSAGES]);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`quantum_ide_chat_${customProj.id}`, JSON.stringify(freshMessages));
      } catch (e) {}
    }

    // Common Console & Execution clean state
    setTerminalOutput("");
    setShowTerminal(false);
    setIsRunningOrRecompiling(false);
    setExecutionHistory([]);

    if (customProj.framework === "dwave") {
      // 2. D-Wave Project Clean:
      // a. Code editor
      setDwaveCode(initialCode);
      // b. Model clean state
      setMathParams({
        budgetMax: 18.0,
        yieldWeight: 1.0,
        minDiversity: 2,
        penaltyLambda: 3.5,
        hasMutualExclusion: false,
        hasCarbonCeiling: false,
        isMarkowitz: false,
      });
      setSelectedMathSection("01");
      setIsModelDirty(false);
      // c. QUBO and Result clean state
      setSolverResult({
        energy: 0,
        sample: {},
        num_variables: 0,
        variables: [],
        qubo_matrix: [],
        energy_distribution: [],
        num_reads: 0,
        latex_formula: "",
      });
    } else {
      // 3. Qiskit Project Clean:
      // a. Code editor
      setQiskitCode(initialCode);
      // b. Circuit canvas clean state
      setCircuitGates([]);
      setQiskitQubits(2);
      setQiskitDepth(0);
      setCircuitAscii("");
      setIsCircuitSynced(true);
      // c. Result clean state
      setQiskitCounts({});
      setQiskitSimulatorId("");
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("quantum_ide_active_project_id", customProj.id);
        localStorage.setItem("quantum_ide_active_file", targetFile);
        localStorage.setItem("quantum_ide_hero_tab", "code");
        localStorage.setItem(`quantum_ide_code_${customProj.id}_${targetFile}`, initialCode);
        localStorage.removeItem(`quantum_ide_result_${customProj.id}`);
        localStorage.removeItem(`quantum_ide_qiskit_result_${customProj.id}`);

        const stored = localStorage.getItem("quantum_ide_custom_projects");
        const list: ProjectItem[] = stored ? JSON.parse(stored) : [];
        localStorage.setItem("quantum_ide_custom_projects", JSON.stringify([customProj, ...list.filter(p => p.id !== customProj.id)]));

        window.history.replaceState(null, "", `/ide?project=${encodeURIComponent(customProj.id)}`);
      } catch (e) {}
    }

    // Persist to MongoDB Atlas if authenticated
    if (user?.email) {
      try {
        setIsSyncing(true);
        const filesPayload: Record<string, any> = {};
        customProj.files.forEach((f) => {
          filesPayload[f] = {
            name: f,
            lang: f.endsWith(".py") ? "python" : f.endsWith(".json") ? "json" : "text",
            content: f === targetFile ? initialCode : `# ${f}`,
          };
        });

        await fetch(`/api/ide/projects?email=${encodeURIComponent(user.email)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": user.email,
          },
          body: JSON.stringify({
            projectId: customProj.id,
            title: customProj.title,
            desc: customProj.desc,
            templateKey: customProj.framework,
            framework: customProj.framework,
            activeFile: targetFile,
            files: filesPayload,
          }),
        });

        setProjects((prev) =>
          prev.map((p) => (p.id === customProj.id ? { ...p, cloudSynced: true } : p))
        );
      } catch (err) {
        console.warn("Failed to persist project to MongoDB:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;

    if (!window.confirm(`Are you sure you want to delete "${target.title}"?`)) return;

    setProjects((prev) => prev.filter((p) => p.id !== projectId));

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("quantum_ide_custom_projects");
        if (stored) {
          const list: ProjectItem[] = JSON.parse(stored);
          localStorage.setItem("quantum_ide_custom_projects", JSON.stringify(list.filter(p => p.id !== projectId)));
        }
        localStorage.removeItem(`quantum_ide_chat_${projectId}`);
        localStorage.removeItem(`quantum_ide_history_${projectId}`);
      } catch (e) {}
    }

    if (activeProject.id === projectId) {
      const fallback = projects.find((p) => p.id !== projectId) || INITIAL_PROJECTS[0];
      handleSelectProject(fallback);
    }

    if (user?.email && target.isCustom) {
      try {
        setIsSyncing(true);
        await fetch(`/api/ide/projects?projectId=${encodeURIComponent(projectId)}&email=${encodeURIComponent(user.email)}`, {
          method: "DELETE",
          headers: {
            "x-user-email": user.email,
          },
        });
      } catch (err) {
        console.warn("Failed to delete project from MongoDB:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Recompile / Run Solver Trigger

  // Debounced cloud auto-save to MongoDB Atlas
  useEffect(() => {
    if (!user?.email || !activeProject.isCustom) return;

    const timer = setTimeout(async () => {
      try {
        setIsSyncing(true);
        const currentCode = activeProject.framework === "dwave" ? dwaveCode : qiskitCode;

        const filesPayload: Record<string, any> = {
          ...(activeProject.fileContents
            ? Object.fromEntries(
                Object.entries(activeProject.fileContents).map(([k, v]) => [
                  k,
                  { name: k, lang: k.endsWith(".py") ? "python" : "text", content: v },
                ])
              )
            : {}),
          [activeFile]: {
            name: activeFile,
            lang: activeFile.endsWith(".py") ? "python" : "text",
            content: currentCode,
          },
        };

        await fetch(`/api/ide/projects?email=${encodeURIComponent(user.email)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": user.email,
          },
          body: JSON.stringify({
            projectId: activeProject.id,
            title: activeProject.title,
            desc: activeProject.desc,
            templateKey: activeProject.framework,
            framework: activeProject.framework,
            activeFile: activeFile,
            files: filesPayload,
          }),
        });
      } catch (e) {
        console.warn("Auto-save to cloud failed:", e);
      } finally {
        setIsSyncing(false);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [dwaveCode, qiskitCode, activeFile, activeProject, user?.email]);

  const handleUpdateQubitCount = (newCount: number) => {
    const clamped = Math.min(30, Math.max(1, newCount));
    setQiskitQubits(clamped);

    // Update QuantumCircuit(N, N) initialization in Python code
    setQiskitCode((prevCode) => {
      let updated = prevCode;
      const qcRegex = /QuantumCircuit\(\s*\d+\s*(?:,\s*\d+\s*)?\)/;
      if (qcRegex.test(updated)) {
        updated = updated.replace(qcRegex, `QuantumCircuit(${clamped}, ${clamped})`);
      } else {
        updated = `from qiskit import QuantumCircuit\nqc = QuantumCircuit(${clamped}, ${clamped})\n` + updated;
      }
      return updated;
    });

    // Prune gates that now exceed the new qubit capacity
    setCircuitGates((prev) =>
      prev.filter((g) => {
        const q = g.qubit ?? (g.qubits ? g.qubits[0] : 0);
        const tgt = g.qubits && g.qubits.length > 1 ? g.qubits[1] : q;
        return q < clamped && tgt < clamped;
      })
    );

    setIsCircuitSynced(true);
  };

  const handleAddGateToCircuit = (gateName: string, qubit: number, targetQubit?: number, step?: number) => {
    const gateUpper = gateName.toUpperCase();
    const neededQubits = Math.max(qubit + 1, targetQubit !== undefined ? targetQubit + 1 : 1);
    setQiskitQubits((prev) => Math.max(prev, neededQubits));

    // Intelligently find where QuantumCircuit is declared (global scope or inside ansatz/function)
    setQiskitCode((prevCode) => {
      const lines = prevCode.split("\n");

      // 1. Locate QuantumCircuit instantiation
      let circuitDefIdx = -1;
      let circuitVar = "qc";
      let baseIndent = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s*)([a-zA-Z0-9_]+)\s*=\s*(?:[a-zA-Z0-9_]+\.)?QuantumCircuit\(/);
        if (match) {
          baseIndent = match[1];
          circuitVar = match[2];
          circuitDefIdx = i;
          break;
        }
      }

      // Auto-expand QuantumCircuit qubit count if user placed gate on higher wire
      if (circuitDefIdx !== -1) {
        lines[circuitDefIdx] = lines[circuitDefIdx].replace(
          /(QuantumCircuit\(\s*)(\d+)(?:(\s*,\s*)(\d+))?/,
          (m, prefix, nQ, comma, nC) => {
            const curQ = parseInt(nQ, 10);
            const newQ = Math.max(curQ, neededQubits);
            if (comma && nC !== undefined) {
              const curC = parseInt(nC, 10);
              const newC = Math.max(curC, newQ);
              return `${prefix}${newQ}${comma}${newC}`;
            }
            return `${prefix}${newQ}`;
          }
        );
      }

      // 2. Generate gate call with actual variable name
      let gateCall = "";
      switch (gateUpper) {
        case "H":
          gateCall = `${circuitVar}.h(${qubit})`;
          break;
        case "X":
          gateCall = `${circuitVar}.x(${qubit})`;
          break;
        case "Y":
          gateCall = `${circuitVar}.y(${qubit})`;
          break;
        case "Z":
          gateCall = `${circuitVar}.z(${qubit})`;
          break;
        case "S":
          gateCall = `${circuitVar}.s(${qubit})`;
          break;
        case "T":
          gateCall = `${circuitVar}.t(${qubit})`;
          break;
        case "RX":
          gateCall = `${circuitVar}.rx(1.57, ${qubit})`;
          break;
        case "RY":
          gateCall = `${circuitVar}.ry(1.57, ${qubit})`;
          break;
        case "RZ":
          gateCall = `${circuitVar}.rz(1.57, ${qubit})`;
          break;
        case "CX":
        case "CNOT":
          gateCall = `${circuitVar}.cx(${qubit}, ${targetQubit ?? (qubit + 1) % qiskitQubits})`;
          break;
        case "CZ":
          gateCall = `${circuitVar}.cz(${qubit}, ${targetQubit ?? (qubit + 1) % qiskitQubits})`;
          break;
        case "SWAP":
          gateCall = `${circuitVar}.swap(${qubit}, ${targetQubit ?? (qubit + 1) % qiskitQubits})`;
          break;
        case "M":
        case "MEASURE":
          gateCall = `${circuitVar}.measure(${qubit}, ${qubit})`;
          break;
        case "BARRIER":
        case "B":
          gateCall = `${circuitVar}.barrier()`;
          break;
        default:
          gateCall = `${circuitVar}.u(1.57, 0, 0, ${qubit})`;
          break;
      }

      const formattedLine = `${baseIndent}${gateCall}`;

      // 3. Insert inside the correct scope where the circuit exists
      if (circuitDefIdx !== -1) {
        let insertAt = circuitDefIdx + 1;
        let lastGateIdx = -1;
        let terminalIdx = -1;

        for (let j = circuitDefIdx + 1; j < lines.length; j++) {
          const l = lines[j];
          const trimmed = l.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;

          // Scope check: if indentation drops lower than baseIndent, the block ended
          const currentIndent = l.match(/^(\s*)/)?.[1] || "";
          if (baseIndent && currentIndent.length < baseIndent.length && trimmed.length > 0) {
            break;
          }

          // Terminal statements on this circuit inside its scope
          if (
            trimmed.startsWith(`${circuitVar}.save_statevector`) ||
            trimmed.startsWith(`${circuitVar}.measure_all`) ||
            trimmed.startsWith(`${circuitVar}.measure`) ||
            trimmed.startsWith(`return `) ||
            trimmed.startsWith(`sim.run`)
          ) {
            terminalIdx = j;
            break;
          }

          // Other gate on this circuit
          if (trimmed.startsWith(`${circuitVar}.`)) {
            lastGateIdx = j;
          }
        }

        if (terminalIdx !== -1) {
          insertAt = terminalIdx;
        } else if (lastGateIdx !== -1) {
          insertAt = lastGateIdx + 1;
        } else {
          insertAt = circuitDefIdx + 1;
        }

        lines.splice(insertAt, 0, formattedLine);
        return lines.join("\n");
      }

      // Fallback: If no QuantumCircuit exists yet, initialize one
      const preamble = `from qiskit import QuantumCircuit\nqc = QuantumCircuit(${Math.max(qubit + 1, 2)})\n`;
      return preamble + `${formattedLine}\n` + prevCode;
    });

    // Update visual circuit state
    const newGate = {
      name: gateUpper.toLowerCase(),
      qubit,
      qubits: targetQubit !== undefined ? [qubit, targetQubit] : [qubit],
      step: step !== undefined ? step : circuitGates.length,
      role: targetQubit !== undefined ? "two" : "single",
    };

    setCircuitGates((prev) => [...prev, newGate]);
    setQiskitDepth((prev) => Math.max(prev, (step ?? prev) + 1));
    setIsCircuitSynced(true);
  };

  const handleRemoveGateFromCircuit = (gateIndex: number) => {
    const gateToRemove = circuitGates[gateIndex];
    const tgt = gateToRemove
      ? (gateToRemove.target !== undefined ? gateToRemove.target : (gateToRemove.qubits && gateToRemove.qubits.length > 1 ? gateToRemove.qubits[1] : undefined))
      : undefined;
    const q = gateToRemove?.qubit;

    if (gateToRemove) {
      setQiskitCode((prevCode) => {
        const lines = prevCode.split("\n");
        const gateName = (gateToRemove.name || "").toLowerCase();
        const isCx = gateName === "cx" || gateName === "cnot";

        // Find the line matching this gate from the bottom
        let removeIdx = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
          const trimmed = lines[i].replace(/#.*$/, "").trim();
          const nameMatch = isCx
            ? (trimmed.includes(".cx") || trimmed.includes(".cnot"))
            : trimmed.includes(`.${gateName}`);

          if (tgt !== undefined) {
            if (nameMatch && trimmed.includes(String(q)) && trimmed.includes(String(tgt))) {
              removeIdx = i;
              break;
            }
          } else {
            if (nameMatch && trimmed.includes(String(q))) {
              removeIdx = i;
              break;
            }
          }
        }

        if (removeIdx !== -1) {
          lines.splice(removeIdx, 1);
          return lines.join("\n");
        }
        return prevCode;
      });
    }

    setCircuitGates((prev) =>
      prev.filter((g, idx) => {
        if (idx === gateIndex) return false;
        if (gateToRemove && tgt !== undefined && q !== undefined) {
          if (
            (g.name || "").toLowerCase() === (gateToRemove.name || "").toLowerCase() &&
            g.step === gateToRemove.step &&
            ((g.qubit === q && g.target === tgt) || (g.qubit === tgt && g.target === q))
          ) {
            return false;
          }
        }
        return true;
      })
    );
    setIsCircuitSynced(true);
  };

  const handleSyncCodeAndCircuit = useCallback(() => {
    if (framework === "dwave") {
      setIsModelDirty(false);
      setIsCircuitSynced(true);
      return;
    }

    // Explicit manual sync: parse editor Python code into visual schematic tiles without execution
    const parsed = parseQiskitCodeToCircuit(qiskitCode);
    setCircuitGates(parsed.gates);
    setQiskitQubits(parsed.numQubits);
    setQiskitDepth(parsed.depth);
    setIsCircuitSynced(true);
  }, [framework, qiskitCode]);

  const handleRunOrRecompile = useCallback(async () => {
    setIsRunningOrRecompiling(true);
    setShowTerminal(true);
    const t0 = performance.now();

    if (framework === "dwave") {
      try {
        // Execute the user's actual D-Wave Python code directly in the sandbox!
        const response = await fetch("/api/ide/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: dwaveCode,
            target_backend: "dwave_simulated_annealing",
            shots: 1024,
          }),
        });

        const data = await response.json();
        const dur = performance.now() - t0;
        setLatencyMs(parseFloat(dur.toFixed(1)));

        if (data.success) {
          if (data.optimization_results) {
            const opt = data.optimization_results;
            const newRes: OptimizationResults = {
              energy: opt.energy,
              sample: opt.sample,
              num_variables: opt.num_variables || Object.keys(opt.sample).length,
              variables: opt.variables || Object.keys(opt.sample),
              qubo_matrix: opt.qubo_matrix || [],
              energy_distribution: opt.energy_distribution || [],
              num_reads: opt.num_reads,
              latex_formula: opt.latex_formula,
            };
            setSolverResult(newRes);
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(`quantum_ide_result_${activeProject.id}`, JSON.stringify(newRes));
              } catch (e) {}
            }

            const chosen = Object.entries(opt.sample)
              .filter(([_, v]) => v === 1)
              .map(([k]) => k)
              .join(", ");

            const stdoutClean = data.stdout ? data.stdout.trim() : "";
            const simIdFlag = data.simulator_id ? ` --job-id ${data.simulator_id}` : "";
            setTerminalOutput(
              `$ dwave-anneal --backend simulated_annealing${simIdFlag}\n` +
                (stdoutClean ? `${stdoutClean}\n\n` : "") +
                `[SUCCESS] Annealing simulation completed in ${dur.toFixed(1)}ms (Worker Slot #${data.worker_slot || 1})\n` +
                (data.simulator_id ? `⚡ Simulation ID: ${data.simulator_id}\n` : "") +
                `⚡ Ground State Energy: ${opt.energy.toFixed(4)}\n` +
                `⚡ Optimal Active Variables: [${chosen || "None"}]\n` +
                `⚡ Sampled Eigenstates: ${opt.energy_distribution?.length || 0}\n`
            );
          } else {
            setTerminalOutput(
              `$ dwave-anneal --backend simulated_annealing\n` +
                `[SUCCESS] Completed in ${dur.toFixed(1)}ms\n` +
                (data.stdout ? `\n${data.stdout}` : "")
            );
          }
          const now = new Date();
          const curProjId = activeProject.id;
          const dItem: ExecutionHistoryItem = {
            id: data.simulator_id || `DW-${Date.now()}`,
            projectId: curProjId,
            timestamp: now.toISOString(),
            formattedDate: now.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            framework: "dwave",
            status: "success",
            latencyMs: parseFloat(dur.toFixed(1)),
            shots: 1024,
            summary: data.optimization_results
              ? `Energy: ${data.optimization_results.energy?.toFixed(4)} • ${Object.keys(data.optimization_results.sample || {}).length} vars`
              : "D-Wave Simulated Annealing executed",
            stdout: data.stdout || "",
            stderr: data.stderr || "",
            jobId: data.simulator_id,
          };
          let curHist: ExecutionHistoryItem[] = [];
          if (typeof window !== "undefined") {
            try {
              const raw = localStorage.getItem(`quantum_ide_history_${curProjId}`);
              if (raw) curHist = JSON.parse(raw);
            } catch {}
          }
          const updatedDwave = [dItem, ...curHist.filter((x: any) => !x.projectId || x.projectId === curProjId).slice(0, 19)];
          setExecutionHistory(updatedDwave);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`quantum_ide_history_${curProjId}`, JSON.stringify(updatedDwave));
            } catch {}
          }

          setIsModelDirty(false);
          // NOTE: User's code in the editor is preserved 100%! Never overwrite dwaveCode!
        } else {
          setTerminalOutput(`[STDERR] ${data.stderr || data.error || "D-Wave execution error"}`);
        }
      } catch (err: any) {
        setTerminalOutput(`[ERROR] D-Wave execution failed: ${err.message}`);
      } finally {
        setIsRunningOrRecompiling(false);
        setIsCircuitSynced(true);
      }
    } else {
      // Qiskit execution via server-side Next.js proxy
      try {
        setShowTerminal(true);
        // Extract shots if defined in code, else default to 1024
        const shotsMatch = qiskitCode.match(/shots\s*=\s*(\d+)/);
        const execShots = shotsMatch ? parseInt(shotsMatch[1], 10) : 1024;

        const response = await fetch("/api/ide/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: qiskitCode,
            target_backend: "aer_simulator",
            shots: execShots,
          }),
        });

        const data = await response.json();
        const dur = performance.now() - t0;
        setLatencyMs(parseFloat(dur.toFixed(1)));

        if (data.success) {
          if (data.simulator_id) {
            setQiskitSimulatorId(data.simulator_id);
          }
          if (data.measurement_counts && Object.keys(data.measurement_counts).length > 0) {
            setQiskitCounts(data.measurement_counts);
            const total = Object.values(data.measurement_counts as Record<string, number>).reduce((a, b) => a + b, 0);
            if (total > 0) setQiskitShots(total);
          }
          if (data.circuit_gates) {
            setCircuitGates(data.circuit_gates);
          }
          if (data.circuit_ascii) {
            setCircuitAscii(data.circuit_ascii);
          }
          if (data.active_qubits !== undefined) {
            setQiskitQubits(data.active_qubits);
          }
          if (data.circuit_depth !== undefined) {
            setQiskitDepth(data.circuit_depth);
          }

          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(
                `quantum_ide_qiskit_result_${activeProject.id}`,
                JSON.stringify({
                  measurement_counts: data.measurement_counts,
                  circuit_gates: data.circuit_gates,
                  circuit_ascii: data.circuit_ascii,
                  active_qubits: data.active_qubits,
                  circuit_depth: data.circuit_depth,
                  simulator_id: data.simulator_id,
                })
              );
            } catch (e) {}
          }

          const now = new Date();
          const curProjId = activeProject.id;
          const qItem: ExecutionHistoryItem = {
            id: data.simulator_id || `SIM-${Date.now()}`,
            projectId: curProjId,
            timestamp: now.toISOString(),
            formattedDate: now.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            framework: "qiskit",
            status: "success",
            latencyMs: parseFloat(dur.toFixed(1)),
            shots: execShots,
            summary: data.measurement_counts && Object.keys(data.measurement_counts).length > 0
              ? `${Object.keys(data.measurement_counts).length} states measured • ${execShots} shots`
              : (data.active_qubits ? `${data.active_qubits} qubits • depth ${data.circuit_depth ?? 1}` : "Qiskit Aer Simulator executed"),
            stdout: data.stdout || "",
            stderr: data.stderr || "",
            jobId: data.simulator_id,
          };
          let curHist: ExecutionHistoryItem[] = [];
          if (typeof window !== "undefined") {
            try {
              const raw = localStorage.getItem(`quantum_ide_history_${curProjId}`);
              if (raw) curHist = JSON.parse(raw);
            } catch {}
          }
          const updatedQiskit = [qItem, ...curHist.filter((x: any) => !x.projectId || x.projectId === curProjId).slice(0, 19)];
          setExecutionHistory(updatedQiskit);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`quantum_ide_history_${curProjId}`, JSON.stringify(updatedQiskit));
            } catch {}
          }

          const qSimIdFlag = data.simulator_id ? ` --job-id ${data.simulator_id}` : "";
          setTerminalOutput(
            `$ qiskit-aer --backend aer_simulator --shots ${execShots}${qSimIdFlag}\n` +
              `[SUCCESS] Simulation completed in ${dur.toFixed(1)}ms (Worker Slot #${data.worker_slot || 1})\n` +
              (data.simulator_id ? `⚡ Simulation ID: ${data.simulator_id}\n` : "") +
              `Active Qubits: ${data.active_qubits ?? 1} | Depth: ${data.circuit_depth ?? 1}\n` +
              `Measurement Counts: ${JSON.stringify(data.measurement_counts || {})}\n` +
              (data.stdout ? `\n--- Standard Output ---\n${data.stdout}` : "") +
              (data.circuit_ascii ? `\n--- Circuit Diagram ---\n${data.circuit_ascii}` : "")
          );

          // 🎓 Quantum Journey 101 AI Mentor Guidance on Execution
          if (activeProject.id === "quantum_journey_101") {
            const currentM = getJourneyMilestone(journeyMilestoneId);
            if (journeyStage === "explore") {
              const countsStr = JSON.stringify(data.measurement_counts || {});
              const debriefMsg: CopilotMessage = {
                id: Date.now() + 5,
                sender: "assistant",
                text: `🎉 **Simulation Complete!**\n\nYour circuit executed with Aer simulator (\`${execShots}\` shots).\nRecorded Measurement Distribution:\n\`\`\`json\n${countsStr}\n\`\`\`\n\n${currentM.quizQuestion}`,
                timestamp: "Just now",
              };
              setQiskitCopilotMessages((prev) => [...prev, debriefMsg]);
              setJourneyStage("quiz");
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem("quantum_journey_101_stage", "quiz");
                } catch (e) {}
              }
            } else if (journeyStage === "challenge") {
              const valResult = currentM.validateChallenge(
                data.measurement_counts || {},
                data.circuit_gates || [],
                data.active_qubits || 1,
                qiskitCode
              );
              if (valResult.passed) {
                const passMsg: CopilotMessage = {
                  id: Date.now() + 5,
                  sender: "assistant",
                  text: `${valResult.feedback}\n\n${currentM.completionMessage}`,
                  timestamp: "Just now",
                };
                setQiskitCopilotMessages((prev) => [...prev, passMsg]);
                setJourneyStage("completed");
                if (typeof window !== "undefined") {
                  try {
                    localStorage.setItem("quantum_journey_101_stage", "completed");
                  } catch (e) {}
                }
              } else {
                const hintMsg: CopilotMessage = {
                  id: Date.now() + 5,
                  sender: "assistant",
                  text: `💡 **Guru AI Assessment:**\n\n${valResult.feedback}`,
                  timestamp: "Just now",
                };
                setQiskitCopilotMessages((prev) => [...prev, hintMsg]);
              }
            }
          }
        } else {
          setTerminalOutput(`[STDERR] ${data.stderr || data.error || "Circuit execution error"}`);
        }
      } catch (err: any) {
        setTerminalOutput(`[ERROR] Aer simulator gateway offline: ${err.message}`);
      } finally {
        setIsRunningOrRecompiling(false);
      }
    }
  }, [framework, dwaveCode, qiskitCode, currentMatrix, mathParams, activeProject, activeFile]);

  const handleApplyPipelineCode = async (code: string, meta?: any) => {
    if (!code) return;
    setDwaveCode(code);
    setActiveProject((prev) => ({
      ...prev,
      fileContents: {
        ...(prev.fileContents || {}),
        [activeFile]: code,
      },
    }));
    try {
      localStorage.setItem(`quantum_ide_code_${activeProject.id}_${activeFile}`, code);
    } catch {}

    setDwaveCopilotMessages((prev) =>
      prev.map((m) => (m.generatedCode === code ? { ...m, appliedToEditor: true } : m))
    );

    setHeroTab("code");
    setShowTerminal(true);
    setIsRunningOrRecompiling(true);
    setTerminalOutput(
      `$ dimod-sampler --backend dwave_simulated_annealing\n` +
      `[SYNTHESIS] Autonomous QUBO model injected into Monaco editor (${activeFile})\n` +
      `[EXECUTING] Compiling Hamiltonian couplers & sampling ground states...`
    );

    try {
      const resp = await fetch("/api/ide/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          target: "dwave_simulated_annealing",
          num_reads: 5000,
        }),
      });
      const data = await resp.json();
      if (data.success && data.optimization_results) {
        const opt = data.optimization_results;
        const solverRes = {
          sample: opt.sample || {},
          optimal_state: opt.sample || null,
          energy: typeof opt.energy === "number" ? opt.energy : null,
          variables: opt.variables || (opt.sample ? Object.keys(opt.sample) : []),
          num_variables: opt.num_variables || (opt.sample ? Object.keys(opt.sample).length : 0),
          qubo_matrix: opt.qubo_matrix || null,
          energy_distribution: opt.energy_distribution || [],
          latex_formula: opt.latex_formula || null,
          num_reads: opt.num_reads || 5000,
        };
        setSolverResult(solverRes);
        try {
          localStorage.setItem(`quantum_ide_result_${activeProject.id}`, JSON.stringify(solverRes));
        } catch {}

        setTerminalOutput(
          `$ dimod-sampler --backend dwave_simulated_annealing\n` +
          `[SUCCESS] Ground State Energy: ${opt.energy ?? -1.0} | Active Qubits: ${solverRes.variables.length}\n` +
          `Optimal Decisions: ${JSON.stringify(opt.sample || {})}\n` +
          (data.stdout ? `\n--- Standard Output ---\n${data.stdout}` : "")
        );
      } else {
        setTerminalOutput(`[STDERR] ${data.stderr || data.error || "Simulator execution error"}`);
      }
    } catch (err: any) {
      setTerminalOutput(`[ERROR] Execution engine error: ${err.message}`);
    } finally {
      setIsRunningOrRecompiling(false);
    }
  };

  const handleClearChat = useCallback(() => {
    const fresh =
      framework === "dwave"
        ? [...DWAVE_INITIAL_MESSAGES]
        : activeProject.id === "quantum_journey_101"
        ? [...QUANTUM_JOURNEY_INITIAL_MESSAGES]
        : [...QISKIT_INITIAL_MESSAGES];
    if (framework === "dwave") {
      setDwaveCopilotMessages(fresh);
    } else {
      setQiskitCopilotMessages(fresh);
    }
    if (typeof window !== "undefined" && activeProject?.id) {
      try {
        localStorage.setItem(`quantum_ide_chat_${activeProject.id}`, JSON.stringify(fresh));
      } catch (e) {}
    }
    if (activeProject?.id === "quantum_journey_101") {
      setJourneyMilestoneId(1);
      setJourneyStage("explore");
      const m1 = getJourneyMilestone(1);
      setQiskitCode(m1.starterCode);
      setQiskitCounts({});
      setTerminalOutput(`=== 🎓 Quantum Journey 101 Reset ===\nWorkspace reset to Milestone 1: Superposition.\n`);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("quantum_journey_101_milestone", "1");
          localStorage.setItem("quantum_journey_101_stage", "explore");
          localStorage.setItem(`quantum_ide_code_${activeProject.id}_${activeFile}`, m1.starterCode);
        } catch (e) {}
      }
    }
  }, [framework, activeProject?.id]);

  const handleSendMessage = async (text: string) => {
    const userMsg: CopilotMessage = {
      id: Date.now(),
      sender: "user",
      text,
      timestamp: "Just now",
    };

    if (framework === "qiskit") {
      setQiskitCopilotMessages((prev) => [...prev, userMsg]);

      const botMsgId = Date.now() + 1;
      const initialBotMsg: CopilotMessage = {
        id: botMsgId,
        sender: "assistant",
        text: "Analyzing circuit and reasoning with Quantum Guru Copilot...",
        timestamp: "Just now",
        isStreaming: true,
      };
      setQiskitCopilotMessages((prev) => [...prev, initialBotMsg]);

      const isJourney = activeProject.id === "quantum_journey_101";
      if (isJourney) {
        const lower = text.trim().toLowerCase();
        // 1. Next Milestone Transition
        if (
          lower.includes("next milestone") ||
          lower === "next" ||
          lower.includes("load milestone") ||
          lower.includes("advance milestone")
        ) {
          const nextId = Math.min(4, journeyMilestoneId + 1);
          const nextM = getJourneyMilestone(nextId);
          setJourneyMilestoneId(nextId);
          setJourneyStage("explore");
          setQiskitCode(nextM.starterCode);
          setQiskitCounts({}); // Clean slate for results!
          setLatencyMs(0);
          setTerminalOutput(
            `=== 🎓 Quantum Journey 101: ${nextM.badge} — ${nextM.title} ===\n` +
            `Workspace refreshed with clean slate.\n` +
            `Active Wires: ${nextM.qubits} | Ready for simulation.\n`
          );
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("quantum_journey_101_milestone", String(nextId));
              localStorage.setItem("quantum_journey_101_stage", "explore");
              localStorage.setItem(`quantum_ide_code_${activeProject.id}_${activeFile}`, nextM.starterCode);
            } catch (e) {}
          }
          const transitionMsg: CopilotMessage = {
            id: Date.now() + 2,
            sender: "assistant",
            text: `✨ **Workspace Refreshed for ${nextM.badge}: ${nextM.title}** ✨\n\n${nextM.introPrompt}`,
            timestamp: "Just now",
          };
          setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), transitionMsg]);
          return;
        }

        // 2. Reset Journey Command
        if (
          lower.includes("reset journey") ||
          lower === "reset" ||
          lower.includes("restart journey")
        ) {
          const m1 = getJourneyMilestone(1);
          setJourneyMilestoneId(1);
          setJourneyStage("explore");
          setQiskitCode(m1.starterCode);
          setQiskitCounts({});
          setLatencyMs(0);
          setTerminalOutput(`=== 🎓 Quantum Journey 101 Reset ===\nWorkspace reset to Milestone 1: Superposition.\n`);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("quantum_journey_101_milestone", "1");
              localStorage.setItem("quantum_journey_101_stage", "explore");
              localStorage.setItem(`quantum_ide_code_${activeProject.id}_${activeFile}`, m1.starterCode);
            } catch (e) {}
          }
          const resetMsg: CopilotMessage = {
            id: Date.now() + 2,
            sender: "assistant",
            text: `🔄 **Quantum Journey Reset to Milestone 1**\n\n${m1.introPrompt}`,
            timestamp: "Just now",
          };
          setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), resetMsg]);
          return;
        }

        // 3. Empathetic Socratic Quiz & Help Handling
        if (journeyStage === "quiz") {
          // A. User wants to skip or see the explanation
          if (isWantingToSkipOrProceed(text)) {
            const revealRes = getSupportiveTutorResponse(journeyMilestoneId, "reveal");
            setJourneyStage("challenge");
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("quantum_journey_101_stage", "challenge");
              } catch (e) {}
            }
            const revealMsg: CopilotMessage = {
              id: Date.now() + 2,
              sender: "assistant",
              text: revealRes.message,
              timestamp: "Just now",
            };
            setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), revealMsg]);
            return;
          }

          // B. User is asking for a hint
          if (isAskingForHint(text)) {
            const hintRes = getSupportiveTutorResponse(journeyMilestoneId, "hint");
            const hintMsg: CopilotMessage = {
              id: Date.now() + 2,
              sender: "assistant",
              text: hintRes.message,
              timestamp: "Just now",
            };
            setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), hintMsg]);
            return;
          }

          // C. User says "I don't know", "no idea", or feels stuck
          if (isUncertainOrStuck(text)) {
            const stuckRes = getSupportiveTutorResponse(journeyMilestoneId, "stuck");
            const stuckMsg: CopilotMessage = {
              id: Date.now() + 2,
              sender: "assistant",
              text: stuckRes.message,
              timestamp: "Just now",
            };
            setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), stuckMsg]);
            return;
          }

          // D. Direct Quiz Answer Evaluation
          const evalRes = evaluateQuizResponse(journeyMilestoneId, text);
          const currentM = getJourneyMilestone(journeyMilestoneId);
          if (evalRes.passed) {
            setJourneyStage("challenge");
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("quantum_journey_101_stage", "challenge");
              } catch (e) {}
            }
            const quizPassMsg: CopilotMessage = {
              id: Date.now() + 2,
              sender: "assistant",
              text: `${evalRes.explanation}\n\n---\n\n${currentM.challengeInstruction}`,
              timestamp: "Just now",
            };
            setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), quizPassMsg]);
            return;
          } else if (evalRes.feedback) {
            const feedbackMsg: CopilotMessage = {
              id: Date.now() + 2,
              sender: "assistant",
              text: evalRes.feedback,
              timestamp: "Just now",
            };
            setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), feedbackMsg]);
            return;
          }
        }
      }

      const userMessageToSend = isJourney
        ? buildJourneyTutorPrompt(journeyMilestoneId, journeyStage, qiskitCode, text)
        : text;

      try {
        const resp = await fetch("/api/ide/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: activeProject.id,
            user_message: userMessageToSend,
            active_file: activeFile,
            file_content: qiskitCode,
            target_backend: "aer_simulator",
            optimization_level: 2,
            model_engine: "groq",
          }),
        });

        if (!resp.ok) {
          throw new Error(`Circuit Agent error: HTTP ${resp.status}`);
        }

        const data = await resp.json();
        const steps = (data.workflow_steps || []).map((ws: any, idx: number) => ({
          id: `step_${ws.step_num || idx + 1}`,
          agent: ws.name || "Tool",
          title: ws.name || "Agent Tool",
          status: ws.status === "success" ? ("done" as const) : ws.status === "failed" ? ("failed" as const) : ("done" as const),
          message: ws.summary || ws.tool_tag,
          details: ws.execution_time_ms ? `${ws.execution_time_ms.toFixed(1)}ms` : undefined,
        }));

        if (data.circuit_gates && data.circuit_gates.length > 0) {
          setCircuitGates(data.circuit_gates);
        }
        if (data.circuit_ascii) {
          setCircuitAscii(data.circuit_ascii);
        }
        if (data.active_qubits) {
          setQiskitQubits(data.active_qubits);
        }
        if (data.measurement_counts) {
          setQiskitCounts(data.measurement_counts);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(
                `quantum_ide_qiskit_result_${activeProject.id}`,
                JSON.stringify({
                  measurement_counts: data.measurement_counts,
                  circuit_gates: data.circuit_gates,
                  circuit_ascii: data.circuit_ascii,
                  active_qubits: data.active_qubits,
                  circuit_depth: data.circuit_depth,
                  simulator_id: data.simulator_id,
                })
              );
            } catch (e) {}
          }
        }

        setQiskitCopilotMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId
              ? {
                  ...msg,
                  text: data.response_text || "Analysis complete.",
                  isStreaming: false,
                  pipelineSteps: steps.length > 0 ? steps : undefined,
                  generatedCode: data.updated_code || undefined,
                  appliedToEditor: false,
                }
              : msg
          )
        );
      } catch (err: any) {
        setQiskitCopilotMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId
              ? {
                  ...msg,
                  text: `Notice: ${err.message || "Failed to reach AI engine"}`,
                  isStreaming: false,
                }
              : msg
          )
        );
      }
      return;
    }

    // D-Wave: Check user intent via Two-Tier Intent Router
    setDwaveCopilotMessages((prev) => [...prev, userMsg]);
    const optIntent = classifyOptimizationIntent(text);

    // Intent Branch A: Casual Greeting or Conversational Q&A / Explanation
    if (optIntent === "CHAT") {
      const botMsgId = Date.now() + 1;
      const initialBotMsg: CopilotMessage = {
        id: botMsgId,
        sender: "assistant",
        text: "Thinking...",
        timestamp: "Just now",
        isStreaming: true,
      };
      setDwaveCopilotMessages((prev) => [...prev, initialBotMsg]);

      try {
        const resp = await fetch("/api/ide/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: activeProject.id,
            user_message: text,
            active_file: activeFile,
            file_content: dwaveCode,
            target_backend: "dwave_simulated_annealing",
            model_engine: "groq",
          }),
        });

        if (!resp.ok) {
          throw new Error(`Copilot response error: HTTP ${resp.status}`);
        }

        const data = await resp.json();
        const steps = (data.workflow_steps || []).map((ws: any, idx: number) => ({
          id: `step_${ws.step_num || idx + 1}`,
          agent: ws.name || "Tool",
          title: ws.name || "Agent Tool",
          status: ws.status === "success" ? ("done" as const) : ws.status === "failed" ? ("failed" as const) : ("done" as const),
          message: ws.summary || ws.tool_tag,
          details: ws.execution_time_ms ? `${ws.execution_time_ms.toFixed(1)}ms` : undefined,
        }));

        setDwaveCopilotMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId
              ? {
                  ...msg,
                  text: data.response_text || "Ready to assist.",
                  isStreaming: false,
                  pipelineSteps: steps.length > 0 ? steps : undefined,
                  generatedCode: data.updated_code || undefined,
                  appliedToEditor: false,
                }
              : msg
          )
        );
      } catch (err: any) {
        setDwaveCopilotMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId
              ? {
                  ...msg,
                  text: `Notice: ${err.message || "Failed to reach AI engine"}`,
                  isStreaming: false,
                }
              : msg
          )
        );
      }
      return;
    }

    // Intent Branch B: Explicit Combinatorial Optimization Problem -> 7-Agent Autonomous Pipeline
    const botMsgId = Date.now() + 1;
    const initialBotMsg: CopilotMessage = {
      id: botMsgId,
      sender: "assistant",
      text: "Decomposing natural language formulation with 7-Agent Autonomous Pipeline...",
      timestamp: "Just now",
      isStreaming: true,
      pipelineSteps: [
        {
          id: "supervisor",
          agent: "SupervisorAgent",
          title: "Supervisor Agent",
          status: "running",
          message: "Decomposing problem bounds & mathematical structure...",
        },
      ],
    };

    setDwaveCopilotMessages((prev) => [...prev, initialBotMsg]);

    try {
      const resp = await fetch("/api/ide/pipeline/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: text,
          mode: "auto",
          penalty_choice: 3,
          session_id: activeProject.id,
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`Pipeline response status: ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split("\n");
        streamBuffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          try {
            const data = JSON.parse(trimmed.slice(5).trim());
            const stepName = data.step;
            const isComplete = stepName === "complete" || data.event === "complete";

            setDwaveCopilotMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== botMsgId) return msg;
                const existingSteps = msg.pipelineSteps ? [...msg.pipelineSteps] : [];

                if (isComplete) {
                  const res = data.result || {};
                  const stats = res.optimization_stats || {};
                  
                  if (res.final_code) {
                    setTimeout(() => {
                      handleApplyPipelineCode(res.final_code, {
                        variables: res.variable_map,
                        q_size: stats.q_size,
                        q_nnz: stats.q_nnz,
                      });
                    }, 150);
                  }

                  return {
                    ...msg,
                    text: `Autonomous QUBO formulation complete! Synthesized ${stats.q_size || 0} logical qubits with ${stats.q_nnz || 0} non-zero couplers using Verma-Lewis penalty stiffness (λ = ${stats.penalty_weight || 5.0}).`,
                    isStreaming: false,
                    generatedCode: res.final_code,
                    appliedToEditor: true,
                    mathFormula: res.latex_model || undefined,
                    formulationMeta: {
                      objectiveSense: stats.objective_sense,
                      variables: res.variable_map,
                      penaltyWeight: stats.penalty_weight,
                      penaltyLabel: stats.penalty_label,
                      q_size: stats.q_size,
                      q_nnz: stats.q_nnz,
                      matrixDensity: stats.matrix_density,
                    },
                    pipelineSteps: existingSteps.map((s) => ({ ...s, status: "done" })),
                  };
                }

                const stepId = stepName || data.agent || "step";
                const stepIdx = existingSteps.findIndex((s) => s.id === stepId || s.agent === data.agent);

                const updatedStep = {
                  id: stepId,
                  agent: data.agent || "Agent",
                  title: data.title || (data.agent ? data.agent.replace("Agent", " Agent") : "Pipeline Step"),
                  status: data.status === "done" ? ("done" as const) : data.status === "failed" ? ("failed" as const) : ("running" as const),
                  message: data.message,
                  details: data.details,
                };

                if (stepIdx >= 0) {
                  existingSteps[stepIdx] = { ...existingSteps[stepIdx], ...updatedStep };
                } else {
                  existingSteps.push(updatedStep);
                }

                return {
                  ...msg,
                  pipelineSteps: existingSteps,
                  text: data.message ? `Agent Reasoning: ${data.message}` : msg.text,
                };
              })
            );
          } catch {
            // ignore chunk parse errors
          }
        }
      }

      // Safety net: Guarantee completion when the stream finishes reading
      setDwaveCopilotMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId && msg.isStreaming
            ? {
                ...msg,
                isStreaming: false,
                pipelineSteps: msg.pipelineSteps?.map((s) => ({
                  ...s,
                  status: s.status === "running" ? ("done" as const) : s.status,
                })),
              }
            : msg
        )
      );
    } catch (err: any) {
      setDwaveCopilotMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                text: `Pipeline error: ${err.message}`,
                isStreaming: false,
                pipelineSteps: msg.pipelineSteps?.map((s) =>
                  s.status === "running" ? { ...s, status: "failed" as const, message: err.message } : s
                ),
              }
            : msg
        )
      );
    }
  };

  const handleAutoFix = useCallback(async (customErrorText?: string) => {
    const errText = customErrorText || terminalOutput || "";
    if (!errText) return;

    const cleanError = errText
      .replace(/^\$ [^\n]+\n/, "")
      .replace(/\[STDERR\]\s*/g, "")
      .replace(/\[ERROR\]\s*/g, "")
      .trim();

    const repairPrompt = `I ran my quantum code and encountered this execution error:
\`\`\`
${cleanError}
\`\`\`
Please diagnose why this error occurred (such as variable scoping, undefined circuit references, or parameter mismatch), fix the Python code, and return the complete corrected drop-in code.`;

    await handleSendMessage(repairPrompt);
  }, [terminalOutput, handleSendMessage]);

  const handleToggleMutualExclusion = () => {
    setMathParams((prev) => ({
      ...prev,
      hasMutualExclusion: !prev.hasMutualExclusion,
    }));
  };

  // Health Metrics
  const totalCost = useMemo(() => {
    const s = solverResult.sample;
    let cost = 0;
    DEFAULT_VARIABLES.forEach((v, idx) => {
      if (s[v] === 1) cost += ASSET_COSTS[idx];
    });
    return cost;
  }, [solverResult.sample]);

  const totalScore = useMemo(() => {
    const s = solverResult.sample;
    let score = 0;
    DEFAULT_VARIABLES.forEach((v, idx) => {
      if (s[v] === 1) score += ASSET_YIELDS[idx];
    });
    return score;
  }, [solverResult.sample]);

  if (!mounted) {
    return (
      <div
        suppressHydrationWarning
        className="h-screen w-screen flex flex-col items-center justify-center bg-[#090A0D] text-white select-none"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs border border-slate-200/50">
            <img
              src="/qg-logo.png"
              alt="Quantum Guru"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-sm font-mono font-bold tracking-wider uppercase text-white">
            QUANTUM GURU STUDIO
          </span>
        </div>
        <div className="mt-4 flex items-center space-x-2 text-xs font-mono text-zinc-400">
          <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading Quantum Studio environment...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className={`h-screen w-screen flex flex-col font-sans select-none overflow-hidden transition-colors ${
        isDark ? "bg-[#090A0D] text-slate-100" : "bg-[#F1F5F9] text-[#172033]"
      }`}
    >
      {/* ── TOP CALM PRECISION HEADER ── */}
      <StudioHeader
        onStartTour={handleStartTour}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        activeProject={activeProject}
        onOpenProjectModal={() => setShowProjectModal(true)}
        onOpenNewProjectModal={() => setShowNewProjectModal(true)}
        onOpenAlgorithmStudio={() => setShowAlgorithmStudioModal(true)}
        onOpenDataConnectors={() => setIsDataConnectorsOpen(true)}
        isSynced={isCircuitSynced}
        onSync={handleSyncCodeAndCircuit}
        isRunningOrRecompiling={isRunningOrRecompiling}
        onRunOrRecompile={handleRunOrRecompile}
        isModelDirty={isModelDirty}
        user={user}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        heroTab={heroTab}
        onSelectHeroTab={handleSelectHeroTab}
        activeFile={activeFile}
        onSelectFile={(f) => {
          handleSelectFile(f);
          handleSelectHeroTab("code");
        }}
        onAddFile={handleAddFile}
        onCopyCode={handleCopyCode}
        showTerminal={showTerminal}
        isSyncing={isSyncing}
        onToggleTerminal={() => {
          if (heroTab !== "code") {
            setHeroTab("code");
            setShowTerminal(true);
          } else {
            setShowTerminal((prev) => !prev);
          }
        }}
      />

      {/* ── MAIN STUDIO BODY: EXPLORER + HERO WORKSPACE + COPILOT ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Project Explorer */}
        {/* Left ProjectExplorer column removed for full-width horizontal editor tabs */}

        {/* Center: 4-Tab Hero Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Active Hero Tab Viewport (Full Height) */}
          
          <div
            className={`flex-1 flex flex-col min-h-0 ${
              heroTab === "code" ? "overflow-hidden" : "overflow-y-auto"
            } ${
              isDark ? "bg-[#090A0D]" : "bg-[#FAFBFC]"
            }`}
          >
            {/* 1. CODE TAB - Preserved in DOM for instant 0ms tab switching & background pre-warming */}
            <div className={`w-full h-full flex-1 flex flex-col ${heroTab === "code" ? "" : "hidden"}`}>
              <StudioCodeEditor
                isDark={isDark}
                isVisible={heroTab === "code"}
                onToggleTheme={handleToggleTheme}
                code={framework === "dwave" ? dwaveCode : qiskitCode}
                onChange={(val) => {
                  if (framework === "dwave") {
                    setDwaveCode(val);
                    setIsModelDirty(true);
                  } else {
                    setQiskitCode(val);
                    setIsCircuitSynced(false);
                  }
                }}
                files={activeProject.files}
                activeFile={activeFile}
                onSelectFile={handleSelectFile}
                framework={framework}
                onRun={handleRunOrRecompile}
                isRunning={isRunningOrRecompiling}
                terminalOutput={terminalOutput}
                showTerminal={showTerminal}
                onToggleTerminal={() => setShowTerminal((prev) => !prev)}
                specs={
                  framework === "qiskit"
                    ? {
                        qubits: qiskitQubits,
                        depth: qiskitDepth,
                        fidelity: 99.8,
                        shots: qiskitShots,
                      }
                    : isPortfolio
                    ? {
                        isPortfolio: true,
                        cost: totalCost,
                        maxCost: mathParams.budgetMax,
                        score: totalScore,
                        energy: solverResult.energy,
                        feasible: totalCost <= mathParams.budgetMax,
                      }
                    : {
                        isPortfolio: false,
                        variablesCount: solverResult.variables?.length || 1,
                        activeCount: Object.values(solverResult.sample || {}).filter((v) => v === 1).length,
                        energy: solverResult.energy,
                        reads: solverResult.num_reads || 1024,
                      }
                }
              />
            </div>

            {/* 2. FORMULATION TAB (KaTeX Sliders) */}
            {heroTab === "formulation" && framework === "dwave" && (
              <div className="p-6 max-w-4xl mx-auto">
                <FormulationCanvas
                  isDark={isDark}
                  colors={colors}
                  mathParams={mathParams}
                  setMathParams={setMathParams}
                  onRecompile={handleRunOrRecompile}
                  isDirty={isModelDirty}
                  selectedSection={selectedMathSection}
                  onSelectSection={setSelectedMathSection}
                  customBqmFormula={solverResult.latex_formula}
                  variables={solverResult.variables}
                  activeFileName={activeFile}
                  projectName={activeProject.title}
                  isPortfolioProblem={isPortfolio}
                />
              </div>
            )}

            {/* 3. VISUAL TAB (Q-Matrix or Circuit) */}
            {heroTab === "visual" && (
              <div id="tour-visual-canvas" className="p-6">
                {framework === "dwave" ? (
                  <div className="max-w-4xl mx-auto space-y-4">
                    <QMatrixHeatmap
                      isDark={isDark}
                      colors={colors}
                      matrix={solverResult.qubo_matrix && solverResult.qubo_matrix.length > 0 ? solverResult.qubo_matrix : (isPortfolio ? currentMatrix : [])}
                      variables={solverResult.variables && solverResult.variables.length > 0 ? solverResult.variables : (isPortfolio ? DEFAULT_VARIABLES : [])}
                      hasMutualExclusion={
                        Boolean(
                          isPortfolio &&
                          solverResult.variables?.includes("Wind_A") &&
                          solverResult.variables?.includes("Solar_B") &&
                          mathParams.hasMutualExclusion
                        )
                      }
                    />
                  </div>
                ) : (
                  <CircuitCanvasView
                    isDark={isDark}
                    qubitCount={qiskitQubits}
                    circuitDepth={qiskitDepth}
                    circuitGates={circuitGates}
                    circuitAscii={circuitAscii}
                    onUpdateQubitCount={handleUpdateQubitCount}
                    onAddGate={handleAddGateToCircuit}
                    onRemoveGate={handleRemoveGateFromCircuit}
                  />
                )}
              </div>
            )}

            {/* 4. RESULTS TAB */}
            {heroTab === "results" && (
              <div className="p-6 max-w-4xl mx-auto space-y-6">
                {framework === "dwave" ? (
                  <EnergySpectrumView
                    isDark={isDark}
                    colors={colors}
                    distribution={solverResult.energy_distribution}
                    groundEnergy={solverResult.energy}
                    numReads={solverResult.num_reads || 300}
                    latencyMs={latencyMs}
                    variables={solverResult.variables || DEFAULT_VARIABLES}
                    simulatorId={solverResult.simulator_id}
                  />
                ) : (
                  <div
                    className={`p-6 rounded-xl border space-y-4 ${
                      isDark
                        ? "bg-[#0E0F13] border-white/[0.08]"
                        : "bg-white border-[#D5DDE7] shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">
                          Qiskit Aer Statevector Measurement Counts
                        </h3>
                        <p className="text-xs text-zinc-400">
                          Simulated measurement probability distribution
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded border border-sky-500/20 font-medium">
                          Total Shots: {qiskitShots}
                        </span>
                      </div>
                    </div>

                    {Object.keys(qiskitCounts).length === 0 ? (
                      <div className="min-h-48 flex flex-col items-center justify-center p-8 text-center space-y-2 border-b border-zinc-700/40">
                        <Activity className="w-8 h-8 text-zinc-500 opacity-60" />
                        <h4 className="text-sm font-semibold text-zinc-300">No Measurement Results Yet</h4>
                        <p className="text-xs text-zinc-500 max-w-sm">Execute your Qiskit circuit or click "Run" to simulate statevector measurement histograms on AerSimulator.</p>
                      </div>
                    ) : (
                      <div className="min-h-48 flex items-end justify-center space-x-6 pt-6 pb-2 border-b border-zinc-700/40">
                        {Object.entries(qiskitCounts).map(([bit, count], idx) => {
                          const pct = qiskitShots > 0 ? ((count / qiskitShots) * 100).toFixed(1) : "0.0";
                          return (
                            <div
                              key={idx}
                              className="flex flex-col items-center space-y-2 min-w-[60px] max-w-[120px]"
                            >
                              <div className="text-[11px] font-mono text-zinc-400 font-semibold">
                                {pct}%
                              </div>
                              <div
                                className="w-12 rounded-t bg-sky-500 hover:brightness-110 transition-all shadow-sm shadow-sky-500/30"
                                style={{ height: `${Math.max(parseFloat(pct) * 2, 8)}px` }}
                              />
                              <div className="text-xs font-mono font-bold text-zinc-200">
                                |{bit}⟩
                              </div>
                              <div className="text-[10px] font-mono text-zinc-500">
                                {count} shots
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── EXECUTION OUTPUT HISTORY AUDIT LOG ── */}
                <div
                  className={`rounded-xl border p-6 space-y-4 ${
                    isDark
                      ? "bg-[#0E0F13] border-white/[0.08]"
                      : "bg-white border-[#D5DDE7] shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-3.5 border-zinc-700/30">
                    <div className="flex items-center space-x-2.5">
                      <Clock className="w-4 h-4 text-sky-400" />
                      <h3 className="text-sm font-semibold">Execution Output History</h3>
                    </div>
                    {executionHistory.length > 0 && (
                      <button
                        onClick={handleClearHistory}
                        className="text-[11px] font-mono text-zinc-400 hover:text-rose-400 transition-colors flex items-center space-x-1 px-2 py-1 rounded hover:bg-rose-500/10 cursor-pointer"
                        title="Clear execution history"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear Log</span>
                      </button>
                    )}
                  </div>

                  {executionHistory.length === 0 ? (
                    <div className="py-8 text-center space-y-1.5">
                      <p className="text-xs text-zinc-500">No execution history recorded yet for this project.</p>
                      <p className="text-[11px] text-zinc-600">Run code from the Code tab or click Recompile to simulate and log execution outputs.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {executionHistory.map((item) => {
                        const isExpanded = expandedHistoryId === item.id;
                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg border transition-all overflow-hidden ${
                              isDark
                                ? "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                                : "bg-slate-50/70 border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div
                              onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                              className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                            >
                              <div className="flex items-center space-x-3">
                                <span
                                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                    item.status === "success"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  }`}
                                >
                                  {item.status}
                                </span>
                                <div className="space-y-0.5">
                                  <div className="text-xs font-medium text-zinc-200 flex items-center space-x-2">
                                    <span>{item.summary}</span>
                                    {item.jobId && (
                                      <span className="text-[10px] font-mono text-zinc-500">
                                        ({item.jobId})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-zinc-400 font-mono flex items-center space-x-3">
                                    <span className="text-zinc-300">{item.formattedDate}</span>
                                    <span>•</span>
                                    <span>{item.latencyMs}ms</span>
                                    {item.shots && (
                                      <>
                                        <span>•</span>
                                        <span>{item.shots} shots</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2.5 text-zinc-400">
                                {item.status === "error" && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAutoFix(item.stderr || item.stdout);
                                    }}
                                    className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 transition-all cursor-pointer"
                                    title="Auto-repair code with Guru AI"
                                  >
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>Auto-Fix</span>
                                  </button>
                                )}
                                <span className="text-[11px] font-mono text-zinc-500">
                                  {isExpanded ? "Hide Output" : "View Output"}
                                </span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                    isExpanded ? "rotate-180 text-sky-400" : ""
                                  }`}
                                />
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="px-3.5 pb-3.5 pt-1 border-t border-white/[0.04] space-y-2">
                                {item.stdout ? (
                                  <div>
                                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                                      Standard Output
                                    </div>
                                    <pre className="p-2.5 rounded bg-black/40 font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-48 border border-white/[0.04]">
                                      {item.stdout}
                                    </pre>
                                  </div>
                                ) : (
                                  <p className="text-xs text-zinc-500 italic pt-1">No stdout console output captured for this run.</p>
                                )}
                                {item.stderr && (
                                  <div>
                                    <div className={`text-[10px] font-mono uppercase tracking-wider mb-1 ${
                                      item.status === "success" ? "text-amber-400" : "text-rose-400"
                                    }`}>
                                      {item.status === "success" ? "Warnings / Diagnostics" : "Error Output"}
                                    </div>
                                    <pre className={`p-2.5 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap max-h-48 border ${
                                      item.status === "success"
                                        ? "bg-amber-950/20 text-amber-300 border-amber-500/20"
                                        : "bg-rose-950/20 text-rose-300 border-rose-500/20"
                                    }`}>
                                      {item.stderr}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── PERSISTENT BOTTOM BAR & CONSOLE (Visible on ALL tabs: Code, Circuit, Results, Model, QUBO) ── */}
          <StudioBottomBar
            isDark={isDark}
            onToggleTheme={handleToggleTheme}
            framework={framework}
            isSynced={isCircuitSynced}
            onSync={handleSyncCodeAndCircuit}
            showTerminal={showTerminal}
            onToggleTerminal={() => setShowTerminal((prev) => !prev)}
            terminalOutput={terminalOutput}
            onAutoFix={() => handleAutoFix()}
            specs={
              framework === "qiskit"
                ? {
                    qubits: qiskitQubits,
                    depth: qiskitDepth,
                    fidelity: 99.8,
                    shots: qiskitShots,
                  }
                : isPortfolio
                ? {
                    isPortfolio: true,
                    cost: totalCost,
                    maxCost: mathParams.budgetMax,
                    score: totalScore,
                    energy: solverResult.energy,
                    feasible: totalCost <= mathParams.budgetMax,
                  }
                : {
                    isPortfolio: false,
                    variablesCount: solverResult.variables?.length || 1,
                    activeCount: Object.values(solverResult.sample || {}).filter((v) => v === 1).length,
                    energy: solverResult.energy,
                    reads: solverResult.num_reads || 1024,
                  }
            }
          />
        </div>

        {/* Right: Quantum Copilot */}
        <aside
          id="tour-copilot-panel"
          style={{ width: "442px" }}
          className={`w-[442px] h-full max-h-full min-h-0 min-w-0 flex flex-col shrink-0 border-l transition-colors overflow-hidden ${
            isDark
              ? "bg-[#0E0F13] border-white/[0.08]"
              : "bg-[#F4F7FA] border-[#D5DDE7]"
          }`}
        >
          <OptimizationCopilot
            isDark={isDark}
            colors={colors}
            framework={framework}
            selectedSection={selectedMathSection}
            onSelectSection={setSelectedMathSection}
            messages={copilotMessages}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            onApplyMutualExclusion={handleToggleMutualExclusion}
            onApplyCircuitAction={handleRunOrRecompile}
            variables={solverResult.variables}
            isPortfolioProblem={isPortfolio}
            onApplyCodeToEditor={handleApplyPipelineCode}
            solutionHealth={{
              title: activeProject.title,
              cost: totalCost,
              maxCost: mathParams.budgetMax,
              score: totalScore,
              energy: solverResult.energy,
              feasible: totalCost <= mathParams.budgetMax,
            }}
            circuitHealth={{
              title: activeProject.title,
              qubits: 3,
              depth: 8,
              shots: 4096,
              fidelity: 99.8,
              entangled: true,
            }}
          />
        </aside>
      </div>

      {/* Data Connectors Modal (Pillar 2 Ingress / Egress) */}
      <DataConnectorsModal
        isOpen={isDataConnectorsOpen}
        onClose={() => setIsDataConnectorsOpen(false)}
        isDark={isDark}
        colors={colors}
        solverResult={solverResult}
        onSendToPipeline={(problemText) => {
          handleSendMessage(problemText);
        }}
      />

      {/* Project Switcher Modal */}
      <ProjectSwitcherModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onOpenNewProject={() => setShowNewProjectModal(true)}
        onOpenAlgorithmStudio={() => {
          setShowProjectModal(false);
          setShowAlgorithmStudioModal(true);
        }}
        onDeleteProject={handleDeleteProject}
        isDark={isDark}
      />

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onCreateProject={handleCreateProject}
        onOpenAlgorithmStudio={() => {
          setShowNewProjectModal(false);
          setShowAlgorithmStudioModal(true);
        }}
        isDark={isDark}
      />

      {/* Algorithm Studio Dedicated Modal */}
      <AlgorithmStudioModal
        isOpen={showAlgorithmStudioModal}
        onClose={() => setShowAlgorithmStudioModal(false)}
        onCreateProjectFromAlgorithm={handleCreateProjectFromAlgorithm}
        isDark={isDark}
      />

      {/* 🧭 Guided Product Walkthrough Tour Modal */}
      <GuidedTourModal
        isOpen={isTourActive}
        onClose={handleEndTour}
        isDark={isDark}
        currentStep={tourStep}
        onStepChange={handleTourStepChange}
      />
    </div>
  );
}
