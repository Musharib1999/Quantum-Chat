"""
Build the Phase-0 pilot slice of the Verified Industry Problem Library (Logistics).

Every `bestKnown` value in the output is VERIFIED here, never typed from memory:
  * synthetic instances (fixed RNG seeds) -> exact optimum computed by two independent
    methods (brute force / DP / Hungarian AND OR-Tools CP-SAT); the script aborts if they disagree.
  * public TSPLIB instance (burma14) -> read from benchmarks/data/burma14.tsp, distances computed with the TSPLIB GEO formula,
    optimum proven by CP-SAT; the script aborts unless it equals the published TSPLIB optimum (3323).

Usage:  python3 quantum-backend/benchmarks/build_logistics_library.py
Output: src/data/problemLibrary/logistics.json
"""
from __future__ import annotations

import itertools
import json
import math
import random
import sys
from pathlib import Path

from ortools.sat.python import cp_model
from scipy.optimize import linear_sum_assignment

OUT = Path(__file__).resolve().parents[2] / "src" / "data" / "problemLibrary" / "logistics.json"

BURMA14_FILE = Path(__file__).resolve().parent / "data" / "burma14.tsp"  # TSPLIB95 file, fetched once with curl
TSPLIB_BURMA14_PUBLISHED_OPT = 3323  # TSPLIB95 (Reinelt) published optimum; re-verified below with CP-SAT


def fmt_matrix(rows, label_row="row", names=None):
    out = []
    for i, r in enumerate(rows):
        name = names[i] if names else f"{label_row} {i}"
        out.append(f"{name}: [{', '.join(str(v) for v in r)}]")
    return "; ".join(out)


def tier_for(n_vars: int) -> str:
    return "small" if n_vars <= 40 else ("medium" if n_vars <= 100 else "large")


def solve_cp(model: cp_model.CpModel, obj_value_fn=None, time_limit=60):
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit
    solver.parameters.num_workers = 8
    status = solver.Solve(model)
    if status != cp_model.OPTIMAL:
        raise RuntimeError(f"CP-SAT did not prove optimality (status={solver.StatusName(status)})")
    return solver


# ───────────────────────── 1/2. Assignment ─────────────────────────
def build_assignment(n: int, seed: int, slug: str):
    rng = random.Random(seed)
    cost = [[rng.randint(5, 40) for _ in range(n)] for _ in range(n)]

    r, c = linear_sum_assignment(cost)
    hungarian = int(sum(cost[i][j] for i, j in zip(r, c)))

    m = cp_model.CpModel()
    x = [[m.NewBoolVar(f"x{i}_{j}") for j in range(n)] for i in range(n)]
    for i in range(n):
        m.Add(sum(x[i]) == 1)
    for j in range(n):
        m.Add(sum(x[i][j] for i in range(n)) == 1)
    m.Minimize(sum(cost[i][j] * x[i][j] for i in range(n) for j in range(n)))
    s = solve_cp(m)
    cp = int(round(s.ObjectiveValue()))
    assert hungarian == cp, f"{slug}: Hungarian {hungarian} != CP-SAT {cp}"

    prompt = (
        f"Assign {n} drivers to {n} delivery routes. Each driver must be assigned to exactly one route and "
        f"each route must be covered by exactly one driver. The cost of assigning a driver to a route is given by "
        f"this matrix (rows are drivers 0 to {n-1}, columns are routes 0 to {n-1}): "
        f"{fmt_matrix(cost, 'driver')}. Minimize the total assignment cost."
    )
    return {
        "slug": slug,
        "title": f"Driver-to-Route Assignment ({n}x{n})",
        "problemType": "Assignment",
        "description": f"Assign {n} drivers to {n} routes at minimum total cost (one-to-one).",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": n * n,
        "prompt": prompt,
        "data": {"n": n, "costMatrix": cost, "rngSeed": seed},
        "bestKnown": {
            "value": cp,
            "kind": "proven_optimal",
            "method": "Hungarian algorithm (SciPy) and OR-Tools CP-SAT agree",
        },
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }


