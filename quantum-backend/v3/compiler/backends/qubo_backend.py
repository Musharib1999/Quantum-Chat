# -*- coding: utf-8 -*-
"""
QUBO Backend — Bit2Qubit Compiler V9
=====================================
Converts a compiled OptimizationModel into native QUBO (Q-matrix) format
using dimod's CQM→BQM conversion. The output Q matrix can be routed to:
  - D-Wave Simulated Annealing Sampler (local)
  - D-Wave Advantage QPU (cloud, via dwave-ocean)
  - Any QUBO-compatible annealing solver

Pipeline:
    OptimizationModel
        → (this module) build dimod CQM
        → dimod.cqm_to_bqm  (penalises constraints via Lagrange multipliers)
        → BQM.to_qubo()     (extracts Q matrix + offset)
        → Returns rich result dict
"""

from __future__ import annotations
from typing import TYPE_CHECKING, Dict, Any

if TYPE_CHECKING:
    from ..expander import OptimizationModel


def compile_om_to_qubo_result(om: "OptimizationModel", lagrange: float = 10.0) -> Dict[str, Any]:
    """
    Convert an OptimizationModel to a QUBO result dict.

    Returns:
        {
          "Q_matrix":     dict of {(var_i, var_j): coefficient},
          "offset":       float,
          "variable_map": list of variable name strings,
          "n_qubits":     int,
          "sampler_code": str,   # ready-to-run Python code for SimulatedAnnealing
          "solver":       "QUBO",
        }
    """
    import dimod

    # ── 1. Build CQM from OM ───────────────────────────────────────────────────
    cqm = dimod.ConstrainedQuadraticModel()
    var_objects: Dict[str, Any] = {}

    for name, var in om.variables.items():
        if var.var_type == "BINARY":
            dv = dimod.Binary(name)
        elif var.var_type == "INTEGER":
            lb = int(var.lower_bound) if var.lower_bound is not None else 0
            ub = int(var.upper_bound) if var.upper_bound is not None else 1000
            dv = dimod.Integer(name, lower_bound=lb, upper_bound=ub)
        else:
            lb = float(var.lower_bound) if var.lower_bound is not None else 0.0
            ub = float(var.upper_bound) if var.upper_bound is not None else 1000.0
            dv = dimod.Real(name, lower_bound=lb, upper_bound=ub)
        var_objects[name] = dv

    # Build objective expression
    try:
        obj_expr = _eval_str_expr(om.objective.expression, var_objects)
        if om.objective.sense.upper() == "MAXIMIZE":
            cqm.set_objective(-obj_expr)
        else:
            cqm.set_objective(obj_expr)
    except Exception as e:
        print(f"[QUBO Backend] Objective build warning: {e} — using zero objective.")

    for c in om.constraints:
        try:
            lhs_expr = _eval_str_expr(c.left, var_objects)
            rhs_val = float(c.right)
            op = c.op
            if op == "<=":
                cqm.add_constraint(lhs_expr <= rhs_val, label=c.name)
            elif op == ">=":
                cqm.add_constraint(lhs_expr >= rhs_val, label=c.name)
            elif op == "==":
                cqm.add_constraint(lhs_expr == rhs_val, label=c.name)
        except Exception as e:
            print(f"[QUBO Backend] Constraint '{c.name}' build warning: {e} — skipping.")

    # ── 2. CQM → BQM via Lagrange penalty ─────────────────────────────────────
    bqm, invert = dimod.cqm_to_bqm(cqm, lagrange=lagrange)

    # ── 3. Extract Q matrix ────────────────────────────────────────────────────
    Q, offset = bqm.to_qubo()
    variable_map = list(bqm.variables)

    # ── 4. Generate ready-to-run sampler code ──────────────────────────────────
    sampler_code = _generate_sampler_code(variable_map, Q, offset, om.objective.sense)

    return {
        "Q_matrix":     Q,
        "offset":       offset,
        "variable_map": variable_map,
        "n_qubits":     len(variable_map),
        "sampler_code": sampler_code,
        "solver":       "QUBO",
    }


def compile_om_to_qubo_code(om: "OptimizationModel", lagrange: float = 10.0) -> str:
    """
    Return Python source code (as a string) that, when executed, builds the CQM,
    converts to QUBO, and runs SimulatedAnnealingSampler. 
    This is the string that gets stored in workspace.generated_code.
    """
    lines = [
        "import dimod",
        "import numpy as np",
        "from dwave.samplers import SimulatedAnnealingSampler",
        "",
        "# ── Bit2Qubit QUBO Backend (V9) ──────────────────────────────────────────",
        f"# Lagrange penalty multiplier: {lagrange}",
        "",
        "cqm = dimod.ConstrainedQuadraticModel()",
        "",
    ]

    for name, var in om.variables.items():
        if var.var_type == "BINARY":
            lines.append(f"{name} = dimod.Binary('{name}')")
        elif var.var_type == "INTEGER":
            lb = int(var.lower_bound) if var.lower_bound is not None else 0
            ub = int(var.upper_bound) if var.upper_bound is not None else 1000
            lines.append(f"{name} = dimod.Integer('{name}', lower_bound={lb}, upper_bound={ub})")
        else:
            lb = float(var.lower_bound) if var.lower_bound is not None else 0.0
            ub = float(var.upper_bound) if var.upper_bound is not None else 1000.0
            lines.append(f"{name} = dimod.Real('{name}', lower_bound={lb}, upper_bound={ub})")
    lines.append("")

    for c in om.constraints:
        lines.append(f"cqm.add_constraint({c.left} {c.op} {c.right}, label='{c.name}')")
    lines.append("")

    obj_expr = om.objective.expression
    if om.objective.sense.upper() == "MAXIMIZE":
        lines.append(f"cqm.set_objective(-({obj_expr}))  # negate for maximize")
    else:
        lines.append(f"cqm.set_objective({obj_expr})")
    lines.append("")

    lines.extend([
        "# ── CQM → BQM → QUBO Conversion ─────────────────────────────────────────",
        f"bqm, invert = dimod.cqm_to_bqm(cqm, lagrange={lagrange})",
        "Q, offset = bqm.to_qubo()",
        "print(f'QUBO matrix: {len(Q)} entries, {len(bqm.variables)} qubits')",
        "",
        "# ── Simulated Annealing Execution ────────────────────────────────────────",
        "sampler = SimulatedAnnealingSampler()",
        "sampleset = sampler.sample_qubo(Q, num_reads=1000)",
        "best = sampleset.first",
        "decoded = invert(dict(best.sample))",
        "print(f'Best energy: {best.energy + offset:.4f}')",
        "print(f'Best solution: {decoded}')",
    ])

    return "\n".join(lines)


def _eval_str_expr(expr_str: str, var_objects: dict):
    """Safely evaluate a stringified expression using the variable object dict."""
    try:
        return eval(expr_str, {"__builtins__": {}}, var_objects)
    except Exception:
        return eval(expr_str, {}, var_objects)


def _generate_sampler_code(variable_map: list, Q: dict, offset: float, sense: str) -> str:
    """Generate a minimal runnable sampler script from a Q matrix."""
    lines = [
        "from dwave.samplers import SimulatedAnnealingSampler",
        "",
        f"Q = {dict(Q)}",
        f"offset = {offset}",
        "",
        "sampler = SimulatedAnnealingSampler()",
        "sampleset = sampler.sample_qubo(Q, num_reads=1000)",
        "best = sampleset.first",
        f"print(f'Best energy ({sense}): {{best.energy + offset:.4f}}')",
        f"print(f'Best assignment: {{dict(best.sample)}}')",
    ]
    return "\n".join(lines)
