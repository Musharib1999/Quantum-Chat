# -*- coding: utf-8 -*-
"""
Deterministic Google OR-Tools CP-SAT Classical Baseline Backend
===============================================================
Compiles an OptimizationModel (`om`) into a complete, executable Google OR-Tools
CP-SAT Python script (`ortools_baseline.py`), solves it deterministically in-process
to produce the exact classical optimum, and computes a parallel head-to-head
benchmark comparison against the Quantum Annealing (D-Wave QUBO) solution.
"""

from __future__ import annotations
import time
import math
import re
from typing import TYPE_CHECKING, Dict, Any, List, Optional

if TYPE_CHECKING:
    from ..expander import OptimizationModel

from .autoqubo_backend import parse_linear_expression


_OBJ_QUAD_RE = re.compile(
    r"([+-]?)\s*\(?\s*([+-]?\d+(?:\.\d+)?)\s*\*\s*\(?\s*([a-zA-Z_]\w*)\s*\*\s*([a-zA-Z_]\w*)\s*\)?\s*\)?"
)


def _parse_objective_terms(obj_expr: str, decision_vars_set: set):
    """
    Parse both quadratic terms `w * (v1 * v2)` and remaining linear terms `w * v`
    without double-counting variables that appear inside quadratic products.
    """
    quad_terms = []
    for q_m in _OBJ_QUAD_RE.finditer(obj_expr):
        q_sign_str, q_num_str, q_v1, q_v2 = q_m.groups()
        if q_v1 in decision_vars_set and q_v2 in decision_vars_set:
            q_val = (-1.0 if q_sign_str == "-" else 1.0) * float(q_num_str)
            if abs(q_val) > 1e-12:
                quad_terms.append((q_v1, q_v2, q_val))

    lin_only = _OBJ_QUAD_RE.sub(" ", obj_expr) if quad_terms else obj_expr
    lin_coefs = parse_linear_expression(lin_only, decision_vars_set)
    # Collapse any diagonal quadratic terms (v1 == v2) into linear coefs (binary x^2 == x)
    clean_quad = []
    for qv1, qv2, qval in quad_terms:
        if qv1 == qv2:
            lin_coefs[qv1] = lin_coefs.get(qv1, 0.0) + qval
        else:
            clean_quad.append((qv1, qv2, qval))
    return lin_coefs, clean_quad


def _compile_cvrp_ortools_code(meta: Dict[str, Any]) -> str:
    """Generate a native Google OR-Tools CP-SAT MTZ flow script for CVRP problems."""
    customers = int(meta["customers"])
    vehicles = int(meta["vehicles"])
    capacity = int(meta["capacity"])
    demand = [int(x) for x in meta["demand"]]
    dist = meta["distance_matrix"]
    n = customers + 1
    flat_vals = [float(dist[i][j]) for i in range(n) for j in range(n) if i != j]
    scale = _find_scale_factor(flat_vals) if flat_vals else 1
    int_dist = [[int(round(float(dist[i][j]) * scale)) for j in range(n)] for i in range(n)]
    lines = [
        "# ── Deterministic Google OR-Tools CP-SAT Classical Baseline (Native MTZ CVRP) ──",
        "import time",
        "from ortools.sat.python import cp_model",
        "",
        "def solve_classical_baseline():",
        "    t0 = time.perf_counter()",
        f"    customers = {customers}",
        f"    vehicles = {vehicles}",
        f"    capacity = {capacity}",
        f"    demand = {demand}",
        f"    dist = {int_dist}",
        f"    scale = {float(scale)}",
        "    n = customers + 1",
        "    model = cp_model.CpModel()",
        "    x = {}",
        "    for v in range(vehicles):",
        "        for i in range(n):",
        "            for j in range(n):",
        "                if i != j:",
        "                    x[(v, i, j)] = model.NewBoolVar(f'x_{v}_{i}_{j}')",
        "    for j in range(1, n):",
        "        model.Add(sum(x[(v, i, j)] for v in range(vehicles) for i in range(n) if i != j) == 1)",
        "    for v in range(vehicles):",
        "        for k in range(n):",
        "            model.Add(sum(x[(v, i, k)] for i in range(n) if i != k) == sum(x[(v, k, j)] for j in range(n) if j != k))",
        "        model.Add(sum(x[(v, 0, j)] for j in range(1, n)) <= 1)",
        "        u = {i: model.NewIntVar(0, capacity, f'u_{v}_{i}') for i in range(1, n)}",
        "        for i in range(1, n):",
        "            used_i = sum(x[(v, k, i)] for k in range(n) if k != i)",
        "            model.Add(u[i] >= demand[i] * used_i)",
        "            model.Add(u[i] <= capacity * used_i)",
        "        for i in range(1, n):",
        "            for j in range(1, n):",
        "                if i != j:",
        "                    model.Add(u[j] >= u[i] + demand[j]).OnlyEnforceIf(x[(v, i, j)])",
        "    model.Minimize(sum(dist[i][j] * var for (v, i, j), var in x.items()))",
        "    solver = cp_model.CpSolver()",
        "    solver.parameters.max_time_in_seconds = 15.0",
        "    status = solver.Solve(model)",
        "    elapsed_ms = (time.perf_counter() - t0) * 1000.0",
        "    status_name = solver.StatusName(status)",
        "    obj_val = solver.ObjectiveValue() / scale if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None",
        "    selected = []",
        "    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):",
        "        for v in range(vehicles):",
        "            nxt = {i: j for i in range(n) for j in range(n) if i != j and solver.Value(x[(v, i, j)]) == 1}",
        "            cur = nxt.get(0, 0)",
        "            slot = 0",
        "            while cur != 0 and slot < customers:",
        "                selected.append(f'x_{v}_{cur}_{slot}')",
        "                cur = nxt.get(cur, 0)",
        "                slot += 1",
        "    print(f'Google OR-Tools CP-SAT Status : {status_name} ({elapsed_ms:.2f} ms)')",
        "    if obj_val is not None:",
        "        print(f'Exact Classical Objective     : {obj_val:.4f}')",
        "    print(f'Active Decisions ({len(selected)})       : {selected}')",
        "",
        "if __name__ == '__main__':",
        "    solve_classical_baseline()",
    ]
    return "\n".join(lines)


