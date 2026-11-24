"""
Phase 1 Reproducible Benchmark Runner for the Verified Industry Problem Library (Logistics).

Protocol:
  - Fixed seeds: [101, 202, 303, 404, 505] (N = 5 repeats per solver)
  - QUBO solver: D-Wave Simulated Annealing via `dwave-neal` (explicitly labeled as classical software)
      * Explicit QUBO size cap: MAX_QUBO_VARS = 150 (decision + binary slack variables)
      * Penalty λ sweep across 4 calibrated multipliers, selecting highest feasibility rate (ties broken by best objective)
      * Final evaluation: 5 seeded repeats × 1,000 annealing reads at best λ
      * Strict post-solve verification of every hard constraint on the decoded binary vector
  - Classical solver: Google OR-Tools CP-SAT (exact branch-and-cut, 5 seeded repeats)
  - Honest solver-fit verdict:
      * "exceeds_qubo_limit"  -> QUBO variable count > MAX_QUBO_VARS
      * "competitive"         -> QUBO feasibility >= 80% AND best gap vs best-known <= 1.0% AND gap vs OR-Tools <= 1.0%
      * "classical_wins"      -> Otherwise (OR-Tools strictly better objective or feasibility)

Usage:  python3 quantum-backend/benchmarks/run_logistics_benchmarks.py
Output: src/data/problemLibrary/logistics_benchmarks.json
"""
from __future__ import annotations

import hashlib
import json
import math
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import dimod
from neal import SimulatedAnnealingSampler
from ortools.sat.python import cp_model

from benchmark_harness import (
    EVAL_SEEDS as SEEDS,
    MAX_QUBO_VARS,
    get_environment_manifest,
    run_benchmark,
)

ROOT = Path(__file__).resolve().parents[2]
LIB_IN = ROOT / "src" / "data" / "problemLibrary" / "logistics.json"
BENCH_OUT = ROOT / "src" / "data" / "problemLibrary" / "logistics_benchmarks.json"


def _normalize_json_numbers(v: Any) -> Any:
    if isinstance(v, float) and v.is_integer():
        return int(v)
    if isinstance(v, list):
        return [_normalize_json_numbers(x) for x in v]
    if isinstance(v, dict):
        return {k: _normalize_json_numbers(val) for k, val in v.items()}
    return v


def stable_content_hash(p: Dict[str, Any]) -> str:
    payload = _normalize_json_numbers({
        "prompt": p["prompt"],
        "data": p["data"],
        "objectiveSense": p["objectiveSense"],
        "bestKnown": p["bestKnown"],
    })
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


# ───────────────────────── BQM + Verifier Builders ─────────────────────────

def _add_leq_constraint(
    bqm: dimod.BinaryQuadraticModel,
    terms: List[Tuple[str, int]],
    rhs: int,
    penalty: float,
    label: str,
) -> None:
    """Add sum(c_i * x_i) <= rhs using binary slack bits: sum(c_i * x_i) + sum(2^k s_k) == rhs."""
    if rhs < 0:
        raise ValueError(f"Negative RHS for {label}")
    slack_terms: List[Tuple[str, int]] = []
    if rhs > 0:
        # Standard binary expansion covering [0, rhs]
        rem = rhs
        bit = 0
        while rem > 0:
            coeff = min(1 << bit, rem)
            slack_terms.append((f"slack_{label}_{bit}", coeff))
            rem -= coeff
            bit += 1
    bqm.add_linear_equality_constraint(terms + slack_terms, lagrange_multiplier=penalty, constant=-rhs)


def _add_geq_constraint(
    bqm: dimod.BinaryQuadraticModel,
    terms: List[Tuple[str, int]],
    rhs: int,
    penalty: float,
    label: str,
) -> None:
    """Add sum(c_i * x_i) >= rhs using binary slack bits: sum(c_i * x_i) - sum(2^k s_k) == rhs."""
    max_lhs = sum(c for _, c in terms if c > 0)
    max_slack = max(0, max_lhs - rhs)
    slack_terms: List[Tuple[str, int]] = []
    rem = max_slack
    bit = 0
    while rem > 0:
        coeff = min(1 << bit, rem)
        slack_terms.append((f"slack_{label}_{bit}", -coeff))
        rem -= coeff
        bit += 1
    bqm.add_linear_equality_constraint(terms + slack_terms, lagrange_multiplier=penalty, constant=-rhs)