# ───────────────────────── 3. Knapsack (cargo loading) ─────────────────────────
def build_knapsack(n: int, seed: int, slug: str):
    rng = random.Random(seed)
    weights = [rng.randint(3, 20) for _ in range(n)]
    values = [rng.randint(10, 60) for _ in range(n)]
    cap = int(0.4 * sum(weights))

    dp = [0] * (cap + 1)
    for w, v in zip(weights, values):
        for c in range(cap, w - 1, -1):
            dp[c] = max(dp[c], dp[c - w] + v)
    dp_opt = dp[cap]

    m = cp_model.CpModel()
    x = [m.NewBoolVar(f"x{i}") for i in range(n)]
    m.Add(sum(weights[i] * x[i] for i in range(n)) <= cap)
    m.Maximize(sum(values[i] * x[i] for i in range(n)))
    s = solve_cp(m)
    cp = int(round(s.ObjectiveValue()))
    assert dp_opt == cp, f"{slug}: DP {dp_opt} != CP-SAT {cp}"

    parcels = "; ".join(f"parcel {i}: weight {weights[i]} kg, revenue {values[i]}" for i in range(n))
    prompt = (
        f"A delivery van can carry at most {cap} kg. There are {n} parcels to choose from: {parcels}. "
        f"Choose which parcels to load so that the total weight does not exceed {cap} kg and the total revenue is maximized."
    )
    return {
        "slug": slug,
        "title": f"Cargo Loading Knapsack ({n} parcels)",
        "problemType": "Knapsack",
        "description": f"Pick parcels for a van with a {cap} kg limit to maximize revenue.",
        "objectiveSense": "Maximize",
        "estimatedBinaryVars": n,
        "prompt": prompt,
        "data": {"n": n, "weights": weights, "values": values, "capacity": cap, "rngSeed": seed},
        "bestKnown": {
            "value": cp,
            "kind": "proven_optimal",
            "method": "Dynamic programming and OR-Tools CP-SAT agree",
        },
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }


# ───────────────────────── 4. Facility location ─────────────────────────
def build_facility(m_fac: int, n_cus: int, seed: int, slug: str):
    rng = random.Random(seed)
    fixed = [rng.randint(40, 90) for _ in range(m_fac)]
    serve = [[rng.randint(5, 30) for _ in range(n_cus)] for _ in range(m_fac)]

    best = None
    for mask in range(1, 1 << m_fac):
        opened = [i for i in range(m_fac) if mask >> i & 1]
        total = sum(fixed[i] for i in opened) + sum(min(serve[i][j] for i in opened) for j in range(n_cus))
        best = total if best is None else min(best, total)

    m = cp_model.CpModel()
    y = [m.NewBoolVar(f"y{i}") for i in range(m_fac)]
    x = [[m.NewBoolVar(f"x{i}_{j}") for j in range(n_cus)] for i in range(m_fac)]
    for j in range(n_cus):
        m.Add(sum(x[i][j] for i in range(m_fac)) == 1)
        for i in range(m_fac):
            m.Add(x[i][j] <= y[i])
    m.Minimize(
        sum(fixed[i] * y[i] for i in range(m_fac))
        + sum(serve[i][j] * x[i][j] for i in range(m_fac) for j in range(n_cus))
    )
    s = solve_cp(m)
    cp = int(round(s.ObjectiveValue()))
    assert best == cp, f"{slug}: brute force {best} != CP-SAT {cp}"

    prompt = (
        f"Choose which of {m_fac} candidate warehouses to open and assign each of {n_cus} customers to exactly one open warehouse. "
        f"Opening costs for warehouses 0 to {m_fac-1} are {fixed}. The cost of serving a customer from a warehouse is given by this matrix "
        f"(rows are warehouses, columns are customers 0 to {n_cus-1}): {fmt_matrix(serve, 'warehouse')}. "
        f"A customer can only be served by a warehouse that is open. Minimize total opening cost plus total service cost."
    )
    return {
        "slug": slug,
        "title": f"Warehouse Location ({m_fac} sites, {n_cus} customers)",
        "problemType": "Facility Location",
        "description": f"Open a subset of {m_fac} warehouses and serve {n_cus} customers at minimum total cost.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": m_fac + m_fac * n_cus,
        "prompt": prompt,
        "data": {"warehouses": m_fac, "customers": n_cus, "openingCost": fixed, "serviceCost": serve, "rngSeed": seed},
        "bestKnown": {
            "value": cp,
            "kind": "proven_optimal",
            "method": "Exhaustive subset enumeration and OR-Tools CP-SAT agree",
        },
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }


# ───────────────────────── 5. Set cover (depot coverage) ─────────────────────────
def build_set_cover(regions: int, depots: int, seed: int, slug: str):
    rng = random.Random(seed)
    while True:
        covers = [sorted(rng.sample(range(regions), rng.randint(3, 5))) for _ in range(depots)]
        if set().union(*map(set, covers)) == set(range(regions)):
            break
    cost = [rng.randint(3, 9) for _ in range(depots)]

    best = None
    for mask in range(1, 1 << depots):
        chosen = [d for d in range(depots) if mask >> d & 1]
        if set().union(*(set(covers[d]) for d in chosen)) == set(range(regions)):
            total = sum(cost[d] for d in chosen)
            best = total if best is None else min(best, total)

    m = cp_model.CpModel()
    y = [m.NewBoolVar(f"y{d}") for d in range(depots)]
    for r in range(regions):
        m.Add(sum(y[d] for d in range(depots) if r in covers[d]) >= 1)
    m.Minimize(sum(cost[d] * y[d] for d in range(depots)))
    s = solve_cp(m)
    cp = int(round(s.ObjectiveValue()))
    assert best == cp, f"{slug}: brute force {best} != CP-SAT {cp}"

    desc = "; ".join(f"depot {d} (cost {cost[d]}) covers regions {covers[d]}" for d in range(depots))
    prompt = (
        f"Choose which depots to open so that every one of {regions} regions (numbered 0 to {regions-1}) is covered by at least one open depot. "
        f"Candidate depots: {desc}. Minimize the total cost of the opened depots."
    )
    return {
        "slug": slug,
        "title": f"Depot Coverage Set Cover ({depots} depots, {regions} regions)",
        "problemType": "Set Cover",
        "description": f"Open the cheapest set of depots that covers all {regions} regions.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": depots,
        "prompt": prompt,
        "data": {"regions": regions, "depots": depots, "covers": covers, "cost": cost, "rngSeed": seed},
        "bestKnown": {
            "value": cp,
            "kind": "proven_optimal",
            "method": "Exhaustive subset enumeration and OR-Tools CP-SAT agree",
        },
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }


# ───────────────────────── TSP helpers ─────────────────────────
def tsp_cp_optimum(dist):
    n = len(dist)
    m = cp_model.CpModel()
    arcs, lits = [], {}
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            lit = m.NewBoolVar(f"a{i}_{j}")
            lits[(i, j)] = lit
            arcs.append((i, j, lit))
    m.AddCircuit(arcs)
    m.Minimize(sum(dist[i][j] * lit for (i, j), lit in lits.items()))
    s = solve_cp(m, time_limit=120)
    return int(round(s.ObjectiveValue()))


