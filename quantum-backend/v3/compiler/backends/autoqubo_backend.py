# -*- coding: utf-8 -*-
"""
AutoQUBO Backend — Bit2Qubit Compiler V9 (Fujitsu Research Integration)
========================================================================
Converts an OptimizationModel into a QUBO matrix via Fujitsu Research's
`autoqubo` package, which uses a data-driven sampling method to derive
the Q coefficients automatically from Python objective and penalty functions.

This enables routing to:
  - Fujitsu Digital Annealer (CMOS-based quantum-inspired hardware)
  - Any QUBO-compatible solver via the resulting Q matrix

Install:  pip install autoqubo

Reference: https://github.com/FujitsuResearch/autoqubo

Pipeline:
    OptimizationModel
        → Extract flat binary variable list
        → Build objective_fn(x) from ExpandedObjective
        → Build constraint_fns from ExpandedConstraints (as penalty functions)
        → autoqubo.Solver.generate_qubo(objective_fn, constraint_fns, n_vars)
        → Returns Q matrix + summary
"""

from __future__ import annotations
from typing import TYPE_CHECKING, Dict, Any, List, Callable, Optional

if TYPE_CHECKING:
    from ..expander import OptimizationModel


# ── AutoQUBO Integration ───────────────────────────────────────────────────────

def compile_om_to_autoqubo(
    om: "OptimizationModel",
    penalty_weight: float = 10.0,
) -> Dict[str, Any]:
    """
    Convert an OptimizationModel to QUBO using Fujitsu's autoqubo package.

    Args:
        om:             The compiled OptimizationModel from the CMM expander.
        penalty_weight: Lagrange multiplier for constraint penalties.

    Returns:
        {
          "Q_matrix":        dict of {(i, j): coefficient},
          "n_vars":          int,
          "variable_map":    list of variable names (index → name),
          "qubo_code":       str — runnable Python code,
          "solver":          "AutoQUBO",
          "available":       bool,
          "error":           str or None,
        }
    """
    var_names = list(om.variables.keys())
    n = len(var_names)

    # ── Check autoqubo availability ────────────────────────────────────────────
    try:
        from autoqubo import SamplingCompiler
        _autoqubo_available = True
    except ImportError:
        _autoqubo_available = False

    if not _autoqubo_available:
        # Graceful degradation — generate the code and explain why we cannot run it
        qubo_code = generate_autoqubo_code(om, penalty_weight)
        return {
            "Q_matrix":     None,
            "n_vars":       n,
            "variable_map": var_names,
            "qubo_code":    qubo_code,
            "solver":       "AutoQUBO",
            "available":    False,
            "error":        "autoqubo not installed. Run: pip install autoqubo",
        }

    # ── Build objective function ───────────────────────────────────────────────
    objective_fn = _build_objective_fn(om)

    # ── Build constraint penalty functions ─────────────────────────────────────
    constraint_fns = _build_constraint_fns(om, var_names)

    # ── Run autoqubo ───────────────────────────────────────────────────────────
    try:
        # Combine all constraint penalties into a single function (SamplingCompiler API)
        if constraint_fns:
            def combined_constraints(x):
                return sum(fn(x) for fn in constraint_fns)
        else:
            def combined_constraints(x):
                return 0

        Q, offset = SamplingCompiler.generate_qubo(
            objective_fn,
            combined_constraints,
            n,
            penalty_weight=penalty_weight,
        )
        qubo_code = generate_autoqubo_code(om, penalty_weight)
        return {
            "Q_matrix":     Q,
            "n_vars":       n,
            "variable_map": var_names,
            "qubo_code":    qubo_code,
            "solver":       "AutoQUBO",
            "available":    True,
            "error":        None,
        }
    except Exception as e:
        qubo_code = generate_autoqubo_code(om, penalty_weight)
        return {
            "Q_matrix":     None,
            "n_vars":       n,
            "variable_map": var_names,
            "qubo_code":    qubo_code,
            "solver":       "AutoQUBO",
            "available":    True,
            "error":        str(e),
        }


