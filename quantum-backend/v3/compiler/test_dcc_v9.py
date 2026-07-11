# -*- coding: utf-8 -*-
"""
DCC V9 Compiler Suite Regression Tests
Verifies multi-backend lowering (OR-Tools, CQM, QUBO, AutoQUBO, MILP),
structured rich results (variables, constraints, LaTeX formulas),
and end-to-end mathematical correctness.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from v3.compiler.dcc import compile_compositional_ast, compile_compositional_ast_rich


def get_mock_problem():
    """Returns a valid 3-variable, 2-constraint optimization problem specification."""
    return {
        "problem_text": "Maximize location selection revenue with budget constraints.",
        "variable_registry": [
            {
                "id": "x",
                "name": "x",
                "type": "BINARY",
                "dimensions": [3],
                "labels": ["Location A", "Location B", "Location C"],
                "data": {
                    "revenue": [100.0, 150.0, 90.0],
                    "cost": [50.0, 80.0, 40.0]
                }
            }
        ],
        "constraint_registry": [
            {
                "name": "budget_limit",
                "family": "budget",
                "operator": "<=",
                "rhs": 120.0,
                "lhs": {
                    "type": "aggregate",
                    "var_id": "x",
                    "coefficients": [50.0, 80.0, 40.0]
                }
            },
            {
                "name": "min_locations",
                "family": "coverage",
                "operator": ">=",
                "rhs": 1.0,
                "lhs": {
                    "type": "aggregate",
                    "var_id": "x",
                    "coefficients": [1.0, 1.0, 1.0]
                }
            }
        ],
        "objectives": [
            {
                "sense": "MAXIMIZE",
                "expression": {
                    "type": "aggregate",
                    "var_id": "x",
                    "coefficients": [100.0, 150.0, 90.0]
                }
            }
        ]
    }


def test_v9_ortools_backend():
    spec = get_mock_problem()
    result = compile_compositional_ast_rich(spec, force_solver="OR-Tools")
    assert result["solver"] == "OR-Tools"
    assert result["n_variables"] == 3
    assert result["n_constraints"] == 2
    assert result["available"] is True
    assert "cp_model" in result["code"]
    assert "model.Maximize" in result["code"]


def test_v9_cqm_backend():
    spec = get_mock_problem()
    result = compile_compositional_ast_rich(spec, force_solver="CQM")
    assert result["solver"] == "CQM"
    assert result["n_variables"] == 3
    assert result["n_constraints"] == 2
    assert "ConstrainedQuadraticModel" in result["code"]


def test_v9_qubo_backend():
    spec = get_mock_problem()
    result = compile_compositional_ast_rich(spec, force_solver="QUBO")
    assert result["solver"] == "QUBO"
    assert result["n_variables"] == 3
    assert result["n_constraints"] == 2
    assert "SimulatedAnnealingSampler" in result["code"]
    assert "bqm.to_qubo()" in result["code"]


def test_v9_autoqubo_backend():
    spec = get_mock_problem()
    result = compile_compositional_ast_rich(spec, force_solver="AutoQUBO")
    assert result["solver"] == "AutoQUBO"
    assert result["n_variables"] == 3
    assert result["n_constraints"] == 2
    assert "SamplingCompiler" in result["code"]
    assert "objective_fn" in result["code"]


def test_v9_milp_backend():
    spec = get_mock_problem()
    result = compile_compositional_ast_rich(spec, force_solver="MILP")
    assert result["solver"] == "MILP"
    assert result["n_variables"] == 3
    assert result["n_constraints"] == 2
    assert result["status"] == "Optimal"
    # Cost budget is 120. Choosing A (50) and C (40) is cost 90, revenue 190.
    # Choosing B (80) and C (40) is cost 120, revenue 240.
    # Choosing A (50) and B (80) is cost 130 (infeasible).
    # Thus optimal should be B + C with revenue 240.0
    assert abs(result["objective"] - 240.0) < 1e-4
    assert result["assignments"].get("x_1") == 1.0
    assert result["assignments"].get("x_2") == 1.0
    assert result["assignments"].get("x_0") is None or result["assignments"].get("x_0") < 1e-4