def build_assignment_models(p: Dict[str, Any]):
    d = p["data"]
    n = d["n"]
    cost = d["costMatrix"]
    base_penalty = float(max(max(row) for row in cost))

    def make_bqm(lam: float) -> dimod.BinaryQuadraticModel:
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(n):
            for j in range(n):
                bqm.add_variable(f"x_{i}_{j}", float(cost[i][j]))
        for i in range(n):
            bqm.add_linear_equality_constraint([(f"x_{i}_{j}", 1) for j in range(n)], lagrange_multiplier=lam, constant=-1)
        for j in range(n):
            bqm.add_linear_equality_constraint([(f"x_{i}_{j}", 1) for i in range(n)], lagrange_multiplier=lam, constant=-1)
        return bqm

    def verify(sample: Dict[str, int]) -> Tuple[bool, float]:
        for i in range(n):
            if sum(sample.get(f"x_{i}_{j}", 0) for j in range(n)) != 1:
                return False, 0.0
        for j in range(n):
            if sum(sample.get(f"x_{i}_{j}", 0) for i in range(n)) != 1:
                return False, 0.0
        obj = sum(cost[i][j] * sample.get(f"x_{i}_{j}", 0) for i in range(n) for j in range(n))
        return True, float(obj)

    def solve_ortools(seed: int) -> Tuple[str, Optional[float], float]:
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        x = [[m.NewBoolVar(f"x_{i}_{j}") for j in range(n)] for i in range(n)]
        for i in range(n):
            m.Add(sum(x[i]) == 1)
        for j in range(n):
            m.Add(sum(x[i][j] for i in range(n)) == 1)
        m.Minimize(sum(cost[i][j] * x[i][j] for i in range(n) for j in range(n)))
        s = cp_model.CpSolver()
        s.parameters.random_seed = seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        status = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        ok = status in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        return s.StatusName(status), (float(round(s.ObjectiveValue(), 6)) if ok else None), ms

    return make_bqm, verify, solve_ortools, base_penalty


def build_knapsack_models(p: Dict[str, Any]):
    d = p["data"]
    n = d["n"]
    weights = d["weights"]
    values = d["values"]
    cap = d["capacity"]
    base_penalty = float(max(values))

    def make_bqm(lam: float) -> dimod.BinaryQuadraticModel:
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(n):
            # Maximize value => minimize -value
            bqm.add_variable(f"x_{i}", -float(values[i]))
        _add_leq_constraint(bqm, [(f"x_{i}", int(weights[i])) for i in range(n)], int(cap), lam, "cap")
        return bqm

    def verify(sample: Dict[str, int]) -> Tuple[bool, float]:
        w = sum(weights[i] * sample.get(f"x_{i}", 0) for i in range(n))
        if w > cap:
            return False, 0.0
        v = sum(values[i] * sample.get(f"x_{i}", 0) for i in range(n))
        return True, float(v)

    def solve_ortools(seed: int) -> Tuple[str, Optional[float], float]:
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        x = [m.NewBoolVar(f"x_{i}") for i in range(n)]
        m.Add(sum(weights[i] * x[i] for i in range(n)) <= cap)
        m.Maximize(sum(values[i] * x[i] for i in range(n)))
        s = cp_model.CpSolver()
        s.parameters.random_seed = seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        status = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        ok = status in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        return s.StatusName(status), (float(round(s.ObjectiveValue(), 6)) if ok else None), ms

    return make_bqm, verify, solve_ortools, base_penalty


