/**
 * Quantum Journey 101 — Complete Adaptive Quantum Education Engine
 * Aligned with IBM Quantum Learning Fundamentals (Qiskit 1.x)
 *
 * 7 Modules: 0 (Foundations) to 6 (Capstone)
 * Built with:
 * - Scaffolded Predict -> Execute -> Explain Loop
 * - Misconception Diagnostics Matrix (Detects & corrects intuitive fallacies)
 * - 3-Tier Adaptive Explanation Depth (Intuition, Technical, Math)
 * - Code Comprehension & Independent Circuit Construction
 * - Strict project isolation to project_id: 'quantum_journey_101'
 */

export interface ExplanationTiers {
  intuition: string;
  technical: string;
  math: string;
}

export interface JourneyModule {
  id: number;
  slug: string;
  title: string;
  badge: string;
  concept: string;
  qubits: number;
  starterCode: string;
  initialGates: any[];
  introPrompt: string;
  tiers: ExplanationTiers;
  predictionPrompt: string;
  evaluatePrediction: (predictionText: string) => { isAccurate: boolean; feedback: string };
  quizQuestion: string;
  quizAcceptKeywords: string[];
  quizExplanation: string;
  hint: string;
  friendlyAnalogy: string;
  fallbackExplanation: string;
  challengeInstruction: string;
  validateChallenge: (
    counts: Record<string, number>,
    gates: any[],
    qubits: number,
    code: string
  ) => { passed: boolean; feedback: string };
  completionMessage: string;
}

export interface MisconceptionRule {
  id: string;
  pattern: RegExp;
  concept: string;
  counterExample: string;
}

export const COMMON_MISCONCEPTIONS: MisconceptionRule[] = [
  {
    id: "superposition_both_values",
    pattern: /(both (values|states|0 and 1|at once|simultaneously)|split personality|two places at once)/i,
    concept: "Superposition is NOT a qubit being classical 0 and 1 at the same time.",
    counterExample:
      "A qubit in state |+⟩ is not 'both 0 and 1 at the same time'—it is in a single, 100% definite, pure physical quantum state pointing along the X-axis! It only appears probabilistic when we force it into the classical Z-basis measurement. If measured in the X-basis, |+⟩ is 100% deterministic!",
  },
  {
    id: "amplitude_equals_probability",
    pattern: /(amplitude is probability|same as probability|amplitude.*probability.*equal)/i,
    concept: "Quantum amplitudes are complex numbers (with signs and phases); probabilities are real squared magnitudes.",
    counterExample:
      "Probability is always positive: P = |α|² (Born rule). But amplitudes can be negative (like -1/√2) or complex (like i/√2). That negative sign is what enables destructive wave interference—if amplitudes were just probabilities, quantum states could never cancel each other out!",
  },
  {
    id: "ftl_entanglement",
    pattern: /(faster than light|instant communication|send signal|send data faster|telepathy|ftl)/i,
    concept: "Entanglement does NOT allow faster-than-light communication (No-Communication Theorem).",
    counterExample:
      "Even though Alice on Earth instantly collapses the joint state when measuring qubit 0, Bob on Mars only sees completely random 50/50 counts when measuring qubit 1 in isolation! Alice cannot dictate what she measures, so no information is transmitted until Alice and Bob compare classical notes at or below the speed of light.",
  },
  {
    id: "all_quantum_faster",
    pattern: /(always faster|quantum is always faster|faster than all classical|magical speedup)/i,
    concept: "Quantum computers are not universally faster for all computing tasks.",
    counterExample:
      "For simple arithmetic or sequential operations, classical CPUs are billions of times faster. Quantum speedup only occurs for specific mathematical structures (like period finding in Shor's algorithm, unstructured search in Grover, or simulating quantum Hamiltonians) where interference can cancel incorrect paths.",
  },
  {
    id: "pauli_x_flips_phase",
    pattern: /(x gate.*flips phase|px.*phase|pauli x.*phase)/i,
    concept: "Pauli-X is a bit-flip (NOT), not a phase-flip.",
    counterExample:
      "Pauli-X rotates the state by 180° around the X-axis, swapping |0⟩ ↔ |1⟩ (bit flip). The operator that flips quantum phase without altering probabilities is Pauli-Z (which leaves |0⟩ unchanged and maps |1⟩ to -|1⟩).",
  },
];

