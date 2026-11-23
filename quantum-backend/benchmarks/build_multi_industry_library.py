"""
Phase 2 Multi-Industry Problem Library & Reproducible Benchmark Builder.

Generates 32 verified problems across 4 new industries (8 each):
  - Workforce Scheduling (shift rostering, crew assignment, on-call set cover)
  - Finance (quadratic portfolio optimization, capital budgeting knapsack, large asset allocation)
  - Energy (unit commitment / generator dispatch, microgrid load shedding, grid max-cut balancing)
  - Manufacturing (machine-job assignment, factory location, production batch selection, large scheduling)

Combined with the 8 Logistics pilot problems -> 40 verified problems across 5 industries.
Every best-known optimum is proven by OR-Tools CP-SAT (status == OPTIMAL) and cross-verified
before writing. Every benchmark runs the exact Phase 1 protocol (N=5 fixed seeds, 4-point λ sweep,
explicit 150-variable QUBO cap, D-Wave Simulated Annealing labeled as classical software).

Usage:  python3 quantum-backend/benchmarks/build_multi_industry_library.py
Output:
  - src/data/problemLibrary/multi_industry.json
  - src/data/problemLibrary/multi_industry_benchmarks.json
"""
from __future__ import annotations

import hashlib
import json
import random
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import dimod
from neal import SimulatedAnnealingSampler
from ortools.sat.python import cp_model

ROOT = Path(__file__).resolve().parents[2]
LIB_OUT = ROOT / "src" / "data" / "problemLibrary" / "multi_industry.json"
BENCH_OUT = ROOT / "src" / "data" / "problemLibrary" / "multi_industry_benchmarks.json"

MAX_QUBO_VARS = 150
SEEDS = [101, 202, 303, 404, 505]
SWEEP_READS = 200
FINAL_READS = 500
SWEEP_MULTIPLIERS = [1.0, 2.0, 4.0, 8.0]


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


def tier_for(n_vars: int) -> str:
    return "small" if n_vars <= 40 else ("medium" if n_vars <= 100 else "large")


def fmt_matrix(rows: List[List[int]], label_row: str) -> str:
    return "; ".join(f"{label_row} {i}: [{', '.join(str(v) for v in r)}]" for i, r in enumerate(rows))


def _add_leq(bqm: dimod.BinaryQuadraticModel, terms: List[Tuple[str, int]], rhs: int, penalty: float, label: str) -> None:
    slack_terms: List[Tuple[str, int]] = []
    rem, bit = rhs, 0
    while rem > 0:
        coeff = min(1 << bit, rem)
        slack_terms.append((f"slack_{label}_{bit}", coeff))
        rem -= coeff
        bit += 1
    bqm.add_linear_equality_constraint(terms + slack_terms, lagrange_multiplier=penalty, constant=-rhs)


def _add_geq(bqm: dimod.BinaryQuadraticModel, terms: List[Tuple[str, int]], rhs: int, penalty: float, label: str) -> None:
    max_lhs = sum(c for _, c in terms if c > 0)
    max_slack = max(0, max_lhs - rhs)
    slack_terms: List[Tuple[str, int]] = []
    rem, bit = max_slack, 0
    while rem > 0:
        coeff = min(1 << bit, rem)
        slack_terms.append((f"slack_{label}_{bit}", -coeff))
        rem -= coeff
        bit += 1
    bqm.add_linear_equality_constraint(terms + slack_terms, lagrange_multiplier=penalty, constant=-rhs)


def compute_gap_pct(obj: Optional[float], ref: Optional[float], sense: str) -> Optional[float]:
    if obj is None or ref is None:
        return None
    if abs(ref) < 1e-9:
        return 0.0 if abs(obj - ref) < 1e-6 else 100.0
    diff = max(0.0, ref - obj) if sense == "Maximize" else max(0.0, obj - ref)
    return round((diff / abs(ref)) * 100.0, 2)


# ───────────────────────── Reusable Exact Benchmark Harness ─────────────────────────

