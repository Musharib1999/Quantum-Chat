"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Share2,
  Check,
  Sparkles,
  Cpu,
  Layers,
  ArrowRight,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface ShowcaseStep {
  id: number;
  stepNum: string;
  badge: string;
  title: string;
  headline: string;
  description: string;
  keyTakeaway: string;
  image: string;
  metrics: { label: string; value: string; color?: string }[];
  hotspot?: { x: string; y: string; title: string; detail: string };
}

const QISKIT_STEPS: ShowcaseStep[] = [
  {
    id: 1,
    stepNum: "01",
    badge: "Public Ingress",
    title: "Quantum Development Cloud",
    headline: "Unified Platform for Quantum Circuits & Decision Intelligence",
    description:
      "Prospective developers and researchers arrive at Quantum Guru's high-contrast, distraction-free environment designed to make quantum programming intuitive, responsive, and mathematically verifiable.",
    keyTakeaway: "Zero-install cloud environment accessible instantly via standard browser.",
    image: "/showcase/qiskit/01_landing.png",
    metrics: [
      { label: "Deployment", value: "Vercel Edge Global", color: "text-sky-400" },
      { label: "SSL / Security", value: "TLS 1.3 Strict", color: "text-emerald-400" },
      { label: "Cold Start", value: "< 800ms", color: "text-zinc-300" },
    ],
    hotspot: {
      x: "50%",
      y: "40%",
      title: "Hero Workspace Entry",
      detail: "Direct access to both Qiskit Gate Studio and D-Wave Optimization Studio.",
    },
  },
  {
    id: 2,
    stepNum: "02",
    badge: "Access & Security",
    title: "Enterprise Authentication",
    headline: "Protected Workspaces with Role-Based Workspace Isolation",
    description:
      "Fast, credentialed authentication providing isolated project vaults, encrypted session tokens, and automatic cloud persistence with MongoDB Atlas integration.",
    keyTakeaway: "Prospects can be granted time-locked demo credentials without exposing backend IP.",
    image: "/showcase/qiskit/02_login.png",
    metrics: [
      { label: "Auth Protocol", value: "JWT + HttpOnly Cookie", color: "text-sky-400" },
      { label: "Database", value: "MongoDB Atlas", color: "text-emerald-400" },
      { label: "Session Expiry", value: "48h Auto-Refresh", color: "text-zinc-300" },
    ],
  },
  {
    id: 3,
    stepNum: "03",
    badge: "Algorithm Vault",
    title: "Curated Quantum Algorithm Vault",
    headline: "Scaffold Research-Grade Protocols in a Single Click",
    description:
      "Select from verified canonical quantum algorithms including Quantum Teleportation, Grover's Search, Bernstein-Vazirani, and VQE Molecular Hydrogen ground state calculation.",
    keyTakeaway: "Eliminates boilerplate setup; delivers instant runnable templates with complete quantum registers.",
    image: "/showcase/qiskit/03_create_project.png",
    metrics: [
      { label: "Curated Protocols", value: "12+ Verified", color: "text-sky-400" },
      { label: "Frameworks", value: "Qiskit & D-Wave", color: "text-indigo-400" },
      { label: "Scaffold Time", value: "Instant (0ms)", color: "text-emerald-400" },
    ],
    hotspot: {
      x: "30%",
      y: "35%",
      title: "Teleportation Protocol Card",
      detail: "Initializes 3-qubit entangled Bell state with Alice & Bob registers.",
    },
  },
  {
    id: 4,
    stepNum: "04",
    badge: "Monaco Editor",
    title: "Intelligent Python Quantum Editor",
    headline: "Full-Featured Monaco IDE with Native Quantum Circuit Syntax",
    description:
      "Edit quantum code with AST syntax highlighting, auto-completion, and real-time auto-saving. State preparation on Alice's qubit, Bell pair entanglement, and Bob's recovery gates are cleanly structured.",
    keyTakeaway: "Developer-first experience identical to VS Code, hosted directly in the browser.",
    image: "/showcase/qiskit/04_editor_code.png",
    metrics: [
      { label: "Editor Engine", value: "Monaco (VS Code Core)", color: "text-sky-400" },
      { label: "Language", value: "Python 3.11", color: "text-emerald-400" },
      { label: "Sync Latency", value: "Real-time (<10ms)", color: "text-zinc-300" },
    ],
  },
  {
    id: 5,
    stepNum: "05",
    badge: "Visual Schematic",
    title: "Synchronized Interactive Circuit Canvas",
    headline: "Barrier-Synchronized 30-Qubit Circuit Schematic",
    description:
      "Quantum Guru's proprietary circuit parser converts Python code into a live interactive circuit schematic. Gates align chronologically with qc.barrier() synchronization across all qubit registers.",
    keyTakeaway: "Two-way visual coding: clicking any slot allows placing or deleting gates visually.",
    image: "/showcase/qiskit/05_circuit_canvas.png",
    metrics: [
      { label: "Active Qubits", value: "3 Wires (q0, q1, q2)", color: "text-sky-400" },
      { label: "Time-Step Slices", value: "s0 to s11 Aligned", color: "text-indigo-400" },
      { label: "Barrier Sync", value: "1:1 with Qiskit Drawer", color: "text-emerald-400" },
    ],
    hotspot: {
      x: "50%",
      y: "45%",
      title: "Barrier-Synchronized Wire Alignment",
      detail: "Stage 1, 2, 3, and 4 gates are partitioned cleanly with dashed barrier dividers.",
    },
  },
  {
    id: 6,
    stepNum: "06",
    badge: "Simulation Trigger",
    title: "One-Click Execution & Target QPU Selection",
    headline: "Zero-Configuration Compilation & Simulated Execution",
    description:
      "With a single click on 'Run / Recompile', the Python code is sent to the sandboxed execution runner. Users can select AerSimulator or real IBM quantum backends with up to 4,096 shots.",
    keyTakeaway: "Instant feedback loop without local virtual environment or compiler setup headaches.",
    image: "/showcase/qiskit/06_execute_click.png",
    metrics: [
      { label: "Backend", value: "Qiskit AerSimulator", color: "text-sky-400" },
      { label: "Shot Count", value: "4,096 Shots", color: "text-indigo-400" },
      { label: "Trigger Mode", value: "Automated Sandbox", color: "text-emerald-400" },
    ],
  },
  {
    id: 7,
    stepNum: "07",
    badge: "Runtime Output",
    title: "High-Fidelity Terminal & Measurement Counts",
    headline: "Authoritative Telemetry with Sub-Millisecond Execution",
    description:
      "The integrated terminal drawer returns complete execution metrics: Active Qubits: 3, Circuit Depth: 9, and the exact measurement histogram counts verifying successful state teleportation.",
    keyTakeaway: "Provides full transparency into measurement statistics and text ASCII circuit output.",
    image: "/showcase/qiskit/07_terminal_output.png",
    metrics: [
      { label: "Execution Time", value: "~0.2 ms", color: "text-emerald-400" },
      { label: "Simulation Fidelity", value: "99.8%", color: "text-sky-400" },
      { label: "Circuit Depth", value: "9 Gate Layers", color: "text-zinc-300" },
    ],
    hotspot: {
      x: "50%",
      y: "75%",
      title: "Measurement Counts & Diagram",
      detail: "Clean breakdown of teleportation eigenstate distribution.",
    },
  },
  {
    id: 8,
    stepNum: "08",
    badge: "AI Copilot",
    title: "Domain-Specific Quantum Circuit Copilot",
    headline: "Real-Time Qiskit AI Reasoning Powered by Groq LLMs",
    description:
      "Ask the integrated Copilot to explain Bob's feed-forward recovery gates, transpile to basis gates (CX, SX, RZ), or simulate noise models. Responses feature formatted Markdown, LaTeX math, and clickable code snippets.",
    keyTakeaway: "Acts as a 24/7 expert pair programmer right beside your quantum code.",
    image: "/showcase/qiskit/08_copilot_chat.png",
    metrics: [
      { label: "AI Model", value: "Qwen 3.8 27B on Groq", color: "text-sky-400" },
      { label: "Token Speed", value: "500+ tokens/sec", color: "text-emerald-400" },
      { label: "Intent Routing", value: "Two-Tier Smart Router", color: "text-indigo-400" },
    ],
  },
];