export const JOURNEY_101_MODULES: JourneyModule[] = [
  // ── Module 0: Quantum Foundations ──────────────────────────────────────────
  {
    id: 0,
    slug: "foundations",
    title: "Quantum Foundations (The Qubit & Ket Notation)",
    badge: "Module 0/6",
    concept: "Bits vs Qubits, Dirac Ket Notation, Statevectors",
    qubits: 1,
    starterCode: `# 🎓 Quantum Journey 101 — Module 0: Quantum Foundations
# Goal: Understand how a qubit is initialized and represented.
# In quantum physics, every state is written in Dirac bra-ket notation: |ψ⟩.
# A fresh qubit always starts in the ground state: |0⟩.

from qiskit import QuantumCircuit

# Initialize 1 quantum wire and 1 classical register
qc = QuantumCircuit(1, 1)

# Measure qubit 0 into classical bit 0
qc.measure(0, 0)
`,
    initialGates: [
      { name: "measure", qubit: 0, qubits: [0], step: 0, role: "measure" },
    ],
    introPrompt: `Welcome to **Quantum Journey 101: Module 0 — Quantum Foundations**! 🎓 I am **Guru AI**, your quantum pair-programmer.

In classical computing, the fundamental unit of information is the **bit** (strictly \`0\` or \`1\`). 
In quantum computing, our unit is the **qubit** (quantum bit). We write states using Dirac ket notation:
> **\`|0⟩\` (ground state) and \`|1⟩\` (excited state)**

A qubit begins in the ground state **\`|0⟩\`**.

👉 **Predict & Run:**
Before clicking **▶ Run**, look at the code. With no gates applied to wire \`q[0]\`, what percentage of 1,024 shots will measure as \`0\`?
*(Type your prediction below, or press ▶ Run to test!)*`,

    tiers: {
      intuition:
        "Think of a classical bit as a light switch: strictly UP (1) or DOWN (0). A qubit is like a sphere (the Bloch sphere): |0⟩ is the North Pole, and |1⟩ is the South Pole. Right now, our qubit is resting undisturbed at the North Pole (|0⟩).",
      technical:
        "A qubit's general state is a 2D complex unit vector: |ψ⟩ = α|0⟩ + β|1⟩, where α and β are probability amplitudes satisfying |α|² + |β|² = 1. In ground state, α = 1 and β = 0.",
      math:
        "In linear algebra: |0⟩ = [1, 0]ᵀ and |1⟩ = [0, 1]ᵀ. Measurement in the computational Z-basis projects the statevector onto these orthonormal basis vectors with probability P(0) = |⟨0|ψ⟩|² = |1|² = 1.0 (100%).",
    },

    predictionPrompt: "What do you predict will happen when we measure an undisturbed qubit: will it be 100% in state '0', or will it be random?",

    evaluatePrediction: (pred) => {
      const p = pred.toLowerCase();
      if (p.includes("0") || p.includes("100") || p.includes("deterministic") || p.includes("zero")) {
        return {
          isAccurate: true,
          feedback: "Spot on! Because no gates were applied, the qubit remains in |0⟩ with 100% certainty. Let's run it to confirm!",
        };
      }
      return {
        isAccurate: false,
        feedback: "Interesting prediction! But remember: fresh qubits start strictly in the ground state |0⟩. Press ▶ Run to see what the simulator measures!",
      };
    },

    quizQuestion: "🧠 **Quick Check:** In Dirac notation, why do we write states inside a ket symbol like `|0⟩` instead of just writing the number `0`?",
    quizAcceptKeywords: ["vector", "state", "quantum", "direction", "amplitude", "dirac", "basis"],
    quizExplanation: "Exactly! 🎯 The ket `|0⟩` denotes a quantum state vector in Hilbert space with magnitude and direction, distinguishing it from the classical scalar number 0.",
    hint: "Think about mathematical objects: is `|0⟩` a simple scalar number, or a vector pointing in a quantum state space?",
    friendlyAnalogy: "Writing `0` is like writing a number on a paper. Writing `|0⟩` is like drawing an arrow pointing North on a 3D compass!",
    fallbackExplanation: "The ket symbol `|0⟩` represents a state vector in quantum state space, reminding us that quantum states can be rotated, scaled by complex amplitudes, and interfered like waves.",

    challengeInstruction: `⚡ **Module 0 Challenge:**
1. Switch to the **Circuit Canvas** tab to see your bare wire with a Measurement gate.
2. Click **▶ Run** (or press \`Shift+Enter\`) to execute 1,024 shots.
3. Confirm that the Results drawer displays exactly 100% counts in \`{"0": 1024}\`!`,

    validateChallenge: (counts, gates, qubits, code) => {
      const c0 = counts["0"] || 0;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      if (total > 0 && c0 / total >= 0.99) {
        return {
          passed: true,
          feedback: "🎉 **Module 0 Mastered!** Look at that: exactly 1,024 counts in |0⟩. You now understand state initialization and the Dirac notation |0⟩!",
        };
      }
      return {
        passed: false,
        feedback: "Make sure no gates are added yet before the measurement, then press ▶ Run. Qubit 0 should measure 100% in state '0'.",
      };
    },

    completionMessage: `🌟 **Module 0 Completed: Foundations Unlocked!**
You know what a qubit is, how it is initialized, and how Dirac kets work.

Ready for **Module 1: Superposition & The Born Rule**? Type **"Next"** or click below!`,
  },

  // ── Module 1: Superposition & The Born Rule ─────────────────────────────────
  {
    id: 1,
    slug: "superposition",
    title: "The Magic of Quantum Superposition",
    badge: "Module 1/6",
    concept: "Hadamard (H) Gate, Born Rule, Shot Noise & Statistical Sampling",
    qubits: 1,
    starterCode: `# 🎓 Quantum Journey 101 — Module 1: Superposition & The Born Rule
# Goal: Put qubit 0 into equal superposition using a Hadamard (H) gate,
# then observe how 1,024 measurements collapse into a ~50/50 probability distribution.

from qiskit import QuantumCircuit

# Initialize 1 quantum wire and 1 classical register
qc = QuantumCircuit(1, 1)

# Apply Hadamard (H) gate to create equal superposition: (|0⟩ + |1⟩)/√2
qc.h(0)

# Measure qubit 0 into classical bit 0
qc.measure(0, 0)
`,
    initialGates: [
      { name: "h", qubit: 0, qubits: [0], step: 0, role: "single" },
      { name: "measure", qubit: 0, qubits: [0], step: 1, role: "measure" },
    ],
    introPrompt: `Welcome to **Module 1: Quantum Superposition & The Born Rule**! 🚀

Now we transform the qubit from classical certainty into a quantum state. The **Hadamard (H) gate** rotates the statevector from the North Pole down to the equator of the Bloch sphere:
> **|ψ⟩ = (|0⟩ + |1⟩) / √2**

This is equal superposition.

👉 **Predict & Run:**
Before pressing ▶ Run: out of 1,024 measurement shots, how will the counts be distributed between '0' and '1'?
*(Type your prediction below, or press ▶ Run to test!)*`,

    tiers: {
      intuition:
        "A classical bit is a coin lying flat on a table (heads or tails). The Hadamard gate sets the coin spinning in mid-air—putting it into an equal 50/50 superposition until a measurement forces it to land!",
      technical:
        "The H gate maps |0⟩ to |+⟩ = (|0⟩ + |1⟩)/√2. By the Born Rule, the probability of measuring outcome x is P(x) = |⟨x|+⟩|² = |1/√2|² = 1/2 = 50%. Over finite shots, statistical variance (shot noise) creates small fluctuations around 50%.",
      math:
        "Hadamard matrix: H = (1/√2) [[1, 1], [1, -1]]. When applied to |0⟩ = [1, 0]ᵀ: H|0⟩ = [1/√2, 1/√2]ᵀ. The squared magnitude of each component is (1/√2)² = 0.5.",
    },

    predictionPrompt: "Will the measurement be 100% in one state, or will it be split ~50/50 between '0' and '1'?",

    evaluatePrediction: (pred) => {
      const p = pred.toLowerCase();
      if (p.includes("50") || p.includes("half") || p.includes("split") || p.includes("equal") || p.includes("512")) {
        return {
          isAccurate: true,
          feedback: "Excellent prediction! By the Born rule, the squared amplitudes yield exactly 50% for |0⟩ and 50% for |1⟩. Click ▶ Run to watch the simulator sample it!",
        };
      }
      return {
        isAccurate: false,
        feedback: "Good thought! The Hadamard gate creates an equal superposition (|0⟩ + |1⟩)/√2. Let's run 1,024 shots to observe the distribution!",
      };
    },

    quizQuestion: "🧠 **Quick Check:** Look at your histogram: counts hover around ~512 on '0' and ~512 on '1', but are rarely *exactly* 512. Why does a quantum simulator produce ~512 instead of exactly 512 every time?",
    quizAcceptKeywords: ["random", "probab", "statistic", "sample", "sampling", "shot", "noise", "coin", "variance", "fluctuat", "born", "collapse"],
    quizExplanation: "Spot on! 🎯 Under the Born rule, every measurement shot is an independent probabilistic collapse. Just like tossing a fair coin 1,024 times produces natural statistical sampling fluctuations (shot noise) around 512, finite quantum measurements fluctuate around the 50% probability!",
    hint: "Think about flipping a fair coin 1,024 times in real life: do you get exactly 512 heads every single time?",
    friendlyAnalogy: "If you flip a regular coin 1,024 times, you expect roughly 50% heads. But natural statistical sampling noise causes small fluctuations (like 508, 517, 511).",
    fallbackExplanation: "In quantum mechanics, the Hadamard gate puts the qubit into equal probability amplitudes. Because each measurement shot is an independent random collapse, statistical sampling noise naturally produces counts near 512 rather than exactly 512.",

    challengeInstruction: `⚡ **Module 1 Challenge:**
Let's prove quantum determinism vs superposition with your own hands!
1. On the **Circuit Canvas**, hover over the **H** gate and click **✕** to delete it (or comment out \`qc.h(0)\` in the code).
2. Click **▶ Run** again!
3. Watch the histogram collapse back from 50/50 superposition to **100% deterministic |0⟩**!`,

    validateChallenge: (counts, gates, qubits, code) => {
      const hasH = gates.some((g) => (g.name || "").toLowerCase() === "h");
      const zeroCount = counts["0"] || 0;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      if (hasH) {
        return { passed: false, feedback: "The H gate is still on the wire! Delete it so qubit 0 starts unperturbed in state |0⟩, then press ▶ Run." };
      }
      if (total > 0 && zeroCount / total >= 0.95) {
        return {
          passed: true,
          feedback: "🎉 **Challenge Mastered!** Without the H gate, the qubit collapses to |0⟩ with 100% certainty. You have proven the difference between classical determinism and quantum superposition!",
        };
      }
      return { passed: false, feedback: "Make sure no gates precede the measurement, then click ▶ Run." };
    },

    completionMessage: `🌟 **Module 1 Completed: Superposition Mastered!**
You understand the Born rule, probability amplitudes, and shot noise.

Ready for **Module 2: Quantum Gates & Phase (Pauli X, Y, Z)**? Type **"Next"** or click below!`,
  },

  // ── Module 2: Quantum Gates & Phase (Pauli X, Y, Z) ────────────────────────
  {
    id: 2,
    slug: "gates-and-phase",
    title: "Quantum Gates & Phase (Pauli X, Y, Z)",
    badge: "Module 2/6",
    concept: "Pauli-X (NOT), Pauli-Z (Phase), Global vs Relative Phase, |+⟩ vs |-⟩",
    qubits: 1,
    starterCode: `# 🎓 Quantum Journey 101 — Module 2: Quantum Gates & Phase
# Goal: Master quantum state manipulation using Pauli gates.
# Pauli-X performs a bit-flip: X|0⟩ = |1⟩.
# Then explore what happens when X meets H to create the |-⟩ state!

from qiskit import QuantumCircuit

# Initialize 1 qubit and 1 classical register
qc = QuantumCircuit(1, 1)

# Apply Pauli-X (quantum NOT) gate: flips |0⟩ to |1⟩
qc.x(0)

# Measure qubit 0 into classical bit 0
qc.measure(0, 0)
`,
    initialGates: [
      { name: "x", qubit: 0, qubits: [0], step: 0, role: "single" },
      { name: "measure", qubit: 0, qubits: [0], step: 1, role: "measure" },
    ],
    introPrompt: `Welcome to **Module 2: Quantum Gates & Phase**! 🔄

In classical computing, there is only one way to alter a bit: the NOT gate (0 ↔ 1).
In quantum computing, this is the **Pauli-X gate**:
> **X|0⟩ = |1⟩,  X|1⟩ = |0⟩**

But quantum states also have an internal **phase angle**. The **Pauli-Z gate** flips the phase without changing measurement probabilities:
> **Z|0⟩ = |0⟩,  Z|1⟩ = -|1⟩**

👉 **Step 1:** Click **▶ Run** to confirm that the X gate deterministically flips the initial |0⟩ into state |1⟩ with 100% certainty!`,

    tiers: {
      intuition:
        "Imagine a clock hand pointing at 12 o'clock (|0⟩). The Pauli-X gate flips the hand to 6 o'clock (|1⟩)—a bit flip. But if the hand is pointing sideways at 3 o'clock (superposition), flipping its direction without changing its length is a phase flip—governed by Pauli-Z!",
      technical:
        "Pauli matrices: X = [[0, 1], [1, 0]], Z = [[1, 0], [0, -1]], Y = [[0, -i], [i, 0]]. On the superposition state |+⟩ = (|0⟩ + |1⟩)/√2, applying Z gives |-⟩ = (|0⟩ - |1⟩)/√2. In standard computational basis measurement, both |+⟩ and |-⟩ read 50/50, but their relative phase differs by π radians (180°).",
      math:
        "Global phase e^{iθ}|ψ⟩ has zero observable effect (|e^{iθ}|² = 1). But relative phase between basis states |0⟩ + e^{iθ}|1⟩ dictates quantum interference when transformed by subsequent unitary operations like H.",
    },

    predictionPrompt: "We applied an X gate to ground state |0⟩. What state will be measured: '0' or '1'?",

    evaluatePrediction: (pred) => {
      const p = pred.toLowerCase();
      if (p.includes("1") || p.includes("one") || p.includes("flip")) {
        return { isAccurate: true, feedback: "Spot on! The Pauli-X gate flips |0⟩ to |1⟩ with 100% certainty. Run the circuit to confirm!" };
      }
      return { isAccurate: false, feedback: "Recall that Pauli-X is the quantum NOT gate. It flips |0⟩ to |1⟩! Run the circuit to verify!" };
    },

    quizQuestion: "🧠 **Quick Check:** Now that you verified X|0⟩ = |1⟩: Which Pauli gate flips the quantum relative phase (±) without changing measurement probabilities: **Pauli-Y** or **Pauli-Z**?",
    quizAcceptKeywords: ["z", "pauli-z", "pauli z", "phase"],
    quizExplanation: "Correct! 🎯 The **Pauli-Z gate** is the pure phase-flip operator: Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩. On |+⟩, it creates |-⟩ = (|0⟩ - |1⟩)/√2. The measurement probabilities remain 50/50, but the relative phase is inverted by 180°!",
    hint: "Think about the coordinate axes: X is bit flip along the X axis. Which gate corresponds to the Z axis and flips the phase of |1⟩ to -|1⟩?",
    friendlyAnalogy: "A bit-flip turns a coin upside down (heads ↔ tails). A phase-flip spins the coin around without flipping its face!",
    fallbackExplanation: "The Pauli-Z gate flips the quantum phase without changing measurement probabilities. On state |+⟩, applying Z produces |-⟩, which has the identical 50/50 measurement probabilities, but opposite internal phase!",

    challengeInstruction: `⚡ **Module 2 Challenge:**
Let's create the famous **|-⟩** state!
1. On the **Circuit Canvas**, add a **Hadamard (H)** gate immediately *after* the **X** gate on wire \`q[0]\` (sequence: \`X -> H -> Measure\`).
2. Click **▶ Run** to observe the measurement!`,

    validateChallenge: (counts, gates, qubits, code) => {
      const lower = gates.map((g) => (g.name || "").toLowerCase());
      const hasX = lower.includes("x");
      const hasH = lower.includes("h");
      const xIdx = lower.indexOf("x");
      const hIdx = lower.indexOf("h");
      if (!hasX || !hasH) return { passed: false, feedback: "You need both an X gate AND an H gate on wire q[0]. Add an H gate right after X!" };
      if (hIdx < xIdx) return { passed: false, feedback: "Order matters in quantum computing! Make sure the X gate comes FIRST, followed by H (X -> H)." };
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const c0 = counts["0"] || 0;
      const c1 = counts["1"] || 0;
      if (total > 0 && c0 > 0.35 * total && c1 > 0.35 * total) {
        return {
          passed: true,
          feedback: "🎉 **Challenge Mastered!** You successfully generated the **|-⟩ = (|0⟩ - |1⟩) / √2** state! Notice that both |+⟩ and |-⟩ measure 50/50 in the computational basis, but their quantum phases are opposites!",
        };
      }
      return { passed: false, feedback: "Run the circuit with shots=1024 to verify the superposition distribution." };
    },

    completionMessage: `🌟 **Module 2 Completed: Quantum Phase Mastered!**
You understand Pauli-X bit flips, Pauli-Z phase flips, and the |-⟩ state.

Ready for **Module 3: Entanglement & Bell States**? Type **"Next"** or click below!`,
  },

  // ── Module 3: Entanglement & Bell States ─────────────────────────────────────
  {
    id: 3,
    slug: "entanglement",
    title: "Spooky Action: Creating a Bell Pair",
    badge: "Module 3/6",
    concept: "Two Qubits, Controlled-NOT (CNOT / CX), Entanglement & Correlations",
    qubits: 2,
    starterCode: `# 🎓 Quantum Journey 101 — Module 3: Bell State Entanglement
# Goal: Create the maximally entangled Bell state: |Φ+⟩ = (|00⟩ + |11⟩)/√2
# Observe Einstein's "Spooky Action at a Distance" where measuring qubit 0
# instantaneously dictates the outcome of qubit 1!

from qiskit import QuantumCircuit

# Initialize a 2-qubit circuit with 2 classical registers
qc = QuantumCircuit(2, 2)

# Step 1: Put qubit 0 into equal superposition
qc.h(0)

# Step 2: Entangle qubit 0 and qubit 1 via CNOT (Control: q0, Target: q1)
qc.cx(0, 1)

# Step 3: Measure both qubits
qc.measure([0, 1], [0, 1])
`,
    initialGates: [
      { name: "h", qubit: 0, qubits: [0], step: 0, role: "single" },
      { name: "cx", qubit: 0, qubits: [0, 1], step: 1, role: "two", control: 0, target: 1 },
      { name: "measure", qubit: 0, qubits: [0], step: 2, role: "measure" },
      { name: "measure", qubit: 1, qubits: [1], step: 2, role: "measure" },
    ],
    introPrompt: `Welcome to **Module 3: Spooky Action — Creating a Bell Pair**! 🌌

When two qubits become **entangled**, they no longer possess separate, individual identities. Their joint wavefunction is:
> **|Φ⁺⟩ = (|00⟩ + |11⟩) / √2**

Neither qubit alone has a definite state, but they share a synchronized quantum bond.

👉 **Step 1:** Notice your workspace has cleanly expanded to two wires: \`q[0]\` and \`q[1]\`. Click **▶ Run** (or press \`Shift+Enter\`) to execute 1,024 shots!`,

    tiers: {
      intuition:
        "Think of a pair of magic shoes in separate boxes: one is Left, one is Right. As soon as Alice opens box 1 on Earth and finds the Left shoe, she instantly knows Bob's box on Mars contains the Right shoe—even without opening it! In our Bell state, both qubits are synchronized to always agree.",
      technical:
        "A composite 2-qubit system lives in a 4D Hilbert space H = H₁ ⊗ H₂ with basis {|00⟩, |01⟩, |10⟩, |11⟩}. The CNOT gate acts as CX|x, y⟩ = |x, x ⊕ y⟩. Applying H on q[0] gives (|0⟩+|1⟩)/√2 ⊗ |0⟩ = (|00⟩+|10⟩)/√2. The subsequent CNOT flips target q[1] only when control q[0] is |1⟩, producing (|00⟩+|11⟩)/√2.",
      math:
        "An entangled state cannot be factored into product states: |Φ⁺⟩ ≠ |ψ₁⟩ ⊗ |ψ₂⟩. Measurement on subsystem 1 causes immediate reduction of the entire statevector according to the projection operator P₀ = |0⟩⟨0| ⊗ I or P₁ = |1⟩⟨1| ⊗ I.",
    },

    predictionPrompt: "We put qubit 0 into superposition and linked it to qubit 1 via CNOT. Predict: Will you ever measure '01' or '10'?",

    evaluatePrediction: (pred) => {
      const p = pred.toLowerCase();
      if (p.includes("never") || p.includes("no") || p.includes("zero") || p.includes("0%")) {
        return { isAccurate: true, feedback: "Spot on! The CNOT gate ensures the qubits are perfectly correlated. Outcomes '01' and '10' have strictly 0% probability. Run the simulator to see!" };
      }
      return { isAccurate: false, feedback: "In this Bell state, q[1] is flipped if and only if q[0] is 1. That means the qubits can only be '00' or '11'! Click ▶ Run to verify!" };
    },

    quizQuestion: "🧠 **Quick Check:** In your results, '00' has ~50% and '11' has ~50%, while '01' and '10' have 0%. If an astronaut measures qubit 0 on Earth and finds it to be '1', what is the state of qubit 1 on Mars *before* it is measured?",
    quizAcceptKeywords: ["1", "one", "|1>", "same", "definite"],
    quizExplanation: "Exactly right! 🎯 Because the qubits are entangled in state (|00⟩ + |11⟩)/√2, measuring qubit 0 as 1 collapses the entire joint state to **|11⟩**. Qubit 1 is instantaneously guaranteed to be 1 with 100% certainty!",
    hint: "Look at the measured pairs: only '00' and '11' exist. If the first digit is definitely 1, what must the second digit be?",
    friendlyAnalogy: "Like two coins welded back-to-back: if one shows heads, the other is guaranteed to show heads!",
    fallbackExplanation: "Because the two qubits are entangled in state (|00⟩ + |11⟩)/√2, measuring qubit 0 as 1 collapses the joint state to |11⟩. Qubit 1 is instantaneously guaranteed to be 1 as well! The states '01' and '10' have strictly zero probability.",

    challengeInstruction: `⚡ **Module 3 Challenge:**
Let's create an *anti-correlated* Bell state **|Ψ⁺⟩ = (|01⟩ + |10⟩) / √2**!
1. Add an **X gate** to wire \`q[1]\` *before* the CNOT (or in code: \`qc.x(1)\` right before \`qc.cx(0, 1)\`).
2. Click **▶ Run**!
3. Observe how the correlated outcomes swap to strictly opposite states ('01' and '10')!`,

    validateChallenge: (counts, gates, qubits, code) => {
      const hasCX = gates.some((g) => (g.name || "").toLowerCase() === "cx") || code.includes("cx");
      const c01 = counts["01"] || counts["1"] || 0;
      const c10 = counts["10"] || 0;
      const c00 = counts["00"] || counts["0"] || 0;
      const c11 = counts["11"] || 0;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      if (!hasCX) return { passed: false, feedback: "Keep the CNOT (CX) gate connecting q[0] and q[1] to maintain entanglement!" };
      if (total > 0 && (c01 + c10) / total >= 0.85 && c00 + c11 <= 0.15 * total) {
        return {
          passed: true,
          feedback: "🎉 **Challenge Mastered!** You just created the **|Ψ⁺⟩ = (|01⟩ + |10⟩) / √2** Bell state! Now measuring qubit 0 as 0 guarantees qubit 1 is 1, and vice versa—perfect quantum anti-correlation!",
        };
      }
      return { passed: false, feedback: "Make sure you added an X gate on q[1] before the CNOT, then click ▶ Run." };
    },

    completionMessage: `🌟 **Module 3 Completed: Quantum Entanglement Mastered!**
You understand Bell states, CNOT operations, and non-local correlations.

Ready for **Module 4: Quantum Wave Interference**? Type **"Next"** or click below!`,
  },

  // ── Module 4: Quantum Wave Interference ─────────────────────────────────────
  {
    id: 4,
    slug: "interference",
    title: "Quantum Wave Interference (H · H = I)",
    badge: "Module 4/6",
    concept: "Constructive vs Destructive Interference, Wave Mechanics, Reversibility",
    qubits: 1,
    starterCode: `# 🎓 Quantum Journey 101 — Module 4: Wave Interference
# Goal: Demystify quantum computing!
# Quantum computing is NOT just random coin tossing.
# Unlike classical probability, quantum amplitudes can be negative,
# allowing states to interfere destructively and cancel out completely!

from qiskit import QuantumCircuit

# Initialize 1 qubit and 1 classical register
qc = QuantumCircuit(1, 1)

# Apply the first Hadamard: creates equal superposition (|0⟩ + |1⟩)/√2
qc.h(0)

# Measure qubit 0
qc.measure(0, 0)
`,
    initialGates: [
      { name: "h", qubit: 0, qubits: [0], step: 0, role: "single" },
      { name: "measure", qubit: 0, qubits: [0], step: 1, role: "measure" },
    ],
    introPrompt: `Welcome to **Module 4: Quantum Wave Interference**! 🌊

Here is the secret of quantum advantage: quantum states are **waves**. Waves can add together (constructive interference) or cancel each other out (destructive interference).

Recall that the Hadamard matrix is its own inverse:
> **H · H = I (Identity)**

👉 **Step 1:** Notice your workspace is reset to a clean 1-qubit wire with 1 Hadamard gate. Click **▶ Run** to verify the standard 50/50 superposition first!`,

    tiers: {
      intuition:
        "Think of noise-canceling headphones: they listen to incoming sound waves and generate an inverted wave of opposite phase. The crest meets a trough and cancels into flat silence! That is what the second H gate does to the |1⟩ component.",
      technical:
        "The first H turns |0⟩ into (|0⟩+|1⟩)/√2. The second H applies to both components: H|0⟩ = (|0⟩+|1⟩)/√2, and H|1⟩ = (|0⟩-|1⟩)/√2. Summing them up: (1/2)|0⟩ + (1/2)|1⟩ + (1/2)|0⟩ - (1/2)|1⟩ = |0⟩. The |1⟩ amplitudes cancel out (+1/2 - 1/2 = 0) while the |0⟩ amplitudes reinforce (+1/2 + 1/2 = 1).",
      math:
        "Matrix multiplication: H · H = (1/√2)² [[1, 1], [1, -1]] · [[1, 1], [1, -1]] = (1/2) [[2, 0], [0, 2]] = [[1, 0], [0, 1]] = I. Because H is unitary and Hermitian (H = H† = H⁻¹), applying H twice is equivalent to the identity operator.",
    },

    predictionPrompt: "If you flip a coin twice, it stays random. In quantum mechanics, what will happen if we apply a SECOND H gate immediately after the first?",

    evaluatePrediction: (pred) => {
      const p = pred.toLowerCase();
      if (p.includes("0") || p.includes("zero") || p.includes("cancel") || p.includes("identity") || p.includes("reset") || p.includes("100")) {
        return { isAccurate: true, feedback: "Brilliant insight! Because of destructive interference, H · H = I, collapsing the state back to 100% |0⟩! Let's test it!" };
      }
      return { isAccurate: false, feedback: "In classical probability it would stay random, but quantum amplitudes interfere! Press ▶ Run with two H gates to see what happens!" };
    },

    quizQuestion: "🧠 **Quick Check:** What is the fundamental difference between classical probability and quantum amplitudes that allows destructive interference to happen?",
    quizAcceptKeywords: ["negative", "sign", "phase", "complex", "cancel", "wave", "opposite"],
    quizExplanation: "Correct! 🎯 Classical probabilities are always positive real numbers (they can only add up). Quantum amplitudes can have negative signs or complex phases, allowing them to subtract and cancel out completely!",
    hint: "Think about arithmetic: can two positive numbers ever add up to zero? What property must an amplitude have to cancel out another amplitude?",
    friendlyAnalogy: "Like positive and negative numbers (+5 and -5 = 0), or water waves meeting peak-to-trough!",
    fallbackExplanation: "The second Hadamard gate causes quantum wave interference: the |1⟩ amplitudes cancel out completely due to opposite signs (+½ - ½ = 0), while the |0⟩ amplitudes add together (+½ + ½ = 1). The state returns with 100% certainty to |0⟩!",

    challengeInstruction: `⚡ **Module 4 Challenge:**
Prove quantum wave interference with your own hands!
1. In the **Circuit Canvas**, click empty slot 1 on wire \`q[0]\` and add a second **H** gate (or in code: add a second \`qc.h(0)\` before the measurement).
2. Click **▶ Run**!
3. Watch the histogram collapse from random 50/50 back to **100% deterministic |0⟩**!`,

    validateChallenge: (counts, gates, qubits, code) => {
      const hCount = gates.filter((g) => (g.name || "").toLowerCase() === "h").length;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const c0 = counts["0"] || 0;
      if (hCount < 2 && !code.match(/qc\.h\(0\)[\s\S]*qc\.h\(0\)/)) {
        return { passed: false, feedback: "You need TWO consecutive Hadamard gates on wire q[0]! Add another H gate before measurement." };
      }
      if (total > 0 && c0 / total >= 0.95) {
        return {
          passed: true,
          feedback: "🏆 **Interference Mastered!** Look at that: 100% deterministic collapse to |0⟩! You have proven with physical simulation that quantum computing is based on wave interference!",
        };
      }
      return { passed: false, feedback: "Make sure two H gates precede the measurement, then click ▶ Run." };
    },

    completionMessage: `🌟 **Module 4 Completed: Wave Interference Mastered!**
You understand constructive reinforcement, destructive cancellation, and reversibility.

Ready for **Module 5: Measurement & Register Mapping**? Type **"Next"** or click below!`,
  },

  // ── Module 5: Measurement & Register Mapping ────────────────────────────────
  {
    id: 5,
    slug: "measurement-and-registers",
    title: "Measurement Bases & Register Mapping",
    badge: "Module 5/6",
    concept: "Computational (Z) vs Diagonal (X) Bases, Qiskit Little-Endian Register Ordering",
    qubits: 2,
    starterCode: `# 🎓 Quantum Journey 101 — Module 5: Measurement & Register Mapping
# Goal: Master how quantum statevectors translate into classical bitstrings.
# In Qiskit, multi-qubit bitstrings are stored in little-endian order: |q1 q0⟩.
# Let's verify how wire assignments map to measurement results!

from qiskit import QuantumCircuit

# Initialize 2 qubits and 2 classical bits
qc = QuantumCircuit(2, 2)

# Apply X gate to qubit 0: q[0] = |1⟩, q[1] = |0⟩
qc.x(0)

# Measure qubit 0 into classical bit 0, qubit 1 into bit 1
qc.measure([0, 1], [0, 1])
`,
    initialGates: [
      { name: "x", qubit: 0, qubits: [0], step: 0, role: "single" },
      { name: "measure", qubit: 0, qubits: [0], step: 1, role: "measure" },
      { name: "measure", qubit: 1, qubits: [1], step: 1, role: "measure" },
    ],
    introPrompt: `Welcome to **Module 5: Measurement Bases & Register Mapping**! 📐

In quantum software engineering, understanding how qubits map to output bitstrings is vital.
In Qiskit, measurement bitstrings follow **little-endian ordering**:
> **\`|q₁ q₀⟩\` (qubit 0 is the rightmost digit, qubit 1 is on the left)**

👉 **Step 1:** We placed an X gate on \`q[0]\` and left \`q[1]\` untouched in state \`|0⟩\`. Click **▶ Run** to see what bitstring appears!`,

    tiers: {
      intuition:
        "Think of writing numbers in decimal: the units column (10⁰) is on the right, and the tens column (10¹) is on the left. In Qiskit, qubit 0 is the units column on the far right!",
      technical:
        "Qiskit labels composite basis states as |q_{n-1} ... q_1 q_0⟩. If q[0] = 1 and q[1] = 0, the state is |01⟩ (not |10⟩). Understanding this prevents bugs when reading quantum register outputs.",
      math:
        "The tensor product ordering is |q₁⟩ ⊗ |q₀⟩. When q₀ = [0, 1]ᵀ and q₁ = [1, 0]ᵀ, |q₁⟩ ⊗ |q₀⟩ = [0, 1, 0, 0]ᵀ, which corresponds to the second basis vector, labeled index 1 in binary ('01').",
    },

    predictionPrompt: "We set q[0] = 1 and q[1] = 0. In Qiskit's |q1 q0⟩ little-endian format, predict what bitstring will be recorded: '01' or '10'?",

    evaluatePrediction: (pred) => {
      const p = pred.toLowerCase();
      if (p.includes("01")) {
        return { isAccurate: true, feedback: "Spot on! In little-endian format |q1 q0⟩, q[0]=1 is on the right, so the output is '01'!" };
      }
      return { isAccurate: false, feedback: "Common trap! Many expect '10', but Qiskit places q[0] on the right (|q1 q0⟩). Press ▶ Run to see '01'!" };
    },

    quizQuestion: "🧠 **Quick Check:** In Qiskit's |q1 q0⟩ format, if we want to measure the bitstring '10' with 100% certainty, which qubit wire must we apply the X gate to: **q[0]** or **q[1]**?",
    quizAcceptKeywords: ["q[1]", "q1", "qubit 1", "1", "second"],
    quizExplanation: "Correct! 🎯 In |q1 q0⟩, the first character is qubit 1. Applying X to q[1] sets q[1] = 1 and q[0] = 0, giving the bitstring '10'!",
    hint: "Remember that qubit 0 is the rightmost digit, and qubit 1 is the leftmost digit (|q1 q0⟩).",
    friendlyAnalogy: "Like the tens digit on a digital clock: the left digit is the second position!",
    fallbackExplanation: "Because Qiskit uses little-endian ordering |q1 q0⟩, the leftmost digit is qubit 1. Applying X to q[1] produces '10'.",

    challengeInstruction: `⚡ **Module 5 Challenge:**
Modify the circuit to measure the bitstring **'10'** with 100% certainty!
1. Remove the X gate from wire \`q[0]\` and place it on wire \`q[1]\` (or in code: \`qc.x(1)\`).
2. Click **▶ Run**!
3. Confirm that the output histogram displays strictly **{"10": 1024}**!`,

    validateChallenge: (counts, gates, qubits, code) => {
      const c10 = counts["10"] || 0;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      if (total > 0 && c10 / total >= 0.95) {
        return {
          passed: true,
          feedback: "🎉 **Challenge Mastered!** You measured '10' with 100% certainty! You now understand little-endian register mapping in Qiskit!",
        };
      }
      return { passed: false, feedback: "Make sure wire q[1] has the X gate and wire q[0] has no gates before measurement, then click ▶ Run." };
    },

    completionMessage: `🌟 **Module 5 Completed: Register Mapping Mastered!**
You understand measurement projections, classical registers, and Qiskit ordering.

Ready for the **Module 6: Capstone Challenge**? Type **"Next"** or click below!`,
  },

  // ── Module 6: Capstone Challenge ───────────────────────────────────────────
  {
    id: 6,
    slug: "capstone",
    title: "Capstone Challenge: Independent Protocol Synthesis",
    badge: "Module 6/6",
    concept: "Independent Circuit Synthesis: Bell State Creation + Quantum Phase Encoding",
    qubits: 2,
    starterCode: `# 🎓 Quantum Journey 101 — Module 6: Capstone Challenge
# Synthesize an unseen protocol combining:
# 1. Superposition (H gate)
# 2. Entanglement (CNOT gate)
# 3. Phase encoding (Z gate)
#
# Goal: Build an entangled pair between q0 and q1, apply a Z gate to q0,
# and observe how the Bell state |Φ+⟩ transforms into |Φ-⟩ = (|00⟩ - |11⟩)/√2!

from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)

# Step 1: Create superposition on q[0]
qc.h(0)

# Step 2: Entangle q[0] and q[1] via CNOT
qc.cx(0, 1)

# Step 3: Apply your phase encoding gate to q[0] here:
# (Add your gate here!)

# Step 4: Measure both qubits
qc.measure([0, 1], [0, 1])
`,
    initialGates: [
      { name: "h", qubit: 0, qubits: [0], step: 0, role: "single" },
      { name: "cx", qubit: 0, qubits: [0, 1], step: 1, role: "two", control: 0, target: 1 },
      { name: "measure", qubit: 0, qubits: [0], step: 2, role: "measure" },
      { name: "measure", qubit: 1, qubits: [1], step: 2, role: "measure" },
    ],
    introPrompt: `Welcome to the **Module 6: Capstone Challenge**! 🏆

This is your final test. Throughout this journey, you've learned:
- **Superposition** ($H$)
- **Bit & Phase Flips** ($X, Z$)
- **Entanglement** (Bell pairs via $H + CX$)
- **Wave Interference** ($H \cdot H = I$)
- **Register Mapping** (|q₁ q₀⟩)

Now, you will build an unseen quantum protocol independently:
You will encode a quantum phase into an entangled channel to create the **|Φ⁻⟩ Bell state**:
> **|Φ⁻⟩ = (|00⟩ - |11⟩) / √2**

👉 **Your Mission:**
In Circuit Canvas or Editor, add a **Pauli-Z gate** to wire \`q[0]\` *after* the CNOT gate (or in code: \`qc.z(0)\` after \`qc.cx(0, 1)\`), then click **▶ Run**!`,

    tiers: {
      intuition:
        "You are acting as Alice in a quantum communication protocol! By applying a single local Z gate to your own qubit, you change the global entangled state shared with Bob from |Φ⁺⟩ to |Φ⁻⟩—without ever touching Bob's qubit!",
      technical:
        "Applying (Z ⊗ I) to |Φ⁺⟩ = (|00⟩ + |11⟩)/√2 produces (Z|0⟩ ⊗ |0⟩ + Z|1⟩ ⊗ |1⟩)/√2 = (|00⟩ - |11⟩)/√2 = |Φ⁻⟩. Under Z-basis measurement, it still reads 50% '00' and 50% '11', but its parity and Bell-basis signature has been encoded.",
      math:
        "(Z ⊗ I)|Φ⁺⟩ = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, -1, 0], [0, 0, 0, -1]] · [1/√2, 0, 0, 1/√2]ᵀ = [1/√2, 0, 0, -1/√2]ᵀ = |Φ⁻⟩.",
    },

    predictionPrompt: "When we apply Z to qubit 0 of the Bell pair (|00⟩+|11⟩)/√2, will the measurement counts still be ~50/50 on '00' and '11'?",

    evaluatePrediction: (pred) => {
      const p = pred.toLowerCase();
      if (p.includes("yes") || p.includes("50") || p.includes("same") || p.includes("still")) {
        return { isAccurate: true, feedback: "Spot on! The Z gate only flips the phase of the |11⟩ term. In standard computational basis measurement, probabilities remain 50/50!" };
      }
      return { isAccurate: false, feedback: "Remember that Z is a phase-flip gate: it changes amplitudes from (+) to (-), but squared probabilities remain 50/50! Press ▶ Run to see!" };
    },

    quizQuestion: "🧠 **Capstone Question:** If Alice and Bob share a |Φ⁺⟩ pair, and Alice applies a Z gate to her qubit, can Bob determine that Alice applied the Z gate just by looking at his raw measurement counts in isolation?",
    quizAcceptKeywords: ["no", "never", "cannot", "can't", "impossible", "no-communication"],
    quizExplanation: "Brilliant! 🎯 Bob cannot detect it in isolation—his counts remain 50/50 random (No-Communication Theorem). They must combine their measurement results to detect the quantum correlation!",
    hint: "Recall the No-Communication Theorem: does measuring or manipulating an entangled qubit allow Bob to see changes without classical communication?",
    friendlyAnalogy: "Like writing a secret message with invisible ink: Bob cannot read it until Alice gives him the special UV flashlight (classical communication)!",
    fallbackExplanation: "Under the No-Communication Theorem, local unitary operations like Z do not alter the reduced density matrix of Bob's qubit. Bob measures 50/50 regardless.",

    challengeInstruction: `⚡ **Grand Capstone Execution:**
1. In the **Circuit Canvas**, add a **Z** gate to wire \`q[0]\` immediately after the CNOT gate (or add \`qc.z(0)\` after \`qc.cx(0, 1)\`).
2. Click **▶ Run**!
3. Verify that the simulation executes, validating your complete mastery of Quantum Journey 101!`,

    validateChallenge: (counts, gates, qubits, code) => {
      const lower = gates.map((g) => (g.name || "").toLowerCase());
      const hasH = lower.includes("h");
      const hasCX = lower.includes("cx") || code.includes("cx");
      const hasZ = lower.includes("z") || code.includes("z(0)");
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const c00 = counts["00"] || counts["0"] || 0;
      const c11 = counts["11"] || 0;

      if (!hasH || !hasCX || !hasZ) {
        return {
          passed: false,
          feedback: "Your capstone circuit needs an H gate on q[0], a CNOT (CX) gate between q[0] and q[1], AND a Z gate on q[0]! Add the missing gate and click ▶ Run.",
        };
      }
      if (total > 0 && (c00 + c11) / total >= 0.85) {
        return {
          passed: true,
          feedback: "🏆 **CONGRATULATIONS! CAPSTONE PROTOCOL VERIFIED!** You created the |Φ⁻⟩ Bell state by combining superposition, entanglement, and phase encoding! You have successfully graduated from Quantum Journey 101!",
        };
      }
      return { passed: false, feedback: "Make sure both qubits are measured after the Z gate, then click ▶ Run." };
    },

    completionMessage: `🎓 **CONGRATULATIONS, GRADUATE! You have officially completed Quantum Journey 101!**

You have mastered the foundational core of quantum information science:
1. **Quantum Foundations:** Statevectors, Dirac kets, and Hilbert space initialization.
2. **Superposition:** The Hadamard transform, Born rule, and finite shot noise.
3. **Quantum Gates & Phase:** Pauli X, Y, Z, bit-flips vs relative phase-flips.
4. **Entanglement:** Bell pairs, CNOT interaction, and non-local correlation.
5. **Wave Interference:** Destructive cancellation (H · H = I) and quantum wave mechanics.
6. **Measurement & Registers:** Qiskit little-endian register mapping.
7. **Capstone Synthesis:** Independent protocol creation and phase manipulation.

🚀 **Next Step:** You are now fully prepared to enter **Quantum 102: Circuits & Algorithms** (Deutsch-Jozsa, Grover's Search, and Quantum Teleportation)!`,
  },
];