def build_facility_models(p: Dict[str, Any]):
    d = p["data"]
    m_fac = d["warehouses"]
    n_cus = d["customers"]
    fixed = d["openingCost"]
    serve = d["serviceCost"]
    base_penalty = float(max(fixed) + max(max(r) for r in serve))

    def make_bqm(lam: float) -> dimod.BinaryQuadraticModel:
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(m_fac):
            bqm.add_variable(f"y_{i}", float(fixed[i]))
            for j in range(n_cus):
                bqm.add_variable(f"x_{i}_{j}", float(serve[i][j]))
        # Each customer assigned to exactly 1 warehouse
        for j in range(n_cus):
            bqm.add_linear_equality_constraint([(f"x_{i}_{j}", 1) for i in range(m_fac)], lagrange_multiplier=lam, constant=-1)
        # x_{i,j} <= y_i  <=>  penalty * x_{i,j} * (1 - y_i) = penalty * x_{i,j} - penalty * x_{i,j} * y_i
        for i in range(m_fac):
            for j in range(n_cus):
                bqm.add_linear(f"x_{i}_{j}", lam)
                bqm.add_quadratic(f"x_{i}_{j}", f"y_{i}", -lam)
        return bqm

    def verify(sample: Dict[str, int]) -> Tuple[bool, float]:
        for j in range(n_cus):
            if sum(sample.get(f"x_{i}_{j}", 0) for i in range(m_fac)) != 1:
                return False, 0.0
        for i in range(m_fac):
            for j in range(n_cus):
                if sample.get(f"x_{i}_{j}", 0) > sample.get(f"y_{i}", 0):
                    return False, 0.0
        obj = sum(fixed[i] * sample.get(f"y_{i}", 0) for i in range(m_fac)) + sum(
            serve[i][j] * sample.get(f"x_{i}_{j}", 0) for i in range(m_fac) for j in range(n_cus)
        )
        return True, float(obj)

    def solve_ortools(seed: int) -> Tuple[str, Optional[float], float]:
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        y = [m.NewBoolVar(f"y_{i}") for i in range(m_fac)]
        x = [[m.NewBoolVar(f"x_{i}_{j}") for j in range(n_cus)] for i in range(m_fac)]
        for j in range(n_cus):
            m.Add(sum(x[i][j] for i in range(m_fac)) == 1)
            for i in range(m_fac):
                m.Add(x[i][j] <= y[i])
        m.Minimize(
            sum(fixed[i] * y[i] for i in range(m_fac))
            + sum(serve[i][j] * x[i][j] for i in range(m_fac) for j in range(n_cus))
        )
        s = cp_model.CpSolver()
        s.parameters.random_seed = seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        status = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        ok = status in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        return s.StatusName(status), (float(round(s.ObjectiveValue(), 6)) if ok else None), ms

    return make_bqm, verify, solve_ortools, base_penalty


def build_set_cover_models(p: Dict[str, Any]):
    d = p["data"]
    regions = d["regions"]
    depots = d["depots"]
    covers = d["covers"]
    cost = d["cost"]
    base_penalty = float(max(cost))

    def make_bqm(lam: float) -> dimod.BinaryQuadraticModel:
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for idx in range(depots):
            bqm.add_variable(f"y_{idx}", float(cost[idx]))
        for r in range(regions):
            covering = [(f"y_{idx}", 1) for idx in range(depots) if r in covers[idx]]
            _add_geq_constraint(bqm, covering, 1, lam, f"reg_{r}")
        return bqm

    def verify(sample: Dict[str, int]) -> Tuple[bool, float]:
        for r in range(regions):
            if sum(sample.get(f"y_{idx}", 0) for idx in range(depots) if r in covers[idx]) < 1:
                return False, 0.0
        obj = sum(cost[idx] * sample.get(f"y_{idx}", 0) for idx in range(depots))
        return True, float(obj)

    def solve_ortools(seed: int) -> Tuple[str, Optional[float], float]:
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        y = [m.NewBoolVar(f"y_{idx}") for idx in range(depots)]
        for r in range(regions):
            m.Add(sum(y[idx] for idx in range(depots) if r in covers[idx]) >= 1)
        m.Minimize(sum(cost[idx] * y[idx] for idx in range(depots)))
        s = cp_model.CpSolver()
        s.parameters.random_seed = seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        status = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        ok = status in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        return s.StatusName(status), (float(round(s.ObjectiveValue(), 6)) if ok else None), ms

    return make_bqm, verify, solve_ortools, base_penalty


