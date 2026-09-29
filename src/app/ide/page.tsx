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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  StudioHeader,
  ProjectExplorer,
  StudioCodeEditor,
  CircuitCanvasView,
  ProjectSwitcherModal,
  NewProjectModal,
  ProjectItem,
  FrameworkType,
  HeroTabType,
} from "@/components/ide";
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

const INITIAL_PROJECTS: ProjectItem[] = [
  {
    id: "clean_energy_portfolio",
    title: "Clean Energy Portfolio",
    desc: "4-asset capital budgeting with mutual exclusions and grid stability dependencies.",
    framework: "dwave",
    updated: "2 mins ago",
    files: ["main.py", "qubo_matrix.py", "deployment.json", "input.sample.json"],
    activeFile: "main.py",
  },
  {
    id: "quantum_teleportation",
    title: "Quantum Teleportation",
    desc: "3-qubit entangled Bell channel with Bob classical feed-forward corrections.",
    framework: "qiskit",
    updated: "1 hour ago",
    files: ["teleportation.py", "circuit.qasm", "deployment.json"],
    activeFile: "teleportation.py",
  },
  {
    id: "maxcut_bipartite_graph",
    title: "Max-Cut 12-Node Partition",
    desc: "Unconstrained binary quadratic model for bipartite graph cut maximization.",
    framework: "dwave",
    updated: "Yesterday",
    files: ["maxcut.py", "graph_edges.json", "deployment.json"],
    activeFile: "maxcut.py",
  },
  {
    id: "vqe_h2_molecule",
    title: "VQE H2 Ground Energy",
    desc: "Variational Quantum Eigensolver for molecular hydrogen ground state energy curve.",
    framework: "qiskit",
    updated: "3 days ago",
    files: ["vqe_h2.py", "ansatz.py", "deployment.json"],
    activeFile: "vqe_h2.py",
  },
];

const DEFAULT_VARIABLES = ["Wind_A", "Solar_B", "Battery_C", "Hydro_D"];
const ASSET_COSTS = [9.0, 7.0, 6.0, 8.0];
const ASSET_YIELDS = [12.5, 9.0, 8.0, 10.5];