/**
 * Retrieve a module definition by ID (clamped 0-6)
 */
export function getJourneyModule(id: number): JourneyModule {
  const found = JOURNEY_101_MODULES.find((m) => m.id === id);
  return found || JOURNEY_101_MODULES[0];
}

/**
 * Backwards compatibility alias for getJourneyMilestone
 */
export const getJourneyMilestone = getJourneyModule;
export const JOURNEY_101_MILESTONES = JOURNEY_101_MODULES;

/**
 * Diagnoses whether a user message triggers a common quantum misconception
 */
export function diagnoseMisconception(userText: string): MisconceptionRule | null {
  for (const rule of COMMON_MISCONCEPTIONS) {
    if (rule.pattern.test(userText)) {
      return rule;
    }
  }
  return null;
}

/**
 * Detects if the user is asking for a specific explanation tier
 */
export function detectDepthRequest(userText: string): "intuition" | "technical" | "math" | null {
  const t = userText.toLowerCase();
  if (t.includes("math") || t.includes("equation") || t.includes("derivation") || t.includes("matrix") || t.includes("matrices") || t.includes("formula")) {
    return "math";
  }
  if (t.includes("technical") || t.includes("qiskit") || t.includes("details") || t.includes("code explanation") || t.includes("deep dive")) {
    return "technical";
  }
  if (t.includes("analogy") || t.includes("intuition") || t.includes("simple") || t.includes("explain like i'm 5") || t.includes("eli5")) {
    return "intuition";
  }
  return null;
}