const DWAVE_STEPS: ShowcaseStep[] = [
  {
    id: 1,
    stepNum: "01",
    badge: "Decision Intelligence",
    title: "Autonomous Decision Intelligence Platform",
    headline: "Solving Intractable Combinatorial Optimization Problems in Seconds",
    description:
      "For enterprise clients with large-scale resource allocation, shift scheduling, or capital budgeting challenges, Quantum Guru delivers commercial-grade quantum annealing and QUBO synthesis.",
    keyTakeaway: "Positions Quantum Guru as an enterprise decision engine, not just a circuit sandbox.",
    image: "/showcase/dwave/01_landing.png",
    metrics: [
      { label: "Market Segment", value: "Operations & Logistics", color: "text-sky-400" },
      { label: "Engine", value: "D-Wave BQM & Neal", color: "text-indigo-400" },
      { label: "Problem Scale", value: "1,500+ Variables", color: "text-emerald-400" },
    ],
  },
  {
    id: 2,
    stepNum: "02",
    badge: "Enterprise Ingress",
    title: "Secure Enterprise Login",
    headline: "Zero-Trust Role-Based Workspace Access",
    description:
      "Client stakeholders login directly to custom enterprise domains with isolated tenant databases, encrypted inputs, and strict IP protection guarantees.",
    keyTakeaway: "Safe for client evaluations before and after signing an MNDA.",
    image: "/showcase/dwave/02_login.png",
    metrics: [
      { label: "Tenant Isolation", value: "Encrypted Vaults", color: "text-emerald-400" },
      { label: "API Compliance", value: "SOC 2 Type II Ready", color: "text-sky-400" },
      { label: "Ingress", value: "Single Sign-On (SSO)", color: "text-zinc-300" },
    ],
  },
  {
    id: 3,
    stepNum: "03",
    badge: "Portfolio Selection",
    title: "Capital Budgeting & Portfolio Optimization",
    headline: "Pre-Scaffolded Multi-Asset Capital Allocation Model",
    description:
      "Opening the Clean Energy Capital Portfolio project initializes a multi-asset decision model featuring expected returns, individual project costs, strict capital limits, and mutual exclusions.",
    keyTakeaway: "Demonstrates immediate business relevance with real capital budgeting constraints.",
    image: "/showcase/dwave/03_create_project.png",
    metrics: [
      { label: "Assets / Projects", value: "4 Energy Facilities", color: "text-sky-400" },
      { label: "Budget Ceiling", value: "$18.0 Million", color: "text-indigo-400" },
      { label: "Exclusions", value: "Mutual Exclusion Pair", color: "text-emerald-400" },
    ],
  },
  {
    id: 4,
    stepNum: "04",
    badge: "QUBO Scripting",
    title: "Binary Quadratic Model Scripting",
    headline: "Native Dimod Python Formulation with Energy Penalties",
    description:
      "Inspect the generated Python script mapping asset decisions into a Binary Quadratic Model (BQM). The script defines yields as linear biases and budget overruns as quadratic penalty couplings.",
    keyTakeaway: "Mathematical rigor meets clean, readable Python code.",
    image: "/showcase/dwave/04_editor_code.png",
    metrics: [
      { label: "Library", value: "dimod & dwave-neal", color: "text-sky-400" },
      { label: "Model Archetype", value: "BQM Binary", color: "text-emerald-400" },
      { label: "Variable Domain", value: "x_i in {0, 1}", color: "text-zinc-300" },
    ],
  },
  {
    id: 5,
    stepNum: "05",
    badge: "Annealing Trigger",
    title: "Quantum-Classical Annealing Trigger",
    headline: "Sample Ground States via Simulated Quantum Annealing",
    description:
      "Executing the solver samples 2,048 spin states across the energy landscape. The algorithm escapes local minima using simulated thermal fluctuations to find the optimal global configuration.",
    keyTakeaway: "Solves NP-hard combinatorial optimization problems in fractions of a second.",
    image: "/showcase/dwave/05_execute_click.png",
    metrics: [
      { label: "Sampling Engine", value: "Simulated Annealing", color: "text-sky-400" },
      { label: "Annealing Reads", value: "2,048 Reads", color: "text-indigo-400" },
      { label: "Solve Time", value: "0.34s (~340ms)", color: "text-emerald-400" },
    ],
  },
  {
    id: 6,
    stepNum: "06",
    badge: "Math Formulation",
    title: "Rigorous Mathematical Formulation",
    headline: "Automated LaTeX Energy Hamiltonian & Penalty Tuning",
    description:
      "The dedicated Formulation tab renders the exact mathematical Hamiltonian: H(x) = H_yield + lambda * (Cost - Budget)^2. Users can adjust the Verma-Lewis penalty stiffness slider to guarantee hard feasibility.",
    keyTakeaway: "Provides enterprise decision-makers with 100% mathematical auditability.",
    image: "/showcase/dwave/06_math_formulation.png",
    metrics: [
      { label: "Penalty Lambda", value: "lambda = 3.50x", color: "text-sky-400" },
      { label: "Objective", value: "Maximize Expected Yield", color: "text-emerald-400" },
      { label: "Slack Model", value: "Logarithmic Decomposition", color: "text-indigo-400" },
    ],
    hotspot: {
      x: "50%",
      y: "35%",
      title: "Interactive Hamiltonian Formulation",
      detail: "Clean mathematical equation linking yield objectives with quadratic constraint penalties.",
    },
  },
  {
    id: 7,
    stepNum: "07",
    badge: "Q-Matrix",
    title: "Interactive Upper-Triangular Q-Matrix",
    headline: "Real-Time Coupler Matrix Heatmap & Cross-Coupling Telemetry",
    description:
      "View the compiled Q-Matrix. Diagonal entries represent individual asset returns and self-penalties; off-diagonal cells represent cross-asset budgetary couplings and the +8.0 mutual exclusion penalty between Solar_A and Wind_B.",
    keyTakeaway: "Visualizes the mathematical landscape showing exactly how constraints enforce decisions.",
    image: "/showcase/dwave/07_q_matrix.png",
    metrics: [
      { label: "Matrix Dimension", value: "4 x 4 Assets", color: "text-sky-400" },
      { label: "Coupler Q_01", value: "+15.70 (Penalty)", color: "text-rose-400" },
      { label: "Diagonal Minimum", value: "-50.80", color: "text-emerald-400" },
    ],
    hotspot: {
      x: "45%",
      y: "50%",
      title: "Coupler Heatmap Cells",
      detail: "Hovering over any matrix cell reveals its exact algebraic derivation.",
    },
  },
  {
    id: 8,
    stepNum: "08",
    badge: "Optimal Decision",
    title: "Optimal Decision State & Energy Spectrum",
    headline: "Zero Constraint Violations & Minimum Energy Configuration",
    description:
      "The results dashboard outputs the optimal decision: [Solar_B, Battery_C] selected at ground energy E = -62.20. Constraint violation rate is strictly 0.0%, fully respecting the $18M budget ceiling.",
    keyTakeaway: "Delivers concrete, actionable decisions directly to operations teams.",
    image: "/showcase/dwave/08_results.png",
    metrics: [
      { label: "Ground State Energy", value: "E = -62.20", color: "text-emerald-400" },
      { label: "Active Assets", value: "Solar_B, Battery_C", color: "text-sky-400" },
      { label: "Constraint Violations", value: "0 (100% Feasible)", color: "text-emerald-400" },
    ],
    hotspot: {
      x: "50%",
      y: "40%",
      title: "Optimal Decision Card",
      detail: "Highlights chosen active binary variables and total portfolio capital utilized.",
    },
  },
  {
    id: 9,
    stepNum: "09",
    badge: "AI Trade-Off Analysis",
    title: "Explainable AI Decision Intelligence",
    headline: "Copilot Explains Why Unselected Options Were Rejected",
    description:
      "Prospective customers can ask: 'Why was Wind_A or Hydro_D not chosen?' The Copilot explains that Wind_A violated mutual exclusion with Solar_B, while Hydro_D's standalone cost of $8.0M exceeded the remaining budget capacity.",
    keyTakeaway: "Turns black-box optimization into explainable, trustworthy decision intelligence.",
    image: "/showcase/dwave/09_copilot_analysis.png",
    metrics: [
      { label: "Explainability", value: "100% Deterministic", color: "text-sky-400" },
      { label: "Trade-Off Analysis", value: "Budget & Exclusion Audit", color: "text-indigo-400" },
      { label: "Response Time", value: "< 1.2s via Groq", color: "text-emerald-400" },
    ],
  },
];

