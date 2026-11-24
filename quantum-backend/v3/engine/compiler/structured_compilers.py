# -*- coding: utf-8 -*-
"""
Deterministic Natural-Language Structured Problem Compilers
===========================================================
Parses canonical optimization problem statements directly from natural-language
prompts into exact `OptimizationModel` instances (zero LLM hallucination risk on
quadratic terms, subset cliques, precedence arcs, or indexed capacity matrices).

Used as a fast-path inside `expand_cmm_to_om` and `direct_model_pipeline.py`
whenever a prompt specifies explicit structured mathematical data.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from .cmm import VarType
from .expander import (
    ExpandedConstraint,
    ExpandedObjective,
    ExpandedVariable,
    OptimizationModel,
)


def _bin_var(name: str) -> ExpandedVariable:
    return ExpandedVariable(name=name, var_type=VarType.BINARY, lower_bound=0.0, upper_bound=1.0)


def _parse_int_list(s: str) -> List[int]:
    return [int(x) for x in re.findall(r"-?\d+", s)]


def _parse_float_list(s: str) -> List[float]:
    return [float(x) for x in re.findall(r"[-+]?\d+(?:\.\d+)?", s)]


def _parse_labeled_matrix(text: str, row_label_pattern: str) -> List[List[float]]:
    rows = re.findall(rf"(?:{row_label_pattern})\s*\d+\s*:\s*\[([^\]]+)\]", text, flags=re.IGNORECASE)
    out: List[List[float]] = []
    for r in rows:
        nums = _parse_float_list(r)
        if not nums:
            return []
        out.append(nums)
    return out


def _fmt_num(v: float) -> str:
    return str(int(round(v))) if abs(v - round(v)) < 1e-6 else f"{v:.4f}"


# ───────────────────────── 1. CVRP ─────────────────────────

def _try_cvrp(text: str) -> Optional[OptimizationModel]:
    low = text.lower()
    if not ("capacity" in low and "demands" in low and ("delivery vans" in low or "vehicles" in low)):
        return None
    m_v = re.search(r"(\d+)\s+(?:delivery\s+vans|vehicles)", text, flags=re.IGNORECASE)
    m_cap = re.search(r"capacity\s+(\d+)", text, flags=re.IGNORECASE)
    m_dem = re.search(r"demands\s*\[([^\]]+)\]", text, flags=re.IGNORECASE)
    if not (m_v and m_cap and m_dem):
        return None
    vehicles = int(m_v.group(1))
    capacity = int(m_cap.group(1))
    cust_demands = _parse_int_list(m_dem.group(1))
    customers = len(cust_demands)
    n = customers + 1
    dist = _parse_labeled_matrix(text, r"node")
    if len(dist) != n or not all(len(r) == n for r in dist):
        return None
    demand = [0] + cust_demands

    variables: Dict[str, ExpandedVariable] = {}
    for v in range(vehicles):
        for c in range(1, n):
            for s in range(customers):
                variables[f"x_{v}_{c}_{s}"] = _bin_var(f"x_{v}_{c}_{s}")

    constraints: List[ExpandedConstraint] = []
    for c in range(1, n):
        lhs = " + ".join(f"x_{v}_{c}_{s}" for v in range(vehicles) for s in range(customers))
        constraints.append(ExpandedConstraint(name=f"visit_cust_{c}", left=lhs, op="==", right=1.0))
    for v in range(vehicles):
        for s in range(customers):
            lhs = " + ".join(f"x_{v}_{c}_{s}" for c in range(1, n))
            constraints.append(ExpandedConstraint(name=f"slot_{v}_{s}", left=lhs, op="<=", right=1.0))
        cap_lhs = " + ".join(f"({demand[c]} * x_{v}_{c}_{s})" for c in range(1, n) for s in range(customers))
        constraints.append(ExpandedConstraint(name=f"cap_{v}", left=cap_lhs, op="<=", right=float(capacity)))
        for s in range(customers - 1):
            lhs_prev = " + ".join(f"x_{v}_{c}_{s}" for c in range(1, n))
            lhs_next = " + ".join(f"x_{v}_{c}_{s+1}" for c in range(1, n))
            constraints.append(ExpandedConstraint(name=f"contig_{v}_{s}", left=f"{lhs_next} - ({lhs_prev})", op="<=", right=0.0))

    obj_terms: List[str] = []
    for v in range(vehicles):
        for c in range(1, n):
            if dist[0][c] != 0:
                obj_terms.append(f"({_fmt_num(dist[0][c])} * x_{v}_{c}_0)")
            if dist[c][0] != 0:
                obj_terms.append(f"({_fmt_num(dist[c][0])} * x_{v}_{c}_{customers - 1})")
        for s in range(customers - 1):
            for c1 in range(1, n):
                if dist[c1][0] != 0:
                    obj_terms.append(f"({_fmt_num(dist[c1][0])} * x_{v}_{c1}_{s})")
                for c2 in range(1, n):
                    w = dist[c1][c2] - dist[c1][0]
                    if abs(w) > 1e-9:
                        if w > 0:
                            obj_terms.append(f"+ {_fmt_num(w)} * (x_{v}_{c1}_{s} * x_{v}_{c2}_{s + 1})")
                        else:
                            obj_terms.append(f"- {_fmt_num(-w)} * (x_{v}_{c1}_{s} * x_{v}_{c2}_{s + 1})")

    expr = " ".join(t if t.startswith(("+", "-")) else f"+ {t}" for t in obj_terms).lstrip("+ ").strip()
    return OptimizationModel(
        variables=variables,
        objective=ExpandedObjective(sense="MINIMIZE", expression=expr or "0.0"),
        constraints=constraints,
        metadata={
            "problem_type": "CVRP",
            "customers": customers,
            "vehicles": vehicles,
            "capacity": capacity,
            "demand": demand,
            "distance_matrix": dist,
        },
    )


# ───────────────────────── 2. Site Layout QAP ─────────────────────────

def _try_site_layout_qap(text: str) -> Optional[OptimizationModel]:
    low = text.lower()
    if "material flow matrix" not in low or "distance matrix" not in low:
        return None
    flow = _parse_labeled_matrix(text, r"Fac")
    dist = _parse_labeled_matrix(text, r"Zone")
    n = len(flow)
    if n < 2 or len(dist) != n or not all(len(r) == n for r in flow) or not all(len(r) == n for r in dist):
        return None

    variables = {f"place_{i}_{p}": _bin_var(f"place_{i}_{p}") for i in range(n) for p in range(n)}
    constraints: List[ExpandedConstraint] = []
    for i in range(n):
        constraints.append(ExpandedConstraint(name=f"fac_{i}_once", left=" + ".join(f"place_{i}_{p}" for p in range(n)), op="==", right=1.0))
    for p in range(n):
        constraints.append(ExpandedConstraint(name=f"zone_{p}_once", left=" + ".join(f"place_{i}_{p}" for i in range(n)), op="==", right=1.0))

    obj_terms: List[str] = []
    for i in range(n):
        for j in range(i + 1, n):
            f_ij = flow[i][j]
            if abs(f_ij) < 1e-9:
                continue
            for p in range(n):
                for q in range(n):
                    if p == q:
                        continue
                    w = f_ij * dist[p][q]
                    if abs(w) > 1e-9:
                        obj_terms.append(f"{_fmt_num(w)} * (place_{i}_{p} * place_{j}_{q})")

    return OptimizationModel(
        variables=variables,
        objective=ExpandedObjective(sense="MINIMIZE", expression=" + ".join(obj_terms) if obj_terms else "0.0"),
        constraints=constraints,
        metadata={"problem_type": "QAP", "n": n},
    )


# ───────────────────────── 3. Quadratic Portfolio Selection ─────────────────────────

def _try_portfolio_qubo(text: str) -> Optional[OptimizationModel]:
    low = text.lower()
    if "expected returns" not in low or "covariance matrix" not in low:
        return None
    m_k = re.search(r"select\s+exactly\s+(\d+)\s+assets\s+out\s+of\s+(\d+)", text, flags=re.IGNORECASE)
    m_ret = re.search(r"expected\s+returns\s*:\s*\[([^\]]+)\]", text, flags=re.IGNORECASE)
    if not (m_k and m_ret):
        return None
    k = int(m_k.group(1))
    n = int(m_k.group(2))
    rets = _parse_float_list(m_ret.group(1))
    risk = _parse_labeled_matrix(text, r"asset")
    if len(rets) != n or len(risk) != n or not all(len(r) == n for r in risk):
        return None

    variables = {f"x_{i}": _bin_var(f"x_{i}") for i in range(n)}
    constraints = [
        ExpandedConstraint(name="cardinality_k", left=" + ".join(f"x_{i}" for i in range(n)), op="==", right=float(k))
    ]
    terms: List[str] = []
    for i in range(n):
        if abs(rets[i]) > 1e-9:
            terms.append(f"+ ({_fmt_num(rets[i])} * x_{i})")
    for i in range(n):
        for j in range(i + 1, n):
            r_ij = risk[i][j]
            if abs(r_ij) > 1e-9:
                terms.append(f"- {_fmt_num(r_ij)} * (x_{i} * x_{j})")

    expr = " ".join(terms).lstrip("+ ").strip()
    return OptimizationModel(
        variables=variables,
        objective=ExpandedObjective(sense="MAXIMIZE", expression=expr or "0.0"),
        constraints=constraints,
        metadata={"problem_type": "PORTFOLIO", "n": n, "k": k},
    )


# ───────────────────────── 4. Weighted Max-Cut ─────────────────────────

def _try_maxcut(text: str) -> Optional[OptimizationModel]:
    low = text.lower()
    if "weighted edges" not in low or "cut" not in low:
        return None
    m_n = re.search(r"partition\s+(\d+)\s+", text, flags=re.IGNORECASE)
    m_edges = re.search(r"weighted\s+edges[^:]*:\s*\[(.+)\]", text, flags=re.IGNORECASE | re.DOTALL)
    if not (m_n and m_edges):
        return None
    n = int(m_n.group(1))
    edges = [(int(u), int(v), float(w)) for u, v, w in re.findall(r"\[\s*(\d+)\s*,\s*(\d+)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*\]", m_edges.group(1))]
    if not edges:
        return None

    variables = {f"x_{i}": _bin_var(f"x_{i}") for i in range(n)}
    # Max-Cut: sum_{(u,v,w)} w * (x_u + x_v - 2 * x_u * x_v)
    lin_acc = {i: 0.0 for i in range(n)}
    quad_terms: List[str] = []
    for u, v, w in edges:
        lin_acc[u] += w
        lin_acc[v] += w
        if abs(w) > 1e-9:
            quad_terms.append(f"- {_fmt_num(2.0 * w)} * (x_{u} * x_{v})")

    parts = [f"+ ({_fmt_num(val)} * x_{i})" for i, val in lin_acc.items() if abs(val) > 1e-9] + quad_terms
    expr = " ".join(parts).lstrip("+ ").strip()
    return OptimizationModel(
        variables=variables,
        objective=ExpandedObjective(sense="MAXIMIZE", expression=expr or "0.0"),
        constraints=[],
        metadata={"problem_type": "MAXCUT", "n": n, "edges": edges},
    )


# ───────────────────────── 5. Unit Commitment ─────────────────────────

def _try_unit_commitment(text: str) -> Optional[OptimizationModel]:
    low = text.lower()
    if "power generators" not in low or "startup costs" not in low:
        return None
    m_dem = re.search(r"demand\s*\[([^\]]+)\]", text, flags=re.IGNORECASE)
    m_cap = re.search(r"capacities[^:]*:\s*\[([^\]]+)\]", text, flags=re.IGNORECASE)
    m_op = re.search(r"operating\s+costs\s*:\s*\[([^\]]+)\]", text, flags=re.IGNORECASE)
    m_st = re.search(r"startup\s+costs\s*:\s*\[([^\]]+)\]", text, flags=re.IGNORECASE)
    if not (m_dem and m_cap and m_op and m_st):
        return None
    demand = _parse_int_list(m_dem.group(1))
    cap = _parse_int_list(m_cap.group(1))
    op_cost = _parse_float_list(m_op.group(1))
    start_cost = _parse_float_list(m_st.group(1))
    n_gens, n_t = len(cap), len(demand)
    if n_gens < 1 or n_t < 1 or len(op_cost) != n_gens or len(start_cost) != n_gens:
        return None

    variables = {f"u_{g}_{t}": _bin_var(f"u_{g}_{t}") for g in range(n_gens) for t in range(n_t)}
    constraints: List[ExpandedConstraint] = []
    for t in range(n_t):
        lhs = " + ".join(f"({cap[g]} * u_{g}_{t})" for g in range(n_gens))
        constraints.append(ExpandedConstraint(name=f"demand_t{t}", left=lhs, op=">=", right=float(demand[t])))

    # Operating + startup cost: op_cost[g]*u_{g,t} + start_cost[g]*(u_{g,t} - u_{g,t-1}*u_{g,t}) for t>=1, + start_cost[g]*u_{g,0}
    parts: List[str] = []
    for g in range(n_gens):
        for t in range(n_t):
            lin_c = op_cost[g] + start_cost[g]
            parts.append(f"+ ({_fmt_num(lin_c)} * u_{g}_{t})")
            if t > 0 and abs(start_cost[g]) > 1e-9:
                parts.append(f"- {_fmt_num(start_cost[g])} * (u_{g}_{t - 1} * u_{g}_{t})")

    expr = " ".join(parts).lstrip("+ ").strip()
    return OptimizationModel(
        variables=variables,
        objective=ExpandedObjective(sense="MINIMIZE", expression=expr or "0.0"),
        constraints=constraints,
        metadata={"problem_type": "UNIT_COMMITMENT", "n_gens": n_gens, "n_periods": n_t},
    )


# ───────────────────────── 6. Time-Cost Activity Crashing ─────────────────────────

def _try_time_cost_crashing(text: str) -> Optional[OptimizationModel]:
    low = text.lower()
    if "time-cost" not in low or "crash(" not in low:
        return None
    m_dl = re.search(r"within\s+(\d+)\s+days", text, flags=re.IGNORECASE)
    if not m_dl:
        return None
    deadline = int(m_dl.group(1))
    triples = re.findall(
        r"Normal\((\d+)d,\s*\$(\d+)k\),\s*Fast\((\d+)d,\s*\$(\d+)k\),\s*Crash\((\d+)d,\s*\$(\d+)k\)",
        text,
        flags=re.IGNORECASE,
    )
    if len(triples) < 2:
        return None

    n_acts = len(triples)
    variables = {f"mode_{a}_{k}": _bin_var(f"mode_{a}_{k}") for a in range(n_acts) for k in range(3)}
    constraints: List[ExpandedConstraint] = []
    dur_terms: List[str] = []
    cost_terms: List[str] = []
    for a, (dn, cn, df, cf, dc, cc) in enumerate(triples):
        durs = [int(dn), int(df), int(dc)]
        costs = [int(cn), int(cf), int(cc)]
        constraints.append(
            ExpandedConstraint(name=f"act_{a}_mode", left=" + ".join(f"mode_{a}_{k}" for k in range(3)), op="==", right=1.0)
        )
        for k in range(3):
            dur_terms.append(f"({durs[k]} * mode_{a}_{k})")
            cost_terms.append(f"({costs[k]} * mode_{a}_{k})")

    constraints.append(ExpandedConstraint(name="project_deadline", left=" + ".join(dur_terms), op="<=", right=float(deadline)))
    return OptimizationModel(
        variables=variables,
        objective=ExpandedObjective(sense="MINIMIZE", expression=" + ".join(cost_terms)),
        constraints=constraints,
        metadata={"problem_type": "TIME_COST_CRASHING", "n_activities": n_acts},
    )


# ───────────────────────── 7. Subcontractor Work-Package Assignment (GAP) ─────────────────────────

def _try_subcontractor_gap(text: str) -> Optional[OptimizationModel]:
    low = text.lower()
    if "subcontractor" not in low or "capacity caps" not in low:
        return None
    m_hrs = re.search(r"workloads\s*:\s*\[([^\]]+)\]", text, flags=re.IGNORECASE)
    m_caps = re.search(r"capacity\s+caps\s*:\s*\[([^\]]+)\]", text, flags=re.IGNORECASE)
    if not (m_hrs and m_caps):
        return None
    hrs = _parse_int_list(m_hrs.group(1))
    caps = _parse_int_list(m_caps.group(1))
    cost = _parse_labeled_matrix(text, r"Sub")
    n_subs, n_pkgs = len(caps), len(hrs)
    if len(cost) != n_subs or not all(len(r) == n_pkgs for r in cost):
        return None

    variables = {f"sub_{c}_{p}": _bin_var(f"sub_{c}_{p}") for c in range(n_subs) for p in range(n_pkgs)}
    constraints: List[ExpandedConstraint] = []
    for p in range(n_pkgs):
        constraints.append(
            ExpandedConstraint(name=f"pkg_{p}_once", left=" + ".join(f"sub_{c}_{p}" for c in range(n_subs)), op="==", right=1.0)
        )
    for c in range(n_subs):
        lhs = " + ".join(f"({hrs[p]} * sub_{c}_{p})" for p in range(n_pkgs))
        constraints.append(ExpandedConstraint(name=f"sub_{c}_cap", left=lhs, op="<=", right=float(caps[c])))

    obj_terms = [f"({_fmt_num(cost[c][p])} * sub_{c}_{p})" for c in range(n_subs) for p in range(n_pkgs)]
    return OptimizationModel(
        variables=variables,
        objective=ExpandedObjective(sense="MINIMIZE", expression=" + ".join(obj_terms)),
        constraints=constraints,
        metadata={"problem_type": "GAP", "n_subs": n_subs, "n_pkgs": n_pkgs},
    )


# ───────────────────────── 8. Construction Bid Portfolio (Quadratic Knapsack) ─────────────────────────

def _try_bid_portfolio(text: str) -> Optional[OptimizationModel]:
    low = text.lower()
    if "bonding requirements" not in low or "net margins" not in low:
        return None
    m_cap = re.search(r"bonding\s+capacity\s+of\s+(\d+)", text, flags=re.IGNORECASE)
    m_bond = re.search(r"bonding\s+requirements[^:]*:\s*\[([^\]]+)\]", text, flags=re.IGNORECASE)
    m_mar = re.search(r"net\s+margins[^:]*:\s*\[([^\]]+)\]", text, flags=re.IGNORECASE)
    if not (m_cap and m_bond and m_mar):
        return None
    cap = int(m_cap.group(1))
    bond = _parse_int_list(m_bond.group(1))
    margin = _parse_float_list(m_mar.group(1))
    n = len(bond)
    if n < 2 or len(margin) != n:
        return None

    synergies = [(int(i), int(j), float(v)) for i, j, v in re.findall(r"\(Tender\s*(\d+),\s*Tender\s*(\d+):\s*\+(\d+(?:\.\d+)?)\)", text)]
    variables = {f"bid_{i}": _bin_var(f"bid_{i}") for i in range(n)}
    constraints = [
        ExpandedConstraint(
            name="bonding_cap",
            left=" + ".join(f"({bond[i]} * bid_{i})" for i in range(n)),
            op="<=",
            right=float(cap),
        )
    ]
    terms = [f"+ ({_fmt_num(margin[i])} * bid_{i})" for i in range(n)]
    for i, j, v in synergies:
        terms.append(f"+ {_fmt_num(v)} * (bid_{i} * bid_{j})")

    return OptimizationModel(
        variables=variables,
        objective=ExpandedObjective(sense="MAXIMIZE", expression=" ".join(terms).lstrip("+ ").strip()),
        constraints=constraints,
        metadata={"problem_type": "QUADRATIC_KNAPSACK", "n": n},
    )


# ───────────────────────── 9. 0-1 Knapsack (Cargo / CapEx / Demand / Batch) ─────────────────────────

def _try_knapsack(text: str) -> Optional[OptimizationModel]:
    low = text.lower()
    # Pattern A: Logistics Cargo Knapsack
    m_cargo_cap = re.search(r"carry\s+at\s+most\s+(\d+)\s*kg", text, flags=re.IGNORECASE)
    if m_cargo_cap and "parcel 0:" in low:
        cap = int(m_cargo_cap.group(1))
        items = [(int(i), int(w), float(v)) for i, w, v in re.findall(r"parcel\s*(\d+)\s*:\s*weight\s*(\d+)\s*kg,\s*revenue\s*(\d+(?:\.\d+)?)", text, flags=re.IGNORECASE)]
        if len(items) >= 2:
            variables = {f"x_{i}": _bin_var(f"x_{i}") for i, _, _ in items}
            constraints = [
                ExpandedConstraint(
                    name="weight_capacity",
                    left=" + ".join(f"({w} * x_{i})" for i, w, _ in items),
                    op="<=",
                    right=float(cap),
                )
            ]
            expr = " + ".join(f"({_fmt_num(v)} * x_{i})" for i, _, v in items)
            return OptimizationModel(
                variables=variables,
                objective=ExpandedObjective(sense="MAXIMIZE", expression=expr),
                constraints=constraints,
                metadata={"problem_type": "KNAPSACK", "n": len(items)},
            )

    # Pattern B: Multi-industry Knapsack ("Select a subset of N ... cap of C. Candidates: item 0: <w_label> W, <v_label> V;")
    m_cap = re.search(r"select\s+a\s+subset\s+of\s+(\d+)\s+[^\n]+?cap\s+of\s+(\d+)", text, flags=re.IGNORECASE)
    if m_cap and "candidates:" in low:
        n_expected = int(m_cap.group(1))
        cap = int(m_cap.group(2))
        cand_part = text.split("Candidates:", 1)[1]
        cand_part = cand_part.split(". Maximize", 1)[0]
        chunks = [c.strip() for c in cand_part.split(";") if c.strip()]
        parsed = []
        for chunk in chunks:
            m_item = re.search(r"(\d+)\s*:\s*[^,]+?(\d+(?:\.\d+)?)\s*,\s*[^;]+?(\d+(?:\.\d+)?)\s*$", chunk)
            if m_item:
                parsed.append((int(m_item.group(1)), float(m_item.group(2)), float(m_item.group(3))))
        if len(parsed) == n_expected and len(parsed) >= 2:
            variables = {f"x_{i}": _bin_var(f"x_{i}") for i, _, _ in parsed}
            constraints = [
                ExpandedConstraint(
                    name="resource_cap",
                    left=" + ".join(f"({_fmt_num(w)} * x_{i})" for i, w, _ in parsed),
                    op="<=",
                    right=float(cap),
                )
            ]
            expr = " + ".join(f"({_fmt_num(v)} * x_{i})" for i, _, v in parsed)
            return OptimizationModel(
                variables=variables,
                objective=ExpandedObjective(sense="MAXIMIZE", expression=expr),
                constraints=constraints,
                metadata={"problem_type": "KNAPSACK", "n": len(parsed)},
            )
    return None


# ───────────────────────── 10. Uncapacitated Facility / Plant / Fleet Location ─────────────────────────

def _try_facility_location(text: str) -> Optional[OptimizationModel]:
    low = text.lower()
    if not any(k in low for k in ("opening costs", "fixed costs", "mobilization costs")):
        return None
    m_fixed = re.search(r"(?:opening\s+costs[^\[]*|fixed\s+costs\s*|mobilization\s+costs[^\[]*)\[([^\]]+)\]", text, flags=re.IGNORECASE)
    if not m_fixed:
        return None
    fixed = _parse_float_list(m_fixed.group(1))
    serve = _parse_labeled_matrix(text, r"warehouse|plant|Unit")
    m_fac = len(fixed)
    if m_fac < 2 or len(serve) != m_fac:
        return None
    n_cus = len(serve[0])
    if n_cus < 2 or not all(len(r) == n_cus for r in serve):
        return None

    variables: Dict[str, ExpandedVariable] = {}
    for i in range(m_fac):
        variables[f"y_{i}"] = _bin_var(f"y_{i}")
        for j in range(n_cus):
            variables[f"x_{i}_{j}"] = _bin_var(f"x_{i}_{j}")

    constraints: List[ExpandedConstraint] = []
    for j in range(n_cus):
        constraints.append(
            ExpandedConstraint(name=f"serve_{j}", left=" + ".join(f"x_{i}_{j}" for i in range(m_fac)), op="==", right=1.0)
        )
    for i in range(m_fac):
        for j in range(n_cus):
            constraints.append(ExpandedConstraint(name=f"link_{i}_{j}", left=f"x_{i}_{j} - y_{i}", op="<=", right=0.0))

    obj_terms = [f"({_fmt_num(fixed[i])} * y_{i})" for i in range(m_fac)] + [
        f"({_fmt_num(serve[i][j])} * x_{i}_{j})" for i in range(m_fac) for j in range(n_cus)
    ]
    return OptimizationModel(
        variables=variables,
        objective=ExpandedObjective(sense="MINIMIZE", expression=" + ".join(obj_terms)),
        constraints=constraints,
        metadata={"problem_type": "FACILITY_LOCATION", "facilities": m_fac, "customers": n_cus},
    )


# ───────────────────────── 11. Set Cover ─────────────────────────

def _try_set_cover(text: str) -> Optional[OptimizationModel]:
    low = text.lower()
    if "covers" not in low or "(cost" not in low:
        return None
    entries = re.findall(
        r"(\d+)\s*\(cost\s*(\d+(?:\.\d+)?)\)\s*covers\s+[a-z\s]+\[([^\]]+)\]",
        text,
        flags=re.IGNORECASE,
    )
    if len(entries) < 2:
        return None
    options = [(int(idx), float(cost), _parse_int_list(cov)) for idx, cost, cov in entries]
    universe = sorted({r for _, _, cov in options for r in cov})
    if not universe:
        return None

    variables = {f"y_{idx}": _bin_var(f"y_{idx}") for idx, _, _ in options}
    constraints: List[ExpandedConstraint] = []
    for r in universe:
        covering = [f"y_{idx}" for idx, _, cov in options if r in cov]
        if covering:
            constraints.append(ExpandedConstraint(name=f"cover_{r}", left=" + ".join(covering), op=">=", right=1.0))

    expr = " + ".join(f"({_fmt_num(cost)} * y_{idx})" for idx, cost, _ in options)
    return OptimizationModel(
        variables=variables,
        objective=ExpandedObjective(sense="MINIMIZE", expression=expr),
        constraints=constraints,
        metadata={"problem_type": "SET_COVER", "n_options": len(options), "n_elements": len(universe)},
    )


# ───────────────────────── 12. Shift & Trade Crew Rostering ─────────────────────────

def _try_shift_rostering(text: str) -> Optional[OptimizationModel]:
    low = text.lower()
    # Variant A: Trade Crew Rostering with Quadratic Stacking Penalties
    if "trade-stacking" in low or "shift staffing matches" in low:
        m_req = re.search(r"shift\s+staffing\s+matches\s*\[([^\]]+)\]", text, flags=re.IGNORECASE)
        m_crews = re.search(r"assign\s+\d+\s+trade\s+crews\s*\(([^)]+)\)", text, flags=re.IGNORECASE)
        if not (m_req and m_crews):
            return None
        req = _parse_int_list(m_req.group(1))
        crew_names = [c.strip() for c in m_crews.group(1).split(",")]
        name_to_idx = {name.lower(): i for i, name in enumerate(crew_names)}
        cost = _parse_labeled_matrix(text, r"Crew")
        n_crews, n_shifts = len(crew_names), len(req)
        if len(cost) != n_crews or not all(len(r) == n_shifts for r in cost):
            return None

        stacking: List[Tuple[int, int, float]] = []
        for a_name, b_name, pen in re.findall(r"\(([^+()]+?)\s*\+\s*([^:()]+?)\s*:\s*\+(\d+(?:\.\d+)?)\)", text):
            ia = name_to_idx.get(a_name.strip().lower())
            ib = name_to_idx.get(b_name.strip().lower())
            if ia is not None and ib is not None and ia != ib:
                stacking.append((ia, ib, float(pen)))

        variables = {f"crew_{i}_{t}": _bin_var(f"crew_{i}_{t}") for i in range(n_crews) for t in range(n_shifts)}
        constraints: List[ExpandedConstraint] = []
        for i in range(n_crews):
            constraints.append(ExpandedConstraint(name=f"crew_{i}_once", left=" + ".join(f"crew_{i}_{t}" for t in range(n_shifts)), op="==", right=1.0))
        for t in range(n_shifts):
            constraints.append(ExpandedConstraint(name=f"shift_{t}_demand", left=" + ".join(f"crew_{i}_{t}" for i in range(n_crews)), op="==", right=float(req[t])))

        parts = [f"+ ({_fmt_num(cost[i][t])} * crew_{i}_{t})" for i in range(n_crews) for t in range(n_shifts)]
        for ia, ib, pen in stacking:
            for t in range(n_shifts):
                parts.append(f"+ {_fmt_num(pen)} * (crew_{ia}_{t} * crew_{ib}_{t})")

        return OptimizationModel(
            variables=variables,
            objective=ExpandedObjective(sense="MINIMIZE", expression=" ".join(parts).lstrip("+ ").strip()),
            constraints=constraints,
            metadata={"problem_type": "TRADE_ROSTERING", "n_crews": n_crews, "n_shifts": n_shifts},
        )

    # Variant B: Standard Shift Rostering (headcount per shift + no consecutive shifts)
    if "required headcount per shift" in low and "wage cost matrix" in low:
        m_req = re.search(r"required\s+headcount\s+per\s+shift[^\[]*\[([^\]]+)\]", text, flags=re.IGNORECASE)
        if not m_req:
            return None
        req = _parse_int_list(m_req.group(1))
        cost = _parse_labeled_matrix(text, r"engineer")
        n_staff, n_shifts = len(cost), len(req)
        if n_staff < 2 or not all(len(r) == n_shifts for r in cost):
            return None

        variables = {f"x_{i}_{t}": _bin_var(f"x_{i}_{t}") for i in range(n_staff) for t in range(n_shifts)}
        constraints: List[ExpandedConstraint] = []
        for i in range(n_staff):
            constraints.append(ExpandedConstraint(name=f"staff_{i}_once", left=" + ".join(f"x_{i}_{t}" for t in range(n_shifts)), op="==", right=1.0))
            for t in range(n_shifts - 1):
                constraints.append(ExpandedConstraint(name=f"no_consec_{i}_{t}", left=f"x_{i}_{t} + x_{i}_{t + 1}", op="<=", right=1.0))
        for t in range(n_shifts):
            constraints.append(ExpandedConstraint(name=f"shift_{t}_req", left=" + ".join(f"x_{i}_{t}" for i in range(n_staff)), op="==", right=float(req[t])))

        expr = " + ".join(f"({_fmt_num(cost[i][t])} * x_{i}_{t})" for i in range(n_staff) for t in range(n_shifts))
        return OptimizationModel(
            variables=variables,
            objective=ExpandedObjective(sense="MINIMIZE", expression=expr),
            constraints=constraints,
            metadata={"problem_type": "SHIFT_ROSTERING", "n_staff": n_staff, "n_shifts": n_shifts},
        )
    return None


# ───────────────────────── 13. Square 1-to-1 Assignment (N×N) ─────────────────────────

def _try_square_assignment(text: str) -> Optional[OptimizationModel]:
    low = text.lower()
    if not ("assign " in low and ("exactly one" in low or "one-to-one" in low)):
        return None
    if any(k in low for k in ("warehouse", "plant", "mobilization", "subcontractor", "capacity", "flow matrix")):
        return None
    cost = _parse_labeled_matrix(text, r"driver|technician|crew|desk|machine|cell|line|worker|agent|row")
    n = len(cost)
    if n < 2 or not all(len(r) == n for r in cost):
        return None

    variables = {f"x_{i}_{j}": _bin_var(f"x_{i}_{j}") for i in range(n) for j in range(n)}
    constraints: List[ExpandedConstraint] = []
    for i in range(n):
        constraints.append(ExpandedConstraint(name=f"row_{i}_once", left=" + ".join(f"x_{i}_{j}" for j in range(n)), op="==", right=1.0))
    for j in range(n):
        constraints.append(ExpandedConstraint(name=f"col_{j}_once", left=" + ".join(f"x_{i}_{j}" for i in range(n)), op="==", right=1.0))

    expr = " + ".join(f"({_fmt_num(cost[i][j])} * x_{i}_{j})" for i in range(n) for j in range(n))
    return OptimizationModel(
        variables=variables,
        objective=ExpandedObjective(sense="MINIMIZE", expression=expr),
        constraints=constraints,
        metadata={"problem_type": "ASSIGNMENT", "n": n},
    )


def try_build_structured_om(problem_text: str) -> Optional[OptimizationModel]:
    """Try all deterministic natural-language structured compilers in specificity order."""
    if not problem_text:
        return None
    for builder in (
        _try_cvrp,
        _try_site_layout_qap,
        _try_portfolio_qubo,
        _try_maxcut,
        _try_unit_commitment,
        _try_time_cost_crashing,
        _try_subcontractor_gap,
        _try_bid_portfolio,
        _try_knapsack,
        _try_facility_location,
        _try_set_cover,
        _try_shift_rostering,
        _try_square_assignment,
    ):
        om = builder(problem_text)
        if om is not None:
            return om
    return None