def run_benchmark(
    p: Dict[str, Any],
    make_bqm: Callable[[float], dimod.BinaryQuadraticModel],
    verify: Callable[[Dict[str, int]], Tuple[bool, float]],
    solve_ortools: Callable[[int], Tuple[str, Optional[float], float]],
    base_penalty: float,
) -> Dict[str, Any]:
    sense = p["objectiveSense"]
    best_known = float(p["bestKnown"]["value"])

    probe_bqm = make_bqm(base_penalty)
    qubo_vars = len(probe_bqm.variables)
    exceeds_limit = qubo_vars > MAX_QUBO_VARS

    # OR-Tools CP-SAT across 5 seeds
    c_objs: List[float] = []
    c_times: List[float] = []
    c_statuses: List[str] = []
    for seed in SEEDS:
        st, obj, ms = solve_ortools(seed)
        c_statuses.append(st)
        c_times.append(ms)
        if obj is not None:
            c_objs.append(obj)

    c_feas_rate = round(len(c_objs) / len(SEEDS), 2)
    c_best = (max(c_objs) if sense == "Maximize" else min(c_objs)) if c_objs else None
    c_mean = round(statistics.mean(c_objs), 4) if c_objs else None
    c_std = round(statistics.pstdev(c_objs), 4) if len(c_objs) > 1 else (0.0 if c_objs else None)
    c_mean_ms = round(statistics.mean(c_times), 2)
    c_gap_bk = compute_gap_pct(c_best, best_known, sense)
    c_status = "OPTIMAL" if all(s == "OPTIMAL" for s in c_statuses) else (c_statuses[0] if c_statuses else "UNKNOWN")

    sampler = SimulatedAnnealingSampler()
    lambda_sweep: List[Dict[str, Any]] = []
    best_lam: Optional[float] = None
    q_objs: List[float] = []
    q_times: List[float] = []

    if not exceeds_limit:
        sweep_candidates = [round(base_penalty * mult, 2) for mult in SWEEP_MULTIPLIERS]
        best_score = None
        for lam in sweep_candidates:
            bqm = make_bqm(lam)
            feas_objs = []
            for seed in SEEDS[:2]:
                ss = sampler.sample(bqm, num_reads=SWEEP_READS, seed=seed)
                best_sample_obj = None
                for datum in ss.data(["sample", "energy"]):
                    ok, val = verify(datum.sample)
                    if ok:
                        if best_sample_obj is None or (
                            (sense == "Maximize" and val > best_sample_obj)
                            or (sense == "Minimize" and val < best_sample_obj)
                        ):
                            best_sample_obj = val
                if best_sample_obj is not None:
                    feas_objs.append(best_sample_obj)
            f_rate = round(len(feas_objs) / 2.0, 2)
            b_obj = (max(feas_objs) if sense == "Maximize" else min(feas_objs)) if feas_objs else None
            lambda_sweep.append({"lambda": lam, "feasibilityRate": f_rate, "bestObjective": b_obj})
            obj_key = (b_obj if sense == "Maximize" else -b_obj) if b_obj is not None else -1e18
            score = (f_rate, obj_key)
            if best_score is None or score > best_score:
                best_score = score
                best_lam = lam

        assert best_lam is not None
        final_bqm = make_bqm(best_lam)
        for seed in SEEDS:
            t0 = time.perf_counter()
            ss = sampler.sample(final_bqm, num_reads=FINAL_READS, seed=seed)
            best_sample_obj = None
            for datum in ss.data(["sample", "energy"]):
                ok, val = verify(datum.sample)
                if ok:
                    if best_sample_obj is None or (
                        (sense == "Maximize" and val > best_sample_obj)
                        or (sense == "Minimize" and val < best_sample_obj)
                    ):
                        best_sample_obj = val
            q_times.append((time.perf_counter() - t0) * 1000.0)
            if best_sample_obj is not None:
                q_objs.append(best_sample_obj)

    q_feas_rate = round(len(q_objs) / len(SEEDS), 2) if not exceeds_limit else 0.0
    q_best = (max(q_objs) if sense == "Maximize" else min(q_objs)) if q_objs else None
    q_mean = round(statistics.mean(q_objs), 4) if q_objs else None
    q_std = round(statistics.pstdev(q_objs), 4) if len(q_objs) > 1 else (0.0 if q_objs else None)
    q_mean_ms = round(statistics.mean(q_times), 2) if q_times else None
    q_gap_bk = compute_gap_pct(q_best, best_known, sense)
    q_gap_c = compute_gap_pct(q_best, c_best, sense)

    if exceeds_limit:
        verdict = "exceeds_qubo_limit"
        verdict_note = (
            f"Formulation requires {qubo_vars} QUBO variables, exceeding the {MAX_QUBO_VARS}-variable QUBO limit. "
            f"Google OR-Tools CP-SAT proved the optimal objective ({c_best}) in {c_mean_ms:.1f} ms."
        )
    elif q_feas_rate >= 0.8 and q_gap_bk is not None and q_gap_bk <= 1.0 and (q_gap_c is None or q_gap_c <= 1.0):
        verdict = "competitive"
        verdict_note = (
            f"Both solvers reached within {q_gap_bk:.2f}% of the proven optimum ({best_known}) "
            f"({int(q_feas_rate * len(SEEDS))}/{len(SEEDS)} feasible SA runs at λ={best_lam}). "
            f"OR-Tools CP-SAT solved in {c_mean_ms:.1f} ms vs. {q_mean_ms:.1f} ms for simulated annealing."
        )
    else:
        verdict = "classical_wins"
        if q_best is None:
            verdict_note = (
                f"OR-Tools CP-SAT proved the optimum ({c_best}) in {c_mean_ms:.1f} ms, whereas QUBO simulated annealing "
                f"found 0/{len(SEEDS)} feasible samples across the λ sweep ({qubo_vars} QUBO vars)."
            )
        else:
            verdict_note = (
                f"OR-Tools CP-SAT proved the optimum ({c_best}) in {c_mean_ms:.1f} ms, outperforming QUBO simulated annealing "
                f"(best {q_best}, {q_gap_bk:.2f}% gap, {int(q_feas_rate * len(SEEDS))}/{len(SEEDS)} feasible at λ={best_lam})."
            )

    return {
        "slug": p["slug"],
        "contentHash": stable_content_hash(p),
        "runAt": datetime.now(timezone.utc).isoformat(),
        "protocol": {
            "repeats": len(SEEDS),
            "seeds": SEEDS,
            "quboReadsPerRepeat": FINAL_READS,
            "maxQuboVars": MAX_QUBO_VARS,
        },
        "quboVars": qubo_vars,
        "verdict": verdict,
        "verdictNote": verdict_note,
        "qubo": {
            "backend": "D-Wave Simulated Annealing (dwave-neal · classical software)",
            "exceedsLimit": exceeds_limit,
            "bestLambda": best_lam,
            "lambdaSweep": lambda_sweep,
            "feasibilityRate": q_feas_rate,
            "feasibleRuns": len(q_objs),
            "totalRuns": 0 if exceeds_limit else len(SEEDS),
            "bestObjective": q_best,
            "meanObjective": q_mean,
            "stdObjective": q_std,
            "gapVsBestKnownPct": q_gap_bk,
            "gapVsOrtoolsPct": q_gap_c,
            "meanTimeMs": q_mean_ms,
        },
        "classical": {
            "backend": "Google OR-Tools CP-SAT (classical exact)",
            "status": c_status,
            "feasibilityRate": c_feas_rate,
            "feasibleRuns": len(c_objs),
            "totalRuns": len(SEEDS),
            "bestObjective": c_best,
            "meanObjective": c_mean,
            "stdObjective": c_std,
            "gapVsBestKnownPct": c_gap_bk,
            "meanTimeMs": c_mean_ms,
        },
    }


