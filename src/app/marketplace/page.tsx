'use client';

import { getBackendUrl } from '@/lib/backend';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { 
  Search, 
  Sparkles, 
  Zap, 
  Layers, 
  Compass, 
  ChevronRight,
  ChevronDown, 
  ArrowRight, 
  Check, 
  Terminal, 
  Activity, 
  Code2, 
  Atom, 
  Cpu, 
  BookOpen, 
  Database, 
  Workflow, 
  Sliders, 
  Filter, 
  ExternalLink, 
  Play, 
  CheckCircle2, 
  Clock, 
  Tag, 
  X,
  Boxes,
  Coins,
  Sun,
  Moon,
  Server,
  Lock,
  User as UserIcon,
  LogIn,
  Key,
  Mail
} from 'lucide-react';

interface QuantumCapability {
  id: string;
  tag: string;
  name: string;
  serviceName: string;
  category: 'optimization' | 'algorithms' | 'circuit' | 'chemistry' | 'qml' | 'academy' | 'qpu_simulators';
  categoryLabel: string;
  tagline: string;
  whatItDoes: string;
  youProvide: string[];
  youReceive: string[];
  level: 'Foundational' | 'Intermediate' | 'Advanced';
  pricing: 'Free' | 'Included in Pro' | 'Pay-per-use';
  credits: number;
  executionTime: string;
  workflowChain: string[];
  sampleInput: string;
  sampleOutput: string;
  outputPreview?: {
    before?: string;
    after?: string;
    stats?: Record<string, string>;
  };
}

