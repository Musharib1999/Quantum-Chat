"""
Construction Management Problem Library & Reproducible Benchmark Builder.

Generates 8 independently verified Construction Management problems across:
  - Project Planning (Bid Portfolio Selection, Time-Cost Activity Crashing, Site Layout QAP, Multi-Floor RCPSP)
  - Workforce Scheduling (Trade Crew Rostering with Stacking Penalties, Subcontractor Work-Package Assignment)
  - Equipment + Workforce (Crew & Heavy Equipment Co-Scheduling, Multi-Site Fleet & Crew Dispatch)

Every best-known optimum is proven by Google OR-Tools CP-SAT (status == OPTIMAL)
and benchmarked under the exact Phase 1/2 protocol (N=5 fixed seeds, 4-point λ sweep,
explicit 150-variable QUBO cap, D-Wave Simulated Annealing labeled as classical software).

Usage:  python3 quantum-backend/benchmarks/build_construction_library.py
Output:
  - src/data/problemLibrary/construction.json
  - src/data/problemLibrary/construction_benchmarks.json
"""
from __future__ import annotations

import json
import random
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import dimod
from ortools.sat.python import cp_model

from benchmark_harness import (
    EVAL_SEEDS as SEEDS,
    MAX_QUBO_VARS,
    add_leq as _add_leq,
    fmt_matrix,
    get_environment_manifest,
    run_benchmark,
    tier_for,
)

ROOT = Path(__file__).resolve().parents[2]
LIB_OUT = ROOT / "src" / "data" / "problemLibrary" / "construction.json"
BENCH_OUT = ROOT / "src" / "data" / "problemLibrary" / "construction_benchmarks.json"

INDUSTRY = "Construction"


# ───────────────────────── 1. Bid Portfolio Selection (Quadratic Knapsack) ─────────────────────────

def make_bid_portfolio(slug: str, title: str, n: int, seed: int):
    rng = random.Random(seed)
    bond = [rng.randint(4, 15) for _ in range(n)]
    margin = [rng.randint(14, 48) for _ in range(n)]
    cap = int(sum(bond) * 0.52)

    # Pairwise mobilization synergies when two nearby tenders share equipment yards
    synergies: List[Tuple[int, int, int]] = []
    for i in range(n):
        for j in range(i + 1, n):
            if rng.random() < 0.22:
                synergies.append((i, j, rng.randint(4, 14)))

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        x = [m.NewBoolVar(f"bid_{i}") for i in range(n)]
        m.Add(sum(bond[i] * x[i] for i in range(n)) <= cap)
        quad_terms = []
        for idx, (i, j, val) in enumerate(synergies):
            z = m.NewBoolVar(f"syn_{idx}")
            m.Add(z <= x[i])
            m.Add(z <= x[j])
            m.Add(z >= x[i] + x[j] - 1)
            quad_terms.append(val * z)
        m.Maximize(sum(margin[i] * x[i] for i in range(n)) + sum(quad_terms))
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        return s.StatusName(st), (int(round(s.ObjectiveValue())) if st in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None), ms

    status, opt, _ = solve_cp(SEEDS[0])
    assert status == "OPTIMAL" and opt is not None

    def make_bqm(penalty: float) -> dimod.BinaryQuadraticModel:
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(n):
            bqm.add_variable(f"bid_{i}", -float(margin[i]))
        for i, j, val in synergies:
            bqm.add_interaction(f"bid_{i}", f"bid_{j}", -float(val))
        _add_leq(bqm, [(f"bid_{i}", bond[i]) for i in range(n)], cap, penalty, "bonding_cap")
        return bqm

    def verify(sample: Dict[str, int]) -> Tuple[bool, float]:
        used = sum(bond[i] * sample.get(f"bid_{i}", 0) for i in range(n))
        if used > cap:
            return False, 0.0
        obj = sum(margin[i] * sample.get(f"bid_{i}", 0) for i in range(n))
        obj += sum(val * sample.get(f"bid_{i}", 0) * sample.get(f"bid_{j}", 0) for i, j, val in synergies)
        return True, float(obj)

    syn_str = ", ".join(f"(Tender {i}, Tender {j}: +{v})" for i, j, v in synergies)
    prompt = (
        f"Construction Bid Portfolio Selection: choose which of {n} construction tenders to bid on to maximize total "
        f"expected net margin plus pairwise equipment-mobilization synergies, without exceeding the firm's bonding capacity "
        f"of {cap} ($M). Decision variables bid_0..bid_{n-1} are binary.\n"
        f"- Bonding requirements ($M): {bond}\n"
        f"- Expected net margins ($100k): {margin}\n"
        f"- Pairwise mobilization synergies ($100k): {syn_str}\n"
        f"- Bonding limit: sum(bond[i] * bid_i) <= {cap}."
    )
    qubo_vars = len(make_bqm(float(max(margin))).variables)
    p = {
        "slug": slug,
        "title": title,
        "industry": INDUSTRY,
        "problemType": "Project Planning",
        "description": f"Select from {n} construction tenders under a ${cap}M bonding cap while capturing pairwise mobilization synergies.",
        "objectiveSense": "Maximize",
        "estimatedBinaryVars": qubo_vars,
        "sizeTier": tier_for(qubo_vars),
        "prompt": prompt,
        "data": {
            "tenders": n,
            "bondingCapacityM": cap,
            "bondingRequirementsM": bond,
            "netMargins100k": margin,
            "synergies": [{"i": i, "j": j, "bonus": v} for i, j, v in synergies],
            "rngSeed": seed,
        },
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max(margin) + 15))