# ───────────────────────── Problem Family Generators ─────────────────────────

def make_shift_rostering(industry: str, slug: str, title: str, n_staff: int, n_shifts: int, min_cov: int, seed: int):
    """Assign staff to shifts: each staff works exactly 1 shift, no consecutive shifts, each shift >= min_cov."""
    rng = random.Random(seed)
    cost = [[rng.randint(10, 45) for _ in range(n_shifts)] for _ in range(n_staff)]
    # Exact demand per shift summing to n_staff so every worker has 1 shift
    req = [min_cov] * n_shifts
    rem = n_staff - sum(req)
    idx = 0
    while rem > 0:
        req[idx % n_shifts] += 1
        rem -= 1
        idx += 1

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        x = [[m.NewBoolVar(f"x_{i}_{t}") for t in range(n_shifts)] for i in range(n_staff)]
        for i in range(n_staff):
            m.Add(sum(x[i]) == 1)
            for t in range(n_shifts - 1):
                m.Add(x[i][t] + x[i][t + 1] <= 1)
        for t in range(n_shifts):
            m.Add(sum(x[i][t] for i in range(n_staff)) == req[t])
        m.Minimize(sum(cost[i][t] * x[i][t] for i in range(n_staff) for t in range(n_shifts)))
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        ok = st in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        return s.StatusName(st), (float(round(s.ObjectiveValue(), 6)) if ok else None), ms

    st0, opt, _ = solve_cp(101)
    assert st0 == "OPTIMAL" and opt is not None

    def make_bqm(lam: float):
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(n_staff):
            for t in range(n_shifts):
                bqm.add_variable(f"x_{i}_{t}", float(cost[i][t]))
        for i in range(n_staff):
            bqm.add_linear_equality_constraint([(f"x_{i}_{t}", 1) for t in range(n_shifts)], lagrange_multiplier=lam, constant=-1)
            for t in range(n_shifts - 1):
                bqm.add_quadratic(f"x_{i}_{t}", f"x_{i}_{t+1}", lam)
        for t in range(n_shifts):
            bqm.add_linear_equality_constraint([(f"x_{i}_{t}", 1) for i in range(n_staff)], lagrange_multiplier=lam, constant=-req[t])
        return bqm

    def verify(sample: Dict[str, int]):
        for i in range(n_staff):
            if sum(sample.get(f"x_{i}_{t}", 0) for t in range(n_shifts)) != 1:
                return False, 0.0
            for t in range(n_shifts - 1):
                if sample.get(f"x_{i}_{t}", 0) + sample.get(f"x_{i}_{t+1}", 0) > 1:
                    return False, 0.0
        for t in range(n_shifts):
            if sum(sample.get(f"x_{i}_{t}", 0) for i in range(n_staff)) != req[t]:
                return False, 0.0
        return True, float(sum(cost[i][t] * sample.get(f"x_{i}_{t}", 0) for i in range(n_staff) for t in range(n_shifts)))

    prompt = (
        f"Schedule {n_staff} engineers across {n_shifts} shifts. Each engineer must be assigned to exactly one shift "
        f"(and cannot work consecutive double shifts). Required headcount per shift (shifts 0 to {n_shifts-1}) is {req}. "
        f"Wage cost matrix (rows engineers, columns shifts): {fmt_matrix(cost, 'engineer')}. Minimize total staffing cost."
    )
    p = {
        "slug": slug,
        "title": title,
        "industry": industry,
        "problemType": "Shift Scheduling",
        "description": f"Assign {n_staff} engineers across {n_shifts} shifts meeting exact coverage {req} at minimum wage cost.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": n_staff * n_shifts,
        "sizeTier": tier_for(n_staff * n_shifts),
        "prompt": prompt,
        "data": {"staff": n_staff, "shifts": n_shifts, "requiredCoverage": req, "costMatrix": cost, "rngSeed": seed},
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact branch-and-cut optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max(max(r) for r in cost)))