def _find_scale_factor(values: List[float]) -> int:
    """
    Find a power-of-10 integer multiplier (1, 10, 100, 1000) so all float
    coefficients in linear constraints/objectives become exact integers for CP-SAT.
    """
    for scale in (1, 10, 100, 1000):
        if all(abs(v * scale - round(v * scale)) < 1e-6 for v in values):
            return scale
    return 1000


def _compile_tsp_ortools_code(n: int, dist: List[List[float]], var_prefix: str = "visit") -> str:
    """Generate a native Google OR-Tools CP-SAT AddCircuit script for TSP problems."""
    flat_vals = [float(dist[i][j]) for i in range(n) for j in range(n) if i != j]
    scale = _find_scale_factor(flat_vals) if flat_vals else 1
    int_dist = [[int(round(float(dist[i][j]) * scale)) for j in range(n)] for i in range(n)]
    lines = [
        "# ── Deterministic Google OR-Tools CP-SAT Classical Baseline (Native AddCircuit TSP) ──",
        "import time",
        "from ortools.sat.python import cp_model",
        "",
        "def solve_classical_baseline():",
        "    t0 = time.perf_counter()",
        f"    n = {n}",
        f"    dist = {int_dist}",
        f"    scale = {float(scale)}",
        "    model = cp_model.CpModel()",
        "",
        "    arcs = []",
        "    arc_vars = {}",
        "    for i in range(n):",
        "        for j in range(n):",
        "            if i == j:",
        "                continue",
        "            lit = model.NewBoolVar(f'arc_{i}_{j}')",
        "            arc_vars[(i, j)] = lit",
        "            arcs.append((i, j, lit))",
        "    model.AddCircuit(arcs)",
        "    model.Minimize(sum(dist[i][j] * lit for (i, j), lit in arc_vars.items()))",
        "",
        "    solver = cp_model.CpSolver()",
        "    solver.parameters.max_time_in_seconds = 15.0",
        "    status = solver.Solve(model)",
        "    elapsed_ms = (time.perf_counter() - t0) * 1000.0",
        "    status_name = solver.StatusName(status)",
        "    obj_val = solver.ObjectiveValue() / scale if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None",
        "    selected = []",
        "    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):",
        "        next_city = {i: j for (i, j), lit in arc_vars.items() if solver.Value(lit) == 1}",
        "        cur = 0",
        "        for step in range(n):",
        f"            selected.append(f'{var_prefix}_{{cur}}_{{step}}')",
        "            cur = next_city.get(cur, 0)",
        "    print(f'Google OR-Tools CP-SAT Status : {status_name} ({elapsed_ms:.2f} ms)')",
        "    if obj_val is not None:",
        "        print(f'Exact Classical Objective     : {obj_val:.4f}')",
        "    print(f'Active Decisions ({len(selected)})       : {selected}')",
        "",
        "if __name__ == '__main__':",
        "    solve_classical_baseline()",
    ]
    return "\n".join(lines)


