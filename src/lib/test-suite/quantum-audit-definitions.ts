/**
 * quantum-audit-definitions.ts
 * Benchmark Catalog & Analytical Ground Truths for 20 QUBO & 20 Qiskit Circuit Audits.
 */

export interface QuboGroundTruth {
    optimalEnergy: number;
    tolerance: number;
    expectedVariables: number;
    description: string;
    verifySolution?: (sample: Record<string, number>) => { valid: boolean; reason?: string };
}

export interface QiskitGroundTruth {
    qubitCount: number;
    requiredGates: string[];
    maxDepth?: number;
    idealProbabilities: Record<string, number>;
    tolerance: number;
    description: string;
}

export interface QuantumAuditDefinition {
    id: string;
    type: 'qubo' | 'qiskit';
    title: string;
    domain: string;
    prompt: string;
    quboTruth?: QuboGroundTruth;
    qiskitTruth?: QiskitGroundTruth;
}

export interface QuantumAuditResultItem {
    id: string;
    type: 'qubo' | 'qiskit';
    title: string;
    passed: boolean;
    accuracyScore: number; // 0 to 100%
    energyGap?: number;
    fidelity?: number;
    generatedCode: string;
    explanation: string;
    durationMs: number;
    retries429: number;
    backoffWaitMs: number;
    details: {
        codeValid: boolean;
        syntaxError?: string;
        simulatedOutput?: any;
        assertions: { name: string; passed: boolean; actual?: any; expected?: any; message?: string }[];
    };
}