/**
 * Evaluates whether a user's textual response to a quiz satisfies the module concepts
 */
export function evaluateQuizResponse(
  moduleId: number,
  userText: string
): { passed: boolean; explanation: string; feedback: string } {
  const moduleItem = getJourneyModule(moduleId);
  const normalized = userText.trim().toLowerCase();

  // First check if user triggered a known misconception!
  const misconception = diagnoseMisconception(userText);
  if (misconception) {
    return {
      passed: false,
      explanation: moduleItem.quizExplanation,
      feedback: `⚠️ **Concept Diagnostic Insight:**
*${misconception.concept}*

${misconception.counterExample}

*Give the question another thought, or say 'Move on' to start the challenge!*`,
    };
  }

  const passed = moduleItem.quizAcceptKeywords.some((kw) =>
    normalized.includes(kw.toLowerCase())
  );

  let feedback = "";
  if (!passed) {
    if (moduleId === 0) {
      feedback = "Think about mathematical notation: `|0⟩` is not a simple scalar number—it's a quantum state vector pointing along the Z-axis in Hilbert space! Give it a try, or say 'Move on' to start the challenge!";
    } else if (moduleId === 1) {
      feedback = "Almost! Think about flipping a coin: even though heads has a 50% theoretical probability, why don't you get exactly 512 heads every single time in real life? (Hint: natural random variance / statistical shot noise!). Give it another try, or say 'Move on' to start the hands-on challenge!";
    } else if (moduleId === 2) {
      if (normalized.includes("x") || normalized === "px" || normalized.includes("not")) {
        feedback = "Close guess! But **Pauli-X (PX)** is the **bit-flip** (NOT) gate: it turns |0⟩ into |1⟩. The question asks which gate flips the **quantum phase (±)** without changing probabilities: **Pauli-Y** or **Pauli-Z**? Try typing **Z**!";
      } else if (normalized.includes("y") || normalized === "py") {
        feedback = "Super close! Pauli-Y flips both bit and phase. The pure phase-flip operator that only affects the phase of |1⟩ without flipping bits is **Pauli-Z**! Try typing **Z** to confirm!";
      } else {
        feedback = "Think about the coordinate axes: X is the bit-flip (|0⟩ ↔ |1⟩), while Z is the phase-flip (|+⟩ ↔ |-⟩)! Which Pauli gate flips phase: **Pauli-Y** or **Pauli-Z**?";
      }
    } else if (moduleId === 3) {
      if (normalized.includes("0") || normalized === "zero") {
        feedback = "Careful! In this Bell state (|00⟩ + |11⟩)/√2, both qubits are entangled into identical values (either both 0 or both 1). If qubit 0 was measured as 1, what must qubit 1 be? Give it another try!";
      } else {
        feedback = "Remember that the two qubits in state (|00⟩ + |11⟩)/√2 are perfectly synchronized. If qubit 0 is measured as 1, what must qubit 1 be?";
      }
    } else if (moduleId === 4) {
      feedback = "Remember that in quantum computing, H · H = I (Identity)! The wave amplitudes cancel out destructively. What state does the qubit return to with 100% certainty: |0⟩ or |1⟩?";
    } else if (moduleId === 5) {
      feedback = "Remember Qiskit's little-endian ordering: |q1 q0⟩! Qubit 0 is on the right, and qubit 1 is on the left. Which qubit wire controls the leftmost digit?";
    } else if (moduleId === 6) {
      feedback = "Recall the No-Communication Theorem: Bob's local measurement statistics in isolation remain 50/50 regardless of Alice's operations. Can Bob detect Alice's gate without comparing notes?";
    }
  }

  return {
    passed,
    explanation: moduleItem.quizExplanation,
    feedback,
  };
}