def build_tsp_models(p: Dict[str, Any]):
    d = p["data"]
    n = d["n"]
    dist = d["distanceMatrix"]
    base_penalty = float(max(max(r) for r in dist))

    # Position-based QUBO formulation: x_{i,t} = 1 if city i is visited at step t (fix city 0 at t=0 -> (n-1)^2 vars, or n^2 standard)
    # Using full n^2 standard QUBO formulation for honest variable count reporting
    def make_bqm(lam: float) -> dimod.BinaryQuadraticModel:
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(n):
            for t in range(n):
                bqm.add_variable(f"x_{i}_{t}", 0.0)
        # Objective: sum dist[i][j] * x_{i,t} * x_{j,(t+1)%n}
        for i in range(n):
            for j in range(n):
                if i == j:
                    continue
                w = float(dist[i][j])
                for t in range(n):
                    t_next = (t + 1) % n
                    bqm.add_quadratic(f"x_{i}_{t}", f"x_{j}_{t_next}", w)
        # Each city visited once
        for i in range(n):
            bqm.add_linear_equality_constraint([(f"x_{i}_{t}", 1) for t in range(n)], lagrange_multiplier=lam, constant=-1)
        # Each step visits one city
        for t in range(n):
            bqm.add_linear_equality_constraint([(f"x_{i}_{t}", 1) for i in range(n)], lagrange_multiplier=lam, constant=-1)
        return bqm

    def verify(sample: Dict[str, int]) -> Tuple[bool, float]:
        for i in range(n):
            if sum(sample.get(f"x_{i}_{t}", 0) for t in range(n)) != 1:
                return False, 0.0
        order = []
        for t in range(n):
            cities = [i for i in range(n) if sample.get(f"x_{i}_{t}", 0) == 1]
            if len(cities) != 1:
                return False, 0.0
            order.append(cities[0])
        if len(set(order)) != n:
            return False, 0.0
        total = sum(dist[order[t]][order[(t + 1) % n]] for t in range(n))
        return True, float(total)

    def solve_ortools(seed: int) -> Tuple[str, Optional[float], float]:
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        arcs, lits = [], {}
        for i in range(n):
            for j in range(n):
                if i == j:
                    continue
                lit = m.NewBoolVar(f"a_{i}_{j}")
                lits[(i, j)] = lit
                arcs.append((i, j, lit))
        m.AddCircuit(arcs)
        m.Minimize(sum(dist[i][j] * lit for (i, j), lit in lits.items()))
        s = cp_model.CpSolver()
        s.parameters.random_seed = seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 60.0
        status = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        ok = status in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        return s.StatusName(status), (float(round(s.ObjectiveValue(), 6)) if ok else None), ms

    def map_cp_to_bqm(cp_sol: Dict[str, int]) -> Dict[str, int]:
        nxt = {}
        for i in range(n):
            for j in range(n):
                if i != j and cp_sol.get(f"a_{i}_{j}", 0) == 1:
                    nxt[i] = j
        out = {f"x_{i}_{t}": 0 for i in range(n) for t in range(n)}
        cur = 0
        for step in range(n):
            out[f"x_{cur}_{step}"] = 1
            cur = nxt[cur]
        return out

    return make_bqm, verify, solve_ortools, base_penalty, map_cp_to_bqm