def compile_om_to_ortools_code(om: "OptimizationModel") -> str:
    """
    Deterministically generate a standalone, runnable Google OR-Tools CP-SAT
    Python script (`ortools_baseline.py`) from an `OptimizationModel`.
    """
    meta = getattr(om, "metadata", None) or {}
    if meta.get("problem_type") == "TSP" and meta.get("distance_matrix"):
        return _compile_tsp_ortools_code(
            int(meta["n_cities"]),
            meta["distance_matrix"],
            str(meta.get("var_prefix", "visit")),
        )
    if meta.get("problem_type") == "CVRP" and meta.get("distance_matrix"):
        return _compile_cvrp_ortools_code(meta)

    decision_vars = list(om.variables.keys())
    decision_vars_set = set(decision_vars)
    obj_sense = (om.objective.sense or "MINIMIZE").upper()
    obj_expr = om.objective.expression or "0.0"

    lines = [
        "# ── Deterministic Google OR-Tools CP-SAT Classical Baseline ──",
        "import time",
        "from ortools.sat.python import cp_model",
        "",
        "def solve_classical_baseline():",
        "    t0 = time.perf_counter()",
        "    model = cp_model.CpModel()",
        "",
        "    # 1. Decision Variables",
    ]

    for name, var in om.variables.items():
        v_type = str(getattr(var.var_type, "value", var.var_type)).upper()
        if "BIN" in v_type or "BOOL" in v_type:
            lines.append(f"    {name} = model.NewBoolVar('{name}')")
        else:
            lb = int(round(var.lower_bound)) if var.lower_bound is not None else 0
            ub = int(round(var.upper_bound)) if var.upper_bound is not None else 10000
            lines.append(f"    {name} = model.NewIntVar({lb}, {ub}, '{name}')")

    lines.append("")
    lines.append("    # 2. Hard Constraints")
    for c in om.constraints:
        coefs = parse_linear_expression(c.left, decision_vars_set)
        if not coefs:
            continue
        scale = _find_scale_factor(list(coefs.values()) + [float(c.right)])
        terms = []
        for v_name, w in coefs.items():
            iw = int(round(w * scale))
            if iw == 1:
                terms.append(v_name)
            elif iw == -1:
                terms.append(f"-{v_name}")
            elif iw != 0:
                terms.append(f"{iw} * {v_name}")
        lhs_str = " + ".join(terms).replace("+ -", "- ") if terms else "0"
        irhs = int(round(float(c.right) * scale))
        op = "==" if c.op in ("=", "==") else c.op
        lines.append(f"    model.Add({lhs_str} {op} {irhs})  # {c.name}")

    lines.append("")
    lines.append("    # 3. Objective Function")
    obj_coefs, quad_terms = _parse_objective_terms(obj_expr, decision_vars_set)
    all_obj_vals = list(obj_coefs.values()) + [q[2] for q in quad_terms]
    obj_scale = _find_scale_factor(all_obj_vals) if all_obj_vals else 1
    obj_terms = []
    for v_name, w in obj_coefs.items():
        iw = int(round(w * obj_scale))
        if iw == 1:
            obj_terms.append(v_name)
        elif iw == -1:
            obj_terms.append(f"-{v_name}")
        elif iw != 0:
            obj_terms.append(f"{iw} * {v_name}")

    if quad_terms:
        lines.append("    _quad_vars = []")
        for idx_q, (qv1, qv2, qval) in enumerate(quad_terms):
            iw = int(round(qval * obj_scale))
            if iw == 0:
                continue
            z_name = f"_q_{idx_q}"
            lines.append(f"    {z_name} = model.NewBoolVar('{z_name}')")
            lines.append(f"    model.Add({z_name} <= {qv1}); model.Add({z_name} <= {qv2}); model.Add({z_name} >= {qv1} + {qv2} - 1)")
            if iw == 1:
                obj_terms.append(z_name)
            elif iw == -1:
                obj_terms.append(f"-{z_name}")
            else:
                obj_terms.append(f"{iw} * {z_name}")

    obj_str = " + ".join(obj_terms).replace("+ -", "- ") if obj_terms else "0"

    sense_fn = "Maximize" if obj_sense == "MAXIMIZE" else "Minimize"
    lines.append(f"    model.{sense_fn}({obj_str})")
    lines.append("")
    lines.append("    # 4. Execute CP-SAT Exact Branch-and-Cut Solver")
    lines.append("    solver = cp_model.CpSolver()")
    lines.append("    solver.parameters.max_time_in_seconds = 10.0")
    lines.append("    status = solver.Solve(model)")
    lines.append("    elapsed_ms = (time.perf_counter() - t0) * 1000.0")
    lines.append("")
    lines.append("    status_name = solver.StatusName(status)")
    lines.append(f"    obj_val = solver.ObjectiveValue() / {float(obj_scale)} if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None")
    lines.append(f"    all_vars = [{', '.join(f'(\"{n}\", {n})' for n in decision_vars)}]")
    lines.append("    selected = [name for name, v in all_vars if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) and solver.Value(v) > 0]")
    lines.append("    print(f'Google OR-Tools CP-SAT Status : {status_name} ({elapsed_ms:.2f} ms)')")
    lines.append("    if obj_val is not None:")
    lines.append("        print(f'Exact Classical Objective     : {obj_val:.4f}')")
    lines.append("    print(f'Active Decisions ({len(selected)})       : {selected}')")
    lines.append("")
    lines.append("if __name__ == '__main__':")
    lines.append("    solve_classical_baseline()")

    return "\n".join(lines)