def generate_autoqubo_code(om: "OptimizationModel", penalty_weight: float = 10.0) -> str:
    """
    Generate a self-contained Python script that uses autoqubo to derive
    the QUBO matrix from the OptimizationModel's functions.

    This code is human-readable and can be run independently.
    """
    var_names = list(om.variables.keys())
    n = len(var_names)

    # Build objective terms as (coefficient, flat_index) pairs
    obj_expr = om.objective.expression or "0"
    obj_sense = om.objective.sense.upper()

    # Parse constraint expressions into penalty-friendly form
    constraint_blocks = []
    for c in om.constraints:
        left_str = c.left
        right_val = float(c.right)
        op = c.op
        if op == "<=":
            penalty_expr = f"max(0, ({left_str}) - {right_val})"
        elif op == ">=":
            penalty_expr = f"max(0, {right_val} - ({left_str}))"
        else:  # ==
            penalty_expr = f"(({left_str}) - {right_val})"
        constraint_blocks.append((c.name, penalty_expr))

    lines = [
        "# ── Bit2Qubit: AutoQUBO Backend (Fujitsu Research) ───────────────────────",
        "# Install: pip install autoqubo",
        "# Reference: https://github.com/FujitsuResearch/autoqubo",
        "",
        "from autoqubo import SamplingCompiler",
        "import numpy as np",
        "",
        f"# Variable mapping: index → name",
        f"variable_map = {var_names}",
        f"n_vars = {n}",
        "",
        "# ── Objective Function ────────────────────────────────────────────────────",
    ]

    # Build objective function body
    # Map var names to x[i] indices
    var_to_idx = {name: i for i, name in enumerate(var_names)}
    safe_obj = obj_expr
    for name, idx in sorted(var_to_idx.items(), key=lambda kv: -len(kv[0])):
        safe_obj = safe_obj.replace(name, f"x[{idx}]")

    sign_comment = "# AutoQUBO minimizes — negate for MAXIMIZE" if obj_sense == "MAXIMIZE" else ""
    sign_prefix = "-1 * " if obj_sense == "MAXIMIZE" else ""
    lines.extend([
        f"def objective_fn(x):  {sign_comment}",
        f"    return {sign_prefix}({safe_obj})",
        "",
        "# ── Constraint Penalty Functions ─────────────────────────────────────────",
        "constraint_fns = []",
        "",
    ])

    for c_name, penalty_expr in constraint_blocks:
        safe_penalty = penalty_expr
        for name, idx in sorted(var_to_idx.items(), key=lambda kv: -len(kv[0])):
            safe_penalty = safe_penalty.replace(name, f"x[{idx}]")
        lines.extend([
            f"def constraint_{c_name}(x):",
            f"    return ({safe_penalty}) ** 2  # {c_name}",
            f"constraint_fns.append(constraint_{c_name})",
            "",
        ])

    lines.extend([
        "# ── Generate QUBO Matrix ─────────────────────────────────────────────────",
        f"Q, offset = SamplingCompiler.generate_qubo(",
        f"    objective_fn,",
        f"    constraint_fns,",
        f"    n_vars,",
        f"    penalty={penalty_weight},",
        f")",
        "",
        "print(f'AutoQUBO: Q matrix has {{len(Q)}} entries for {{n_vars}} variables')",
        "print(f'Offset: {{offset}}')",
        "",
        "# ── Optional: Run via SimulatedAnnealingSampler ───────────────────────────",
        "# from dwave.samplers import SimulatedAnnealingSampler",
        "# import dimod",
        "# bqm = dimod.BinaryQuadraticModel.from_qubo(Q)",
        "# sampler = SimulatedAnnealingSampler()",
        "# sampleset = sampler.sample(bqm, num_reads=1000)",
        "# print(f'Best solution: {sampleset.first.sample}')",
    ])

    return "\n".join(lines)


def _build_objective_fn(om: "OptimizationModel") -> Callable:
    """Build a callable objective function from ExpandedObjective for autoqubo."""
    var_names = list(om.variables.keys())
    var_to_idx = {name: i for i, name in enumerate(var_names)}
    obj_expr = om.objective.expression or "0"
    sense = om.objective.sense.upper()

    # Replace variable names with x[i] references
    safe_obj = obj_expr
    for name, idx in sorted(var_to_idx.items(), key=lambda kv: -len(kv[0])):
        safe_obj = safe_obj.replace(name, f"x[{idx}]")

    sign = -1 if sense == "MAXIMIZE" else 1
    fn_body = f"lambda x: {sign} * ({safe_obj})"
    try:
        return eval(fn_body)
    except Exception:
        return lambda x: 0.0


def _build_constraint_fns(om: "OptimizationModel", var_names: List[str]) -> List[Callable]:
    """Build a list of penalty functions from ExpandedConstraints for autoqubo."""
    var_to_idx = {name: i for i, name in enumerate(var_names)}
    fns = []

    for c in om.constraints:
        left_str = c.left
        right_val = float(c.right)
        op = c.op

        safe_left = left_str
        for name, idx in sorted(var_to_idx.items(), key=lambda kv: -len(kv[0])):
            safe_left = safe_left.replace(name, f"x[{idx}]")

        if op == "<=":
            penalty_expr = f"max(0, ({safe_left}) - {right_val}) ** 2"
        elif op == ">=":
            penalty_expr = f"max(0, {right_val} - ({safe_left})) ** 2"
        else:
            penalty_expr = f"(({safe_left}) - {right_val}) ** 2"

        try:
            fn = eval(f"lambda x: {penalty_expr}")
            fns.append(fn)
        except Exception:
            fns.append(lambda x: 0.0)

    return fns
