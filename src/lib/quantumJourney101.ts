/**
 * Quantum Journey 101 — Curriculum, Milestone State Machine & AI Tutor Engine
 * Aligned with IBM Quantum Learning Fundamentals (Qiskit 1.x)
 *
 * Strictly isolated to project_id: 'quantum_journey_101'.
 * Does not modify or impact any other Qiskit or D-Wave projects.
 */

export interface JourneyMilestone {
  id: number;
  title: string;
  badge: string;
  concept: string;
  qubits: number;
  starterCode: string;
  initialGates: any[];
  introPrompt: string;
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

export const JOURNEY_101_MILESTONES: JourneyMilestone[] = [
  // ── Milestone 1: Superposition & The Born Rule ─────────────────────────────
  {
    id: 1,
    title: "The Magic of Quantum Superposition",
    badge: "Milestone 1/4",
    concept: "Single Qubit, Hadamard Gate, and the Born Rule",
    qubits: 1,
    starterCode: `# 🎓 Quantum Journey 101 — Milestone 1: Superposition
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
    introPrompt: `Welcome to your **Quantum Journey 101**! 🚀 I am **Guru AI**, your personal quantum educator and pair-programmer.

In classical computing, a bit is like a coin lying flat on a table: strictly 0 or 1. But in quantum computing, the **Hadamard (H) gate** sets the coin spinning in mid-air—putting qubit 0 into an equal 50/50 superposition:
> **|ψ⟩ = (|0⟩ + |1⟩) / √2**

👉 **Your First Task:**
1. Switch to the **Circuit Canvas** tab above to view your H gate and Measurement on wire \`q[0]\`.
2. Click **▶ Run** (or press \`Shift+Enter\`) to simulate 1,024 shots with the Aer quantum simulator.
3. Observe the probability histogram in the **Results** drawer!`,

    quizQuestion: `Look at your measurement histogram: out of 1,024 shots, counts for '0' and '1' hover around ~512, but are rarely *exactly* 512.

🧠 **Quick Check:** Why does a real quantum measurement yield ~512/512 instead of exactly 512 every run? *(Hint: Think about flipping a fair coin 1,024 times!)*`,

    quizAcceptKeywords: [
      "random",
      "probab",
      "statistic",
      "sample",
      "sampling",
      "shot",
      "noise",
      "coin",
      "variance",
      "fluctuat",
      "born",
      "collapse",
      "stochastic",
    ],

    quizExplanation: `Spot on! 🎯 In quantum mechanics (governed by the **Born Rule**), the wavefunction amplitudes give probabilities:
**P(0) = 50%, P(1) = 50%**
Every measurement shot is an independent probabilistic collapse. Just like tossing a fair coin 1,024 times rarely gives exactly 512 heads and 512 tails, statistical sampling produces natural variance (shot noise) around the true 50% probability!`,

    hint: "Think about whether quantum measurement is deterministic (like reading fixed data from a hard drive) or probabilistic (like sampling from a probability distribution over multiple independent shots).",

    friendlyAnalogy: "Think of flipping a fair coin 1,024 times. Theoretically, heads has a 50% chance. But in real life, do you get exactly 512 heads every single time? Or does natural randomness cause small statistical fluctuations (like 508, 517, 511)?",

    fallbackExplanation: "In quantum mechanics, the Hadamard gate puts the qubit into equal probability: 50% for |0⟩ and 50% for |1⟩. Because each measurement shot is an independent random collapse, statistical sampling noise naturally produces counts near 512 (e.g. 518 vs 506) rather than exactly 512 every single run.",

    challengeInstruction: `⚡ **Milestone 1 Hands-On Challenge:**
Let's witness quantum determinism vs superposition!
1. On the **Circuit Canvas**, hover over the **H** gate and click **✕** to delete it (or comment out \`qc.h(0)\` in the code editor).
2. Click **▶ Run** again!
3. Predict what the measurement histogram will show when only a bare wire is measured!`,

    validateChallenge: (counts, gates, qubits, code) => {
      const hasH = gates.some((g) => (g.name || "").toLowerCase() === "h");
      const hasMeasure =
        gates.some((g) => (g.name || "").toLowerCase() === "measure") ||
        code.includes("measure");
      const zeroCount = counts["0"] || 0;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);

      if (hasH) {
        return {
          passed: false,
          feedback:
            "The Hadamard (H) gate is still on the wire! Delete it or comment it out so qubit 0 starts unperturbed in state |0⟩, then press ▶ Run.",
        };
      }
      if (!hasMeasure) {
        return {
          passed: false,
          feedback:
            "No measurement was detected! Make sure you still have `qc.measure(0, 0)` so the simulator can record the state.",
        };
      }
      if (total > 0 && zeroCount / total >= 0.95) {
        return {
          passed: true,
          feedback:
            "🎉 **Challenge Mastered!** Without the H gate, the qubit collapses to |0⟩ with 100% deterministic certainty. You have officially proved the difference between classical determinism and quantum superposition!",
        };
      }
      return {
        passed: false,
        feedback:
          "Circuit ran, but the counts did not show 100% in |0⟩. Make sure no gates precede the measurement, then click ▶ Run.",
      };
    },

    completionMessage: `🌟 **Milestone 1 Completed: Superposition Mastered!**
You've unlocked the fundamental property of qubits: probability amplitudes and the Born rule.

Ready for **Milestone 2: The Quantum NOT & Phase Flips**? Type **"Next Milestone"** or click below!`,
  },

