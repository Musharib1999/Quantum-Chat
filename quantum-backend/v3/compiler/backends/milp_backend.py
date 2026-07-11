# -*- coding: utf-8 -*-
"""
MILP Backend — Bit2Qubit Compiler V9
======================================
Converts an OptimizationModel into a Mixed-Integer Linear Program (MILP)
using PuLP. The resulting model can be solved by:
  - CBC (open-source, bundled with PuLP)
  - Gurobi / CPLEX / GLPK (via PuLP solver interface)

Install:  pip install pulp

Pipeline:
    OptimizationModel
        → PuLP LpProblem (variables, objective, constraints)
        → Solve with CBC (or user-selected solver)
        → Return solution + Python code string
"""

from __future__ import annotations
from typing import TYPE_CHECKING, Dict, Any, Optional

if TYPE_CHECKING:
    from ..expander import OptimizationModel


def compile_om_to_milp_code(om: "OptimizationModel") -> str:
    """
    Return Python source code (as a string) that, when executed, builds a PuLP
    MILP model, solves it with CBC, and prints the optimal solution.

    This is the string stored in workspace.generated_code for the MILP path.
    """
    lines = [
        "import pulp",
        "",
        "# ── Bit2Qubit MILP Backend (V9) ──────────────────────────────────────────",
        f"sense = pulp.{'LpMaximize' if om.objective.sense.upper() == 'MAXIMIZE' else 'LpMinimize'}",
        "prob = pulp.LpProblem('QuantumGuru_MILP', sense)",
        "",
        "# ── Decision Variables ────────────────────────────────────────────────────",
    ]

    var_decls = []
    for name, var in om.variables.items():
        if var.var_type == "BINARY":
            lines.append(f"{name} = pulp.LpVariable('{name}', cat='Binary')")
        elif var.var_type == "INTEGER":
            lb = int(var.lower_bound) if var.lower_bound is not None else 0
            ub = int(var.upper_bound) if var.upper_bound is not None else None
            ub_str = f", upBound={ub}" if ub is not None else ""
            lines.append(
                f"{name} = pulp.LpVariable('{name}', lowBound={lb}{ub_str}, cat='Integer')"
            )
        else:
            lb = var.lower_bound if var.lower_bound is not None else 0.0
            ub = var.upper_bound
            ub_str = f", upBound={ub}" if ub is not None else ""
            lines.append(
                f"{name} = pulp.LpVariable('{name}', lowBound={lb}{ub_str}, cat='Continuous')"
            )
        var_decls.append(name)
    lines.append("")

    lines.append("# ── Objective ────────────────────────────────────────────────────────────")
    obj_expr = om.objective.expression
    lines.append(f"prob += {obj_expr}  # {om.objective.sense.lower()} objective")
    lines.append("")

    lines.append("# ── Constraints ──────────────────────────────────────────────────────────")
    for c in om.constraints:
        lines.append(f"prob += ({c.left} {c.op} {c.right}), '{c.name}'")
    lines.append("")

    lines.extend([
        "# ── Solve ────────────────────────────────────────────────────────────────",
        "solver = pulp.PULP_CBC_CMD(msg=0)",
        "status = prob.solve(solver)",
        "print(f'MILP Status: {pulp.LpStatus[status]}')",
        "print(f'Objective Value: {pulp.value(prob.objective):.4f}')",
        "print('Variable assignments:')",
        "for var in prob.variables():",
        "    if var.varValue and var.varValue > 0.5:",
        "        print(f'  {var.name} = {var.varValue}')",
    ])

    return "\n".join(lines)


def compile_om_to_milp_result(om: "OptimizationModel") -> Dict[str, Any]:
    """
    Actually build and solve the MILP using PuLP, returning a structured result.

    Returns:
        {
          "status":         str (e.g. "Optimal"),
          "objective":      float,
          "assignments":    dict of {var_name: value},
          "milp_code":      str,
          "solver":         "MILP",
          "available":      bool,
          "error":          str or None,
        }
    """
    milp_code = compile_om_to_milp_code(om)

    try:
        import pulp
    except ImportError:
        return {
            "status":      "NotRun",
            "objective":   None,
            "assignments": {},
            "milp_code":   milp_code,
            "solver":      "MILP",
            "available":   False,
            "error":       "pulp not installed. Run: pip install pulp",
        }

    try:
        sense = pulp.LpMaximize if om.objective.sense.upper() == "MAXIMIZE" else pulp.LpMinimize
        prob = pulp.LpProblem("QuantumGuru_MILP", sense)

        # Build PuLP variables
        pulp_vars: Dict[str, Any] = {}
        for name, var in om.variables.items():
            if var.var_type == "BINARY":
                pulp_vars[name] = pulp.LpVariable(name, cat="Binary")
            elif var.var_type == "INTEGER":
                lb = int(var.lower_bound) if var.lower_bound is not None else 0
                ub = int(var.upper_bound) if var.upper_bound is not None else None
                pulp_vars[name] = pulp.LpVariable(name, lowBound=lb, upBound=ub, cat="Integer")
            else:
                lb = float(var.lower_bound) if var.lower_bound is not None else 0.0
                ub = var.upper_bound
                pulp_vars[name] = pulp.LpVariable(name, lowBound=lb, upBound=ub, cat="Continuous")

        # Objective
        obj_str = om.objective.expression
        obj_expr = eval(obj_str, {}, pulp_vars)
        prob += obj_expr

        # Constraints
        for c in om.constraints:
            lhs = eval(c.left, {}, pulp_vars)
            rhs = float(c.right)
            if c.op == "<=":
                prob += (lhs <= rhs), c.name
            elif c.op == ">=":
                prob += (lhs >= rhs), c.name
            else:
                prob += (lhs == rhs), c.name

        # Solve silently
        solver = pulp.PULP_CBC_CMD(msg=0)
        status_code = prob.solve(solver)

        assignments = {
            v.name: v.varValue
            for v in prob.variables()
            if v.varValue is not None and abs(v.varValue) > 1e-6
        }

        return {
            "status":      pulp.LpStatus[status_code],
            "objective":   pulp.value(prob.objective),
            "assignments": assignments,
            "milp_code":   milp_code,
            "solver":      "MILP",
            "available":   True,
            "error":       None,
        }

    except Exception as e:
        return {
            "status":      "Error",
            "objective":   None,
            "assignments": {},
            "milp_code":   milp_code,
            "solver":      "MILP",
            "available":   True,
            "error":       str(e),
        }
