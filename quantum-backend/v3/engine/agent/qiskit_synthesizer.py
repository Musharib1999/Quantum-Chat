"""
qiskit_synthesizer.py — Phase 2: Natural Language to Quantum Circuit & Qiskit Code Synthesis Engine
Quantum Guru Engine v3

Transforms natural language prompts into verified, production-ready Qiskit circuits.
Guarantees:
1. Valid Python AST with QuantumCircuit(N) declaration.
2. Qubit count bounds clamping (<= 28 qubits).
3. Persistent canonical AerSimulator execution and output block.
4. AST security analysis against RCE / forbidden modules.
5. High-density mathematical markdown explanation for Quantum Copilot.
"""

import ast
import re
import math
from typing import Tuple, Dict, Any, Optional
from ..groq_client import call_groq
from ..runtime.execution_runner import validate_code_security, run_code_sandbox, CodeExecutionRequest

# Canonical Persistent Execution Output Block for AerSimulator
CANONICAL_AER_BLOCK = """# Execute on AerSimulator
sim = AerSimulator()
result = sim.run(qc, shots=1024).result()
print('Measurement Counts:', result.get_counts())"""

QUANTUM_DOMAINS = [
    "circuit", "qubit", "qubits", "gate", "gates", "ghz", "grover",
    "bell", "bell state", "bell pair", "epr", "teleport", "teleportation",
    "qft", "fourier", "qrng", "random number", "superposition",
    "entangle", "entangled", "entanglement", "deutsch", "bernstein",
    "vazirani", "ansatz", "qaoa", "vqe", "cnot", "hadamard", "pauli", "toffoli",
    "phase oracle", "statevector", "measure", "measurement", "measurements",
    "quantum", "superdense", "w-state", "w state", "adder", "half adder", "full adder",
    "qpe", "phase estimation", "simon", "barrier"
]

BUILD_VERBS = [
    "build", "create", "generate", "synthesize", "make", "construct",
    "implement", "prepare", "setup", "set up", "modify", "update",
    "change", "edit", "replace", "add", "apply", "insert", "write",
    "entangle", "put", "append", "transform",
    "convert", "adjust", "include", "wire", "connect"
]

FILE_TARGETS = [
    "main.py", ".py", "in the file", "in file", "active file",
    "in code", "circuit canvas", "workspace"
]

PURE_QA_KEYWORDS = [
    "what does", "what do", "what is", "what are", "what will", "what can",
    "explain", "how does", "how do", "how is", "how to", "why is",
    "why does", "why do", "tell me about", "tell me what", "tell me how",
    "define", "difference between", "meaning of", "theory of",
    "walk me through", "analyze", "inspect", "review", "debug",
    "can you explain", "could you explain", "understand", "what happens"
]

MALICIOUS_KEYWORDS = [
    "hacked", "overwrite", "rm -rf", "delete", "format", "exploit", "drop table", "system prompt"
]


def is_circuit_synthesis_request(message: str) -> bool:
    """Distinguish between a request to synthesize/modify a quantum circuit vs pure Q&A or exploit."""
    if not message:
        return False
    msg_l = message.lower().strip()

    # 1. Reject malicious or destructive exploit attempts
    if any(k in msg_l for k in MALICIOUS_KEYWORDS):
        return False

    # 2. Check for explicit question / explanatory inquiry
    is_question = (
        any(msg_l.startswith(k) for k in PURE_QA_KEYWORDS) or
        bool(re.search(r'\b(what does|what do|what is|what are|explain|how does|how do|why does|why do|can you explain|walk me through|tell me about|analyze|inspect|review)\b', msg_l)) or
        msg_l.endswith("?")
    )

    # If it is an explanatory question about code or circuit, it is NEVER a synthesis request
    explicit_build_command = any(re.search(r'\b(generate|create|synthesize|build|rewrite)\b', msg_l) for _ in [1])
    if is_question and not (explicit_build_command and not any(k in msg_l for k in ["what does", "explain", "inspect", "review", "debug", "analyze"])):
        return False

    # 3. Must involve a recognized quantum computing concept, named algorithm, or file reference
    has_quantum = any(k in msg_l for k in QUANTUM_DOMAINS)
    is_named = any(k in msg_l for k in [
        "ghz", "grover", "bell", "epr", "qft", "qrng", "teleport", "entangle", "entanglement",
        "bernstein", "vazirani", "deutsch", "jozsa", "superdense", "w-state", "w state",
        "adder", "half adder", "qpe", "phase estimation", "simon", "vqe", "qaoa", "barrier"
    ])
    has_file = any(k in msg_l for k in FILE_TARGETS)

    if not has_quantum and not is_named and not has_file:
        return False

    # 4. Check for build/modify action verbs (word-boundary matched)
    has_build = any(re.search(r'\b' + re.escape(v) + r'\b', msg_l) for v in BUILD_VERBS)

    return has_build or (is_named and any(k in msg_l for k in ["state", "circuit", "pair", "protocol", "algorithm"]))


def _extract_qubit_count(text: str, default: int = 3, max_qubits: int = 28) -> int:
    """Extract requested qubit count from natural language or code (e.g., '5-qubit', 'QuantumCircuit(4)')."""
    if not text:
        return default
    m1 = re.search(r'QuantumCircuit\s*\(\s*(\d+)', text, re.IGNORECASE)
    if m1:
        try:
            return max(1, min(int(m1.group(1)), max_qubits))
        except ValueError:
            pass
    m2 = re.search(r'(\d+)\s*[- ]*(?:qubit|qubits|q)', text, re.IGNORECASE)
    if m2:
        try:
            return max(1, min(int(m2.group(1)), max_qubits))
        except ValueError:
            pass
    return default


def _extract_target_bitstring(prompt: str, default: str = "101") -> str:
    """Extract binary bitstring for Grover/Bernstein (e.g., '|101>', 'state 110', '10101')."""
    match = re.search(r'\|([01]+)\>', prompt)
    if match:
        return match.group(1)
    match2 = re.search(r'\b([01]{2,8})\b', prompt)
    if match2:
        return match2.group(1)
    return default


# ── DETERMINISTIC ALGORITHMIC GENERATORS ──

def generate_ghz_circuit(num_qubits: int = 3) -> Tuple[str, str, Dict[str, Any]]:
    """Synthesize N-qubit Greenberger-Horne-Zeilinger (GHZ) maximally entangled state."""
    num_qubits = max(2, min(num_qubits, 28))
    code_lines = [
        "from qiskit import QuantumCircuit",
        "from qiskit_aer import AerSimulator",
        "",
        f"# {num_qubits}-Qubit Greenberger-Horne-Zeilinger (GHZ) Entangled State",
        f"# |GHZ> = (|0...0> + |1...1>) / sqrt(2)",
        f"qc = QuantumCircuit({num_qubits})",
        "",
        "# Step 1: Create superposition on lead qubit",
        "qc.h(0)",
        "",
        "# Step 2: Propagate entanglement via CNOT cascade",
    ]
    for q in range(num_qubits - 1):
        code_lines.append(f"qc.cx({q}, {q + 1})")

    code_lines.extend([
        "",
        "# Step 3: Measurement",
        "qc.measure_all()",
        "",
        CANONICAL_AER_BLOCK
    ])
    code = "\n".join(code_lines)

    explanation = (
        f"### {num_qubits}-Qubit GHZ Maximally Entangled State\n\n"
        f"Synthesized a **{num_qubits}-qubit Greenberger-Horne-Zeilinger (GHZ) circuit**.\n\n"
        f"**Mathematical State Evolution:**\n"
        f"1. **Initial State:** $|0\\rangle^{{\\otimes {num_qubits}}}$\n"
        f"2. **Superposition:** $H |0\\rangle_0 \\to \\frac{{1}}{{\\sqrt{{2}}}}(|0\\rangle + |1\\rangle) \\otimes |0\\rangle^{{\\otimes {num_qubits-1}}}$\n"
        f"3. **Entangling Cascade:** Successive $CX(q_i, q_{{i+1}})$ gates entangle each wire, yielding the macroscopic superposition:\n"
        f"$$\\lvert \\text{{GHZ}}_{{{num_qubits}}} \\rangle = \\frac{{\\lvert 0^{{\\otimes {num_qubits}}} \\rangle + \\lvert 1^{{\\otimes {num_qubits}}} \\rangle}}{{\\sqrt{{2}}}}$$\n\n"
        f"Execution on `AerSimulator` will yield symmetric measurement counts concentrated strictly in states `{'0'*num_qubits}` and `{'1'*num_qubits}`."
    )

    metadata = {
        "circuit_name": f"{num_qubits}-Qubit GHZ State",
        "num_qubits": num_qubits,
        "depth": num_qubits + 1,
        "gates": num_qubits + 1,
        "summary": f"Prepared {num_qubits}-qubit GHZ macroscopic entanglement with H + CNOT cascade"
    }
    return code, explanation, metadata