  // ── Milestone 2: Pauli Gates & Quantum Phase ───────────────────────────────
  {
    id: 2,
    title: "Quantum Bit & Phase Flips (Pauli X & Z)",
    badge: "Milestone 2/4",
    concept: "Pauli-X (NOT), Pauli-Z (Phase), and the |+⟩ vs |-⟩ Basis",
    qubits: 1,
    starterCode: `# 🎓 Quantum Journey 101 — Milestone 2: Pauli Gates & Phase
# Goal: Master quantum state manipulation using Pauli gates.
# The Pauli-X gate performs a bit-flip: X|0⟩ = |1⟩.
# Then explore what happens when X meets H!

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
    introPrompt: `Welcome to **Milestone 2: Quantum Bit & Phase Flips**! 🔄

In classical computers, a NOT gate simply flips 0 to 1. In quantum computing, this is the **Pauli-X gate**:
> **X|0⟩ = |1⟩,  X|1⟩ = |0⟩**

👉 **Step 1:** Click **▶ Run** to confirm that the X gate deterministically flips the initial |0⟩ into state |1⟩ with 100% certainty!`,

    quizQuestion: `Now that you verified **X|0⟩ = |1⟩**:

🧠 **Quick Check:** In classical computing, there is only one way to flip a bit (0 ↔ 1). But in quantum computing, qubits can also have a **relative phase** ($\pm$). Which Pauli gate flips the quantum phase without changing the measurement probabilities: **Pauli-Y** or **Pauli-Z**?`,

    quizAcceptKeywords: ["z", "pauli-z", "pauli z", "phase"],

    quizExplanation: `Correct! 🎯 The **Pauli-Z gate** is the quantum phase-flip operator:
> **Z|0⟩ = |0⟩,  Z|1⟩ = -|1⟩**
On the superposition state **|+⟩**, applying **Z** turns it into **|-⟩ = (|0⟩ - |1⟩) / √2**. The probabilities are still 50/50, but the internal quantum phase is shifted by 180°!`,

    hint: "Look closely at the gate names: Pauli-X is the bit-flip (flips 0 ↔ 1 along the X axis). Which Pauli gate corresponds to the Z axis and flips the phase of |1⟩ to -|1⟩?",

    friendlyAnalogy: "Imagine a clock hand pointing at 12 o'clock (|0⟩). The Pauli-X gate flips the hand all the way to 6 o'clock (|1⟩)—a bit flip. But if the hand is pointing sideways at 3 o'clock (superposition), flipping its direction across the dial without changing its length is a phase flip—governed by Pauli-Z!",

    fallbackExplanation: "The Pauli-Z gate flips the quantum phase without changing measurement probabilities (Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩). On the $|+\rangle$ state, applying $Z$ produces $|-\rangle$, which has the exact same 50/50 measurement probabilities, but opposite internal phase!",

    challengeInstruction: `⚡ **Milestone 2 Hands-On Challenge:**
Let's create the famous **|-⟩** state!
1. On the **Circuit Canvas**, add a **Hadamard (H)** gate immediately *after* the **X** gate on wire \`q[0]\` (so the sequence is: \`X -> H -> Measure\`).
2. Click **▶ Run** to observe the measurement!`,

    validateChallenge: (counts, gates, qubits, code) => {
      const lowerNames = gates.map((g) => (g.name || "").toLowerCase());
      const hasX = lowerNames.includes("x");
      const hasH = lowerNames.includes("h");
      const xIdx = lowerNames.indexOf("x");
      const hIdx = lowerNames.indexOf("h");
      const hasMeasure = lowerNames.includes("measure") || code.includes("measure");

      if (!hasX || !hasH) {
        return {
          passed: false,
          feedback:
            "Your circuit needs both an X gate AND an H gate on wire q[0]. Add an H gate right after X!",
        };
      }
      if (hIdx < xIdx) {
        return {
          passed: false,
          feedback:
            "Order matters in quantum mechanics! Make sure the X gate comes FIRST, followed by the H gate (X -> H).",
        };
      }
      if (!hasMeasure) {
        return {
          passed: false,
          feedback: "Don't forget to keep `qc.measure(0, 0)` at the end of the wire!",
        };
      }

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const c0 = counts["0"] || 0;
      const c1 = counts["1"] || 0;
      if (total > 0 && c0 > 0.35 * total && c1 > 0.35 * total) {
        return {
          passed: true,
          feedback:
            "🎉 **Challenge Mastered!** You successfully generated the **|-⟩ = (|0⟩ - |1⟩) / √2** state! Notice that both |+⟩ and |-⟩ look identical under standard Z-basis measurement (50/50), but their quantum phases are opposites!",
        };
      }
      return {
        passed: false,
        feedback: "Run the circuit with shots=1024 to confirm equal superposition between |0⟩ and |1⟩.",
      };
    },

    completionMessage: `🌟 **Milestone 2 Completed: Quantum Phase Unlocked!**
You've mastered single-qubit transformations ($X$, $Z$, $H$).

Ready for the crown jewel of quantum mechanics: **Milestone 3 — Quantum Entanglement & Bell States**? Type **"Next Milestone"** or click below!`,
  },