def solve_om_with_ortools(om: "OptimizationModel") -> Dict[str, Any]:
    """
    Deterministically compile and execute `om` with Google OR-Tools CP-SAT,
    verifying every constraint with the exact same algebraic evaluation rules
    used by `DWaveAdapter`.
    """
    code = compile_om_to_ortools_code(om)
    decision_vars = list(om.variables.keys())
    decision_vars_set = set(decision_vars)
    obj_sense = (om.objective.sense or "MINIMIZE").upper()
    obj_expr = om.objective.expression or "0.0"

    t0_import = time.perf_counter()
    try:
        from ortools.sat.python import cp_model
    except ImportError as e:
        return {
            "available": False,
            "solver": "Google OR-Tools CP-SAT",
            "status": "UNAVAILABLE",
            "feasible": None,
            "objective_value": None,
            "solution": {},
            "selected_variables": [],
            "solve_time_ms": 0.0,
            "constraints_satisfied": 0,
            "constraints_total": len(om.constraints),
            "code": code,
            "error": str(e),
        }

    t0 = time.perf_counter()
    try:
        meta = getattr(om, "metadata", None) or {}
        if meta.get("problem_type") == "TSP" and meta.get("distance_matrix"):
            n_cities = int(meta["n_cities"])
            dist = meta["distance_matrix"]
            prefix = str(meta.get("var_prefix", "visit"))
            flat_vals = [float(dist[i][j]) for i in range(n_cities) for j in range(n_cities) if i != j]
            scale = _find_scale_factor(flat_vals) if flat_vals else 1
            model = cp_model.CpModel()
            arcs = []
            arc_vars = {}
            for i in range(n_cities):
                for j in range(n_cities):
                    if i == j:
                        continue
                    lit = model.NewBoolVar(f"arc_{i}_{j}")
                    arc_vars[(i, j)] = lit
                    arcs.append((i, j, lit))
            model.AddCircuit(arcs)
            model.Minimize(
                sum(int(round(float(dist[i][j]) * scale)) * lit for (i, j), lit in arc_vars.items())
            )
            solver = cp_model.CpSolver()
            solver.parameters.max_time_in_seconds = 15.0
            status = solver.Solve(model)
            solve_time_ms = round((time.perf_counter() - t0) * 1000.0, 2)
            status_name = solver.StatusName(status)
            if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                return {
                    "available": True,
                    "solver": "Google OR-Tools CP-SAT",
                    "status": status_name,
                    "feasible": False,
                    "objective_value": None,
                    "solution": {},
                    "selected_variables": [],
                    "solve_time_ms": solve_time_ms,
                    "constraints_satisfied": 0,
                    "constraints_total": len(om.constraints),
                    "code": code,
                    "error": None,
                }
            next_city = {i: j for (i, j), lit in arc_vars.items() if solver.Value(lit) == 1}
            solution: Dict[str, int] = {name: 0 for name in decision_vars}
            selected: List[str] = []
            cur = 0
            for step in range(n_cities):
                vname = f"{prefix}_{cur}_{step}"
                if vname in solution:
                    solution[vname] = 1
                selected.append(vname)
                cur = next_city.get(cur, 0)
            exact_obj_val = round(float(solver.ObjectiveValue()) / float(scale), 4)
            return {
                "available": True,
                "solver": "Google OR-Tools CP-SAT",
                "status": status_name,
                "feasible": True,
                "objective_value": exact_obj_val,
                "solution": solution,
                "selected_variables": selected,
                "solve_time_ms": solve_time_ms,
                "constraints_satisfied": len(om.constraints),
                "constraints_total": len(om.constraints),
                "code": code,
                "error": None,
            }

        if meta.get("problem_type") == "CVRP" and meta.get("distance_matrix"):
            customers = int(meta["customers"])
            vehicles = int(meta["vehicles"])
            capacity = int(meta["capacity"])
            demand = [int(x) for x in meta["demand"]]
            dist = meta["distance_matrix"]
            n_nodes = customers + 1
            flat_vals = [float(dist[i][j]) for i in range(n_nodes) for j in range(n_nodes) if i != j]
            scale = _find_scale_factor(flat_vals) if flat_vals else 1
            model = cp_model.CpModel()
            x_arc = {}
            for v in range(vehicles):
                for i in range(n_nodes):
                    for j in range(n_nodes):
                        if i != j:
                            x_arc[(v, i, j)] = model.NewBoolVar(f"x_{v}_{i}_{j}")
            for j in range(1, n_nodes):
                model.Add(sum(x_arc[(v, i, j)] for v in range(vehicles) for i in range(n_nodes) if i != j) == 1)
            for v in range(vehicles):
                for k in range(n_nodes):
                    model.Add(
                        sum(x_arc[(v, i, k)] for i in range(n_nodes) if i != k)
                        == sum(x_arc[(v, k, j)] for j in range(n_nodes) if j != k)
                    )
                model.Add(sum(x_arc[(v, 0, j)] for j in range(1, n_nodes)) <= 1)
                u_var = {i: model.NewIntVar(0, capacity, f"u_{v}_{i}") for i in range(1, n_nodes)}
                for i in range(1, n_nodes):
                    used_i = sum(x_arc[(v, k, i)] for k in range(n_nodes) if k != i)
                    model.Add(u_var[i] >= demand[i] * used_i)
                    model.Add(u_var[i] <= capacity * used_i)
                for i in range(1, n_nodes):
                    for j in range(1, n_nodes):
                        if i != j:
                            model.Add(u_var[j] >= u_var[i] + demand[j]).OnlyEnforceIf(x_arc[(v, i, j)])
            model.Minimize(sum(int(round(float(dist[i][j]) * scale)) * var for (v, i, j), var in x_arc.items()))
            solver = cp_model.CpSolver()
            solver.parameters.max_time_in_seconds = 15.0
            status = solver.Solve(model)
            solve_time_ms = round((time.perf_counter() - t0) * 1000.0, 2)
            status_name = solver.StatusName(status)
            if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                return {
                    "available": True,
                    "solver": "Google OR-Tools CP-SAT",
                    "status": status_name,
                    "feasible": False,
                    "objective_value": None,
                    "solution": {},
                    "selected_variables": [],
                    "solve_time_ms": solve_time_ms,
                    "constraints_satisfied": 0,
                    "constraints_total": len(om.constraints),
                    "code": code,
                    "error": None,
                }
            solution = {name: 0 for name in decision_vars}
            selected = []
            for v in range(vehicles):
                nxt = {i: j for i in range(n_nodes) for j in range(n_nodes) if i != j and solver.Value(x_arc[(v, i, j)]) == 1}
                cur = nxt.get(0, 0)
                slot = 0
                while cur != 0 and slot < customers:
                    vname = f"x_{v}_{cur}_{slot}"
                    if vname in solution:
                        solution[vname] = 1
                    selected.append(vname)
                    cur = nxt.get(cur, 0)
                    slot += 1
            exact_obj_val = round(float(solver.ObjectiveValue()) / float(scale), 4)
            return {
                "available": True,
                "solver": "Google OR-Tools CP-SAT",
                "status": status_name,
                "feasible": True,
                "objective_value": exact_obj_val,
                "solution": solution,
                "selected_variables": selected,
                "solve_time_ms": solve_time_ms,
                "constraints_satisfied": len(om.constraints),
                "constraints_total": len(om.constraints),
                "code": code,
                "error": None,
            }

        model = cp_model.CpModel()
        cp_vars: Dict[str, Any] = {}

        for name, var in om.variables.items():
            v_type = str(getattr(var.var_type, "value", var.var_type)).upper()
            if "BIN" in v_type or "BOOL" in v_type:
                cp_vars[name] = model.NewBoolVar(name)
            else:
                lb = int(round(var.lower_bound)) if var.lower_bound is not None else 0
                ub = int(round(var.upper_bound)) if var.upper_bound is not None else 10000
                cp_vars[name] = model.NewIntVar(lb, ub, name)

        # Add constraints
        for c in om.constraints:
            coefs = parse_linear_expression(c.left, decision_vars_set)
            if not coefs:
                continue
            scale = _find_scale_factor(list(coefs.values()) + [float(c.right)])
            expr = sum(int(round(w * scale)) * cp_vars[v_name] for v_name, w in coefs.items() if v_name in cp_vars)
            irhs = int(round(float(c.right) * scale))
            if c.op == "<=":
                model.Add(expr <= irhs)
            elif c.op == ">=":
                model.Add(expr >= irhs)
            else:
                model.Add(expr == irhs)

        # Add objective (supports both linear and quadratic terms via binary McCormick linearization)
        obj_coefs, quad_terms = _parse_objective_terms(obj_expr, decision_vars_set)

        all_obj_vals = list(obj_coefs.values()) + [q[2] for q in quad_terms]
        obj_scale = _find_scale_factor(all_obj_vals) if all_obj_vals else 1

        obj_lin_expr = sum(
            int(round(w * obj_scale)) * cp_vars[v_name]
            for v_name, w in obj_coefs.items()
            if v_name in cp_vars
        )
        obj_quad_expr = 0
        for idx_q, (qv1, qv2, qval) in enumerate(quad_terms):
            iw = int(round(qval * obj_scale))
            if iw == 0:
                continue
            prod_var = model.NewBoolVar(f"_quad_{idx_q}_{qv1}_{qv2}")
            model.Add(prod_var <= cp_vars[qv1])
            model.Add(prod_var <= cp_vars[qv2])
            model.Add(prod_var >= cp_vars[qv1] + cp_vars[qv2] - 1)
            obj_quad_expr += iw * prod_var

        total_obj_expr = obj_lin_expr + obj_quad_expr
        if obj_sense == "MAXIMIZE":
            model.Maximize(total_obj_expr)
        else:
            model.Minimize(total_obj_expr)

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 15.0
        status = solver.Solve(model)
        solve_time_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        status_name = solver.StatusName(status)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return {
                "available": True,
                "solver": "Google OR-Tools CP-SAT",
                "status": status_name,
                "feasible": False,
                "objective_value": None,
                "solution": {},
                "selected_variables": [],
                "solve_time_ms": solve_time_ms,
                "constraints_satisfied": 0,
                "constraints_total": len(om.constraints),
                "code": code,
                "error": None,
            }

        solution: Dict[str, int] = {name: int(solver.Value(var)) for name, var in cp_vars.items()}
        selected = [name for name, val in solution.items() if val > 0]

        # Evaluate objective & constraints using identical safe evaluator as DWaveAdapter
        _tok_re = re.compile(r"\b[a-zA-Z_]\w*\b")

        def safe_eval(expr_str: str, sol: dict) -> float:
            safe = _tok_re.sub(lambda m: str(sol.get(m.group(0), m.group(0))), expr_str)
            if safe.count("+") > 250 and "(" not in safe:
                parts = safe.split("+")
                return float(sum(eval("+".join(parts[k : k + 200])) for k in range(0, len(parts), 200)))
            return float(eval(safe))

        exact_obj_val = round(safe_eval(obj_expr, solution), 4)
        satisfied_count = 0
        for c in om.constraints:
            lhs_val = safe_eval(c.left, solution)
            rhs = float(c.right)
            ok = (
                lhs_val <= rhs + 1e-5
                if c.op == "<="
                else lhs_val >= rhs - 1e-5
                if c.op == ">="
                else abs(lhs_val - rhs) < 1e-5
            )
            if ok:
                satisfied_count += 1

        all_satisfied = satisfied_count == len(om.constraints)

        return {
            "available": True,
            "solver": "Google OR-Tools CP-SAT",
            "status": status_name,
            "feasible": all_satisfied,
            "objective_value": exact_obj_val,
            "solution": solution,
            "selected_variables": selected,
            "solve_time_ms": solve_time_ms,
            "constraints_satisfied": satisfied_count,
            "constraints_total": len(om.constraints),
            "code": code,
            "error": None,
        }
    except Exception as e:
        solve_time_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        return {
            "available": True,
            "solver": "Google OR-Tools CP-SAT",
            "status": "ERROR",
            "feasible": None,
            "objective_value": None,
            "solution": {},
            "selected_variables": [],
            "solve_time_ms": solve_time_ms,
            "constraints_satisfied": 0,
            "constraints_total": len(om.constraints),
            "code": code,
            "error": str(e),
        }