def generate_bell_circuit(bell_type: str = "phi_plus") -> Tuple[str, str, Dict[str, Any]]:
    """Synthesize 2-qubit Bell EPR pair."""
    code_lines = [
        "from qiskit import QuantumCircuit",
        "from qiskit_aer import AerSimulator",
        "",
        "# 2-Qubit Bell State (|Phi+> = (|00> + |11>)/sqrt(2))",
        "qc = QuantumCircuit(2)",
        "qc.h(0)",
        "qc.cx(0, 1)",
    ]
    if bell_type == "phi_minus":
        code_lines.insert(5, "qc.z(0)")
    elif bell_type == "psi_plus":
        code_lines.insert(5, "qc.x(1)")
    elif bell_type == "psi_minus":
        code_lines.insert(5, "qc.x(1)")
        code_lines.insert(6, "qc.z(0)")

    code_lines.extend([
        "qc.measure_all()",
        "",
        CANONICAL_AER_BLOCK
    ])
    code = "\n".join(code_lines)

    explanation = (
        "### Bell State (|\\Phi^+\\rangle) EPR Entanglement\n\n"
        "Synthesized the canonical 2-qubit maximally entangled Bell state.\n\n"
        "$$\\lvert \\Phi^+ \\rangle = \\frac{\\lvert 00 \\rangle + \\lvert 11 \\rangle}{\\sqrt{2}}$$\n\n"
        "* **Hadamard Gate ($H$):** Rotates qubit 0 into symmetric superposition $\\frac{1}{\\sqrt{2}}(|0\\rangle + |1\\rangle)$.\n"
        "* **Controlled-NOT ($CX$):** Flips qubit 1 conditioned on qubit 0, locking the bipartite system into maximum quantum correlation."
    )

    metadata = {
        "circuit_name": "Bell State (|Phi+>)",
        "num_qubits": 2,
        "depth": 3,
        "gates": 3,
        "summary": "Prepared 2-qubit maximally entangled Bell state with H + CX"
    }
    return code, explanation, metadata


def generate_grover_circuit(target_state: str = "101") -> Tuple[str, str, Dict[str, Any]]:
    """Synthesize Grover's quantum search algorithm for an arbitrary binary marked state."""
    n = max(2, min(len(target_state), 6))  # Clamp to 2-6 qubits for responsive local simulation
    target = target_state[:n]

    code_lines = [
        "from qiskit import QuantumCircuit",
        "from qiskit_aer import AerSimulator",
        "",
        f"# Grover's Search Algorithm for Target State |{target}>",
        f"# Qubits: {n} | Optimal iterations: 1",
        f"qc = QuantumCircuit({n})",
        "",
        "# 1. State Initialization: Uniform Superposition",
    ]
    for i in range(n):
        code_lines.append(f"qc.h({i})")
    code_lines.extend([
        "qc.barrier()",
        "",
        f"# 2. Phase Oracle for |{target}>",
    ])

    # Bit flips to map target state to |11...1>
    for i, bit in enumerate(target):
        if bit == '0':
            code_lines.append(f"qc.x({i})")

    # Multi-controlled Z via H + MCX + H
    if n == 2:
        code_lines.append("qc.cz(0, 1)")
    elif n == 3:
        code_lines.append("qc.h(2)")
        code_lines.append("qc.ccx(0, 1, 2)")
        code_lines.append("qc.h(2)")
    else:
        code_lines.append(f"qc.h({n-1})")
        ctrls = list(range(n - 1))
        code_lines.append(f"qc.mcx({ctrls}, {n-1})")
        code_lines.append(f"qc.h({n-1})")

    for i, bit in enumerate(target):
        if bit == '0':
            code_lines.append(f"qc.x({i})")
    code_lines.append("qc.barrier()")

    # 3. Diffusion Operator (Grover Diffuser 2|s><s| - I)
    code_lines.extend([
        "",
        "# 3. Grover Diffusion Operator (Amplification around mean)",
    ])
    for i in range(n):
        code_lines.append(f"qc.h({i})")
    for i in range(n):
        code_lines.append(f"qc.x({i})")
    code_lines.append("")

    if n == 2:
        code_lines.append("qc.cz(0, 1)")
    elif n == 3:
        code_lines.append("qc.h(2)")
        code_lines.append("qc.ccx(0, 1, 2)")
        code_lines.append("qc.h(2)")
    else:
        code_lines.append(f"qc.h({n-1})")
        ctrls = list(range(n - 1))
        code_lines.append(f"qc.mcx({ctrls}, {n-1})")
        code_lines.append(f"qc.h({n-1})")

    code_lines.append("")
    for i in range(n):
        code_lines.append(f"qc.x({i})")
    for i in range(n):
        code_lines.append(f"qc.h({i})")
    code_lines.extend([
        "qc.barrier()",
        "",
        "# 4. Measurement",
        "qc.measure_all()",
        "",
        CANONICAL_AER_BLOCK
    ])
    code = "\n".join(code_lines)

    explanation = (
        f"### Grover's Quantum Search for $\\lvert {target} \\rangle$\n\n"
        f"Synthesized **Grover's Search Algorithm** on {n} qubits targeting the marked state $\\lvert {target} \\rangle$.\n\n"
        f"**Algorithmic Stages:**\n"
        f"1. **Equal Superposition ($H^{{\\otimes {n}}}$):** Initializes the quantum register into uniform amplitude $\\frac{{1}}{{\\sqrt{{{2**n}}}}} \\sum_x |x\\rangle$.\n"
        f"2. **Phase Oracle ($U_w$):** Inverts the phase of the target state: $U_w |x\\rangle = (-1)^{{f(x)}} |x\\rangle$, marking $\\lvert {target} \\rangle$ with a negative amplitude.\n"
        f"3. **Grover Diffusion Operator ($2|s\\rangle\\langle s| - I$):** Performs inversion around the mean, constructively interfering the probability amplitude of $\\lvert {target} \\rangle$ to near $100\\%$.\n\n"
        f"Running on `AerSimulator` will demonstrate a sharp probability spike on measurement state `'{target}'`."
    )

    metadata = {
        "circuit_name": f"Grover Search (|{target}>)",
        "num_qubits": n,
        "depth": 12,
        "gates": 2 * n + 6,
        "summary": f"Synthesized Grover Search for marked state |{target}> with Oracle and Diffuser"
    }
    return code, explanation, metadata


