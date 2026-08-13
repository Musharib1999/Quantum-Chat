"""
educational.py — Phase 1 & Phase 21 templates for the Quantum Algorithm Library.
"""

from typing import Dict, Any, List

def verify_hadamard(counts: Dict[str, int], shots: int) -> Dict[str, Any]:
    # H gate outputs 0 or 1 with ~50% probability
    p0 = counts.get("0", 0) / shots
    p1 = counts.get("1", 0) / shots
    if 0.40 <= p0 <= 0.60:
        return {"status": "PASS", "message": f"Hadamard superposition verified: |0> is {p0*100:.1f}%, |1> is {p1*100:.1f}%."}
    return {"status": "FAIL", "message": f"Hadamard superposition out of expected bounds: |0> is {p0*100:.1f}%."}

def verify_pauli_x(counts: Dict[str, int], shots: int) -> Dict[str, Any]:
    # X gate flips |0> to |1> (100% probability)
    p1 = counts.get("1", 0) / shots
    if p1 >= 0.99:
        return {"status": "PASS", "message": f"Pauli-X inversion verified: |1> observed with {p1*100:.1f}% probability."}
    return {"status": "FAIL", "message": f"Pauli-X verification failed: |1> observed with only {p1*100:.1f}% probability."}

def verify_swap_test(counts: Dict[str, int], shots: int) -> Dict[str, Any]:
    # Swap test of identical states outputs 0 with 100% probability
    # If states are orthogonal, outputs 0 with 50% probability
    # Here, Q1 and Q2 are in ground state |0> (identical), so Q0 must measure to 0 with 100% probability
    # Note: Qiskit simulation outputs binary strings. Since we measure qubit 0, it's the rightmost/leftmost bit.
    # In Qiskit, state is read right-to-left, so measurement of Q0 is the last character of string (counts key ends in '0')
    p0_sum = sum(v for k, v in counts.items() if k.endswith("0")) / shots
    if p0_sum >= 0.95:
        return {"status": "PASS", "message": f"Swap Test verified: Target states are identical. Q0 measured to |0> with {p0_sum*100:.1f}% probability."}
    return {"status": "FAIL", "message": f"Swap Test failed: Expected Q0 to measure |0> with >95% probability, observed {p0_sum*100:.1f}%."}

TEMPLATES = {
    "hadamard": {
        "key": "hadamard",
        "name": "Hadamard Superposition",
        "phase": 1,
        "num_qubits": 1,
        "num_cbits": 1,
        "operations": [
            {"gate": "H", "targets": [0]},
            {"gate": "MEASURE", "targets": [0, 0]}
        ],
        "description": "Applies a Hadamard gate on qubit 0 to create a 50/50 superposition state.",
        "verify_fn": verify_hadamard
    },
    "pauli_x": {
        "key": "pauli_x",
        "name": "Pauli-X",
        "phase": 1,
        "num_qubits": 1,
        "num_cbits": 1,
        "operations": [
            {"gate": "X", "targets": [0]},
            {"gate": "MEASURE", "targets": [0, 0]}
        ],
        "description": "Applies a Pauli-X gate to flip qubit 0 from ground state |0> to state |1>.",
        "verify_fn": verify_pauli_x
    },
    "swap_test": {
        "key": "swap_test",
        "name": "Swap Test",
        "phase": 21,
        "num_qubits": 3,
        "num_cbits": 1,
        "operations": [
            {"gate": "H", "targets": [0]},
            # Fredkin gate (CSWAP) control 0, targets 1 and 2
            {"gate": "CSWAP", "targets": [0, 1, 2]},
            {"gate": "H", "targets": [0]},
            {"gate": "MEASURE", "targets": [0, 0]}
        ],
        "description": "Compares state overlap of qubit 1 and qubit 2 using an ancilla qubit 0. Outputs |0> if identical.",
        "verify_fn": verify_swap_test
    }
}