# ───────────────────────── 2. Time-Cost Activity Crashing (Multiple-Choice Knapsack) ─────────────────────────

def make_time_cost_crashing(slug: str, title: str, n_acts: int, seed: int):
    rng = random.Random(seed)
    act_names = [
        "Site Clearing & Excavation",
        "Deep Foundation & Piling",
        "Structural Steel Erection",
        "Concrete Core & Decking",
        "Facade & Curtain Wall",
        "MEP Rough-In",
        "Interior Framing & Finishes",
        "Systems Commissioning",
    ][:n_acts]
    modes = ["Normal", "Fast", "Crash"]

    durations: List[List[int]] = []
    costs: List[List[int]] = []
    for _ in range(n_acts):
        d_norm = rng.randint(10, 18)
        d_fast = max(5, d_norm - rng.randint(2, 4))
        d_crash = max(3, d_fast - rng.randint(2, 3))
        c_norm = rng.randint(20, 50)
        c_fast = c_norm + rng.randint(8, 18)
        c_crash = c_fast + rng.randint(12, 26)
        durations.append([d_norm, d_fast, d_crash])
        costs.append([c_norm, c_fast, c_crash])

    min_total_days = sum(d[2] for d in durations)
    max_total_days = sum(d[0] for d in durations)
    deadline_days = min_total_days + int((max_total_days - min_total_days) * 0.42)

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        x = [[m.NewBoolVar(f"mode_{a}_{k}") for k in range(3)] for a in range(n_acts)]
        for a in range(n_acts):
            m.Add(sum(x[a]) == 1)
        m.Add(sum(durations[a][k] * x[a][k] for a in range(n_acts) for k in range(3)) <= deadline_days)
        m.Minimize(sum(costs[a][k] * x[a][k] for a in range(n_acts) for k in range(3)))
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        return s.StatusName(st), (int(round(s.ObjectiveValue())) if st in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None), ms

    status, opt, _ = solve_cp(SEEDS[0])
    assert status == "OPTIMAL" and opt is not None

    def make_bqm(penalty: float) -> dimod.BinaryQuadraticModel:
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for a in range(n_acts):
            for k in range(3):
                bqm.add_variable(f"mode_{a}_{k}", float(costs[a][k]))
            bqm.add_linear_equality_constraint(
                [(f"mode_{a}_{k}", 1) for k in range(3)], lagrange_multiplier=penalty * 2.0, constant=-1
            )
        _add_leq(
            bqm,
            [(f"mode_{a}_{k}", durations[a][k]) for a in range(n_acts) for k in range(3)],
            deadline_days,
            penalty,
            "deadline",
        )
        return bqm

    def verify(sample: Dict[str, int]) -> Tuple[bool, float]:
        for a in range(n_acts):
            if sum(sample.get(f"mode_{a}_{k}", 0) for k in range(3)) != 1:
                return False, 0.0
        total_days = sum(durations[a][k] * sample.get(f"mode_{a}_{k}", 0) for a in range(n_acts) for k in range(3))
        if total_days > deadline_days:
            return False, 0.0
        total_cost = sum(costs[a][k] * sample.get(f"mode_{a}_{k}", 0) for a in range(n_acts) for k in range(3))
        return True, float(total_cost)

    rows_desc = "; ".join(
        f"{act_names[a]}: Normal({durations[a][0]}d, ${costs[a][0]}k), Fast({durations[a][1]}d, ${costs[a][1]}k), Crash({durations[a][2]}d, ${costs[a][2]}k)"
        for a in range(n_acts)
    )
    prompt = (
        f"Construction Time-Cost Activity Crashing: select exactly one execution mode (0=Normal, 1=Fast, 2=Crash) "
        f"for each of {n_acts} sequential critical-path activities to minimize total direct and crashing cost ($k) "
        f"while completing the project within {deadline_days} days. Binary variables mode_a_k indicate activity a in mode k.\n"
        f"- Activity modes (duration, cost): {rows_desc}\n"
        f"- Constraints: sum_k mode_a_k = 1 for every activity a; total duration <= {deadline_days} days."
    )
    qubo_vars = len(make_bqm(100.0).variables)
    p = {
        "slug": slug,
        "title": title,
        "industry": INDUSTRY,
        "problemType": "Project Planning",
        "description": f"Choose Normal, Fast, or Crash execution modes across {n_acts} critical-path activities to hit a {deadline_days}-day deadline at minimum cost.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": qubo_vars,
        "sizeTier": tier_for(qubo_vars),
        "prompt": prompt,
        "data": {
            "activities": act_names,
            "modes": modes,
            "durationsDays": durations,
            "costsK": costs,
            "deadlineDays": deadline_days,
            "rngSeed": seed,
        },
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max(max(r) for r in costs)))


# ───────────────────────── 3. Site Layout Planning (Quadratic Assignment Problem) ─────────────────────────

