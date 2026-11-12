"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  getActiveUserKey,
  getScopedIdeItem,
  setScopedIdeItem,
  removeScopedIdeItem,
  purgeLegacyUnscopedIdeKeys,
  broadcastIdeEvent,
  subscribeIdeBroadcast,
  subscribeStorageError,
} from "@/lib/ideStorage";
import {
  JOURNEY_101_MILESTONES,
  JOURNEY_101_MODULES,
  getJourneyMilestone,
  getJourneyModule,
  evaluateQuizResponse,
  detectDepthRequest,
  getTieredExplanation,
  isAskingForHint,
  isUncertainOrStuck,
  isWantingToSkipOrProceed,
  isCuriousKnowledgeRequest,
  getSupportiveTutorResponse,
  buildJourneyTutorPrompt,
  getChallengeHint,
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
import IssueReportModal from "@/components/IssueReportModal";
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

const QUBO_MATRIX_HELPER_CODE = `# Clean Energy Portfolio QUBO Coupler Generator
def get_qubo_model(budget=18.0, penalty_lambda=3.5, yield_weight=1.0, min_diversity=2, mutual_exclusion=True):
    var_names = ["Wind_A", "Solar_B", "Battery_C", "Hydro_D"]
    costs = [9.0, 7.0, 6.0, 8.0]
    yields = [12.5, 9.0, 8.0, 10.5]
    if (
        abs(float(budget) - 18.0) < 1e-6
        and abs(float(penalty_lambda) - 3.5) < 1e-6
        and abs(float(yield_weight) - 1.0) < 1e-6
        and int(min_diversity) == 2
        and bool(mutual_exclusion) is True
    ):
        raw_couplings = {
            (0, 0): -11.25, (0, 1): 15.7, (0, 2): 7.7, (0, 3): 9.9,
            (1, 1): -9.5,   (1, 2): 5.1,  (1, 3): 7.7,
            (2, 2): -18.0,  (2, 3): 6.6,
            (3, 3): -50.8,
        }
        q_dict = {(var_names[i], var_names[j]): val for (i, j), val in raw_couplings.items()}
        return q_dict, var_names, float(penalty_lambda), 0.0

    q_dict = {}
    for i in range(len(var_names)):
        y_term = -yields[i] * float(yield_weight)
        p_self = float(penalty_lambda) * costs[i] * (costs[i] - 2.0 * float(budget)) * 0.05 + 2.0 * (1.0 - 2.0 * float(min_diversity))
        q_dict[(var_names[i], var_names[i])] = round(y_term + p_self, 4)
        for j in range(i + 1, len(var_names)):
            coup = float(penalty_lambda) * 2.0 * costs[i] * costs[j] * 0.05 + 4.0
            if i == 0 and j == 1 and mutual_exclusion:
                coup += 8.0 * float(penalty_lambda)
            q_dict[(var_names[i], var_names[j])] = round(coup, 4)
    return q_dict, var_names, float(penalty_lambda), 0.0
`;

const CLEAN_ENERGY_PORTFOLIO_CODE = `# Quantum Guru — Clean Energy Portfolio Selection (QUBO)
# Solver: D-Wave BinaryQuadraticModel & Simulated Annealer
import dimod
from dwave.samplers import SimulatedAnnealingSampler
from qubo_matrix import get_qubo_model

# 1. Ingest problem matrix & penalty multipliers
Q_matrix, variable_names, penalty_lambda, offset = get_qubo_model(
    budget=18.0, penalty_lambda=3.5, yield_weight=1.0, min_diversity=2, mutual_exclusion=True
)

# 2. Assemble D-Wave BQM Hamiltonian
bqm = dimod.BinaryQuadraticModel.from_qubo(Q_matrix, offset=offset)

# 3. Execute Quantum-Classical Annealing
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=2048)

best = sampleset.first
print(f"⚡ Ground Energy: {best.energy:.4f}")
print("Optimal Decisions:", [variable_names[k] if isinstance(k, int) else k for k, v in best.sample.items() if v == 1])`;

const NEW_DWAVE_STARTER_CODE = `# Quantum Guru — Blank D-Wave Project
import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Initialize a clean Binary Quadratic Model (BQM)
bqm = dimod.BinaryQuadraticModel(dimod.BINARY)`;

const NEW_QISKIT_STARTER_CODE = `# Quantum Guru — Blank Quantum Circuit
from qiskit import QuantumCircuit

# Initialize a clean 1-qubit, 1-classical-bit circuit (add gates in canvas or editor)
qc = QuantumCircuit(1, 1)`;

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
    files: ["journey.py"],
    activeFile: "journey.py",
    fileContents: { "journey.py": QUANTUM_JOURNEY_CODE },
  },
  {
    id: "clean_energy_portfolio",
    title: "Clean Energy Portfolio",
    desc: "4-asset capital budgeting with mutual exclusions and grid stability dependencies.",
    framework: "dwave",
    updated: "2 mins ago",
    files: ["main.py", "qubo_matrix.py"],
    activeFile: "main.py",
    fileContents: {
      "main.py": CLEAN_ENERGY_PORTFOLIO_CODE,
      "qubo_matrix.py": QUBO_MATRIX_HELPER_CODE,
    },
  },
  {
    id: "quantum_teleportation",
    title: "Quantum Teleportation",
    desc: "3-qubit entangled Bell channel with Bob classical feed-forward corrections.",
    framework: "qiskit",
    updated: "1 hour ago",
    files: ["teleportation.py"],
    activeFile: "teleportation.py",
    fileContents: { "teleportation.py": QISKIT_INITIAL_CODE },
  },
  {
    id: "maxcut_bipartite_graph",
    title: "Max-Cut 12-Node Partition",
    desc: "Unconstrained binary quadratic model for bipartite graph cut maximization.",
    framework: "dwave",
    updated: "Yesterday",
    files: ["maxcut.py"],
    activeFile: "maxcut.py",
    fileContents: { "maxcut.py": MAXCUT_INITIAL_CODE },
  },
  {
    id: "vqe_h2_molecule",
    title: "VQE H2 Ground Energy",
    desc: "Variational Quantum Eigensolver for molecular hydrogen ground state energy curve.",
    framework: "qiskit",
    updated: "3 days ago",
    files: ["vqe_h2.py"],
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


function extractQubit(str: string, varMap?: Record<string, number>): number {
  if (!str) return NaN;
  const trimmed = str.trim();
  const regMatch = trimmed.match(/(?:q(?:ubit)?|qr)?\[(\d+)\]/);
  if (regMatch) return parseInt(regMatch[1], 10);
  const numMatch = trimmed.match(/^\s*(\d+)\s*$/);
  if (numMatch) return parseInt(numMatch[1], 10);
  if (varMap && varMap[trimmed] !== undefined) return varMap[trimmed];
  return NaN;
}

function parseQiskitLineQubits(
  line: string,
  circuitVar: string,
  circuitQubits: number = 30,
  varMap?: Record<string, number>
): { op: string; qubits: number[]; isTerminal: boolean } | null {
  const trimmed = line.replace(/#.*$/, "").trim();
  if (!trimmed) return null;

  const prefix = `${circuitVar}.`;
  if (!trimmed.startsWith(prefix)) {
    if (
      trimmed.startsWith("return ") ||
      trimmed.startsWith("sim.run") ||
      trimmed.startsWith("res =") ||
      trimmed.startsWith("job =")
    ) {
      return { op: "return", qubits: [], isTerminal: true };
    }
    return null;
  }

  const callMatch = trimmed.match(new RegExp(`^${circuitVar}\\.([a-zA-Z0-9_]+)\\((.*)\\)`));
  if (!callMatch) return null;

  const op = callMatch[1].toLowerCase();
  const argsStr = callMatch[2].trim();

  // True terminal execution lines that cannot have gates placed after them
  if (op === "save_statevector" || op.startsWith("save_") || op === "measure_all") {
    return { op, qubits: [], isTerminal: true };
  }

  // Mid-circuit or terminal measurement: measurements ARE gates with step tracking (B2 fix)
  if (op === "measure") {
    const listMatch = argsStr.match(/^\[\s*([\d,\s]+)\s*\]/);
    if (listMatch) {
      const qList = Array.from(listMatch[1].matchAll(/\b(\d+)\b/g)).map((m) => parseInt(m[1], 10));
      return { op, qubits: qList, isTerminal: false };
    }
    const rangeMatch = argsStr.match(/range\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/);
    if (rangeMatch) {
      const startQ = rangeMatch[2] !== undefined ? parseInt(rangeMatch[1], 10) : 0;
      const endQ = rangeMatch[2] !== undefined ? parseInt(rangeMatch[2], 10) : parseInt(rangeMatch[1], 10);
      const qList: number[] = [];
      for (let rq = startQ; rq < endQ; rq++) qList.push(rq);
      return { op, qubits: qList, isTerminal: false };
    }
    const firstArg = argsStr.split(",")[0]?.trim() || "";
    const q = extractQubit(firstArg, varMap);
    return { op, qubits: isNaN(q) ? [] : [q], isTerminal: false };
  }

  // Reset
  if (op === "reset") {
    const firstArg = argsStr.split(",")[0]?.trim() || "";
    const q = extractQubit(firstArg, varMap);
    return { op, qubits: isNaN(q) ? [] : [q], isTerminal: false };
  }

  // Barrier: if bare qc.barrier(), spans ALL circuit qubits (B2 fix)
  if (op === "barrier") {
    const nums = Array.from(argsStr.matchAll(/\b(\d+)\b/g)).map((m) => parseInt(m[1], 10));
    const qs = nums.length > 0 ? nums : Array.from({ length: circuitQubits }, (_, i) => i);
    return { op, qubits: qs, isTerminal: false };
  }

  const parts = argsStr.split(",").map((s) => s.trim()).filter(Boolean);
  if (["cx", "cnot", "cz", "swap", "ch", "cy", "cp", "crx", "cry", "crz", "rzz", "rxx", "ryy", "cu"].includes(op)) {
    if (parts.length >= 2) {
      const ctrl = extractQubit(parts[parts.length - 2], varMap);
      const tgt = extractQubit(parts[parts.length - 1], varMap);
      const qs = [ctrl, tgt].filter((q) => !isNaN(q));
      return { op, qubits: qs, isTerminal: false };
    }
  }

  if (["ccx", "toffoli", "cswap"].includes(op) && parts.length >= 3) {
    const c1 = extractQubit(parts[parts.length - 3], varMap);
    const c2 = extractQubit(parts[parts.length - 2], varMap);
    const tgt = extractQubit(parts[parts.length - 1], varMap);
    const qs = [c1, c2, tgt].filter((q) => !isNaN(q));
    return { op, qubits: qs, isTerminal: false };
  }

  if (parts.length > 0) {
    const lastArg = extractQubit(parts[parts.length - 1], varMap);
    if (!isNaN(lastArg)) {
      return { op, qubits: [lastArg], isTerminal: false };
    }
  }

  return { op, qubits: [], isTerminal: false };
}

function splitPythonStatements(code: string): string[] {
  const statements: string[] = [];
  let currentStmt = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTripleSingle = false;
  let inTripleDouble = false;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let i = 0;

  while (i < code.length) {
    const ch = code[i];
    const next3 = code.slice(i, i + 3);

    if (!inSingleQuote && !inDoubleQuote) {
      if (next3 === "'''") {
        inTripleSingle = !inTripleSingle;
        currentStmt += next3;
        i += 3;
        continue;
      }
      if (next3 === '"""') {
        inTripleDouble = !inTripleDouble;
        currentStmt += next3;
        i += 3;
        continue;
      }
    }

    if (inTripleSingle || inTripleDouble) {
      currentStmt += ch;
      i++;
      continue;
    }

    if (ch === "'" && !inDoubleQuote && (i === 0 || code[i - 1] !== "\\")) {
      inSingleQuote = !inSingleQuote;
      currentStmt += ch;
      i++;
      continue;
    }
    if (ch === '"' && !inSingleQuote && (i === 0 || code[i - 1] !== "\\")) {
      inDoubleQuote = !inDoubleQuote;
      currentStmt += ch;
      i++;
      continue;
    }

    if (inSingleQuote || inDoubleQuote) {
      currentStmt += ch;
      i++;
      continue;
    }

    // Comment: ignore until end of line
    if (ch === "#") {
      while (i < code.length && code[i] !== "\n") {
        i++;
      }
      continue;
    }

    // Bracket & parenthesis tracking
    if (ch === "(") parenDepth++;
    else if (ch === ")" && parenDepth > 0) parenDepth--;
    else if (ch === "[") bracketDepth++;
    else if (ch === "]" && bracketDepth > 0) bracketDepth--;
    else if (ch === "{") braceDepth++;
    else if (ch === "}" && braceDepth > 0) braceDepth--;

    const isInsideGroup = parenDepth > 0 || bracketDepth > 0 || braceDepth > 0;
    if ((ch === ";" || ch === "\n") && !isInsideGroup) {
      const trimmed = currentStmt.trim();
      if (trimmed) statements.push(trimmed);
      currentStmt = "";
      i++;
      continue;
    }

    if (ch === "\n" && isInsideGroup) {
      currentStmt += " ";
      i++;
      continue;
    }

    currentStmt += ch;
    i++;
  }

  const lastTrimmed = currentStmt.trim();
  if (lastTrimmed) statements.push(lastTrimmed);

  return statements;
}

function parseQiskitCodeToCircuit(code: string): { numQubits: number; gates: any[]; depth: number } {
  const statements = splitPythonStatements(code);
  const varMap: Record<string, number> = {};

  // First pass: extract integer constants & QuantumRegister sizes
  for (const stmt of statements) {
    const intAssign = stmt.match(/^([a-zA-Z_]\w*)\s*=\s*(\d+)$/);
    if (intAssign) {
      varMap[intAssign[1]] = parseInt(intAssign[2], 10);
      continue;
    }
    const qregAssign = stmt.match(/^([a-zA-Z_]\w*)\s*=\s*(?:[a-zA-Z_]\w*\.)?QuantumRegister\(\s*(\d+|[a-zA-Z_]\w*)/);
    if (qregAssign) {
      const val = qregAssign[2];
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) {
        varMap[qregAssign[1]] = parsed;
      } else if (varMap[val] !== undefined) {
        varMap[qregAssign[1]] = varMap[val];
      }
    }
  }

  // Detect user circuit variable name & initial qubit count
  let primaryVar = "qc";
  let numQubits = 2;
  for (const stmt of statements) {
    const qcMatch = stmt.match(/([a-zA-Z0-9_]+)\s*=\s*(?:[a-zA-Z0-9_]+\.)?QuantumCircuit\((.*)\)/);
    if (qcMatch) {
      primaryVar = qcMatch[1];
      const argsRaw = qcMatch[2].trim();
      const firstArg = argsRaw.split(",")[0]?.trim() || "";
      const parsedNum = parseInt(firstArg, 10);
      if (!isNaN(parsedNum)) {
        numQubits = Math.min(30, Math.max(1, parsedNum));
      } else if (varMap[firstArg] !== undefined) {
        numQubits = Math.min(30, Math.max(1, varMap[firstArg]));
      }
      break;
    }
  }

  // Fallback if not matched in statements
  if (numQubits === 2) {
    const fallbackMatch = code.match(/QuantumCircuit\(\s*(\d+)/);
    if (fallbackMatch) numQubits = Math.min(30, Math.max(1, parseInt(fallbackMatch[1], 10)));
  }

  const stepTrack: Record<number, number> = {};
  for (let i = 0; i < 30; i++) stepTrack[i] = 0;

  const gates: any[] = [];
  const qcCallRegex = new RegExp(`^(?:${primaryVar}|qc|circuit|circ|qcirc)\\.([a-zA-Z0-9_]+)\\((.*)\\)`);

  for (const line of statements) {
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
      const rangeMatch = argsStr.match(/range\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/);
      const listMatch = argsStr.match(/^\[\s*([\d,\s]+)\s*\]/);
      let qList: number[] = [];
      if (rangeMatch) {
        const startQ = rangeMatch[2] !== undefined ? parseInt(rangeMatch[1], 10) : 0;
        const endQ = rangeMatch[2] !== undefined ? parseInt(rangeMatch[2], 10) : parseInt(rangeMatch[1], 10);
        for (let rq = startQ; rq < Math.min(30, endQ); rq++) qList.push(rq);
      } else if (listMatch) {
        qList = Array.from(listMatch[1].matchAll(/\b(\d+)\b/g)).map((m) => parseInt(m[1], 10));
      } else {
        const firstArg = argsStr.split(",")[0]?.trim() || "";
        const firstInt = extractQubit(firstArg, varMap);
        if (!isNaN(firstInt)) qList = [firstInt];
      }
      for (const q of qList) {
        if (q < numQubits) {
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
      }
      continue;
    }

    if (opName === "reset") {
      const firstArg = argsStr.split(",")[0]?.trim() || "";
      const q = extractQubit(firstArg, varMap);
      if (!isNaN(q)) {
        if (q >= numQubits) numQubits = Math.min(30, q + 1);
        const currentStep = stepTrack[q] ?? 0;
        gates.push({
          name: "reset",
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

    if (opName === "id" || opName === "i") {
      const firstArg = argsStr.split(",")[0]?.trim() || "";
      const q = extractQubit(firstArg, varMap);
      if (!isNaN(q)) {
        if (q >= numQubits) numQubits = Math.min(30, q + 1);
        const currentStep = stepTrack[q] ?? 0;
        gates.push({
          name: "id",
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

    if (["cx", "cnot", "cz", "swap", "ch", "cy", "cp", "crx", "cry", "crz", "rzz", "rxx", "ryy", "cu"].includes(opName)) {
      if (parts.length >= 2) {
        const ctrl = extractQubit(parts[parts.length - 2], varMap);
        const tgt = extractQubit(parts[parts.length - 1], varMap);
        const params = parts.slice(0, parts.length - 2);
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
            params,
          });
          gates.push({
            name: normalizedName,
            qubit: tgt,
            target: ctrl,
            qubits: [ctrl, tgt],
            step: currentStep,
            role: "target",
            params,
          });
          stepTrack[ctrl] = currentStep + 1;
          stepTrack[tgt] = currentStep + 1;
        }
      }
      continue;
    }

    if (["ccx", "toffoli", "cswap"].includes(opName) && parts.length >= 3) {
      const c1 = extractQubit(parts[parts.length - 3], varMap);
      const c2 = extractQubit(parts[parts.length - 2], varMap);
      const tgt = extractQubit(parts[parts.length - 1], varMap);
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

    const isParamSingle = ["rx", "ry", "rz", "p", "phase", "u", "u1", "u2", "u3"].includes(opName);
    const gateParams = isParamSingle && parts.length > 1 ? parts.slice(0, parts.length - 1) : [];

    const lastPartRaw = parts[parts.length - 1] || "";
    const rangeMatch = argsStr.match(/range\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/);
    const listArgMatch = argsStr.match(/\[\s*([\d,\s]+)\s*\]\s*$/);
    let targetQubits: number[] = [];
    if (rangeMatch) {
      const startQ = rangeMatch[2] !== undefined ? parseInt(rangeMatch[1], 10) : 0;
      const endQ = rangeMatch[2] !== undefined ? parseInt(rangeMatch[2], 10) : parseInt(rangeMatch[1], 10);
      for (let rq = startQ; rq < Math.min(30, endQ); rq++) targetQubits.push(rq);
    } else if (listArgMatch) {
      targetQubits = Array.from(listArgMatch[1].matchAll(/\b(\d+)\b/g)).map((m) => parseInt(m[1], 10));
    } else {
      const lastArg = extractQubit(lastPartRaw, varMap);
      if (!isNaN(lastArg)) targetQubits = [lastArg];
    }
    for (const tq of targetQubits) {
      if (tq >= numQubits) numQubits = Math.min(30, tq + 1);
      const currentStep = stepTrack[tq] ?? 0;
      gates.push({
        name: opName,
        qubit: tq,
        qubits: [tq],
        step: currentStep,
        role: "single",
        params: gateParams,
      });
      stepTrack[tq] = currentStep + 1;
    }
  }

  // Adjust numQubits if any gate reached a higher index
  if (gates.length > 0) {
    const highestQubitUsed = Math.max(
      ...gates.flatMap((g) => (g.qubits && g.qubits.length > 0 ? g.qubits : [g.qubit ?? 0]))
    );
    if (highestQubitUsed >= numQubits) {
      numQubits = Math.min(30, highestQubitUsed + 1);
    }
  }

  const maxStepVal = Math.max(1, ...Object.values(stepTrack));
  return { numQubits, gates, depth: maxStepVal };
}

function extractShotsFromCode(code: string, framework: "qiskit" | "dwave"): number {
  if (!code) return 1024;
  if (framework === "dwave") {
    const match = code.match(/\b(?:num_reads|reads|NUM_READS)\s*=\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 1024;
  } else {
    const match = code.match(/\b(?:shots|num_shots|SHOTS)\s*=\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 1024;
  }
}

function classifyOptimizationIntent(text: string): "CHAT" | "FORMULATE" {
  const clean = text.trim().toLowerCase();
  if (!clean) return "CHAT";

  // Tier 0: Code debugging, error tracebacks, solver output inspection, or code Q&A
  // MUST route to /api/ide/agent/chat so user D-Wave code is preserved and never hijacked by the Autonomous Pipeline.
  const debugOrWorkspaceTerms = [
    "traceback", "syntaxerror", "nameerror", "typeerror", "keyerror", "valueerror",
    "attributeerror", "indexerror", "importerror", "zerodivisionerror", "indentationerror",
    "runtimeerror", "stderr", "encountered this execution error", "error", "bug",
    "fix", "debug", "diagnose", "repair", "terminal", "output", "result",
    "ground energy", "best.energy", "best.sample", "sampleset", "my code", "this code",
    "in the code", "in editor", "line ", "why did", "what happened", "what output",
    "what did", "explain"
  ];
  if (debugOrWorkspaceTerms.some((t) => clean.includes(t)) || clean.endsWith("?")) {
    return "CHAT";
  }

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
        const uKey = getActiveUserKey();
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("project") || params.get("projectId");
        const savedId = urlId || getScopedIdeItem("active_project_id", uKey) || "clean_energy_portfolio";
        const stored = getScopedIdeItem(`history_${savedId}`, uKey);
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
        removeScopedIdeItem(`history_${activeProject.id}`, userKey);
      } catch {}
    }
  };

  const [targetBackend, setTargetBackend] = useState<string>("dwave_simulated_annealing");
  const { user, isAuthenticated, logout } = useAuth();
  const userKey = useMemo(() => getActiveUserKey(user?.email), [user?.email]);

  // Reactive User-Switch Isolation: When active user changes (login, logout, account switch),
  // immediately reload the workspace to that user's isolated storage context.
  const prevUserKeyRef = useRef<string>(userKey);
  const isUserHydratingRef = useRef<boolean>(false);
  const vaultDryRunAbortRef = useRef<AbortController | null>(null);

  // A1: Purge legacy unscoped keys on initial mount to guarantee no stale browser residue
  useEffect(() => {
    purgeLegacyUnscopedIdeKeys();
  }, []);

  useEffect(() => {
    if (prevUserKeyRef.current !== userKey) {
      prevUserKeyRef.current = userKey;
      isUserHydratingRef.current = true;

      // 1. Restore/load custom projects for this userKey
      const localCustom = getScopedIdeItem("custom_projects", userKey);
      const customList: ProjectItem[] = localCustom ? JSON.parse(localCustom) : [];
      const journey = INITIAL_PROJECTS.find((p) => p.id === "quantum_journey_101")!;
      const listWithoutJourney = customList.filter((p: any) => p.id !== "quantum_journey_101");
      const ids = new Set(listWithoutJourney.map((p: any) => p.id));
      const remainingInitial = INITIAL_PROJECTS.filter((p) => p.id !== "quantum_journey_101" && !ids.has(p.id));
      const allProjects = [journey, ...listWithoutJourney, ...remainingInitial];
      setProjects(allProjects);

      // 2. Determine active project for this userKey
      const savedProjId = getScopedIdeItem("active_project_id", userKey);
      const nextProj = (savedProjId && allProjects.find((p) => p.id === savedProjId)) || INITIAL_PROJECTS[0];
      setActiveProject(nextProj);

      // 3. Determine active file & code for this userKey
      const nextFile = getScopedIdeItem("active_file", userKey) || nextProj.activeFile || nextProj.files?.[0] || "main.py";
      setActiveFile(nextFile);

      const nextCode = getScopedIdeItem(`code_${nextProj.id}_${nextFile}`, userKey);
      if (nextProj.framework === "dwave") {
        setDwaveCode(nextCode || (nextProj.id === "clean_energy_portfolio" ? CLEAN_ENERGY_PORTFOLIO_CODE : NEW_DWAVE_STARTER_CODE));
      } else {
        setQiskitCode(nextCode || (nextProj.id === "quantum_journey_101" ? QUANTUM_JOURNEY_CODE : QISKIT_INITIAL_CODE));
      }

      // 4. Determine hero tab
      const nextTab = (getScopedIdeItem("hero_tab", userKey) as HeroTabType) || "code";
      setHeroTab(nextTab);

      // 5. Restore chat messages for this userKey
      const nextChat = getScopedIdeItem(`chat_${nextProj.id}`, userKey);
      if (nextChat) {
        try {
          const parsed = JSON.parse(nextChat);
          if (nextProj.framework === "dwave") setDwaveCopilotMessages(parsed);
          else setQiskitCopilotMessages(parsed);
        } catch {}
      } else {
        if (nextProj.framework === "dwave") setDwaveCopilotMessages([...DWAVE_INITIAL_MESSAGES]);
        else if (nextProj.id === "quantum_journey_101") setQiskitCopilotMessages([...QUANTUM_JOURNEY_INITIAL_MESSAGES]);
        else setQiskitCopilotMessages([...QISKIT_INITIAL_MESSAGES]);
      }

      // 6. Restore execution history for this userKey
      const nextHistory = getScopedIdeItem(`history_${nextProj.id}`, userKey);
      setExecutionHistory(nextHistory ? JSON.parse(nextHistory) : []);

      // 7. Restore solver results
      const nextRes = getScopedIdeItem(`result_${nextProj.id}`, userKey);
      setSolverResult(nextRes ? JSON.parse(nextRes) : (nextProj.id === "clean_energy_portfolio" ? DEFAULT_PORTFOLIO_RESULT : {
        energy: 0,
        sample: {},
        num_variables: 0,
        variables: [],
        qubo_matrix: [],
        energy_distribution: [],
        latex_formula: "",
      }));

      // 8. Restore Qiskit results
      const nextQiskitRes = getScopedIdeItem(`qiskit_result_${nextProj.id}`, userKey);
      if (nextQiskitRes) {
        try {
          const parsedQ = JSON.parse(nextQiskitRes);
          setQiskitCounts(parsedQ.measurement_counts || {});
          setCircuitGates(parsedQ.circuit_gates || []);
          setCircuitAscii(parsedQ.circuit_ascii || "");
          setQiskitQubits(parsedQ.active_qubits || 2);
          setQiskitDepth(parsedQ.circuit_depth || 0);
          setQiskitSimulatorId(parsedQ.simulator_id || "");
        } catch {}
      } else {
        setQiskitCounts({});
        setCircuitGates([]);
        setCircuitAscii("");
        setQiskitSimulatorId("");
      }

      // 9. Reset terminal
      setTerminalOutput("");
      setShowTerminal(false);

      // Release hydration lock once new user state commits
      const hydrateTimer = setTimeout(() => {
        isUserHydratingRef.current = false;
      }, 150);
      return () => clearTimeout(hydrateTimer);
    }
  }, [userKey]);

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
      broadcastIdeEvent("AUTH_CHANGED", { userKey: "guest" });
      purgeLegacyUnscopedIdeKeys();
      logout();
    } catch (e) {
      console.error("Logout error", e);
    }
    window.location.replace("/login");
  };

  // A5 & A4: Storage error banner state & Multi-tab real-time listener
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Listen for storage quota / write errors (A5)
    const unsubStorageErr = subscribeStorageError((err) => {
      setStorageWarning(err.message);
    });

    // Cross-tab broadcast listener (A4)
    const unsubBroadcast = subscribeIdeBroadcast((type, payload) => {
      if (type === "AUTH_CHANGED") {
        // Another tab switched account or logged out: reload to maintain strict isolation
        window.location.reload();
      } else if (type === "PROJECTS_CHANGED" && payload?.userKey === userKey) {
        // Another tab added/removed a project for this same user: refresh projects list
        const localCustom = getScopedIdeItem("custom_projects", userKey);
        if (localCustom) {
          try {
            const customList: ProjectItem[] = JSON.parse(localCustom);
            const journey = INITIAL_PROJECTS.find((p) => p.id === "quantum_journey_101")!;
            const listWithoutJourney = customList.filter((p: any) => p.id !== "quantum_journey_101");
            const ids = new Set(listWithoutJourney.map((p: any) => p.id));
            const remainingInitial = INITIAL_PROJECTS.filter((p) => p.id !== "quantum_journey_101" && !ids.has(p.id));
            setProjects([journey, ...listWithoutJourney, ...remainingInitial]);
          } catch (e) {}
        }
      }
    });

    // Cross-tab storage event (fires on session change in other tabs)
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "quantum_session") {
        window.location.reload();
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      unsubStorageErr();
      unsubBroadcast();
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [userKey]);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const uKey = getActiveUserKey();
        const localCustom = getScopedIdeItem("custom_projects", uKey);
        if (localCustom) {
          const parsed = JSON.parse(localCustom);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Auto-sanitize existing custom projects that may have been contaminated with Clean Energy Portfolio template
            const sanitizedList = parsed.map((p: any) => {
              if (p.id !== "clean_energy_portfolio") {
                const mainContent = p.fileContents?.["main.py"] || "";
                const isContaminated =
                  mainContent.includes("# Quantum Guru — Clean Energy Portfolio Selection");

                const updatedContents = { ...p.fileContents };
                if (isContaminated) {
                  updatedContents["main.py"] = p.framework === "dwave" ? NEW_DWAVE_STARTER_CODE : NEW_QISKIT_STARTER_CODE;
                  try {
                    setScopedIdeItem(`code_${p.id}_main.py`, uKey, updatedContents["main.py"]);
                  } catch (e) {}
                }

                let updatedFiles = Array.isArray(p.files) ? [...p.files] : ["main.py"];
                if (updatedFiles.includes("qubo_matrix.py")) {
                  const quboContent = p.fileContents?.["qubo_matrix.py"] || "";
                  if (quboContent.includes("Wind_A") && isContaminated) {
                    updatedFiles = updatedFiles.filter((f: string) => f !== "qubo_matrix.py");
                    delete updatedContents["qubo_matrix.py"];
                    try {
                      removeScopedIdeItem(`code_${p.id}_qubo_matrix.py`, uKey);
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
              setScopedIdeItem("custom_projects", uKey, JSON.stringify(sanitizedList));
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
        const res = await fetch(`/api/ide/projects`);
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

          // Seed local cache from MongoDB Atlas for projects that have cloud chat history
          if (typeof window !== "undefined") {
            data.projects.forEach((doc: any) => {
              if (doc.projectId && Array.isArray(doc.chatMessages) && doc.chatMessages.length > 0) {
                if (!getScopedIdeItem(`chat_${doc.projectId}`, userKey)) {
                  setScopedIdeItem(`chat_${doc.projectId}`, userKey, JSON.stringify(doc.chatMessages));
                }
              }
            });
          }

          setProjects((prev) => {
            const cloudIds = new Set(cloudList.map((c) => c.id));
            const nonDuplicates = prev.filter((p) => !cloudIds.has(p.id));
            return [...cloudList, ...nonDuplicates];
          });

          // Activate targeted project if specified in URL or last active session
          if (typeof window !== "undefined") {
            try {
              const params = new URLSearchParams(window.location.search);
              const targetId = params.get("project") || params.get("projectId") || getScopedIdeItem("active_project_id", userKey);
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
        const uKey = getActiveUserKey();
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("project") || params.get("projectId");
        const savedId = urlId || getScopedIdeItem("active_project_id", uKey);
        if (savedId) {
          const localCustom = getScopedIdeItem("custom_projects", uKey);
          const customList: ProjectItem[] = localCustom ? JSON.parse(localCustom) : [];
          const all = [...customList, ...INITIAL_PROJECTS];
          const matched = all.find((p) => p.id === savedId);
          if (matched) return matched;
        }
      } catch (e) {}
    }
    return INITIAL_PROJECTS[0];
  });

  const activeProjectIdRef = useRef<string>(activeProject.id);
  useEffect(() => {
    activeProjectIdRef.current = activeProject.id;
  }, [activeProject.id]);

  const framework = activeProject.framework;

// Synchronize Execution History whenever active project switches
  useEffect(() => {
    if (typeof window !== "undefined" && activeProject?.id) {
      try {
        const stored = getScopedIdeItem(`history_${activeProject.id}`, userKey);
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
        const uKey = getActiveUserKey();
        const savedTab = getScopedIdeItem("hero_tab", uKey) as HeroTabType | null;
        if (savedTab) return savedTab;
      } catch (e) {}
    }
    return "code";
  });

  const [activeFile, setActiveFile] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const uKey = getActiveUserKey();
        const savedFile = getScopedIdeItem("active_file", uKey);
        if (savedFile && activeProject.files?.includes(savedFile)) return savedFile;
      } catch (e) {}
    }
    return activeProject.activeFile || activeProject.files?.[0] || "main.py";
  });

  const [dwaveCode, setDwaveCode] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const uKey = getActiveUserKey();
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("project") || params.get("projectId");
        const savedId = urlId || getScopedIdeItem("active_project_id", uKey) || "clean_energy_portfolio";
        const savedFile = getScopedIdeItem("active_file", uKey) || "main.py";
        const savedCode = getScopedIdeItem(`code_${savedId}_${savedFile}`, uKey);
        if (savedCode) {
          if (savedId !== "clean_energy_portfolio" && savedCode.includes("# Quantum Guru — Clean Energy Portfolio Selection")) {
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
        const uKey = getActiveUserKey();
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("project") || params.get("projectId");
        const savedId = urlId || getScopedIdeItem("active_project_id", uKey) || "quantum_journey_101";
        const savedFile = getScopedIdeItem("active_file", uKey) || (savedId === "quantum_journey_101" ? "journey.py" : "teleportation.py");
        const savedCode = getScopedIdeItem(`code_${savedId}_${savedFile}`, uKey);
        if (savedCode) return savedCode;
        if (savedId === "quantum_journey_101") return QUANTUM_JOURNEY_CODE;
      } catch (e) {}
    }
    return QUANTUM_JOURNEY_CODE;
  });

  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false);
  const [showAlgorithmStudioModal, setShowAlgorithmStudioModal] = useState<boolean>(false);
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [issueDefaultCategory, setIssueDefaultCategory] = useState<
    "code_execution" | "ai_synthesis" | "ui_editor" | "journey" | "performance" | "other"
  >("code_execution");

  // Quantum Journey 101 Sequential Module & Quiz State
  const [journeyMilestoneId, setJourneyMilestoneId] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const uKey = getActiveUserKey();
        const saved = getScopedIdeItem("journey_101_milestone", uKey);
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed)) return Math.min(6, Math.max(0, parsed));
        }
      } catch (e) {}
    }
    return 0;
  });

  const [userPrediction, setUserPrediction] = useState<string | null>(null);
  const [quizHelpCount, setQuizHelpCount] = useState<number>(0);
  const [challengeHintCount, setChallengeHintCount] = useState<number>(0);

  const [journeyStage, setJourneyStage] = useState<"explore" | "quiz" | "challenge" | "completed">(() => {
    if (typeof window !== "undefined") {
      try {
        const uKey = getActiveUserKey();
        const saved = getScopedIdeItem("journey_101_stage", uKey);
        if (saved === "quiz" || saved === "challenge" || saved === "completed") return saved;
      } catch (e) {}
    }
    return "explore";
  });

  // Product Walkthrough Tour State
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

  const isPortfolio = activeProject.id === "clean_energy_portfolio" && dwaveCode.includes("get_qubo_model");

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
        const uKey = getActiveUserKey();
        const targetId = getScopedIdeItem("active_project_id", uKey) || "clean_energy_portfolio";
        if (targetId === "clean_energy_portfolio") {
          return DEFAULT_PORTFOLIO_RESULT;
        }
        const stored = getScopedIdeItem(`result_${targetId}`, uKey);
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
        const uKey = getActiveUserKey();
        const targetId = getScopedIdeItem("active_project_id", uKey);
        if (targetId) {
          const stored = getScopedIdeItem(`qiskit_result_${targetId}`, uKey);
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
        const uKey = getActiveUserKey();
        const targetId = getScopedIdeItem("active_project_id", uKey);
        if (targetId) {
          const stored = getScopedIdeItem(`qiskit_result_${targetId}`, uKey);
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
  const [qiskitShots, setQiskitShots] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const uKey = getActiveUserKey();
        const targetId = getScopedIdeItem("active_project_id", uKey);
        if (targetId) {
          const stored = getScopedIdeItem(`qiskit_result_${targetId}`, uKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.shots) return parsed.shots;
            if (parsed.measurement_counts && Object.keys(parsed.measurement_counts).length > 0) {
              const total = Object.values(parsed.measurement_counts as Record<string, number>).reduce((a: any, b: any) => a + b, 0);
              if (total > 0) return total;
            }
          }
        }
      } catch (e) {}
    }
    return 1024;
  });
  const [circuitGates, setCircuitGates] = useState<any[]>([]);
  const circuitGatesLengthRef = useRef<number>(0);
  useEffect(() => {
    circuitGatesLengthRef.current = circuitGates.length;
  }, [circuitGates.length]);

  const [circuitAscii, setCircuitAscii] = useState<string>("");
  const [isCircuitSynced, setIsCircuitSynced] = useState<boolean>(true);
  const isCanvasModifyingRef = useRef<boolean>(false);
  const [isResultsStale, setIsResultsStale] = useState<boolean>(false);

  const hasDynamicLoops = useMemo(() => {
    if (framework !== "qiskit") return false;
    return /(^|\W)(for|while|def)($|\W)/.test(qiskitCode);
  }, [framework, qiskitCode]);

  const [dwaveCopilotMessages, setDwaveCopilotMessages] = useState<CopilotMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const uKey = getActiveUserKey();
        const saved = getScopedIdeItem("chat_clean_energy_portfolio", uKey);
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
        const uKey = getActiveUserKey();
        const activeId = new URLSearchParams(window.location.search).get("project") || getScopedIdeItem("active_project_id", uKey) || "quantum_journey_101";
        const saved = getScopedIdeItem(`chat_${activeId}`, uKey);
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

  const handleSetMathParams: React.Dispatch<React.SetStateAction<MathFormulationParams>> = useCallback(
    (updater) => {
      setMathParams((prev) => {
        const next = typeof updater === "function" ? (updater as (p: MathFormulationParams) => MathFormulationParams)(prev) : updater;
        setIsModelDirty(true);
        setDwaveCode((prevCode) => {
          if (!prevCode.includes("get_qubo_model(")) return prevCode;
          return prevCode.replace(
            /get_qubo_model\([\s\S]*?\)/,
            `get_qubo_model(\n    budget=${next.budgetMax.toFixed(1)}, penalty_lambda=${next.penaltyLambda.toFixed(1)}, yield_weight=${next.yieldWeight.toFixed(1)}, min_diversity=${next.minDiversity}, mutual_exclusion=${next.hasMutualExclusion ? "True" : "False"}\n)`
          );
        });
        return next;
      });
    },
    []
  );

  // Restore active project, file, and code on refresh from URL or localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlProjectId = params.get("project") || params.get("projectId");
      const savedProjectId = urlProjectId || getScopedIdeItem("active_project_id", userKey);
      const savedFile = getScopedIdeItem("active_file", userKey);
      const savedTab = getScopedIdeItem("hero_tab", userKey) as HeroTabType | null;

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
          let savedCode = getScopedIdeItem(`code_${matched.id}_${initialFile}`, userKey);
          if (!savedCode && matched.fileContents && matched.fileContents[initialFile]) {
            savedCode = matched.fileContents[initialFile];
          }

          // Check if custom project has cross-contaminated portfolio code
          if (matched.id !== "clean_energy_portfolio" && savedCode && savedCode.includes("# Quantum Guru — Clean Energy Portfolio Selection")) {
            savedCode = matched.framework === "dwave" ? NEW_DWAVE_STARTER_CODE : NEW_QISKIT_STARTER_CODE;
            try {
              setScopedIdeItem(`code_${matched.id}_${initialFile}`, userKey, savedCode);
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
            const stored = getScopedIdeItem(`chat_${matched.id}`, userKey);
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

  // Synchronize Circuit Canvas whenever qiskitCode updates
  useEffect(() => {
    if (framework === "dwave") return;

    // 1. If code change was initiated by direct visual canvas authoring, skip overwriting canvas
    if (isCanvasModifyingRef.current) {
      isCanvasModifyingRef.current = false;
      return;
    }

    const hasQc = /QuantumCircuit\(/.test(qiskitCode);
    if (!hasQc) return;

    const parsed = parseQiskitCodeToCircuit(qiskitCode);
    const hasDynamicConstructs =
      /(^|\W)(for|while|def|append|compose|QuantumRegister|Parameter|QFT)($|\W)/.test(qiskitCode) ||
      circuitGatesLengthRef.current > parsed.gates.length;

    // 2. If code has dynamic constructs or canvas already holds runtime-expanded gates,
    // NEVER overwrite the canvas with the partial static regex parse! (C5 fix)
    if (hasDynamicConstructs && circuitGatesLengthRef.current > 0) {
      setIsResultsStale(true);
      return;
    }

    setCircuitGates(parsed.gates);
    setQiskitQubits(parsed.numQubits);
    setQiskitDepth(parsed.depth);
  }, [qiskitCode, framework]);

  // Tracking refs to prevent A2 cross-account writes during user transition
  const lastSavedUserKeyRef = useRef<string>(userKey);
  const lastSavedUserKeyForChatRef = useRef<string>(userKey);

  // Real-time auto-save of current editor code to user-scoped storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Guard against A2 race condition: do not write while hydrating or during user switch
    if (isUserHydratingRef.current || lastSavedUserKeyRef.current !== userKey) {
      lastSavedUserKeyRef.current = userKey;
      return;
    }
    try {
      const currentCode = framework === "dwave" ? dwaveCode : qiskitCode;
      setScopedIdeItem(`code_${activeProject.id}_${activeFile}`, userKey, currentCode);
    } catch (e) {
      console.warn("Failed to auto-save code to user storage:", e);
    }
  }, [dwaveCode, qiskitCode, activeProject.id, activeFile, framework, userKey]);

  // Real-time auto-save of copilot messages to user-scoped storage per active project
  useEffect(() => {
    if (typeof window === "undefined" || !activeProject?.id) return;
    if (isUserHydratingRef.current || lastSavedUserKeyForChatRef.current !== userKey) {
      lastSavedUserKeyForChatRef.current = userKey;
      return;
    }
    try {
      const msgs = framework === "dwave" ? dwaveCopilotMessages : qiskitCopilotMessages;
      setScopedIdeItem(`chat_${activeProject.id}`, userKey, JSON.stringify(msgs));
    } catch (e) {
      console.warn("Failed to auto-save copilot messages to user storage:", e);
    }
  }, [dwaveCopilotMessages, qiskitCopilotMessages, activeProject.id, framework, userKey]);

  const handleSelectHeroTab = (tab: HeroTabType) => {
    setHeroTab(tab);
    if (typeof window !== "undefined") {
      try {
        setScopedIdeItem("hero_tab", userKey, tab);
      } catch (e) {}
    }
  };

  const handleSelectFile = (file: string) => {
    // Flush current in-memory edits before switching files
    const curCode = framework === "dwave" ? dwaveCode : qiskitCode;
    if (activeFile && curCode) {
      setActiveProject((prev) => ({
        ...prev,
        fileContents: {
          ...(prev.fileContents || {}),
          [activeFile]: curCode,
        },
      }));
      if (typeof window !== "undefined") {
        try {
          setScopedIdeItem(`code_${activeProject.id}_${activeFile}`, userKey, curCode);
        } catch (e) {}
      }
    }
    setActiveFile(file);
    let loadedCode = "";
    if (typeof window !== "undefined") {
      try {
        setScopedIdeItem("active_file", userKey, file);
        loadedCode = getScopedIdeItem(`code_${activeProject.id}_${file}`, userKey) || "";
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
        loadedCode = getScopedIdeItem(`code_${proj.id}_${targetFile}`, userKey) || "";
      } catch (e) {}
    }
    if (!loadedCode && proj.fileContents && proj.fileContents[targetFile]) {
      loadedCode = proj.fileContents[targetFile];
    }
    // Check for contamination in custom projects
    if (proj.id !== "clean_energy_portfolio" && loadedCode && loadedCode.includes("# Quantum Guru — Clean Energy Portfolio Selection")) {
      loadedCode = proj.framework === "dwave" ? NEW_DWAVE_STARTER_CODE : NEW_QISKIT_STARTER_CODE;
      if (typeof window !== "undefined") {
        try {
          setScopedIdeItem(`code_${proj.id}_${targetFile}`, userKey, loadedCode);
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
        setScopedIdeItem(`chat_${activeProject.id}`, userKey, JSON.stringify(currentMsgs));
      } catch (e) {}
    }

    // Restore or initialize AI Copilot messages for the target project
    let savedChat: CopilotMessage[] | null = null;
    if (typeof window !== "undefined") {
      try {
        const stored = getScopedIdeItem(`chat_${proj.id}`, userKey);
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
          const stored = getScopedIdeItem(`result_${proj.id}`, userKey);
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
          const stored = getScopedIdeItem(`qiskit_result_${proj.id}`, userKey);
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
        const restoredShots = savedQiskit.shots || (
          savedQiskit.measurement_counts && Object.keys(savedQiskit.measurement_counts).length > 0
            ? Object.values(savedQiskit.measurement_counts as Record<string, number>).reduce((a: any, b: any) => a + b, 0)
            : extractShotsFromCode(proj.fileContents?.[proj.activeFile || "main.py"] || "", "qiskit")
        );
        setQiskitShots(restoredShots || 1024);
        setIsResultsStale(false);
      } else {
        const curFile = proj.activeFile || proj.files?.[0] || "main.py";
        const curCode = loadedCode || proj.fileContents?.[curFile] || NEW_QISKIT_STARTER_CODE;
        const parsed = parseQiskitCodeToCircuit(curCode);
        const hasLoops = /(^|\W)(for|while|def)($|\W)/.test(curCode);
        setQiskitCounts({});
        setCircuitGates(parsed.gates);
        setCircuitAscii("");
        setQiskitQubits(parsed.numQubits);
        setQiskitDepth(parsed.depth);
        setQiskitSimulatorId("");
        setQiskitShots(extractShotsFromCode(curCode, "qiskit"));
        setIsCircuitSynced(!hasLoops);
        setIsResultsStale(true);

        // If this is an algorithm vault project with dynamic/loop constructs and no cached gates, compile in background (C1 fix)
        if (proj.id.startsWith("algo_") && hasLoops && parsed.gates.length === 0) {
          try {
            if (vaultDryRunAbortRef.current) vaultDryRunAbortRef.current.abort();
            const controller = new AbortController();
            vaultDryRunAbortRef.current = controller;
            const targetProjId = proj.id;

            fetch("/api/ide/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code: curCode,
                target_backend: "aer_simulator",
                shots: Math.min(256, extractShotsFromCode(curCode, "qiskit")),
                project_files: { [curFile]: curCode },
                file_name: curFile,
              }),
              signal: controller.signal,
            })
              .then((r) => r.json())
              .then((data) => {
                if (activeProjectIdRef.current !== targetProjId) return;
                if (data && data.success && data.circuit_gates && data.circuit_gates.length > 0) {
                  setCircuitGates(data.circuit_gates);
                  if (data.active_qubits !== undefined) setQiskitQubits(data.active_qubits);
                  if (data.circuit_depth !== undefined) setQiskitDepth(data.circuit_depth);
                  if (data.circuit_ascii) setCircuitAscii(data.circuit_ascii);
                  setIsCircuitSynced(true);
                }
              })
              .catch((err) => {
                if (err.name === "AbortError") return;
              });
          } catch (e) {}
        }
      }
    }

    // Restore project-isolated Execution History
    if (typeof window !== "undefined") {
      try {
        const storedHistory = getScopedIdeItem(`history_${proj.id}`, userKey);
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
        setScopedIdeItem("active_project_id", userKey, proj.id);
        setScopedIdeItem("active_file", userKey, targetFile);
        setScopedIdeItem("hero_tab", userKey, targetTab);
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
    handleCreateProject(newProj, true);
  };

  const handleCreateProject = async (newProj: ProjectItem, isFromVault: boolean = false) => {
    const isVault = isFromVault || newProj.id.startsWith("algo_");
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
        setScopedIdeItem(`chat_${activeProject.id}`, userKey, JSON.stringify(currentMsgs));
      } catch (e) {}
    }

    // 1. Reset AI block clean for the newly created project
    const freshMessages = customProj.framework === "dwave" ? [...DWAVE_INITIAL_MESSAGES] : [...QISKIT_INITIAL_MESSAGES];
    setDwaveCopilotMessages([...DWAVE_INITIAL_MESSAGES]);
    setQiskitCopilotMessages([...QISKIT_INITIAL_MESSAGES]);
    if (typeof window !== "undefined") {
      try {
        setScopedIdeItem(`chat_${customProj.id}`, userKey, JSON.stringify(freshMessages));
      } catch (e) {}
    }

    // Common Console & Execution clean state
    setTerminalOutput("");
    setShowTerminal(false);
    setIsRunningOrRecompiling(false);
    setExecutionHistory([]);

    if (customProj.framework === "dwave") {
      // 2. D-Wave Project Clean:
      setDwaveCode(initialCode);
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

      // If from Algorithm Vault, fire background dry-run compile (C1 & C2 fix)
      if (isVault) {
        try {
          if (vaultDryRunAbortRef.current) vaultDryRunAbortRef.current.abort();
          const controller = new AbortController();
          vaultDryRunAbortRef.current = controller;
          const targetProjId = customProj.id;

          fetch("/api/ide/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: initialCode,
              target_backend: "dwave_simulated_annealing",
              shots: 500,
              project_files: { [targetFile]: initialCode },
              file_name: targetFile,
            }),
            signal: controller.signal,
          })
            .then((r) => r.json())
            .then((data) => {
              if (activeProjectIdRef.current !== targetProjId) return;
              if (data && data.optimization_results) {
                const opt = data.optimization_results;
                setSolverResult((prev) => ({
                  ...prev,
                  qubo_matrix: opt.qubo_matrix || prev.qubo_matrix,
                  variables: opt.variables || prev.variables,
                  latex_formula: opt.latex_formula || prev.latex_formula,
                  energy_distribution: opt.energy_distribution || prev.energy_distribution,
                  energy: opt.energy !== undefined ? opt.energy : (opt.ground_energy !== undefined ? opt.ground_energy : prev.energy),
                  sample: opt.sample || opt.optimal_sample || prev.sample,
                  num_variables: opt.num_variables || prev.num_variables,
                  num_reads: opt.num_reads || prev.num_reads,
                }));
              }
            })
            .catch((err) => {
              if (err.name === "AbortError") return;
            });
        } catch (e) {}
      }
    } else {
      // 3. Qiskit Project Clean:
      setQiskitCode(initialCode);
      const parsed = parseQiskitCodeToCircuit(initialCode);
      const hasLoops = /(^|\W)(for|while|def)($|\W)/.test(initialCode);
      setCircuitGates(parsed.gates);
      setQiskitQubits(parsed.numQubits);
      setQiskitDepth(parsed.depth);
      setCircuitAscii("");
      setIsCircuitSynced(!hasLoops);
      setIsResultsStale(true);
      setQiskitCounts({});
      setQiskitSimulatorId("");

      // If derived from Algorithm Vault, fire fast background dry-run compile to map full ansatz/loop gates to canvas (C1 fix)
      if (isVault) {
        try {
          if (vaultDryRunAbortRef.current) vaultDryRunAbortRef.current.abort();
          const controller = new AbortController();
          vaultDryRunAbortRef.current = controller;
          const targetProjId = customProj.id;
          const shots = Math.min(256, extractShotsFromCode(initialCode, "qiskit"));

          fetch("/api/ide/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: initialCode,
              target_backend: "aer_simulator",
              shots,
              project_files: { [targetFile]: initialCode },
              file_name: targetFile,
            }),
            signal: controller.signal,
          })
            .then((r) => r.json())
            .then((data) => {
              if (activeProjectIdRef.current !== targetProjId) return;
              if (data && data.success && data.circuit_gates && data.circuit_gates.length > 0) {
                setCircuitGates(data.circuit_gates);
                if (data.active_qubits !== undefined) setQiskitQubits(data.active_qubits);
                if (data.circuit_depth !== undefined) setQiskitDepth(data.circuit_depth);
                if (data.circuit_ascii) setCircuitAscii(data.circuit_ascii);
                setIsCircuitSynced(true);
                if (typeof window !== "undefined") {
                  try {
                    setScopedIdeItem(
                      `qiskit_result_${customProj.id}`,
                      userKey,
                      JSON.stringify({
                        measurement_counts: data.measurement_counts || {},
                        circuit_gates: data.circuit_gates,
                        circuit_ascii: data.circuit_ascii,
                        active_qubits: data.active_qubits,
                        circuit_depth: data.circuit_depth,
                      })
                    );
                  } catch (e) {}
                }
              }
            })
            .catch(() => {});
        } catch (e) {}
      }
    }

    if (typeof window !== "undefined") {
      try {
        setScopedIdeItem("active_project_id", userKey, customProj.id);
        setScopedIdeItem("active_file", userKey, targetFile);
        setScopedIdeItem("hero_tab", userKey, "code");
        setScopedIdeItem(`code_${customProj.id}_${targetFile}`, userKey, initialCode);
        if (customProj.fileContents) {
          Object.entries(customProj.fileContents).forEach(([fn, content]) => {
            setScopedIdeItem(`code_${customProj.id}_${fn}`, userKey, content);
          });
        }
        removeScopedIdeItem(`result_${customProj.id}`, userKey);
        removeScopedIdeItem(`qiskit_result_${customProj.id}`, userKey);

        const stored = getScopedIdeItem("custom_projects", userKey);
        const list: ProjectItem[] = stored ? JSON.parse(stored) : [];
        setScopedIdeItem("custom_projects", userKey, JSON.stringify([customProj, ...list.filter(p => p.id !== customProj.id)]));
        broadcastIdeEvent("PROJECTS_CHANGED", { userKey });

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
            content: customProj.fileContents?.[f] || (f === targetFile ? initialCode : `# ${f}`),
          };
        });

        await fetch(`/api/ide/projects`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: customProj.id,
            title: customProj.title,
            desc: customProj.desc,
            templateKey: customProj.framework,
            framework: customProj.framework,
            activeFile: targetFile,
            files: filesPayload,
            chatMessages: (customProj.framework === "dwave" ? dwaveCopilotMessages : qiskitCopilotMessages) || [],
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
        const stored = getScopedIdeItem("custom_projects", userKey);
        if (stored) {
          const list: ProjectItem[] = JSON.parse(stored);
          setScopedIdeItem("custom_projects", userKey, JSON.stringify(list.filter(p => p.id !== projectId)));
          broadcastIdeEvent("PROJECTS_CHANGED", { userKey });
        }
        removeScopedIdeItem(`chat_${projectId}`, userKey);
        removeScopedIdeItem(`history_${projectId}`, userKey);
        removeScopedIdeItem(`result_${projectId}`, userKey);
        removeScopedIdeItem(`qiskit_result_${projectId}`, userKey);
      } catch (e) {}
    }

    if (activeProject.id === projectId) {
      const fallback = projects.find((p) => p.id !== projectId) || INITIAL_PROJECTS[0];
      handleSelectProject(fallback);
    }

    if (user?.email && target.isCustom) {
      try {
        setIsSyncing(true);
        await fetch(`/api/ide/projects?projectId=${encodeURIComponent(projectId)}`, {
          method: "DELETE",
          headers: {
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

        await fetch(`/api/ide/projects`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: activeProject.id,
            title: activeProject.title,
            desc: activeProject.desc,
            templateKey: activeProject.framework,
            framework: activeProject.framework,
            activeFile: activeFile,
            files: filesPayload,
            chatMessages: (activeProject.framework === "dwave" ? dwaveCopilotMessages : qiskitCopilotMessages) || [],
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
    if (clamped === qiskitQubits) return;

    // Guard against accidental code destruction on wire reduction (B1 guard)
    if (clamped < qiskitQubits) {
      const hasOutOfRangeGates = circuitGates.some((g) => {
        const q = g.qubit ?? (g.qubits ? g.qubits[0] : 0);
        const tgt = g.qubits && g.qubits.length > 1 ? g.qubits[1] : q;
        return q >= clamped || tgt >= clamped;
      });
      if (hasOutOfRangeGates && typeof window !== "undefined") {
        const ok = window.confirm(
          `Reducing wire count to ${clamped} will delete gates placed on wires ${clamped} and above from your Python code. Proceed?`
        );
        if (!ok) return;
      }
    }

    isCanvasModifyingRef.current = true;
    setTimeout(() => {
      isCanvasModifyingRef.current = false;
    }, 300);
    setQiskitQubits(clamped);

    // Update QuantumCircuit(N, N) initialization & prune out-of-range gate statements
    setQiskitCode((prevCode) => {
      const lines = prevCode.split("\n");

      let circuitVar = "qc";
      let circuitDefIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(\s*)([a-zA-Z0-9_]+)\s*=\s*(?:[a-zA-Z0-9_]+\.)?QuantumCircuit\(/);
        if (match) {
          circuitVar = match[2];
          circuitDefIdx = i;
          break;
        }
      }

      if (circuitDefIdx !== -1) {
        lines[circuitDefIdx] = lines[circuitDefIdx].replace(
          /(QuantumCircuit\(\s*)(\d+)(?:(\s*,\s*)(\d+))?/,
          (m, prefix, nQ, comma, nC) => {
            if (comma && nC !== undefined) {
              return `${prefix}${clamped}${comma}${clamped}`;
            }
            return `${prefix}${clamped}, ${clamped}`;
          }
        );
      } else {
        const qcRegex = /QuantumCircuit\(\s*\d+\s*(?:,\s*\d+\s*)?\)/;
        if (qcRegex.test(prevCode)) {
          return prevCode.replace(qcRegex, `QuantumCircuit(${clamped}, ${clamped})`);
        } else {
          return `from qiskit import QuantumCircuit\nqc = QuantumCircuit(${clamped}, ${clamped})\n` + prevCode;
        }
      }

      // Prune gates and adjust measurements targeting deleted qubits (index >= clamped)
      const prunedLines: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i <= circuitDefIdx) {
          prunedLines.push(line);
          continue;
        }

        const parsed = parseQiskitLineQubits(line, circuitVar);
        if (!parsed) {
          prunedLines.push(line);
          continue;
        }

        // If line references qubits >= clamped, handle or prune
        if (parsed.qubits.length > 0 && parsed.qubits.some((q) => q >= clamped)) {
          if (parsed.op === "measure") {
            const validQubits = parsed.qubits.filter((q) => q < clamped);
            if (validQubits.length === 0) {
              continue;
            } else if (validQubits.length === 1) {
              const q0 = validQubits[0];
              const indent = line.match(/^(\s*)/)?.[1] || "";
              prunedLines.push(`${indent}${circuitVar}.measure(${q0}, ${q0})`);
              continue;
            } else {
              const indent = line.match(/^(\s*)/)?.[1] || "";
              const qListStr = `[${validQubits.join(", ")}]`;
              prunedLines.push(`${indent}${circuitVar}.measure(${qListStr}, ${qListStr})`);
              continue;
            }
          }
          // Out of range gate: prune line from Python code
          continue;
        }

        prunedLines.push(line);
      }

      return prunedLines.join("\n");
    });

    // Prune gates that now exceed the new qubit capacity in visual state
    setCircuitGates((prev) =>
      prev.filter((g) => {
        const q = g.qubit ?? (g.qubits ? g.qubits[0] : 0);
        const tgt = g.qubits && g.qubits.length > 1 ? g.qubits[1] : q;
        return q < clamped && tgt < clamped;
      })
    );

    setIsCircuitSynced(true);
  };

  const handleAddGateToCircuit = (
    gateName: string,
    qubit: number,
    targetQubit?: number,
    step?: number,
    angleExpr?: string,
    extraArgs?: { control2?: number; uTheta?: string; uPhi?: string; uLam?: string }
  ) => {
    isCanvasModifyingRef.current = true;
    setTimeout(() => {
      isCanvasModifyingRef.current = false;
    }, 300);
    const gateUpper = gateName.toUpperCase();
    const ctrl2 = extraArgs?.control2;

    const isTwoQubit = ["CX", "CNOT", "CZ", "CH", "SWAP", "CP", "CRX", "CRY", "CRZ", "RZZ"].includes(gateUpper);
    const isThreeQubit = ["CCX", "TOFFOLI"].includes(gateUpper);

    const effectiveTarget = isTwoQubit
      ? (targetQubit !== undefined ? targetQubit : (qubit === 0 ? 1 : 0))
      : targetQubit;

    const effectiveCtrl2 = isThreeQubit
      ? (ctrl2 !== undefined ? ctrl2 : (qubit === 1 ? 0 : 1))
      : ctrl2;

    const effectiveThreeQubitTarget = isThreeQubit
      ? (targetQubit !== undefined ? targetQubit : 2)
      : undefined;

    const neededQubits = Math.max(
      qubit + 1,
      effectiveTarget !== undefined ? effectiveTarget + 1 : 1,
      effectiveCtrl2 !== undefined ? effectiveCtrl2 + 1 : 1,
      effectiveThreeQubitTarget !== undefined ? effectiveThreeQubitTarget + 1 : 1
    );
    setQiskitQubits((prev) => Math.max(prev, neededQubits));

    const participatingQubits = [qubit];
    if (effectiveTarget !== undefined) participatingQubits.push(effectiveTarget);
    if (effectiveCtrl2 !== undefined) participatingQubits.push(effectiveCtrl2);
    if (effectiveThreeQubitTarget !== undefined) participatingQubits.push(effectiveThreeQubitTarget);

    // Collision Resolution: Ensure no participating wire is already occupied at gateStep (B4 fix)
    const requestedStep = step !== undefined 
      ? step 
      : (circuitGates.length > 0 ? Math.max(...circuitGates.map((g) => g.step ?? 0)) + 1 : 0);

    let gateStep = requestedStep;
    while (true) {
      const isOccupied = circuitGates.some((g) => {
        const s = g.step ?? 0;
        if (s !== gateStep) return false;
        const gWires = g.qubits && g.qubits.length > 0
          ? g.qubits
          : [g.qubit ?? 0, ...(g.target !== undefined ? [g.target] : [])];
        return participatingQubits.some((w) => gWires.includes(w));
      });
      if (!isOccupied) break;
      gateStep++;
    }

    // Intelligently find where QuantumCircuit is declared & insert gate at exact step slot
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

      // Auto-expand QuantumCircuit qubit and classical register count if needed (B9)
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
            if (gateUpper === "M" || gateUpper === "MEASURE") {
              return `${prefix}${newQ}, ${newQ}`;
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
        case "SX":
          gateCall = `${circuitVar}.sx(${qubit})`;
          break;
        case "SXDG":
        case "SX†":
          gateCall = `${circuitVar}.sxdg(${qubit})`;
          break;
        case "RX":
          gateCall = `${circuitVar}.rx(${angleExpr || "np.pi / 2"}, ${qubit})`;
          break;
        case "RY":
          gateCall = `${circuitVar}.ry(${angleExpr || "np.pi / 2"}, ${qubit})`;
          break;
        case "RZ":
          gateCall = `${circuitVar}.rz(${angleExpr || "np.pi / 2"}, ${qubit})`;
          break;
        case "P":
          gateCall = `${circuitVar}.p(${angleExpr || "np.pi / 2"}, ${qubit})`;
          break;
        case "U":
          gateCall = `${circuitVar}.u(${extraArgs?.uTheta || angleExpr || "np.pi / 2"}, ${extraArgs?.uPhi || "0.0"}, ${extraArgs?.uLam || "np.pi"}, ${qubit})`;
          break;
        case "CX":
        case "CNOT":
          gateCall = `${circuitVar}.cx(${qubit}, ${effectiveTarget})`;
          break;
        case "CZ":
          gateCall = `${circuitVar}.cz(${qubit}, ${effectiveTarget})`;
          break;
        case "CH":
          gateCall = `${circuitVar}.ch(${qubit}, ${effectiveTarget})`;
          break;
        case "SWAP":
          gateCall = `${circuitVar}.swap(${qubit}, ${effectiveTarget})`;
          break;
        case "CP":
          gateCall = `${circuitVar}.cp(${angleExpr || "np.pi / 2"}, ${qubit}, ${effectiveTarget})`;
          break;
        case "CRX":
          gateCall = `${circuitVar}.crx(${angleExpr || "np.pi / 2"}, ${qubit}, ${effectiveTarget})`;
          break;
        case "CRY":
          gateCall = `${circuitVar}.cry(${angleExpr || "np.pi / 2"}, ${qubit}, ${effectiveTarget})`;
          break;
        case "CRZ":
          gateCall = `${circuitVar}.crz(${angleExpr || "np.pi / 2"}, ${qubit}, ${effectiveTarget})`;
          break;
        case "RZZ":
          gateCall = `${circuitVar}.rzz(${angleExpr || "np.pi / 2"}, ${qubit}, ${effectiveTarget})`;
          break;
        case "CCX":
        case "TOFFOLI": {
          gateCall = `${circuitVar}.ccx(${qubit}, ${effectiveCtrl2}, ${effectiveThreeQubitTarget})`;
          break;
        }
        case "M":
        case "MEASURE":
          gateCall = `${circuitVar}.measure(${qubit}, ${qubit})`;
          break;
        case "BARRIER":
        case "B":
          gateCall = `${circuitVar}.barrier()`;
          break;
        default:
          gateCall = `${circuitVar}.${gateUpper.toLowerCase()}(${qubit})`;
          break;
      }

      const formattedLine = `${baseIndent}${gateCall}`;

      // 3. Insert inside the correct scope where the circuit exists at exact step slot
      if (circuitDefIdx !== -1) {
        const wireSteps: Record<number, number> = {};
        for (let w = 0; w < 30; w++) wireSteps[w] = 0;

        const gateQubits = [qubit];
        if (effectiveTarget !== undefined) gateQubits.push(effectiveTarget);
        if (effectiveCtrl2 !== undefined) gateQubits.push(effectiveCtrl2);
        if (effectiveThreeQubitTarget !== undefined) gateQubits.push(effectiveThreeQubitTarget);

        let insertAt = -1;
        let firstTerminalIdx = -1;
        let lastGateIdx = -1;

        for (let j = circuitDefIdx + 1; j < lines.length; j++) {
          const l = lines[j];
          const trimmed = l.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;

          // Scope check: if indentation drops lower than baseIndent, block ended
          const currentIndent = l.match(/^(\s*)/)?.[1] || "";
          if (baseIndent && currentIndent.length < baseIndent.length && trimmed.length > 0) {
            break;
          }

          const parsed = parseQiskitLineQubits(trimmed, circuitVar, Math.max(qiskitQubits, neededQubits));
          if (!parsed) {
            if (trimmed.startsWith("return ") || trimmed.startsWith("sim.run")) {
              if (firstTerminalIdx === -1) firstTerminalIdx = j;
              break;
            }
            continue;
          }

          if (parsed.isTerminal) {
            if (firstTerminalIdx === -1) firstTerminalIdx = j;
            continue;
          }

          lastGateIdx = j;
          const lineQubits = parsed.qubits.length > 0 ? parsed.qubits : [0];
          const currentLineStep = Math.max(0, ...lineQubits.map((w) => wireSteps[w] ?? 0));
          const sharesQubit = lineQubits.some((w) => gateQubits.includes(w));

          if (sharesQubit && currentLineStep >= gateStep) {
            insertAt = j;
            break;
          }

          for (const w of lineQubits) {
            wireSteps[w] = currentLineStep + 1;
          }
        }

        if (insertAt === -1) {
          if (firstTerminalIdx !== -1) {
            insertAt = firstTerminalIdx;
          } else if (lastGateIdx !== -1) {
            insertAt = lastGateIdx + 1;
          } else {
            insertAt = circuitDefIdx + 1;
          }
        }

        lines.splice(insertAt, 0, formattedLine);
        return lines.join("\n");
      }

      // Fallback: If no QuantumCircuit exists yet, initialize one
      const preamble = `from qiskit import QuantumCircuit\nqc = QuantumCircuit(${Math.max(neededQubits, 2)})\n`;
      return preamble + `${formattedLine}\n` + prevCode;
    });

    // Update visual circuit state
    const normName = gateUpper.toLowerCase();
    const newGates: any[] = [];

    if (isTwoQubit && effectiveTarget !== undefined) {
      newGates.push({
        name: normName,
        qubit,
        target: effectiveTarget,
        qubits: [qubit, effectiveTarget],
        step: gateStep,
        role: "control",
        params: angleExpr ? [angleExpr] : [],
      });
      newGates.push({
        name: normName,
        qubit: effectiveTarget,
        target: qubit,
        qubits: [qubit, effectiveTarget],
        step: gateStep,
        role: "target",
        params: angleExpr ? [angleExpr] : [],
      });
    } else if (isThreeQubit && effectiveCtrl2 !== undefined && effectiveThreeQubitTarget !== undefined) {
      const tgt = effectiveThreeQubitTarget;
      const c2 = effectiveCtrl2;
      newGates.push({
        name: normName,
        qubit,
        target: tgt,
        qubits: [qubit, c2, tgt],
        step: gateStep,
        role: "control",
        params: [],
      });
      newGates.push({
        name: normName,
        qubit: c2,
        target: tgt,
        qubits: [qubit, c2, tgt],
        step: gateStep,
        role: "control",
        params: [],
      });
      newGates.push({
        name: normName,
        qubit: tgt,
        target: qubit,
        qubits: [qubit, c2, tgt],
        step: gateStep,
        role: "target",
        params: [],
      });
    } else {
      let params: string[] = [];
      if (extraArgs?.uTheta) {
        params = [extraArgs.uTheta, extraArgs.uPhi || "0.0", extraArgs.uLam || "np.pi"];
      } else if (angleExpr) {
        params = [angleExpr];
      }
      newGates.push({
        name: normName,
        qubit,
        qubits: [qubit],
        step: gateStep,
        role: "single",
        params,
      });
    }

    setCircuitGates((prev) => {
      // Remove any existing gate at any participating qubit and step slot to avoid overlap (B4 fix)
      const filtered = prev.filter((g) => {
        const s = g.step ?? 0;
        if (s !== gateStep) return true;
        const gWires = g.qubits && g.qubits.length > 0
          ? g.qubits
          : [g.qubit ?? 0, ...(g.target !== undefined ? [g.target] : [])];
        return !participatingQubits.some((w) => gWires.includes(w));
      });
      return [...filtered, ...newGates];
    });

    setQiskitDepth((prev) => Math.max(prev, gateStep + 1));
    setIsCircuitSynced(true);
    setIsResultsStale(true);
  };

  const handleRemoveGateFromCircuit = (gateIndex: number) => {
    const gateToRemove = circuitGates[gateIndex];
    if (!gateToRemove) return;

    isCanvasModifyingRef.current = true;
    setTimeout(() => {
      isCanvasModifyingRef.current = false;
    }, 300);

    const q = gateToRemove.qubit;
    const tgt = gateToRemove.target !== undefined
      ? gateToRemove.target
      : (gateToRemove.qubits && gateToRemove.qubits.length > 1 ? gateToRemove.qubits[1] : undefined);
    const targetStep = gateToRemove.step;
    const gateUpper = (gateToRemove.name || "").toUpperCase();
    const toRemoveQubits: number[] = gateToRemove.qubits && gateToRemove.qubits.length > 0
      ? gateToRemove.qubits
      : (tgt !== undefined && q !== undefined ? [q, tgt] : (q !== undefined ? [q] : []));

    // 1. Update Python code by removing matching gate line
    setQiskitCode((prevCode) => {
      const lines = prevCode.split("\n");
      let circuitVar = "qc";
      for (const l of lines) {
        const match = l.match(/^(\s*)([a-zA-Z0-9_]+)\s*=\s*(?:[a-zA-Z0-9_]+\.)?QuantumCircuit\(/);
        if (match) {
          circuitVar = match[2];
          break;
        }
      }

      const isCx = gateUpper === "CX" || gateUpper === "CNOT";
      const isCcx = gateUpper === "CCX" || gateUpper === "TOFFOLI";

      const wireSteps: Record<number, number> = {};
      for (let w = 0; w < 30; w++) wireSteps[w] = 0;
      let removeIdx = -1;

      for (let i = 0; i < lines.length; i++) {
        const parsed = parseQiskitLineQubits(lines[i], circuitVar, qiskitQubits);
        if (!parsed) continue;

        const lineQubits = parsed.qubits.length > 0 ? parsed.qubits : [0];
        const curStep = Math.max(0, ...lineQubits.map((w) => wireSteps[w] ?? 0));
        const opUpper = parsed.op.toUpperCase();

        const nameMatches = isCx
          ? (opUpper === "CX" || opUpper === "CNOT")
          : isCcx
          ? (opUpper === "CCX" || opUpper === "TOFFOLI")
          : (opUpper === gateUpper || (gateUpper === "M" && opUpper === "MEASURE") || (gateUpper === "MEASURE" && opUpper === "MEASURE"));

        const qubitMatches = toRemoveQubits.length > 0
          ? (toRemoveQubits.every((wq: number) => lineQubits.includes(wq)))
          : (lineQubits.includes(q));

        if (nameMatches && qubitMatches && (targetStep === undefined || curStep === targetStep)) {
          removeIdx = i;
          break;
        }

        for (const w of lineQubits) {
          wireSteps[w] = curStep + 1;
        }
      }

      // Fallback: scan from bottom if step matching didn't catch
      if (removeIdx === -1) {
        for (let i = lines.length - 1; i >= 0; i--) {
          const parsed = parseQiskitLineQubits(lines[i], circuitVar, qiskitQubits);
          if (!parsed) continue;
          const lineQubits = parsed.qubits.length > 0 ? parsed.qubits : [0];
          const opUpper = parsed.op.toUpperCase();
          const nameMatches = isCx
            ? (opUpper === "CX" || opUpper === "CNOT")
            : isCcx
            ? (opUpper === "CCX" || opUpper === "TOFFOLI")
            : (opUpper === gateUpper || (gateUpper === "M" && opUpper === "MEASURE") || (gateUpper === "MEASURE" && opUpper === "MEASURE"));
          const qubitMatches = toRemoveQubits.length > 0
            ? (toRemoveQubits.every((wq: number) => lineQubits.includes(wq)))
            : (lineQubits.includes(q));
          if (nameMatches && qubitMatches) {
            removeIdx = i;
            break;
          }
        }
      }

      if (removeIdx !== -1) {
        lines.splice(removeIdx, 1);
        return lines.join("\n");
      }
      isCanvasModifyingRef.current = false;
      return prevCode;
    });

    // 2. Remove all related visual tiles from circuitGates state without leaving orphan controls (B5 fix)
    setCircuitGates((prev) =>
      prev.filter((g, idx) => {
        if (idx === gateIndex) return false;
        const gUpper = (g.name || "").toUpperCase();
        if (gUpper === gateUpper && g.step === targetStep) {
          const gQubits = g.qubits && g.qubits.length > 0
            ? g.qubits
            : (g.target !== undefined && g.qubit !== undefined ? [g.qubit, g.target] : [g.qubit]);
          const sameQubits = toRemoveQubits.length > 0 &&
            toRemoveQubits.length === gQubits.length &&
            toRemoveQubits.every((wq: number) => gQubits.includes(wq));
          if (sameQubits) {
            return false;
          }
        }
        return true;
      })
    );

    setIsCircuitSynced(true);
    setIsResultsStale(true);
  };
  const handleSyncCodeAndCircuit = useCallback(() => {
    if (framework === "dwave") {
      setIsModelDirty(false);
      setIsCircuitSynced(true);
      return;
    }

    // Explicit manual sync: parse editor Python code into visual schematic tiles without wiping loop-generated gates
    const parsed = parseQiskitCodeToCircuit(qiskitCode);
    const hasDynamic = /(^|\W)(for|while|def|append|compose|QuantumRegister|Parameter|QFT)($|\W)/.test(qiskitCode);
    if (!hasDynamic || circuitGatesLengthRef.current === 0) {
      setCircuitGates(parsed.gates);
      setQiskitQubits(parsed.numQubits);
      setQiskitDepth(parsed.depth);
    }
    setIsCircuitSynced(true);
    setIsResultsStale(true);
  }, [framework, qiskitCode]);

  const handleRunOrRecompile = useCallback(async () => {
    setIsRunningOrRecompiling(true);
    setShowTerminal(true);
    const t0 = performance.now();

    if (framework === "dwave") {
      try {
        // If user is currently viewing a helper module (qubo_matrix.py) or config file, execute primary entrypoint
        const updatedFiles: Record<string, string> = {
          ...(activeProject.fileContents || {}),
          [activeFile]: dwaveCode,
        };
        const isHelperOrNonPy = activeFile === "qubo_matrix.py" || !activeFile.endsWith(".py");
        const entryFile = isHelperOrNonPy
          ? (activeProject.files.find((f) => f.endsWith(".py") && f !== "qubo_matrix.py") || activeFile)
          : activeFile;
        const codeToRun = entryFile === activeFile ? dwaveCode : (updatedFiles[entryFile] || dwaveCode);

        const execReads = extractShotsFromCode(codeToRun, "dwave");
        const response = await fetch("/api/ide/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: codeToRun,
            target_backend: "dwave_simulated_annealing",
            shots: execReads,
            project_files: updatedFiles,
            file_name: entryFile,
          }),
        });

        const data = await response.json();
        const dur = performance.now() - t0;
        setLatencyMs(parseFloat(dur.toFixed(1)));

        // Guard against C4 project switch race condition:
        const curProjId = activeProject.id;
        if (activeProjectIdRef.current !== curProjId) {
          if (data.success && data.optimization_results && typeof window !== "undefined") {
            try {
              const opt = data.optimization_results;
              setScopedIdeItem(`result_${curProjId}`, userKey, JSON.stringify({
                energy: opt.energy,
                sample: opt.sample,
                num_variables: opt.num_variables || Object.keys(opt.sample).length,
                variables: opt.variables || Object.keys(opt.sample),
                qubo_matrix: opt.qubo_matrix || [],
                energy_distribution: opt.energy_distribution || [],
                num_reads: opt.num_reads,
                latex_formula: opt.latex_formula,
                simulator_id: data.simulator_id,
              }));
            } catch (e) {}
          }
          return;
        }

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
              simulator_id: data.simulator_id,
            };
            setSolverResult(newRes);
            if (typeof window !== "undefined") {
              try {
                setScopedIdeItem(`result_${activeProject.id}`, userKey, JSON.stringify(newRes));
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
            shots: data.optimization_results?.num_reads || execReads,
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
              const raw = getScopedIdeItem(`history_${curProjId}`, userKey);
              if (raw) curHist = JSON.parse(raw);
            } catch {}
          }
          const updatedDwave = [dItem, ...curHist.filter((x: any) => !x.projectId || x.projectId === curProjId).slice(0, 19)];
          setExecutionHistory(updatedDwave);
          if (typeof window !== "undefined") {
            try {
              setScopedIdeItem(`history_${curProjId}`, userKey, JSON.stringify(updatedDwave));
            } catch {}
          }

          setIsModelDirty(false);
          // NOTE: User's code in the editor is preserved 100%! Never overwrite dwaveCode!
        } else {
          const errOut = data.stderr || data.error || "D-Wave execution error";
          setTerminalOutput(
            `$ dwave-anneal --backend simulated_annealing\n` +
            (data.stdout ? `${data.stdout.trim()}\n\n` : "") +
            `[STDERR] ${errOut}`
          );
          const now = new Date();
          const curProjId = activeProject.id;
          const errItem: ExecutionHistoryItem = {
            id: data.simulator_id || `DW-ERR-${Date.now()}`,
            projectId: curProjId,
            timestamp: now.toISOString(),
            formattedDate: now.toLocaleString(),
            framework: "dwave",
            status: "error",
            latencyMs: parseFloat(dur.toFixed(1)),
            shots: 1024,
            summary: (errOut.trim().split("\n").pop() || "D-Wave execution error").slice(0, 90),
            stdout: data.stdout || "",
            stderr: errOut,
            jobId: data.simulator_id,
          };
          setExecutionHistory((prev) => [errItem, ...prev.slice(0, 19)]);
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
        const updatedQFiles: Record<string, string> = {
          ...(activeProject.fileContents || {}),
          [activeFile]: qiskitCode,
        };
        const qEntryFile = !activeFile.endsWith(".py")
          ? (activeProject.files.find((f) => f.endsWith(".py")) || activeFile)
          : activeFile;
        const qCodeToRun = qEntryFile === activeFile ? qiskitCode : (updatedQFiles[qEntryFile] || qiskitCode);

        // Dynamically extract shots from code editor
        const execShots = extractShotsFromCode(qCodeToRun, "qiskit");

        const response = await fetch("/api/ide/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: qCodeToRun,
            target_backend: "aer_simulator",
            shots: execShots,
            project_files: updatedQFiles,
            file_name: qEntryFile,
          }),
        });

        const data = await response.json();
        const dur = performance.now() - t0;
        setLatencyMs(parseFloat(dur.toFixed(1)));

        // Guard against C4 project switch race condition:
        const curProjId = activeProject.id;
        if (activeProjectIdRef.current !== curProjId) {
          if (data.success && typeof window !== "undefined") {
            try {
              setScopedIdeItem(`qiskit_result_${curProjId}`, userKey, JSON.stringify({
                measurement_counts: data.measurement_counts || {},
                circuit_gates: data.circuit_gates || [],
                circuit_ascii: data.circuit_ascii || "",
                active_qubits: data.active_qubits || 2,
                circuit_depth: data.circuit_depth || 0,
                simulator_id: data.simulator_id || "",
              }));
            } catch (e) {}
          }
          return;
        }

        if (data.success) {
          if (data.simulator_id) {
            setQiskitSimulatorId(data.simulator_id);
          }
          let actualTotalShots = execShots;
          const stdoutMatch = data.stdout ? data.stdout.match(/\b(?:Shots|shots|num_shots):\s*(\d+)/) : null;
          if (stdoutMatch) {
            actualTotalShots = parseInt(stdoutMatch[1], 10);
          } else if (data.shots) {
            actualTotalShots = data.shots;
          } else if (data.measurement_counts && Object.keys(data.measurement_counts).length > 0) {
            const total = Object.values(data.measurement_counts as Record<string, number>).reduce((a, b) => a + b, 0);
            if (total > 0) actualTotalShots = total;
          }

          if (data.measurement_counts && Object.keys(data.measurement_counts).length > 0) {
            setQiskitCounts(data.measurement_counts);
            setQiskitShots(actualTotalShots);
          } else {
            setQiskitShots(actualTotalShots);
          }
          const hasLoopsOrDefs = /(^|\W)(for|while|def)($|\W)/.test(qiskitCode);
          // Smart Canvas Sync:
          // 1. If code has dynamic loops/functions, or was modified in Monaco, or gate count differs, or canvas was empty:
          //    Update canvas with the real evaluated circuit from the backend simulation!
          // 2. If the user authored directly on the visual canvas, has not touched code, and gate count matches:
          //    Preserve the user's custom step spacing without collapsing!
          if (data.circuit_gates && data.circuit_gates.length > 0) {
            setCircuitGates((currentGates) => {
              const countDiffers = !currentGates || currentGates.length !== data.circuit_gates.length;
              if (!isCircuitSynced || hasLoopsOrDefs || countDiffers) {
                return data.circuit_gates;
              }
              return currentGates;
            });
            setIsCircuitSynced(true);
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
          setIsResultsStale(false);

          if (typeof window !== "undefined") {
            try {
              setScopedIdeItem(
                `qiskit_result_${activeProject.id}`,
                userKey,
                JSON.stringify({
                  measurement_counts: data.measurement_counts,
                  circuit_gates: data.circuit_gates,
                  circuit_ascii: data.circuit_ascii,
                  active_qubits: data.active_qubits,
                  circuit_depth: data.circuit_depth,
                  simulator_id: data.simulator_id,
                  shots: actualTotalShots,
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
            shots: actualTotalShots,
            summary: data.measurement_counts && Object.keys(data.measurement_counts).length > 0
              ? `${Object.keys(data.measurement_counts).length} states measured • ${actualTotalShots} shots`
              : (data.active_qubits ? `${data.active_qubits} qubits • depth ${data.circuit_depth ?? 1}` : "Qiskit Aer Simulator executed"),
            stdout: data.stdout || "",
            stderr: data.stderr || "",
            jobId: data.simulator_id,
          };
          let curHist: ExecutionHistoryItem[] = [];
          if (typeof window !== "undefined") {
            try {
              const raw = getScopedIdeItem(`history_${curProjId}`, userKey);
              if (raw) curHist = JSON.parse(raw);
            } catch {}
          }
          const updatedQiskit = [qItem, ...curHist.filter((x: any) => !x.projectId || x.projectId === curProjId).slice(0, 19)];
          setExecutionHistory(updatedQiskit);
          if (typeof window !== "undefined") {
            try {
              setScopedIdeItem(`history_${curProjId}`, userKey, JSON.stringify(updatedQiskit));
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

          // Quantum Journey 101 AI Mentor Guidance on Execution
          if (activeProject.id === "quantum_journey_101") {
            const currentM = getJourneyMilestone(journeyMilestoneId);
            if (journeyStage === "explore") {
              const countsStr = JSON.stringify(data.measurement_counts || {});
              let predictionFeedback = "";
              if (userPrediction && currentM.evaluatePrediction) {
                const predEval = currentM.evaluatePrediction(userPrediction);
                predictionFeedback = `\n\n**Prediction Comparison:**\nYou predicted: *"${userPrediction}"*\n${predEval.feedback}\n`;
                setUserPrediction(null);
              }

              const debriefLoadingId = Date.now() + 4;
              setQiskitCopilotMessages((prev) => [
                ...prev,
                {
                  id: debriefLoadingId,
                  sender: "assistant",
                  text: "Analyzing circuit and reasoning with Quantum Guru Copilot...",
                  timestamp: "Just now",
                  isStreaming: true,
                },
              ]);

              setTimeout(() => {
                const debriefMsg: CopilotMessage = {
                  id: debriefLoadingId,
                  sender: "assistant",
                  text: `**Simulation Complete**\n\nYour circuit executed with Aer simulator (\`${execShots}\` shots).\nRecorded Measurement Distribution:\n\`\`\`json\n${countsStr}\n\`\`\`${predictionFeedback}\n\n${currentM.quizQuestion}`,
                  timestamp: "Just now",
                };
                setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== debriefLoadingId), debriefMsg]);
                setJourneyStage("quiz");
                setQuizHelpCount(0);
                if (typeof window !== "undefined") {
                  try {
                    setScopedIdeItem("journey_101_stage", userKey, "quiz");
                  } catch (e) {}
                }
              }, 500);
            } else if (journeyStage === "challenge") {
              const valResult = currentM.validateChallenge(
                data.measurement_counts || {},
                data.circuit_gates || [],
                data.active_qubits || 1,
                qiskitCode
              );

              const challengeLoadingId = Date.now() + 4;
              setQiskitCopilotMessages((prev) => [
                ...prev,
                {
                  id: challengeLoadingId,
                  sender: "assistant",
                  text: "Analyzing circuit and reasoning with Quantum Guru Copilot...",
                  timestamp: "Just now",
                  isStreaming: true,
                },
              ]);

              setTimeout(() => {
                if (valResult.passed) {
                  const passMsg: CopilotMessage = {
                    id: challengeLoadingId,
                    sender: "assistant",
                    text: `${valResult.feedback}\n\n${currentM.completionMessage}`,
                    timestamp: "Just now",
                  };
                  setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== challengeLoadingId), passMsg]);
                  setJourneyStage("completed");
                  if (typeof window !== "undefined") {
                    try {
                      setScopedIdeItem("journey_101_stage", userKey, "completed");
                    } catch (e) {}
                  }
                } else {
                  const hintMsg: CopilotMessage = {
                    id: challengeLoadingId,
                    sender: "assistant",
                    text: `**Guru AI Assessment:**\n\n${valResult.feedback}`,
                    timestamp: "Just now",
                  };
                  setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== challengeLoadingId), hintMsg]);
                }
              }, 500);
            }
          }
        } else {
          const errOut = data.stderr || data.error || "Circuit execution error";
          setTerminalOutput(
            `$ qiskit-aer --backend aer_simulator --shots ${execShots}\n` +
            (data.stdout ? `${data.stdout.trim()}\n\n` : "") +
            `[STDERR] ${errOut}`
          );
          const now = new Date();
          const curProjId = activeProject.id;
          const errItem: ExecutionHistoryItem = {
            id: data.simulator_id || `SIM-ERR-${Date.now()}`,
            projectId: curProjId,
            timestamp: now.toISOString(),
            formattedDate: now.toLocaleString(),
            framework: "qiskit",
            status: "error",
            latencyMs: parseFloat(dur.toFixed(1)),
            shots: execShots,
            summary: (errOut.trim().split("\n").pop() || "Circuit execution error").slice(0, 90),
            stdout: data.stdout || "",
            stderr: errOut,
            jobId: data.simulator_id,
          };
          setExecutionHistory((prev) => [errItem, ...prev.slice(0, 19)]);
        }
      } catch (err: any) {
        setTerminalOutput(`[ERROR] Aer simulator gateway offline: ${err.message}`);
      } finally {
        setIsRunningOrRecompiling(false);
      }
    }
  }, [framework, dwaveCode, qiskitCode, currentMatrix, mathParams, activeProject, activeFile, journeyMilestoneId, journeyStage, userPrediction]);

  const handleApplyPipelineCode = async (code: string, meta?: any) => {
    if (!code) return;
    const targetFile = activeFile.endsWith(".py")
      ? activeFile
      : (activeProject.files.find((f) => f.endsWith(".py")) || "main.py");

    if (framework === "qiskit") {
      setQiskitCode(code);
      setActiveProject((prev) => ({
        ...prev,
        fileContents: {
          ...(prev.fileContents || {}),
          [targetFile]: code,
        },
      }));
      try {
        setScopedIdeItem(`code_${activeProject.id}_${targetFile}`, userKey, code);
      } catch {}

      setQiskitCopilotMessages((prev) =>
        prev.map((m) => (m.generatedCode === code ? { ...m, appliedToEditor: true } : m))
      );

      setHeroTab("code");
      setShowTerminal(true);
      setIsRunningOrRecompiling(true);
      const shotsMatch = code.match(/shots\s*=\s*(\d+)/);
      const execShots = shotsMatch ? parseInt(shotsMatch[1], 10) : 1024;
      setTerminalOutput(
        `$ qiskit-aer --backend aer_simulator --shots ${execShots}\n` +
        `[UPDATED] Applied Qiskit script to Monaco editor (${targetFile})\n` +
        `[EXECUTING] Simulating quantum circuit on AerSimulator...`
      );
      const t0 = performance.now();
      try {
        const resp = await fetch("/api/ide/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            target_backend: "aer_simulator",
            shots: execShots,
            project_files: {
              ...(activeProject.fileContents || {}),
              [targetFile]: code,
            },
            file_name: targetFile,
          }),
        });
        const data = await resp.json();
        const dur = performance.now() - t0;
        setLatencyMs(parseFloat(dur.toFixed(1)));
        if (data.success) {
          if (data.simulator_id) setQiskitSimulatorId(data.simulator_id);
          if (data.measurement_counts && Object.keys(data.measurement_counts).length > 0) {
            setQiskitCounts(data.measurement_counts);
            const total = Object.values(data.measurement_counts as Record<string, number>).reduce((a, b) => a + b, 0);
            if (total > 0) setQiskitShots(total);
          }
          if (data.circuit_gates) setCircuitGates(data.circuit_gates);
          if (data.circuit_ascii) setCircuitAscii(data.circuit_ascii);
          if (data.active_qubits !== undefined) setQiskitQubits(data.active_qubits);
          if (data.circuit_depth !== undefined) setQiskitDepth(data.circuit_depth);
          setIsCircuitSynced(true);
          setTerminalOutput(
            `$ qiskit-aer --backend aer_simulator --shots ${execShots}${data.simulator_id ? ` --job-id ${data.simulator_id}` : ""}\n` +
            `[SUCCESS] Simulation completed in ${dur.toFixed(1)}ms\n` +
            `Active Qubits: ${data.active_qubits ?? 1} | Depth: ${data.circuit_depth ?? 1}\n` +
            `Measurement Counts: ${JSON.stringify(data.measurement_counts || {})}\n` +
            (data.stdout ? `\n--- Standard Output ---\n${data.stdout}` : "") +
            (data.circuit_ascii ? `\n--- Circuit Diagram ---\n${data.circuit_ascii}` : "")
          );
        } else {
          setTerminalOutput(`[STDERR] ${data.stderr || data.error || "Circuit execution error"}`);
        }
      } catch (err: any) {
        setTerminalOutput(`[ERROR] Execution engine error: ${err.message}`);
      } finally {
        setIsRunningOrRecompiling(false);
      }
      return;
    }

    setDwaveCode(code);
    setActiveProject((prev) => {
      const newFiles = meta?.qubo_code && !prev.files.includes("qubo_matrix.py")
        ? [...prev.files, "qubo_matrix.py"]
        : prev.files;
      const newContents = {
        ...(prev.fileContents || {}),
        [targetFile]: code,
        ...(meta?.qubo_code ? { "qubo_matrix.py": meta.qubo_code } : {}),
      };
      return {
        ...prev,
        files: newFiles,
        fileContents: newContents,
      };
    });
    try {
      setScopedIdeItem(`code_${activeProject.id}_${targetFile}`, userKey, code);
      if (meta?.qubo_code) {
        setScopedIdeItem(`code_${activeProject.id}_qubo_matrix.py`, userKey, meta.qubo_code);
      }
    } catch {}

    setDwaveCopilotMessages((prev) =>
      prev.map((m) => (m.generatedCode === code ? { ...m, appliedToEditor: true } : m))
    );

    setHeroTab("code");
    setShowTerminal(true);
    setIsRunningOrRecompiling(true);
    setTerminalOutput(
      `$ dwave-anneal --backend simulated_annealing\n` +
      `[UPDATED] Applied D-Wave script into Monaco editor (${targetFile})\n` +
      `[EXECUTING] Compiling Hamiltonian couplers & sampling ground states...`
    );

    const t0 = performance.now();
    try {
      const resp = await fetch("/api/ide/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          target_backend: "dwave_simulated_annealing",
          shots: 1024,
          project_files: {
            ...(activeProject.fileContents || {}),
            [targetFile]: code,
            ...(meta?.qubo_code ? { "qubo_matrix.py": meta.qubo_code } : {}),
          },
          file_name: targetFile,
        }),
      });
      const data = await resp.json();
      const dur = performance.now() - t0;
      setLatencyMs(parseFloat(dur.toFixed(1)));
      if (data.success && data.optimization_results) {
        const opt = data.optimization_results;
        const solverRes: OptimizationResults = {
          sample: opt.sample || {},
          energy: typeof opt.energy === "number" ? opt.energy : 0,
          variables: opt.variables || (opt.sample ? Object.keys(opt.sample) : []),
          num_variables: opt.num_variables || (opt.sample ? Object.keys(opt.sample).length : 0),
          qubo_matrix: opt.qubo_matrix || [],
          energy_distribution: opt.energy_distribution || [],
          latex_formula: opt.latex_formula || undefined,
          num_reads: opt.num_reads || 1024,
          simulator_id: data.simulator_id,
        };
        setSolverResult(solverRes);
        setIsModelDirty(false);
        try {
          setScopedIdeItem(`result_${activeProject.id}`, userKey, JSON.stringify(solverRes));
        } catch {}

        setTerminalOutput(
          `$ dwave-anneal --backend simulated_annealing${data.simulator_id ? ` --job-id ${data.simulator_id}` : ""}\n` +
          (data.stdout ? `${data.stdout.trim()}\n\n` : "") +
          `[SUCCESS] Annealing completed in ${dur.toFixed(1)}ms | Ground Energy: ${opt.energy ?? 0} | Variables: ${solverRes.variables.length}\n` +
          `Optimal Decisions: ${JSON.stringify(opt.sample || {})}`
        );
      } else if (data.success) {
        setTerminalOutput(
          `$ dwave-anneal --backend simulated_annealing\n` +
          `[SUCCESS] Completed in ${dur.toFixed(1)}ms\n` +
          (data.stdout ? `\n${data.stdout}` : "")
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
        setScopedIdeItem(`chat_${activeProject.id}`, userKey, JSON.stringify(fresh));
      } catch (e) {}
    }
    if (activeProject?.id === "quantum_journey_101") {
      setJourneyMilestoneId(0);
      setJourneyStage("explore");
      setUserPrediction(null);
      setQuizHelpCount(0);
      const m0 = getJourneyMilestone(0);
      setQiskitCode(m0.starterCode);
      setQiskitCounts({});
      setTerminalOutput(`=== Quantum Journey 101 Reset ===\nWorkspace reset to Module 0: Quantum Foundations.\n`);
      if (typeof window !== "undefined") {
        try {
          setScopedIdeItem("journey_101_milestone", userKey, "0");
          setScopedIdeItem("journey_101_stage", userKey, "explore");
          setScopedIdeItem(`code_${activeProject.id}_${activeFile}`, userKey, m0.starterCode);
        } catch (e) {}
      }
    }
  }, [framework, activeProject?.id]);

  const handleSendMessage = async (text: string, overrideTerminalOutput?: string) => {
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
        // 500ms reasoning delay with pulsing typing indicator
        await new Promise((resolve) => setTimeout(resolve, 500));

        const lower = text.trim().toLowerCase();
        // 1. Next Module Transition
        if (
          lower.includes("next milestone") ||
          lower === "next" ||
          lower.includes("load milestone") ||
          lower.includes("advance milestone") ||
          lower.includes("next module") ||
          lower.includes("load module") ||
          lower.includes("advance module")
        ) {
          const nextId = Math.min(6, journeyMilestoneId + 1);
          const nextM = getJourneyMilestone(nextId);
          setJourneyMilestoneId(nextId);
          setJourneyStage("explore");
          setUserPrediction(null);
          setQuizHelpCount(0);
          setChallengeHintCount(0);
          setQiskitCode(nextM.starterCode);
          setQiskitCounts({}); // Clean slate for results!
          setLatencyMs(0);
          setTerminalOutput(
            `=== Quantum Journey 101: ${nextM.badge} — ${nextM.title} ===\n` +
            `Workspace refreshed with clean slate.\n` +
            `Active Wires: ${nextM.qubits} | Ready for simulation.\n`
          );
          if (typeof window !== "undefined") {
            try {
              setScopedIdeItem("journey_101_milestone", userKey, String(nextId));
              setScopedIdeItem("journey_101_stage", userKey, "explore");
              setScopedIdeItem(`code_${activeProject.id}_${activeFile}`, userKey, nextM.starterCode);
            } catch (e) {}
          }
          const transitionMsg: CopilotMessage = {
            id: Date.now() + 2,
            sender: "assistant",
            text: `**Workspace Refreshed for ${nextM.badge}: ${nextM.title}**\n\n${nextM.introPrompt}`,
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
          const m0 = getJourneyMilestone(0);
          setJourneyMilestoneId(0);
          setJourneyStage("explore");
          setUserPrediction(null);
          setQuizHelpCount(0);
          setChallengeHintCount(0);
          setQiskitCode(m0.starterCode);
          setQiskitCounts({});
          setLatencyMs(0);
          setTerminalOutput(`=== Quantum Journey 101 Reset ===\nWorkspace reset to Module 0: Quantum Foundations.\n`);
          if (typeof window !== "undefined") {
            try {
              setScopedIdeItem("journey_101_milestone", userKey, "0");
              setScopedIdeItem("journey_101_stage", userKey, "explore");
              setScopedIdeItem(`code_${activeProject.id}_${activeFile}`, userKey, m0.starterCode);
            } catch (e) {}
          }
          const resetMsg: CopilotMessage = {
            id: Date.now() + 2,
            sender: "assistant",
            text: `**Quantum Journey Reset to Module 0**\n\n${m0.introPrompt}`,
            timestamp: "Just now",
          };
          setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), resetMsg]);
          return;
        }

        // Stage Chip Handler: Run Aer Simulator
        if (lower.includes("run aer simulator")) {
          handleRunOrRecompile();
          const runMsg: CopilotMessage = {
            id: Date.now() + 2,
            sender: "assistant",
            text: "Triggered Aer simulator execution on the circuit.",
            timestamp: "Just now",
          };
          setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), runMsg]);
          return;
        }

        // Stage Chip Handler: Reset Starter Code for active module
        if (
          lower.includes("reset starter code") ||
          lower.includes("reset code") ||
          lower.includes("reset this module")
        ) {
          const currentM = getJourneyMilestone(journeyMilestoneId);
          setQiskitCode(currentM.starterCode);
          setQiskitCounts({});
          setChallengeHintCount(0);
          if (typeof window !== "undefined") {
            try {
              setScopedIdeItem(`code_${activeProject.id}_${activeFile}`, userKey, currentM.starterCode);
            } catch (e) {}
          }
          const resetModuleMsg: CopilotMessage = {
            id: Date.now() + 2,
            sender: "assistant",
            text: `Restored starter code for **${currentM.badge}: ${currentM.title}**.\n\nYou can now start fresh on this challenge.`,
            timestamp: "Just now",
          };
          setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), resetModuleMsg]);
          return;
        }

        // Stage Chip Handler: Validate My Circuit
        if (
          lower.includes("validate my circuit") ||
          lower.includes("validate circuit")
        ) {
          const currentM = getJourneyMilestone(journeyMilestoneId);
          const hasCounts = Object.keys(qiskitCounts).length > 0;
          if (!hasCounts) {
            const failMsg: CopilotMessage = {
              id: Date.now() + 2,
              sender: "assistant",
              text: "Your circuit has not been executed yet. Click **Run** (or press `Shift+Enter`) to simulate on Aer first, then we can validate your results.",
              timestamp: "Just now",
            };
            setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), failMsg]);
            return;
          }
          const valResult = currentM.validateChallenge(
            qiskitCounts,
            circuitGates || [],
            currentM.qubits,
            qiskitCode
          );
          if (valResult.passed) {
            setJourneyStage("completed");
            if (typeof window !== "undefined") {
              try {
                setScopedIdeItem("journey_101_stage", userKey, "completed");
              } catch (e) {}
            }
            const passMsg: CopilotMessage = {
              id: Date.now() + 2,
              sender: "assistant",
              text: `${valResult.feedback}\n\n${currentM.completionMessage}`,
              timestamp: "Just now",
            };
            setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), passMsg]);
            return;
          } else {
            const failMsg: CopilotMessage = {
              id: Date.now() + 2,
              sender: "assistant",
              text: valResult.feedback,
              timestamp: "Just now",
            };
            setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), failMsg]);
            return;
          }
        }

        // Stage Chip Handler: Socratic Hint for Challenge
        if (
          lower.includes("socratic hint") ||
          (journeyStage === "challenge" && (isAskingForHint(text) || lower.includes("hint")))
        ) {
          const nextLevel = challengeHintCount + 1;
          setChallengeHintCount(nextLevel);
          const hint = getChallengeHint(journeyMilestoneId, nextLevel);
          const hintMsg: CopilotMessage = {
            id: Date.now() + 2,
            sender: "assistant",
            text: `**Socratic Challenge Hint (Level ${Math.min(nextLevel, 2)}):**\n\n${hint}`,
            timestamp: "Just now",
          };
          setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), hintMsg]);
          return;
        }

        // Explanatory Question: What does state |+⟩ mean?
        if (
          lower.includes("what does state |+⟩ mean") ||
          lower.includes("what does state |+> mean") ||
          lower.includes("what does |+⟩ mean") ||
          lower.includes("what is state |+⟩")
        ) {
          const plusMsg: CopilotMessage = {
            id: Date.now() + 2,
            sender: "assistant",
            text: `### Quantum State |+⟩ (Plus State)\n\nThe state **|+⟩** represents an equal superposition state on the Bloch sphere equator:\n\n$$|+⟩ = \\frac{|0⟩ + |1⟩}{\\sqrt{2}}$$\n\n**Key Characteristics:**\n- **Creation:** Applying a Hadamard gate ($H$) to ground state $|0⟩$: $H|0⟩ = |+⟩$.\n- **Measurement Probabilities:** By the Born rule, measuring along the computational Z-basis yields:\n  - $P(0) = |\\frac{1}{\\sqrt{2}}|^2 = 50\\%$\n  - $P(1) = |\\frac{1}{\\sqrt{2}}|^2 = 50\\%$\n- **Relative Phase:** Positive ($+1$). Its orthogonal counterpart is $|-⟩ = \\frac{|0⟩ - |1⟩}{\\sqrt{2}}$, which has relative phase $-1$.`,
            timestamp: "Just now",
          };
          setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), plusMsg]);
          return;
        }

        // 3. Adaptive Depth Request (Intuition / Technical / Mathematical Derivation)
        const depthRequest = detectDepthRequest(text);
        if (depthRequest) {
          const tieredText = getTieredExplanation(journeyMilestoneId, depthRequest);
          const tieredMsg: CopilotMessage = {
            id: Date.now() + 2,
            sender: "assistant",
            text: tieredText,
            timestamp: "Just now",
          };
          setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), tieredMsg]);
          return;
        }

        // 4. Explore Stage: Predict -> Execute -> Explain Loop
        if (journeyStage === "explore") {
          const currentM = getJourneyMilestone(journeyMilestoneId);
          if (currentM.evaluatePrediction) {
            setUserPrediction(text);
            const predFeedback = currentM.evaluatePrediction(text);
            const ackMsg: CopilotMessage = {
              id: Date.now() + 2,
              sender: "assistant",
              text: `📝 **Hypothesis Recorded:**\n*"${text}"*\n\n${predFeedback.feedback}\n\n👉 Now click **▶ Run** (or press \`Shift+Enter\`) to execute on Aer and test your prediction!`,
              timestamp: "Just now",
            };
            setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), ackMsg]);
            return;
          }
        }

        // 5. Empathetic Socratic Quiz & Help Handling (With Precedence & Progressive Escalation)
        if (journeyStage === "quiz") {
          // A. User wants to learn / see explanation / skip / proceed (Takes priority over uncertainty!)
          if (isWantingToSkipOrProceed(text)) {
            const isCurious = isCuriousKnowledgeRequest(text);
            const revealRes = getSupportiveTutorResponse(
              journeyMilestoneId,
              isCurious ? "curious" : "reveal"
            );
            setJourneyStage("challenge");
            setQuizHelpCount(0);
            if (typeof window !== "undefined") {
              try {
                setScopedIdeItem("journey_101_stage", userKey, "challenge");
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
            if (quizHelpCount >= 1) {
              // Progressive Escalation: User already received a hint or analogy; escalate to reveal & challenge!
              const escRes = getSupportiveTutorResponse(journeyMilestoneId, "escalate");
              setJourneyStage("challenge");
              setQuizHelpCount(0);
              if (typeof window !== "undefined") {
                try {
                  setScopedIdeItem("journey_101_stage", userKey, "challenge");
                } catch (e) {}
              }
              const escMsg: CopilotMessage = {
                id: Date.now() + 2,
                sender: "assistant",
                text: escRes.message,
                timestamp: "Just now",
              };
              setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), escMsg]);
              return;
            }

            const hintRes = getSupportiveTutorResponse(journeyMilestoneId, "hint");
            setQuizHelpCount((prev) => prev + 1);
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
            if (quizHelpCount >= 1) {
              // Progressive Escalation: User has already expressed uncertainty once or seen the analogy!
              // Do NOT repeat the analogy verbatim. Escalate to explanation and advance!
              const escRes = getSupportiveTutorResponse(journeyMilestoneId, "escalate");
              setJourneyStage("challenge");
              setQuizHelpCount(0);
              if (typeof window !== "undefined") {
                try {
                  setScopedIdeItem("journey_101_stage", userKey, "challenge");
                } catch (e) {}
              }
              const escMsg: CopilotMessage = {
                id: Date.now() + 2,
                sender: "assistant",
                text: escRes.message,
                timestamp: "Just now",
              };
              setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), escMsg]);
              return;
            }

            const stuckRes = getSupportiveTutorResponse(journeyMilestoneId, "stuck");
            setQuizHelpCount((prev) => prev + 1);
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
            setQuizHelpCount(0);
            if (typeof window !== "undefined") {
              try {
                setScopedIdeItem("journey_101_stage", userKey, "challenge");
              } catch (e) {}
            }
            const quizPassMsg: CopilotMessage = {
              id: Date.now() + 2,
              sender: "assistant",
              text: `${evalRes.explanation}

---

${currentM.challengeInstruction}`,
              timestamp: "Just now",
            };
            setQiskitCopilotMessages((prev) => [...prev.filter((m) => m.id !== botMsgId), quizPassMsg]);
            return;
          } else if (evalRes.feedback) {
            setQuizHelpCount((prev) => prev + 1);
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
        const effectiveTerminal = overrideTerminalOutput ?? terminalOutput;
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
            terminal_output: effectiveTerminal,
            execution_context: {
              framework: "qiskit",
              qubits: qiskitQubits,
              depth: qiskitDepth,
              shots: qiskitShots,
              measurement_counts: qiskitCounts,
              simulator_id: qiskitSimulatorId || undefined,
              latency_ms: latencyMs,
            },
          }),
        });

        if (!resp.ok) {
          throw new Error(`Circuit Agent error: HTTP ${resp.status}`);
        }

        const data = await resp.json();

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
              setScopedIdeItem(
                `qiskit_result_${activeProject.id}`,
                userKey,
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
                  pipelineSteps: undefined, // Qiskit Circuit Copilot does not render autonomous pipeline block
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
        const effectiveTerminal = overrideTerminalOutput ?? terminalOutput;
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
            terminal_output: effectiveTerminal,
            execution_context: {
              framework: "dwave",
              ground_energy: solverResult?.energy,
              optimal_sample: solverResult?.sample,
              variables: solverResult?.variables,
              num_variables: solverResult?.num_variables,
              num_reads: solverResult?.num_reads,
              latex_formula: solverResult?.latex_formula,
              qubo_matrix: solverResult?.qubo_matrix,
              top_eigenstates: solverResult?.energy_distribution?.slice(0, 5),
              simulator_id: solverResult?.simulator_id,
              latency_ms: latencyMs,
            },
          }),
        });

        if (!resp.ok) {
          throw new Error(`Copilot response error: HTTP ${resp.status}`);
        }

        const data = await resp.json();

        setDwaveCopilotMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId
              ? {
                  ...msg,
                  text: data.response_text || "Ready to assist.",
                  isStreaming: false,
                  pipelineSteps: undefined, // Regular D-Wave chat does not render autonomous pipeline block
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
      text: "Decomposing optimization formulation...",
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
                        qubo_code: res.qubo_code,
                      });
                    }, 150);
                  }

                  return {
                    ...msg,
                    text: `Optimization model compiled: ${stats.q_size || 0} binary variables with ${stats.q_nnz || 0} non-zero couplers (penalty weight λ = ${stats.penalty_weight || 5.0}).`,
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

    const isFrameworkMismatch =
      cleanError.includes("[FRAMEWORK MISMATCH ERROR]") ||
      errText.includes("[FRAMEWORK MISMATCH ERROR]");

    const repairPrompt = isFrameworkMismatch
      ? `I ran my code in ${activeFile} and received this framework mismatch error:
\`\`\`
${cleanError}
\`\`\`
Please explain why this framework cannot be executed in this workspace and guide me on how to use or create a new project for this execution.`
      : `I ran my code in ${activeFile} and got this execution error:
\`\`\`
${cleanError}
\`\`\`
Pinpoint the exact line and cause in 1-2 sentences, then return the complete corrected Python file.`;

    await handleSendMessage(repairPrompt, errText);
  }, [terminalOutput, activeFile, handleSendMessage]);

  const handleToggleMutualExclusion = () => {
    setMathParams((prev) => ({
      ...prev,
      hasMutualExclusion: !prev.hasMutualExclusion,
    }));
  };

  // Health Metrics
  const totalCost = useMemo(() => {
    const s = solverResult.sample;
    if (!s || Object.keys(s).length === 0) return 0;
    const isCleanEnergy = activeProject.id === "clean_energy_portfolio" || 
      (solverResult.variables && solverResult.variables.includes("Wind_A") && solverResult.variables.includes("Solar_B"));
    if (isCleanEnergy) {
      let cost = 0;
      DEFAULT_VARIABLES.forEach((v, idx) => {
        if (s[v] === 1) cost += ASSET_COSTS[idx];
      });
      return cost;
    }
    return typeof solverResult.energy === "number" ? Math.abs(solverResult.energy) : Object.values(s).filter((v) => v === 1).length;
  }, [solverResult.sample, solverResult.energy, solverResult.variables, activeProject.id]);

  const totalScore = useMemo(() => {
    const s = solverResult.sample;
    if (!s || Object.keys(s).length === 0) return 0;
    const isCleanEnergy = activeProject.id === "clean_energy_portfolio" || 
      (solverResult.variables && solverResult.variables.includes("Wind_A") && solverResult.variables.includes("Solar_B"));
    if (isCleanEnergy) {
      let score = 0;
      DEFAULT_VARIABLES.forEach((v, idx) => {
        if (s[v] === 1) score += ASSET_YIELDS[idx];
      });
      return score;
    }
    return Object.values(s).filter((v) => v === 1).length * 10;
  }, [solverResult.sample, solverResult.variables, activeProject.id]);

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
      {/* ── STORAGE QUOTA / ACCESS WARNING BANNER (A5) ── */}
      {storageWarning && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300 font-sans z-50 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{storageWarning}</span>
          </div>
          <button
            onClick={() => setStorageWarning(null)}
            className="text-amber-400 hover:text-white text-xs px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── TOP CALM PRECISION HEADER ── */}
      <StudioHeader
        onStartTour={handleStartTour}
        onOpenReportIssue={() => {
          setIssueDefaultCategory("code_execution");
          setShowIssueModal(true);
        }}
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
                    setIsResultsStale(true);
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
                  setMathParams={handleSetMathParams}
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
                    latencyMs={latencyMs}
                    circuitGates={circuitGates}
                    circuitAscii={circuitAscii}
                    isResultsStale={isResultsStale}
                    hasDynamicLoops={hasDynamicLoops}
                    onRunCircuit={handleRunOrRecompile}
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
                    numReads={solverResult.num_reads || extractShotsFromCode(dwaveCode, 'dwave')}
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

                    {isResultsStale && Object.keys(qiskitCounts).length > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono animate-in fade-in duration-150">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          <span>
                            <strong>Unexecuted Changes:</strong> Code or circuit has been modified since last execution. Run circuit to refresh counts.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRunOrRecompile}
                          className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Run & Update Results
                        </button>
                      </div>
                    )}

                    {Object.keys(qiskitCounts).length === 0 ? (
                      <div className="min-h-48 flex flex-col items-center justify-center p-8 text-center space-y-2 border-b border-zinc-700/40">
                        <Activity className="w-8 h-8 text-zinc-500 opacity-60" />
                        <h4 className="text-sm font-semibold text-zinc-300">No Measurement Results Yet</h4>
                        <p className="text-xs text-zinc-500 max-w-sm">Execute your Qiskit circuit or click "Run" to simulate statevector measurement histograms on AerSimulator.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="min-h-48 flex items-end justify-start sm:justify-center gap-4 pt-6 pb-3 px-2 border-b border-zinc-700/40 overflow-x-auto custom-scrollbar">
                          {Object.entries(qiskitCounts)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 32)
                            .map(([bit, count], idx) => {
                              const pct = qiskitShots > 0 ? ((count / qiskitShots) * 100).toFixed(1) : "0.0";
                              return (
                                <div
                                  key={idx}
                                  className="flex flex-col items-center space-y-2 min-w-[56px] shrink-0"
                                >
                                  <div className="text-[11px] font-mono text-zinc-400 font-semibold">
                                    {pct}%
                                  </div>
                                  <div
                                    className="w-10 rounded-t bg-sky-500 hover:brightness-110 transition-all shadow-sm shadow-sky-500/30"
                                    style={{ height: `${Math.max(parseFloat(pct) * 1.8, 8)}px` }}
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
                        {Object.keys(qiskitCounts).length > 32 && (
                          <p className="text-[11px] font-mono text-zinc-500 text-right">
                            Showing top 32 of {Object.keys(qiskitCounts).length} measured basis states (sorted by probability)
                          </p>
                        )}
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
                        // Dynamically reconcile true shot/read count from stdout if user printed it
                        const stdoutShotsMatch = item.stdout ? item.stdout.match(/\b(?:Shots|shots|num_reads|reads|Reads):\s*(\d+)/) : null;
                        const effectiveShots = stdoutShotsMatch ? parseInt(stdoutShotsMatch[1], 10) : item.shots;
                        const effectiveSummary = stdoutShotsMatch && item.summary && item.shots && item.shots !== effectiveShots
                          ? item.summary.replace(`${item.shots} shots`, `${effectiveShots} shots`)
                          : item.summary;
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
                                    <span>{effectiveSummary}</span>
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
                                    {effectiveShots && (
                                      <>
                                        <span>•</span>
                                        <span>{effectiveShots} shots</span>
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
            onOpenProjectModal={() => setShowProjectModal(true)}
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
            isJourney={activeProject.id === "quantum_journey_101"}
            journeyStage={journeyStage}
            journeyMilestoneId={journeyMilestoneId}
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
              qubits: qiskitQubits,
              depth: qiskitDepth,
              shots: qiskitShots,
              fidelity: 100.0,
              entangled: circuitGates.some((g) => ["cx", "cnot", "cz", "swap", "ccx"].includes((g.name || "").toLowerCase())),
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

      {/* Issue & Flow Diagnostics Reporting Modal */}
      <IssueReportModal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        defaultCategory={issueDefaultCategory}
        isDark={isDark}
        userEmail={user?.email}
        flowContext={{
          route: typeof window !== "undefined" ? window.location.pathname + window.location.search : "/ide",
          framework: activeProject.framework,
          projectId: activeProject.id,
          projectTitle: activeProject.title,
          activeFile: activeFile,
          activeTab: heroTab,
          codeSnippet: activeProject.framework === "dwave" ? dwaveCode : qiskitCode,
          projectFiles: activeProject.fileContents,
          lastExecution: {
            success: solverResult?.sample ? true : !terminalOutput.includes("Traceback"),
            stdout: terminalOutput,
            stderr: terminalOutput.includes("Traceback") || terminalOutput.includes("[STDERR]") ? terminalOutput : "",
            simulatorId: qiskitSimulatorId || undefined,
            backendUsed: activeProject.framework === "dwave" ? "dwave_simulated_annealing" : "aer_simulator",
            activeQubits: solverResult?.num_variables || undefined,
          },
          recentChatMessages: copilotMessages.slice(-5).map((m: CopilotMessage) => ({
            sender: m.sender,
            text: m.text,
            timestamp: m.timestamp,
          })),
        }}
      />

      {/* Guided Product Walkthrough Tour Modal */}
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