const CAPABILITIES: QuantumCapability[] = [
  // ── OPTIMIZATION (6) ──────────────────────────────────────────
  {
    id: 'opt-1',
    credits: 2,
    tag: 'tools.opt.formulate_problem',
    name: 'Problem Formulator',
    serviceName: 'Problem Formulation Service',
    category: 'optimization',
    categoryLabel: 'Optimization',
    tagline: 'Transform complex business constraints into structured mathematical models.',
    whatItDoes: 'Translates high-level business objectives, decision variables, and inequality constraints into formal algebraic models ready for quantum mapping.',
    youProvide: ['Business problem statement', 'Decision variables', 'Operational constraints (equality/inequality)', 'Optional CSV dataset'],
    youReceive: ['Formal variable taxonomy', 'Validated algebraic objective function', 'Bounded constraint equations', 'Compatibility report'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~6ms',
    workflowChain: ['Problem Formulator', 'QUBO Matrix Synthesizer', 'Ising Spin Mapper', 'QAOA & Annealing Solver', 'Classical Benchmarker'],
    sampleInput: 'Select 10 assets from a universe of 50 to minimize covariance risk while maintaining return > 14%',
    sampleOutput: 'Model Formulated: 50 binary decision variables x_0..x_49, 1 cardinality constraint (k=10), quadratic risk objective.'
  },
  {
    id: 'opt-2',
    credits: 3,
    tag: 'tools.opt.translate_to_qubo',
    name: 'QUBO Matrix Synthesizer',
    serviceName: 'QUBO Synthesis Service',
    category: 'optimization',
    categoryLabel: 'Optimization',
    tagline: 'Convert constrained mathematical optimization into binary quadratic forms.',
    whatItDoes: 'Encodes equality and inequality constraints into penalty functions using Lagrange multipliers (lambda), generating an upper-triangular Q matrix.',
    youProvide: ['Algebraic objective terms', 'Constraint expressions', 'Penalty multiplier weighting'],
    youReceive: ['N x N Upper-triangular Q matrix', 'Lagrange multiplier validation', 'Penalty sensitivity analysis', 'Binary variable mapping'],
    level: 'Intermediate',
    pricing: 'Included in Pro',
    executionTime: '~8ms',
    workflowChain: ['Problem Formulator', 'QUBO Matrix Synthesizer', 'Ising Spin Mapper', 'QAOA & Annealing Solver', 'Classical Benchmarker'],
    sampleInput: 'Objective: min sum(cov_ij * x_i * x_j), Constraints: sum(x_i) == 10, penalty=5.0',
    sampleOutput: '50x50 QUBO Q-Matrix synthesized with lambda=5.0. Condition number: 1.42, 0 unconstrained variables.'
  },
  {
    id: 'opt-3',
    credits: 3,
    tag: 'tools.opt.map_quantum_solver',
    name: 'Ising Spin Mapper',
    serviceName: 'Ising Hamiltonian Mapping',
    category: 'optimization',
    categoryLabel: 'Optimization',
    tagline: 'Map binary decision variables directly into quantum Pauli-Z spin operators.',
    whatItDoes: 'Applies the transformation x_i = (1 - Z_i)/2 to map quadratic binary optimization models into a spin glass Ising Hamiltonian H = sum(J_ij Z_i Z_j) + sum(h_i Z_i).',
    youProvide: ['QUBO Q-matrix', 'Variable names', 'Target solver target (QAOA / D-Wave Annealer)'],
    youReceive: ['Pauli-Z Ising Hamiltonian strings', 'Offset energy constant', 'Coupling matrix J_ij', 'Local field biases h_i'],
    level: 'Intermediate',
    pricing: 'Included in Pro',
    executionTime: '~5ms',
    workflowChain: ['QUBO Matrix Synthesizer', 'Ising Spin Mapper', 'QAOA & Annealing Solver', 'Solution Decoder', 'Classical Benchmarker'],
    sampleInput: '4x4 QUBO matrix from portfolio model',
    sampleOutput: 'Constructed 4-qubit Ising Hamiltonian with 6 2-qubit coupling terms and offset E_0 = -8.45.'
  },
  {
    id: 'opt-4',
    credits: 8,
    tag: 'tools.opt.execute_solver',
    name: 'QAOA & Annealing Solver',
    serviceName: 'Quantum Ground State Sampling',
    category: 'optimization',
    categoryLabel: 'Optimization',
    tagline: 'Execute parameterized QAOA or quantum simulated annealing to sample ground states.',
    whatItDoes: 'Executes variational quantum eigensolving or quantum annealing on state-of-the-art simulators or cloud QPUs to find low-energy bitstrings.',
    youProvide: ['Ising spin Hamiltonian', 'Shots / num_reads (e.g. 1024)', 'Number of QAOA layers (p=1, 2, 3)'],
    youReceive: ['Ground state bitstrings', 'Sample frequency distribution', 'Minimum energy eigenvalue', 'Execution latency breakdown'],
    level: 'Advanced',
    pricing: 'Pay-per-use',
    executionTime: '~14ms (Sim) / 240ms (QPU)',
    workflowChain: ['Ising Spin Mapper', 'QAOA & Annealing Solver', 'Solution Decoder', 'Classical Benchmarker'],
    sampleInput: 'Run QAOA p=2 on 4-qubit portfolio Hamiltonian (1024 shots)',
    sampleOutput: 'Optimal Sample: 1010 (Energy: -11.42 Ha, Probability: 42.8%). COBYLA converged in 18 iterations.'
  },
  {
    id: 'opt-5',
    credits: 2,
    tag: 'tools.opt.decode_solution',
    name: 'Solution Decoder',
    serviceName: 'Domain Assignment Decoder',
    category: 'optimization',
    categoryLabel: 'Optimization',
    tagline: 'Map raw quantum bitstring measurements back into actionable business decisions.',
    whatItDoes: 'Decodes sampled binary bitstrings (e.g. 1010) back into domain decisions, checking constraint feasibility and calculating net ROI.',
    youProvide: ['Quantum bitstring sample', 'Variable lookup dictionary', 'Original constraints'],
    youReceive: ['Selected items / asset portfolio', 'Constraint satisfaction audit', 'Net objective score', 'Feasibility verification report'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~4ms',
    workflowChain: ['QAOA & Annealing Solver', 'Solution Decoder', 'Classical Benchmarker'],
    sampleInput: 'Bitstring 1010 for Assets [AAPL, MSFT, GOOG, AMZN]',
    sampleOutput: 'Selected Assets: AAPL (12% return) & GOOG (15% return). Total return: 27%, Cardinality k=2: VALID.'
  },
  {
    id: 'opt-6',
    credits: 4,
    tag: 'tools.opt.benchmark_classical',
    name: 'Classical Benchmarker',
    serviceName: 'Quantum vs Classical Validation',
    category: 'optimization',
    categoryLabel: 'Optimization',
    tagline: 'Scientifically validate quantum solutions against exact classical Gurobi/PuLP solvers.',
    whatItDoes: 'Solves the identical QUBO/MILP problem using classical branch-and-bound (PuLP/CBC/Gurobi) and simulated annealing, evaluating approximation ratios.',
    youProvide: ['QUBO matrix', 'Quantum objective energy', 'Execution time'],
    youReceive: ['Classical exact global minimum', 'Approximation ratio (e.g. 96.4%)', 'Runtime comparison ratio', 'Production recommendation'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~8ms',
    workflowChain: ['Solution Decoder', 'Classical Benchmarker'],
    sampleInput: 'Quantum QAOA energy: -11.42 Ha, Execution time: 0.142s',
    sampleOutput: 'PuLP exact optimum: -11.42 Ha (3.4ms). Approximation Ratio: 96.4%. Verdict: Classical recommended for N<30.'
  },
  {
    id: 'opt-7',
    credits: 3,
    tag: 'tools.opt.dimod_cqm_to_qubo',
    name: 'D-Wave Dimod CQM Converter',
    serviceName: 'D-Wave Ocean SDK (dimod.cqm_to_bqm)',
    category: 'optimization',
    categoryLabel: 'Optimization',
    tagline: 'Compiles Constrained Quadratic Models (CQM) to binary QUBO via D-Wave Ocean SDK.',
    whatItDoes: 'Transforms mixed integer and binary optimization problems into native Binary Quadratic Models (BQM) via dimod.cqm_to_bqm() using Lagrange penalty multipliers, generating ready-to-run D-Wave SimulatedAnnealingSampler Python code.',
    youProvide: ['Variable registry (Binary/Integer)', 'Quadratic objective terms', 'Constraint list (<=, >=, ==)', 'Lagrange multiplier'],
    youReceive: ['Upper-triangular QUBO dictionary', 'Quadratic offset scalar', 'Total physical qubit requirement', 'Executable SimulatedAnnealingSampler code'],
    level: 'Intermediate',
    pricing: 'Free',
    executionTime: '~85ms',
    workflowChain: ['Problem Formulator', 'D-Wave Dimod CQM Converter', 'QAOA & Annealing Solver', 'Solution Decoder'],
    sampleInput: 'CQM with 4 binary assets, $22M budget constraint (Lagrange = 10.0)',
    sampleOutput: 'BQM with 4 variables, offset: 0.0, Q-dict: {("Solar_A", "Solar_A"): -40.0, ...}'
  },
  {
    id: 'opt-8',
    credits: 3,
    tag: 'tools.opt.algebraic_slack_qubo',
    name: 'Algebraic & Slack AutoQUBO Engine',
    serviceName: 'Deterministic Polynomial Expander',
    category: 'optimization',
    categoryLabel: 'Optimization',
    tagline: 'Deterministic polynomial expansion with zero-slack templates and logarithmic slacks.',
    whatItDoes: 'Deterministically expands polynomial objectives and inequality constraints into exact N x N symmetric Q-matrices using closed-form zero-slack templates for mutual exclusion (xi*xj) and dependency (xj*(1-xi)), with minimal logarithmic slack bits for budget constraints.',
    youProvide: ['Decision variables', 'Linear objective weights', 'Inequality constraints', 'Mutual exclusions', 'Dependencies', 'Penalty lambda'],
    youReceive: ['Dense N x N Q-matrix array', 'Logarithmic slack variable mapping', 'Cell-by-cell algebraic derivation map', 'Standalone Python script'],
    level: 'Advanced',
    pricing: 'Free',
    executionTime: '< 10ms',
    workflowChain: ['Problem Formulator', 'Algebraic & Slack AutoQUBO Engine', 'QAOA & Annealing Solver', 'Solution Decoder'],
    sampleInput: '4 variables, budget $22M, mutual exclusion (Solar A, Wind D), dependency (Wind C -> Battery E)',
    sampleOutput: 'Dense 7x7 Q-matrix with 3 logarithmic slacks, zero-slack mutual exclusion couplings'
  },

  // ── CHEMISTRY (6) ─────────────────────────────────────────────
  {
    id: 'chem-1',
    credits: 2,
    tag: 'tools.chem.ingest_geometry',
    name: 'Molecular Geometry Ingester',
    serviceName: 'Molecular Geometry Ingestion',
    category: 'chemistry',
    categoryLabel: 'Chemistry',
    tagline: 'Parse atomic coordinates, bond lengths, and chemical stoichiometry.',
    whatItDoes: 'Ingests XYZ coordinates or chemical formulas (e.g. C2H5OH, H2O, LiH) and prepares atomic basis functions for quantum electronic calculations.',
    youProvide: ['Molecular formula or XYZ coordinates', 'Basis set (STO-3G, 6-31G)', 'Molecular charge & spin multiplicity'],
    youReceive: ['Nuclear coordinate matrix', 'Total electron count', 'Nuclear repulsion energy', 'Basis function mapping'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~5ms',
    workflowChain: ['Molecular Geometry Ingester', 'Hartree-Fock Integral Engine', 'CASCI Active Space Reducer', 'Fermion-to-Pauli Mapper', 'VQE Ground State Solver'],
    sampleInput: 'C2H5OH (Ethanol) with STO-3G basis',
    sampleOutput: 'Ethanol parsed: 9 atoms, 26 electrons. Nuclear repulsion energy: 120.48 Hartree.'
  },
  {
    id: 'chem-2',
    credits: 5,
    tag: 'tools.chem.compute_scf',
    name: 'Hartree-Fock Integral Engine',
    serviceName: 'Mean-Field Electronic Integrals',
    category: 'chemistry',
    categoryLabel: 'Chemistry',
    tagline: 'Compute one- and two-electron molecular integrals via Self-Consistent Field (SCF).',
    whatItDoes: 'Solves the Roothaan-Hall equations to generate molecular orbital coefficients, 1-electron kinetic/nuclear attraction integrals, and 2-electron Coulomb/exchange tensors.',
    youProvide: ['Molecular geometry', 'Basis set', 'Convergence threshold'],
    youReceive: ['Hartree-Fock mean-field energy E_HF', '1-body & 2-body electronic tensors', 'Orbital energies & occupations', 'HOMO-LUMO gap'],
    level: 'Intermediate',
    pricing: 'Included in Pro',
    executionTime: '~12ms',
    workflowChain: ['Molecular Geometry Ingester', 'Hartree-Fock Integral Engine', 'CASCI Active Space Reducer', 'Fermion-to-Pauli Mapper'],
    sampleInput: 'H2 (R=0.735A) STO-3G',
    sampleOutput: 'SCF Converged in 8 iterations. E_HF = -1.1167 Hartree. HOMO-LUMO gap: 0.742 Hartree.'
  },
  {
    id: 'chem-3',
    credits: 5,
    tag: 'tools.chem.select_active_space',
    name: 'CASCI Active Space Reducer',
    serviceName: 'Active Space Orbital Reduction',
    category: 'chemistry',
    categoryLabel: 'Chemistry',
    tagline: 'Isolate chemically active frontier orbitals to minimize quantum register size.',
    whatItDoes: 'Reduces large molecular Hamiltonians down to Complete Active Space CAS(e, o) configurations, freezing core orbitals and trimming unentangled virtuals.',
    youProvide: ['Full molecular Hamiltonian', 'Active electron count', 'Active spatial orbital count'],
    youReceive: ['Active space CAS(e,o) Hamiltonian', 'Frozen core energy offset', 'Required qubit allocation count', 'Orbital symmetry labels'],
    level: 'Advanced',
    pricing: 'Included in Pro',
    executionTime: '~6ms',
    workflowChain: ['Hartree-Fock Integral Engine', 'CASCI Active Space Reducer', 'Fermion-to-Pauli Mapper', 'VQE Ground State Solver'],
    sampleInput: 'Ethanol (26 electrons) -> CAS(4,4) active space',
    sampleOutput: 'Isolated CAS(4,4) active space. Qubit register reduced from 26 down to 8 qubits. Core energy offset: -142.20 Ha.'
  },
  {
    id: 'chem-4',
    credits: 3,
    tag: 'tools.chem.fermion_to_qubit_mapping',
    name: 'Fermion-to-Pauli Mapper',
    serviceName: 'Second-Quantization Spin Transform',
    category: 'chemistry',
    categoryLabel: 'Chemistry',
    tagline: 'Transform fermionic creation/annihilation operators into Pauli spin operators.',
    whatItDoes: 'Applies Jordan-Wigner, Bravyi-Kitaev, or Parity transformations to map anti-commuting fermionic operators into tensor products of Pauli matrices.',
    youProvide: ['Active space 1-body and 2-body tensors', 'Mapping scheme (Jordan-Wigner / Bravyi-Kitaev)'],
    youReceive: ['Pauli operator strings with real coefficients', 'Total Pauli term count', 'Commuting operator groups', 'Qubit register layout'],
    level: 'Advanced',
    pricing: 'Included in Pro',
    executionTime: '~6ms',
    workflowChain: ['CASCI Active Space Reducer', 'Fermion-to-Pauli Mapper', 'UCCSD Chemistry Ansatz', 'VQE Ground State Solver'],
    sampleInput: '4-qubit CAS(2,2) active space with Jordan-Wigner mapping',
    sampleOutput: 'Mapped into 15 Pauli operator strings. Maximum string weight: 4 (Z_0 Z_1 Z_2 Z_3).'
  },
  {
    id: 'chem-5',
    credits: 6,
    tag: 'tools.chem.build_ansatz',
    name: 'UCCSD Chemistry Ansatz',
    serviceName: 'Unitary Coupled Cluster Circuit',
    category: 'chemistry',
    categoryLabel: 'Chemistry',
    tagline: 'Construct particle-conserving single and double excitation variational circuits.',
    whatItDoes: 'Builds unitary coupled cluster circuits exp(T - T_dagger) with Hartree-Fock reference state initialization and parameterized Givens rotation layers.',
    youProvide: ['Active qubits count', 'Active electron count', 'Number of excitation repetitions'],
    youReceive: ['Parameterized Qiskit QuantumCircuit', 'Parameter symbol vector', '2-qubit entangling gate count', 'Circuit depth metrics'],
    level: 'Advanced',
    pricing: 'Included in Pro',
    executionTime: '~10ms',
    workflowChain: ['Fermion-to-Pauli Mapper', 'UCCSD Chemistry Ansatz', 'VQE Ground State Solver'],
    sampleInput: 'UCCSD for 8 qubits (Ethanol CAS(4,4))',
    sampleOutput: 'Constructed 8-qubit UCCSD ansatz with 8 CX excitation pairs and 8 parameterized Rz rotation gates.'
  },
  {
    id: 'chem-6',
    credits: 12,
    tag: 'tools.chem.solve_ground_state_vqe',
    name: 'VQE Ground State Solver',
    serviceName: 'Molecular Ground State Minimizer',
    category: 'chemistry',
    categoryLabel: 'Chemistry',
    tagline: 'Optimize variational parameters to calculate ground state energies within chemical accuracy.',
    whatItDoes: 'Executes classical-quantum hybrid optimization (COBYLA/SLSQP) to find the minimum expectation value of the molecular Hamiltonian <psi(theta)|H|psi(theta)>.',
    youProvide: ['Molecular Pauli Hamiltonian', 'Parameterized ansatz circuit', 'Maximum iterations'],
    youReceive: ['VQE Ground state energy in Hartree', 'Chemical accuracy error vs FCI (mHa)', 'Optimal parameter vector theta*', 'Energy convergence curve'],
    level: 'Advanced',
    pricing: 'Pay-per-use',
    executionTime: '~16ms (Sim) / 320ms (QPU)',
    workflowChain: ['UCCSD Chemistry Ansatz', 'VQE Ground State Solver'],
    sampleInput: 'Solve VQE for H2 at 0.735A',
    sampleOutput: 'VQE Ground Energy: -1.1368 Ha. Chemical Accuracy Error: 0.50 mHa (< 1.6 mHa). Converged in 15 iterations.'
  },

  // ── ALGORITHMS (5) ────────────────────────────────────────────
  {
    id: 'algo-1',
    credits: 1,
    tag: 'tools.algo.classify_algorithm',
    name: 'Algorithm Classifier',
    serviceName: 'Quantum Algorithm Routing',
    category: 'algorithms',
    categoryLabel: 'Algorithms',
    tagline: 'Classify computational problems and route to optimal quantum algorithm primitives.',
    whatItDoes: 'Analyzes problem structure, oracle requirements, and input dimensions to recommend the optimal quantum algorithm (Grover, QAOA, QPE, Shor, HHL).',
    youProvide: ['Problem description / complexity class', 'Input dimension / matrix size'],
    youReceive: ['Recommended algorithm architecture', 'Theoretical quantum speedup', 'Expected circuit depth bounds', 'Hardware requirements'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~4ms',
    workflowChain: ['Algorithm Classifier', 'Phase Oracle Synthesizer', 'Grover Diffusion Architect', 'Statevector Amplitude Analyzer'],
    sampleInput: 'Unstructured database search for marked element in 2^N items',
    sampleOutput: 'Algorithm Selected: Grover Quantum Search (O(sqrt(N)) quadratic speedup). Recommended register: N qubits.'
  },
  {
    id: 'algo-2',
    credits: 4,
    tag: 'tools.algo.synthesize_oracle',
    name: 'Phase Oracle Synthesizer',
    serviceName: 'Unitary Phase Oracle Builder',
    category: 'algorithms',
    categoryLabel: 'Algorithms',
    tagline: 'Synthesize boolean and phase inversion operators for marked quantum states.',
    whatItDoes: 'Constructs unitary phase inversion oracles U_w |x> = (-1)^f(x) |x> for arbitrary boolean constraints or target bitstrings.',
    youProvide: ['Target marked bitstrings (e.g. ["11"])', 'Number of qubits'],
    youReceive: ['Phase oracle QuantumCircuit', 'Controlled phase gate layout', 'Decomposed gate count', 'ASCII circuit preview'],
    level: 'Intermediate',
    pricing: 'Included in Pro',
    executionTime: '~6ms',
    workflowChain: ['Algorithm Classifier', 'Phase Oracle Synthesizer', 'Grover Diffusion Architect', 'Statevector Amplitude Analyzer'],
    sampleInput: 'Mark target state |11> on 2 qubits',
    sampleOutput: 'Synthesized 2-qubit CZ phase inversion oracle. Depth: 1, 1 2-qubit gate.'
  },
  {
    id: 'algo-3',
    credits: 4,
    tag: 'tools.algo.build_diffusion',
    name: 'Grover Diffusion Architect',
    serviceName: 'Inversion-About-Mean Operator',
    category: 'algorithms',
    categoryLabel: 'Algorithms',
    tagline: 'Construct amplitude amplification diffusion operators for unstructured search.',
    whatItDoes: 'Builds the Grover diffusion operator D = 2|s><s| - I using Hadamard layers, Pauli-X flips, and multi-controlled phase gates.',
    youProvide: ['Register width (number of qubits)'],
    youReceive: ['Diffusion operator QuantumCircuit', 'Decomposed unitary representation', 'Amplitude amplification ratio', 'Circuit depth metrics'],
    level: 'Intermediate',
    pricing: 'Included in Pro',
    executionTime: '~5ms',
    workflowChain: ['Phase Oracle Synthesizer', 'Grover Diffusion Architect', 'Statevector Amplitude Analyzer', 'Quantum Speedup Evaluator'],
    sampleInput: '2-qubit Grover diffusion operator',
    sampleOutput: 'Constructed 2-qubit diffusion operator: H-X-CZ-X-H. Total depth: 5, unitary preservation: 100%.'
  },
  {
    id: 'algo-4',
    credits: 6,
    tag: 'tools.algo.simulate_statevector',
    name: 'Statevector Amplitude Analyzer',
    serviceName: 'Exact Quantum Statevector Simulator',
    category: 'algorithms',
    categoryLabel: 'Algorithms',
    tagline: 'Calculate exact complex state amplitudes, measurement probabilities, and entanglement fidelity.',
    whatItDoes: 'Simulates the exact unitary evolution of statevectors |psi> in 2^N dimensional complex Hilbert space without shot sampling noise.',
    youProvide: ['Quantum circuit code', 'Shots / evaluation target'],
    youReceive: ['Complex statevector array', 'Measurement probability histogram', 'State purity & fidelity', 'Entangled subsystem entropy'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~6ms',
    workflowChain: ['Grover Diffusion Architect', 'Statevector Amplitude Analyzer', 'Quantum Speedup Evaluator'],
    sampleInput: 'Grover circuit on 2 qubits with oracle |11>',
    sampleOutput: 'Statevector: [0, 0, 0, 1.0]. Target State |11> Amplified Probability: 100.0%.'
  },
  {
    id: 'algo-5',
    credits: 2,
    tag: 'tools.algo.analyze_speedup',
    name: 'Quantum Speedup Evaluator',
    serviceName: 'Computational Complexity Analyzer',
    category: 'algorithms',
    categoryLabel: 'Algorithms',
    tagline: 'Analyze asymptotic complexity scaling and estimate quantum advantage thresholds.',
    whatItDoes: 'Compares quantum complexity O(f(N)) against best-known classical algorithms, calculating the exact crossover point where quantum computation outperforms classical CPUs.',
    youProvide: ['Problem size N', 'Classical CPU clock speed / gate time', 'Quantum gate execution latency (ns)'],
    youReceive: ['Quantum advantage threshold graph', 'Crossover problem size N*', 'Wall-clock time projection', 'Physical qubit overhead bounds'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~4ms',
    workflowChain: ['Statevector Amplitude Analyzer', 'Quantum Speedup Evaluator'],
    sampleInput: 'Grover Search N=2^20 vs Classical Linear Search',
    sampleOutput: 'Quantum runtime: 1024 iterations (~1.02ms). Classical runtime: 524,288 evals (~52.4ms). Quantum speedup: 51.3x.'
  },

  // ── CIRCUITS (5) ──────────────────────────────────────────────
  {
    id: 'circ-1',
    credits: 2,
    tag: 'tools.circuit.build_register',
    name: 'Quantum Register Architect',
    serviceName: 'Circuit Initialization & Register Layout',
    category: 'circuit',
    categoryLabel: 'Circuit',
    tagline: 'Initialize multi-qubit quantum and classical registers with custom topologies.',
    whatItDoes: 'Allocates quantum registers, classical readout registers, and binds hardware coupling maps for execution.',
    youProvide: ['Qubit register width', 'Classical readout bits count', 'Initial state preparation (optional)'],
    youReceive: ['Initialized QuantumCircuit instance', 'Memory layout allocations', 'Qubit indexing taxonomy'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~3ms',
    workflowChain: ['Quantum Register Architect', 'Parameter Symbol Binder', 'Transpiler Pass Optimizer', 'Noise Simulator', 'Continuous Circuit Drawer'],
    sampleInput: '4 qubits, 4 classical bits',
    sampleOutput: 'Initialized QuantumRegister(4, "q") and ClassicalRegister(4, "c"). Ready for gate operations.'
  },
  {
    id: 'circ-2',
    credits: 2,
    tag: 'tools.circuit.bind_parameters',
    name: 'Parameter Symbol Binder',
    serviceName: 'Variational Parameter Binder',
    category: 'circuit',
    categoryLabel: 'Circuit',
    tagline: 'Bind numerical values into symbolic rotation angles in variational quantum circuits.',
    whatItDoes: 'Binds numpy vectors or optimization tensors into symbolic Parameter objects (e.g. theta_0, gamma_1, beta_2) with zero compilation overhead.',
    youProvide: ['Symbolic parameterized circuit', 'Parameter dictionary / numerical values vector'],
    youReceive: ['Bound numerical QuantumCircuit', 'Unbound parameters audit', 'Gate rotation angle report'],
    level: 'Intermediate',
    pricing: 'Free',
    executionTime: '~4ms',
    workflowChain: ['Parameter Symbol Binder', 'Transpiler Pass Optimizer', 'Continuous Circuit Drawer'],
    sampleInput: 'Bind theta = [0.48, 0.48, 0.48, 0.48] to 4-qubit QAOA circuit',
    sampleOutput: 'All 4 symbolic parameters bound successfully. Ready for simulator execution.'
  },
  {
    id: 'circ-3',
    credits: 5,
    tag: 'tools.circuit.transpile_passes',
    name: 'Transpiler Pass Optimizer',
    serviceName: 'Compiler Pass Optimization',
    category: 'circuit',
    categoryLabel: 'Circuit',
    tagline: 'Apply commutative cancellation and block consolidation to compress 2-qubit depth.',
    whatItDoes: 'Runs advanced Qiskit PassManager routines (CommutativeCancellation, ConsolidateBlocks, CXCancellation) to compress circuit depth up to 35%.',
    youProvide: ['Uncompiled quantum circuit code', 'Optimization level (Level 1, 2, or 3)', 'Target hardware basis gates'],
    youReceive: ['Optimized QuantumCircuit', 'Depth reduction percentage (e.g. -33%)', '2-qubit CNOT gate reduction count', 'Compiled OpenQASM 3.0 string'],
    level: 'Advanced',
    pricing: 'Included in Pro',
    executionTime: '~12ms',
    workflowChain: ['Parameter Symbol Binder', 'Transpiler Pass Optimizer', 'Noise Simulator', 'Continuous Circuit Drawer'],
    sampleInput: 'Transpile 4-qubit circuit with optimization_level=2',
    sampleOutput: 'Depth reduced from 6 to 4 (-33.3%). CNOT gates condensed from 4 to 2 via CommutativeCancellation.'
  },
  {
    id: 'circ-4',
    credits: 6,
    tag: 'tools.circuit.simulate_noisy',
    name: 'Noise & Decoherence Simulator',
    serviceName: 'Noisy Quantum Hardware Simulator',
    category: 'circuit',
    categoryLabel: 'Circuit',
    tagline: 'Simulate realistic QPU noise including T1 relaxation, T2 dephasing, and gate errors.',
    whatItDoes: 'Constructs custom noise models simulating thermal relaxation, qubit decoherence, readout crosstalk, and 2-qubit depolarizing gate infidelity.',
    youProvide: ['Quantum circuit', 'T1 relaxation time (us)', 'T2 dephasing time (us)', 'Gate error rate (e.g. 0.001)'],
    youReceive: ['Noisy density matrix / measurement shots', 'Fidelity degradation curve', 'State purity loss report', 'Mitigated error estimate'],
    level: 'Advanced',
    pricing: 'Included in Pro',
    executionTime: '~15ms',
    workflowChain: ['Transpiler Pass Optimizer', 'Noise Simulator', 'Continuous Circuit Drawer'],
    sampleInput: 'Simulate 4-qubit circuit with T1=50us, T2=70us, gate_error=0.001',
    sampleOutput: 'Noisy simulation completed (1024 shots). Fidelity: 94.2% (5.8% decoherence loss).'
  },
  {
    id: 'circ-5',
    credits: 1,
    tag: 'tools.circuit.render_continuous',
    name: 'Continuous Circuit Drawer',
    serviceName: 'Continuous Horizontal Canvas Drawer',
    category: 'circuit',
    categoryLabel: 'Circuit',
    tagline: 'Render continuous horizontal ASCII and Unicode schematics with zero line wrapping (fold=-1).',
    whatItDoes: 'Generates high-contrast continuous horizontal ASCII and Unicode circuit tracks without artificial line-wrapping, ideal for web canvas inspection.',
    youProvide: ['Quantum circuit object / QASM code'],
    youReceive: ['Continuous unfolded ASCII schematic', 'Total wire count', 'Gate alignment column count'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~4ms',
    workflowChain: ['Transpiler Pass Optimizer', 'Continuous Circuit Drawer'],
    sampleInput: 'Render 8-qubit Ethanol CAS-VQE circuit with fold=-1',
    sampleOutput: 'Continuous horizontal diagram generated across 8 qubit wires (q_0..q_7).'
  },

  // ── QUANTUM ML (6) ────────────────────────────────────────────
  {
    id: 'qml-1',
    credits: 2,
    tag: 'tools.qml.normalize_features',
    name: 'Bloch Feature Normalizer',
    serviceName: 'Feature Scaling & Angle Normalization',
    category: 'qml',
    categoryLabel: 'Quantum ML',
    tagline: 'Scale high-dimensional classical datasets into quantum rotation phase angles [-pi, pi].',
    whatItDoes: 'Applies MinMax and z-score normalization to project continuous real data into bounded angular rotation space for quantum state embedding.',
    youProvide: ['Raw feature matrix / CSV dataset', 'Target qubit register count'],
    youReceive: ['Normalized angle tensor [-pi, pi]', 'Feature importance weights', 'Dimensionality reduction PCA mapping'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~4ms',
    workflowChain: ['Bloch Feature Normalizer', 'Quantum Feature Map Generator', 'Variational QML Architect', 'QSVM & VQC Classifier Trainer', 'Classical ML Benchmarker'],
    sampleInput: 'Iris dataset (4 features, 150 samples)',
    sampleOutput: 'Normalized 4 features into rotation angles [-pi, pi]. Ready for 4-qubit ZZFeatureMap encoding.'
  },
  {
    id: 'qml-2',
    credits: 4,
    tag: 'tools.qml.build_feature_map',
    name: 'Quantum Feature Map Generator',
    serviceName: 'Hilbert Space Quantum Feature Map',
    category: 'qml',
    categoryLabel: 'Quantum ML',
    tagline: 'Encode classical data vectors into exponential Hilbert space via ZZFeatureMap.',
    whatItDoes: 'Constructs non-linear quantum feature maps with parameterized single-qubit rotations and entangling CX/CZ phase gates to map data into 2^N Hilbert space.',
    youProvide: ['Number of qubits', 'Feature map family (ZZFeatureMap / PauliFeatureMap / AngleEmbedding)', 'Entanglement topology'],
    youReceive: ['Parameterized feature map circuit', 'Quantum kernel formulation', 'Entangling layer depth metrics'],
    level: 'Intermediate',
    pricing: 'Included in Pro',
    executionTime: '~6ms',
    workflowChain: ['Bloch Feature Normalizer', 'Quantum Feature Map Generator', 'Variational QML Architect', 'QSVM & VQC Classifier Trainer'],
    sampleInput: '4-qubit ZZFeatureMap with linear entanglement (reps=2)',
    sampleOutput: 'Constructed 4-qubit ZZFeatureMap with 6 entangling 2-qubit phase gates. Depth: 6.'
  },
  {
    id: 'qml-3',
    credits: 4,
    tag: 'tools.qml.build_ansatz',
    name: 'Variational QML Architect',
    serviceName: 'Trainable QML Variational Ansatz',
    category: 'qml',
    categoryLabel: 'Quantum ML',
    tagline: 'Construct expressive RealAmplitudes and strongly entangling variational layers.',
    whatItDoes: 'Builds parameterized variational quantum circuits with single-qubit Ry rotations and cyclic entangling CNOT layers optimized for gradient-based training.',
    youProvide: ['Qubit count', 'Ansatz type (RealAmplitudes / EfficientSU2)', 'Number of variational repetitions'],
    youReceive: ['Trainable variational QuantumCircuit', 'Parameter weight vector', 'Expressibility & entangling capability score'],
    level: 'Intermediate',
    pricing: 'Included in Pro',
    executionTime: '~6ms',
    workflowChain: ['Quantum Feature Map Generator', 'Variational QML Architect', 'QSVM & VQC Classifier Trainer'],
    sampleInput: '4-qubit RealAmplitudes ansatz (reps=2, full entanglement)',
    sampleOutput: 'Constructed 4-qubit variational circuit with 12 trainable parameters. Depth: 6, CNOTs: 6.'
  },
  {
    id: 'qml-4',
    credits: 10,
    tag: 'tools.qml.train_classifier',
    name: 'QSVM & VQC Classifier Trainer',
    serviceName: 'Quantum Classifier Training Service',
    category: 'qml',
    categoryLabel: 'Quantum ML',
    tagline: 'Train Quantum Support Vector Machines and Variational Quantum Classifiers.',
    whatItDoes: 'Computes quantum kernel Gram matrices K(x_i, x_j) = |<phi(x_i)|phi(x_j)>|^2 and optimizes variational weights for binary/multiclass classification.',
    youProvide: ['Normalized training data & labels', 'Model type (QSVM / VQC)', 'Training epochs / optimizer'],
    youReceive: ['Trained model weights', 'Quantum Kernel matrix', 'Training accuracy & loss curve', 'Support vector indices'],
    level: 'Advanced',
    pricing: 'Pay-per-use',
    executionTime: '~28ms (Sim) / 450ms (QPU)',
    workflowChain: ['Variational QML Architect', 'QSVM & VQC Classifier Trainer', 'Classical ML Benchmarker', 'Quantum Inference Predictor'],
    sampleInput: 'Train QSVM on 100 samples (4 features)',
    sampleOutput: 'QSVM Training complete. Accuracy: 98.0%, 14 Support Vectors identified. Quantum Kernel matrix: 100x100.'
  },
  {
    id: 'qml-5',
    credits: 4,
    tag: 'tools.qml.benchmark_classical',
    name: 'Classical ML Benchmarker',
    serviceName: 'Dual Quantum-Classical ML Comparison',
    category: 'qml',
    categoryLabel: 'Quantum ML',
    tagline: 'Benchmark quantum classifiers against classical SVM, Random Forest, and XGBoost.',
    whatItDoes: 'Runs side-by-side performance evaluation on test splits comparing accuracy, F1-score, inference latency, and kernel matrix rank.',
    youProvide: ['QSVM test predictions', 'Classical baseline model predictions', 'Ground truth labels'],
    youReceive: ['Comparative metrics table', 'ROC-AUC curve data', 'Decision boundary visualization', 'Advantage evaluation verdict'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~8ms',
    workflowChain: ['QSVM & VQC Classifier Trainer', 'Classical ML Benchmarker', 'Quantum Inference Predictor'],
    sampleInput: 'Compare QSVM (98.0%) vs Classical RBF-SVM and Random Forest',
    sampleOutput: 'QSVM: 98.0% Accuracy | Classical SVM: 96.0% | Random Forest: 94.0%. QSVM achieved +2.0% accuracy improvement.'
  },
  {
    id: 'qml-6',
    credits: 2,
    tag: 'tools.qml.predict_sample',
    name: 'Quantum Inference Predictor',
    serviceName: 'Live Quantum Sample Inference',
    category: 'qml',
    categoryLabel: 'Quantum ML',
    tagline: 'Execute real-time quantum kernel inference on unseen single test samples.',
    whatItDoes: 'Projects an unseen sample vector into the trained quantum Hilbert space, evaluating state overlap against support vectors to return predicted class labels.',
    youProvide: ['Single test feature vector', 'Trained model weights / support vectors'],
    youReceive: ['Predicted classification label', 'Confidence probability score', 'Inference latency (ms)'],
    level: 'Intermediate',
    pricing: 'Free',
    executionTime: '~6ms',
    workflowChain: ['Classical ML Benchmarker', 'Quantum Inference Predictor'],
    sampleInput: 'Predict test sample [0.52, -0.31, 0.88, 0.14]',
    sampleOutput: 'Predicted Class: Class 1 (Probability: 97.4%). Quantum kernel evaluation latency: 5.8ms.'
  },

  // ── ACADEMY (5) ───────────────────────────────────────────────
  {
    id: 'acad-1',
    credits: 1,
    tag: 'tools.academy.concept_explainer',
    name: 'Concept Decomposer',
    serviceName: 'Socratic Physics Explanation',
    category: 'academy',
    categoryLabel: 'Academy',
    tagline: 'Understand complex quantum mechanics concepts through guided Socratic reasoning.',
    whatItDoes: 'Breaks down quantum concepts (superposition, entanglement, quantum tunneling, phase estimation) into intuitive physical analogies and mathematical rigor.',
    youProvide: ['Quantum concept / topic question', 'Target depth level (Beginner / Intermediate / Advanced)'],
    youReceive: ['Structured explanation', 'Physical thought experiment / analogy', 'Key mathematical equations', 'Common misconceptions to avoid'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~6ms',
    workflowChain: ['Concept Decomposer', 'Dirac Mathematics Proof Engine', 'Tutorial Circuit Synthesizer'],
    sampleInput: 'Explain quantum entanglement and Bell inequalities',
    sampleOutput: 'Entanglement explained via non-local correlations and violation of CHSH inequality (S = 2*sqrt(2) > 2).'
  },
  {
    id: 'acad-2',
    credits: 2,
    tag: 'tools.academy.math_derivation',
    name: 'Dirac Mathematics Proof Engine',
    serviceName: 'Dirac Notation Step-by-Step Proofs',
    category: 'academy',
    categoryLabel: 'Academy',
    tagline: 'Step-by-step Dirac bra-ket matrix derivations and unitary operator proofs.',
    whatItDoes: 'Generates mathematically verified proofs using Dirac notation, outer products |psi><phi|, Pauli algebraic identities, and density matrix evolutions.',
    youProvide: ['Target theorem / derivation query', 'Operators involved'],
    youReceive: ['Step-by-step Dirac proof', 'Matrix representations', 'Unitary preservation validation', 'Eigenvalue spectrum analysis'],
    level: 'Intermediate',
    pricing: 'Free',
    executionTime: '~8ms',
    workflowChain: ['Concept Decomposer', 'Dirac Mathematics Proof Engine', 'Socratic Diagnostic Assessment'],
    sampleInput: 'Prove Hadamard gate transforms |0> into (|0>+|1>)/sqrt(2) and H^2 = I',
    sampleOutput: 'Proof: H|0> = (1/sqrt(2))(|0>+|1>) = |+>. H^2 = (1/2)[[1,1],[1,-1]]^2 = I_2. Unitary & Hermitian: Verified.'
  },
  {
    id: 'acad-3',
    credits: 3,
    tag: 'tools.academy.generate_tutorial_circuit',
    name: 'Tutorial Circuit Synthesizer',
    serviceName: 'Educational Circuit Synthesizer',
    category: 'academy',
    categoryLabel: 'Academy',
    tagline: 'Generate minimal didactic circuits illustrating foundational quantum phenomena.',
    whatItDoes: 'Synthesizes clean educational circuits demonstrating superposition, quantum teleportation, phase kickback, and superdense coding with explanatory annotations.',
    youProvide: ['Target quantum phenomenon (e.g. Teleportation / Bell pair)'],
    youReceive: ['Educational QuantumCircuit instance', 'Step-by-step statevector evolution commentary', 'ASCII circuit schematic'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~5ms',
    workflowChain: ['Concept Decomposer', 'Tutorial Circuit Synthesizer', 'Misconception Debugger'],
    sampleInput: 'Synthesize Quantum Teleportation Protocol circuit',
    sampleOutput: 'Generated 3-qubit teleportation circuit with EPR pair preparation, Bell measurement, and feedforward corrections.'
  },
  {
    id: 'acad-4',
    credits: 1,
    tag: 'tools.academy.socratic_assessment',
    name: 'Socratic Diagnostic Assessment',
    serviceName: 'Quantum Diagnostic Assessment',
    category: 'academy',
    categoryLabel: 'Academy',
    tagline: 'Interactive conceptual and mathematical diagnostic assessments for quantum computing.',
    whatItDoes: 'Generates targeted diagnostic questions with instant feedback to test understanding of quantum algorithms, noise, and Hamiltonian mappings.',
    youProvide: ['Subject area (Algorithms / Hardware / Optimization / Chemistry)', 'Difficulty level'],
    youReceive: ['Formative diagnostic question', 'Detailed solution walkthrough', 'Common conceptual pitfalls report'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~5ms',
    workflowChain: ['Dirac Mathematics Proof Engine', 'Socratic Diagnostic Assessment', 'Misconception Debugger'],
    sampleInput: 'Assessment on QAOA mixer Hamiltonians and transverse fields',
    sampleOutput: 'Diagnostic generated: Why is H_M = sum(X_i) chosen as the standard mixer unitary in QAOA? Detailed derivation provided.'
  },
  {
    id: 'acad-5',
    credits: 2,
    tag: 'tools.academy.misconception_debugger',
    name: 'Misconception Debugger',
    serviceName: 'Quantum Misconception Diagnostic',
    category: 'academy',
    categoryLabel: 'Academy',
    tagline: 'Identify and resolve subtle quantum computing misconceptions in code and theory.',
    whatItDoes: 'Analyzes student code or conceptual explanations to flag common bugs like violating no-cloning theorem, measuring prematurely, or misuse of global phase.',
    youProvide: ['Student code snippet or conceptual claim'],
    youReceive: ['Misconception identification', 'Physical root cause explanation', 'Corrected quantum circuit / proof'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~6ms',
    workflowChain: ['Tutorial Circuit Synthesizer', 'Misconception Debugger'],
    sampleInput: 'Why cannot we clone an unknown quantum state |psi> using CNOT?',
    sampleOutput: 'Identified: No-Cloning Theorem violation. CNOT only copies basis states {|0>, |1>}, for superposition |+> it creates entangled pair (|00>+|11>)/sqrt(2).'
  },

  // ── QPU / SIMULATORS (3) ──────────────────────────────────────
  {
    id: 'sim-1',
    credits: 10,
    tag: 'tools.sim.dwave_sampler',
    name: 'D-Wave Annealing Simulator',
    serviceName: 'Quantum Annealing & SA Sampler',
    category: 'qpu_simulators',
    categoryLabel: 'QPU / Simulators',
    tagline: 'Simulate quantum annealing and transverse-field Ising dynamics for QUBO & binary optimization.',
    whatItDoes: 'Executes Simulated Annealing (dimod.SimulatedAnnealingSampler) and Quantum Annealing emulations to sample ground state spin configurations in complex energy landscapes.',
    youProvide: ['Ising Hamiltonian / QUBO matrix', 'Number of reads / sweeps (e.g. 1000)', 'Beta schedule / Annealing time'],
    youReceive: ['Low-energy sample bitstrings', 'Sample frequency distribution', 'Energy histogram', 'Execution latency breakdown'],
    level: 'Intermediate',
    pricing: 'Included in Pro',
    executionTime: '~18ms',
    workflowChain: ['QUBO Matrix Synthesizer', 'Ising Spin Mapper', 'D-Wave Annealing Simulator', 'Solution Decoder'],
    sampleInput: 'Run D-Wave Simulated Annealing on 50-variable portfolio QUBO with num_reads=1000',
    sampleOutput: 'Sampled optimal bitstring in 14.2ms. Minimum energy: -11.42. Ground state probability: 48.6%.'
  },
  {
    id: 'sim-2',
    credits: 8,
    tag: 'tools.sim.qiskit_aer',
    name: 'Qiskit Aer Simulator',
    serviceName: 'Gate-Based Quantum Circuit Simulator',
    category: 'qpu_simulators',
    categoryLabel: 'QPU / Simulators',
    tagline: 'High-performance C++ gate-based statevector, stabilizer, and unitary matrix simulation.',
    whatItDoes: 'Simulates exact unitary evolution, shot-based sampling with AerSimulator, and optional noise model injections (T1/T2 relaxation, gate depolarization).',
    youProvide: ['Qiskit QuantumCircuit / OpenQASM 3.0 code', 'Simulation method (statevector / stabilizer / matrix_product_state)', 'Shots count (e.g. 1024)'],
    youReceive: ['Exact statevector / measurement counts', 'Expectation values <Z>', 'Simulation fidelity (100%)', 'State purity & fidelity metrics'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~8ms',
    workflowChain: ['Quantum Register Architect', 'Transpiler Pass Optimizer', 'Qiskit Aer Simulator', 'Continuous Circuit Drawer'],
    sampleInput: 'Simulate 8-qubit CAS-VQE circuit on AerSimulator with 1024 shots',
    sampleOutput: 'Aer simulation complete. 1024 shots sampled across 8 qubits. Expectation value <Z>: -154.3812 Ha in 6.4ms.'
  },
  {
    id: 'sim-3',
    credits: 4,
    tag: 'tools.sim.google_ortools',
    name: 'Google OR-Tools Solver',
    serviceName: 'Classical CP-SAT & MILP Engine',
    category: 'qpu_simulators',
    categoryLabel: 'QPU / Simulators',
    tagline: 'Exact classical constraint programming and mixed-integer linear programming baseline solver.',
    whatItDoes: 'Solves mathematical optimization problems to exact global optimality using Google OR-Tools CP-SAT and CBC/SCIP engines for baseline benchmarking.',
    youProvide: ['Objective function & variable bounds', 'Linear / quadratic constraints', 'Solver timeout limit (seconds)'],
    youReceive: ['Proven global optimal solution', 'Optimality gap (0.00%)', 'Search tree node count', 'Exact classical solve time'],
    level: 'Foundational',
    pricing: 'Free',
    executionTime: '~4ms',
    workflowChain: ['Problem Formulator', 'Google OR-Tools Solver', 'Classical Benchmarker'],
    sampleInput: 'Solve 4-asset portfolio MILP with cardinality constraint k=2 using OR-Tools CP-SAT',
    sampleOutput: 'Optimal solution found: x0=1, x2=1. Global objective: -11.42 Ha. Optimality gap: 0.00% in 2.8ms.'
  }
];

const PREBUILT_WORKFLOWS = [
  {
    id: 'wf-portfolio',
    title: 'Autonomous Portfolio Optimization',
    category: 'Optimization',
    categoryKey: 'optimization',
    description: 'Complete 5-stage pipeline: formulate quadratic model, synthesize QUBO, map to Ising Hamiltonian, run QAOA ground state sampling, and benchmark against classical PuLP solver.',
    steps: ['Problem Formulator', 'QUBO Matrix Synthesizer', 'Ising Spin Mapper', 'QAOA & Annealing Solver', 'Classical Benchmarker'],
    idealFor: 'Fintech, quantitative trading teams, risk management',
    outcome: 'Optimal asset allocation bitstrings with validated 96.4% approximation ratio.',
    priceTag: 'Included in Pro'
  },
  {
    id: 'wf-vqe-chem',
    title: 'Molecular CAS-VQE Electronic Ground State',
    category: 'Chemistry',
    categoryKey: 'chemistry',
    description: 'Complete molecular electronic structure workflow: parse geometry, compute SCF integrals, isolate CAS active space, apply Jordan-Wigner transformation, and solve ground state VQE.',
    steps: ['Molecular Geometry Ingester', 'Hartree-Fock Integral Engine', 'CASCI Active Space Reducer', 'Fermion-to-Pauli Mapper', 'VQE Ground State Solver'],
    idealFor: 'Computational chemists, material scientists, drug discovery',
    outcome: 'Molecular ground energy within chemical accuracy (<1.6 mHa deviation from Full-CI).',
    priceTag: 'Pay-per-use'
  },
  {
    id: 'wf-grover',
    title: 'Quadratic Quantum Search (Grover Oracle)',
    category: 'Algorithms',
    categoryKey: 'algorithms',
    description: 'Design and execute unstructured search: classify problem, synthesize boolean phase inversion oracle, build Grover diffusion operator, and evaluate statevector amplification.',
    steps: ['Algorithm Classifier', 'Phase Oracle Synthesizer', 'Grover Diffusion Architect', 'Statevector Amplitude Analyzer'],
    idealFor: 'Algorithm researchers, cryptography analysis, database search',
    outcome: '100% target state amplitude amplification with O(sqrt(N)) complexity.',
    priceTag: 'Free'
  },
  {
    id: 'wf-qml-svm',
    title: 'Quantum Kernel Classifier (QSVM)',
    category: 'Quantum ML',
    categoryKey: 'qml',
    description: 'End-to-end Quantum ML workflow: normalize continuous dataset, encode into Hilbert space via ZZFeatureMap, train quantum kernel SVM, and benchmark against classical Random Forest.',
    steps: ['Bloch Feature Normalizer', 'Quantum Feature Map Generator', 'Variational QML Architect', 'QSVM & VQC Classifier Trainer', 'Classical ML Benchmarker'],
    idealFor: 'Data scientists, ML researchers, pattern recognition',
    outcome: 'Trained quantum classifier model with validated accuracy improvement.',
    priceTag: 'Included in Pro'
  },
  {
    id: 'wf-compiler-opt',
    title: 'Hardware Transpiler & Noise Simulation',
    category: 'Circuit',
    categoryKey: 'circuit',
    description: 'Optimize circuit depth for physical hardware: apply level-2 commutative compiler passes, simulate realistic T1/T2 noise decoherence, and render unfolded continuous ASCII canvas.',
    steps: ['Quantum Register Architect', 'Transpiler Pass Optimizer', 'Noise & Decoherence Simulator', 'Continuous Circuit Drawer'],
    idealFor: 'QPU hardware developers, quantum compiler engineers',
    outcome: '33% depth reduction and realistic fidelity decay projection.',
    priceTag: 'Included in Pro'
  },
  {
    id: 'wf-dirac-learn',
    title: 'Socratic Dirac Physics & Teleportation Protocol',
    category: 'Academy',
    categoryKey: 'academy',
    description: 'Guided foundational quantum journey: decompose entanglement principles, derive mathematical proofs in Dirac notation, synthesize teleportation circuit, and resolve misconceptions.',
    steps: ['Concept Decomposer', 'Dirac Mathematics Proof Engine', 'Tutorial Circuit Synthesizer', 'Misconception Debugger'],
    idealFor: 'Students, professors, onboarding quantum software engineers',
    outcome: 'Rigorous mathematical understanding and runnable teleportation code.',
    priceTag: 'Free'
  }
];

export default function QuantumMarketplacePage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const isDark = theme === 'dark';

  // Load theme preference on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('qg_theme') as 'dark' | 'light' | null;
      if (savedTheme) setTheme(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('qg_theme', nextTheme);
    }
  };

  // 10% Toned-Down Color System (Zero Bold, Clean Contrast)
  const colors = {
    bgMain: isDark ? '#0D0D0D' : '#F8FAFC',
    bgHeader: isDark ? '#141414' : '#FFFFFF',
    bgCard: isDark ? '#161616' : '#FFFFFF',
    bgPill: isDark ? '#1C1C1C' : '#F1F5F9',
    bgHover: isDark ? '#202020' : '#E2E8F0',
    border: isDark ? '#222222' : '#E2E8F0',
    textPrimary: isDark ? '#DDE2E8' : '#0F172A',
    textMuted: isDark ? '#808D9E' : '#64748B',
    textCyan: '#33A8DB',
    textEmerald: '#2FB885',
    textAmber: '#DEAA21',
    textSkyBlue: '#5390DD'
  };

  const router = useRouter();
  const { user, isAuthenticated, isInitializing, login, logout } = useAuth();

  React.useEffect(() => {
    if (!isInitializing) {
      if (!isAuthenticated || user?.role !== 'admin') {
        router.replace('/ide');
      }
    }
  }, [isInitializing, isAuthenticated, user, router]);

  // Auth Modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Handle Open IDE Click
  const handleOpenIDE = () => {
    if (isAuthenticated || user) {
      router.push('/ide');
    } else {
      setAuthError('');
      setIsAuthModalOpen(true);
    }
  };

  // Handle Login / Sign Up submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    try {
      if (authMode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail.trim(), password: authPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid email or password');

        login(data);
        setIsAuthModalOpen(false);
        router.push('/ide');
      } else {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authEmail.trim(),
            password: authPassword,
            firstName: authFirstName.trim(),
            lastName: authLastName.trim()
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create account');

        login(data);
        setIsAuthModalOpen(false);
        router.push('/ide');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeViewTab, setActiveViewTab] = useState<'explore' | 'workflows' | 'topology'>('explore');
  const [selectedCapability, setSelectedCapability] = useState<QuantumCapability | null>(null);
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
  const [sandboxInput, setSandboxInput] = useState('');
  const [sandboxOutput, setSandboxOutput] = useState<string | null>(null);
  const [isExecutingSandbox, setIsExecutingSandbox] = useState(false);

  // Filter capabilities based on search & category (with hyphen/space normalization)
  const filteredCapabilities = useMemo(() => {
    return CAPABILITIES.filter(cap => {
      const matchesCat = selectedCategory === 'all' || cap.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCat;

      const qNormalized = q.replace(/[-_\s]/g, '');
      const searchFields = [
        cap.name,
        cap.tag,
        cap.serviceName,
        cap.tagline,
        cap.whatItDoes,
        cap.categoryLabel,
        ...(cap.workflowChain || [])
      ].map(s => (s || '').toLowerCase());

      const matchesSearch = searchFields.some(field => 
        field.includes(q) || field.replace(/[-_\s]/g, '').includes(qNormalized)
      );

      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Category Icon Helper
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'optimization':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'chemistry':
        return <Atom className="w-5 h-5 text-emerald-400" />;
      case 'algorithms':
        return <Cpu className="w-5 h-5 text-sky-400" />;
      case 'circuit':
        return <Code2 className="w-5 h-5 text-purple-400" />;
      case 'qml':
        return <Activity className="w-5 h-5 text-indigo-400" />;
      case 'academy':
        return <BookOpen className="w-5 h-5 text-blue-400" />;
      case 'qpu_simulators':
        return <Server className="w-5 h-5 text-teal-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-sky-400" />;
    }
  };

  // Open Live Sandbox Modal for a capability
  const handleOpenSandbox = (cap: QuantumCapability) => {
    setSelectedCapability(cap);
    setSandboxInput(cap.sampleInput);
    setSandboxOutput(null);
    setIsSandboxModalOpen(true);
  };

  // Run live simulation on FastAPI backend
  const handleRunSandbox = async () => {
    if (!selectedCapability) return;
    setIsExecutingSandbox(true);
    setSandboxOutput(null);

    try {
      const res = await fetch(`${getBackendUrl()}/v3/enterprise/ide/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: 'marketplace-sandbox',
          user_message: sandboxInput || selectedCapability.sampleInput,
          active_file: 'main.py',
          file_content: '',
          target_backend: 'aer_simulator',
          optimization_level: 2,
          model_engine: 'groq'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSandboxOutput(data.response_text || selectedCapability.sampleOutput);
      } else {
        setSandboxOutput(selectedCapability.sampleOutput);
      }
    } catch (e) {
      setSandboxOutput(selectedCapability.sampleOutput);
    } finally {
      setIsExecutingSandbox(false);
    }
  };

  return (
    <div 
      style={{ backgroundColor: colors.bgMain, color: colors.textPrimary }}
      className="min-h-screen font-sans select-none antialiased flex flex-col transition-colors duration-150"
    >
      {/* Global CSS for crisp, visible hover lift & glow & button micro-interactions */}
      <style jsx global>{`
        .qg-card-hover {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease !important;
          will-change: transform, box-shadow;
        }
        .qg-card-hover:hover {
          transform: translateY(-3px) !important;
        }
        .qg-card-dark:hover {
          box-shadow: 0 16px 36px -6px rgba(51, 168, 219, 0.28), 0 0 12px 1px rgba(51, 168, 219, 0.2) !important;
          border-color: rgba(51, 168, 219, 0.6) !important;
        }
        .qg-card-light:hover {
          box-shadow: 0 16px 36px -6px rgba(15, 23, 42, 0.12), 0 4px 14px -2px rgba(51, 168, 219, 0.14) !important;
          border-color: rgba(51, 168, 219, 0.5) !important;
        }

        /* Option 3: Button Micro-Scale & Emerald Radial Halo */
        .qg-service-btn {
          transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease, background-color 0.18s ease, border-color 0.18s ease !important;
          will-change: transform, box-shadow;
          position: relative;
        }
        .qg-service-btn:hover {
          transform: scale(1.03) !important;
          background-color: rgba(47, 184, 133, 0.22) !important;
          border-color: rgba(47, 184, 133, 0.75) !important;
          box-shadow: 0 0 18px 3px rgba(47, 184, 133, 0.38), 0 2px 8px rgba(47, 184, 133, 0.2) !important;
        }
        .qg-service-btn:hover .qg-btn-chevron {
          transform: translateX(3px);
        }
        .qg-btn-chevron {
          transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP MARKETPLACE HEADER                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header 
        style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
        className="h-14 border-b backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 shrink-0 shadow-xs"
      >
        <div className="flex items-center gap-3">
          <Link href="/ide" className="flex items-center gap-2.5 group shrink-0">
            <div 
              style={{ width: '26px', height: '26px', minWidth: '26px', minHeight: '26px' }}
              className="rounded-full bg-white flex items-center justify-center p-0.5 shadow-xs overflow-hidden shrink-0"
            >
              <img 
                src="/qg-icon.png" 
                alt="Quantum Guru" 
                width={22}
                height={22}
                style={{ width: '22px', height: '22px', objectFit: 'contain', display: 'block' }}
                className="pointer-events-none"
              />
            </div>
            <span className="font-normal text-sm tracking-tight font-heading text-[#DDE2E8] shrink-0">
              Quantum Guru
            </span>
          </Link>
        </div>

        {/* Center: Main View Switcher */}
        <div 
          style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
          className="hidden md:flex items-center gap-1 p-1 border rounded-lg text-xs font-mono"
        >
          <button
            onClick={() => setActiveViewTab('explore')}
            style={{ 
              backgroundColor: activeViewTab === 'explore' ? colors.bgHeader : 'transparent',
              borderColor: activeViewTab === 'explore' ? colors.border : 'transparent',
              color: activeViewTab === 'explore' ? colors.textCyan : colors.textMuted
            }}
            className="px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 border"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore Capabilities</span>
          </button>
          <button
            onClick={() => setActiveViewTab('workflows')}
            style={{ 
              backgroundColor: activeViewTab === 'workflows' ? colors.bgHeader : 'transparent',
              borderColor: activeViewTab === 'workflows' ? colors.border : 'transparent',
              color: activeViewTab === 'workflows' ? colors.textCyan : colors.textMuted
            }}
            className="px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 border"
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Prebuilt Workflows (6)</span>
          </button>
          <button
            onClick={() => setActiveViewTab('topology')}
            style={{ 
              backgroundColor: activeViewTab === 'topology' ? colors.bgHeader : 'transparent',
              borderColor: activeViewTab === 'topology' ? colors.border : 'transparent',
              color: activeViewTab === 'topology' ? colors.textCyan : colors.textMuted
            }}
            className="px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 border"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Capability Topology</span>
          </button>
        </div>

        {/* Right: Theme Toggle & Link back to IDE */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
            style={{ 
              backgroundColor: colors.bgPill, 
              borderColor: colors.border,
              color: colors.textAmber
            }}
            className="p-1.5 rounded-lg border transition-colors cursor-pointer hover:border-amber-400"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono" style={{ color: colors.textMuted }}>
                {user.name || user.email}
              </span>
              <button
                onClick={handleOpenIDE}
                style={{
                  backgroundColor: isDark ? 'rgba(51, 168, 219, 0.1)' : 'rgba(51, 168, 219, 0.08)',
                  borderColor: 'rgba(51, 168, 219, 0.4)',
                  color: colors.textCyan
                }}
                className="px-3.5 py-1.5 rounded-lg border text-xs font-mono hover:opacity-80 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Open in IDE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}
                style={{ color: colors.textMuted }}
                className="px-2.5 py-1.5 text-xs font-mono hover:opacity-80 transition-opacity cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={handleOpenIDE}
                style={{
                  backgroundColor: isDark ? 'rgba(51, 168, 219, 0.1)' : 'rgba(51, 168, 219, 0.08)',
                  borderColor: 'rgba(51, 168, 219, 0.4)',
                  color: colors.textCyan
                }}
                className="px-3.5 py-1.5 rounded-lg border text-xs font-mono hover:opacity-80 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Open in IDE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1ST FOLD: HERO & INTENT SEARCH (VERTICALLY CENTERED)          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section 
        style={{ 
          borderColor: colors.border,
          backgroundColor: colors.bgHeader
        }}
        className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-between px-6 py-12 border-b shrink-0 transition-colors relative"
      >
        <div className="w-full" />

        {/* Center Container */}
        <div className="max-w-3xl w-full text-center space-y-6 my-auto">
          <h1 className="text-3xl md:text-5xl font-normal font-heading tracking-tight leading-tight" style={{ color: colors.textPrimary }}>
            Explore Autonomous Quantum Computing & Simulation Services
          </h1>

          {/* Search Input Box */}
          <div className="pt-2 max-w-2xl mx-auto relative">
            <div className="relative flex items-center shadow-lg rounded-2xl">
              <Search className="w-4 h-4 absolute left-4 pointer-events-none" style={{ color: colors.textMuted }} />
              <input
                type="text"
                placeholder="What do you want to accomplish? (e.g. Optimize portfolio, CAS-VQE for H2, Grover Search)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                style={{ 
                  backgroundColor: colors.bgCard, 
                  borderColor: colors.border,
                  color: colors.textPrimary 
                }}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm font-mono outline-hidden focus:border-sky-500 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  style={{ color: colors.textMuted }}
                  className="absolute right-4 hover:opacity-80 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Popular Goal Chips */}
            <div className="flex items-center justify-center gap-2 flex-wrap pt-4 text-xs font-mono">
              <span style={{ color: colors.textMuted }}>Popular goals:</span>
              <button 
                onClick={() => { 
                  setSearchQuery('portfolio'); 
                  setSelectedCategory('optimization'); 
                  document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textCyan }}
                className="px-2.5 py-1 rounded-lg border hover:border-sky-500 transition-colors cursor-pointer"
              >
                Optimize a business problem
              </button>
              <button 
                onClick={() => { 
                  setSearchQuery('vqe'); 
                  setSelectedCategory('chemistry'); 
                  document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textEmerald }}
                className="px-2.5 py-1 rounded-lg border hover:border-emerald-500 transition-colors cursor-pointer"
              >
                Solve molecular chemistry
              </button>
              <button 
                onClick={() => { 
                  setSearchQuery('grover'); 
                  setSelectedCategory('algorithms'); 
                  document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textAmber }}
                className="px-2.5 py-1 rounded-lg border hover:border-amber-500 transition-colors cursor-pointer"
              >
                Design a quantum algorithm
              </button>
              <button 
                onClick={() => { 
                  setSearchQuery('qsvm'); 
                  setSelectedCategory('qml'); 
                  document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textSkyBlue }}
                className="px-2.5 py-1 rounded-lg border hover:border-blue-500 transition-colors cursor-pointer"
              >
                Train a QML model
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Fold Indicator */}
        <div className="pt-8 flex flex-col items-center">
          <button
            onClick={() => document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ color: colors.textMuted }}
            className="flex flex-col items-center gap-1.5 text-xs font-mono hover:text-sky-400 transition-colors cursor-pointer group"
          >
            <span>Explore Capabilities Below</span>
            <ChevronDown className="w-4 h-4 animate-bounce" style={{ color: colors.textCyan }} />
          </button>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2ND FOLD: STICKY CATEGORY FILTER BAR & CAPABILITY CATALOG     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div id="catalog-section" className="scroll-mt-14" />
      <section 
        style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
        className="border-b px-6 py-3 sticky top-14 z-20 transition-colors shadow-xs backdrop-blur-md"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${selectedCategory === 'all' ? 'bg-[#181818] border-[#33A8DB] text-[#33A8DB]' : 'border-transparent text-[#808D9E] hover:text-[#DDE2E8]'}`}
            >
              All Capabilities
            </button>
            <button
              onClick={() => setSelectedCategory('optimization')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${selectedCategory === 'optimization' ? 'bg-[#181818] border-[#DEAA21] text-[#DEAA21]' : 'border-transparent text-[#808D9E] hover:text-[#DDE2E8]'}`}
            >
              <Zap className="w-3.5 h-3.5 text-[#DEAA21]" />
              <span>Optimization ({CAPABILITIES.filter(c => c.category === 'optimization').length})</span>
            </button>
            <button
              onClick={() => setSelectedCategory('algorithms')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${selectedCategory === 'algorithms' ? 'bg-[#181818] border-[#33A8DB] text-[#33A8DB]' : 'border-transparent text-[#808D9E] hover:text-[#DDE2E8]'}`}
            >
              <Cpu className="w-3.5 h-3.5 text-[#33A8DB]" />
              <span>Algorithms (5)</span>
            </button>
            <button
              onClick={() => setSelectedCategory('circuit')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${selectedCategory === 'circuit' ? 'bg-[#181818] border-[#5390DD] text-[#5390DD]' : 'border-transparent text-[#808D9E] hover:text-[#DDE2E8]'}`}
            >
              <Code2 className="w-3.5 h-3.5 text-[#5390DD]" />
              <span>Circuits (5)</span>
            </button>
            <button
              onClick={() => setSelectedCategory('chemistry')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${selectedCategory === 'chemistry' ? 'bg-[#181818] border-[#2FB885] text-[#2FB885]' : 'border-transparent text-[#808D9E] hover:text-[#DDE2E8]'}`}
            >
              <Atom className="w-3.5 h-3.5 text-[#2FB885]" />
              <span>Chemistry (6)</span>
            </button>
            <button
              onClick={() => setSelectedCategory('qml')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${selectedCategory === 'qml' ? 'bg-[#181818] border-[#33A8DB] text-[#33A8DB]' : 'border-transparent text-[#808D9E] hover:text-[#DDE2E8]'}`}
            >
              <Activity className="w-3.5 h-3.5 text-[#33A8DB]" />
              <span>Quantum ML (6)</span>
            </button>
            <button
              onClick={() => setSelectedCategory('academy')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${selectedCategory === 'academy' ? 'bg-[#181818] border-[#DEAA21] text-[#DEAA21]' : 'border-transparent text-[#808D9E] hover:text-[#DDE2E8]'}`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#DEAA21]" />
              <span>Academy (5)</span>
            </button>
            <button
              onClick={() => setSelectedCategory('qpu_simulators')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${selectedCategory === 'qpu_simulators' ? 'bg-[#181818] border-[#33A8DB] text-[#33A8DB]' : 'border-transparent text-[#808D9E] hover:text-[#DDE2E8]'}`}
            >
              <Server className="w-3.5 h-3.5 text-[#33A8DB]" />
              <span>QPU / Simulators (3)</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-[#808D9E] shrink-0">
            Showing <span className="text-[#33A8DB]">{filteredCapabilities.length}</span> of {CAPABILITIES.length} services
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN CONTENT VIEWS                                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        
        {/* ── VIEW 1: EXPLORE CAPABILITIES (CARD GRID) ── */}
        {activeViewTab === 'explore' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCapabilities.map((cap) => (
                <div
                  key={cap.id}
                  style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                  className={`rounded-xl border p-5 flex flex-col justify-between space-y-4 qg-card-hover group relative cursor-pointer ${
                    isDark ? 'qg-card-dark' : 'qg-card-light'
                  }`}
                >
                  {/* Top: Category Tag & Credits (Left) + I Need This Service Button (Right) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span 
                          style={{ 
                            color: colors.textCyan, 
                            borderColor: 'rgba(51, 168, 219, 0.35)', 
                            backgroundColor: 'rgba(51, 168, 219, 0.08)' 
                          }}
                          className="px-2 py-0.5 rounded border font-mono text-[10px]"
                        >
                          {cap.categoryLabel}
                        </span>

                        {/* Credits Cost Pill */}
                        <span 
                          style={{ 
                            color: colors.textAmber, 
                            borderColor: 'rgba(222, 170, 33, 0.35)', 
                            backgroundColor: 'rgba(222, 170, 33, 0.08)' 
                          }}
                          className="px-2 py-0.5 rounded border font-mono text-[10px] flex items-center gap-1"
                        >
                          <Coins className="w-2.5 h-2.5" style={{ color: colors.textAmber }} />
                          <span>{cap.credits} Credits</span>
                        </span>
                      </div>

                      {/* I Need This Service Button in Top Right (Option 3: Scale + Radial Halo) */}
                      <button
                        onClick={() => handleOpenSandbox(cap)}
                        style={{ 
                          backgroundColor: 'rgba(47, 184, 133, 0.1)', 
                          borderColor: 'rgba(47, 184, 133, 0.4)', 
                          color: colors.textEmerald 
                        }}
                        className="qg-service-btn px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <span>I need this service</span>
                        <ChevronRight className="w-3 h-3 qg-btn-chevron" style={{ color: colors.textEmerald }} />
                      </button>
                    </div>

                    {/* Service Title */}
                    <div>
                      <h3 className="text-sm font-normal font-heading" style={{ color: colors.textPrimary }}>
                        <span className="group-hover:text-sky-400 transition-colors">{cap.name}</span>
                      </h3>
                    </div>

                    {/* Tagline / What it does */}
                    <p className="text-xs leading-relaxed" style={{ color: colors.textMuted }}>
                      {cap.tagline}
                    </p>
                  </div>

                  {/* Input / Output Specs */}
                  <div 
                    style={{ borderColor: colors.border }}
                    className="space-y-2 pt-3 border-t text-[11px] font-mono"
                  >
                    <div>
                      <span style={{ color: colors.textCyan }} className="text-[10px] uppercase">Input: </span>
                      <span style={{ color: colors.textMuted }}>{cap.youProvide[0]}</span>
                    </div>
                    <div>
                      <span style={{ color: colors.textEmerald }} className="text-[10px] uppercase">Output: </span>
                      <span style={{ color: colors.textMuted }}>{cap.youReceive[0]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredCapabilities.length === 0 && (
              <div className="text-center py-16 space-y-2 border border-dashed border-[#222222] rounded-2xl">
                <p className="text-sm text-[#808D9E] font-mono">No quantum capabilities match "{searchQuery}"</p>
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                  className="text-xs text-[#33A8DB] underline cursor-pointer"
                >
                  Clear search filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── VIEW 2: PREBUILT COMPOSED WORKFLOWS ── */}
        {activeViewTab === 'workflows' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PREBUILT_WORKFLOWS.map((wf) => (
                <div 
                  key={wf.id}
                  style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                  className={`rounded-xl border p-6 space-y-4 qg-card-hover cursor-pointer ${
                    isDark ? 'qg-card-dark' : 'qg-card-light'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#33A8DB]/40 text-[#33A8DB] bg-[#33A8DB]/10">
                      {wf.category}
                    </span>
                    <span className="text-[10px] font-mono text-[#2FB885]">
                      {wf.priceTag}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-normal font-heading text-[#DDE2E8]">
                      {wf.title}
                    </h3>
                    <p className="text-xs text-[#808D9E] leading-relaxed pt-1.5">
                      {wf.description}
                    </p>
                  </div>

                  {/* 5-Step Workflow DAG Diagram */}
                  <div className="space-y-1.5 pt-2 border-t border-[#222222]">
                    <span className="text-[10px] font-mono text-[#33A8DB] uppercase tracking-wider">
                      Composed Execution Chain ({wf.steps.length} Services):
                    </span>
                    <div className="flex items-center flex-wrap gap-1.5 pt-1">
                      {wf.steps.map((step, idx) => (
                        <React.Fragment key={idx}>
                          <span className="text-[10px] font-mono px-2 py-1 rounded border border-[#222222] bg-[#181818] text-[#DDE2E8]">
                            {step}
                          </span>
                          {idx < wf.steps.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-[#DEAA21] shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] font-mono space-y-1 pt-2 border-t border-[#222222]">
                    <div>
                      <span className="text-[#808D9E]">Ideal for: </span>
                      <span className="text-[#DDE2E8]">{wf.idealFor}</span>
                    </div>
                    <div>
                      <span className="text-[#2FB885]">Outcome: </span>
                      <span className="text-[#808D9E]">{wf.outcome}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={handleOpenIDE}
                      className="w-full py-2 rounded-lg border border-[#33A8DB]/50 bg-[#33A8DB]/10 text-[#33A8DB] text-xs font-mono hover:bg-[#33A8DB]/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <Play className="w-3.5 h-3.5 text-[#DEAA21]" />
                      <span>Run Composed Workflow in IDE</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VIEW 3: CAPABILITY TOPOLOGY MAP ── */}
        {activeViewTab === 'topology' && (
          <div className="rounded-xl border border-[#222222] bg-[#141414] p-8 space-y-6">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <h2 className="text-lg font-normal font-heading text-[#DDE2E8]">
                Quantum Guru Ecosystem Topology
              </h2>
              <p className="text-xs text-[#808D9E] leading-relaxed font-mono">
                Deterministic and probabilistic quantum primitives mapped across 7 scientific domains.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3 pt-4">
              {['optimization', 'algorithms', 'circuit', 'chemistry', 'qml', 'academy', 'qpu_simulators'].map((domainKey) => {
                const title = domainKey === 'qpu_simulators' ? 'QPU / Simulators' : domainKey.charAt(0).toUpperCase() + domainKey.slice(1);
                const domainCaps = CAPABILITIES.filter(c => c.category === domainKey);
                
                return (
                  <div key={domainKey} className="rounded-lg border border-[#222222] bg-[#181818] p-3 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
                      <span className="text-xs font-mono text-[#33A8DB]">{title}</span>
                      <span className="text-[10px] font-mono text-[#808D9E]">({domainCaps.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {domainCaps.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleOpenSandbox(c)}
                          className="w-full text-left p-1.5 rounded text-[10px] font-mono border border-transparent hover:border-[#33A8DB]/50 hover:bg-[#141414] transition-all truncate text-[#DDE2E8] block cursor-pointer"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INTERACTIVE CAPABILITY DETAIL & LIVE SANDBOX RUNNER MODAL     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isSandboxModalOpen && selectedCapability && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-hidden">
          <div 
            style={{ 
              backgroundColor: colors.bgCard, 
              borderColor: colors.border,
              color: colors.textPrimary,
              maxHeight: 'calc(100vh - 2.5rem)',
              height: 'auto'
            }}
            className="w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col overflow-hidden font-sans relative"
          >
            {/* Modal Header */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="px-5 py-3.5 border-b flex items-center justify-between shrink-0"
            >
              <div className="flex items-center gap-3.5">
                <div 
                  style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
                  className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-xs"
                >
                  {getCategoryIcon(selectedCapability.category)}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold tracking-tight" style={{ color: colors.textPrimary }}>
                      {selectedCapability.name}
                    </h3>
                    <span 
                      style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textCyan }}
                      className="text-[11px] font-sans px-2.5 py-0.5 rounded-md border font-medium"
                    >
                      {selectedCapability.categoryLabel}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    {selectedCapability.serviceName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div 
                  style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textMuted }}
                  className="hidden sm:flex items-center gap-1.5 text-[11px] font-sans px-2.5 py-1 rounded-lg border font-medium"
                >
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>{selectedCapability.executionTime}</span>
                </div>
                <button
                  onClick={() => setIsSandboxModalOpen(false)}
                  style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textMuted }}
                  className="w-8 h-8 rounded-lg border flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-3.5 text-xs font-sans overscroll-contain">
              
              {/* What it does */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold" style={{ color: colors.textCyan }}>
                  What it does
                </div>
                <p className="text-xs leading-relaxed" style={{ color: colors.textPrimary }}>
                  {selectedCapability.whatItDoes}
                </p>
              </div>

              {/* Provide & Receive Specs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* You Provide */}
                <div 
                  style={{ backgroundColor: colors.bgMain, borderColor: colors.border }}
                  className="p-4 rounded-xl border space-y-2.5"
                >
                  <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: colors.textCyan }}>
                    <span>You provide</span>
                  </div>
                  <ul className="space-y-1.5 text-xs" style={{ color: colors.textMuted }}>
                    {selectedCapability.youProvide.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                        <span className="leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* You Receive */}
                <div 
                  style={{ backgroundColor: colors.bgMain, borderColor: colors.border }}
                  className="p-4 rounded-xl border space-y-2.5"
                >
                  <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: colors.textEmerald }}>
                    <span>You receive</span>
                  </div>
                  <ul className="space-y-1.5 text-xs" style={{ color: colors.textMuted }}>
                    {selectedCapability.youReceive.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Composable Workflow DAG Node Chain */}
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: colors.border }}>
                <div className="text-xs font-semibold" style={{ color: colors.textAmber }}>
                  Composable workflow pipeline
                </div>
                <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                  {selectedCapability.workflowChain.map((node, i) => {
                    const isCurrent = node === selectedCapability.name;
                    return (
                      <React.Fragment key={i}>
                        <span 
                          style={{
                            backgroundColor: isCurrent ? 'rgba(51, 168, 219, 0.15)' : colors.bgPill,
                            borderColor: isCurrent ? colors.textCyan : colors.border,
                            color: isCurrent ? colors.textCyan : colors.textMuted
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] border font-sans font-medium transition-colors ${isCurrent ? 'ring-1 ring-sky-400/50' : ''}`}
                        >
                          {node}
                        </span>
                        {i < selectedCapability.workflowChain.length - 1 && (
                          <ChevronRight className="w-3.5 h-3.5" style={{ color: colors.textMuted }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Live Interactive Sandbox Execution Input */}
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: colors.border }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: colors.textCyan }}>
                    Live sandbox input
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textMuted }}>
                    API Gateway: 8002
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={sandboxInput}
                  onChange={(e) => setSandboxInput(e.target.value)}
                  style={{ backgroundColor: colors.bgMain, borderColor: colors.border, color: colors.textPrimary }}
                  className="w-full p-3 rounded-xl border text-xs font-mono outline-hidden focus:border-sky-400 resize-none transition-colors"
                  placeholder="Enter problem or dataset parameters..."
                />
              </div>

              {/* Output Preview */}
              {sandboxOutput && (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: colors.border }}>
                  <span className="text-xs font-semibold" style={{ color: colors.textEmerald }}>
                    Execution output
                  </span>
                  <pre 
                    style={{ backgroundColor: colors.bgMain, borderColor: colors.border, color: colors.textPrimary }}
                    className="p-3 rounded-xl border text-xs font-mono whitespace-pre-wrap max-h-28 overflow-y-auto leading-relaxed shadow-inner"
                  >
                    {sandboxOutput}
                  </pre>
                </div>
              )}

            </div>

            {/* Modal Footer Actions */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="px-5 py-3.5 border-t flex items-center justify-between shrink-0 mt-auto"
            >
              <button
                onClick={handleOpenIDE}
                style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}
                className="px-3.5 py-2 rounded-xl border hover:opacity-80 transition-opacity text-xs font-sans font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Open in IDE</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsSandboxModalOpen(false)}
                  style={{ backgroundColor: 'transparent', borderColor: colors.border, color: colors.textMuted }}
                  className="px-3.5 py-2 rounded-xl border hover:opacity-80 transition-opacity text-xs font-sans font-medium cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleRunSandbox}
                  disabled={isExecutingSandbox}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white text-xs font-sans font-medium shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isExecutingSandbox ? (
                    <>
                      <Zap className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing service...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Run service now</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* AUTHENTICATION MODAL (LOGIN / REGISTER)                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
            className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="px-6 py-4 border-b flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div 
                  style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
                  className="w-7 h-7 rounded-lg border flex items-center justify-center"
                >
                  <Lock className="w-3.5 h-3.5" style={{ color: colors.textCyan }} />
                </div>
                <div>
                  <h3 className="text-sm font-normal font-heading" style={{ color: colors.textPrimary }}>
                    {authMode === 'login' ? 'Sign In to Quantum Guru' : 'Create Your Account'}
                  </h3>
                  <p className="text-[11px] font-mono" style={{ color: colors.textMuted }}>
                    Access Quantum Cursor IDE & {CAPABILITIES.length} capabilities
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAuthModalOpen(false)}
                style={{ color: colors.textMuted }}
                className="w-7 h-7 rounded-lg border flex items-center justify-center hover:opacity-80 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleAuthSubmit} className="p-6 space-y-4 text-xs font-mono">
              {authError && (
                <div className="p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-mono">
                  {authError}
                </div>
              )}

              {authMode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase" style={{ color: colors.textCyan }}>First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Richard"
                      value={authFirstName}
                      onChange={(e) => setAuthFirstName(e.target.value)}
                      style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}
                      className="w-full px-3 py-2 rounded-lg border text-xs font-mono outline-hidden focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase" style={{ color: colors.textCyan }}>Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Feynman"
                      value={authLastName}
                      onChange={(e) => setAuthLastName(e.target.value)}
                      style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}
                      className="w-full px-3 py-2 rounded-lg border text-xs font-mono outline-hidden focus:border-sky-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase" style={{ color: colors.textCyan }}>Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="w-3.5 h-3.5 absolute left-3 pointer-events-none" style={{ color: colors.textMuted }} />
                  <input
                    type="email"
                    required
                    placeholder="name@quantum-corp.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs font-mono outline-hidden focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase" style={{ color: colors.textCyan }}>Password</label>
                <div className="relative flex items-center">
                  <Key className="w-3.5 h-3.5 absolute left-3 pointer-events-none" style={{ color: colors.textMuted }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs font-mono outline-hidden focus:border-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                style={{ backgroundColor: colors.textCyan, color: '#0D0D0D' }}
                className="w-full py-2.5 rounded-lg text-xs font-mono font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer mt-2 disabled:opacity-50"
              >
                {isAuthLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{authMode === 'login' ? 'Sign In & Open IDE' : 'Create Account & Open IDE'}</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2 border-t" style={{ borderColor: colors.border }}>
                {authMode === 'login' ? (
                  <p className="text-[11px] font-mono" style={{ color: colors.textMuted }}>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                      style={{ color: colors.textCyan }}
                      className="underline hover:opacity-80 cursor-pointer"
                    >
                      Register now
                    </button>
                  </p>
                ) : (
                  <p className="text-[11px] font-mono" style={{ color: colors.textMuted }}>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setAuthError(''); }}
                      style={{ color: colors.textCyan }}
                      className="underline hover:opacity-80 cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FOOTER                                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <footer 
        style={{ backgroundColor: colors.bgHeader, borderColor: colors.border, color: colors.textMuted }}
        className="h-10 border-t px-6 flex items-center justify-between text-[11px] font-mono shrink-0 transition-colors"
      >
        <div>
          <span>Quantum Guru Marketplace • Autonomous Capabilities</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/ide" className="text-[#33A8DB] hover:underline">Quantum Cursor IDE</Link>
          <span>•</span>
          <span>FastAPI Gateway: 8002</span>
        </div>
      </footer>

    </div>
  );
}
