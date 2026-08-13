"""
communication.py — Phase 3 templates for the Quantum Algorithm Library.
"""

from typing import Dict, Any

def verify_superdense_coding(counts: Dict[str, int], shots: int) -> Dict[str, Any]:
    # We encode binary message '11', so measurements should yield '11' with 100% probability
    p11 = counts.get("11", 0) / shots
    if p11 >= 0.95:
        return {"status": "PASS", "message": f"Superdense Coding verified: Message '11' decoded successfully with {p11*100:.1f}% probability."}
    return {"status": "FAIL", "message": f"Superdense Coding failed: Message '11' decoded with only {p11*100:.1f}% probability."}

TEMPLATES = {
    "superdense_coding": {
        "key": "superdense_coding",
        "name": "Superdense Coding",
        "phase": 3,
        "num_qubits": 2,
        "num_cbits": 2,
        "operations": [
            # 1. Share Bell pair
            {"gate": "H", "targets": [0]},
            {"gate": "CX", "targets": [0, 1]},
            {"gate": "BARRIER", "targets": [0, 1]},
            # 2. Encode 2 classical bits '11' onto Q0
            {"gate": "X", "targets": [0]},
            {"gate": "Z", "targets": [0]},
            {"gate": "BARRIER", "targets": [0, 1]},
            # 3. Decode at Receiver
            {"gate": "CX", "targets": [0, 1]},
            {"gate": "H", "targets": [0]},
            # 4. Measure
            {"gate": "MEASURE", "targets": [0, 0]},
            {"gate": "MEASURE", "targets": [1, 1]}
        ],
        "description": "Transmits two classical bits of information using one qubit and a shared entangled Bell pair.",
        "verify_fn": verify_superdense_coding
    }
}