def make_site_layout_qap(slug: str, title: str, n: int, seed: int):
    rng = random.Random(seed)
    fac_names = [
        "Concrete Batch Plant",
        "Tower Crane Base",
        "Rebar Fabrication Yard",
        "Steel Laydown Area",
        "MEP Staging Depot",
        "Site Management Office",
    ][:n]

    # Symmetric material-handling trips/day between facilities
    flow = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            v = rng.randint(1, 10)
            flow[i][j] = flow[j][i] = v

    # Symmetric walking/hauling distances (10m units) between site zones
    coords = [(rng.randint(0, 12), rng.randint(0, 12)) for _ in range(n)]
    dist = [[0] * n for _ in range(n)]
    for p_idx in range(n):
        for q_idx in range(p_idx + 1, n):
            d = abs(coords[p_idx][0] - coords[q_idx][0]) + abs(coords[p_idx][1] - coords[q_idx][1]) + 1
            dist[p_idx][q_idx] = dist[q_idx][p_idx] = d

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        x = [[m.NewBoolVar(f"place_{i}_{p_idx}") for p_idx in range(n)] for i in range(n)]
        for i in range(n):
            m.Add(sum(x[i]) == 1)
        for p_idx in range(n):
            m.Add(sum(x[i][p_idx] for i in range(n)) == 1)
        terms = []
        for i in range(n):
            for j in range(i + 1, n):
                f_ij = flow[i][j]
                if f_ij == 0:
                    continue
                for p_idx in range(n):
                    for q_idx in range(n):
                        if p_idx == q_idx:
                            continue
                        z = m.NewBoolVar(f"z_{i}_{j}_{p_idx}_{q_idx}")
                        m.Add(z <= x[i][p_idx])
                        m.Add(z <= x[j][q_idx])
                        m.Add(z >= x[i][p_idx] + x[j][q_idx] - 1)
                        terms.append(f_ij * dist[p_idx][q_idx] * z)
        m.Minimize(sum(terms))
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        return s.StatusName(st), (int(round(s.ObjectiveValue())) if st in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None), ms

    status, opt, _ = solve_cp(SEEDS[0])
    assert status == "OPTIMAL" and opt is not None

    def make_bqm(penalty: float) -> dimod.BinaryQuadraticModel:
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(n):
            for p_idx in range(n):
                bqm.add_variable(f"place_{i}_{p_idx}", 0.0)
        for i in range(n):
            for j in range(i + 1, n):
                f_ij = flow[i][j]
                for p_idx in range(n):
                    for q_idx in range(n):
                        if p_idx != q_idx:
                            bqm.add_interaction(f"place_{i}_{p_idx}", f"place_{j}_{q_idx}", float(f_ij * dist[p_idx][q_idx]))
        for i in range(n):
            bqm.add_linear_equality_constraint(
                [(f"place_{i}_{p_idx}", 1) for p_idx in range(n)], lagrange_multiplier=penalty, constant=-1
            )
        for p_idx in range(n):
            bqm.add_linear_equality_constraint(
                [(f"place_{i}_{p_idx}", 1) for i in range(n)], lagrange_multiplier=penalty, constant=-1
            )
        return bqm

    def verify(sample: Dict[str, int]) -> Tuple[bool, float]:
        for i in range(n):
            if sum(sample.get(f"place_{i}_{p_idx}", 0) for p_idx in range(n)) != 1:
                return False, 0.0
        for p_idx in range(n):
            if sum(sample.get(f"place_{i}_{p_idx}", 0) for i in range(n)) != 1:
                return False, 0.0
        obj = 0
        for i in range(n):
            for j in range(i + 1, n):
                for p_idx in range(n):
                    if not sample.get(f"place_{i}_{p_idx}", 0):
                        continue
                    for q_idx in range(n):
                        if p_idx != q_idx and sample.get(f"place_{j}_{q_idx}", 0):
                            obj += flow[i][j] * dist[p_idx][q_idx]
        return True, float(obj)

    prompt = (
        f"Construction Site Layout Planning (Quadratic Assignment): place {n} temporary site facilities "
        f"({', '.join(fac_names)}) one-to-one into {n} site zones (0..{n-1}) to minimize total daily material-hauling "
        f"flow times distance. Binary variable place_i_p = 1 if facility i is placed in zone p.\n"
        f"- Material flow matrix (trips/day): {fmt_matrix(flow, 'Fac')}\n"
        f"- Zone distance matrix (10m units): {fmt_matrix(dist, 'Zone')}\n"
        f"- Constraints: each facility placed in exactly 1 zone, and each zone hosts exactly 1 facility."
    )
    p = {
        "slug": slug,
        "title": title,
        "industry": INDUSTRY,
        "problemType": "Project Planning",
        "description": f"Assign {n} temporary construction site facilities to {n} zones to minimize quadratic material-hauling flow × distance.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": n * n,
        "sizeTier": tier_for(n * n),
        "prompt": prompt,
        "data": {"facilities": fac_names, "zones": n, "flowMatrix": flow, "distanceMatrix": dist, "rngSeed": seed},
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    max_term = max(max(r) for r in flow) * max(max(r) for r in dist)
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max_term * 2))


# ───────────────────────── 4. Trade Crew Rostering with Stacking Penalties ─────────────────────────

