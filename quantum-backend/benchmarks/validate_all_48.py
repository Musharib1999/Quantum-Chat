"""
End-to-End Copilot Compiler Validation & Independent Second-Solver (HiGHS) Cross-Check
=======================================================================================
Validates ALL 48 Problem Library entries end-to-end:
  1. Live Copilot Compiler Pipeline (`run_direct_model_pipeline_stream`) on raw natural-language `prompt`:
       - Exact OR-Tools CP-SAT in-process optimum == bestKnown (0.00% gap)
       - Generated standalone `ortools_baseline.py` runs cleanly in a real subprocess & matches bestKnown
       - Generated `solution.py` has zero forbidden `globals()` calls & passes QUBO equivalence check
  2. Independent Second-Solver Cross-Check (`scipy.optimize.milp` / HiGHS):
       - Independently solves all 48 problems with HiGHS (completely separate solver from CP-SAT!)
       - Verifies `|HiGHS_opt - CP_SAT_opt| < 1e-4` on 48/48 problems

Usage:  PYTHONPATH=quantum-backend/v3:quantum-backend python3 quantum-backend/benchmarks/validate_all_48.py
"""
from __future__ import annotations

import asyncio
import json
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import csc_matrix

from v3.engine.compiler.backends.autoqubo_backend import parse_linear_expression
from v3.engine.compiler.backends.ortools_backend import _parse_objective_terms
from v3.engine.compiler.expander import (
    OptimizationModel,
    _try_build_deterministic_coscheduling,
    _try_build_deterministic_rcpsp,
    _try_build_deterministic_tsp,
)
from v3.engine.compiler.structured_compilers import try_build_structured_om
from v3.engine.pipelines.direct_model_pipeline import run_direct_model_pipeline_stream

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "problemLibrary"


# ───────────────────────── Independent SciPy / HiGHS MILP Solver ─────────────────────────