export default function ShowcaseWalkthroughPage() {
  const [activeTrack, setActiveTrack] = useState<"qiskit" | "dwave">("qiskit");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showPilotModal, setShowPilotModal] = useState<boolean>(false);

  const steps = activeTrack === "qiskit" ? QISKIT_STEPS : DWAVE_STEPS;
  const currentStep = steps[currentIndex] || steps[0];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < steps.length - 1 ? prev + 1 : 0));
  }, [steps.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : steps.length - 1));
  }, [steps.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      handleNext();
    }, 6000);
    return () => clearInterval(interval);
  }, [isPlaying, handleNext]);

  const handleSwitchTrack = (track: "qiskit" | "dwave") => {
    setActiveTrack(track);
    setCurrentIndex(0);
  };

  const handleCopyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080A] text-zinc-100 font-sans flex flex-col selection:bg-sky-500/30 selection:text-sky-200">
      {/* ── TOP HEADER BAR ── */}
      <header className="h-16 border-b border-white/[0.08] bg-[#0A0B0E]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2.5 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-zinc-200 group-hover:border-sky-500/50 transition-colors">
              <Sparkles className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-sm text-zinc-100 flex items-center space-x-1.5">
                <span>QUANTUM GURU</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-widest font-normal">
                  Showcase
                </span>
              </span>
              <p className="text-[10px] text-zinc-500 font-mono -mt-0.5">Interactive Executive Walkthrough</p>
            </div>
          </Link>
        </div>

        {/* Center: Track Switcher Pills */}
        <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.08] text-xs font-medium">
          <button
            type="button"
            onClick={() => handleSwitchTrack("qiskit")}
            className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
              activeTrack === "qiskit"
                ? "bg-white/[0.12] text-white shadow-sm border border-white/[0.12]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Track 1: Qiskit Circuits</span>
            <span className="text-[10px] font-mono px-1.5 rounded bg-black/40 text-zinc-400">8 steps</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchTrack("dwave")}
            className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
              activeTrack === "dwave"
                ? "bg-white/[0.12] text-white shadow-sm border border-white/[0.12]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Track 2: Decision Intelligence</span>
            <span className="text-[10px] font-mono px-1.5 rounded bg-black/40 text-zinc-400">9 steps</span>
          </button>
        </div>

        {/* Right: Actions (Share, Live IDE, Pilot CTA) */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] text-zinc-300 text-xs font-mono transition-colors cursor-pointer"
            title="Copy showcase link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Link Copied" : "Share"}</span>
          </button>

          <Link
            href="/ide"
            className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] text-zinc-300 text-xs font-mono transition-colors"
          >
            <span>Live IDE</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </Link>

          <button
            type="button"
            onClick={() => setShowPilotModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm shadow-sky-500/20"
          >
            <Zap className="w-3.5 h-3.5 fill-black" />
            <span>Book Custom Pilot</span>
          </button>
        </div>
      </header>

      {/* ── STEP PROGRESS SCRUBBER BAR ── */}
      <div className="bg-[#090A0D] border-b border-white/[0.06] px-4 sm:px-8 py-2.5 overflow-x-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 min-w-[700px]">
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
              {activeTrack === "qiskit" ? "Quantum Circuit Studio" : "Decision Optimization Engine"}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-[11px] font-mono text-sky-400">
              Milestone {currentIndex + 1} of {steps.length}
            </span>
          </div>

          {/* Stepper Dots & Labels */}
          <div className="flex items-center space-x-2">
            {steps.map((s, idx) => {
              const isActive = idx === currentIndex;
              const isPast = idx < currentIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                    isActive
                      ? "bg-white/[0.12] text-white font-bold border border-white/[0.18]"
                      : isPast
                      ? "text-zinc-400 hover:text-zinc-200"
                      : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? "bg-sky-400 ring-2 ring-sky-400/30" : isPast ? "bg-emerald-500/60" : "bg-zinc-700"
                    }`}
                  />
                  <span>{s.title.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Play/Pause & Nav Arrows */}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-md hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={isPlaying ? "Pause auto-play (Space)" : "Auto-play slides (Space)"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-md hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Previous Milestone (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-md hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Next Milestone (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN SHOWCASE VIEWPORT (Split View: Narrative Card + High-Res Screen) ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Screenshot Viewport (8 Columns) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <div className="relative rounded-2xl border border-white/[0.12] bg-[#0A0B0E] overflow-hidden shadow-2xl group">
            {/* Aspect Ratio Container for 1920x1080 screenshot */}
            <div className="relative aspect-video w-full bg-black/40">
              <Image
                src={currentStep.image}
                alt={currentStep.title}
                fill
                priority
                className="object-contain"
                sizes="(max-width: 1200px) 100vw, 800px"
              />

              {/* Pulsing Hotspot Callout (If available) */}
              {currentStep.hotspot && (
                <div
                  className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in duration-300"
                  style={{ left: currentStep.hotspot.x, top: currentStep.hotspot.y }}
                >
                  <div className="relative group/hotspot">
                    <span className="absolute -inset-2 rounded-full bg-sky-500/30 animate-ping" />
                    <div className="w-6 h-6 rounded-full bg-sky-500 text-black font-bold flex items-center justify-center text-xs shadow-lg cursor-pointer border-2 border-white">
                      +
                    </div>
                    {/* Hover Card */}
                    <div className="absolute left-8 top-1/2 -translate-y-1/2 w-64 p-3 rounded-xl border border-white/[0.15] bg-[#0E0F14]/95 backdrop-blur-md shadow-2xl text-left pointer-events-none opacity-0 group-hover/hotspot:opacity-100 transition-opacity z-40">
                      <span className="block text-[10px] uppercase font-mono text-sky-400 font-semibold">
                        {currentStep.hotspot.title}
                      </span>
                      <p className="text-xs text-zinc-300 font-sans mt-0.5 leading-relaxed">
                        {currentStep.hotspot.detail}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Top-Right Screenshot Overlay Controls */}
              <div className="absolute top-3 right-3 flex items-center space-x-1.5 opacity-75 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/[0.12] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Expand Fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bottom Subtle Overlay Bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex items-center justify-between text-xs font-mono text-zinc-300">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-white/[0.1] border border-white/[0.12] text-[10px]">
                    Step {currentStep.stepNum} / {steps.length.toString().padStart(2, "0")}
                  </span>
                  <span className="font-semibold text-white truncate max-w-xs sm:max-w-md">{currentStep.headline}</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-zinc-400 hidden sm:flex">
                  <span>Use ← → keys to step</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Bar beneath Screenshot */}
          <div className="grid grid-cols-3 gap-3 font-mono text-xs">
            {currentStep.metrics.map((m, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-white/[0.06] bg-[#0D0E12] flex flex-col space-y-0.5"
              >
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{m.label}</span>
                <span className={`font-semibold text-sm ${m.color || "text-zinc-200"}`}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Executive Narrative & Context Card (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div className="rounded-2xl border border-white/[0.12] bg-[#0D0E12] p-5 sm:p-6 flex flex-col space-y-4 shadow-xl relative overflow-hidden">
            {/* Header Badge & Step Number */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/25 font-semibold">
                {currentStep.badge}
              </span>
              <span className="text-xs font-mono text-zinc-500 font-semibold">
                Milestone {currentStep.stepNum}
              </span>
            </div>

            {/* Title & Headline */}
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug">
                {currentStep.title}
              </h2>
              <p className="text-xs text-sky-400/90 font-medium mt-1 leading-relaxed">
                {currentStep.headline}
              </p>
            </div>

            {/* Detailed Business & Technical Narration */}
            <div className="text-xs text-zinc-400 leading-relaxed space-y-2.5 pt-1 border-t border-white/[0.08]">
              <p>{currentStep.description}</p>
            </div>

            {/* Key Business Takeaway Pill */}
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-start space-x-2.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-200 block text-[11px] uppercase tracking-wide">
                  Strategic Takeaway
                </span>
                <span className="text-zinc-400 leading-relaxed text-[11px] block mt-0.5">
                  {currentStep.keyTakeaway}
                </span>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 py-2.5 px-3 rounded-xl border border-white/[0.1] hover:bg-white/[0.05] text-zinc-300 font-mono text-xs flex items-center justify-center space-x-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/[0.12] hover:bg-white/[0.18] text-white font-mono text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-white/[0.15]"
              >
                <span>{currentIndex === steps.length - 1 ? "Replay Flow" : "Next Milestone"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Flow Switcher Card */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0A0B0E] flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Alternate Track</span>
              <span className="font-medium text-zinc-200">
                {activeTrack === "qiskit" ? "Track 2: Decision Intelligence (D-Wave)" : "Track 1: Quantum Circuit Studio"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSwitchTrack(activeTrack === "qiskit" ? "dwave" : "qiskit")}
              className="px-2.5 py-1.5 rounded-lg border border-white/[0.12] hover:bg-white/[0.08] text-sky-400 font-mono text-[11px] transition-colors cursor-pointer"
            >
              Switch Flow →
            </button>
          </div>
        </div>
      </main>

      {/* ── FULLSCREEN LIGHTBOX MODAL ── */}
      {isFullscreen && (
        <div className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.1] text-xs font-mono">
            <span className="text-zinc-300">
              {currentStep.badge} · {currentStep.title} ({currentStep.stepNum}/{steps.length})
            </span>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 cursor-pointer"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 relative w-full h-full my-2">
            <Image
              src={currentStep.image}
              alt={currentStep.title}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}

      {/* ── PILOT REQUEST MODAL ── */}
      {showPilotModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.15] bg-[#0E0F14] p-6 shadow-2xl text-zinc-100 font-sans space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center border border-sky-500/30">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm">Schedule Enterprise Pilot</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPilotModal(false)}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Experience Quantum Guru with your organization's real datasets (workforce rosters, asset portfolios, or quantum algorithms).
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Thank you! Our Quantum Solutions Architect will reach out within 24 hours.");
                setShowPilotModal(false);
              }}
              className="space-y-3 font-mono text-xs"
            >
              <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.12] text-zinc-100 outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1">Target Use Case</label>
                <select className="w-full px-3 py-2 rounded-lg bg-[#14151C] border border-white/[0.12] text-zinc-100 outline-none focus:border-sky-500">
                  <option value="roster">Workforce Roster & Logistics Optimization (Bluconn)</option>
                  <option value="portfolio">Capital Budgeting & Asset Allocation</option>
                  <option value="qiskit">Quantum Circuit Research (Qiskit / Aer)</option>
                  <option value="custom">Custom Enterprise Decision Problem</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPilotModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <span>Submit Request</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