def build_cvrp_models(p: Dict[str, Any]):
    d = p["data"]
    customers = d["customers"]
    vehicles = d["vehicles"]
    capacity = d["capacity"]
    demand = d["demand"]
    dist = d["distanceMatrix"]
    n = customers + 1
    base_penalty = float(max(max(r) for r in dist))

    # Position-slot CVRP QUBO: x_{v,c,s} = 1 if vehicle v visits customer c (1..customers) at slot s (0..customers-1)
    # Plus slack bits for per-vehicle capacity constraint
    def make_bqm(lam: float) -> dimod.BinaryQuadraticModel:
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for v in range(vehicles):
            for c in range(1, n):
                for s_idx in range(customers):
                    bqm.add_variable(f"x_{v}_{c}_{s_idx}", 0.0)
        # Each customer visited exactly once across all vehicles and slots
        for c in range(1, n):
            terms = [(f"x_{v}_{c}_{s_idx}", 1) for v in range(vehicles) for s_idx in range(customers)]
            bqm.add_linear_equality_constraint(terms, lagrange_multiplier=lam, constant=-1)
        # At most one customer per (vehicle, slot)
        for v in range(vehicles):
            for s_idx in range(customers):
                terms = [(f"x_{v}_{c}_{s_idx}", 1) for c in range(1, n)]
                _add_leq_constraint(bqm, terms, 1, lam, f"slot_{v}_{s_idx}")
        # Per-vehicle capacity <= capacity
        for v in range(vehicles):
            terms = [(f"x_{v}_{c}_{s_idx}", int(demand[c])) for c in range(1, n) for s_idx in range(customers)]
            _add_leq_constraint(bqm, terms, int(capacity), lam, f"cap_{v}")
        # Contiguous slots penalty: if slot s+1 is used then slot s must be used
        for v in range(vehicles):
            for s_idx in range(customers - 1):
                for c2 in range(1, n):
                    bqm.add_linear(f"x_{v}_{c2}_{s_idx + 1}", lam)
                    for c1 in range(1, n):
                        bqm.add_quadratic(f"x_{v}_{c2}_{s_idx + 1}", f"x_{v}_{c1}_{s_idx}", -lam)
        # Objective: depot -> slot 0, slot s -> slot s+1, last slot -> depot
        for v in range(vehicles):
            for c in range(1, n):
                # depot -> first stop
                bqm.add_linear(f"x_{v}_{c}_0", float(dist[0][c]))
                # last possible stop -> depot
                bqm.add_linear(f"x_{v}_{c}_{customers - 1}", float(dist[c][0]))
            for s_idx in range(customers - 1):
                for c1 in range(1, n):
                    # If c1 is at s_idx and NO customer is at s_idx+1, return to depot: dist[c1][0] * x_{v,c1,s} * (1 - sum x_{v,c2,s+1})
                    bqm.add_linear(f"x_{v}_{c1}_{s_idx}", float(dist[c1][0]))
                    for c2 in range(1, n):
                        w = float(dist[c1][c2] - dist[c1][0])
                        bqm.add_quadratic(f"x_{v}_{c1}_{s_idx}", f"x_{v}_{c2}_{s_idx + 1}", w)
        return bqm

    def verify(sample: Dict[str, int]) -> Tuple[bool, float]:
        visited = []
        total_dist = 0.0
        for v in range(vehicles):
            route = []
            saw_empty = False
            for s_idx in range(customers):
                at_slot = [c for c in range(1, n) if sample.get(f"x_{v}_{c}_{s_idx}", 0) == 1]
                if len(at_slot) > 1:
                    return False, 0.0
                if len(at_slot) == 0:
                    saw_empty = True
                else:
                    if saw_empty:
                        return False, 0.0
                    route.append(at_slot[0])
            if sum(demand[c] for c in route) > capacity:
                return False, 0.0
            visited.extend(route)
            if route:
                path = [0] + route + [0]
                total_dist += sum(dist[path[k]][path[k + 1]] for k in range(len(path) - 1))
        if sorted(visited) != list(range(1, n)):
            return False, 0.0
        return True, float(total_dist)

    def solve_ortools(seed: int) -> Tuple[str, Optional[float], float]:
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        # Multi-vehicle arc model with MTZ capacity loads
        x = {}
        for v in range(vehicles):
            for i in range(n):
                for j in range(n):
                    if i != j:
                        x[(v, i, j)] = m.NewBoolVar(f"x_{v}_{i}_{j}")
        # Each customer visited exactly once
        for j in range(1, n):
            m.Add(sum(x[(v, i, j)] for v in range(vehicles) for i in range(n) if i != j) == 1)
        # Flow conservation per vehicle and node
        for v in range(vehicles):
            for k in range(n):
                m.Add(
                    sum(x[(v, i, k)] for i in range(n) if i != k)
                    == sum(x[(v, k, j)] for j in range(n) if j != k)
                )
            # Each vehicle leaves depot at most once
            m.Add(sum(x[(v, 0, j)] for j in range(1, n)) <= 1)
            # MTZ cumulative load variables u_{v,i} in [demand[i], capacity]
            u = {i: m.NewIntVar(0, capacity, f"u_{v}_{i}") for i in range(1, n)}
            for i in range(1, n):
                used_i = sum(x[(v, k, i)] for k in range(n) if k != i)
                m.Add(u[i] >= demand[i] * used_i)
                m.Add(u[i] <= capacity * used_i)
            for i in range(1, n):
                for j in range(1, n):
                    if i != j:
                        m.Add(u[j] >= u[i] + demand[j]).OnlyEnforceIf(x[(v, i, j)])

        m.Minimize(sum(dist[i][j] * var for (v, i, j), var in x.items()))
        s = cp_model.CpSolver()
        s.parameters.random_seed = seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 60.0
        status = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        ok = status in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        return s.StatusName(status), (float(round(s.ObjectiveValue(), 6)) if ok else None), ms

    def map_cp_to_bqm(cp_sol: Dict[str, int]) -> Dict[str, int]:
        out = {f"x_{v}_{c}_{s_idx}": 0 for v in range(vehicles) for c in range(1, n) for s_idx in range(customers)}
        for v in range(vehicles):
            nxt = {}
            for i in range(n):
                for j in range(n):
                    if i != j and cp_sol.get(f"x_{v}_{i}_{j}", 0) == 1:
                        nxt[i] = j
            cur = nxt.get(0, 0)
            slot = 0
            while cur != 0 and slot < customers:
                out[f"x_{v}_{cur}_{slot}"] = 1
                cur = nxt.get(cur, 0)
                slot += 1
        return out

    return make_bqm, verify, solve_ortools, base_penalty, map_cp_to_bqm