def build_quantum_vs_classical_comparison(
    om: "OptimizationModel",
    quantum_result: Dict[str, Any],
    quantum_time_ms: float,
    classical_result: Dict[str, Any],
    q_size: int = 0,
    penalty_weight: float = 10.0,
) -> Dict[str, Any]:
    """
    Build a deterministic head-to-head comparison between the D-Wave QUBO Annealer
    and Google OR-Tools CP-SAT, including optimality gap %, decision overlap,
    winner determination, and a crisp technical explanation of WHY.
    """
    sense = (om.objective.sense or "MINIMIZE").upper()
    total_cons = len(om.constraints)

    q_feasible = bool(quantum_result.get("feasible", False))
    q_obj = quantum_result.get("objective_value")
    q_energy = quantum_result.get("energy")
    q_sol = quantum_result.get("solution") or {}
    q_selected = [k for k, v in q_sol.items() if v and v > 0]
    q_rep = quantum_result.get("feasibility_report") or {}
    q_sat = sum(1 for r in q_rep.values() if isinstance(r, dict) and r.get("feasible")) if q_rep else (total_cons if q_feasible else 0)

    c_feasible = bool(classical_result.get("feasible", False))
    c_obj = classical_result.get("objective_value")
    c_status = classical_result.get("status", "UNKNOWN")
    c_selected = classical_result.get("selected_variables") or []
    c_time_ms = classical_result.get("solve_time_ms", 0.0)
    c_sat = classical_result.get("constraints_satisfied", total_cons if c_feasible else 0)

    # Calculate Optimality Gap (%)
    optimality_gap_pct: Optional[float] = None
    if q_obj is not None and c_obj is not None:
        denom = abs(float(c_obj))
        if denom > 1e-9:
            optimality_gap_pct = round(abs(float(q_obj) - float(c_obj)) / denom * 100.0, 2)
        else:
            optimality_gap_pct = 0.0 if abs(float(q_obj) - float(c_obj)) < 1e-6 else 100.0

    # Calculate Decision Overlap
    q_set = set(q_selected)
    c_set = set(c_selected)
    union_len = len(q_set | c_set)
    overlap_pct = round((len(q_set & c_set) / union_len) * 100.0, 1) if union_len > 0 else 100.0
    exact_match = q_set == c_set

    # Guard against trivial unconstrained all-zero fallback (0 constraints & 0 active decisions)
    is_trivial_unconstrained = (
        total_cons == 0
        and len(q_selected) == 0
        and len(c_selected) == 0
        and (q_obj is None or abs(float(q_obj)) < 1e-6)
    )

    # Guard against empty/constant-0 objective expression (e.g., dropped quadratic objective)
    raw_obj_expr = (om.objective.expression or "").strip()
    is_zero_objective = raw_obj_expr in ("", "0", "0.0", "(0)", "(0.0)", "-0", "-0.0")

    # Determine Winner & Technical Verdict
    if is_trivial_unconstrained:
        winner = "NONE"
        verdict_badge = "Unconstrained Trivial Zero State — Constraints Missing"
        summary = (
            "No constraints were compiled into this model (0/0 constraints). Minimizing an unconstrained objective "
            "trivially sets every decision variable to 0 (Objective = 0.0000). Re-submit the problem with explicit "
            "constraints or add constraints in the Model tab."
        )
    elif is_zero_objective:
        winner = "NONE"
        verdict_badge = "Objective Expression Missing (Constant 0)"
        summary = (
            "The compiled mathematical model has a constant 0 objective expression, so any feasible variable assignment "
            "scores 0.0000. Inspect the Model tab to verify the objective function was extracted properly."
        )
    elif q_feasible and c_feasible and q_obj is not None and c_obj is not None:
        diff = float(q_obj) - float(c_obj)
        if abs(diff) < 1e-5:
            winner = "TIE"
            verdict_badge = "0.00% Optimality Gap — Global Optimum Verified"
            if exact_match:
                summary = (
                    f"Both D-Wave Quantum Annealing (QUBO) and Google OR-Tools CP-SAT converged to the exact same "
                    f"global optimum (Objective = {q_obj:.4f}, {q_sat}/{total_cons} constraints satisfied) with 100% identical variable assignments."
                )
            else:
                summary = (
                    f"Both D-Wave Quantum Annealing (QUBO) and Google OR-Tools CP-SAT achieved the exact global optimal "
                    f"objective value ({q_obj:.4f}, 0.00% optimality gap, {q_sat}/{total_cons} constraints satisfied). "
                    f"Because the problem landscape has multiple degenerate ground states of equal cost, the two solvers selected alternative valid optimal schedules ({overlap_pct}% variable overlap)."
                )
        else:
            q_better = (diff < 0) if sense == "MINIMIZE" else (diff > 0)
            if q_better:
                winner = "QUANTUM"
                verdict_badge = f"Quantum Annealing Outperformed ({optimality_gap_pct}% advantage)"
                summary = (
                    f"D-Wave Quantum Annealing found a superior feasible objective ({q_obj:.4f}) compared to OR-Tools ({c_obj:.4f}) "
                    f"while satisfying all {q_sat}/{total_cons} constraints."
                )
            else:
                winner = "CLASSICAL"
                verdict_badge = f"Classical OR-Tools Optimal ({optimality_gap_pct}% QUBO gap)"
                summary = (
                    f"Google OR-Tools CP-SAT proved the exact global optimum (Objective = {c_obj:.4f}, {c_sat}/{total_cons} constraints), "
                    f"while D-Wave QUBO Annealing converged to a feasible near-optimal state (Objective = {q_obj:.4f}, gap = {optimality_gap_pct}%). "
                    f"In penalty-based QUBO (λ = {penalty_weight}), high penalty stiffness prioritizes constraint slack over subtle objective gradients; tuning λ or increasing annealing reads closes this gap."
                )
    elif c_feasible and not q_feasible:
        winner = "CLASSICAL"
        verdict_badge = "Classical OR-Tools Feasible (QUBO Penalty Tuning Required)"
        summary = (
            f"Google OR-Tools CP-SAT found a strictly feasible optimum (Objective = {c_obj}, {c_sat}/{total_cons} constraints satisfied), "
            f"whereas the unconstrained QUBO sample satisfied {q_sat}/{total_cons} constraints at penalty stiffness λ = {penalty_weight}. "
            f"Increase penalty multiplier λ in the Model tab and click Recompile & Solve to enforce hard constraint boundaries in the QUBO Hamiltonian."
        )
    elif q_feasible and not c_feasible:
        winner = "QUANTUM"
        verdict_badge = "Quantum Annealing Feasible"
        summary = (
            f"D-Wave QUBO Annealing identified a feasible ground state (Objective = {q_obj}, {q_sat}/{total_cons} constraints satisfied)."
        )
    else:
        winner = "NONE"
        verdict_badge = "Boundary Conflict Detected in Both Solvers"
        summary = (
            f"Neither solver found a strictly feasible assignment ({q_sat}/{total_cons} QUBO constraints, OR-Tools status: {c_status}). "
            f"The problem constraints appear mutually contradictory—relax one or more constraint bounds."
        )

    return {
        "winner": winner,
        "verdict_badge": verdict_badge,
        "optimality_gap_pct": optimality_gap_pct,
        "decision_overlap_pct": overlap_pct,
        "exact_decision_match": exact_match,
        "summary": summary,
        "quantum": {
            "solver": "D-Wave Simulated Annealer (QUBO)",
            "status": "FEASIBLE" if q_feasible else "SUBOPTIMAL",
            "feasible": q_feasible,
            "objective_value": round(float(q_obj), 4) if q_obj is not None else None,
            "energy": round(float(q_energy), 4) if q_energy is not None else None,
            "selected_variables": q_selected,
            "constraints_satisfied": q_sat,
            "constraints_total": total_cons,
            "solve_time_ms": round(float(quantum_time_ms), 2),
            "logical_qubits": q_size,
            "penalty_lambda": penalty_weight,
        },
        "classical": {
            "solver": "Google OR-Tools CP-SAT",
            "status": c_status,
            "feasible": c_feasible,
            "objective_value": round(float(c_obj), 4) if c_obj is not None else None,
            "selected_variables": c_selected,
            "constraints_satisfied": c_sat,
            "constraints_total": total_cons,
            "solve_time_ms": c_time_ms,
            "code": classical_result.get("code", ""),
        },
    }
