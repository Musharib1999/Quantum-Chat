"""
entanglement.py — Phase 2 templates for the Quantum Algorithm Library.
"""

from typing import Dict, Any

def verify_bell(counts: Dict[str, int], shots: int) -> Dict[str, Any]:
    sum_expected = counts.get("00", 0) + counts.get("11", 0)
    ratio = sum_expected / shots
    if ratio >= 0.95:
        return {"status": "PASS", "message": f"Bell State verified. Observed states |00> and |11> constitute {ratio*100:.1f}% of shots."}
    return {"status": "FAIL", "message": f"Bell State verification failed. Expected |00> and |11> to dominate, got only {ratio*100:.1f}%."}

def verify_ghz(counts: Dict[str, int], shots: int) -> Dict[str, Any]:
    sum_expected = counts.get("000", 0) + counts.get("111", 0)
    ratio = sum_expected / shots
    if ratio >= 0.95:
        return {"status": "PASS", "message": f"GHZ State verified. Observed states |000> and |111> constitute {ratio*100:.1f}% of shots."}
    return {"status": "FAIL", "message": f"GHZ State verification failed. Expected |000> and |111> to dominate, got only {ratio*100:.1f}%."}

TEMPLATES = {
    "bell": {
        "key": "bell",
        "name": "Bell State",
        "phase": 2,
        "num_qubits": 2,
        "num_cbits": 2,
        "operations": [
            {"gate": "H", "targets": [0]},
            {"gate": "CX", "targets": [0, 1]},
            {"gate": "MEASURE", "targets": [0, 0]},
            {"gate": "MEASURE", "targets": [1, 1]}
        ],
        "description": "Prepares the maximally entangled Bell state: (|00> + |11>) / sqrt(2).",
        "verify_fn": verify_bell
    },
    "ghz": {
        "key": "ghz",
        "name": "GHZ State",
        "phase": 2,
        "num_qubits": 3,
        "num_cbits": 3,
        "operations": [
            {"gate": "H", "targets": [0]},
            {"gate": "CX", "targets": [0, 1]},
            {"gate": "CX", "targets": [1, 2]},
            {"gate": "MEASURE", "targets": [0, 0]},
            {"gate": "MEASURE", "targets": [1, 1]},
            {"gate": "MEASURE", "targets": [2, 2]}
        ],
        "description": "Prepares a 3-qubit Greenberger-Horne-Zeilinger entangled state: (|000> + |111>) / sqrt(2).",
        "verify_fn": verify_ghz
    }
}