/**
 * Detects if the user is explicitly asking for a hint or tip
 */
export function isAskingForHint(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t.includes("hint") ||
    t.includes("clue") ||
    t.includes("guide me") ||
    t.includes("give me a tip") ||
    t.startsWith("what should i") ||
    t === "?"
  );
}

/**
 * Detects if the user wants an explanation, wants to learn/understand, reveal the answer, skip, or proceed to the challenge.
 * This takes PRIORITY over general uncertainty (e.g. "I'm not sure, but I want to know").
 */
export function isWantingToSkipOrProceed(text: string): boolean {
  const t = text.trim().toLowerCase();
  const patterns = [
    "want to know",
    "wanna know",
    "want to learn",
    "want to understand",
    "wanna understand",
    "tell me",
    "explain",
    "explain it",
    "teach me",
    "how does it work",
    "why does it work",
    "why is that",
    "how come",
    "tell me the answer",
    "give up",
    "skip",
    "move on",
    "continue",
    "show challenge",
    "go to challenge",
    "jump to challenge",
    "just tell me",
    "what is the answer",
    "what's the answer",
    "show me",
    "proceed",
    "reveal",
    "next step",
  ];
  return patterns.some((p) => t.includes(p));
}

/**
 * Checks if the user explicitly expressed genuine curiosity / desire to learn
 * (e.g. "I want to know", "curious", "explain it to me", "teach me")
 */