def make_trade_rostering(slug: str, title: str, n_crews: int, n_shifts: int, seed: int):
    rng = random.Random(seed)
    crews = ["Concrete", "Structural Steel", "Electrical", "Plumbing", "HVAC", "Drywall"][:n_crews]
    cost = [[rng.randint(14, 42) for _ in range(n_shifts)] for _ in range(n_crews)]
    # Exact demand per shift summing to n_crews (e.g. [2, 2, 1, 1])
    req = [n_crews // n_shifts] * n_shifts
    for k in range(n_crews - sum(req)):
        req[k] += 1

    # Quadratic trade-stacking congestion penalties for conflicting trades on the same shift
    stack_penalties = [
        (0, 2, 18),  # Concrete + Electrical
        (1, 5, 22),  # Structural Steel + Drywall
        (2, 3, 14),  # Electrical + Plumbing
        (3, 4, 16),  # Plumbing + HVAC
        (0, 5, 20),  # Concrete + Drywall
        (1, 2, 15),  # Steel + Electrical
    ]

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        x = [[m.NewBoolVar(f"crew_{i}_{t}") for t in range(n_shifts)] for i in range(n_crews)]
        for i in range(n_crews):
            m.Add(sum(x[i]) == 1)
        for t in range(n_shifts):
            m.Add(sum(x[i][t] for i in range(n_crews)) == req[t])
        stack_terms = []
        for idx, (i, j, pen) in enumerate(stack_penalties):
            for t in range(n_shifts):
                z = m.NewBoolVar(f"stk_{idx}_{t}")
                m.Add(z <= x[i][t])
                m.Add(z <= x[j][t])
                m.Add(z >= x[i][t] + x[j][t] - 1)
                stack_terms.append(pen * z)
        m.Minimize(sum(cost[i][t] * x[i][t] for i in range(n_crews) for t in range(n_shifts)) + sum(stack_terms))
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        return s.StatusName(st), (int(round(s.ObjectiveValue())) if st in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None), ms

    status, opt, _ = solve_cp(SEEDS[0])
    assert status == "OPTIMAL" and opt is not None

    def make_bqm(penalty: float) -> dimod.BinaryQuadraticModel:
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(n_crews):
            for t in range(n_shifts):
                bqm.add_variable(f"crew_{i}_{t}", float(cost[i][t]))
        for i, j, pen in stack_penalties:
            for t in range(n_shifts):
                bqm.add_interaction(f"crew_{i}_{t}", f"crew_{j}_{t}", float(pen))
        for i in range(n_crews):
            bqm.add_linear_equality_constraint(
                [(f"crew_{i}_{t}", 1) for t in range(n_shifts)], lagrange_multiplier=penalty, constant=-1
            )
        for t in range(n_shifts):
            bqm.add_linear_equality_constraint(
                [(f"crew_{i}_{t}", 1) for i in range(n_crews)], lagrange_multiplier=penalty, constant=-req[t]
            )
        return bqm

    def verify(sample: Dict[str, int]) -> Tuple[bool, float]:
        for i in range(n_crews):
            if sum(sample.get(f"crew_{i}_{t}", 0) for t in range(n_shifts)) != 1:
                return False, 0.0
        for t in range(n_shifts):
            if sum(sample.get(f"crew_{i}_{t}", 0) for i in range(n_crews)) != req[t]:
                return False, 0.0
        obj = sum(cost[i][t] * sample.get(f"crew_{i}_{t}", 0) for i in range(n_crews) for t in range(n_shifts))
        for i, j, pen in stack_penalties:
            for t in range(n_shifts):
                obj += pen * sample.get(f"crew_{i}_{t}", 0) * sample.get(f"crew_{j}_{t}", 0)
        return True, float(obj)

    stk_desc = ", ".join(f"({crews[i]} + {crews[j]}: +{pen})" for i, j, pen in stack_penalties)
    prompt = (
        f"Trade Crew Rostering with Congestion Penalties: assign {n_crews} trade crews ({', '.join(crews)}) to "
        f"{n_shifts} floor shift windows so every crew works exactly 1 shift and shift staffing matches {req}, "
        f"minimizing shift labor cost plus pairwise trade-stacking congestion penalties when conflicting trades share a shift.\n"
        f"- Shift cost matrix ($k): {fmt_matrix(cost, 'Crew')}\n"
        f"- Same-shift trade-stacking penalties: {stk_desc}."
    )
    p = {
        "slug": slug,
        "title": title,
        "industry": INDUSTRY,
        "problemType": "Workforce Scheduling",
        "description": f"Roster {n_crews} trade crews across {n_shifts} shifts while minimizing labor cost and quadratic trade-stacking congestion penalties.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": n_crews * n_shifts,
        "sizeTier": tier_for(n_crews * n_shifts),
        "prompt": prompt,
        "data": {
            "crews": crews,
            "shifts": n_shifts,
            "shiftDemand": req,
            "costMatrix": cost,
            "stackingPenalties": [{"crewA": crews[i], "crewB": crews[j], "penalty": pen} for i, j, pen in stack_penalties],
            "rngSeed": seed,
        },
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max(max(r) for r in cost) + 30))


# ───────────────────────── 5. Crew & Heavy Equipment Co-Scheduling ─────────────────────────