export interface QuantumAuditSummary {
    totalTests: number;
    passedTests: number;
    averageAccuracy: number;
    totalDurationMs: number;
    rateLimitStats: {
        total429s: number;
        successfulRetries: number;
        totalBackoffWaitMs: number;
    };
    quboStats: {
        count: number;
        passed: number;
        averageEnergyAccuracy: number;
    };
    qiskitStats: {
        count: number;
        passed: number;
        averageFidelity: number;
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 20 QUBO BENCHMARK DEFINITIONS (Analytical Ground Truths)
// ─────────────────────────────────────────────────────────────────────────────
export const QUBO_BENCHMARKS: QuantumAuditDefinition[] = [
    {
        id: 'QUBO-01',
        type: 'qubo',
        title: "Max-Cut on Triangle Graph K3",
        domain: 'Graph Theory',
        prompt: "Formulate a QUBO for the Max-Cut problem on a 3-node triangle graph (K3) with edges (0,1), (1,2), (0,2). Write complete Python code using dimod and SimulatedAnnealingSampler to find the maximum cut.",
        quboTruth: {
            optimalEnergy: -2.0,
            tolerance: 0.1,
            expectedVariables: 3,
            description: "In K3, maximum cut cuts 2 edges out of 3, leaving 1 uncut edge. Ising energy = -2.0."
        }
    },
    {
        id: 'QUBO-02',
        type: 'qubo',
        title: "Max-Cut on 5-Cycle Graph C5",
        domain: 'Graph Theory',
        prompt: "Create a QUBO to solve Max-Cut on a 5-node cycle graph C5 with edges (0,1), (1,2), (2,3), (3,4), (4,0). Write Python code using dimod to sample the maximum cut.",
        quboTruth: {
            optimalEnergy: -4.0,
            tolerance: 0.2,
            expectedVariables: 5,
            description: "In an odd cycle of length 5, the maximum cut has 4 cut edges and 1 uncut edge. Optimal energy is -4.0."
        }
    },
    {
        id: 'QUBO-03',
        type: 'qubo',
        title: "Maximum Independent Set on C4 Graph",
        domain: 'Graph Theory',
        prompt: "Formulate a QUBO for Maximum Independent Set (MIS) on a 4-node square cycle graph C4 with edges (0,1), (1,2), (2,3), (3,0). Reward selected vertices and penalize adjacent selections with lambda=2.0.",
        quboTruth: {
            optimalEnergy: -2.0,
            tolerance: 0.1,
            expectedVariables: 4,
            description: "Maximum independent set size is 2 (opposite vertices {0,2} or {1,3}). Minimum objective energy is -2.0."
        }
    },
    {
        id: 'QUBO-04',
        type: 'qubo',
        title: "Minimum Vertex Cover on Star Graph K1,4",
        domain: 'Graph Theory',
        prompt: "Formulate a QUBO for Minimum Vertex Cover (MVC) on a 5-node star graph with center 0 and leaves 1, 2, 3, 4. Objective: minimize total selected vertices while covering every edge.",
        quboTruth: {
            optimalEnergy: 1.0,
            tolerance: 0.1,
            expectedVariables: 5,
            description: "Optimal vertex cover selects only the center node 0 (size 1). Leaves {1,2,3,4} remain unselected."
        }
    },
    {
        id: 'QUBO-05',
        type: 'qubo',
        title: "Graph 3-Coloring on Triangle Graph",
        domain: 'Constraint Satisfaction',
        prompt: "Formulate a QUBO for 3-coloring a 3-node triangle graph (nodes 0, 1, 2). Each node must have exactly one color out of {R, G, B} and adjacent nodes cannot share colors. Write Python code using dimod.",
        quboTruth: {
            optimalEnergy: 0.0,
            tolerance: 0.05,
            expectedVariables: 9,
            description: "A 3-colorable triangle has zero constraint violations. Ground state energy with zero penalty is 0.0."
        }
    },
    {
        id: 'QUBO-06',
        type: 'qubo',
        title: "Number Partitioning on {3, 1, 1, 2, 2, 1}",
        domain: 'Number Theory',
        prompt: "Solve the Number Partitioning problem for the multiset S = [3, 1, 1, 2, 2, 1] using a QUBO. Total sum is 10, so each partition must sum to 5. Formulate as (sum(s_i * x_i) - 5)^2 and find the ground state in dimod.",
        quboTruth: {
            optimalEnergy: 0.0,
            tolerance: 0.01,
            expectedVariables: 6,
            description: "Exact partition exists: {3, 2} and {1, 1, 2, 1}, both sum to 5. The minimum squared deviation energy is exactly 0.0."
        }
    },
    {
        id: 'QUBO-07',
        type: 'qubo',
        title: "Number Partitioning on {4, 5, 6, 7, 8}",
        domain: 'Number Theory',
        prompt: "Formulate a QUBO for partitioning the integers [4, 5, 6, 7, 8] into two subsets with minimal sum difference. Total sum is 30, target is 15 each. Minimize (sum(s_i * x_i) - 15)^2.",
        quboTruth: {
            optimalEnergy: 0.0,
            tolerance: 0.01,
            expectedVariables: 5,
            description: "Exact partition exists: {7, 8} = 15 and {4, 5, 6} = 15. The optimal squared difference energy is 0.0."
        }
    },
    {
        id: 'QUBO-08',
        type: 'qubo',
        title: "0/1 Knapsack with 3 Items & Weight Limit",
        domain: 'Operations Research',
        prompt: "Formulate a QUBO for 0/1 Knapsack: Item 0 (val=10, wt=2), Item 1 (val=15, wt=3), Item 2 (val=25, wt=5). Capacity limit is 5. Maximize value while respecting weight limit with quadratic penalty. Write Python dimod script.",
        quboTruth: {
            optimalEnergy: -25.0,
            tolerance: 1.0,
            expectedVariables: 3,
            description: "Best valid selection is Item 2 (wt 5, val 25) or Item 0 + Item 1 (wt 5, val 25). Net optimal energy is -25.0."
        }
    },
    {
        id: 'QUBO-09',
        type: 'qubo',
        title: "Exact Set Cover on 3 Sets",
        domain: 'Combinatorics',
        prompt: "Formulate an Exact Cover QUBO: Universe U = {1, 2, 3}. Sets: S0 = {1, 2}, S1 = {2, 3}, S2 = {3}, S3 = {1}. Find a subset of sets covering each element exactly once. Write Python code with dimod.",
        quboTruth: {
            optimalEnergy: 0.0,
            tolerance: 0.05,
            expectedVariables: 4,
            description: "Exact disjoint cover is S0={1,2} and S2={3}, or S3={1} and S1={2,3}. Zero constraint violation energy = 0.0."
        }
    },
    {
        id: 'QUBO-10',
        type: 'qubo',
        title: "Traveling Salesperson Problem (3 Cities)",
        domain: 'Routing & Logistics',
        prompt: "Formulate a 3-city TSP as a QUBO with binary variables x_{i,t} indicating city i visited at step t (3x3=9 variables). Distances: d(0,1)=10, d(1,2)=15, d(0,2)=20. Symmetric distance tour. Write Python dimod script.",
        quboTruth: {
            optimalEnergy: 45.0,
            tolerance: 2.0,
            expectedVariables: 9,
            description: "Unique tour 0 -> 1 -> 2 -> 0 has total length 10 + 15 + 20 = 45. Ground state represents valid permutation of length 45."
        }
    },
    {
        id: 'QUBO-11',
        type: 'qubo',
        title: "2-Job 2-Machine Task Scheduling",
        domain: 'Scheduling',
        prompt: "Create a QUBO for scheduling 2 jobs on 1 shared machine across 2 time slots {t=0, t=1}. Each job must run in exactly one slot, and at most one job per slot. Write Python code using dimod.",
        quboTruth: {
            optimalEnergy: 0.0,
            tolerance: 0.05,
            expectedVariables: 4,
            description: "Valid non-overlapping schedule puts Job 1 in slot 0 and Job 2 in slot 1 (or vice versa). Penalty energy = 0.0."
        }
    },
    {
        id: 'QUBO-12',
        type: 'qubo',
        title: "Portfolio Optimization (3 Assets, Risk vs Return)",
        domain: 'Quantitative Finance',
        prompt: "Formulate Markowitz Portfolio Optimization as a QUBO for 3 assets with expected returns mu = [0.12, 0.10, 0.07] and covariance matrix Sigma = [[0.04, 0.01, 0.0], [0.01, 0.03, 0.0], [0.0, 0.0, 0.02]]. Minimize w^T Sigma w - q * mu^T w with exactly 2 assets chosen (sum w_i = 2, q=1.0).",
        quboTruth: {
            optimalEnergy: -0.16,
            tolerance: 0.05,
            expectedVariables: 3,
            description: "Balancing high expected return with low variance choosing 2 assets out of 3."
        }
    },
    {
        id: 'QUBO-13',
        type: 'qubo',
        title: "Currency Arbitrage Detection via QUBO",
        domain: 'Quantitative Finance',
        prompt: "Formulate foreign exchange arbitrage as an energy minimization problem on 3 currencies (USD, EUR, GBP) using negative log exchange rates. Write Python dimod code to find if an arbitrage cycle exists.",
        quboTruth: {
            optimalEnergy: -0.05,
            tolerance: 0.08,
            expectedVariables: 6,
            description: "Negative energy state signifies a profitable arbitrage cycle where product of exchange rates > 1."
        }
    },
    {
        id: 'QUBO-14',
        type: 'qubo',
        title: "Warehouse Facility Location Problem",
        domain: 'Supply Chain',
        prompt: "Formulate a Facility Location QUBO: 2 candidate warehouse locations {W1, W2} to serve 3 retail stores {S1, S2, S3}. Fixed opening costs and transport costs from open warehouse to stores. Write Python dimod code.",
        quboTruth: {
            optimalEnergy: 12.0,
            tolerance: 1.5,
            expectedVariables: 5,
            description: "Opening the single lower-cost warehouse that minimizes combined opening and transport costs."
        }
    },
    {
        id: 'QUBO-15',
        type: 'qubo',
        title: "Traffic Signal Green Phase Optimization",
        domain: 'Smart Cities',
        prompt: "Formulate a 4-way intersection traffic signal scheduler as a QUBO: maximize total throughput for North-South and East-West flows while strictly penalizing conflicting simultaneous green phases. Write Python dimod code.",
        quboTruth: {
            optimalEnergy: -14.0,
            tolerance: 1.5,
            expectedVariables: 4,
            description: "Non-conflicting orthogonal green phase with maximum queued traffic throughput."
        }
    },
    {
        id: 'QUBO-16',
        type: 'qubo',
        title: "1D Ferromagnetic Ising Chain (4 Spins)",
        domain: 'Quantum Physics',
        prompt: "Formulate a 1D Ferromagnetic Ising model on 4 spins with uniform nearest-neighbor coupling J = -1.0: H = -sum_{i=0}^2 s_i s_{i+1}. Convert to QUBO binary variables x_i in {0,1} via s_i = 2*x_i - 1 and find ground state in dimod.",
        quboTruth: {
            optimalEnergy: -3.0,
            tolerance: 0.1,
            expectedVariables: 4,
            description: "Ground state is all spins aligned: |0000> or |1111>. Ising energy is -3.0 (3 ferromagnetic bonds satisfied)."
        }
    },
    {
        id: 'QUBO-17',
        type: 'qubo',
        title: "Frustrated Antiferromagnetic Ring (3 Spins)",
        domain: 'Quantum Physics',
        prompt: "Formulate a frustrated Antiferromagnetic Ising model on 3 spins in a ring with J = +1.0 for all edges: H = + (s0*s1 + s1*s2 + s2*s0). Convert to QUBO and solve in dimod.",
        quboTruth: {
            optimalEnergy: -1.0,
            tolerance: 0.1,
            expectedVariables: 3,
            description: "Geometrical frustration: only 2 bonds can be satisfied (-1 each), 1 is frustrated (+1). Ground state energy is -1.0."
        }
    },
    {
        id: 'QUBO-18',
        type: 'qubo',
        title: "Boolean 2-SAT Satisfiability via QUBO",
        domain: 'Logic & Boolean Satisfiability',
        prompt: "Formulate 2-SAT formula (x1 or not x2) and (not x1 or x2) as a QUBO penalty: (1 - x1)*x2 + x1*(1 - x2). Find the satisfying assignments that minimize the energy to 0. Write Python dimod code.",
        quboTruth: {
            optimalEnergy: 0.0,
            tolerance: 0.01,
            expectedVariables: 2,
            description: "Satisfying assignments x1=x2=0 and x1=x2=1 give exactly zero energy penalty."
        }
    },
    {
        id: 'QUBO-19',
        type: 'qubo',
        title: "Binary Linear System Solver (Ax = b)",
        domain: 'Linear Algebra',
        prompt: "Solve the binary linear system A x = b where A = [[1, 1, 0], [0, 1, 1]], b = [2, 1] by minimizing the quadratic residual ||A x - b||^2 for binary vector x in {0, 1}^3. Write Python dimod code.",
        quboTruth: {
            optimalEnergy: 0.0,
            tolerance: 0.01,
            expectedVariables: 3,
            description: "Unique binary solution x = [1, 1, 0] gives A*x = [2, 1] = b with residual 0.0."
        }
    },
    {
        id: 'QUBO-20',
        type: 'qubo',
        title: "Pegasus Hardware Embedding & Coupler Matrix",
        domain: 'D-Wave Architecture',
        prompt: "Construct a symmetric 4x4 QUBO matrix representing a BQM suitable for D-Wave Advantage Pegasus architecture. Define linear biases h = [-1, 2, -1, 1] and quadratic couplers J_{(0,1)}=-2, J_{(1,2)}=1, J_{(2,3)}=-1. Write complete Python code.",
        quboTruth: {
            optimalEnergy: -3.0,
            tolerance: 0.5,
            expectedVariables: 4,
            description: "Valid symmetric coupler matrix with linear biases corresponding to a D-Wave Advantage BQM."
        }
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// 20 QISKIT CIRCUIT BENCHMARK DEFINITIONS (Analytical Ground Truths)
// ─────────────────────────────────────────────────────────────────────────────
export const QISKIT_BENCHMARKS: QuantumAuditDefinition[] = [
    {
        id: 'QISKIT-01',
        type: 'qiskit',
        title: "2-Qubit Bell State Phi+",
        domain: 'Quantum Entanglement',
        prompt: "Write Python Qiskit code to create the maximally entangled Bell state |Phi+> = (|00> + |11>)/sqrt(2) on 2 qubits. Apply Hadamard to qubit 0, CNOT between 0 and 1, and measure both qubits into classical bits.",
        qiskitTruth: {
            qubitCount: 2,
            requiredGates: ['h', 'cx'],
            maxDepth: 4,
            idealProbabilities: { '00': 0.5, '11': 0.5 },
            tolerance: 0.08,
            description: "Bell state |Phi+> produces strictly |00> and |11> with equal probability ~50% each."
        }
    },
    {
        id: 'QISKIT-02',
        type: 'qiskit',
        title: "2-Qubit Bell State Psi-",
        domain: 'Quantum Entanglement',
        prompt: "Write Python Qiskit code to generate the singlet Bell state |Psi-> = (|01> - |10>)/sqrt(2). Apply X to qubit 1, Hadamard to qubit 0, CNOT(0, 1), and Z to qubit 0. Measure both qubits.",
        qiskitTruth: {
            qubitCount: 2,
            requiredGates: ['h', 'x', 'cx'],
            maxDepth: 5,
            idealProbabilities: { '01': 0.5, '10': 0.5 },
            tolerance: 0.08,
            description: "Singlet Bell state |Psi-> produces strictly |01> and |10> with equal probability."
        }
    },
    {
        id: 'QISKIT-03',
        type: 'qiskit',
        title: "3-Qubit Greenberger-Horne-Zeilinger (GHZ) State",
        domain: 'Multi-Qubit Entanglement',
        prompt: "Write Python Qiskit code to prepare a 3-qubit GHZ state (|000> + |111>)/sqrt(2). Apply Hadamard to qubit 0, then cascade CNOT from qubit 0 to 1, and qubit 1 to 2. Add full measurements.",
        qiskitTruth: {
            qubitCount: 3,
            requiredGates: ['h', 'cx'],
            maxDepth: 5,
            idealProbabilities: { '000': 0.5, '111': 0.5 },
            tolerance: 0.08,
            description: "3-qubit GHZ state produces only |000> and |111> with 50% probability each."
        }
    },
    {
        id: 'QISKIT-04',
        type: 'qiskit',
        title: "4-Qubit W-State Preparation",
        domain: 'Multipartite Entanglement',
        prompt: "Write Python Qiskit code to prepare a 4-qubit W-state (|0001> + |0010> + |0100> + |1000>)/2 using parameterized Ry rotations and controlled gates, followed by measurement of all 4 qubits.",
        qiskitTruth: {
            qubitCount: 4,
            requiredGates: ['ry', 'cx'],
            idealProbabilities: { '0001': 0.25, '0010': 0.25, '0100': 0.25, '1000': 0.25 },
            tolerance: 0.12,
            description: "W-state exhibits equal distribution over Hamming weight 1 basis states (~25% each)."
        }
    },
    {
        id: 'QISKIT-05',
        type: 'qiskit',
        title: "Superdense Coding Protocol",
        domain: 'Quantum Communication',
        prompt: "Write Python Qiskit code implementing the Superdense Coding protocol: Alice and Bob share a Bell pair. Alice encodes classical bits \"11\" using X and Z gates, then sends her qubit to Bob who decodes with CNOT and H, followed by measurement.",
        qiskitTruth: {
            qubitCount: 2,
            requiredGates: ['h', 'cx', 'x', 'z'],
            maxDepth: 6,
            idealProbabilities: { '11': 1.0 },
            tolerance: 0.05,
            description: "Bob decodes Alice's 2 classical bits with deterministic 100% probability for |11>."
        }
    },
    {
        id: 'QISKIT-06',
        type: 'qiskit',
        title: "Quantum Teleportation Protocol",
        domain: 'Quantum Communication',
        prompt: "Write Python Qiskit code implementing Quantum Teleportation of an arbitrary state prepared on qubit 0 (e.g. via H) to qubit 2 using an EPR pair between qubits 1 and 2, Bell measurement on 0 & 1, and conditional Pauli corrections.",
        qiskitTruth: {
            qubitCount: 3,
            requiredGates: ['h', 'cx'],
            idealProbabilities: { '00': 0.25, '01': 0.25, '10': 0.25, '11': 0.25 },
            tolerance: 0.10,
            description: "Bell measurement yields uniform distribution on classical register, teleporting state to qubit 2."
        }
    },
    {
        id: 'QISKIT-07',
        type: 'qiskit',
        title: "Deutsch Algorithm (Balanced Oracle)",
        domain: 'Quantum Algorithms',
        prompt: "Write Python Qiskit code for the Deutsch Algorithm testing whether a single-qubit function f(x) = x is constant or balanced using an auxiliary qubit in state |->, Hadamard transforms, CNOT oracle, and final measurement.",
        qiskitTruth: {
            qubitCount: 2,
            requiredGates: ['h', 'x', 'cx'],
            maxDepth: 5,
            idealProbabilities: { '1': 1.0 },
            tolerance: 0.05,
            description: "For balanced function f(x)=x, the primary qubit deterministically measures 1."
        }
    },
    {
        id: 'QISKIT-08',
        type: 'qiskit',
        title: "Deutsch-Jozsa Algorithm (3-Qubit Balanced Oracle)",
        domain: 'Quantum Algorithms',
        prompt: "Write Python Qiskit code for Deutsch-Jozsa algorithm with 3 input qubits and 1 ancilla qubit. Implement a balanced oracle that flips the ancilla based on qubit 0. All 3 input qubits must measure non-zero |1xx> string.",
        qiskitTruth: {
            qubitCount: 4,
            requiredGates: ['h', 'x', 'cx'],
            maxDepth: 6,
            idealProbabilities: { '001': 1.0 },
            tolerance: 0.08,
            description: "Balanced oracle guarantees input register measures a non-zero bitstring with 100% probability."
        }
    },
    {
        id: 'QISKIT-09',
        type: 'qiskit',
        title: "Bernstein-Vazirani Algorithm (Hidden s = 101)",
        domain: 'Quantum Algorithms',
        prompt: "Write Python Qiskit code for Bernstein-Vazirani algorithm to find the secret bitstring s = \"101\" in 1 query. Use 3 query qubits and 1 ancilla qubit initialized to |->. Measure the 3 query qubits.",
        qiskitTruth: {
            qubitCount: 4,
            requiredGates: ['h', 'x', 'cx'],
            maxDepth: 6,
            idealProbabilities: { '101': 1.0 },
            tolerance: 0.05,
            description: "Single query deterministically reveals the secret bitstring 101 with 100% probability."
        }
    },
    {
        id: 'QISKIT-10',
        type: 'qiskit',
        title: "Simon's Algorithm (2-Qubit Period s = 11)",
        domain: 'Quantum Algorithms',
        prompt: "Write Python Qiskit code for Simon's algorithm with 2 input qubits and 2 output qubits for secret period s = 11. Implement the 2-to-1 function oracle and measure the input register.",
        qiskitTruth: {
            qubitCount: 4,
            requiredGates: ['h', 'cx'],
            idealProbabilities: { '00': 0.5, '11': 0.5 },
            tolerance: 0.10,
            description: "Measured strings y satisfy y . s = 0 (mod 2), yielding orthogonal states {00, 11}."
        }
    },
    {
        id: 'QISKIT-11',
        type: 'qiskit',
        title: "2-Qubit Grover's Search for Target |11>",
        domain: 'Quantum Search',
        prompt: "Write Python Qiskit code implementing Grover's Search Algorithm on 2 qubits to locate target state |11>. Include state superposition (H), phase oracle (CZ gate for |11>), and Grover diffusion operator (H -> X -> CZ -> X -> H). Measure both qubits.",
        qiskitTruth: {
            qubitCount: 2,
            requiredGates: ['h', 'x', 'cz'],
            maxDepth: 8,
            idealProbabilities: { '11': 1.0 },
            tolerance: 0.05,
            description: "Single iteration of Grover on 2 qubits achieves 100% theoretical probability for |11>."
        }
    },
    {
        id: 'QISKIT-12',
        type: 'qiskit',
        title: "3-Qubit Grover's Search for Target |101>",
        domain: 'Quantum Search',
        prompt: "Write Python Qiskit code for Grover's Search on 3 qubits targeting state |101>. Implement the phase oracle for |101> and the 3-qubit Grover diffusion operator with measurements.",
        qiskitTruth: {
            qubitCount: 3,
            requiredGates: ['h', 'x', 'mcx'],
            idealProbabilities: { '101': 0.94 },
            tolerance: 0.12,
            description: "2 Grover iterations amplify target |101> amplitude to ~94% probability."
        }
    },
    {
        id: 'QISKIT-13',
        type: 'qiskit',
        title: "3-Qubit Quantum Fourier Transform (QFT)",
        domain: 'Quantum Transforms',
        prompt: "Write Python Qiskit code implementing the Quantum Fourier Transform (QFT) on 3 qubits from scratch using Hadamard gates, Controlled Phase (cp) gates with angles pi/2, pi/4, and a SWAP gate between qubits 0 and 2. Add measurements.",
        qiskitTruth: {
            qubitCount: 3,
            requiredGates: ['h', 'cp', 'swap'],
            maxDepth: 10,
            idealProbabilities: { '000': 0.125, '001': 0.125, '010': 0.125, '011': 0.125, '100': 0.125, '101': 0.125, '110': 0.125, '111': 0.125 },
            tolerance: 0.06,
            description: "QFT on computational basis state |000> produces an equal superposition over all 8 basis states."
        }
    },
    {
        id: 'QISKIT-14',
        type: 'qiskit',
        title: "3-Qubit Inverse QFT (QFT Dag)",
        domain: 'Quantum Transforms',
        prompt: "Write Python Qiskit code implementing the Inverse Quantum Fourier Transform (QFT Dag) on 3 qubits. First prepare equal superposition via H, then apply inverse QFT with negative angles -pi/2, -pi/4 and SWAP. All qubits should collapse back to |000>.",
        qiskitTruth: {
            qubitCount: 3,
            requiredGates: ['h', 'cp', 'swap'],
            maxDepth: 12,
            idealProbabilities: { '000': 1.0 },
            tolerance: 0.05,
            description: "Applying QFT Dag to equal superposition perfectly inverts state back to ground basis |000>."
        }
    },
    {
        id: 'QISKIT-15',
        type: 'qiskit',
        title: "Quantum Phase Estimation (QPE) for T-Gate",
        domain: 'Quantum Phase Estimation',
        prompt: "Write Python Qiskit code for Quantum Phase Estimation (QPE) to estimate the phase theta = 1/8 of the T gate (diag(1, e^{i*2pi/8})). Use 3 counting qubits and 1 eigenstate qubit in state |1>. Apply controlled-U powers, inverse QFT, and measure counting qubits.",
        qiskitTruth: {
            qubitCount: 4,
            requiredGates: ['h', 'x', 'cp', 'swap'],
            idealProbabilities: { '001': 1.0 },
            tolerance: 0.08,
            description: "Phase 1/8 binary representation 0.001 is measured with 100% fidelity on 3 counting qubits."
        }
    },
    {
        id: 'QISKIT-16',
        type: 'qiskit',
        title: "Hardware-Efficient Variational Ansatz (2 Qubits, 2 Layers)",
        domain: 'Variational Quantum Algorithms',
        prompt: "Write Python Qiskit code constructing a 2-qubit Hardware-Efficient Ansatz with 2 alternating layers of parameterized Ry(theta) rotations and CNOT entanglement gates, followed by measurement.",
        qiskitTruth: {
            qubitCount: 2,
            requiredGates: ['ry', 'cx'],
            maxDepth: 6,
            idealProbabilities: { '00': 0.25, '01': 0.25, '10': 0.25, '11': 0.25 },
            tolerance: 0.15,
            description: "Hardware-efficient ansatz parameterized circuit compiling clean 2-layer entanglement."
        }
    },
    {
        id: 'QISKIT-17',
        type: 'qiskit',
        title: "VQE Ansatz for H2 Molecule Ground State",
        domain: 'Quantum Chemistry',
        prompt: "Write Python Qiskit code for a 2-qubit VQE ansatz simulating the H2 molecule under parity reduction. Include Hartree-Fock state preparation |01>, single excitation parameterized gate with CNOT, and measurements in Z basis.",
        qiskitTruth: {
            qubitCount: 2,
            requiredGates: ['x', 'ry', 'cx'],
            maxDepth: 7,
            idealProbabilities: { '01': 0.90, '10': 0.10 },
            tolerance: 0.15,
            description: "UCCSD-inspired 2-qubit VQE ansatz capturing the ground state molecular orbital configuration."
        }
    },
    {
        id: 'QISKIT-18',
        type: 'qiskit',
        title: "QAOA Circuit for Max-Cut on Triangle Graph (p=1)",
        domain: 'Quantum Approximate Optimization',
        prompt: "Write Python Qiskit code constructing a level-1 (p=1) QAOA circuit for Max-Cut on a 3-node triangle graph. Include initial equal superposition (H on all 3 qubits), cost unitary with Rzz or CNOT-Rz-CNOT for edges (0,1), (1,2), (0,2), mixer unitary with Rx(beta) on all qubits, and measurements.",
        qiskitTruth: {
            qubitCount: 3,
            requiredGates: ['h', 'cx', 'rz', 'rx'],
            maxDepth: 12,
            idealProbabilities: { '001': 0.15, '010': 0.15, '100': 0.15, '110': 0.15, '101': 0.15, '011': 0.15 },
            tolerance: 0.12,
            description: "Level-1 QAOA circuit with problem and mixer unitaries amplifying cut states."
        }
    },
    {
        id: 'QISKIT-19',
        type: 'qiskit',
        title: "3-Qubit Quantum Bit-Flip Code (Error Correction)",
        domain: 'Quantum Error Correction',
        prompt: "Write Python Qiskit code implementing the 3-qubit bit-flip repetition code: encode a state |psi> across 3 physical qubits using 2 CNOTs, introduce a bit-flip X error on qubit 1, perform syndrome detection using 2 ancilla qubits, and measure syndromes.",
        qiskitTruth: {
            qubitCount: 5,
            requiredGates: ['cx', 'x'],
            maxDepth: 8,
            idealProbabilities: { '11': 1.0 },
            tolerance: 0.05,
            description: "Syndrome bits measure 11, uniquely diagnosing bit-flip error on physical qubit 1."
        }
    },
    {
        id: 'QISKIT-20',
        type: 'qiskit',
        title: "Quantum Half-Adder Circuit",
        domain: 'Quantum Arithmetic',
        prompt: "Write Python Qiskit code implementing a Quantum Half-Adder that adds 2 input qubits A and B, computing Sum = A XOR B on qubit B (using CNOT) and Carry = A AND B on ancilla qubit C (using Toffoli / CCX gate). Measure Sum and Carry.",
        qiskitTruth: {
            qubitCount: 3,
            requiredGates: ['ccx', 'cx'],
            maxDepth: 6,
            idealProbabilities: { '00': 1.0 },
            tolerance: 0.05,
            description: "Quantum half-adder correctly evaluates binary addition with reversibility preserved."
        }
    }
];

export const ALL_QUANTUM_AUDIT_BENCHMARKS = [...QUBO_BENCHMARKS, ...QISKIT_BENCHMARKS];
