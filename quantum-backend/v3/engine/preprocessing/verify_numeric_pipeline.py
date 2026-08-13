"""
verify_numeric_pipeline.py — Verification of Phase 5 Integration
Simulates agent execution pipeline steps to verify end-to-end correctness.
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)
))))

from engine.preprocessing.numeric_extractor import extract_numeric_blocks
from engine.preprocessing.numeric_injector import inject_numeric_blocks
from engine.preprocessing.token_guard import check_token_budget
from engine.compiler.ir import IRNormalizer, NumericalFeasibilityChecker


def verify_pipeline():
    print("=== STARTING PIPELINE INTEGRATION VERIFICATION ===")

    # 1. Simulate large user input problem
    weights = [45, 78, 12, 90, 34, 56, 78, 90, 12, 34, 56, 78]  # >6 elements
    problem_text = (
        f"Solve a knapsack problem with 12 items.\n"
        f"Weights: {weights}\n"
        f"Capacity is 300. Maximize total value."
    )

    print("\n[Step 1] Extracting numeric blocks...")
    extraction = extract_numeric_blocks(problem_text)
    slim_text = extraction.slim_text
    registry = extraction.registry

    print(f"  Slim text preview: {slim_text[:120]}...")
    print(f"  Blocks extracted: {len(registry)} ({list(registry.keys())})")
    assert len(registry) == 1, "Failed to extract large array"
    assert "NUMBLK_000" in slim_text, "Placeholder ID missing in slim_text"

    # 2. Check token guard
    print("\n[Step 2] Running Token Guard...")
    tokens = check_token_budget(slim_text, max_tokens=1000)
    print(f"  Token estimate: {tokens} tokens")

    # 3. Simulate Compositional Parser LLM response with preserved IDs
    mock_parser_response = {
        "variable_registry": [
            {
                "id": "x",
                "name": "selected_items",
                "domain": "boolean",
                "dimensions": [12]
            }
        ],
        "constraint_registry": [
            {
                "id": "c1",
                "name": "capacity_limit",
                "family": "capacity",
                "operator": "<=",
                "lhs": {
                    "type": "aggregate",
                    "func": "sum",
                    "var_id": "x",
                    "coefficients": "NUMBLK_000"  # LLM outputs the ID string
                },
                "rhs": {"type": "constant", "value": 300}
            }
        ]
    }

    # 4. Inject numeric blocks back into CMM spec
    print("\n[Step 3] Running Injector on parsed response...")
    resolved_spec = inject_numeric_blocks(mock_parser_response, registry)
    
    # Assert values restored losslessly
    restored_coeffs = resolved_spec["constraint_registry"][0]["lhs"]["coefficients"]
    print(f"  Restored coefficients: {restored_coeffs}")
    assert restored_coeffs == weights, "Restored data does not match original"
    print("  ✅ Lossless data restoration verified.")

    # 5. Run downstream IR Normalization and Feasibility check
    print("\n[Step 4] Running IR Normalizer & Numerical Feasibility Checker...")
    ir = IRNormalizer.normalize(resolved_spec)
    feasibility_results = NumericalFeasibilityChecker.check(ir)
    
    print(f"  Feasibility check status: {feasibility_results[0].status}")
    print(f"  Evidence: {feasibility_results[0].reason}")
    assert feasibility_results[0].status in ("PASS", "WARN"), "Feasibility check crashed or failed"
    print("  ✅ IR Normalizer and Feasibility Checks passed successfully.")

    print("\n=== ALL PIPELINE VERIFICATIONS PASSED ===")


if __name__ == "__main__":
    verify_pipeline()