def make_crew_equipment_cosched(slug: str, title: str, n_tasks: int, n_slots: int, seed: int):
    rng = random.Random(seed)
    tasks = [
        "T0: Footing Excavation (Excavator + EarthCrew)",
        "T1: Trenching & Utilities (Excavator + EarthCrew)",
        "T2: Structural Steel Lift A (TowerCrane + IronCrew)",
        "T3: Precast Panel Lift (TowerCrane + RiggingCrew)",
        "T4: Slab Concrete Pour (ConcretePump + ConcreteCrew)",
        "T5: Structural Steel Lift B (TowerCrane + IronCrew)",
        "T6: Curtain Wall Hoist (TowerCrane + GlazingCrew)",
        "T7: Backfill & Grading (Excavator + EarthCrew)",
    ][:n_tasks]

    cost = [[rng.randint(15, 55) + t * 3 for t in range(n_slots)] for _ in range(n_tasks)]

    # Shared resource conflict groups (no two tasks in the same group may share a shift slot)
    resource_groups = {
        "TowerCrane": [2, 3, 5, 6],
        "Excavator_EarthCrew": [0, 1, 7],
    }
    conflict_pairs: List[Tuple[int, int]] = []
    for grp in resource_groups.values():
        for idx_a in range(len(grp)):
            for idx_b in range(idx_a + 1, len(grp)):
                conflict_pairs.append((grp[idx_a], grp[idx_b]))

    # Precedence: (a, b) means task a must finish in an earlier slot than task b (slot_a < slot_b)
    precedences = [(0, 2), (2, 5), (4, 6), (1, 7)]

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        x = [[m.NewBoolVar(f"sched_{i}_{t}") for t in range(n_slots)] for i in range(n_tasks)]
        for i in range(n_tasks):
            m.Add(sum(x[i]) == 1)
        for i, j in conflict_pairs:
            for t in range(n_slots):
                m.Add(x[i][t] + x[j][t] <= 1)
        for a, b in precedences:
            for t1 in range(n_slots):
                for t2 in range(t1 + 1):
                    m.Add(x[a][t1] + x[b][t2] <= 1)
        m.Minimize(sum(cost[i][t] * x[i][t] for i in range(n_tasks) for t in range(n_slots)))
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        return s.StatusName(st), (int(round(s.ObjectiveValue())) if st in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None), ms

    status, opt, _ = solve_cp(SEEDS[0])
    assert status == "OPTIMAL" and opt is not None

    def make_bqm(penalty: float) -> dimod.BinaryQuadraticModel:
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(n_tasks):
            for t in range(n_slots):
                bqm.add_variable(f"sched_{i}_{t}", float(cost[i][t]))
            bqm.add_linear_equality_constraint(
                [(f"sched_{i}_{t}", 1) for t in range(n_slots)], lagrange_multiplier=penalty, constant=-1
            )
        for i, j in conflict_pairs:
            for t in range(n_slots):
                bqm.add_interaction(f"sched_{i}_{t}", f"sched_{j}_{t}", penalty)
        for a, b in precedences:
            for t1 in range(n_slots):
                for t2 in range(t1 + 1):
                    bqm.add_interaction(f"sched_{a}_{t1}", f"sched_{b}_{t2}", penalty)
        return bqm

    def verify(sample: Dict[str, int]) -> Tuple[bool, float]:
        slot_of = []
        for i in range(n_tasks):
            ones = [t for t in range(n_slots) if sample.get(f"sched_{i}_{t}", 0) == 1]
            if len(ones) != 1:
                return False, 0.0
            slot_of.append(ones[0])
        for i, j in conflict_pairs:
            if slot_of[i] == slot_of[j]:
                return False, 0.0
        for a, b in precedences:
            if not (slot_of[a] < slot_of[b]):
                return False, 0.0
        obj = sum(cost[i][slot_of[i]] for i in range(n_tasks))
        return True, float(obj)

    prompt = (
        f"Crew & Heavy Equipment Co-Scheduling: schedule {n_tasks} construction tasks across {n_slots} shift slots "
        f"(binary sched_i_t = 1 if task i runs in slot t) to minimize total mobilization and delay cost ($k).\n"
        f"- Tasks: {'; '.join(tasks)}\n"
        f"- Shared equipment/crew non-overlap groups (max 1 task per slot per group): TowerCrane={resource_groups['TowerCrane']}, Excavator+EarthCrew={resource_groups['Excavator_EarthCrew']}\n"
        f"- Precedence dependencies (slot_a < slot_b): {precedences}\n"
        f"- Cost matrix ($k): {fmt_matrix(cost, 'Task')}."
    )
    p = {
        "slug": slug,
        "title": title,
        "industry": INDUSTRY,
        "problemType": "Equipment + Workforce",
        "description": f"Co-schedule {n_tasks} site tasks across {n_slots} shifts respecting shared tower crane, excavator, crew non-overlap, and precedence.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": n_tasks * n_slots,
        "sizeTier": tier_for(n_tasks * n_slots),
        "prompt": prompt,
        "data": {
            "tasks": tasks,
            "slots": n_slots,
            "resourceGroups": resource_groups,
            "precedences": precedences,
            "costMatrix": cost,
            "rngSeed": seed,
        },
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max(max(r) for r in cost)))


# ───────────────────────── 6. Subcontractor Work-Package Assignment (GAP) ─────────────────────────

