# -*- coding: utf-8 -*-
"""
Local Optimization Model to D-Wave Solver Pipeline Runner
==========================================================
Executes the full pipeline locally:
  1. Parses JSON Optimization Model.
  2. Maps standard CMM fields into compiler-compliant AST.
  3. Compiles objective and constraints to a QUBO matrix via AutoQUBO backend.
  4. Runs the local D-Wave Simulated Annealing Sampler.
  5. Dynamically validates constraint feasibility and calculates objective value.
"""

import os
import sys
import json
import numpy as np

# Ensure quantum backend engine is in Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'quantum-backend/v3/engine'))

from compiler.expander import parse_spec_to_cmm, expand_cmm_to_om
from compiler.backends.autoqubo_backend import compile_om_to_autoqubo, DWaveAdapter

def map_json_spec_to_compiler(model: dict) -> dict:
    """Correctly maps RHS numeric values to constant nodes and handles ast translation."""
    mapped = {
        "problem_text": model.get("problem_text", "Optimization Problem"),
        "variable_registry": model["variable_registry"],
        "constraint_registry": [],
        "penalty_weight": model.get("penalty_weight", 10.0)
    }

    # Map Objectives
    mapped_objectives = []
    for obj in model["objectives"]:
        sense = obj["sense"].upper()
        expr = obj["expression"]
        if isinstance(expr, dict) and expr.get("type") == "quadratic":
            var_id = expr["var_id"]
            lin_coeffs = expr.get("linear_coefficients", [])
            quad_terms = expr.get("quadratic_terms", [])
            mapped_expr = {
                "type": "aggregate",
                "var_id": var_id,
                "coefficients": lin_coeffs
            }
            for term in quad_terms:
                i = term["i"]
                j = term["j"]
                coeff = term["coefficient"]
                quad_node = {
                    "type": "binary_op",
                    "op": "*",
                    "left": {"type": "constant", "value": float(coeff)},
                    "right": {
                        "type": "binary_op",
                        "op": "*",
                        "left": {"type": "variable", "var_id": var_id, "index": i},
                        "right": {"type": "variable", "var_id": var_id, "index": j}
                    }
                }
                mapped_expr = {
                    "type": "binary_op",
                    "op": "+",
                    "left": mapped_expr,
                    "right": quad_node
                }
            mapped_objectives.append({"sense": sense, "expression": mapped_expr})
        else:
            mapped_objectives.append(obj)
    mapped["objectives"] = mapped_objectives

    # Map Constraints (wrapping RHS in constant nodes)
    for c in model["constraint_registry"]:
        mapped_c = {
            "id": c["id"],
            "name": c["name"],
            "operator": c["operator"],
            "rhs": {"type": "constant", "value": float(c["rhs"])}
        }
        lhs = c["lhs"]
        if isinstance(lhs, dict):
            lhs_type = lhs.get("type")
            if lhs_type == "linear_difference":
                terms = lhs["terms"]
                if len(terms) == 2:
                    pos_term = next(t for t in terms if t["coefficient"] > 0)
                    neg_term = next(t for t in terms if t["coefficient"] < 0)
                    mapped_c["lhs"] = {
                        "type": "binary_op",
                        "op": "-",
                        "left": {"type": "variable", "var_id": pos_term["var_id"], "index": pos_term["index"]},
                        "right": {"type": "variable", "var_id": neg_term["var_id"], "index": neg_term["index"]}
                    }
            elif lhs_type == "aggregate" and "indices" in lhs:
                var_id = lhs["var_id"]
                indices = lhs["indices"]
                coeffs = lhs["coefficients"]
                var_def = next(v for v in model["variable_registry"] if v["id"] == var_id)
                dim = var_def["dimensions"][0]
                full_coeffs = [0] * dim
                for idx, c_val in zip(indices, coeffs):
                    full_coeffs[idx] = c_val
                mapped_c["lhs"] = {
                    "type": "aggregate",
                    "var_id": var_id,
                    "coefficients": full_coeffs
                }
            else:
                mapped_c["lhs"] = lhs
        else:
            mapped_c["lhs"] = lhs
        mapped["constraint_registry"].append(mapped_c)

    return mapped

def run_local_pipeline(json_model_path: str):
    """Loads a JSON optimization model, compiles it, and solves it locally."""
    if not os.path.exists(json_model_path):
        print(f"Error: JSON model file not found at: {json_model_path}")
        return

    with open(json_model_path) as f:
        model_data = json.load(f)

    print("\n========================================================")
    print(f"  1. Loaded Problem ID {model_data.get('problem_id', 'unknown')}: {model_data.get('problem_text', 'Model')[:60]}...")
    print("========================================================")

    # 2. Map schema to compiler nodes
    mapped = map_json_spec_to_compiler(model_data)

    # 3. Parse AST and compile to OptimizationModel
    cmm = parse_spec_to_cmm(mapped)
    om = expand_cmm_to_om(cmm, model_data.get("problem_text", "Model"))

    # 4. Compile OptimizationModel to QuboIR (offset + Q matrix)
    penalty = model_data.get("penalty_weight", 10.0)
    print(f"  2. Compiling Optimization Model with Lambda (penalty weight) = {penalty}...")
    res = compile_om_to_autoqubo(om, penalty_weight=penalty)
    if not res["available"] or res["error"]:
        print(f"  [Error] Compilation failed: {res['error']}")
        return

    ir = res["ir"]
    print("     ✓ Compilation Successful.")
    print(f"     ✓ Qubits required (logical size): {ir.variable_map.total_vars}")
    print(f"     ✓ Dynamic Offset computed: {ir.offset}")

    # 5. Execute using D-Wave Simulator (SimulatedAnnealingSampler)
    print("  3. Submitting to D-Wave Simulated Annealing Sampler (Locally running 5,000 sweeps)...")
    adapter = DWaveAdapter()
    solve_res = adapter.solve(ir, num_reads=5000, seed=42)

    print("========================================================")
    print("  4. Solver Execution Complete & Decoded Report:")
    print("========================================================")
    print(f"     ✓ Feasibility Status: {'FEASIBLE (PASS) ✓' if solve_res['feasible'] else 'INFEASIBLE (FAIL) ✗'}")
    print(f"     ✓ Objective Value (Re-evaluated): {solve_res['objective_value']}")
    print(f"     ✓ Solver Base Energy: {solve_res['energy']}")
    if solve_res['violated_constraints']:
        print(f"     [Violated Constraints]: {solve_res['violated_constraints']}")
    else:
        print("     ✓ All constraints fully satisfied.")

    print("\n  5. Optimal Decisions decoded (Decision variables set to 1):")
    for var, val in solve_res["solution"].items():
        if val == 1:
            print(f"     - {var} = {val} [SELECTED]")

    print("\n  6. Detailed Feasibility Audit Log:")
    for c_name, audit in solve_res["feasibility_report"].items():
        status = "PASSED" if audit["feasible"] else "FAILED"
        print(f"     - [{status}] {c_name}: LHS value {audit['lhs']} {audit['op']} RHS limit {audit['rhs']}")
    print("========================================================")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_local_pipeline.py <path_to_json_optimization_model>")
    else:
        run_local_pipeline(sys.argv[1])