const DWAVE_INITIAL_CODE = `# Quantum Guru — Clean Energy Portfolio Selection (QUBO)
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

const QISKIT_INITIAL_MESSAGES: CopilotMessage[] = [
  {
    id: 1,
    sender: "assistant",
    text: "Qiskit Quantum Studio initialized. I am your quantum circuit & algorithm copilot. Ask me to verify Bell state entanglement, calculate circuit depth, synthesize unitary gates, or configure Aer noise models.",
    timestamp: "Just now",
  },
];

export default function QuantumGuruStudioPage() {
  const [codeSnapshots, setCodeSnapshots] = useState<string[]>([]);
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
  const [projects, setProjects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
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
              framework: (doc.templateKey === "qiskit" ? "qiskit" : "dwave") as FrameworkType,
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

  const [activeProject, setActiveProject] = useState<ProjectItem>(INITIAL_PROJECTS[0]);
  const framework = activeProject.framework;

  const [heroTab, setHeroTab] = useState<HeroTabType>("code");
  const [activeFile, setActiveFile] = useState<string>(activeProject.activeFile);

  const [dwaveCode, setDwaveCode] = useState<string>(DWAVE_INITIAL_CODE);
  const [qiskitCode, setQiskitCode] = useState<string>(QISKIT_INITIAL_CODE);

  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false);

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

  const [solverResult, setSolverResult] = useState<OptimizationResults>({
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
  });

  const [qiskitCounts, setQiskitCounts] = useState<Record<string, number>>({
    "1": 1024,
  });
  const [qiskitQubits, setQiskitQubits] = useState<number>(1);
  const [qiskitDepth, setQiskitDepth] = useState<number>(2);
  const [qiskitShots, setQiskitShots] = useState<number>(1024);
  const [circuitGates, setCircuitGates] = useState<any[]>([
    { name: "x", qubit: 0, qubits: [0], step: 0, role: "single" },
    { name: "measure", qubit: 0, qubits: [0], step: 1, role: "single" }
  ]);
  const [circuitAscii, setCircuitAscii] = useState<string>("     ┌───┐┌─┐\n  q: ┤ X ├┤M├\n     └───┘└╥┘\nc: 1/══════╩═\n           0 ");

  const [dwaveCopilotMessages, setDwaveCopilotMessages] = useState<CopilotMessage[]>(DWAVE_INITIAL_MESSAGES);
  const [qiskitCopilotMessages, setQiskitCopilotMessages] = useState<CopilotMessage[]>(QISKIT_INITIAL_MESSAGES);
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

  // Restore active project and file on refresh from URL or localStorage
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
          } else {
            setHeroTab("code");
          }
        }
      }
    } catch (e) {
      console.warn("Failed to restore active project from storage:", e);
    }
  }, [projects]);

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
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("quantum_ide_active_file", file);
      } catch (e) {}
    }
  };

  // Framework Switch Handler
  const handleSelectProject = (proj: ProjectItem) => {
    setActiveProject(proj);
    const targetFile = proj.activeFile || proj.files?.[0] || "main.py";
    setActiveFile(targetFile);
    const targetTab: HeroTabType = "code";
    setHeroTab(targetTab);

    // If project has saved file contents from MongoDB Atlas, populate editor
    if (proj.fileContents && proj.fileContents[targetFile]) {
      if (proj.framework === "dwave") {
        setDwaveCode(proj.fileContents[targetFile]);
      } else {
        setQiskitCode(proj.fileContents[targetFile]);
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

  const handleCreateProject = async (newProj: ProjectItem) => {
    const initialCode = newProj.framework === "dwave" ? DWAVE_INITIAL_CODE : QISKIT_INITIAL_CODE;
    const targetFile = newProj.activeFile || newProj.files?.[0] || "main.py";

    const customProj: ProjectItem = {
      ...newProj,
      isCustom: true,
      cloudSynced: false,
      fileContents: { [targetFile]: initialCode },
    };

    setProjects((prev) => [customProj, ...prev]);
    setActiveProject(customProj);
    setActiveFile(targetFile);
    setHeroTab("code");

    if (customProj.framework === "dwave") {
      setDwaveCode(initialCode);
    } else {
      setQiskitCode(initialCode);
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("quantum_ide_active_project_id", customProj.id);
        localStorage.setItem("quantum_ide_active_file", targetFile);
        localStorage.setItem("quantum_ide_hero_tab", "code");
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
            setSolverResult({
              energy: opt.energy,
              sample: opt.sample,
              num_variables: opt.num_variables || Object.keys(opt.sample).length,
              variables: opt.variables || Object.keys(opt.sample),
              qubo_matrix: opt.qubo_matrix || currentMatrix,
              energy_distribution: opt.energy_distribution || [],
            });

            const chosen = Object.entries(opt.sample)
              .filter(([_, v]) => v === 1)
              .map(([k]) => k)
              .join(", ");

            setTerminalOutput(
              `$ dwave-anneal --backend simulated_annealing\n` +
                `[SUCCESS] Annealing simulation completed in ${dur.toFixed(1)}ms\n` +
                `⚡ Ground State Energy: ${opt.energy.toFixed(4)}\n` +
                `⚡ Optimal Active Variables: [${chosen || "None"}]\n` +
                `⚡ Sampled Eigenstates: ${opt.energy_distribution?.length || 0}\n` +
                (data.stdout ? `\n--- Standard Output ---\n${data.stdout}` : "")
            );
          } else {
            setTerminalOutput(
              `$ dwave-anneal --backend simulated_annealing\n` +
                `[SUCCESS] Completed in ${dur.toFixed(1)}ms\n` +
                (data.stdout ? `\n${data.stdout}` : "")
            );
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

          setTerminalOutput(
            `$ qiskit-aer --backend aer_simulator --shots ${execShots}\n` +
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
        setTerminalOutput(`[ERROR] Aer simulator gateway offline: ${err.message}`);
      } finally {
        setIsRunningOrRecompiling(false);
      }
    }
  }, [framework, currentMatrix, mathParams, qiskitCode]);

  const handleSendMessage = (text: string) => {
    const userMsg: CopilotMessage = {
      id: Date.now(),
      sender: "user",
      text,
      timestamp: "Just now",
    };
    if (framework === "dwave") {
      setDwaveCopilotMessages((prev) => [...prev, userMsg]);
    } else {
      setQiskitCopilotMessages((prev) => [...prev, userMsg]);
    }

    setTimeout(() => {
      let replyText = "";
      let formula: string | undefined = undefined;
      const lower = text.toLowerCase();

      if (framework === "qiskit") {
        if (lower.includes("bob") || lower.includes("correct") || lower.includes("pauli")) {
          replyText =
            "Bob applies conditional recovery corrections based on Alice's classical measurement results (c0, c1): if c1=1, apply Pauli-X; if c0=1, apply Pauli-Z. This maps the collapsed Bell projection back to the original state |ψ⟩ = α|0⟩ + β|1⟩.";
          formula = "U_{\\text{Bob}}(c_0, c_1) = X^{c_1} Z^{c_0}";
        } else if (lower.includes("noise") || lower.includes("depolar") || lower.includes("qpu")) {
          replyText =
            "Depolarizing channel added with error rate p = 0.01. Each two-qubit CNOT gate experiences decoherence, reducing the Bell pair fidelity from 100% to ~98.4%.";
          formula = "\\mathcal{E}(\\rho) = (1 - p)\\rho + \\frac{p}{3}\\sum_{i=1}^3 \\sigma_i \\rho \\sigma_i";
        } else if (lower.includes("transpile") || lower.includes("basis") || lower.includes("depth")) {
          replyText =
            "Transpiled to native superconducting basis gates: {cx, id, rz, sx, x}. Optimization level 3 reduced overall circuit depth from 12 to 8 gates.";
          formula = "U_3(\\theta, \\phi, \\lambda) = R_z(\\phi + \\pi) R_x(\\pi/2) R_z(\\theta + \\pi) R_x(\\pi/2) R_z(\\lambda)";
        } else if (lower.includes("entangle") || lower.includes("bell")) {
          replyText =
            "EPR Bell channel created between qubits 1 and 2 via H(q1) followed by CNOT(q1, q2). State is maximally entangled with concurrence C = 1.0.";
          formula = "|\\Phi^+\\rangle = \\frac{|00\\rangle + |11\\rangle}{\\sqrt{2}}";
        } else {
          replyText =
            `Analyzing Qiskit circuit topology for "${activeProject.title}": 3 qubits, 3 classical registers, 8 quantum gates. All gates are unitary and reversible.`;
          formula = "U^\\dagger U = \\mathbb{I}";
        }
      } else {
        if (lower.includes("mutual") || lower.includes("exclusion")) {
          replyText =
            "Injected mutual exclusion penalty between Wind_A and Solar_B (\\lambda_{\\text{ex}} = +8.0). This adds a large energy barrier preventing concurrent construction.";
          formula = "\\mathcal{H}_{\\text{ME}} = 8.0 \\cdot x_{\\text{wind}} \\cdot x_{\\text{solar}}";
        } else if (lower.includes("carbon") || lower.includes("emission")) {
          replyText =
            "Enforced carbon emissions ceiling constraint \\sum E_i x_i \\le E_{\\text{max}}. Diagonal couplers for fossil or high-emission sites elevated.";
          formula = "\\mathcal{H}_{\\text{carbon}} = \\mu \\left( \\sum_{i} E_i x_i - E_{\\text{max}} \\right)^2";
        } else if (lower.includes("lambda") || lower.includes("multiplier")) {
          replyText =
            "Lagrange multiplier stiffness \\lambda = 3.5 satisfies the ground-state feasibility condition \\lambda > \\max \\| \\Delta \\mathcal{H}_{\\text{obj}} \\|.";
          formula = "\\lambda > \\frac{\\max(\\text{yield})}{\\min(\\text{cost})} \\approx 2.85 \\implies \\lambda = 3.5 \\text{ is optimal}";
        } else {
          replyText = `Analyzing your request for DWAVE QUBO in Section ${selectedMathSection || "01"}...`;
        }
      }

      const botMsg: CopilotMessage = {
        id: Date.now() + 1,
        sender: "assistant",
        text: replyText,
        mathFormula: formula,
        timestamp: "Just now",
      };
      if (framework === "dwave") {
        setDwaveCopilotMessages((prev) => [...prev, botMsg]);
      } else {
        setQiskitCopilotMessages((prev) => [...prev, botMsg]);
      }
    }, 400);
  };

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

  return (
    <div
      className={`h-screen w-screen flex flex-col font-sans select-none overflow-hidden transition-colors ${
        isDark ? "bg-[#090A0D] text-slate-100" : "bg-[#F1F5F9] text-[#172033]"
      }`}
    >
      {/* ── TOP CALM PRECISION HEADER ── */}
      <StudioHeader
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        activeProject={activeProject}
        onOpenProjectModal={() => setShowProjectModal(true)}
        onOpenNewProjectModal={() => setShowNewProjectModal(true)}
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
            className={`flex-1 overflow-y-auto ${
              isDark ? "bg-[#090A0D]" : "bg-[#FAFBFC]"
            }`}
          >
            {/* 1. CODE TAB */}
            {heroTab === "code" && (
              <StudioCodeEditor
                isDark={isDark}
                onToggleTheme={handleToggleTheme}
                code={framework === "dwave" ? dwaveCode : qiskitCode}
                onChange={framework === "dwave" ? setDwaveCode : setQiskitCode}
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
                    : {
                        cost: totalCost,
                        maxCost: mathParams.budgetMax,
                        score: totalScore,
                        energy: solverResult.energy,
                        feasible: totalCost <= mathParams.budgetMax,
                      }
                }
              />
            )}

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
                />
              </div>
            )}

            {/* 3. VISUAL TAB (Q-Matrix or Circuit) */}
            {heroTab === "visual" && (
              <div className="p-6">
                {framework === "dwave" ? (
                  <div className="max-w-4xl mx-auto space-y-4">
                    <QMatrixHeatmap
                      isDark={isDark}
                      colors={colors}
                      matrix={currentMatrix}
                      variables={DEFAULT_VARIABLES}
                      hasMutualExclusion={mathParams.hasMutualExclusion}
                    />
                  </div>
                ) : (
                  <CircuitCanvasView
                    isDark={isDark}
                    qubitCount={qiskitQubits}
                    circuitDepth={qiskitDepth}
                    circuitGates={circuitGates}
                    circuitAscii={circuitAscii}
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
                    numReads={300}
                    latencyMs={latencyMs}
                    variables={DEFAULT_VARIABLES}
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
                          Simulated distribution over {qiskitShots} shots
                        </p>
                      </div>
                      <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded border border-sky-500/20 font-medium">
                        Total Shots: {qiskitShots}
                      </span>
                    </div>

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
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quantum Copilot */}
        <aside
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
            onApplyMutualExclusion={handleToggleMutualExclusion}
            onApplyCircuitAction={handleRunOrRecompile}
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

      {/* Project Switcher Modal */}
      <ProjectSwitcherModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onOpenNewProject={() => setShowNewProjectModal(true)}
        onDeleteProject={handleDeleteProject}
        isDark={isDark}
      />

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onCreateProject={handleCreateProject}
        isDark={isDark}
      />
    </div>
  );
}