def make_subcontractor_assignment(slug: str, title: str, n_subs: int, n_pkgs: int, seed: int):
    rng = random.Random(seed)
    pkg_hours = [rng.randint(3, 8) for _ in range(n_pkgs)]
    total_hours = sum(pkg_hours)
    base_cap = max(max(pkg_hours) + 2, int((total_hours / n_subs) * 1.45))
    sub_caps = [base_cap + rng.randint(0, 3) for _ in range(n_subs)]
    cost = [[rng.randint(18, 65) for _ in range(n_pkgs)] for _ in range(n_subs)]

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        x = [[m.NewBoolVar(f"sub_{c}_{p_idx}") for p_idx in range(n_pkgs)] for c in range(n_subs)]
        for p_idx in range(n_pkgs):
            m.Add(sum(x[c][p_idx] for c in range(n_subs)) == 1)
        for c in range(n_subs):
            m.Add(sum(pkg_hours[p_idx] * x[c][p_idx] for p_idx in range(n_pkgs)) <= sub_caps[c])
        m.Minimize(sum(cost[c][p_idx] * x[c][p_idx] for c in range(n_subs) for p_idx in range(n_pkgs)))
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        return s.StatusName(st), (int(round(s.ObjectiveValue())) if st in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None), ms

    status, opt, _ = solve_cp(SEEDS[0])
    assert status == "OPTIMAL" and opt is not None

    def make_bqm(penalty: float) -> dimod.BinaryQuadraticModel:
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for c in range(n_subs):
            for p_idx in range(n_pkgs):
                bqm.add_variable(f"sub_{c}_{p_idx}", float(cost[c][p_idx]))
        for p_idx in range(n_pkgs):
            bqm.add_linear_equality_constraint(
                [(f"sub_{c}_{p_idx}", 1) for c in range(n_subs)], lagrange_multiplier=penalty * 2.0, constant=-1
            )
        for c in range(n_subs):
            _add_leq(
                bqm,
                [(f"sub_{c}_{p_idx}", pkg_hours[p_idx]) for p_idx in range(n_pkgs)],
                sub_caps[c],
                penalty,
                f"cap_{c}",
            )
        return bqm

    def verify(sample: Dict[str, int]) -> Tuple[bool, float]:
        for p_idx in range(n_pkgs):
            if sum(sample.get(f"sub_{c}_{p_idx}", 0) for c in range(n_subs)) != 1:
                return False, 0.0
        for c in range(n_subs):
            used = sum(pkg_hours[p_idx] * sample.get(f"sub_{c}_{p_idx}", 0) for p_idx in range(n_pkgs))
            if used > sub_caps[c]:
                return False, 0.0
        obj = sum(cost[c][p_idx] * sample.get(f"sub_{c}_{p_idx}", 0) for c in range(n_subs) for p_idx in range(n_pkgs))
        return True, float(obj)

    prompt = (
        f"Subcontractor Work-Package Assignment: assign {n_pkgs} construction work packages to {n_subs} trade "
        f"subcontractor crews (binary sub_c_p = 1 if crew c takes package p) to minimize total bid and mobilization cost ($k).\n"
        f"- Package crew-day workloads: {pkg_hours}\n"
        f"- Subcontractor crew-day capacity caps: {sub_caps}\n"
        f"- Bid cost matrix ($k): {fmt_matrix(cost, 'Sub')}\n"
        f"- Constraints: every package assigned to exactly 1 subcontractor; each subcontractor's total workload <= capacity."
    )
    qubo_vars = len(make_bqm(100.0).variables)
    p = {
        "slug": slug,
        "title": title,
        "industry": INDUSTRY,
        "problemType": "Workforce Scheduling",
        "description": f"Assign {n_pkgs} construction work packages across {n_subs} trade subcontractors under crew-day capacity caps.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": qubo_vars,
        "sizeTier": tier_for(qubo_vars),
        "prompt": prompt,
        "data": {
            "subcontractors": n_subs,
            "packages": n_pkgs,
            "packageCrewDays": pkg_hours,
            "subcontractorCaps": sub_caps,
            "bidCostMatrix": cost,
            "rngSeed": seed,
        },
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max(max(r) for r in cost)))


# ───────────────────────── 7. Multi-Floor RCPSP Schedule (Large within 150 QUBO vars) ─────────────────────────