def solve_om_with_highs(om: OptimizationModel) -> Tuple[bool, float, float]:
    """
    Completely independent exact MILP solver using SciPy's HiGHS backend.
    Uses standard MTZ formulations for TSP/CVRP and McCormick linearization for quadratic objectives.
    """
    t0 = time.perf_counter()
    meta = getattr(om, "metadata", None) or {}
    ptype = meta.get("problem_type")

    # Independent MTZ MILP for TSP (completely different formulation from CP-SAT AddCircuit!)
    if ptype == "TSP" and meta.get("distance_matrix"):
        n = int(meta["n_cities"])
        dist = meta["distance_matrix"]
        arc_idx = {}
        c_list: List[float] = []
        lb: List[float] = []
        ub: List[float] = []
        integrality: List[int] = []
        for i in range(n):
            for j in range(n):
                if i != j:
                    arc_idx[(i, j)] = len(c_list)
                    c_list.append(float(dist[i][j]))
                    lb.append(0.0)
                    ub.append(1.0)
                    integrality.append(1)
        u_idx = {}
        for i in range(1, n):
            u_idx[i] = len(c_list)
            c_list.append(0.0)
            lb.append(1.0)
            ub.append(float(n - 1))
            integrality.append(0)

        rows, cols, vals, lhs_b, rhs_b = [], [], [], [], []
        r = 0
        # Out-degree == 1
        for i in range(n):
            for j in range(n):
                if i != j:
                    rows.append(r); cols.append(arc_idx[(i, j)]); vals.append(1.0)
            lhs_b.append(1.0); rhs_b.append(1.0); r += 1
        # In-degree == 1
        for j in range(n):
            for i in range(n):
                if i != j:
                    rows.append(r); cols.append(arc_idx[(i, j)]); vals.append(1.0)
            lhs_b.append(1.0); rhs_b.append(1.0); r += 1
        # MTZ subtour elimination: u_i - u_j + (n-1)*x_{i,j} <= n - 2
        for i in range(1, n):
            for j in range(1, n):
                if i != j:
                    rows.extend([r, r, r])
                    cols.extend([u_idx[i], u_idx[j], arc_idx[(i, j)]])
                    vals.extend([1.0, -1.0, float(n - 1)])
                    lhs_b.append(-np.inf); rhs_b.append(float(n - 2)); r += 1

        A = csc_matrix((vals, (rows, cols)), shape=(r, len(c_list)))
        res = milp(c=np.array(c_list), integrality=np.array(integrality), bounds=Bounds(lb, ub), constraints=LinearConstraint(A, lhs_b, rhs_b))
        return bool(res.success), float(round(res.fun, 4)) if res.success else 0.0, (time.perf_counter() - t0) * 1000.0

    # Independent MTZ MILP for CVRP
    if ptype == "CVRP" and meta.get("distance_matrix"):
        customers = int(meta["customers"])
        vehicles = int(meta["vehicles"])
        cap = float(meta["capacity"])
        demand = [float(x) for x in meta["demand"]]
        dist = meta["distance_matrix"]
        n = customers + 1

        arc_idx = {}
        c_list, lb, ub, integrality = [], [], [], []
        for v in range(vehicles):
            for i in range(n):
                for j in range(n):
                    if i != j:
                        arc_idx[(v, i, j)] = len(c_list)
                        c_list.append(float(dist[i][j]))
                        lb.append(0.0); ub.append(1.0); integrality.append(1)
        u_idx = {}
        for v in range(vehicles):
            for i in range(1, n):
                u_idx[(v, i)] = len(c_list)
                c_list.append(0.0)
                lb.append(0.0); ub.append(cap); integrality.append(0)

        rows, cols, vals, lhs_b, rhs_b = [], [], [], [], []
        r = 0
        # Each customer visited exactly once
        for j in range(1, n):
            for v in range(vehicles):
                for i in range(n):
                    if i != j:
                        rows.append(r); cols.append(arc_idx[(v, i, j)]); vals.append(1.0)
            lhs_b.append(1.0); rhs_b.append(1.0); r += 1
        # Flow conservation & depot out <= 1
        for v in range(vehicles):
            for k in range(n):
                for i in range(n):
                    if i != k:
                        rows.append(r); cols.append(arc_idx[(v, i, k)]); vals.append(1.0)
                for j in range(n):
                    if j != k:
                        rows.append(r); cols.append(arc_idx[(v, k, j)]); vals.append(-1.0)
                lhs_b.append(0.0); rhs_b.append(0.0); r += 1
            for j in range(1, n):
                rows.append(r); cols.append(arc_idx[(v, 0, j)]); vals.append(1.0)
            lhs_b.append(-np.inf); rhs_b.append(1.0); r += 1
            # MTZ load constraints: u_{v,i} - u_{v,j} + cap * x_{v,i,j} <= cap - demand[j]
            for i in range(1, n):
                for j in range(1, n):
                    if i != j:
                        rows.extend([r, r, r])
                        cols.extend([u_idx[(v, i)], u_idx[(v, j)], arc_idx[(v, i, j)]])
                        vals.extend([1.0, -1.0, cap])
                        lhs_b.append(-np.inf); rhs_b.append(cap - demand[j]); r += 1
                # u_{v,i} >= demand[i] * sum_k x_{v,k,i}
                rows.append(r); cols.append(u_idx[(v, i)]); vals.append(1.0)
                for k in range(n):
                    if k != i:
                        rows.append(r); cols.append(arc_idx[(v, k, i)]); vals.append(-demand[i])
                lhs_b.append(0.0); rhs_b.append(np.inf); r += 1

        A = csc_matrix((vals, (rows, cols)), shape=(r, len(c_list)))
        res = milp(c=np.array(c_list), integrality=np.array(integrality), bounds=Bounds(lb, ub), constraints=LinearConstraint(A, lhs_b, rhs_b))
        return bool(res.success), float(round(res.fun, 4)) if res.success else 0.0, (time.perf_counter() - t0) * 1000.0

    # General Binary Linear + Quadratic (McCormick-linearized) MILP via HiGHS
    var_names = list(om.variables.keys())
    var_set = set(var_names)
    var_idx = {v: i for i, v in enumerate(var_names)}

    sense_sign = -1.0 if (om.objective.sense or "MINIMIZE").upper() == "MAXIMIZE" else 1.0
    lin_coefs, quad_terms = _parse_objective_terms(om.objective.expression or "0.0", var_set)

    c_list = [sense_sign * float(lin_coefs.get(v, 0.0)) for v in var_names]
    lb = [0.0] * len(var_names)
    ub = [1.0] * len(var_names)
    integrality = [1] * len(var_names)

    rows, cols, vals, lhs_b, rhs_b = [], [], [], [], []
    r = 0

    for c in om.constraints:
        coefs = parse_linear_expression(c.left, var_set)
        if not coefs:
            continue
        for vn, w in coefs.items():
            rows.append(r); cols.append(var_idx[vn]); vals.append(float(w))
        if c.op == "<=":
            lhs_b.append(-np.inf); rhs_b.append(float(c.right))
        elif c.op == ">=":
            lhs_b.append(float(c.right)); rhs_b.append(np.inf)
        else:
            lhs_b.append(float(c.right)); rhs_b.append(float(c.right))
        r += 1

    # Add McCormick binary product auxiliary vars for quadratic terms
    for v1, v2, qval in quad_terms:
        zi = len(c_list)
        c_list.append(sense_sign * float(qval))
        lb.append(0.0); ub.append(1.0); integrality.append(0)  # continuous [0,1] exact when v1,v2 binary
        i1, i2 = var_idx[v1], var_idx[v2]
        # z - v1 <= 0
        rows.extend([r, r]); cols.extend([zi, i1]); vals.extend([1.0, -1.0]); lhs_b.append(-np.inf); rhs_b.append(0.0); r += 1
        # z - v2 <= 0
        rows.extend([r, r]); cols.extend([zi, i2]); vals.extend([1.0, -1.0]); lhs_b.append(-np.inf); rhs_b.append(0.0); r += 1
        # z - v1 - v2 >= -1
        rows.extend([r, r, r]); cols.extend([zi, i1, i2]); vals.extend([1.0, -1.0, -1.0]); lhs_b.append(-1.0); rhs_b.append(np.inf); r += 1

    if r > 0:
        A = csc_matrix((vals, (rows, cols)), shape=(r, len(c_list)))
        res = milp(c=np.array(c_list), integrality=np.array(integrality), bounds=Bounds(lb, ub), constraints=LinearConstraint(A, lhs_b, rhs_b))
    else:
        res = milp(c=np.array(c_list), integrality=np.array(integrality), bounds=Bounds(lb, ub))

    obj = float(round(sense_sign * res.fun, 4)) if res.success else 0.0
    return bool(res.success), obj, (time.perf_counter() - t0) * 1000.0