  // ── Milestone 3: Bell State Entanglement ───────────────────────────────────
  {
    id: 3,
    title: "Spooky Action: Creating a Bell Pair",
    badge: "Milestone 3/4",
    concept: "Two Qubits, Controlled-NOT (CNOT / CX), and Quantum Entanglement",
    qubits: 2,
    starterCode: `# 🎓 Quantum Journey 101 — Milestone 3: Bell State Entanglement
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
    introPrompt: `Welcome to **Milestone 3: Spooky Action — Creating a Bell Pair**! 🌌

When two qubits become **entangled**, they no longer possess independent states. Their joint wavefunction is:
> **|Φ⁺⟩ = (|00⟩ + |11⟩) / √2**

👉 **Step 1:** Notice your workspace has cleanly expanded to two wires: \`q[0]\` and \`q[1]\`. Click **▶ Run** (or press \`Shift+Enter\`) to execute 1,024 shots!`,

    quizQuestion: `Inspect your Results histogram: you got ~50% counts for '00' and ~50% counts for '11'.

🧠 **Quick Check:** Notice that '01' and '10' have **0%** counts! If an astronaut measures qubit 0 on Earth and finds it to be '1', what is the state of qubit 1 on Mars *before* it is even measured?`,

    quizAcceptKeywords: ["1", "one", "|1>", "same", "definite"],

    quizExplanation: `Exactly right! 🎯 Because the qubits are entangled in state **(|00⟩ + |11⟩) / √2**, measuring qubit 0 as '1' collapses the entire joint state to **|11⟩**. Qubit 1 is instantly guaranteed to be '1' with 100% certainty, no matter the physical distance between them! This is what Einstein famously called *"spooky action at a distance"*!`,

    hint: "Look at the measured pairs: only '00' and '11' exist in the distribution. If the first digit (qubit 0) is definitely 1, what must the second digit (qubit 1) be?",

    friendlyAnalogy: "Think of a pair of magic shoes in separate boxes. One is left, one is right. As soon as you open box 1 on Earth and find the left shoe, you instantly know box 2 on Mars contains the right shoe—even without opening it! In our Bell state, both qubits are synchronized into the exact same value.",

    fallbackExplanation: "Because the two qubits are entangled in state **(|00⟩ + |11⟩) / √2**, measuring qubit 0 as 1 collapses the joint state to **|11⟩**. Qubit 1 is instantaneously guaranteed to be 1 as well! The states '01' and '10' have strictly zero probability.",

    challengeInstruction: `⚡ **Milestone 3 Hands-On Challenge:**
Let's create an *anti-correlated* Bell state **|Ψ⁺⟩ = (|01⟩ + |10⟩) / √2**!
1. Add an **X gate** to wire \`q[1]\` *before* the CNOT (or in code: \`qc.x(1)\` right before \`qc.cx(0, 1)\`).
2. Click **▶ Run**!
3. Observe how the correlated outcomes swap to strictly opposite states ('01' and '10')!`,

    validateChallenge: (counts, gates, qubits, code) => {
      const hasCX =
        gates.some((g) => (g.name || "").toLowerCase() === "cx") ||
        code.includes("cx");
      const c01 = counts["01"] || counts["1"] || 0;
      const c10 = counts["10"] || 0;
      const c00 = counts["00"] || counts["0"] || 0;
      const c11 = counts["11"] || 0;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);

      if (!hasCX) {
        return {
          passed: false,
          feedback:
            "Keep the CNOT (CX) gate connecting q[0] and q[1] to maintain entanglement!",
        };
      }
      if (
        total > 0 &&
        (c01 + c10) / total >= 0.85 &&
        c00 + c11 <= 0.15 * total
      ) {
        return {
          passed: true,
          feedback:
            "🎉 **Challenge Mastered!** You just created the **|Ψ⁺⟩ = (|01⟩ + |10⟩) / √2** Bell state! Now, measuring qubit 0 as 0 guarantees qubit 1 is 1, and vice versa—perfect quantum anti-correlation!",
        };
      }
      return {
        passed: false,
        feedback:
          "Make sure you added an X gate on q[1] (or q[0]) before the CNOT, then click ▶ Run. You should observe counts in '01' and '10' with zero counts in '00' and '11'.",
      };
    },