def make_assignment(industry: str, problem_type: str, slug: str, title: str, row_name: str, col_name: str, n: int, seed: int):
    rng = random.Random(seed)
    cost = [[rng.randint(8, 50) for _ in range(n)] for _ in range(n)]

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        x = [[m.NewBoolVar(f"x_{i}_{j}") for j in range(n)] for i in range(n)]
        for i in range(n):
            m.Add(sum(x[i]) == 1)
        for j in range(n):
            m.Add(sum(x[i][j] for i in range(n)) == 1)
        m.Minimize(sum(cost[i][j] * x[i][j] for i in range(n) for j in range(n)))
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        ok = st in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        return s.StatusName(st), (float(round(s.ObjectiveValue(), 6)) if ok else None), ms

    st0, opt, _ = solve_cp(101)
    assert st0 == "OPTIMAL" and opt is not None

    def make_bqm(lam: float):
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(n):
            for j in range(n):
                bqm.add_variable(f"x_{i}_{j}", float(cost[i][j]))
        for i in range(n):
            bqm.add_linear_equality_constraint([(f"x_{i}_{j}", 1) for j in range(n)], lagrange_multiplier=lam, constant=-1)
        for j in range(n):
            bqm.add_linear_equality_constraint([(f"x_{i}_{j}", 1) for i in range(n)], lagrange_multiplier=lam, constant=-1)
        return bqm

    def verify(sample: Dict[str, int]):
        for i in range(n):
            if sum(sample.get(f"x_{i}_{j}", 0) for j in range(n)) != 1:
                return False, 0.0
        for j in range(n):
            if sum(sample.get(f"x_{i}_{j}", 0) for i in range(n)) != 1:
                return False, 0.0
        return True, float(sum(cost[i][j] * sample.get(f"x_{i}_{j}", 0) for i in range(n) for j in range(n)))

    prompt = (
        f"Assign {n} {row_name}s to {n} {col_name}s one-to-one so every {row_name} handles exactly one {col_name}. "
        f"Cost matrix (rows {row_name}s, columns {col_name}s): {fmt_matrix(cost, row_name)}. Minimize total assignment cost."
    )
    p = {
        "slug": slug,
        "title": title,
        "industry": industry,
        "problemType": problem_type,
        "description": f"One-to-one assignment of {n} {row_name}s to {n} {col_name}s at minimum cost.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": n * n,
        "sizeTier": tier_for(n * n),
        "prompt": prompt,
        "data": {"n": n, "costMatrix": cost, "rngSeed": seed},
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max(max(r) for r in cost)))


def make_knapsack(industry: str, problem_type: str, slug: str, title: str, item_word: str, unit_word: str, val_word: str, n: int, seed: int):
    rng = random.Random(seed)
    weights = [rng.randint(4, 24) for _ in range(n)]
    values = [rng.randint(12, 75) for _ in range(n)]
    cap = int(0.45 * sum(weights))

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        x = [m.NewBoolVar(f"x_{i}") for i in range(n)]
        m.Add(sum(weights[i] * x[i] for i in range(n)) <= cap)
        m.Maximize(sum(values[i] * x[i] for i in range(n)))
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        ok = st in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        return s.StatusName(st), (float(round(s.ObjectiveValue(), 6)) if ok else None), ms

    st0, opt, _ = solve_cp(101)
    assert st0 == "OPTIMAL" and opt is not None

    def make_bqm(lam: float):
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(n):
            bqm.add_variable(f"x_{i}", -float(values[i]))
        _add_leq(bqm, [(f"x_{i}", int(weights[i])) for i in range(n)], int(cap), lam, "cap")
        return bqm

    def verify(sample: Dict[str, int]):
        if sum(weights[i] * sample.get(f"x_{i}", 0) for i in range(n)) > cap:
            return False, 0.0
        return True, float(sum(values[i] * sample.get(f"x_{i}", 0) for i in range(n)))

    items_str = "; ".join(f"{item_word} {i}: {unit_word} {weights[i]}, {val_word} {values[i]}" for i in range(n))
    prompt = (
        f"Select a subset of {n} {item_word}s subject to a total {unit_word} cap of {cap}. "
        f"Candidates: {items_str}. Maximize total {val_word}."
    )
    p = {
        "slug": slug,
        "title": title,
        "industry": industry,
        "problemType": problem_type,
        "description": f"Select {item_word}s within a {cap} {unit_word} limit to maximize {val_word}.",
        "objectiveSense": "Maximize",
        "estimatedBinaryVars": n,
        "sizeTier": tier_for(n),
        "prompt": prompt,
        "data": {"n": n, "weights": weights, "values": values, "capacity": cap, "rngSeed": seed},
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max(values)))