export function isCuriousKnowledgeRequest(text: string): boolean {
  const t = text.trim().toLowerCase();
  const patterns = [
    "want to know",
    "wanna know",
    "want to learn",
    "want to understand",
    "wanna understand",
    "curious",
    "teach me",
    "explain",
    "why is that",
    "how come",
  ];
  return patterns.some((p) => t.includes(p));
}

/**
 * Detects if the user expresses uncertainty or is stuck ("I don't know", "no idea", etc.)
 * Note: If the user also expressed a desire to know/learn, desire takes priority!
 */
export function isUncertainOrStuck(text: string): boolean {
  if (isWantingToSkipOrProceed(text)) return false;
  const t = text.trim().toLowerCase();
  const patterns = [
    "don't know",
    "dont know",
    "do not know",
    "no idea",
    "not sure",
    "i'm stuck",
    "im stuck",
    "confused",
    "idk",
    "have no clue",
    "dunno",
    "not clear",
    "help me",
    "can't tell",
    "cant tell",
  ];
  return patterns.some((p) => t.includes(p));
}

/**
 * Generates an empathetic, Socratic tutor response with friendly analogy, progressive hint, or curious reveal
 */
export function getSupportiveTutorResponse(
  moduleId: number,
  type: "hint" | "stuck" | "reveal" | "curious" | "escalate"
): { message: string; shouldAdvanceToChallenge: boolean } {
  const m = getJourneyModule(moduleId);
  if (type === "hint") {
    return {
      message: `💡 **Here is a gentle hint:**

${m.hint}

*Give it a try, or say "Tell me" to see the full explanation and start the challenge!*`,
      shouldAdvanceToChallenge: false,
    };
  }
  if (type === "stuck") {
    return {
      message: `No worries at all! Quantum concepts can be counter-intuitive at first—even top physicists needed time for them to click! 🧠

**Let's think of an everyday analogy:**
${m.friendlyAnalogy}

*What do you think? Feel free to give it a guess, ask for a hint, or say "Tell me" to jump straight into the hands-on challenge!*`,
      shouldAdvanceToChallenge: false,
    };
  }
  if (type === "curious") {
    return {
      message: `I love that curiosity! 🎯 That is exactly what makes quantum mechanics so fascinating. Here is how it works:

${m.fallbackExplanation}

---

${m.challengeInstruction}`,
      shouldAdvanceToChallenge: true,
    };
  }
  if (type === "escalate") {
    return {
      message: `No worries at all! Quantum mechanics is best learned with hands-on circuits rather than pure guesswork. Here is the answer and the physics behind it: 🚀

${m.fallbackExplanation}

---

${m.challengeInstruction}`,
      shouldAdvanceToChallenge: true,
    };
  }
  // Reveal & advance to challenge
  return {
    message: `No problem at all! Here is the core intuition: 🎯

${m.fallbackExplanation}

---

${m.challengeInstruction}`,
    shouldAdvanceToChallenge: true,
  };
}