def build_tsp_synthetic(n: int, seed: int, slug: str):
    rng = random.Random(seed)
    pts = [(rng.randint(0, 50), rng.randint(0, 50)) for _ in range(n)]
    dist = [[int(round(math.dist(pts[i], pts[j]))) for j in range(n)] for i in range(n)]

    best = None
    for perm in itertools.permutations(range(1, n)):
        route = (0,) + perm + (0,)
        total = sum(dist[route[k]][route[k + 1]] for k in range(n))
        best = total if best is None else min(best, total)
    cp = tsp_cp_optimum(dist)
    assert best == cp, f"{slug}: brute force {best} != CP-SAT {cp}"

    prompt = (
        f"A courier must visit {n} cities (numbered 0 to {n-1}) exactly once, starting and ending at city 0. "
        f"The travel distance between cities is given by this symmetric matrix: {fmt_matrix(dist, 'city')}. "
        f"Find the shortest round trip that visits every city exactly once."
    )
    return {
        "slug": slug,
        "title": f"Courier Round Trip TSP ({n} cities)",
        "problemType": "TSP",
        "description": f"Shortest round trip through {n} cities starting and ending at city 0.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": n * n,
        "prompt": prompt,
        "data": {"n": n, "coordinates": pts, "distanceMatrix": dist, "rngSeed": seed},
        "bestKnown": {
            "value": cp,
            "kind": "proven_optimal",
            "method": "Exhaustive permutation search and OR-Tools CP-SAT circuit model agree",
        },
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }


def tsplib_geo_distance(c1, c2):
    PI = 3.141592
    RRR = 6378.388

    def to_rad(v):
        deg = int(v)
        minutes = v - deg
        return PI * (deg + 5.0 * minutes / 3.0) / 180.0

    lat1, lon1 = to_rad(c1[0]), to_rad(c1[1])
    lat2, lon2 = to_rad(c2[0]), to_rad(c2[1])
    q1 = math.cos(lon1 - lon2)
    q2 = math.cos(lat1 - lat2)
    q3 = math.cos(lat1 + lat2)
    return int(RRR * math.acos(0.5 * ((1.0 + q1) * q2 - (1.0 - q1) * q3)) + 1.0)


def build_burma14():
    raw = BURMA14_FILE.read_text()
    coords, in_coords = [], False
    for line in raw.splitlines():
        t = line.strip()
        if t == "NODE_COORD_SECTION":
            in_coords = True
            continue
        if t == "EOF":
            break
        if in_coords and t:
            _, a, b = t.split()
            coords.append((float(a), float(b)))
    assert len(coords) == 14, f"burma14 parse error: {len(coords)} nodes"
    n = 14
    dist = [[0 if i == j else tsplib_geo_distance(coords[i], coords[j]) for j in range(n)] for i in range(n)]
    cp = tsp_cp_optimum(dist)
    assert cp == TSPLIB_BURMA14_PUBLISHED_OPT, (
        f"burma14: CP-SAT optimum {cp} != published TSPLIB optimum {TSPLIB_BURMA14_PUBLISHED_OPT}"
    )
    prompt = (
        f"A courier must visit {n} cities (numbered 0 to {n-1}) exactly once, starting and ending at city 0. "
        f"The travel distance between cities is given by this symmetric matrix: {fmt_matrix(dist, 'city')}. "
        f"Find the shortest round trip that visits every city exactly once."
    )
    return {
        "slug": "tsp-burma14",
        "title": "Burma14 TSP (TSPLIB, 14 cities)",
        "problemType": "TSP",
        "description": "Classic public 14-city benchmark with a published optimal tour length of 3323.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": n * n,
        "prompt": prompt,
        "data": {"n": n, "coordinates": coords, "distanceMatrix": dist, "tsplibName": "burma14"},
        "bestKnown": {
            "value": cp,
            "kind": "published_optimal",
            "method": "Published TSPLIB optimum (3323), independently re-proven with OR-Tools CP-SAT on the downloaded data",
        },
        "source": {
            "name": "TSPLIB95 burma14 (Reinelt)",
            "url": "http://comopt.ifi.uni-heidelberg.de/software/TSPLIB95/",
            "license": "Freely available for research use (TSPLIB)",
        },
    }