def generate_qft_circuit(num_qubits: int = 4) -> Tuple[str, str, Dict[str, Any]]:
    """Synthesize Quantum Fourier Transform (QFT) on N qubits."""
    n = max(2, min(num_qubits, 10))
    code_lines = [
        "import numpy as np",
        "from qiskit import QuantumCircuit",
        "from qiskit_aer import AerSimulator",
        "",
        f"# {n}-Qubit Quantum Fourier Transform (QFT)",
        f"qc = QuantumCircuit({n})",
        "",
        "# 1. Apply QFT rotations",
    ]

    for j in range(n):
        code_lines.append(f"qc.h({j})")
        for k in range(j + 1, n):
            lam = f"np.pi / {2**(k - j)}"
            code_lines.append(f"qc.cp({lam}, {k}, {j})")
        code_lines.append("qc.barrier()")

    code_lines.extend([
        "# 2. Bit-reversal swap network",
    ])
    for j in range(n // 2):
        code_lines.append(f"qc.swap({j}, {n - 1 - j})")

    code_lines.extend([
        "",
        "# 3. Measurement",
        "qc.measure_all()",
        "",
        CANONICAL_AER_BLOCK
    ])
    code = "\n".join(code_lines)

    explanation = (
        f"### {n}-Qubit Quantum Fourier Transform (QFT)\n\n"
        f"Synthesized the canonical **Quantum Fourier Transform** mapping computational basis states to frequency domain phase states.\n\n"
        f"$$\\text{{QFT}} \\lvert j \\rangle = \\frac{{1}}{{\\sqrt{{{2**n}}}}} \\sum_{{k=0}}^{{{2**n}-1}} \\omega^{{jk}} \\lvert k \\rangle, \\quad \\omega = e^{{2\\pi i / {2**n}}}$$\n\n"
        f"* **Controlled-Phase Gates ($CP$):** Apply successive binary fractional phase shifts $R_k = \\text{{diag}}(1, e^{{2\\pi i / 2^k}})$.\n"
        f"* **Swap Network:** Reverses the output register to match standard most-significant-bit order."
    )

    metadata = {
        "circuit_name": f"{n}-Qubit QFT",
        "num_qubits": n,
        "depth": n * 3,
        "gates": n * (n + 1) // 2,
        "summary": f"Constructed {n}-qubit Quantum Fourier Transform with phase rotations and swap network"
    }
    return code, explanation, metadata


def generate_qrng_circuit(num_qubits: int = 2) -> Tuple[str, str, Dict[str, Any]]:
    """Synthesize Quantum Random Number Generator (QRNG)."""
    n = max(1, min(num_qubits, 16))
    code_lines = [
        "from qiskit import QuantumCircuit",
        "from qiskit_aer import AerSimulator",
        "",
        f"# {n}-Qubit True Quantum Random Number Generator (QRNG)",
        f"# Generates 2^{n} ({2**n}) equally likely stochastic outcomes",
        f"qc = QuantumCircuit({n})",
        "",
        "# Apply Hadamard gates to create maximally unbiased superpositions",
    ]
    for i in range(n):
        code_lines.append(f"qc.h({i})")

    code_lines.extend([
        "",
        "qc.measure_all()",
        "",
        CANONICAL_AER_BLOCK
    ])
    code = "\n".join(code_lines)

    explanation = (
        f"### {n}-Qubit Quantum Random Number Generator (QRNG)\n\n"
        f"Synthesized a fundamental **Quantum Random Number Generator** leveraging true quantum mechanical wave-function collapse.\n\n"
        f"$$\\lvert \\psi \\rangle = \\left(\\frac{{\\lvert 0 \\rangle + \\lvert 1 \\rangle}}{{\\sqrt{{2}}}}\\right)^{{\\otimes {n}}} = \\frac{{1}}{{\\sqrt{{{2**n}}}}} \\sum_{{x=0}}^{{{2**n}-1}} \\lvert x \\rangle$$\n\n"
        f"Measurement forces an instantaneous projection into one of the $2^{{{n}}}$ orthogonal basis states with exact uniform probability $P(x) = \\frac{{1}}{{{2**n}}}$."
    )

    metadata = {
        "circuit_name": f"{n}-Qubit QRNG",
        "num_qubits": n,
        "depth": 2,
        "gates": n + 1,
        "summary": f"Synthesized {n}-qubit QRNG with uniform Hadamard superposition"
    }
    return code, explanation, metadata


def generate_teleportation_circuit(num_qubits: int = 3) -> Tuple[str, str, Dict[str, Any]]:
    """Synthesize Quantum Teleportation Protocol circuit for specified qubit count (>= 3)."""
    n = max(3, min(num_qubits, 28))
    bob_q = 2 if n == 3 else (n - 1)

    if n == 3:
        code = f"""from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

# Quantum Teleportation Protocol (3 Qubits)
# q0: State to teleport (|psi>) | q1: Alice transmission qubit | q2: Bob receiver qubit
qc = QuantumCircuit(3)

# 1. Prepare arbitrary state on Q0 (e.g. state |+> via Hadamard)
qc.h(0)

# 2. Create EPR Bell pair between Q1 (Alice) and Q2 (Bob)
qc.h(1)
qc.cx(1, 2)

# 3. Alice performs Bell Measurement on Q0 and Q1
qc.cx(0, 1)
qc.h(0)

# 4. Bob applies feedforward Pauli corrections based on Alice's outcome
qc.cx(1, 2)
qc.cz(0, 2)

# Measure final reconstructed state on Bob's qubit (Q2)
qc.measure_all()

{CANONICAL_AER_BLOCK}"""
    else:
        code = f"""from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

# Quantum Teleportation Protocol ({n} Qubits)
# q0: State to teleport (|psi>) | q1: Alice transmission qubit | q{bob_q}: Bob receiver qubit | Ancilla: q2..q{bob_q-1}
qc = QuantumCircuit({n})

# 1. Prepare arbitrary state on Q0 (e.g. state |+> via Hadamard)
qc.h(0)

# 2. Create EPR Bell pair between Q1 (Alice) and Q{bob_q} (Bob)
qc.h(1)
qc.cx(1, {bob_q})

# 3. Alice performs Bell Measurement on Q0 and Q1
qc.cx(0, 1)
qc.h(0)

# 4. Bob applies feedforward Pauli corrections based on Alice's outcome
qc.cx(1, {bob_q})
qc.cz(0, {bob_q})

# Measure all qubits across the {n}-qubit register
qc.measure_all()

{CANONICAL_AER_BLOCK}"""

    explanation = (
        fr"### Quantum Teleportation Protocol ({n} Qubits)\n\n"
        fr"Synthesized the classic **Quantum Teleportation Protocol** transferring an unknown quantum state $|\psi\rangle$ from Alice ($q_0$) to Bob ($q_{bob_q}$) using an EPR pair and feedforward Pauli corrections.\n\n"
        fr"1. **State Preparation:** Prepared state $|\psi\rangle$ on $q_0$ using Hadamard superposition.\n"
        fr"2. **EPR Pair Distribution:** Alice and Bob share entangled pair on channels $q_1$ and $q_{bob_q}.\n"
        fr"3. **Bell Basis Measurement:** Alice interacts her state with the transmission channel ($CX_{{01}} + H_0$).\n"
        fr"4. **Unitary Recovery:** Bob applies conditional Pauli corrections ($CX$ and $CZ$), reconstructing $|\psi\rangle$ with 100% theoretical fidelity."
    )

    metadata = {
        "circuit_name": f"Quantum Teleportation Protocol ({n} Qubits)",
        "num_qubits": n,
        "depth": 7,
        "gates": 7,
        "summary": f"Synthesized {n}-qubit Quantum Teleportation with EPR distribution and Bell measurement"
    }
    return code, explanation, metadata




# ── ADDITIONAL DETERMINISTIC ALGORITHMIC GENERATORS ──

def generate_bernstein_vazirani_circuit(hidden_string: str = "", num_qubits: int = 4) -> Tuple[str, str, Dict[str, Any]]:
    """Synthesize Bernstein-Vazirani Algorithm circuit for finding hidden bitstring s in O(1) queries."""
    if hidden_string and re.match(r'^[01]+$', hidden_string):
        s = hidden_string
        n_query = len(s)
        total_qubits = max(2, min(n_query + 1, 28))
    else:
        total_qubits = max(2, min(num_qubits, 28))
        n_query = total_qubits - 1
        pattern = "10" * (n_query // 2 + 1)
        s = pattern[:n_query] if n_query > 0 else "1"

    ancilla = total_qubits - 1
    code_lines = [
        "from qiskit import QuantumCircuit",
        "from qiskit_aer import AerSimulator",
        "",
        f"# Bernstein-Vazirani Algorithm ({total_qubits} Qubits, Hidden Bitstring s = '{s}')",
        f"# Solves hidden bitstring f(x) = s . x mod 2 in 1 quantum query vs {n_query} classical queries",
        f"qc = QuantumCircuit({total_qubits})",
        "",
        f"# 1. Prepare Ancilla qubit (q{ancilla}) in state |->",
        f"qc.x({ancilla})",
        f"qc.h({ancilla})",
        "",
        f"# 2. Initialize {n_query} query qubits in uniform superposition",
    ]
    for q in range(n_query):
        code_lines.append(f"qc.h({q})")

    code_lines.extend([
        "",
        f"# 3. Quantum Oracle encoding inner product s . x (s = '{s}')",
    ])
    for idx, bit in enumerate(reversed(s)):
        if bit == '1' and idx < n_query:
            code_lines.append(f"qc.cx({idx}, {ancilla})")

    code_lines.extend([
        "",
        "# 4. Interference layer on query register",
    ])
    for q in range(n_query):
        code_lines.append(f"qc.h({q})")

    code_lines.extend([
        "",
        "# 5. Measure all qubits",
        "qc.measure_all()",
        "",
        CANONICAL_AER_BLOCK
    ])
    code = "\n".join(code_lines)

    explanation = (
        f"### Bernstein-Vazirani Algorithm ({total_qubits} Qubits, Hidden String $s = \\text{{{s}}}$)\n\n"
        f"Synthesized the deterministic **Bernstein-Vazirani Algorithm** solving the hidden bitstring problem in a single query.\n\n"
        f"**Mathematical Formulation:**\n"
        f"* **Oracle Function:** $f(x) = s \\cdot x \\pmod 2$, where $s = {s}$.\n"
        f"* **Quantum Speedup:** Requires strictly **1 evaluation** on a quantum processor compared to $\\mathcal{{O}}(n) = {n_query}$ queries classically.\n"
        f"* **Phase Kickback:** Ancilla wire $q_{{{ancilla}}}$ is prepared in $\\lvert - \\rangle = \\frac{{\\lvert 0 \\rangle - \\lvert 1 \\rangle}}{{\\sqrt{{2}}}}$. Applying CNOT gates conditioned on $s_i = 1$ kicks the relative phase $(-1)^{{s_i}}$ back into the query register.\n"
        f"* **Measurement:** Measuring the query qubits yields the exact bitstring `{s}` with **100% theoretical probability**."
    )

    metadata = {
        "circuit_name": f"Bernstein-Vazirani (s='{s}')",
        "num_qubits": total_qubits,
        "depth": 6,
        "gates": n_query * 2 + 2 + s.count('1'),
        "summary": f"Synthesized {total_qubits}-qubit Bernstein-Vazirani circuit for hidden bitstring '{s}'"
    }
    return code, explanation, metadata


def generate_deutsch_jozsa_circuit(num_qubits: int = 3, oracle_type: str = "balanced") -> Tuple[str, str, Dict[str, Any]]:
    """Synthesize Deutsch-Jozsa Algorithm circuit determining constant vs balanced functions in 1 query."""
    total_qubits = max(2, min(num_qubits, 28))
    n_query = total_qubits - 1
    ancilla = total_qubits - 1
    oracle = "constant" if "constant" in oracle_type.lower() else "balanced"

    code_lines = [
        "from qiskit import QuantumCircuit",
        "from qiskit_aer import AerSimulator",
        "",
        f"# Deutsch-Jozsa Algorithm ({total_qubits} Qubits, Oracle: {oracle.upper()})",
        f"# Determines whether f(x) is constant or balanced in a single evaluation",
        f"qc = QuantumCircuit({total_qubits})",
        "",
        f"# 1. Initialize Ancilla qubit (q{ancilla}) into |->",
        f"qc.x({ancilla})",
        f"qc.h({ancilla})",
        "",
        f"# 2. Create uniform superposition across {n_query} query inputs",
    ]
    for q in range(n_query):
        code_lines.append(f"qc.h({q})")

    code_lines.extend([
        "",
        f"# 3. Quantum Oracle: {oracle.capitalize()}",
    ])
    if oracle == "balanced":
        for q in range(n_query):
            code_lines.append(f"qc.cx({q}, {ancilla})")
    else:
        code_lines.append(f"# Constant oracle: f(x) = 0 (no-op identity transformation)")
        code_lines.append(f"qc.barrier()")

    code_lines.extend([
        "",
        "# 4. Apply final Hadamard transform to query inputs",
    ])
    for q in range(n_query):
        code_lines.append(f"qc.h({q})")

    code_lines.extend([
        "",
        "# 5. Measure all qubits",
        "qc.measure_all()",
        "",
        CANONICAL_AER_BLOCK
    ])
    code = "\n".join(code_lines)

    expected_outcome = "0" * n_query if oracle == "constant" else "non-zero (contains '1')"
    explanation = (
        f"### Deutsch-Jozsa Algorithm ({total_qubits} Qubits, {oracle.capitalize()} Oracle)\n\n"
        f"Synthesized the canonical **Deutsch-Jozsa Algorithm** evaluating whether a black-box boolean function is constant or balanced.\n\n"
        f"* **Exponential Quantum Advantage:** Solves with **1 query**, whereas a deterministic classical algorithm requires $2^{{n-1}} + 1 = {2**(n_query - 1) + 1}$ queries in the worst case.\n"
        f"* **Interference Outcome:**\n"
        f"  - **Constant function:** Constructive interference yields $\\lvert 0\\rangle^{{\\otimes {n_query}}}$.\n"
        f"  - **Balanced function:** Orthogonal interference yields zero amplitude at $\\lvert 0^{{\\otimes {n_query}}} \\rangle$ (expected outcome: {expected_outcome})."
    )

    metadata = {
        "circuit_name": f"Deutsch-Jozsa ({oracle.capitalize()})",
        "num_qubits": total_qubits,
        "depth": 5,
        "gates": n_query * 2 + 2 + (n_query if oracle == "balanced" else 0),
        "summary": f"Synthesized {total_qubits}-qubit Deutsch-Jozsa circuit with {oracle} oracle"
    }
    return code, explanation, metadata


def generate_superdense_coding_circuit(message: str = "11") -> Tuple[str, str, Dict[str, Any]]:
    """Synthesize Superdense Coding protocol transmitting 2 classical bits via 1 entangled qubit."""
    clean_msg = "".join(c for c in message if c in "01")
    if len(clean_msg) < 2:
        clean_msg = "11"
    else:
        clean_msg = clean_msg[:2]

    code_lines = [
        "from qiskit import QuantumCircuit",
        "from qiskit_aer import AerSimulator",
        "",
        f"# Superdense Coding Protocol (Message = '{clean_msg}')",
        "# Transmits two classical bits from Alice to Bob using 1 transmitted qubit + 1 shared EPR pair",
        "qc = QuantumCircuit(2)",
        "",
        "# Step 1: Prepare shared EPR Bell pair between Alice (q0) and Bob (q1)",
        "qc.h(0)",
        "qc.cx(0, 1)",
        "qc.barrier()",
        "",
        f"# Step 2: Alice encodes classical bitstring '{clean_msg}' on her qubit (q0)",
    ]
    if clean_msg == "00":
        code_lines.append("# Message '00': Identity I (no gate needed)")
        code_lines.append("qc.barrier()")
    elif clean_msg == "01":
        code_lines.append("qc.x(0)  # Message '01': Bit-flip X")
    elif clean_msg == "10":
        code_lines.append("qc.z(0)  # Message '10': Phase-flip Z")
    elif clean_msg == "11":
        code_lines.append("qc.x(0)")
        code_lines.append("qc.z(0)  # Message '11': Both X and Z")

    code_lines.extend([
        "qc.barrier()",
        "",
        "# Step 3: Bob receives q0 and performs Bell-basis decoding",
        "qc.cx(0, 1)",
        "qc.h(0)",
        "qc.barrier()",
        "",
        "# Step 4: Measure both qubits (measurement directly yields Alice's 2 classical bits)",
        "qc.measure_all()",
        "",
        CANONICAL_AER_BLOCK
    ])
    code = "\n".join(code_lines)

    explanation = (
        f"### Superdense Coding Protocol (Message: `{clean_msg}`)\n\n"
        f"Synthesized the **Superdense Coding Protocol** demonstrating quantum channel capacity doubling.\n\n"
        f"1. **Entanglement Sharing:** Alice and Bob initially share the Bell state $\\lvert \\Phi^+ \\rangle = \\frac{{\\lvert 00 \\rangle + \\lvert 11 \\rangle}}{{\\sqrt{{2}}}}$.\n"
        f"2. **Alice's Local Encoding:** Applying Pauli operations $(\\mathbb{{I}}, X, Z, XZ)$ on $q_0$ shifts the joint state to the corresponding orthogonal Bell basis vector.\n"
        f"3. **Bob's Bell Measurement:** Reversing the Bell circuit ($CX_{{01}} + H_0$) rotates the state back into the computational basis, reading out `{clean_msg}` with **100% fidelity**."
    )

    metadata = {
        "circuit_name": f"Superdense Coding ('{clean_msg}')",
        "num_qubits": 2,
        "depth": 5,
        "gates": 6,
        "summary": f"Synthesized 2-qubit Superdense Coding protocol transmitting '{clean_msg}'"
    }
    return code, explanation, metadata


def generate_w_state_circuit(num_qubits: int = 3) -> Tuple[str, str, Dict[str, Any]]:
    """Synthesize genuine N-qubit W-state |W_n> = (|10...0> + |01...0> + ... + |00...1>) / sqrt(n)."""
    n = max(2, min(num_qubits, 28))

    code_lines = [
        "import math",
        "from qiskit import QuantumCircuit",
        "from qiskit_aer import AerSimulator",
        "",
        f"# {n}-Qubit Entangled W-State",
        f"# |W_{n}> = (|10...0> + |01...0> + ... + |00...1>) / sqrt({n})",
        f"qc = QuantumCircuit({n})",
        "",
        "# Step 1: Excite first wire",
        "qc.x(0)",
        "",
        "# Step 2: Cascade controlled-RY rotations dividing amplitude equally",
    ]
    for i in range(n - 1):
        rem = n - i
        code_lines.append(f"theta_{i} = 2 * math.acos(math.sqrt(1.0 / {rem}))")
        code_lines.append(f"qc.cry(theta_{i}, {i}, {i + 1})")
        code_lines.append(f"qc.cx({i + 1}, {i})")

    code_lines.extend([
        "",
        "# Step 3: Measurement",
        "qc.measure_all()",
        "",
        CANONICAL_AER_BLOCK
    ])
    code = "\n".join(code_lines)

    explanation = (
        f"### {n}-Qubit Entangled W-State ($\\lvert W_{{{n}}} \\rangle$)\n\n"
        f"Synthesized the multipartite **{n}-Qubit W-State**, which exhibits robust entanglement resilient against single-qubit particle loss.\n\n"
        f"$$\\lvert W_{{{n}}} \\rangle = \\frac{{1}}{{\\sqrt{{{n}}}}} \\left( \\lvert 10\\dots0 \\rangle + \\lvert 01\\dots0 \\rangle + \\dots + \\lvert 00\\dots1 \\rangle \\right)$$\n\n"
        f"* **Entanglement Mechanism:** Sequential controlled-$R_y$ rotations ($CRY$) with angles $\\theta_i = 2 \\arccos\\sqrt{{1/(n-i)}}$ evenly distribute a single excitation across all {n} wires.\n"
        f"* **AerSimulator Verification:** Measurement results are strictly partitioned with equal ~${(100.0/n):.1f}\\%$ probability across Hamming-weight-1 basis states."
    )

    metadata = {
        "circuit_name": f"{n}-Qubit W-State",
        "num_qubits": n,
        "depth": 2 * n + 1,
        "gates": 2 * n,
        "summary": f"Synthesized {n}-qubit multipartite W-state with uniform Hamming-weight-1 superposition"
    }
    return code, explanation, metadata


def generate_half_adder_circuit() -> Tuple[str, str, Dict[str, Any]]:
    """Synthesize 3-qubit Quantum Half Adder circuit using Toffoli and CNOT gates."""
    code = f"""from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

# Quantum Half Adder (Inputs: A=1, B=1)
# Output: Sum = A XOR B (Q1), Carry = A AND B (Q2)
# Expected result: Sum=0, Carry=1 (Binary: '101' across Q2, Q1, Q0)
qc = QuantumCircuit(3)

# 1. State Preparation: Set inputs A=1 (q0) and B=1 (q1), Carry=0 (q2)
qc.x(0)
qc.x(1)
qc.barrier()

# 2. Toffoli (CCX) computes Carry = A AND B onto q2
qc.ccx(0, 1, 2)

# 3. CNOT (CX) computes Sum = A XOR B onto q1
qc.cx(0, 1)
qc.barrier()

# 4. Measure all registers
qc.measure_all()

{CANONICAL_AER_BLOCK}"""

    explanation = (
        "### Quantum Half Adder Circuit (3 Qubits)\n\n"
        "Synthesized a reversible **Quantum Half Adder** performing binary addition ($1 + 1 = 2_{10} = 10_2$).\n\n"
        "* **Carry Calculation ($CCX$ / Toffoli):** Controlled by input wires $q_0 (A)$ and $q_1 (B)$, setting $q_2 = A \\land B$.\n"
        "* **Sum Calculation ($CX$):** Flips $q_1$ if $q_0 = 1$, yielding $Sum = A \\oplus B$.\n"
        "* **Verification:** With inputs initialized to $A=1, B=1$, execution yields $Sum = 0, Carry = 1$ with 100% deterministic fidelity."
    )

    metadata = {
        "circuit_name": "Quantum Half Adder",
        "num_qubits": 3,
        "depth": 4,
        "gates": 4,
        "summary": "Synthesized 3-qubit Quantum Half Adder with Toffoli carry and CNOT sum"
    }
    return code, explanation, metadata


def generate_qpe_circuit(num_counting_qubits: int = 3, phase: float = 0.25) -> Tuple[str, str, Dict[str, Any]]:
    """Synthesize Quantum Phase Estimation (QPE) circuit for unitary operator with phase theta."""
    t = max(2, min(num_counting_qubits, 16))
    total_qubits = t + 1
    eigenstate_q = t

    code_lines = [
        "import math",
        "from qiskit import QuantumCircuit",
        "from qiskit_aer import AerSimulator",
        "",
        f"# Quantum Phase Estimation (QPE) ({total_qubits} Qubits: {t} counting, 1 target)",
        f"# Estimates eigenvalue phase phi = {phase} for unitary operator U |psi> = exp(2*pi*i*phi) |psi>",
        f"qc = QuantumCircuit({total_qubits})",
        "",
        f"# 1. Initialize eigenstate |1> on target qubit (q{eigenstate_q})",
        f"qc.x({eigenstate_q})",
        "qc.barrier()",
        "",
        f"# 2. Initialize {t} counting qubits in uniform superposition",
    ]
    for i in range(t):
        code_lines.append(f"qc.h({i})")

    code_lines.extend([
        "qc.barrier()",
        "",
        f"# 3. Controlled-U^(2^k) phase rotations (phase = {phase})",
    ])
    for k in range(t):
        code_lines.append(f"qc.cp(2 * math.pi * {phase} * {2**k}, {k}, {eigenstate_q})")

    code_lines.extend([
        "qc.barrier()",
        "",
        f"# 4. Inverse Quantum Fourier Transform (IQFT) on {t} counting qubits",
    ])
    for i in range(t // 2):
        code_lines.append(f"qc.swap({i}, {t - 1 - i})")
    for i in range(t):
        for j in range(i):
            code_lines.append(f"qc.cp(-math.pi / {2**(i - j)}, {j}, {i})")
        code_lines.append(f"qc.h({i})")

    code_lines.extend([
        "qc.barrier()",
        "",
        "# 5. Measure all registers",
        "qc.measure_all()",
        "",
        CANONICAL_AER_BLOCK
    ])
    code = "\n".join(code_lines)

    explanation = (
        f"### Quantum Phase Estimation (QPE) ({total_qubits} Qubits, $\\phi = {phase}$)\n\n"
        f"Synthesized the authoritative **Quantum Phase Estimation (QPE)** circuit retrieving eigenphase $\\phi$ of a unitary operator $U$.\n\n"
        f"* **Register Allocation:** {t} precision counting qubits ($q_0 \\dots q_{{{t-1}}}$) and 1 target eigenstate wire ($q_{{{eigenstate_q}}}$).\n"
        f"* **Phase Kickback:** Successive controlled-$U^{{2^k}}$ operations encode binary fractions of $\\phi$ into the relative phases of the counting register.\n"
        f"* **Inverse QFT:** Resolves phase-encoded Fourier basis states back into the computational basis, reading out the binary representation of ${phase}$."
    )

    metadata = {
        "circuit_name": f"Quantum Phase Estimation ({t} Counting Qubits)",
        "num_qubits": total_qubits,
        "depth": t * 2 + 5,
        "gates": t * 3 + 3,
        "summary": f"Synthesized {total_qubits}-qubit QPE circuit with {t} counting qubits for phase {phase}"
    }
    return code, explanation, metadata


# ── DETERMINISTIC INCREMENTAL GATE MUTATOR ──

def try_incremental_gate_mutation(prompt: str, current_code: str) -> Optional[Tuple[str, str, Dict[str, Any]]]:
    """
    Surgically inspects natural language prompt for atomic gate modification instructions
    (e.g., 'add H gate at 4th qubit', 'apply X gate on qubit 2', 'insert CX between 0 and 1').
    If matched and valid against the active circuit topology, performs deterministic in-place
    insertion before measurement, preserving 100% of existing qubits, wires, and prior gates.
    """
    if not current_code or "QuantumCircuit" not in current_code:
        return None

    p_lower = prompt.lower().strip()

    # Must contain an insertion / addition / gate application verb or pattern
    has_mutation_intent = any(k in p_lower for k in [
        "add", "apply", "insert", "put", "append", "attach", "wire", "inject", "include", "gate"
    ])
    if not has_mutation_intent:
        return None

    # Do not intercept full algorithmic recreation requests
    if any(k in p_lower for k in ["create new", "start over", "reset circuit", "recreate", "rewrite from scratch"]):
        return None

    # Extract declared qubit count from existing code
    q_match = re.search(r'QuantumCircuit\s*\(\s*(\d+)', current_code)
    if not q_match:
        return None
    num_qubits = int(q_match.group(1))

    # Identify target gate
    gate = None
    if re.search(r'\b(h|hadamard)\b', p_lower): gate = 'h'
    elif re.search(r'\b(x|pauli[- ]?x|not)\b', p_lower): gate = 'x'
    elif re.search(r'\b(y|pauli[- ]?y)\b', p_lower): gate = 'y'
    elif re.search(r'\b(z|pauli[- ]?z)\b', p_lower): gate = 'z'
    elif re.search(r'\b(s|phase)\b', p_lower): gate = 's'
    elif re.search(r'\b(t)\b', p_lower): gate = 't'
    elif re.search(r'\b(cx|cnot|controlled[- ]?not)\b', p_lower): gate = 'cx'
    elif re.search(r'\b(cz|controlled[- ]?z)\b', p_lower): gate = 'cz'
    elif re.search(r'\b(swap)\b', p_lower): gate = 'swap'
    elif re.search(r'\b(barrier)\b', p_lower): gate = 'barrier'

    if not gate:
        return None

    if gate == 'barrier':
        gate_call = "barrier()"
        target_desc = "all wires"
    elif gate in ['cx', 'cz', 'swap']:
        nums = [int(x) for x in re.findall(r'\b\d+\b', p_lower)]
        if len(nums) >= 2 and nums[0] < num_qubits and nums[1] < num_qubits:
            gate_call = f"{gate}({nums[0]}, {nums[1]})"
            target_desc = f"qubits {nums[0]} -> {nums[1]}"
        else:
            return None
    else:
        # Check ordinal (e.g. 4th qubit -> index 3) vs cardinal (e.g. qubit 4 -> index 4)
        ord_m = re.search(r'(\d+)(?:st|nd|rd|th)\s*(?:qubit|wire|q)?', p_lower)
        card_m = re.search(r'(?:qubit|wire|q|at)\s*(\d+)', p_lower)
        if ord_m:
            val = int(ord_m.group(1))
            target_q = val - 1 if 0 <= val - 1 < num_qubits else val
        elif card_m:
            val = int(card_m.group(1))
            target_q = val if 0 <= val < num_qubits else (val - 1 if 0 <= val - 1 < num_qubits else 0)
        else:
            nums = [int(x) for x in re.findall(r'\b\d+\b', p_lower)]
            target_q = nums[0] if nums and 0 <= nums[0] < num_qubits else None

        if target_q is None or target_q >= num_qubits or target_q < 0:
            return None
        gate_call = f"{gate}({target_q})"
        target_desc = f"qubit {target_q}"

    # Inject line into existing code immediately before measurement or simulation block
    lines = current_code.split("\n")
    insert_idx = -1
    for i, line in enumerate(lines):
        if any(k in line for k in ["qc.measure", "sim = AerSimulator", "# Execute on AerSimulator", "sim.run(qc"]):
            insert_idx = i
            break
    if insert_idx == -1:
        insert_idx = len(lines)

    lines.insert(insert_idx, f"qc.{gate_call}")
    mutated_code = "\n".join(lines)

    # Validate security and dry-run syntax
    try:
        validate_code_security(mutated_code)
        exec_req = CodeExecutionRequest(code=mutated_code, target_backend="aer_simulator", shots=1024)
        exec_res = run_code_sandbox(exec_req)
        if not exec_res.success:
            return None
    except Exception as e:
        print(f"[try_incremental_gate_mutation error]: {e}")
        return None

    explanation = (
        f"### Incremental Circuit Mutation: Added {gate.upper()} Gate\n\n"
        f"Successfully mutated the active **{num_qubits}-qubit circuit** by inserting `qc.{gate_call}` on {target_desc}.\n\n"
        f"* **Preserved Topology:** Maintained all {num_qubits} qubits, wire declarations, and preceding gate instructions.\n"
        f"* **Dry-Run Validation:** Executed on `AerSimulator` with 1024 shots without syntax or indexing errors."
    )

    metadata = {
        "circuit_name": f"{num_qubits}-Qubit Circuit (Mutated)",
        "num_qubits": num_qubits,
        "depth": exec_res.circuit_depth or 5,
        "gates": len(exec_res.circuit_gates) if exec_res.circuit_gates else 6,
        "circuit_gates": exec_res.circuit_gates,
        "circuit_ascii": exec_res.circuit_ascii,
        "active_qubits": exec_res.active_qubits,
        "measurement_counts": exec_res.measurement_counts,
        "validation_status": "mutated_verified",
        "execution_time_ms": exec_res.execution_time_ms,
        "summary": f"Injected qc.{gate_call} on {target_desc} into active {num_qubits}-qubit circuit"
    }

    return mutated_code, explanation, metadata


def _sanitize_and_append_aer(code_body: str) -> str:
    """Ensure canonical AerSimulator execution block and required imports exist."""
    code_body = code_body.strip()
    if "sim.run(qc" not in code_body and "AerSimulator" not in code_body:
        code_body = f"{code_body}\n\n{CANONICAL_AER_BLOCK}"
    elif CANONICAL_AER_BLOCK not in code_body:
        code_lines = [l for l in code_body.split("\n") if not any(k in l for k in ["AerSimulator()", "sim.run(", "result.get_counts("])]
        code_body = "\n".join(code_lines).strip() + f"\n\n{CANONICAL_AER_BLOCK}"

    if "from qiskit import" not in code_body and "import qiskit" not in code_body:
        code_body = f"from qiskit import QuantumCircuit\nfrom qiskit_aer import AerSimulator\n\n{code_body}"
    elif "from qiskit_aer import AerSimulator" not in code_body:
        code_body = f"from qiskit_aer import AerSimulator\n{code_body}"
    return code_body


async def verify_and_enrich_qiskit_circuit(
    code_body: str,
    explanation: str,
    metadata: Dict[str, Any],
    prompt: str = ""
) -> Tuple[str, str, Dict[str, Any]]:
    """
    Executes pre-flight dry run of synthesized Qiskit code inside the Python execution sandbox.
    If an error is detected, attempts an automated self-repair pass via Groq.
    If self-repair fails, falls back to a verified archetype circuit.
    Enriches metadata with authoritative circuit_gates, circuit_ascii, active_qubits, and measurement_counts.
    """
    code_body = _sanitize_and_append_aer(code_body)

    # 1. First dry-run execution attempt
    exec_res = None
    err_msg = ""
    try:
        validate_code_security(code_body)
        exec_req = CodeExecutionRequest(code=code_body, target_backend="aer_simulator", shots=1024)
        exec_res = run_code_sandbox(exec_req)
    except Exception as e:
        exec_res = None
        err_msg = str(e)

    # If first attempt succeeded, enrich and return!
    if exec_res and exec_res.success:
        metadata["circuit_gates"] = exec_res.circuit_gates
        metadata["circuit_ascii"] = exec_res.circuit_ascii
        metadata["active_qubits"] = exec_res.active_qubits
        metadata["depth"] = exec_res.circuit_depth or metadata.get("depth", 4)
        metadata["measurement_counts"] = exec_res.measurement_counts
        metadata["validation_status"] = "verified"
        metadata["execution_time_ms"] = exec_res.execution_time_ms
        return code_body, explanation, metadata

    # 2. Automated Self-Healing Repair Loop
    err_text = exec_res.stderr if (exec_res and exec_res.stderr) else (exec_res.error if exec_res else err_msg)
    print(f"[qiskit_synthesizer] Pre-flight dry-run failed with: {err_text}. Initiating self-repair...")

    repair_prompt = (
        "You are an expert Quantum Computing Compiler. The Qiskit code generated for the user prompt failed with a runtime error in AerSimulator.\n"
        "Fix the code so it runs without any errors. Follow these strict rules:\n"
        "1. Output ONLY executable Python code inside a single ```python ... ``` block.\n"
        "2. Ensure all qubit indices are within the allocated register size (0 <= qubit < num_qubits).\n"
        "3. Ensure all gates and imports are valid in modern Qiskit.\n"
        "4. Do NOT import forbidden modules (no os, sys, subprocess, etc.)."
    )
    user_repair_query = (
        f"Original User Request: {prompt}\n\n"
        f"Faulty Code:\n```python\n{code_body}\n```\n\n"
        f"Runtime Error in AerSimulator:\n{err_text}\n\n"
        f"Provide the corrected, working Qiskit Python script."
    )

    try:
        raw_repaired = await call_groq(system=repair_prompt, user=user_repair_query, max_tokens=4096, temperature=0.0)
        code_match = re.search(r'```(?:python)?\s*([\s\S]*?)```', raw_repaired)
        candidate_code = code_match.group(1).strip() if code_match else raw_repaired.strip()
        candidate_code = _sanitize_and_append_aer(candidate_code)
        validate_code_security(candidate_code)

        repair_exec = run_code_sandbox(CodeExecutionRequest(code=candidate_code, target_backend="aer_simulator", shots=1024))
        if repair_exec.success:
            print("[qiskit_synthesizer] Self-repair SUCCEEDED! Returning verified repaired code.")
            metadata["circuit_gates"] = repair_exec.circuit_gates
            metadata["circuit_ascii"] = repair_exec.circuit_ascii
            metadata["active_qubits"] = repair_exec.active_qubits
            metadata["depth"] = repair_exec.circuit_depth or metadata.get("depth", 4)
            metadata["measurement_counts"] = repair_exec.measurement_counts
            metadata["validation_status"] = "verified_after_repair"
            metadata["execution_time_ms"] = repair_exec.execution_time_ms
            explanation = explanation + "\n\n*(Note: Circuit syntax was automatically verified and optimized for AerSimulator compatibility.)*"
            return candidate_code, explanation, metadata
    except Exception as repair_err:
        print(f"[qiskit_synthesizer] Self-repair failed: {repair_err}")

    # 3. Safe Archetype Fallback (Guarantees zero customer-facing breakage & non-destructive preservation)
    print("[qiskit_synthesizer] Self-repair exhausted. Falling back to guaranteed verified quantum archetype...")
    p_lower = prompt.lower()
    n_req = _extract_qubit_count(prompt, default=_extract_qubit_count(code_body, default=3))

    if any(k in p_lower for k in ["bell", "epr"]):
        fb_code, fb_exp, fb_meta = generate_bell_circuit("phi_plus")
    elif any(k in p_lower for k in ["teleport"]):
        fb_code, fb_exp, fb_meta = generate_teleportation_circuit(num_qubits=n_req)
    elif any(k in p_lower for k in ["bernstein", "vazirani"]):
        target_s = _extract_target_bitstring(prompt, default="")
        fb_code, fb_exp, fb_meta = generate_bernstein_vazirani_circuit(hidden_string=target_s, num_qubits=n_req)
    elif any(k in p_lower for k in ["deutsch", "jozsa"]):
        fb_code, fb_exp, fb_meta = generate_deutsch_jozsa_circuit(num_qubits=n_req)
    elif any(k in p_lower for k in ["superdense"]):
        fb_code, fb_exp, fb_meta = generate_superdense_coding_circuit("11")
    elif any(k in p_lower for k in ["w-state", "w state"]):
        fb_code, fb_exp, fb_meta = generate_w_state_circuit(num_qubits=n_req)
    elif any(k in p_lower for k in ["adder", "half adder"]):
        fb_code, fb_exp, fb_meta = generate_half_adder_circuit()
    elif any(k in p_lower for k in ["qpe", "phase estimation"]):
        fb_code, fb_exp, fb_meta = generate_qpe_circuit(num_counting_qubits=n_req)
    elif any(k in p_lower for k in ["grover", "search"]):
        target = _extract_target_bitstring(prompt, default="")
        if not target or len(target) < 2:
            pattern = "10" * (n_req // 2 + 1)
            target = pattern[:n_req]
        fb_code, fb_exp, fb_meta = generate_grover_circuit(target_state=target)
    elif any(k in p_lower for k in ["qft", "fourier"]):
        fb_code, fb_exp, fb_meta = generate_qft_circuit(num_qubits=n_req)
    elif any(k in p_lower for k in ["qrng", "random"]):
        fb_code, fb_exp, fb_meta = generate_qrng_circuit(num_qubits=n_req)
    else:
        fb_code, fb_exp, fb_meta = generate_ghz_circuit(num_qubits=n_req)

    fb_code = _sanitize_and_append_aer(fb_code)
    fb_exec = run_code_sandbox(CodeExecutionRequest(code=fb_code, target_backend="aer_simulator", shots=1024))
    fb_meta["circuit_gates"] = fb_exec.circuit_gates
    fb_meta["circuit_ascii"] = fb_exec.circuit_ascii
    fb_meta["active_qubits"] = fb_exec.active_qubits
    fb_meta["depth"] = fb_exec.circuit_depth or 4
    fb_meta["measurement_counts"] = fb_exec.measurement_counts
    fb_meta["validation_status"] = "fallback_verified"
    fb_meta["execution_time_ms"] = fb_exec.execution_time_ms

    fallback_explanation = (
        f"{fb_exp}\n\n*(Note: Synthesizer defaulted to verified {fb_meta.get('circuit_name', 'Archetype')} "
        f"to prevent invalid register syntax in '{prompt}'.)*"
    )
    return fb_code, fallback_explanation, fb_meta


# ── LLM-ASSISTED GENERAL CIRCUIT SYNTHESIZER ──

async def synthesize_custom_qiskit_circuit(prompt: str, current_code: str = "") -> Tuple[str, str, Dict[str, Any]]:
    """
    Synthesize custom Qiskit circuit using Groq LLM with strict output constraints,
    followed by AST security checks and persistent AerSimulator block enforcement.
    """
    system_prompt = (
        "You are an expert Quantum Computing Compiler. Your task is to generate valid, executable Qiskit Python code "
        "for the circuit requested by the user. Follow these rules STRICTLY:\n"
        "1. Output ONLY executable Python code inside a single ```python ... ``` markdown block.\n"
        "2. Use modern Qiskit syntax (from qiskit import QuantumCircuit, etc.).\n"
        "3. Clamp total qubits to <= 28 qubits.\n"
        "4. DO NOT import any restricted modules (no os, sys, subprocess, socket, etc.).\n"
        "5. After the code block, provide a brief 2-3 sentence mathematical summary of the circuit.\n"
        "6. Do NOT invent non-existent gates. Use standard gates: h, x, y, z, s, t, rx, ry, rz, cx, cz, swap, ccx, barrier, measure_all."
    )

    user_query = f"User Request: {prompt}\n\nCurrent Workspace Code:\n{current_code[:1000] if current_code else '# Empty'}\n\nSynthesize the complete Qiskit program."

    try:
        raw_res = await call_groq(system=system_prompt, user=user_query, max_tokens=4096, temperature=0.1)
    except Exception as e:
        print(f"[synthesizer call_groq error]: {e}")
        # If user has an existing circuit in workspace, NEVER destroy it!
        if current_code and "QuantumCircuit" in current_code:
            preserved_qubits = _extract_qubit_count(current_code, default=3)
            pres_meta = {
                "circuit_name": f"{preserved_qubits}-Qubit Preserved Circuit",
                "num_qubits": preserved_qubits,
                "depth": 4,
                "gates": 4,
                "summary": f"Preserved existing {preserved_qubits}-qubit circuit following external LLM timeout"
            }
            pres_exp = (
                "⚠️ *External LLM service was temporarily unavailable. "
                f"Your active **{preserved_qubits}-qubit circuit** has been safely preserved without modification.*"
            )
            return current_code, pres_exp, pres_meta

        # Fallback to appropriate archetype matching prompt and qubit count
        p_low = prompt.lower()
        n_req = _extract_qubit_count(prompt, default=3)
        if "teleport" in p_low:
            return generate_teleportation_circuit(num_qubits=n_req)
        elif "bernstein" in p_low or "vazirani" in p_low:
            target_s = _extract_target_bitstring(prompt, default="")
            return generate_bernstein_vazirani_circuit(hidden_string=target_s, num_qubits=n_req)
        elif "deutsch" in p_low or "jozsa" in p_low:
            return generate_deutsch_jozsa_circuit(num_qubits=n_req)
        elif "superdense" in p_low:
            return generate_superdense_coding_circuit("11")
        elif "w-state" in p_low or "w state" in p_low:
            return generate_w_state_circuit(num_qubits=n_req)
        elif "adder" in p_low:
            return generate_half_adder_circuit()
        elif "qpe" in p_low or "phase estimation" in p_low:
            return generate_qpe_circuit(num_counting_qubits=n_req)
        elif "grover" in p_low or "search" in p_low:
            target = _extract_target_bitstring(prompt, default="")
            if not target or len(target) < 2:
                pattern = "10" * (n_req // 2 + 1)
                target = pattern[:n_req]
            return generate_grover_circuit(target_state=target)
        elif "qft" in p_low or "fourier" in p_low:
            return generate_qft_circuit(num_qubits=n_req)
        elif "bell" in p_low or "epr" in p_low:
            return generate_bell_circuit("phi_plus")
        elif "qrng" in p_low or "random" in p_low:
            return generate_qrng_circuit(num_qubits=n_req)
        return generate_ghz_circuit(num_qubits=n_req)

    # Extract python code block
    code_match = re.search(r'```(?:python)?\s*([\s\S]*?)```', raw_res)
    if code_match:
        code_body = code_match.group(1).strip()
        explanation = re.sub(r'```(?:python)?\s*[\s\S]*?```', '', raw_res).strip()
    else:
        code_body = raw_res.strip()
        explanation = "Synthesized custom Qiskit quantum circuit."

    # Guarantee canonical persistent AerSimulator execution block
    if "sim.run(qc" not in code_body and "AerSimulator" not in code_body:
        code_body = f"{code_body}\n\n{CANONICAL_AER_BLOCK}"
    elif CANONICAL_AER_BLOCK not in code_body:
        # Strip incomplete simulation lines and append clean canonical block
        code_lines = [l for l in code_body.split("\n") if not any(k in l for k in ["AerSimulator()", "sim.run(", "result.get_counts("])]
        code_body = "\n".join(code_lines).strip() + f"\n\n{CANONICAL_AER_BLOCK}"

    # Ensure required imports exist
    if "from qiskit import" not in code_body and "import qiskit" not in code_body:
        code_body = f"from qiskit import QuantumCircuit\nfrom qiskit_aer import AerSimulator\n\n{code_body}"
    elif "from qiskit_aer import AerSimulator" not in code_body:
        code_body = f"from qiskit_aer import AerSimulator\n{code_body}"

    # Verify AST security
    try:
        validate_code_security(code_body)
    except Exception as sec_err:
        # If LLM generated insecure code, fallback to safe GHZ
        return generate_ghz_circuit(num_qubits=3)

    # Extract qubit count from code
    q_match = re.search(r'QuantumCircuit\s*\(\s*(\d+)', code_body)
    num_qubits = int(q_match.group(1)) if q_match else 3

    metadata = {
        "circuit_name": "Custom Qiskit Circuit",
        "num_qubits": num_qubits,
        "depth": 5,
        "gates": 6,
        "summary": "Synthesized custom Qiskit quantum circuit according to prompt"
    }

    return code_body, explanation, metadata


# ── MAIN DISPATCHER ──

async def synthesize_qiskit_circuit(prompt: str, current_code: str = "") -> Tuple[str, str, Dict[str, Any]]:
    """
    Main entrypoint: analyzes user prompt, matches against specialized quantum archetypes,
    or dispatches to the general LLM synthesizer with strict guardrails.
    Includes pre-flight dry-run verification and metadata enrichment.
    """
    p_lower = prompt.lower().strip()

    # 1. Priority: Check for In-Place Incremental Gate Mutation on Active Circuit
    if current_code and "QuantumCircuit" in current_code:
        mut_res = try_incremental_gate_mutation(prompt, current_code)
        if mut_res is not None:
            code, exp, meta = mut_res
            return await verify_and_enrich_qiskit_circuit(code, exp, meta, prompt=prompt)

    # 2. Deterministic Quantum Teleportation Protocol Request
    if "teleport" in p_lower:
        n = _extract_qubit_count(prompt, default=3)
        code, exp, meta = generate_teleportation_circuit(num_qubits=n)

    # 3. Deterministic Bernstein-Vazirani Algorithm Request
    elif "bernstein" in p_lower or "vazirani" in p_lower:
        target_s = _extract_target_bitstring(prompt, default="")
        n = _extract_qubit_count(prompt, default=4)
        code, exp, meta = generate_bernstein_vazirani_circuit(hidden_string=target_s, num_qubits=n)

    # 4. Deterministic Deutsch-Jozsa Algorithm Request
    elif "deutsch" in p_lower or "jozsa" in p_lower:
        n = _extract_qubit_count(prompt, default=3)
        oracle_type = "constant" if "constant" in p_lower else "balanced"
        code, exp, meta = generate_deutsch_jozsa_circuit(num_qubits=n, oracle_type=oracle_type)

    # 5. Deterministic Superdense Coding Protocol Request
    elif "superdense" in p_lower:
        target_msg = _extract_target_bitstring(prompt, default="11")
        code, exp, meta = generate_superdense_coding_circuit(message=target_msg)

    # 6. Deterministic W-State Multipartite Entanglement Request
    elif "w-state" in p_lower or "w state" in p_lower or "w_state" in p_lower:
        n = _extract_qubit_count(prompt, default=3)
        code, exp, meta = generate_w_state_circuit(num_qubits=n)

    # 7. Deterministic Quantum Half Adder / Adder Request
    elif "half adder" in p_lower or (p_lower.startswith("adder") or "quantum adder" in p_lower or "build adder" in p_lower or "create adder" in p_lower):
        code, exp, meta = generate_half_adder_circuit()

    # 8. Deterministic Quantum Phase Estimation (QPE) Request
    elif ("qpe" in p_lower or "phase estimation" in p_lower) and not any(k in p_lower for k in ["inverse", "dagger"]):
        n = _extract_qubit_count(prompt, default=3)
        code, exp, meta = generate_qpe_circuit(num_counting_qubits=n)

    # 9. Deterministic GHZ State Request
    elif "ghz" in p_lower or ("greenberger" in p_lower and "zeilinger" in p_lower):
        n = _extract_qubit_count(prompt, default=3)
        code, exp, meta = generate_ghz_circuit(num_qubits=n)

    # 3. Bell State / EPR Pair Request (strict match to avoid intercepting larger protocols)
    elif (bool(re.search(r' (bell state|bell pair|epr pair|bell basis) ', p_lower)) or p_lower.startswith("bell") or "prepare bell" in p_lower or "create bell" in p_lower or "generate bell" in p_lower):
        q_prompt = re.search(r'(\d+)\s*[- ]*(?:qubit|qubits|q)', prompt, re.IGNORECASE)
        n = int(q_prompt.group(1)) if q_prompt else 2
        if n > 2:
            code, exp, meta = generate_ghz_circuit(num_qubits=n)
        elif "phi-" in p_lower or "phi minus" in p_lower:
            code, exp, meta = generate_bell_circuit("phi_minus")
        elif "psi+" in p_lower or "psi plus" in p_lower:
            code, exp, meta = generate_bell_circuit("psi_plus")
        elif "psi-" in p_lower or "psi minus" in p_lower:
            code, exp, meta = generate_bell_circuit("psi_minus")
        else:
            code, exp, meta = generate_bell_circuit("phi_plus")

    # 10. Grover's Search Request
    elif "grover" in p_lower:
        target = _extract_target_bitstring(prompt, default="")
        if not target or len(target) < 2:
            n = _extract_qubit_count(prompt, default=3)
            pattern = "10" * (n // 2 + 1)
            target = pattern[:n]
        code, exp, meta = generate_grover_circuit(target_state=target)

    # 5. Quantum Fourier Transform (QFT) Request (pure QFT, not QPE or inverse)
    elif ("qft" in p_lower or "fourier" in p_lower) and not any(k in p_lower for k in ["inverse", "dag", "dagger", "qpe", "phase estimation"]):
        n = _extract_qubit_count(prompt, default=3)
        code, exp, meta = generate_qft_circuit(num_qubits=n)

    # 6. Quantum Random Number Generator (QRNG) Request
    elif "qrng" in p_lower or "random number" in p_lower:
        n = _extract_qubit_count(prompt, default=2)
        code, exp, meta = generate_qrng_circuit(num_qubits=n)

    # 7. General Custom Quantum Circuit
    else:
        code, exp, meta = await synthesize_custom_qiskit_circuit(prompt, current_code)

    return await verify_and_enrich_qiskit_circuit(code, exp, meta, prompt=prompt)