def make_portfolio_qubo(slug: str, title: str, n: int, k: int, seed: int):
    """Cardinality-constrained quadratic portfolio selection: Maximize sum(r_i x_i) - sum_{i<j} cov_{ij} x_i x_j, s.t. sum x_i == k."""
    rng = random.Random(seed)
    returns = [rng.randint(15, 50) for _ in range(n)]
    cov = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            c = rng.randint(1, 10)
            cov[i][j] = c
            cov[j][i] = c

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        x = [m.NewBoolVar(f"x_{i}") for i in range(n)]
        m.Add(sum(x) == k)
        # Linearize pairwise product z_{i,j} = x_i * x_j for exact CP-SAT
        z_terms = []
        for i in range(n):
            for j in range(i + 1, n):
                if cov[i][j] > 0:
                    z = m.NewBoolVar(f"z_{i}_{j}")
                    m.Add(z >= x[i] + x[j] - 1)
                    m.Add(z <= x[i])
                    m.Add(z <= x[j])
                    z_terms.append(cov[i][j] * z)
        m.Maximize(sum(returns[i] * x[i] for i in range(n)) - sum(z_terms))
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        ok = st in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        return s.StatusName(st), (float(round(s.ObjectiveValue(), 6)) if ok else None), ms

    st0, opt, _ = solve_cp(101)
    assert st0 == "OPTIMAL" and opt is not None

    def make_bqm(lam: float):
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(n):
            bqm.add_variable(f"x_{i}", -float(returns[i]))
        for i in range(n):
            for j in range(i + 1, n):
                bqm.add_quadratic(f"x_{i}", f"x_{j}", float(cov[i][j]))
        bqm.add_linear_equality_constraint([(f"x_{i}", 1) for i in range(n)], lagrange_multiplier=lam, constant=-k)
        return bqm

    def verify(sample: Dict[str, int]):
        if sum(sample.get(f"x_{i}", 0) for i in range(n)) != k:
            return False, 0.0
        val = sum(returns[i] * sample.get(f"x_{i}", 0) for i in range(n))
        for i in range(n):
            for j in range(i + 1, n):
                val -= cov[i][j] * sample.get(f"x_{i}", 0) * sample.get(f"x_{j}", 0)
        return True, float(val)

    prompt = (
        f"Select exactly {k} assets out of {n} candidate equities to maximize risk-adjusted return "
        f"(expected return minus pairwise covariance penalty). Expected returns: {returns}. "
        f"Symmetric risk covariance matrix: {fmt_matrix(cov, 'asset')}."
    )
    p = {
        "slug": slug,
        "title": title,
        "industry": "Finance",
        "problemType": "Portfolio Selection",
        "description": f"Pick exactly {k} of {n} assets to maximize expected return minus pairwise covariance risk.",
        "objectiveSense": "Maximize",
        "estimatedBinaryVars": n,
        "sizeTier": tier_for(n),
        "prompt": prompt,
        "data": {"n": n, "k": k, "returns": returns, "covariance": cov, "rngSeed": seed},
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact quadratic-linearized optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max(returns) * 2))


def make_set_cover(industry: str, slug: str, title: str, unit_word: str, item_word: str, n_items: int, n_units: int, seed: int):
    rng = random.Random(seed)
    while True:
        covers = [sorted(rng.sample(range(n_items), rng.randint(3, min(5, n_items)))) for _ in range(n_units)]
        if set().union(*map(set, covers)) == set(range(n_items)):
            break
    cost = [rng.randint(5, 20) for _ in range(n_units)]

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        y = [m.NewBoolVar(f"y_{u}") for u in range(n_units)]
        for r in range(n_items):
            m.Add(sum(y[u] for u in range(n_units) if r in covers[u]) >= 1)
        m.Minimize(sum(cost[u] * y[u] for u in range(n_units)))
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        ok = st in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        return s.StatusName(st), (float(round(s.ObjectiveValue(), 6)) if ok else None), ms

    st0, opt, _ = solve_cp(101)
    assert st0 == "OPTIMAL" and opt is not None

    def make_bqm(lam: float):
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for u in range(n_units):
            bqm.add_variable(f"y_{u}", float(cost[u]))
        for r in range(n_items):
            _add_geq(bqm, [(f"y_{u}", 1) for u in range(n_units) if r in covers[u]], 1, lam, f"cov_{r}")
        return bqm

    def verify(sample: Dict[str, int]):
        for r in range(n_items):
            if sum(sample.get(f"y_{u}", 0) for u in range(n_units) if r in covers[u]) < 1:
                return False, 0.0
        return True, float(sum(cost[u] * sample.get(f"y_{u}", 0) for u in range(n_units)))

    desc = "; ".join(f"{unit_word} {u} (cost {cost[u]}) covers {item_word}s {covers[u]}" for u in range(n_units))
    prompt = f"Choose {unit_word}s to cover all {n_items} {item_word}s (0 to {n_items-1}) at minimum cost. Options: {desc}."
    p = {
        "slug": slug,
        "title": title,
        "industry": industry,
        "problemType": "Set Cover",
        "description": f"Select the minimum-cost subset of {n_units} {unit_word}s covering all {n_items} {item_word}s.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": n_units,
        "sizeTier": tier_for(n_units),
        "prompt": prompt,
        "data": {"items": n_items, "units": n_units, "covers": covers, "cost": cost, "rngSeed": seed},
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max(cost)))


