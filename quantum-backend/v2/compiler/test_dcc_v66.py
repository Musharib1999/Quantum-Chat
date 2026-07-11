"""
DCC V6.6 Regression Test Suite
Tests: IR normalization, primitive expansion, compilation, feasibility checker.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from v2.compiler.ir import (
    OptimizationIR, Variable, Constraint, Objective, Domain, ConstraintType,
    Constant, VarRef, Aggregate, Aggregate2D, BinaryOp,
    IRNormalizer, NumericalFeasibilityChecker,
)
from v2.compiler.dcc import compile_v66


# ── Helper: build IR from JSON and compile ──────────────────────────────
def build_and_compile(parsed_json: dict) -> dict:
    ir = IRNormalizer.normalize(parsed_json)
    return compile_v66(ir)


# ── Test 1: Hospital assignment (classic 2D) ────────────────────────────
def test_hospital_assignment():
    parsed = {
        "variables": [
            {"id": "y", "name": "select_hub", "domain": "boolean", "dimensions": [5],
             "data": {"cost": [50000, 75000, 60000, 90000, 45000]}},
            {"id": "x", "name": "assign", "domain": "boolean", "dimensions": [12, 5]},
        ],
        "constraints": [
            {"id": "c1", "name": "unique_assignment", "type": "uniqueness",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "x"},
             "operator": "==", "rhs": 1.0, "confidence": 0.99},
            {"id": "c2", "name": "hub_capacity", "type": "capacity",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "x"},
             "operator": "<=", "rhs": 5.0, "confidence": 0.95},
            {"id": "c3", "name": "budget_limit", "type": "budget",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "y"},
             "operator": "<=", "rhs": 200000.0, "confidence": 0.98},
        ],
        "objectives": [
            {"sense": "minimize",
             "expression": {"type": "aggregate", "func": "sum", "var_id": "y", "coefficients": [50000, 75000, 60000, 90000, 45000]}},
        ],
    }
    result = build_and_compile(parsed)
    assert result["success"], f"Hospital assignment failed: {result['verification_report']}"
    assert "cqm" in result["code"].lower()
    assert result["code"].count("add_constraint") >= 3
    # Check uniqueness generated 12 equations (one per hospital)
    uniq_eqs = [e for e in result["plan"]["equations"] if "unique_assignment" in e.label]
    assert len(uniq_eqs) == 12, f"Expected 12 uniqueness eqs, got {len(uniq_eqs)}"
    print("PASS: test_hospital_assignment")


# ── Test 2: Portfolio selection (1D budget + cardinality) ───────────────
def test_portfolio_selection():
    parsed = {
        "variables": [
            {"id": "x", "name": "invest", "domain": "boolean", "dimensions": [8],
             "labels": ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "NFLX"],
             "data": {"cost": [150, 200, 180, 300, 250, 120, 400, 90]}},
        ],
        "constraints": [
            {"id": "c1", "name": "max_stocks", "type": "cardinality",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "x"},
             "operator": "<=", "rhs": 4.0, "confidence": 0.99},
            {"id": "c2", "name": "min_stocks", "type": "cardinality",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "x"},
             "operator": ">=", "rhs": 2.0, "confidence": 0.99},
            {"id": "c3", "name": "budget", "type": "budget",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "x"},
             "operator": "<=", "rhs": 800.0, "confidence": 0.97},
        ],
        "objectives": [
            {"sense": "maximize",
             "expression": {"type": "aggregate", "func": "sum", "var_id": "x"}},
        ],
    }
    result = build_and_compile(parsed)
    assert result["success"], f"Portfolio failed: {result['verification_report']}"
    assert result["code"].count("add_constraint") >= 3
    print("PASS: test_portfolio_selection")


# ── Test 3: Knapsack (budget with weights) ──────────────────────────────
def test_knapsack():
    parsed = {
        "variables": [
            {"id": "x", "name": "item", "domain": "boolean", "dimensions": [6],
             "data": {"cost": [10, 20, 30, 40, 50, 60], "value": [60, 100, 120, 160, 200, 240]}},
        ],
        "constraints": [
            {"id": "c1", "name": "weight_limit", "type": "budget",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "x"},
             "operator": "<=", "rhs": 100.0, "confidence": 0.99},
        ],
        "objectives": [
            {"sense": "maximize",
             "expression": {"type": "aggregate", "func": "sum", "var_id": "x",
                            "coefficients": [60, 100, 120, 160, 200, 240]}},
        ],
    }
    result = build_and_compile(parsed)
    assert result["success"]
    assert result["code"].count("add_constraint") >= 1
    print("PASS: test_knapsack")


# ── Test 4: Facility location (2D + linking) ───────────────────────────
def test_facility_location():
    parsed = {
        "variables": [
            {"id": "y", "name": "open_facility", "domain": "boolean", "dimensions": [4],
             "data": {"cost": [1000, 2000, 1500, 1800]}},
            {"id": "x", "name": "assign_customer", "domain": "boolean", "dimensions": [10, 4]},
        ],
        "constraints": [
            {"id": "c1", "name": "serve_all", "type": "uniqueness",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "x"},
             "operator": "==", "rhs": 1.0, "confidence": 0.99},
            {"id": "c2", "name": "facility_cap", "type": "capacity",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "x"},
             "operator": "<=", "rhs": 5.0, "confidence": 0.95},
        ],
        "objectives": [
            {"sense": "minimize",
             "expression": {"type": "aggregate", "func": "sum", "var_id": "y",
                            "coefficients": [1000, 2000, 1500, 1800]}},
        ],
    }
    result = build_and_compile(parsed)
    assert result["success"]
    # Should have auto-linking
    linking_eqs = [e for e in result["plan"]["equations"] if "linking" in e.label]
    assert len(linking_eqs) == 40, f"Expected 40 linking eqs (10x4), got {len(linking_eqs)}"
    print("PASS: test_facility_location")


# ── Test 5: Scheduling (OR-Tools path) ─────────────────────────────────
def test_scheduling_ortools():
    parsed = {
        "variables": [
            {"id": "x", "name": "shift_assign", "domain": "continuous", "dimensions": [8, 5]},
        ],
        "constraints": [
            {"id": "c1", "name": "one_shift_per_worker", "type": "uniqueness",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "x"},
             "operator": "==", "rhs": 1.0, "confidence": 0.99},
            {"id": "c2", "name": "shift_demand", "type": "capacity",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "x"},
             "operator": ">=", "rhs": 2.0, "confidence": 0.95},
        ],
        "objectives": [
            {"sense": "minimize",
             "expression": {"type": "aggregate", "func": "sum", "var_id": "x"}},
        ],
    }
    result = build_and_compile(parsed)
    assert result["success"]
    assert result["solver"] == "OR-Tools"
    assert "cp_model" in result["code"]
    print("PASS: test_scheduling_ortools")


# ── Test 6: Lower bound constraint ─────────────────────────────────────
def test_lower_bound():
    parsed = {
        "variables": [
            {"id": "x", "name": "investment", "domain": "continuous", "dimensions": [5],
             "labels": ["Google", "Facebook", "Instagram", "YouTube", "Twitter"]},
        ],
        "constraints": [
            {"id": "c1", "name": "google_min_spend", "type": "lower_bound",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "x"},
             "operator": ">=", "rhs": 30000.0, "confidence": 0.98},
        ],
        "objectives": [
            {"sense": "minimize",
             "expression": {"type": "aggregate", "func": "sum", "var_id": "x"}},
        ],
    }
    result = build_and_compile(parsed)
    assert result["success"]
    assert ">=" in result["code"]
    print("PASS: test_lower_bound")


# ── Test 7: Conflict constraint ─────────────────────────────────────────
def test_conflict():
    parsed = {
        "variables": [
            {"id": "x", "name": "project", "domain": "boolean", "dimensions": [5]},
        ],
        "constraints": [
            {"id": "c1", "name": "conflict_A_B", "type": "conflict",
             "lhs": {"type": "variable", "var_id": "x", "index": "0"},
             "operator": "<=",
             "rhs": {"type": "variable", "var_id": "x", "index": "1"},
             "confidence": 0.96},
        ],
        "objectives": [
            {"sense": "maximize",
             "expression": {"type": "aggregate", "func": "sum", "var_id": "x"}},
        ],
    }
    result = build_and_compile(parsed)
    assert result["success"]
    print("PASS: test_conflict")


# ── Test 8: Infeasible problem ──────────────────────────────────────────
def test_infeasible():
    ir = OptimizationIR(
        variables=[Variable("x", "select", Domain.BOOLEAN, [3])],
        constraints=[
            Constraint("c1", "impossible", ConstraintType.EQUALITY,
                       Aggregate("sum", "x", "i", 3), "==", Constant(10.0),
                       confidence=0.99),
        ],
    )
    result = compile_v66(ir)
    assert not result["success"], "Should detect infeasibility"
    assert any(f.status == "FAIL" for f in result["feasibility_results"])
    print("PASS: test_infeasible")


# ── Test 9: Coverage constraint ─────────────────────────────────────────
def test_coverage():
    parsed = {
        "variables": [
            {"id": "x", "name": "cover", "domain": "boolean", "dimensions": [6, 3]},
        ],
        "constraints": [
            {"id": "c1", "name": "cover_all_areas", "type": "coverage",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "x"},
             "operator": ">=", "rhs": 1.0, "confidence": 0.97},
        ],
        "objectives": [
            {"sense": "minimize",
             "expression": {"type": "aggregate", "func": "sum", "var_id": "x"}},
        ],
    }
    result = build_and_compile(parsed)
    assert result["success"]
    coverage_eqs = [e for e in result["plan"]["equations"] if "cover_all" in e.label]
    assert len(coverage_eqs) == 6
    print("PASS: test_coverage")


# ── Test 10: Budget with auto-normalization ─────────────────────────────
def test_budget_normalization():
    parsed = {
        "variables": [
            {"id": "x", "name": "project", "domain": "boolean", "dimensions": [4],
             "data": {"cost": [10, 20, 30, 40]}},
        ],
        "constraints": [
            {"id": "c1", "name": "total_budget", "type": "budget",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "x"},
             "operator": "<=", "rhs": 5000000.0, "confidence": 0.99},
        ],
        "objectives": [
            {"sense": "maximize",
             "expression": {"type": "aggregate", "func": "sum", "var_id": "x"}},
        ],
    }
    result = build_and_compile(parsed)
    assert result["success"]
    # Auto-normalization should have triggered (rhs >> sum of coefficients)
    print("PASS: test_budget_normalization")


# ── Test 11: IR normalizer JSON parsing ─────────────────────────────────
def test_ir_normalizer():
    parsed = {
        "variables": [
            {"id": "x", "name": "allocation", "domain": "integer", "dimensions": 5},
        ],
        "constraints": [
            {"id": "c1", "name": "test_ub", "type": "upper_bound",
             "lhs": {"type": "aggregate", "func": "sum", "var_id": "x"},
             "operator": "<=", "rhs": 100, "confidence": 0.92},
        ],
        "objectives": [],
    }
    ir = IRNormalizer.normalize(parsed)
    assert len(ir.variables) == 1
    assert ir.variables[0].domain == Domain.INTEGER
    assert ir.variables[0].dimensions == [5]
    assert len(ir.constraints) == 1
    assert ir.constraints[0].type == ConstraintType.UPPER_BOUND
    assert ir.constraints[0].confidence == 0.92
    print("PASS: test_ir_normalizer")


# ── Test 12: Feasibility checker numerical bounds ───────────────────────
def test_feasibility_checker():
    ir = OptimizationIR(
        variables=[Variable("x", "select", Domain.BOOLEAN, [5])],
        constraints=[
            # Feasible: sum of 5 booleans <= 10
            Constraint("c1", "easy", ConstraintType.UPPER_BOUND,
                       Aggregate("sum", "x", "i", 5), "<=", Constant(10.0)),
            # Infeasible: sum of 5 booleans >= 8
            Constraint("c2", "hard", ConstraintType.LOWER_BOUND,
                       Aggregate("sum", "x", "i", 5), ">=", Constant(8.0)),
        ],
    )
    results = NumericalFeasibilityChecker.check(ir)
    assert results[0].status == "PASS"
    assert results[1].status == "FAIL"  # max sum of 5 booleans = 5 < 8
    print("PASS: test_feasibility_checker")


# ── Test 13: Compositional facts parser schema mapping ──────────────────
def test_compositional_schema_mapping():
    parsed = {
        "variable_registry": [
            {"id": "x", "name": "marketing_channel_investment", "domain": "continuous", "dimensions": [4]},
        ],
        "constraint_registry": [
            {"id": "C001", "name": "total_budget_limit", "family": "budget", "description": "Total spending limit", "limit_value": 180000.0, "operator": "<="},
            {"id": "C002", "name": "min_spend_google", "family": "capacity", "description": "Google minimum spend", "limit_value": 30000.0, "operator": ">="},
        ],
        "objectives": [
            {"id": "O001", "type": "reward", "metric": "expected_customer_acquisition", "strength": "critical"}
        ]
    }
    result = build_and_compile(parsed)
    assert result["success"]
    assert "ortools" in result["code"].lower()
    print("PASS: test_compositional_schema_mapping")


# ── Test 14: LaTeX rendering ─────────────────────────────────────────────
def test_latex_rendering():
    from v2.compiler.ir import Constant, VarRef, BinaryOp, Aggregate, Constraint, ConstraintType
    
    # 1. Constant
    assert Constant(5.0).to_latex() == "5"
    assert Constant(180000.0).to_latex() == "180000"
    assert Constant(10.5).to_latex() == "10.50"
    
    # 2. VarRef
    assert VarRef("x_CPU").to_latex() == "x_CPU"
    assert VarRef("x", "0").to_latex() == "x_{0}"
    
    # 3. BinaryOp
    expr = BinaryOp(VarRef("x_CPU"), "<=", Constant(2.0))
    # Note: BinaryOp.to_latex returns operations in parenthesis
    assert expr.to_latex() == "(x_CPU <= 2)"
    
    # 4. Aggregate
    agg = Aggregate(func="sum", var_id="x", index_var="i", index_range=5)
    assert agg.to_latex() == "\\sum_{i=0}^{4} x_{i}"
    
    # 5. Constraint
    c = Constraint("c1", "google_min", ConstraintType.LOWER_BOUND, agg, ">=", Constant(30000.0))
    assert c.to_latex() == "\\sum_{i=0}^{4} x_{i} \\ge 30000"
    print("PASS: test_latex_rendering")


# ── Test 15: Sandboxed verification ─────────────────────────────────────
def test_sandboxed_verifier():
    from v2.compiler.ir import Variable, Domain, OptimizationIR
    from v2.compiler.dcc import SandboxedVerifier, compile_v66
    
    # 1. Successful sandbox verification
    ir = OptimizationIR(
        variables=[Variable("y", "select", Domain.BOOLEAN, [3])],
        constraints=[],
        objectives=[]
    )
    result = compile_v66(ir, force_solver="CQM")
    assert result["success"]
    
    # Run sandbox verification directly
    inspect_res = SandboxedVerifier.verify(result["code"], ir)
    assert inspect_res["solver"] == "CQM"
    assert len(inspect_res["variables"]) == 3
    print("PASS: test_sandboxed_verifier")


# ── Test 16: V6.7 compiler preservation ─────────────────────────────────
def test_v67_compiler_preservation():
    parsed = {
        "variables": [
            {"id": "Medium", "name": "medium_var", "domain": "boolean", "dimensions": [1]},
            {"id": "Large", "name": "large_var", "domain": "boolean", "dimensions": [1]},
        ],
        "constraints": [
            {"id": "c1", "name": "hierarchy", "type": "dependency",
             "lhs": {"type": "variable", "var_id": "Large"},
             "operator": "<=",
             "rhs": {"type": "variable", "var_id": "Medium"},
             "confidence": 0.99},
        ],
        "objectives": [],
    }
    result = build_and_compile(parsed)
    assert result["success"]
    # Check that Large and Medium are compiled without losing semantic binding
    assert "Large[0] <= Medium[0]" in result["code"] or "Large[0] - (Medium[0]) <= 0" in result["code"]
    print("PASS: test_v67_compiler_preservation")


# ── Run all tests ───────────────────────────────────────────────────────
if __name__ == "__main__":
    tests = [
        test_hospital_assignment,
        test_portfolio_selection,
        test_knapsack,
        test_facility_location,
        test_scheduling_ortools,
        test_lower_bound,
        test_conflict,
        test_infeasible,
        test_coverage,
        test_budget_normalization,
        test_ir_normalizer,
        test_feasibility_checker,
        test_compositional_schema_mapping,
        test_latex_rendering,
        test_sandboxed_verifier,
        test_v67_compiler_preservation,
    ]
    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            passed += 1
        except Exception as e:
            print(f"FAIL: {t.__name__} — {e}")
            failed += 1

    print(f"\n{'='*50}")
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)}")
    if failed == 0:
        print("All tests passed!")
    else:
        print("Some tests failed.")
        sys.exit(1)
