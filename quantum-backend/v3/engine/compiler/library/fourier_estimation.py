"""
fourier_estimation.py — Phase 4 & Phase 7 templates for the Quantum Algorithm Library.
"""

from typing import Dict, Any

def verify_qft(counts: Dict[str, int], shots: int) -> Dict[str, Any]:
    # Since QFT maps inputs to Fourier states, it outputs a flat superposition over all states.
    # For a 2-qubit QFT starting from ground state |00>, it outputs a uniform superposition of 00, 01, 10, 11
    # Check that counts are evenly distributed
    num_states = len(counts)
    if num_states == 4:
        ratios = [v / shots for v in counts.values()]
        if all(0.15 <= r <= 0.35 for r in ratios):
            return {"status": "PASS", "message": f"QFT verified: Uniform superposition output over all 4 states."}
    return {"status": "WARNING", "message": f"QFT outputs are not perfectly uniform. Distribution: {counts}."}

TEMPLATES = {
    "qft": {
        "key": "qft",
        "name": "Quantum Fourier Transform (QFT)",
        "phase": 4,
        "num_qubits": 2,
        "num_cbits": 2,
        "operations": [
            {"gate": "H", "targets": [0]},
            {"gate": "CZ", "targets": [0, 1]},
            {"gate": "H", "targets": [1]},
            {"gate": "SWAP", "targets": [0, 1]},
            {"gate": "MEASURE", "targets": [0, 0]},
            {"gate": "MEASURE", "targets": [1, 1]}
        ],
        "description": "Performs the Quantum Fourier Transform on a 2-qubit register.",
        "verify_fn": verify_qft
    }
}
