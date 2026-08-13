"""
arithmetic.py — Phase 8 templates for the Quantum Algorithm Library.
"""

from typing import Dict, Any

def verify_half_adder(counts: Dict[str, int], shots: int) -> Dict[str, Any]:
    # We initialize input A=1 (Q0), B=1 (Q1), Q2=0 (Carry).
    # Expected output: Sum = 0 (Q1), Carry = 1 (Q2).
    # Since we measure Sum (clbit 0) and Carry (clbit 1), binary output key is CarrySum.
    # Expected result: '10' (Carry=1, Sum=0) with 100% probability.
    p10 = counts.get("10", 0) / shots
    if p10 >= 0.95:
        return {"status": "PASS", "message": f"Half Adder verified: 1 + 1 yielded Sum=0, Carry=1 with {p10*100:.1f}% probability."}
    return {"status": "FAIL", "message": f"Half Adder failed: expected CarrySum='10', observed {counts}."}

TEMPLATES = {
    "half_adder": {
        "key": "half_adder",
        "name": "Quantum Half Adder",
        "phase": 8,
        "num_qubits": 3,
        "num_cbits": 2,
        "operations": [
            # 1. Initialize inputs to A=1 (Q0), B=1 (Q1)
            {"gate": "X", "targets": [0]},
            {"gate": "X", "targets": [1]},
            {"gate": "BARRIER", "targets": [0, 1, 2]},
            # 2. CCX (Toffoli) calculates Carry = A AND B onto Q2
            {"gate": "CCX", "targets": [0, 1, 2]},
            # 3. CX calculates Sum = A XOR B onto Q1
            {"gate": "CX", "targets": [0, 1]},
            {"gate": "BARRIER", "targets": [0, 1, 2]},
            # 4. Measure Sum (Q1) and Carry (Q2)
            {"gate": "MEASURE", "targets": [1, 0]},
            {"gate": "MEASURE", "targets": [2, 1]}
        ],
        "description": "Performs addition on two input qubits (A and B), yielding Sum and Carry bits.",
        "verify_fn": verify_half_adder
    }
}