    completionMessage: `🌟 **Milestone 3 Completed: Quantum Entanglement Mastered!**
You've conquered multi-qubit systems, CNOT interactions, and Bell pairs.

Ready for the ultimate quantum secret: **Milestone 4 — Quantum Wave Interference**? Type **"Next Milestone"** or click below!`,
  },

  // ── Milestone 4: Wave Interference ─────────────────────────────────────────
  {
    id: 4,
    title: "Quantum Wave Interference (H · H = I)",
    badge: "Milestone 4/4",
    concept: "Constructive vs Destructive Interference, Reversibility",
    qubits: 1,
    starterCode: `# 🎓 Quantum Journey 101 — Milestone 4: Wave Interference
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
    introPrompt: `Welcome to **Milestone 4: Quantum Wave Interference**! 🌊

Here is the secret of quantum advantage: quantum states are **waves**. Waves can add together (constructive interference) or cancel each other out (destructive interference).

Recall that the Hadamard matrix is its own inverse:
> **H · H = I (Identity)**

👉 **Step 1:** Notice your workspace is reset to a clean 1-qubit wire with 1 Hadamard gate. Click **▶ Run** to verify the standard 50/50 superposition first!`,

    quizQuestion: `If you flip a classical coin and get 50% heads and 50% tails, flipping it a second time still gives 50/50 random probability.

🧠 **Quick Check:** What will happen in quantum computing if we apply a *second* Hadamard gate directly after the first? Will it become 50/50 random, or will something extraordinary happen?`,

    quizAcceptKeywords: [
      "0",
      "zero",
      "cancel",
      "interfere",
      "destruct",
      "identity",
      "original",
      "reset",
      "deterministic",
      "100%",
    ],

    quizExplanation: `Extraordinary indeed! 🎯 In quantum mechanics:
First H: **H|0⟩ = (|0⟩ + |1⟩) / √2**
Second H: **H((|0⟩ + |1⟩) / √2) = |0⟩**
The **|1⟩** amplitudes cancel out completely (+½ - ½ = 0), while the **|0⟩** amplitudes add together (+½ + ½ = 1)! This is **destructive interference** in action!`,

    hint: "Think about mathematical cancellation: the Hadamard gate has positive and negative signs in its matrix. Could two paths cancel each other out rather than staying random?",

    friendlyAnalogy: "Think of sound waves or water ripples. If two wave crests meet, they get taller (constructive). If a crest meets a trough of equal height, they cancel out into flat stillness (destructive interference)! That is what the second H gate does to the |1⟩ component.",

    fallbackExplanation: "The second Hadamard gate causes quantum wave interference: the |1⟩ amplitudes cancel out completely due to opposite signs (+½ - ½ = 0), while the |0⟩ amplitudes add together (+½ + ½ = 1). The state returns with 100% certainty to |0⟩!",

    challengeInstruction: `⚡ **Grand Finale Challenge:**
Prove quantum wave interference with your own hands!
1. In the **Circuit Canvas**, click empty slot 1 on wire \`q[0]\` and add a second **H** gate (or in code: add a second \`qc.h(0)\` before the measurement).
2. Click **▶ Run**!
3. Watch the histogram collapse from random 50/50 back to **100% deterministic |0⟩**!`,

    validateChallenge: (counts, gates, qubits, code) => {
      const hCount = gates.filter(
        (g) => (g.name || "").toLowerCase() === "h"
      ).length;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const c0 = counts["0"] || 0;

      if (hCount < 2 && !code.match(/qc\.h\(0\)[\s\S]*qc\.h\(0\)/)) {
        return {
          passed: false,
          feedback:
            "You need TWO consecutive Hadamard gates on wire q[0]! Add another H gate before measurement.",
        };
      }
      if (total > 0 && c0 / total >= 0.95) {
        return {
          passed: true,
          feedback:
            "🏆 **QUANTUM 101 MASTERED!** Look at that: 100% deterministic collapse to |0⟩! You have proven with absolute physical simulation that quantum computing is based on wave interference. You understand superposition, Pauli gates, Bell entanglement, and interference!",
        };
      }
      return {
        passed: false,
        feedback:
          "Make sure two H gates precede the measurement, then click ▶ Run.",
      };
    },

    completionMessage: `🎓 **CONGRATULATIONS! You have graduated from Quantum Journey 101!**
You now understand:
1. **Superposition:** Qubits live in linear combinations of states with complex amplitudes.
2. **Pauli Logic:** Bit-flips ($X$) and phase-flips ($Z$) govern quantum rotations.
3. **Entanglement:** Two qubits can share non-local correlations that defy classical physics.
4. **Interference:** Constructive and destructive interference gives quantum algorithms their computational power.

You are now fully prepared to tackle advanced algorithms in **Quantum 102** (Grover Search, Quantum Teleportation, and VQE)!`,
  },
];