def make_rcpsp_multifloor(slug: str, title: str, n_tasks: int, n_weeks: int, seed: int):
    rng = random.Random(seed)
    crew_req = [rng.randint(2, 4) for _ in range(n_tasks)]
    priority_weight = [rng.randint(3, 12) for _ in range(n_tasks)]
    weekly_crew_cap = 7

    # Multi-floor structural precedence DAG (task a must finish strictly before task b)
    precedences = [
        (0, 1), (0, 2), (1, 3), (2, 4), (3, 5), (4, 5), (5, 6), (5, 7), (6, 8), (7, 9),
    ]

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        x = [[m.NewBoolVar(f"wk_{i}_{t}") for t in range(n_weeks)] for i in range(n_tasks)]
        for i in range(n_tasks):
            m.Add(sum(x[i]) == 1)
        for a, b in precedences:
            for t1 in range(n_weeks):
                for t2 in range(t1 + 1):
                    m.Add(x[a][t1] + x[b][t2] <= 1)
        for t in range(n_weeks):
            m.Add(sum(crew_req[i] * x[i][t] for i in range(n_tasks)) <= weekly_crew_cap)
        m.Minimize(sum(priority_weight[i] * (t + 1) * x[i][t] for i in range(n_tasks) for t in range(n_weeks)))
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        return s.StatusName(st), (int(round(s.ObjectiveValue())) if st in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None), ms

    status, opt, _ = solve_cp(SEEDS[0])
    assert status == "OPTIMAL" and opt is not None

    def make_bqm(penalty: float) -> dimod.BinaryQuadraticModel:
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(n_tasks):
            for t in range(n_weeks):
                bqm.add_variable(f"wk_{i}_{t}", float(priority_weight[i] * (t + 1)))
            bqm.add_linear_equality_constraint(
                [(f"wk_{i}_{t}", 1) for t in range(n_weeks)], lagrange_multiplier=penalty * 2.0, constant=-1
            )
        for a, b in precedences:
            for t1 in range(n_weeks):
                for t2 in range(t1 + 1):
                    bqm.add_interaction(f"wk_{a}_{t1}", f"wk_{b}_{t2}", penalty * 2.0)
        for t in range(n_weeks):
            _add_leq(
                bqm,
                [(f"wk_{i}_{t}", crew_req[i]) for i in range(n_tasks)],
                weekly_crew_cap,
                penalty,
                f"wkcap_{t}",
            )
        return bqm

    def verify(sample: Dict[str, int]) -> Tuple[bool, float]:
        wk_of = []
        for i in range(n_tasks):
            ones = [t for t in range(n_weeks) if sample.get(f"wk_{i}_{t}", 0) == 1]
            if len(ones) != 1:
                return False, 0.0
            wk_of.append(ones[0])
        for a, b in precedences:
            if not (wk_of[a] < wk_of[b]):
                return False, 0.0
        for t in range(n_weeks):
            used = sum(crew_req[i] for i in range(n_tasks) if wk_of[i] == t)
            if used > weekly_crew_cap:
                return False, 0.0
        obj = sum(priority_weight[i] * (wk_of[i] + 1) for i in range(n_tasks))
        return True, float(obj)

    prompt = (
        f"Multi-Floor RCPSP Project Schedule: schedule {n_tasks} construction work packages across {n_weeks} weekly slots "
        f"(binary wk_i_t = 1 if task i executes in week t+1) to minimize priority-weighted completion time.\n"
        f"- Crew units required per task: {crew_req}\n"
        f"- Priority weights per task: {priority_weight}\n"
        f"- Weekly site crew capacity cap: {weekly_crew_cap} crew units\n"
        f"- Precedence arcs (week_a < week_b): {precedences}."
    )
    qubo_vars = len(make_bqm(100.0).variables)
    p = {
        "slug": slug,
        "title": title,
        "industry": INDUSTRY,
        "problemType": "Project Planning",
        "description": f"Schedule {n_tasks} multi-floor work packages over {n_weeks} weeks under precedence arcs and a {weekly_crew_cap}-crew weekly cap.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": qubo_vars,
        "sizeTier": tier_for(qubo_vars),
        "prompt": prompt,
        "data": {
            "tasks": n_tasks,
            "weeks": n_weeks,
            "crewRequirements": crew_req,
            "priorityWeights": priority_weight,
            "weeklyCrewCap": weekly_crew_cap,
            "precedences": precedences,
            "rngSeed": seed,
        },
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max(priority_weight) * n_weeks))


# ───────────────────────── 8. Multi-Site Fleet & Crew Dispatch (>150 QUBO vars) ─────────────────────────

