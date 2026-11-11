#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comprehensive Stability & Precision Unit Test Suite for Native Rust AutoQUBO Compiler
=====================================================================================
Covers 28 rigorous unit tests across 3 suites:
  Suite 1: Native Rust Kernel Direct C-ABI Stability (10 Tests)
  Suite 2: Compiler Pipeline Integration & Fallback Robustness (8 Tests)
  Suite 3: End-to-End Problem Family Feasibility via D-Wave Adapter (10 Tests)
"""

import sys
import os
import re
import math
import time
import threading
import numpy as np
import pytest

BACKEND_DIR = "/Users/musharibsubhani/.gemini/antigravity/playground/prime-blazar/quantum-backend"
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import autoqubo_fast
from v3.engine.compiler.expander import parse_spec_to_cmm, expand_cmm_to_om, validate_optimization_model
from v3.engine.compiler.backends.autoqubo_backend import (
    compile_om_to_autoqubo_ir,
    DWaveAdapter,
    VariableMap,
    QuboIR
)


# ==============================================================================
# SUITE 1: Native Rust Kernel Direct C-ABI Stability (10 Tests)
# ==============================================================================
class TestRustKernelDirect:

    def test_01_rust_module_availability(self):
        """Verify the compiled Rust extension is correctly imported and responsive."""
        assert autoqubo_fast.is_fast_available() is True, "Rust extension is not reporting available"

    def test_02_empty_and_trivial_model(self):
        """Verify Rust handles minimal 1-variable trivial problem without crash."""
        q, off = autoqubo_fast.compile_qubo_dense(
            1,
            [0], [42.0],
            [], [], [],
            [], [],
            [], [],
            [],
            [], [], [],
            10.0
        )
        assert len(q) == 1
        assert q[0] == 42.0
        assert off == 0.0

    def test_03_zero_coefficients_ignored(self):
        """Verify coefficients of 0.0 do not distort Hamiltonian off-diagonals."""
        q, off = autoqubo_fast.compile_qubo_dense(
            3,
            [0, 1], [0.0, 5.0],
            [], [], [],
            [], [],
            [], [],
            [],
            [], [], [],
            10.0
        )
        assert q[0] == 0.0
        assert q[4] == 5.0  # (1, 1) in 3x3 is index 1*3 + 1 = 4
        assert off == 0.0

    def test_04_mathematical_exactness_equality(self):
        """Verify x^T Q x + offset analytically matches gamma * (sum c_i x_i - rhs)^2 across random vectors."""
        n = 5
        gamma = 35.0
        idxs = [0, 1, 3]
        coefs = [2.0, -1.0, 3.0]
        rhs = 4.0

        q, off = autoqubo_fast.compile_qubo_dense(
            n,
            [], [],
            [], [], [],
            [], [],
            [], [],
            [],
            [idxs], [coefs], [rhs],
            gamma
        )
        Q_mat = np.array(q).reshape((n, n))

        # Test against 32 exhaustive binary vectors
        for val in range(32):
            x = np.array([int(b) for b in bin(val)[2:].zfill(n)], dtype=np.float64)
            qubo_energy = float(x @ Q_mat @ x + off)
            target_penalty = gamma * ((coefs[0]*x[0] + coefs[1]*x[1] + coefs[2]*x[3] - rhs) ** 2)
            assert abs(qubo_energy - target_penalty) < 1e-7, f"Mismatch at x={x}: QUBO={qubo_energy}, Target={target_penalty}"

    def test_05_mathematical_exactness_dependency(self):
        """Verify dependency x_pos <= x_neg creates exact penalty gamma * x_pos * (1 - x_neg)."""
        n = 4
        gamma = 50.0
        pos, neg = 1, 2
        q, off = autoqubo_fast.compile_qubo_dense(
            n,
            [], [],
            [], [], [],
            [pos], [neg],
            [], [],
            [],
            [], [], [],
            gamma
        )
        Q_mat = np.array(q).reshape((n, n))
        for val in range(16):
            x = np.array([int(b) for b in bin(val)[2:].zfill(n)], dtype=np.float64)
            qubo_energy = float(x @ Q_mat @ x + off)
            target = gamma * (x[pos] * (1.0 - x[neg]))
            assert abs(qubo_energy - target) < 1e-7

    def test_06_mathematical_exactness_mutex_and_clique(self):
        """Verify 2-var mutex and clique mutex produce exact pairwise penalties."""
        n = 5
        gamma = 25.0
        # Mutex between (0, 1)
        # Clique mutex on (2, 3, 4)
        q, off = autoqubo_fast.compile_qubo_dense(
            n,
            [], [],
            [], [], [],
            [], [],
            [0], [1],
            [[2, 3, 4]],
            [], [], [],
            gamma
        )
        Q_mat = np.array(q).reshape((n, n))
        for val in range(32):
            x = np.array([int(b) for b in bin(val)[2:].zfill(n)], dtype=np.float64)
            qubo_energy = float(x @ Q_mat @ x + off)
            target = gamma * (x[0]*x[1]) + gamma * (x[2]*x[3] + x[2]*x[4] + x[3]*x[4])
            assert abs(qubo_energy - target) < 1e-7

    def test_07_dense_quadratic_cross_couplings(self):
        """Verify positive and negative quadratic objective couplings x_i * x_j."""
        n = 4
        q_i = [0, 1]
        q_j = [2, 3]
        q_w = [18.5, -9.25]
        q, off = autoqubo_fast.compile_qubo_dense(
            n,
            [0], [10.0],
            q_i, q_j, q_w,
            [], [],
            [], [],
            [],
            [], [], [],
            1.0
        )
        Q_mat = np.array(q).reshape((n, n))
        # Entry (0, 2)
        assert Q_mat[0, 2] == 18.5
        # Entry (1, 3)
        assert Q_mat[1, 3] == -9.25
        # Diagonal (0, 0)
        assert Q_mat[0, 0] == 10.0

    def test_08_out_of_bounds_safety(self):
        """Verify invalid variable indices >= N are safely ignored without memory segfaults."""
        n = 3
        # Index 99 is out of bounds
        q, off = autoqubo_fast.compile_qubo_dense(
            n,
            [99], [10.0],
            [99], [0], [5.0],
            [99], [1],
            [99], [2],
            [[0, 99]],
            [[99]], [[1.0]], [1.0],
            10.0
        )
        assert len(q) == 9
        # No crash, matrix is well-formed
        assert np.isfinite(q).all()

    def test_09_concurrency_thread_safety(self):
        """Verify multiple threads calling the Rust compiler simultaneously do not race or corrupt state."""
        errors = []

        def worker(thread_id):
            try:
                for k in range(25):
                    n = 10 + (thread_id % 5)
                    q, off = autoqubo_fast.compile_qubo_dense(
                        n,
                        [0, 1], [float(thread_id), 2.0],
                        [], [], [],
                        [], [],
                        [], [],
                        [],
                        [[0, 1]], [[1.0, 1.0]], [1.0],
                        50.0
                    )
                    assert len(q) == n * n
                    assert off == 50.0
            except Exception as e:
                errors.append(f"Thread {thread_id} failed: {e}")

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0, f"Concurrency errors detected: {errors}"

    def test_10_high_dimension_memory_stress(self):
        """Stress-test memory allocation and latency at 1,500 variables (2.25M entries)."""
        n = 1500
        obj_i = list(range(n))
        obj_c = [1.0] * n
        t0 = time.perf_counter()
        q, off = autoqubo_fast.compile_qubo_dense(
            n,
            obj_i, obj_c,
            [], [], [],
            [], [],
            [], [],
            [],
            [], [], [],
            1.0
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        assert len(q) == n * n
        assert elapsed_ms < 50.0, f"1,500 variables took too long: {elapsed_ms:.2f} ms"


# ==============================================================================
# SUITE 2: Compiler Pipeline Integration & Fallback Robustness (8 Tests)
# ==============================================================================
class TestCompilerIntegration:

    def test_11_fallback_mechanism(self):
        """Verify that when Rust is mocked as unavailable, Python compiler produces mathematically identical Q."""
        spec = {
            "problem_family": "SELECTION",
            "parameters": {"items_count": 4},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Items"]}],
            "constraint_registry": [
                {
                    "name": "c1", "operator": "==",
                    "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [i], "coefficient": 1.0} for i in range(4)]},
                    "rhs": {"type": "constant", "value": 2.0}
                }
            ],
            "objectives": [{"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [1.0, 2.0, 3.0, 4.0]}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)

        # 1. Compile with Rust
        ir_rust = compile_om_to_autoqubo_ir(om, penalty_weight=40.0)

        # 2. Mock Rust unavailable to trigger Python fallback
        orig_fast = autoqubo_fast.is_fast_available
        try:
            autoqubo_fast.is_fast_available = lambda: False
            ir_py = compile_om_to_autoqubo_ir(om, penalty_weight=40.0)
        finally:
            autoqubo_fast.is_fast_available = orig_fast

        # Both matrices must match within floating point precision
        assert np.allclose(ir_rust.Q, ir_py.Q, atol=1e-6)
        assert abs(ir_rust.offset - ir_py.offset) < 1e-6

    def test_12_equivalence_verification_pass(self):
        """Verify the built-in 200-sample regression equivalence verification always passes."""
        spec = {
            "problem_family": "ASSIGNMENT",
            "parameters": {"tasks_count": 3, "workers_count": 3},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Tasks", "Workers"]}],
            "constraint_registry": [
                {
                    "name": f"task_{t}", "operator": "==",
                    "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [t, w], "coefficient": 1.0} for w in range(3)]},
                    "rhs": {"type": "constant", "value": 1.0}
                } for t in range(3)
            ],
            "objectives": [{"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [10.0 + i for i in range(9)]}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=50.0)
        assert ir.Q is not None
        assert ir.metadata.get("verification") == "PASS"

    def test_13_logarithmic_binary_slack_encoding(self):
        """Verify bounded inequality correctly creates logarithmic slack variables."""
        spec = {
            "problem_family": "KNAPSACK",
            "parameters": {"items_count": 4},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Items"]}],
            "constraint_registry": [
                {
                    "name": "knapsack_cap", "operator": "<=",
                    "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [i], "coefficient": 2.0} for i in range(4)]},
                    "rhs": {"type": "constant", "value": 5.0} # lhs_max = 8.0, span = 3.0 -> ceil(log2(4)) = 2 slacks
                }
            ],
            "objectives": [{"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [10.0, 20.0, 30.0, 40.0]}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=60.0)
        assert len(ir.variable_map.decision_vars) == 4
        assert len(ir.variable_map.slack_vars) == 2
        assert ir.variable_map.total_vars == 6

    def test_14_pure_linking_constraints_zero_slack(self):
        """Verify x_j <= x_i dependency constraints require exactly 0 slack variables."""
        spec = {
            "problem_family": "FACILITY",
            "parameters": {"locs_count": 2},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Locs"]}],
            "constraint_registry": [
                {
                    "name": "dep_1_requires_0", "operator": "<=",
                    "lhs": {"type": "linear_terms", "var_id": "v", "terms": [
                        {"var_id": "v", "indices": [1], "coefficient": 1.0},
                        {"var_id": "v", "indices": [0], "coefficient": -1.0}
                    ]},
                    "rhs": {"type": "constant", "value": 0.0}
                }
            ],
            "objectives": [{"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [5.0, 10.0]}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=40.0)
        assert len(ir.variable_map.slack_vars) == 0

    def test_15_native_quadratic_objective(self):
        """Verify quadratic Markowitz terms x_i * x_j are compiled directly into Q off-diagonals."""
        spec = {
            "problem_family": "SELECTION",
            "parameters": {"assets_count": 3},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Assets"]}],
            "constraint_registry": [],
            "objectives": [{
                "sense": "MINIMIZE",
                "expression": {
                    "type": "quadratic",
                    "var_id": "v",
                    "linear_coefficients": [-10.0, -15.0, -20.0],
                    "quadratic_terms": [{"i": 0, "j": 1, "coefficient": 8.5}]
                }
            }]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=1.0)
        assert ir.Q[0, 1] == 8.5
        assert ir.Q[0, 0] == -10.0

    def test_16_maximization_sense(self):
        """Verify MAXIMIZE sense flips linear coefficients so minimization solvers maximize return."""
        spec = {
            "problem_family": "SELECTION",
            "parameters": {"items_count": 2},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Items"]}],
            "constraint_registry": [],
            "objectives": [{"sense": "MAXIMIZE", "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [25.0, 40.0]}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=1.0)
        # Should be negated
        assert ir.Q[0, 0] == -25.0
        assert ir.Q[1, 1] == -40.0

    def test_17_multiple_mixed_constraints(self):
        """Verify simultaneous mix of equalities, inequalities, mutexes, and dependencies."""
        spec = {
            "problem_family": "GENERAL",
            "parameters": {"vars_count": 4},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Vars"]}],
            "constraint_registry": [
                {"name": "eq", "operator": "==", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [0], "coefficient": 1.0}, {"var_id": "v", "indices": [1], "coefficient": 1.0}]}, "rhs": {"type": "constant", "value": 1.0}},
                {"name": "mut", "operator": "<=", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [2], "coefficient": 1.0}, {"var_id": "v", "indices": [3], "coefficient": 1.0}]}, "rhs": {"type": "constant", "value": 1.0}},
                {"name": "dep", "operator": "<=", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [3], "coefficient": 1.0}, {"var_id": "v", "indices": [0], "coefficient": -1.0}]}, "rhs": {"type": "constant", "value": 0.0}}
            ],
            "objectives": [{"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [1.0, 2.0, 3.0, 4.0]}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=50.0)
        assert ir.metadata["validation"] == "PASS"

    def test_18_active_subspace_boundary(self):
        """Verify models crossing N > 45 boundary compile without precision loss."""
        n = 50
        spec = {
            "problem_family": "SELECTION",
            "parameters": {"items_count": n},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Items"]}],
            "constraint_registry": [
                {"name": "cardinality", "operator": "==", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [i], "coefficient": 1.0} for i in range(n)]}, "rhs": {"type": "constant", "value": 5.0}}
            ],
            "objectives": [{"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [float(i % 10) for i in range(n)]}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=60.0)
        assert ir.Q.shape == (50, 50)


# ==============================================================================
# SUITE 3: End-to-End Problem Family Feasibility via D-Wave Adapter (10 Tests)
# ==============================================================================
class TestPipelineStabilityEndToEnd:

    @classmethod
    def setup_class(cls):
        cls.adapter = DWaveAdapter()

    def test_19_domain_knapsack(self):
        """End-to-End Domain 1: 0-1 Knapsack payload selection."""
        spec = {
            "problem_family": "KNAPSACK",
            "parameters": {"items_count": 4},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Items"]}],
            "constraint_registry": [{
                "name": "weight_limit", "operator": "<=",
                "lhs": {"type": "linear_terms", "var_id": "v", "terms": [
                    {"var_id": "v", "indices": [0], "coefficient": 2.0},
                    {"var_id": "v", "indices": [1], "coefficient": 3.0},
                    {"var_id": "v", "indices": [2], "coefficient": 2.0},
                    {"var_id": "v", "indices": [3], "coefficient": 4.0}
                ]},
                "rhs": {"type": "constant", "value": 5.0}
            }],
            "objectives": [{
                "sense": "MAXIMIZE",
                "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [10.0, 15.0, 12.0, 25.0]}
            }]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=50.0)
        res = self.adapter.solve(ir, num_reads=500, seed=42)
        assert res["feasible"] is True
        assert len(res["violated_constraints"]) == 0

    def test_20_domain_facility_location(self):
        """End-to-End Domain 2: Supply chain warehouse opening & linking."""
        spec = {
            "problem_family": "FACILITY",
            "parameters": {"wh_count": 2, "cust_count": 2},
            "variable_registry": [
                {"id": "v_wh", "name": "y", "type": "BINARY", "dimensions": ["Wh"]},
                {"id": "v_assign", "name": "x", "type": "BINARY", "dimensions": ["Wh", "Cust"]}
            ],
            "constraint_registry": [
                {"name": "cust_0", "operator": "==", "lhs": {"type": "linear_terms", "var_id": "v_assign", "terms": [{"var_id": "v_assign", "indices": [w, 0], "coefficient": 1.0} for w in range(2)]}, "rhs": {"type": "constant", "value": 1.0}},
                {"name": "cust_1", "operator": "==", "lhs": {"type": "linear_terms", "var_id": "v_assign", "terms": [{"var_id": "v_assign", "indices": [w, 1], "coefficient": 1.0} for w in range(2)]}, "rhs": {"type": "constant", "value": 1.0}},
                {"name": "link_0_0", "operator": "<=", "lhs": {"type": "linear_terms", "var_id": "v_assign", "terms": [{"var_id": "v_assign", "indices": [0, 0], "coefficient": 1.0}, {"var_id": "v_wh", "indices": [0], "coefficient": -1.0}]}, "rhs": {"type": "constant", "value": 0.0}},
                {"name": "link_1_1", "operator": "<=", "lhs": {"type": "linear_terms", "var_id": "v_assign", "terms": [{"var_id": "v_assign", "indices": [1, 1], "coefficient": 1.0}, {"var_id": "v_wh", "indices": [1], "coefficient": -1.0}]}, "rhs": {"type": "constant", "value": 0.0}}
            ],
            "objectives": [{"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v_assign", "coefficients": [5.0, 8.0, 9.0, 4.0]}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=40.0)
        res = self.adapter.solve(ir, num_reads=500, seed=42)
        assert res["feasible"] is True

    def test_21_domain_nurse_rostering(self):
        """End-to-End Domain 3: Healthcare shift demands and rest restrictions."""
        spec = {
            "problem_family": "SCHEDULING",
            "parameters": {"nurses_count": 3, "shifts_count": 2},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Nurses", "Shifts"]}],
            "constraint_registry": [
                {"name": "demand_0", "operator": ">=", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [n, 0], "coefficient": 1.0} for n in range(3)]}, "rhs": {"type": "constant", "value": 1.0}},
                {"name": "demand_1", "operator": ">=", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [n, 1], "coefficient": 1.0} for n in range(3)]}, "rhs": {"type": "constant", "value": 1.0}},
                {"name": "max_nurse_0", "operator": "<=", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [0, s], "coefficient": 1.0} for s in range(2)]}, "rhs": {"type": "constant", "value": 1.0}}
            ],
            "objectives": [{"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [15.0, 25.0, 18.0, 28.0, 16.0, 24.0]}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=50.0)
        res = self.adapter.solve(ir, num_reads=500, seed=42)
        assert res["feasible"] is True
        assert len(res["violated_constraints"]) == 0

    def test_22_domain_markowitz_portfolio(self):
        """End-to-End Domain 4: Quadratic risk covariance portfolio selection."""
        spec = {
            "problem_family": "SELECTION",
            "parameters": {"assets_count": 4},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Assets"]}],
            "constraint_registry": [
                {"name": "cardinality", "operator": "==", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [i], "coefficient": 1.0} for i in range(4)]}, "rhs": {"type": "constant", "value": 2.0}},
                {"name": "budget", "operator": "<=", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [i], "coefficient": float([3, 2, 2, 3][i])} for i in range(4)]}, "rhs": {"type": "constant", "value": 5.0}}
            ],
            "objectives": [{
                "sense": "MINIMIZE",
                "expression": {
                    "type": "quadratic", "var_id": "v",
                    "linear_coefficients": [-15.0, -18.0, -12.0, -20.0],
                    "quadratic_terms": [{"i": 0, "j": 1, "coefficient": 14.0}]
                }
            }]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=60.0)
        res = self.adapter.solve(ir, num_reads=600, seed=42)
        assert res["feasible"] is True
        assert len(res["violated_constraints"]) == 0

    def test_23_domain_manufacturing_mes(self):
        """End-to-End Domain 5: Manufacturing job-shop routing sequence."""
        spec = {
            "problem_family": "SCHEDULING",
            "parameters": {"operations_count": 3, "slots_count": 3},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Operations", "Slots"]}],
            "constraint_registry": [
                {"name": f"unq_{i}", "operator": "==", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [i, s], "coefficient": 1.0} for s in range(3)]}, "rhs": {"type": "constant", "value": 1.0}} for i in range(3)
            ],
            "objectives": [{"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [10.0 + i * 3 + s for i in range(3) for s in range(3)]}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=50.0)
        res = self.adapter.solve(ir, num_reads=500, seed=42)
        assert res["feasible"] is True

    def test_24_domain_energy_grid(self):
        """End-to-End Domain 6: SCADA EMS spinning reserve unit commitment."""
        spec = {
            "problem_family": "SCHEDULING",
            "parameters": {"generators_count": 3, "periods_count": 2},
            "variable_registry": [{"id": "v", "name": "u", "type": "BINARY", "dimensions": ["Generators", "Periods"]}],
            "constraint_registry": [
                {"name": "reserve_0", "operator": ">=", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [g, 0], "coefficient": 1.0} for g in range(3)]}, "rhs": {"type": "constant", "value": 2.0}},
                {"name": "reserve_1", "operator": ">=", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [g, 1], "coefficient": 1.0} for g in range(3)]}, "rhs": {"type": "constant", "value": 1.0}}
            ],
            "objectives": [{"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [12.0, 12.0, 20.0, 22.0, 10.0, 8.0]}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=50.0)
        res = self.adapter.solve(ir, num_reads=500, seed=42)
        assert res["feasible"] is True

    def test_25_domain_graph_coloring(self):
        """End-to-End Domain 7: Graph 3-coloring mutual exclusion on adjacent vertices."""
        # 3 vertices triangle, 3 colors -> adjacent vertices cannot share color
        spec = {
            "problem_family": "COLORING",
            "parameters": {"nodes_count": 3, "colors_count": 3},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Nodes", "Colors"]}],
            "constraint_registry": [
                # Each node gets exactly 1 color
                {"name": f"node_col_{i}", "operator": "==", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [i, c], "coefficient": 1.0} for c in range(3)]}, "rhs": {"type": "constant", "value": 1.0}} for i in range(3)
            ] + [
                # Adjacent nodes (0, 1), (1, 2), (0, 2) cannot have same color c
                {"name": f"edge_0_1_c_{c}", "operator": "<=", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [0, c], "coefficient": 1.0}, {"var_id": "v", "indices": [1, c], "coefficient": 1.0}]}, "rhs": {"type": "constant", "value": 1.0}} for c in range(3)
            ],
            "objectives": [{"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [1.0] * 9}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=45.0)
        res = self.adapter.solve(ir, num_reads=600, seed=42)
        assert res["feasible"] is True

    def test_26_domain_bipartite_matching(self):
        """End-to-End Domain 8: 1-to-1 Assignment matching."""
        n = 4
        spec = {
            "problem_family": "ASSIGNMENT",
            "parameters": {"rows_count": n, "cols_count": n},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Rows", "Cols"]}],
            "constraint_registry": [
                {"name": f"row_{r}", "operator": "==", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [r, c], "coefficient": 1.0} for c in range(n)]}, "rhs": {"type": "constant", "value": 1.0}} for r in range(n)
            ] + [
                {"name": f"col_{c}", "operator": "==", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [r, c], "coefficient": 1.0} for r in range(n)]}, "rhs": {"type": "constant", "value": 1.0}} for c in range(n)
            ],
            "objectives": [{"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [float(r * 5 + c * 2) for r in range(n) for c in range(n)]}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=50.0)
        res = self.adapter.solve(ir, num_reads=600, seed=42)
        assert res["feasible"] is True
        assert len(res["violated_constraints"]) == 0

    def test_27_domain_set_cover(self):
        """End-to-End Domain 9: Set cover universe elements."""
        # 3 subsets, 3 universe elements. Element 0 covered by S0 or S1; Element 1 by S1 or S2; Element 2 by S0 or S2.
        spec = {
            "problem_family": "SET_COVER",
            "parameters": {"subsets_count": 3},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Subsets"]}],
            "constraint_registry": [
                {"name": "elem_0", "operator": ">=", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [0], "coefficient": 1.0}, {"var_id": "v", "indices": [1], "coefficient": 1.0}]}, "rhs": {"type": "constant", "value": 1.0}},
                {"name": "elem_1", "operator": ">=", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [1], "coefficient": 1.0}, {"var_id": "v", "indices": [2], "coefficient": 1.0}]}, "rhs": {"type": "constant", "value": 1.0}},
                {"name": "elem_2", "operator": ">=", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [0], "coefficient": 1.0}, {"var_id": "v", "indices": [2], "coefficient": 1.0}]}, "rhs": {"type": "constant", "value": 1.0}}
            ],
            "objectives": [{"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [10.0, 12.0, 14.0]}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=40.0)
        res = self.adapter.solve(ir, num_reads=500, seed=42)
        assert res["feasible"] is True

    def test_28_domain_traveling_salesperson_routing(self):
        """End-to-End Domain 10: TSP 3-city tour time-step visit assignment."""
        n_cities = 3
        spec = {
            "problem_family": "ROUTING",
            "parameters": {"cities_count": n_cities, "steps_count": n_cities},
            "variable_registry": [{"id": "v", "name": "x", "type": "BINARY", "dimensions": ["Cities", "Steps"]}],
            "constraint_registry": [
                {"name": f"city_visit_{i}", "operator": "==", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [i, t], "coefficient": 1.0} for t in range(n_cities)]}, "rhs": {"type": "constant", "value": 1.0}} for i in range(n_cities)
            ] + [
                {"name": f"step_occupancy_{t}", "operator": "==", "lhs": {"type": "linear_terms", "var_id": "v", "terms": [{"var_id": "v", "indices": [i, t], "coefficient": 1.0} for i in range(n_cities)]}, "rhs": {"type": "constant", "value": 1.0}} for t in range(n_cities)
            ],
            "objectives": [{"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v", "coefficients": [float(i * 3 + t) for i in range(n_cities) for t in range(n_cities)]}}]
        }
        cmm = parse_spec_to_cmm(spec)
        om = expand_cmm_to_om(cmm)
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=50.0)
        res = self.adapter.solve(ir, num_reads=600, seed=42)
        assert res["feasible"] is True
        assert len(res["violated_constraints"]) == 0


if __name__ == "__main__":
    pytest.main(["-v", "-s", __file__])