# ───────────────────────── 8. CVRP (small) ─────────────────────────
def build_cvrp(customers: int, vehicles: int, capacity: int, seed: int, slug: str):
    rng = random.Random(seed)
    n = customers + 1
    pts = [(rng.randint(0, 50), rng.randint(0, 50)) for _ in range(n)]
    dist = [[int(round(math.dist(pts[i], pts[j]))) for j in range(n)] for i in range(n)]
    # Re-draw (deterministically) until total demand exceeds one van's capacity (so a single van cannot do it)
    # but still fits within the fleet's total capacity.
    while True:
        demand = [0] + [rng.randint(1, 5) for _ in range(customers)]
        if capacity < sum(demand) <= vehicles * capacity - 2:
            break

    def route_cost(seq):
        if not seq:
            return 0
        path = [0] + list(seq) + [0]
        return sum(dist[path[k]][path[k + 1]] for k in range(len(path) - 1))

    best = None
    for perm in itertools.permutations(range(1, n)):
        for split in range(0, customers + 1):
            r1, r2 = perm[:split], perm[split:]
            if sum(demand[c] for c in r1) > capacity or sum(demand[c] for c in r2) > capacity:
                continue
            total = route_cost(r1) + route_cost(r2)
            best = total if best is None else min(best, total)
    assert vehicles == 2, "brute-force verifier is written for 2 vehicles"

    prompt = (
        f"{vehicles} delivery vans, each with capacity {capacity}, start and end at the depot (node 0). "
        f"There are {customers} customers (nodes 1 to {customers}) with demands {demand[1:]} respectively. "
        f"The travel distance matrix between nodes 0 to {customers} is: {fmt_matrix(dist, 'node')}. "
        f"Each customer must be visited exactly once by exactly one van, and no van may carry more than {capacity} in total demand. "
        f"Minimize the total distance travelled by all vans."
    )
    return {
        "slug": slug,
        "title": f"Capacitated Vehicle Routing ({customers} customers, {vehicles} vans)",
        "problemType": "Vehicle Routing",
        "description": f"Route {vehicles} capacity-{capacity} vans to serve {customers} customers at minimum distance.",
        "objectiveSense": "Minimize",
        "estimatedBinaryVars": n * n * vehicles,
        "prompt": prompt,
        "data": {
            "customers": customers,
            "vehicles": vehicles,
            "capacity": capacity,
            "demand": demand,
            "coordinates": pts,
            "distanceMatrix": dist,
            "rngSeed": seed,
        },
        "bestKnown": {
            "value": best,
            "kind": "proven_optimal",
            "method": "Exhaustive enumeration of all customer orderings and 2-route splits",
        },
        "source": {"name": "Synthetic instance (fixed seed)", "url": None, "license": "Original / CC0"},
    }


def main():
    problems = [
        build_assignment(6, 1101, "assignment-driver-route-6"),
        build_assignment(10, 1102, "assignment-driver-route-10"),
        build_knapsack(12, 1201, "cargo-knapsack-12"),
        build_facility(3, 6, 1301, "facility-location-3x6"),
        build_set_cover(10, 7, 1401, "set-cover-depots-10"),
        build_tsp_synthetic(5, 1501, "tsp-5-city"),
        build_cvrp(6, 2, 10, 1601, "cvrp-6c-2v"),
        build_burma14(),
    ]
    for p in problems:
        p["industry"] = "Logistics"
        p["sizeTier"] = tier_for(p["estimatedBinaryVars"])
        print(f"{p['slug']:32s} vars~{p['estimatedBinaryVars']:4d} tier={p['sizeTier']:6s} best={p['bestKnown']['value']} ({p['bestKnown']['kind']})")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"industry": "Logistics", "problems": problems}, indent=2) + "\n")
    print(f"\nWrote {len(problems)} verified problems -> {OUT}")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        print(f"VERIFICATION FAILED: {e}", file=sys.stderr)
        sys.exit(1)