/**
 * Returns a tiered explanation response (intuition, technical, math)
 */
export function getTieredExplanation(
  moduleId: number,
  tier: "intuition" | "technical" | "math"
): string {
  const m = getJourneyModule(moduleId);
  if (tier === "math") {
    return `### 📐 Mathematical Derivation: ${m.title}

${m.tiers.math}

*Want to test this on the canvas? Press ▶ Run or ask for 'Intuition'!*`;
  }
  if (tier === "technical") {
    return `### ⚙️ Technical Formulation: ${m.title}

${m.tiers.technical}

*You can also ask for 'Show Math' or 'Show Analogy'!*`;
  }
  return `### 💡 Everyday Analogy: ${m.title}

${m.tiers.intuition}

*Ready to see the math? Reply 'Show Math' or 'Show Technical'!*`;
}

/**
 * Builds an enriched system prompt for the AI tutor with pedagogical guardrails
 */
export function buildJourneyTutorPrompt(
  moduleId: number,
  stage: string,
  code: string,
  userMessage: string
): string {
  const m = getJourneyModule(moduleId);
  return `[TUTOR MODE: You are Guru AI, a warm, patient, and inspiring Quantum Computing Professor guiding the user through Quantum Journey 101 (${m.badge}: ${m.title}).

Current Curriculum Context:
- Active Module: ${m.badge} (${m.concept})
- Learning Stage: ${stage}
- Active Quiz Question: "${m.quizQuestion}"
- Helpful Analogy: "${m.friendlyAnalogy}"
- Hands-on Challenge: "${m.challengeInstruction}"

Pedagogical Guardrails:
1. SUPPORTIVENESS: Always be warm, encouraging, and patient. Never make the user feel tested or judged.
2. EVIDENCE-BASED GROUNDING: Use the user's active code and simulation counts as ground truth. Never hallucinate passes.
3. COURSE BOUNDARIES (QUANTUM 101): If the user asks about advanced topics (e.g. Shor's algorithm, Grover's search, VQE, quantum error correction, or hardware engineering), acknowledge enthusiastically in 1 brief sentence ("Great question! We will explore that in Quantum 102/103!"), then gently pivot back to the active module on wire q[0].
4. UNCERTAINTY HANDLING: If the user says "I don't know", "I'm stuck", or asks a question, give a gentle Socratic hint without dumping intimidating equations, and invite them to either try an answer or say "Move on" to start the coding challenge.
5. MISCONCEPTION DETECTION: If the user conflates amplitudes with probabilities, or confuses entanglement with faster-than-light communication, explain why using a counter-example.

Current code in editor:
\`\`\`python
${code}
\`\`\`
]

User Message: ${userMessage}`;
}