/**
 * Retrieve a milestone definition by ID (clamped 1-4)
 */
export function getJourneyMilestone(id: number): JourneyMilestone {
  const found = JOURNEY_101_MILESTONES.find((m) => m.id === id);
  return found || JOURNEY_101_MILESTONES[0];
}

/**
 * Evaluates whether a user's textual response to a quiz satisfies the milestone concepts
 */
export function evaluateQuizResponse(
  milestoneId: number,
  userText: string
): { passed: boolean; explanation: string; feedback: string } {
  const milestone = getJourneyMilestone(milestoneId);
  const normalized = userText.trim().toLowerCase();

  const passed = milestone.quizAcceptKeywords.some((kw) =>
    normalized.includes(kw.toLowerCase())
  );

  let feedback = "";
  if (!passed) {
    if (milestoneId === 1) {
      feedback = "Almost! Think about flipping a coin: even though heads has a 50% theoretical probability, why don't you get exactly 512 heads every single time in real life? (Hint: natural random variance / statistical shot noise!). Give it another try, or say 'Move on' to start the hands-on challenge!";
    } else if (milestoneId === 2) {
      if (
        normalized.includes("x") ||
        normalized === "px" ||
        normalized.includes("not")
      ) {
        feedback = "Close guess! But **Pauli-X (PX)** is the **bit-flip** (NOT) gate: it turns |0⟩ into |1⟩. The question asks which gate flips the **quantum phase (±)** without changing probabilities: **Pauli-Y** or **Pauli-Z**? Try typing **Z**!";
      } else if (normalized.includes("y") || normalized === "py") {
        feedback = "Super close! Pauli-Y flips both bit and phase. The pure phase-flip operator that only affects the phase of |1⟩ without flipping bits is **Pauli-Z**! Try typing **Z** to confirm!";
      } else {
        feedback = "Think about the coordinate axes: X is the bit-flip (|0⟩ ↔ |1⟩), while Z is the phase-flip (|+⟩ ↔ |-⟩)! Which Pauli gate flips phase: **Pauli-Y** or **Pauli-Z**?";
      }
    } else if (milestoneId === 3) {
      if (normalized.includes("0") || normalized === "zero") {
        feedback = "Careful! In this Bell state (|00⟩ + |11⟩)/√2, both qubits are entangled into identical values (either both 0 or both 1). If qubit 0 was measured as 1, what must qubit 1 be? Give it another try!";
      } else {
        feedback = "Remember that the two qubits in state (|00⟩ + |11⟩)/√2 are perfectly synchronized. If qubit 0 is measured as 1, what must qubit 1 be?";
      }
    } else if (milestoneId === 4) {
      feedback = "Remember that in quantum computing, H · H = I (Identity)! The wave amplitudes cancel out destructively. What state does the qubit return to with 100% certainty: |0⟩ or |1⟩?";
    }
  }

  return {
    passed,
    explanation: milestone.quizExplanation,
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
 * Detects if the user expresses uncertainty or is stuck ("I don't know", "no idea", etc.)
 */
export function isUncertainOrStuck(text: string): boolean {
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
    "tell me",
  ];
  return patterns.some((p) => t.includes(p));
}

/**
 * Detects if the user wants to skip the quiz, reveal the answer, or jump straight to the challenge
 */
export function isWantingToSkipOrProceed(text: string): boolean {
  const t = text.trim().toLowerCase();
  const patterns = [
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
    "show me",
    "proceed",
    "reveal",
    "next step",
  ];
  return patterns.some((p) => t.includes(p));
}

/**
 * Generates an empathetic, Socratic tutor response with friendly analogy or progressive hint
 */
export function getSupportiveTutorResponse(
  milestoneId: number,
  type: "hint" | "stuck" | "reveal"
): { message: string; shouldAdvanceToChallenge: boolean } {
  const m = getJourneyMilestone(milestoneId);
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

*What do you think? Feel free to give it a guess, ask for a hint, or say "Move on" to jump straight into the hands-on challenge!*`,
      shouldAdvanceToChallenge: false,
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
 * Builds an enriched system prompt for the AI tutor with pedagogical guardrails
 */
export function buildJourneyTutorPrompt(
  milestoneId: number,
  stage: string,
  code: string,
  userMessage: string
): string {
  const m = getJourneyMilestone(milestoneId);
  return `[TUTOR MODE: You are Guru AI, a warm, patient, and inspiring Quantum Computing Professor guiding the user through Quantum Journey 101 (${m.badge}: ${m.title}).

Current Curriculum Context:
- Active Milestone: ${m.badge} (${m.concept})
- Learning Stage: ${stage}
- Active Quiz Question: "${m.quizQuestion}"
- Helpful Analogy: "${m.friendlyAnalogy}"
- Hands-on Challenge: "${m.challengeInstruction}"

Pedagogical Guardrails:
1. SUPPORTIVENESS: Always be warm, encouraging, and patient. Never make the user feel tested or judged.
2. ANALOGIES FIRST: Explain quantum principles using concrete physical analogies (coins, waves, compasses).
3. COURSE BOUNDARIES (QUANTUM 101): If the user asks about advanced topics (e.g. Shor's algorithm, Grover's search, VQE, quantum error correction, or hardware engineering), acknowledge enthusiastically in 1 brief sentence ("Great question! We will explore that in Quantum 102/103!"), then gently pivot back to the active milestone on wire q[0].
4. UNCERTAINTY HANDLING: If the user says "I don't know", "I'm stuck", or asks a question, give a gentle Socratic hint without dumping intimidating equations, and invite them to either try an answer or say "Move on" to start the coding challenge.

Current code in editor:
\`\`\`python
${code}
\`\`\`
]

User Message: ${userMessage}`;
}