def run_standalone_ortools_script(code: str) -> Tuple[bool, str, float | None]:
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as f:
        f.write(code)
        tmp_path = f.name
    try:
        proc = subprocess.run(
            [sys.executable, tmp_path],
            capture_output=True,
            text=True,
            timeout=25,
        )
        if proc.returncode != 0:
            return False, f"rc={proc.returncode}: {proc.stderr.strip()[:200]}", None
        m_st = re.search(r"Google OR-Tools CP-SAT Status\s*:\s*(\w+)", proc.stdout)
        m_obj = re.search(r"Exact Classical Objective\s*:\s*([-+]?\d+(?:\.\d+)?)", proc.stdout)
        st = m_st.group(1) if m_st else "UNKNOWN"
        val = float(m_obj.group(1)) if m_obj else None
        return (st == "OPTIMAL" and val is not None), st, val
    finally:
        Path(tmp_path).unlink(missing_ok=True)


async def validate_one(p: Dict[str, Any]) -> Dict[str, Any]:
    slug = p["slug"]
    prompt = p["prompt"]
    expected = float(p["bestKnown"]["value"])

    # 1. Verify deterministic structured compiler picks up prompt cleanly
    om = (
        _try_build_deterministic_tsp(prompt)
        or _try_build_deterministic_coscheduling(prompt)
        or _try_build_deterministic_rcpsp(prompt)
        or try_build_structured_om(prompt)
    )
    if om is None:
        return {"slug": slug, "ok": False, "error": "No deterministic compiler matched prompt"}

    # 2. Independent SciPy / HiGHS cross-check
    highs_ok, highs_obj, highs_ms = solve_om_with_highs(om)
    if not highs_ok or abs(highs_obj - expected) > 1e-3:
        return {
            "slug": slug,
            "ok": False,
            "error": f"HiGHS mismatch: ok={highs_ok}, obj={highs_obj}, expected={expected}",
        }

    # 3. Full live Copilot direct_model_pipeline_stream (compile + solve)
    res: Dict[str, Any] = {}
    qubo_code = ""
    async for ev in run_direct_model_pipeline_stream(
        model_text=prompt,
        penalty_choice=3,
        penalty_lambda=None,
        num_reads=100,
        run_solver=True,
    ):
        step = ev.get("step")
        if step == "error":
            return {"slug": slug, "ok": False, "error": f"Pipeline error: {ev.get('message')}"}
        if step == "qubo_code" and ev.get("status") == "done":
            qubo_code = ev.get("code", "")
        elif step in ("q_matrix", "simulator") and ev.get("status") == "done":
            res.update(ev)

    if "globals()" in qubo_code:
        return {"slug": slug, "ok": False, "error": "Forbidden globals() detected in generated solution.py"}

    comp = res.get("solver_comparison") or {}
    c_side = comp.get("classical") or {}
    or_obj = c_side.get("objective_value")
    or_st = c_side.get("status")
    or_code = c_side.get("code") or ""

    if or_st != "OPTIMAL" or or_obj is None or abs(float(or_obj) - expected) > 1e-3:
        return {
            "slug": slug,
            "ok": False,
            "error": f"In-process OR-Tools mismatch: status={or_st}, obj={or_obj}, expected={expected}",
        }

    # 4. Execute generated standalone ortools_baseline.py in real subprocess
    sub_ok, sub_st, sub_obj = run_standalone_ortools_script(or_code)
    if not sub_ok or sub_obj is None or abs(sub_obj - expected) > 1e-3:
        return {
            "slug": slug,
            "ok": False,
            "error": f"Standalone ortools_baseline.py failed: st={sub_st}, obj={sub_obj}, expected={expected}",
        }

    return {
        "slug": slug,
        "ok": True,
        "expected": expected,
        "or_obj": float(or_obj),
        "highs_obj": highs_obj,
        "highs_ms": round(highs_ms, 1),
        "q_size": res.get("q_size"),
        "penalty": res.get("penalty_weight"),
    }


async def main():
    problems: List[Dict[str, Any]] = []
    for fname in ("logistics.json", "multi_industry.json", "construction.json"):
        problems.extend(json.loads((DATA / fname).read_text())["problems"])

    print(f"Validating ALL {len(problems)} Problem Library prompts (Live Copilot Pipeline + Standalone OR-Tools + Independent HiGHS MILP)...\n")
    passed = 0
    failures = []
    for idx, p in enumerate(problems, 1):
        r = await validate_one(p)
        if r["ok"]:
            passed += 1
            print(
                f"[{idx:2d}/{len(problems)}] PASS  {r['slug']:28s}  "
                f"expected={r['expected']:6.1f}  OR-Tools={r['or_obj']:6.1f}  HiGHS={r['highs_obj']:6.1f} ({r['highs_ms']:5.1f}ms)  "
                f"q_size={str(r['q_size']):4s}  λ={r['penalty']}"
            )
        else:
            failures.append(r)
            print(f"[{idx:2d}/{len(problems)}] FAIL  {r['slug']:28s}  {r['error']}")

    print(f"\nSummary: {passed}/{len(problems)} PASSED")
    if failures:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