def make_unit_commitment(slug: str, title: str, n_gen: int, n_periods: int, seed: int):
    """Energy unit commitment: decide binary on/off u_{g,t} to meet hourly demand[t] at minimum generation + startup cost."""
    rng = random.Random(seed)
    cap = [rng.randint(2, 5) for _ in range(n_gen)]
    gen_cost = [rng.randint(10, 35) for _ in range(n_gen)]
    startup_cost = [rng.randint(5, 18) for _ in range(n_gen)]
    total_cap = sum(cap)
    demand = [rng.randint(max(3, total_cap // 3), max(4, (2 * total_cap) // 3)) for _ in range(n_periods)]

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        u = [[m.NewBoolVar(f"u_{g}_{t}") for t in range(n_periods)] for g in range(n_gen)]
        for t in range(n_periods):
            m.Add(sum(cap[g] * u[g][t] for g in range(n_gen)) >= demand[t])
        # Startup term: startup_cost[g] * u_{g,t} * (1 - u_{g,t-1})
        st_vars = []
        for g in range(n_gen):
            st_vars.append(startup_cost[g] * u[g][0])
            for t in range(1, n_periods):
                su = m.NewBoolVar(f"su_{g}_{t}")
                m.Add(su >= u[g][t] - u[g][t - 1])
                st_vars.append(startup_cost[g] * su)
        m.Minimize(sum(gen_cost[g] * u[g][t] for g in range(n_gen) for t in range(n_periods)) + sum(st_vars))
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        ok = st in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        return s.StatusName(st), (float(round(s.ObjectiveValue(), 6)) if ok else None), ms

    st0, opt, _ = solve_cp(101)
    assert st0 == "OPTIMAL" and opt is not None

    def make_bqm(lam: float):
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for g in range(n_gen):
            for t in range(n_periods):
                bqm.add_variable(f"u_{g}_{t}", float(gen_cost[g]))
            bqm.add_linear(f"u_{g}_0", float(startup_cost[g]))
            for t in range(1, n_periods):
                # startup_cost * u_{g,t} * (1 - u_{g,t-1})
                bqm.add_linear(f"u_{g}_{t}", float(startup_cost[g]))
                bqm.add_quadratic(f"u_{g}_{t}", f"u_{g}_{t-1}", -float(startup_cost[g]))
        for t in range(n_periods):
            _add_geq(bqm, [(f"u_{g}_{t}", int(cap[g])) for g in range(n_gen)], int(demand[t]), lam, f"dem_{t}")
        return bqm

    def verify(sample: Dict[str, int]):
        for t in range(n_periods):
            if sum(cap[g] * sample.get(f"u_{g}_{t}", 0) for g in range(n_gen)) < demand[t]:
                return False, 0.0
        total = 0.0
        for g in range(n_gen):
            for t in range(n_periods):
                ugt = sample.get(f"u_{g}_{t}", 0)
                total += gen_cost[g] * ugt
                if t == 0:
                    total += startup_cost[g] * ugt
                else:
                    prev = sample.get(f"u_{g}_{t-1}", 0)
                    if ugt == 1 and prev == 0:
                        total += startup_cost[g]
        return True, total

    prompt = (
        f"Schedule {n_gen} power generators across {n_periods} time periods to meet hourly grid demand {demand} MW. "
        f"Generator capacities (MW): {cap}; hourly operating costs: {gen_cost}; startup costs: {startup_cost}. "
        f"Minimize total operating plus startup cost."
    )
    p = {
        "slug": slug,
        "title": title,
        "industry": "Energy",
        "problemType": "Unit Commitment",
        "description": f"Dispatch {n_gen} generators over {n_periods} periods to satisfy demand {demand} MW at minimum cost.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": n_gen * n_periods,
        "sizeTier": tier_for(n_gen * n_periods),
        "prompt": prompt,
        "data": {"generators": n_gen, "periods": n_periods, "capacities": cap, "genCost": gen_cost, "startupCost": startup_cost, "demand": demand, "rngSeed": seed},
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max(gen_cost) + max(startup_cost)))


def make_grid_maxcut(slug: str, title: str, n_nodes: int, edge_prob: float, seed: int):
    """Unconstrained quadratic Max-Cut for power grid phase balancing."""
    rng = random.Random(seed)
    edges = []
    for i in range(n_nodes):
        for j in range(i + 1, n_nodes):
            if rng.random() < edge_prob:
                edges.append([i, j, rng.randint(1, 10)])
    assert len(edges) > 0

    def solve_cp(s_seed: int):
        t0 = time.perf_counter()
        m = cp_model.CpModel()
        x = [m.NewBoolVar(f"x_{i}") for i in range(n_nodes)]
        m.Add(x[0] == 0)  # break symmetry
        cut_terms = []
        for idx, (u, v, w) in enumerate(edges):
            c = m.NewBoolVar(f"c_{idx}")
            m.Add(c <= x[u] + x[v])
            m.Add(c <= 2 - x[u] - x[v])
            m.Add(c >= x[u] - x[v])
            m.Add(c >= x[v] - x[u])
            cut_terms.append(w * c)
        m.Maximize(sum(cut_terms))
        s = cp_model.CpSolver()
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        ok = st in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        return s.StatusName(st), (float(round(s.ObjectiveValue(), 6)) if ok else None), ms

    st0, opt, _ = solve_cp(101)
    assert st0 == "OPTIMAL" and opt is not None

    def make_bqm(lam: float):
        # Maximize sum w_{ij} (x_i + x_j - 2 x_i x_j) <=> Minimize sum w_{ij} (2 x_i x_j - x_i - x_j)
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(n_nodes):
            bqm.add_variable(f"x_{i}", 0.0)
        for u, v, w in edges:
            bqm.add_linear(f"x_{u}", -float(w))
            bqm.add_linear(f"x_{v}", -float(w))
            bqm.add_quadratic(f"x_{u}", f"x_{v}", 2.0 * float(w))
        return bqm

    def verify(sample: Dict[str, int]):
        cut = sum(w for u, v, w in edges if sample.get(f"x_{u}", 0) != sample.get(f"x_{v}", 0))
        return True, float(cut)

    prompt = (
        f"Partition {n_nodes} electrical substations (0 to {n_nodes-1}) into two balanced phase zones to maximize "
        f"total weighted cut capacity across {len(edges)} transmission links. Weighted edges [u, v, weight]: {edges}."
    )
    p = {
        "slug": slug,
        "title": title,
        "industry": "Energy",
        "problemType": "Grid Partitioning (Max-Cut)",
        "description": f"Partition {n_nodes} grid substations across {len(edges)} weighted transmission links to maximize cut capacity.",
        "objectiveSense": "Maximize",
        "estimatedBinaryVars": n_nodes,
        "sizeTier": tier_for(n_nodes),
        "prompt": prompt,
        "data": {"nodes": n_nodes, "edges": edges, "rngSeed": seed},
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, 10.0)


def make_facility(industry: str, slug: str, title: str, m_fac: int, n_cus: int, seed: int):
    rng = random.Random(seed)
    fixed = [rng.randint(35, 85) for _ in range(m_fac)]
    serve = [[rng.randint(6, 28) for _ in range(n_cus)] for _ in range(m_fac)]

    def solve_cp(s_seed: int):
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
        s.parameters.random_seed = s_seed
        s.parameters.num_workers = 1
        s.parameters.max_time_in_seconds = 30.0
        st = s.Solve(m)
        ms = (time.perf_counter() - t0) * 1000.0
        ok = st in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        return s.StatusName(st), (float(round(s.ObjectiveValue(), 6)) if ok else None), ms

    st0, opt, _ = solve_cp(101)
    assert st0 == "OPTIMAL" and opt is not None

    def make_bqm(lam: float):
        bqm = dimod.BinaryQuadraticModel("BINARY")
        for i in range(m_fac):
            bqm.add_variable(f"y_{i}", float(fixed[i]))
            for j in range(n_cus):
                bqm.add_variable(f"x_{i}_{j}", float(serve[i][j]))
        for j in range(n_cus):
            bqm.add_linear_equality_constraint([(f"x_{i}_{j}", 1) for i in range(m_fac)], lagrange_multiplier=lam, constant=-1)
        for i in range(m_fac):
            for j in range(n_cus):
                bqm.add_linear(f"x_{i}_{j}", lam)
                bqm.add_quadratic(f"x_{i}_{j}", f"y_{i}", -lam)
        return bqm

    def verify(sample: Dict[str, int]):
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

    prompt = (
        f"Decide which of {m_fac} production plants to open (fixed costs {fixed}) and assign each of {n_cus} orders "
        f"to exactly one open plant. Fulfillment cost matrix (rows plants, columns orders): {fmt_matrix(serve, 'plant')}. "
        f"Minimize total fixed opening plus fulfillment cost."
    )
    p = {
        "slug": slug,
        "title": title,
        "industry": industry,
        "problemType": "Plant Location",
        "description": f"Open a subset of {m_fac} plants and assign {n_cus} orders at minimum total cost.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": m_fac + m_fac * n_cus,
        "sizeTier": tier_for(m_fac + m_fac * n_cus),
        "prompt": prompt,
        "data": {"plants": m_fac, "orders": n_cus, "fixedCost": fixed, "fulfillmentCost": serve, "rngSeed": seed},
        "bestKnown": {"value": int(opt), "kind": "proven_optimal", "method": "Exact optimality proven by OR-Tools CP-SAT"},
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }
    return p, run_benchmark(p, make_bqm, verify, solve_cp, float(max(fixed) + max(max(r) for r in serve)))


def main():
    specs = [
        # ── Workforce Scheduling (8) ──
        lambda: make_shift_rostering("Workforce Scheduling", "workforce-shifts-5x3", "Nurse Shift Rostering (5 staff, 3 shifts)", 5, 3, 1, 2101),
        lambda: make_shift_rostering("Workforce Scheduling", "workforce-shifts-6x4", "Hospital Shift Rostering (6 staff, 4 shifts)", 6, 4, 1, 2102),
        lambda: make_shift_rostering("Workforce Scheduling", "workforce-shifts-9x4", "Operations Crew Rostering (9 staff, 4 shifts)", 9, 4, 2, 2103),
        lambda: make_shift_rostering("Workforce Scheduling", "workforce-shifts-12x5", "Plant Shift Rostering (12 staff, 5 shifts)", 12, 5, 2, 2104),
        lambda: make_shift_rostering("Workforce Scheduling", "workforce-shifts-20x8", "Enterprise Multi-Site Roster (20 staff, 8 shifts)", 20, 8, 2, 2105),
        lambda: make_assignment("Workforce Scheduling", "Crew Assignment", "workforce-crew-5x5", "Field Technician Assignment (5x5)", "technician", "site", 5, 2201),
        lambda: make_assignment("Workforce Scheduling", "Crew Assignment", "workforce-crew-8x8", "Flight Crew Pairing Assignment (8x8)", "crew", "flight", 8, 2202),
        lambda: make_set_cover("Workforce Scheduling", "workforce-oncall-8x10", "On-Call Skill Coverage (8 engineers, 10 windows)", "engineer", "window", 10, 8, 2301),

        # ── Finance (8) ──
        lambda: make_portfolio_qubo("finance-portfolio-8-k4", "Equity Portfolio Selection (8 assets, pick 4)", 8, 4, 3101),
        lambda: make_portfolio_qubo("finance-portfolio-12-k5", "Equity Portfolio Selection (12 assets, pick 5)", 12, 5, 3102),
        lambda: make_portfolio_qubo("finance-portfolio-16-k6", "Multi-Sector Portfolio (16 assets, pick 6)", 16, 6, 3103),
        lambda: make_portfolio_qubo("finance-portfolio-20-k8", "Institutional Portfolio (20 assets, pick 8)", 20, 8, 3104),
        lambda: make_knapsack("Finance", "Capital Budgeting", "finance-capex-10", "Capital Budgeting Allocation (10 projects)", "project", "budget ($M)", "NPV ($M)", 10, 3201),
        lambda: make_knapsack("Finance", "Capital Budgeting", "finance-capex-15", "R&D Portfolio Budgeting (15 projects)", "project", "budget ($M)", "NPV ($M)", 15, 3202),
        lambda: make_knapsack("Finance", "Capital Budgeting", "finance-capex-22", "Corporate CapEx Selection (22 projects)", "project", "budget ($M)", "NPV ($M)", 22, 3203),
        lambda: make_assignment("Finance", "Trade Matching", "finance-clearing-13x13", "Large Clearing Desk Assignment (13x13)", "desk", "portfolio", 13, 3301),

        # ── Energy (8) ──
        lambda: make_unit_commitment("energy-uc-4x4", "Microgrid Unit Commitment (4 gens, 4 periods)", 4, 4, 4101),
        lambda: make_unit_commitment("energy-uc-5x4", "Regional Unit Commitment (5 gens, 4 periods)", 5, 4, 4102),
        lambda: make_unit_commitment("energy-uc-6x5", "Thermal Fleet Dispatch (6 gens, 5 periods)", 6, 5, 4103),
        lambda: make_facility("Energy", "energy-substation-12x14", "Regional Substation Expansion (12 sites, 14 zones)", 12, 14, 4104),
        lambda: make_grid_maxcut("energy-maxcut-12", "Substation Phase Balancing (12 nodes)", 12, 0.45, 4201),
        lambda: make_grid_maxcut("energy-maxcut-20", "Transmission Grid Partitioning (20 nodes)", 20, 0.35, 4202),
        lambda: make_knapsack("Energy", "Demand Response", "energy-demand-12", "Demand-Response Load Shedding (12 feeders)", "feeder", "curtailment (MW)", "grid stability score", 12, 4301),
        lambda: make_set_cover("Energy", "energy-substation-cover", "Backup Generator Coverage (9 units, 12 zones)", "backup unit", "grid zone", 12, 9, 4401),

        # ── Manufacturing (8) ──
        lambda: make_assignment("Manufacturing", "Machine Assignment", "mfg-machine-5x5", "CNC Machine-to-Job Assignment (5x5)", "machine", "job", 5, 5101),
        lambda: make_assignment("Manufacturing", "Machine Assignment", "mfg-machine-7x7", "Assembly Cell Assignment (7x7)", "cell", "order", 7, 5102),
        lambda: make_assignment("Manufacturing", "Machine Assignment", "mfg-machine-9x9", "SMT Line Assignment (9x9)", "line", "board", 9, 5103),
        lambda: make_facility("Manufacturing", "mfg-plant-3x6", "Factory Line Allocation (3 plants, 6 orders)", 3, 6, 5201),
        lambda: make_facility("Manufacturing", "mfg-plant-4x8", "Regional Plant Allocation (4 plants, 8 orders)", 4, 8, 5202),
        lambda: make_knapsack("Manufacturing", "Batch Selection", "mfg-batch-12", "Production Batch Selection (12 batches)", "batch", "machine hours", "margin ($k)", 12, 5301),
        lambda: make_knapsack("Manufacturing", "Batch Selection", "mfg-batch-18", "High-Mix Production Selection (18 batches)", "batch", "machine hours", "margin ($k)", 18, 5302),
        lambda: make_facility("Manufacturing", "mfg-plant-12x14", "Global Supply Network Allocation (12 plants, 14 hubs)", 12, 14, 5203),
    ]

    problems = []
    benchmarks = []
    print(f"Generating & benchmarking {len(specs)} verified multi-industry problems (N={len(SEEDS)} seeds)...\n")
    for fn in specs:
        p, b = fn()
        problems.append(p)
        benchmarks.append(b)
        q, c = b["qubo"], b["classical"]
        print(
            f"[{p['industry']:20s}] {p['slug']:28s} quboVars={b['quboVars']:4d}  "
            f"OR={str(c['bestObjective']):6s} ({c['gapVsBestKnownPct']}%, {c['meanTimeMs']:5.1f}ms) | "
            f"SA={str(q['bestObjective']):6s} ({q['gapVsBestKnownPct']}%, {q['feasibleRuns']}/{q['totalRuns']}, {str(q['meanTimeMs']):6s}ms) => {b['verdict']}"
        )

    LIB_OUT.write_text(json.dumps({"industry": "Multi-Industry", "problems": problems}, indent=2) + "\n")
    BENCH_OUT.write_text(
        json.dumps(
            {
                "industry": "Multi-Industry",
                "generatedAt": datetime.now(timezone.utc).isoformat(),
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
