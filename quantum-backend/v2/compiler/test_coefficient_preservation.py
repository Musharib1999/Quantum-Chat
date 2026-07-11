"""
V6.7 Coefficient Preservation Smoke Test
Fully generalised — no hardcoded domain names.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from v2.compiler.ir import IRNormalizer
from v2.compiler.dcc import compile_v66


def test_coefficient_preservation():
    parsed = {
        "variable_registry": [
            {
                "id": "x", "name": "items", "domain": "integer", "dimensions": [4],
                "labels": ["A", "B", "C", "D"],
                "data": {
                    "resource1": [12.0, 25.0, 40.0, 30.0],
                    "resource2": [3.0,  5.0,  8.0,  6.0],
                    "profit":    [45.0, 70.0, 120.0, 95.0],
                }
            }
        ],
        "constraint_registry": [
            {
                "id": "C001", "name": "resource1_budget", "family": "budget",
                "operator": "<=",
                "lhs": {"type": "aggregate", "func": "sum", "var_id": "x",
                        "coefficients": [12.0, 25.0, 40.0, 30.0]},
                "rhs": {"type": "constant", "value": 1800.0},
            },
            {
                "id": "C002", "name": "resource2_budget", "family": "budget",
                "operator": "<=",
                "lhs": {"type": "aggregate", "func": "sum", "var_id": "x",
                        "coefficients": [3.0, 5.0, 8.0, 6.0]},
                "rhs": {"type": "constant", "value": 360.0},
            },
            {
                "id": "C003", "name": "D_le_B", "family": "dependency", "operator": "<=",
                "lhs": {"type": "variable", "var_id": "x", "index": 3},
                "rhs": {"type": "variable", "var_id": "x", "index": 1},
            },
            {
                "id": "C004", "name": "C_le_2A", "family": "dependency", "operator": "<=",
                "lhs": {"type": "variable", "var_id": "x", "index": 2},
                "rhs": {"type": "binary_op", "op": "*",
                        "left": {"type": "constant", "value": 2.0},
                        "right": {"type": "variable", "var_id": "x", "index": 0}},
            },
        ],
        "objectives": [
            {
                "id": "O001", "sense": "maximize",
                "expression": {"type": "aggregate", "func": "sum", "var_id": "x",
                               "coefficients": [45.0, 70.0, 120.0, 95.0]},
            }
        ],
    }

    ir = IRNormalizer.normalize(parsed)
    result = compile_v66(ir)
    code = result["code"]

    assert result["success"], f"Compilation failed: {result['verification_report']}"

    for coeff in ["12", "25", "40", "30"]:
        assert coeff in code, f"resource1 coeff {coeff} missing"
    for coeff in ["3", "5", "8", "6"]:
        assert coeff in code, f"resource2 coeff {coeff} missing"
    for coeff in ["45", "70", "120", "95"]:
        assert coeff in code, f"profit coeff {coeff} missing"
    assert "1800" in code, "limit 1800 missing"
    assert "360" in code,  "limit 360 missing"
    assert "x[3]" in code and "x[1]" in code, "D<=B (x[3]<=x[1]) not emitted"

    print("PASS: test_coefficient_preservation")


def test_dependency_variable_references():
    parsed = {
        "variable_registry": [
            {"id": "y", "name": "units", "domain": "integer", "dimensions": [3],
             "labels": ["P", "Q", "R"],
             "data": {"cost": [10.0, 20.0, 15.0]}}
        ],
        "constraint_registry": [
            {
                "id": "C1", "name": "P_le_Q", "family": "dependency", "operator": "<=",
                "lhs": {"type": "variable", "var_id": "y", "index": 0},
                "rhs": {"type": "variable", "var_id": "y", "index": 1},
            }
        ],
        "objectives": [
            {"id": "O1", "sense": "minimize",
             "expression": {"type": "aggregate", "func": "sum", "var_id": "y",
                            "coefficients": [10.0, 20.0, 15.0]}}
        ],
    }
    ir = IRNormalizer.normalize(parsed)
    result = compile_v66(ir)
    code = result["code"]
    assert result["success"]
    assert "y[0]" in code and "y[1]" in code, f"y[0]<=y[1] not emitted"
    assert "10" in code and "20" in code and "15" in code, "objective coefficients missing"
    print("PASS: test_dependency_variable_references")


if __name__ == "__main__":
    tests = [test_coefficient_preservation, test_dependency_variable_references]
    passed = failed = 0
    for t in tests:
        try:
            t()
            passed += 1
        except Exception as e:
            print(f"FAIL: {t.__name__} — {e}")
            import traceback; traceback.print_exc()
            failed += 1
    print(f"\nResults: {passed} passed, {failed} failed")
    if failed:
        sys.exit(1)