BUILDERS = {
    "Assignment": build_assignment_models,
    "Knapsack": build_knapsack_models,
    "Facility Location": build_facility_models,
    "Set Cover": build_set_cover_models,
    "TSP": build_tsp_models,
    "Vehicle Routing": build_cvrp_models,
}


def benchmark_problem(p: Dict[str, Any]) -> Dict[str, Any]:
    builder = BUILDERS[p["problemType"]]
    res = builder(p)
    if len(res) == 5:
        make_bqm, verify, solve_ortools, base_penalty, map_cp_to_bqm = res
    else:
        make_bqm, verify, solve_ortools, base_penalty = res
        map_cp_to_bqm = None
    return run_benchmark(p, make_bqm, verify, solve_ortools, base_penalty, map_cp_to_bqm=map_cp_to_bqm)


def main():
    lib = json.loads(LIB_IN.read_text())
    results = []
    print(f"Running hardened benchmark protocol on {len(lib['problems'])} Logistics problems (N={len(SEEDS)} held-out seeds)...\n")
    for p in lib["problems"]:
        r = benchmark_problem(p)
        results.append(r)
        q = r["qubo"]
        c = r["classical"]
        eq = r["equivalenceCheck"]
        st = r["structure"]
        print(
            f"{r['slug']:28s} vars={r['quboVars']:4d} (slk={st['slackVars']:2d}, dens={st['densityPct']:5.1f}%) "
            f"eq={'OK' if eq['passed'] else 'FAIL'} | "
            f"OR={str(c['bestObjective']):6s} ({c['solveTimeMs']:5.1f}ms) | "
            f"SA med={str(q['medianObjective']):6s} ({q['medianGapVsBestKnownPct']}%) best={str(q['bestObjective']):6s} "
            f"feas={q['feasibleRuns']}/{q['totalRuns']} ({str(q['solveTimeMs']):6s}ms) => {r['verdict']}"
        )

    out_payload = {
        "industry": lib["industry"],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "environment": get_environment_manifest(),
        "maxQuboVars": MAX_QUBO_VARS,
        "benchmarks": results,
    }
    BENCH_OUT.write_text(json.dumps(out_payload, indent=2) + "\n")
    print(f"\nWrote {len(results)} hardened benchmarks -> {BENCH_OUT}")


if __name__ == "__main__":
    main()