def make_fleet_crew_dispatch(slug: str, title: str, m_units: int, n_sites: int, seed: int):
    rng = random.Random(seed)
    mobilization_cost = [rng.randint(35, 80) for _ in range(m_units)]
    dispatch_cost = [[rng.randint(10, 42) for _ in range(n_sites)] for _ in range(m_units)]

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        y = [m.NewBoolVar(f"deploy_{i}") for i in range(m_units)]
        x = [[m.NewBoolVar(f"assign_{i}_{j}") for j in range(n_sites)] for i in range(m_units)]
        for j in range(n_sites):
            m.Add(sum(x[i][j] for i in range(m_units)) == 1)
        for i in range(m_units):
            for j in range(n_sites):
                m.Add(x[i][j] <= y[i])
        m.Minimize(
            sum(mobilization_cost[i] * y[i] for i in range(m_units))
            + sum(dispatch_cost[i][j] * x[i][j] for i in range(m_units) for j in range(n_sites))
        )
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        return s.StatusName(st), (int(round(s.ObjectiveValue())) if st in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None), ms

    status, opt, _ = solve_cp(SEEDS[0])
    assert status == "OPTIMAL" and opt is not None

    def make_bqm(penalty: float) -> dimod.BinaryQuadraticModel:
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(m_units):
            bqm.add_variable(f"deploy_{i}", float(mobilization_cost[i]))
            for j in range(n_sites):
                bqm.add_variable(f"assign_{i}_{j}", float(dispatch_cost[i][j]))
                bqm.add_linear(f"assign_{i}_{j}", penalty)
                bqm.add_interaction(f"assign_{i}_{j}", f"deploy_{i}", -penalty)
        for j in range(n_sites):
            bqm.add_linear_equality_constraint(
                [(f"assign_{i}_{j}", 1) for i in range(m_units)], lagrange_multiplier=penalty, constant=-1
            )
        return bqm

    def verify(sample: Dict[str, int]) -> Tuple[bool, float]:
        for j in range(n_sites):
            if sum(sample.get(f"assign_{i}_{j}", 0) for i in range(m_units)) != 1:
                return False, 0.0
        for i in range(m_units):
            for j in range(n_sites):
                if sample.get(f"assign_{i}_{j}", 0) > sample.get(f"deploy_{i}", 0):
                    return False, 0.0
        obj = sum(mobilization_cost[i] * sample.get(f"deploy_{i}", 0) for i in range(m_units)) + sum(
            dispatch_cost[i][j] * sample.get(f"assign_{i}_{j}", 0) for i in range(m_units) for j in range(n_sites)
        )
        return True, float(obj)

    prompt = (
        f"Multi-Site Fleet & Crew Dispatch: decide which of {m_units} heavy equipment + certified operator units to "
        f"mobilize (binary deploy_i) and assign them to cover {n_sites} active construction sites (binary assign_i_j), "
        f"minimizing mobilization plus site-dispatch fuel and travel cost ($k).\n"
        f"- Unit mobilization costs ($k): {mobilization_cost}\n"
        f"- Dispatch cost matrix ($k): {fmt_matrix(dispatch_cost, 'Unit')}\n"
        f"- Constraints: every site served by exactly 1 unit; assign_i_j <= deploy_i."
    )
    qubo_vars = m_units + m_units * n_sites
    p = {
        "slug": slug,
        "title": title,
        "industry": INDUSTRY,
        "problemType": "Equipment + Workforce",
        "description": f"Mobilize and dispatch {m_units} equipment-operator units across {n_sites} active job sites at minimum mobilization + travel cost.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": qubo_vars,
        "sizeTier": tier_for(qubo_vars),
        "prompt": prompt,
        "data": {
            "equipmentCrewUnits": m_units,
            "sites": n_sites,
            "mobilizationCostK": mobilization_cost,
            "dispatchCostMatrixK": dispatch_cost,
            "rngSeed": seed,
        },
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max(mobilization_cost) + max(max(r) for r in dispatch_cost)))


def main():
    specs = [
        lambda: make_bid_portfolio("const-bid-portfolio-12", "Construction Bid Portfolio (12 tenders, synergy)", 12, 6101),
        lambda: make_time_cost_crashing("const-time-cost-8x3", "Time-Cost Activity Crashing (8 activities, 3 modes)", 8, 6102),
        lambda: make_site_layout_qap("const-site-layout-6x6", "Site Layout Planning (6 facilities, 6 zones)", 6, 6103),
        lambda: make_trade_rostering("const-trade-rostering-6x4", "Trade Crew Rostering (6 crews, 4 shifts)", 6, 4, 6201),
        lambda: make_crew_equipment_cosched("const-crew-equip-8x6", "Crew & Heavy Equipment Co-Scheduling (8 tasks, 6 slots)", 8, 6, 6301),
        lambda: make_subcontractor_assignment("const-subcontractor-6x10", "Subcontractor Package Assignment (6 crews, 10 packages)", 6, 10, 6202),
        lambda: make_rcpsp_multifloor("const-rcpsp-10x10", "Multi-Floor RCPSP Schedule (10 tasks, 10 weeks)", 10, 10, 6104),
        lambda: make_fleet_crew_dispatch("const-fleet-dispatch-12x14", "Multi-Site Fleet & Crew Dispatch (12 units, 14 sites)", 12, 14, 6302),
    ]

    problems = []
    benchmarks = []
    print(f"Generating & benchmarking {len(specs)} verified Construction problems (N={len(SEEDS)} seeds)...\n")
    for fn in specs:
        p, b = fn()
        problems.append(p)
        benchmarks.append(b)
        q, c = b["qubo"], b["classical"]
        eq = b["equivalenceCheck"]
        st = b["structure"]
        print(
            f"[{p['problemType']:21s}] {p['slug']:26s} vars={b['quboVars']:4d} (slk={st['slackVars']:2d}, dens={st['densityPct']:5.1f}%) "
            f"eq={'OK' if eq['passed'] else 'FAIL'} | "
            f"OR={str(c['bestObjective']):6s} ({c['solveTimeMs']:5.1f}ms) | "
            f"SA med={str(q['medianObjective']):6s} ({q['medianGapVsBestKnownPct']}%) best={str(q['bestObjective']):6s} "
            f"feas={q['feasibleRuns']}/{q['totalRuns']} ({str(q['solveTimeMs']):6s}ms) => {b['verdict']}"
        )

    LIB_OUT.write_text(json.dumps({"industry": INDUSTRY, "problems": problems}, indent=2) + "\n")
    BENCH_OUT.write_text(
        json.dumps(
            {
                "industry": INDUSTRY,
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "environment": get_environment_manifest(),
                "maxQuboVars": MAX_QUBO_VARS,
                "benchmarks": benchmarks,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"\nWrote {len(problems)} problems -> {LIB_OUT}")
    print(f"Wrote {len(benchmarks)} benchmarks -> {BENCH_OUT}")


if __name__ == "__main__":
    main()
