"""
algorithms.py — Phase 5 & Phase 6 templates for the Quantum Algorithm Library.
"""

from typing import Dict, Any

def verify_grover(counts: Dict[str, int], shots: int) -> Dict[str, Any]:
    # Target solution is '11', should dominate with 100% probability in 2-qubit Grover Search
    p11 = counts.get("11", 0) / shots
    if p11 >= 0.95:
        return {"status": "PASS", "message": f"Grover Search verified: Target state '11' found with {p11*100:.1f}% probability."}
    return {"status": "FAIL", "message": f"Grover Search failed: Target state '11' probability was only {p11*100:.1f}%."}

def verify_deutsch_jozsa(counts: Dict[str, int], shots: int) -> Dict[str, Any]:
    # Balanced function: input qubit 0 measures to state |1> with 100% probability
    # Since we measure Q0, we check the rightmost bit of binary string
    p1_sum = sum(v for k, v in counts.items() if k.endswith("1")) / shots
    if p1_sum >= 0.95:
        return {"status": "PASS", "message": f"Deutsch-Jozsa verified: Balanced function detected. Q0 measured to |1> with {p1_sum*100:.1f}% probability."}
    return {"status": "FAIL", "message": f"Deutsch-Jozsa failed: Expected Q0 to measure |1> for balanced oracle, observed {p1_sum*100:.1f}%."}

TEMPLATES = {
    "grover": {
        "key": "grover",
        "name": "Grover Search",
        "phase": 5,
        "num_qubits": 2,
        "num_cbits": 2,
        "operations": [
            # 1. Initialization
            {"gate": "H", "targets": [0]},
            {"gate": "H", "targets": [1]},
            {"gate": "BARRIER", "targets": [0, 1]},
            # 2. Oracle (flips phase of |11>)
            {"gate": "CZ", "targets": [0, 1]},
            {"gate": "BARRIER", "targets": [0, 1]},
            # 3. Diffusion
            {"gate": "H", "targets": [0]},
            {"gate": "H", "targets": [1]},
            {"gate": "X", "targets": [0]},
            {"gate": "X", "targets": [1]},
            {"gate": "CZ", "targets": [0, 1]},
            {"gate": "X", "targets": [0]},
            {"gate": "X", "targets": [1]},
            {"gate": "H", "targets": [0]},
            {"gate": "H", "targets": [1]},
            {"gate": "BARRIER", "targets": [0, 1]},
            # 4. Measure
            {"gate": "MEASURE", "targets": [0, 0]},
            {"gate": "MEASURE", "targets": [1, 1]}
        ],
        "description": "Amplify the state probability of target element '11' in a 2-qubit system.",
        "verify_fn": verify_grover
    },
    "deutsch_jozsa": {
        "key": "deutsch_jozsa",
        "name": "Deutsch-Jozsa Algorithm",
        "phase": 6,
        "num_qubits": 2,
        "num_cbits": 1,
        "operations": [
            # 1. State Prep
            {"gate": "X", "targets": [1]},
            {"gate": "H", "targets": [0]},
            {"gate": "H", "targets": [1]},
            {"gate": "BARRIER", "targets": [0, 1]},
            # 2. Balanced Oracle (CNOT from Q0 to Q1)
            {"gate": "CX", "targets": [0, 1]},
            {"gate": "BARRIER", "targets": [0, 1]},
            # 3. Interference
            {"gate": "H", "targets": [0]},
            # 4. Measure Q0
            {"gate": "MEASURE", "targets": [0, 0]}
        ],
        "description": "Determines if a 1-bit input function is constant or balanced in a single evaluation.",
        "verify_fn": verify_deutsch_jozsa
    }
}
