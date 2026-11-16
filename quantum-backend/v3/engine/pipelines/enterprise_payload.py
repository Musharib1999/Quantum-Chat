"""
Enterprise workspace payload builder.

Builds the structured, real-data block (`result.enterprise`) that the Enterprise
workbench renders: objective, constraints, decision variables, raw Q matrix and
solver result. Every value is derived from the compiled AutoQUBO IR
(`ir.metadata`, `ir.Q`, `ir.variable_map`) or from the solver result stored on the
workspace. Nothing here is invented: when a value is unavailable it is returned as
`None` (or an empty list) so the UI can show an honest empty state.
"""
import re
from typing import Any, Dict, List, Optional

# Hard cap on Q-matrix entries sent to the browser. When exceeded, the entries with the
# largest magnitude are kept and `truncated` is set so the UI can say so.
MAX_Q_ENTRIES = 5000


def _num(value: Any) -> Optional[float]:
    """Return a finite float or None."""
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if f != f or f in (float("inf"), float("-inf")):
        return None
    return f


def build_q_matrix_payload(
    ir: Any,
    penalty_weight: Optional[float] = None,
    penalty_label: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Sparse, JSON-safe representation of the compiled QUBO matrix."""
    if ir is None or getattr(ir, "Q", None) is None:
        return None

    import numpy as np

    Q = ir.Q
    names: List[str] = list(ir.variable_map.all_vars)
    n_decision = len(ir.variable_map.decision_vars)
    name_to_idx = {n: k for k, n in enumerate(names)}

    entries: List[Dict[str, Any]] = []
    if isinstance(Q, np.ndarray):
        rows, cols = np.nonzero(Q)
        for i, j in zip(rows.tolist(), cols.tolist()):
            v = _num(Q[i, j])
            if v is not None and v != 0.0:
                entries.append({"i": i, "j": j, "value": round(v, 6)})
    elif hasattr(Q, "tocoo"):
        coo = Q.tocoo()
        for i, j, v in zip(coo.row.tolist(), coo.col.tolist(), coo.data.tolist()):
            fv = _num(v)
            if fv is not None and fv != 0.0:
                entries.append({"i": i, "j": j, "value": round(fv, 6)})
    elif isinstance(Q, dict):
        for (u, v), val in Q.items():
            i = u if isinstance(u, int) else name_to_idx.get(u)
            j = v if isinstance(v, int) else name_to_idx.get(v)
            fv = _num(val)
            if i is not None and j is not None and fv is not None and fv != 0.0:
                entries.append({"i": int(i), "j": int(j), "value": round(fv, 6)})
    else:
        return None

    nnz = len(entries)
    truncated = nnz > MAX_Q_ENTRIES
    if truncated:
        entries = sorted(entries, key=lambda e: abs(e["value"]), reverse=True)[:MAX_Q_ENTRIES]
    entries.sort(key=lambda e: (e["i"], e["j"]))

    return {
        "size": len(names),
        "variables": [
            {"name": n, "kind": "decision" if k < n_decision else "slack"}
            for k, n in enumerate(names)
        ],
        "entries": entries,
        "nnz": nnz,
        "truncated": truncated,
        "offset": _num(getattr(ir, "offset", None)),
        "penalty_weight": _num(penalty_weight),
        "penalty_label": penalty_label,
        "decision_count": n_decision,
        "slack_count": len(names) - n_decision,
    }


def _registry_label(name: str, registry: List[Dict[str, Any]]) -> Optional[str]:
    """Best-effort human label for an expanded variable name such as `shift_3` or `x_1_2`."""
    for var in registry or []:
        base = var.get("name")
        if not base or not (name == base or name.startswith(base + "_")):
            continue
        labels = var.get("labels") or []
        suffix = name[len(base) + 1:] if name != base else ""
        parts = suffix.split("_") if suffix else []
        if parts and parts[0].isdigit():
            first = int(parts[0])
            if first < len(labels):
                rest = parts[1:]
                return str(labels[first]) if not rest else f"{labels[first]} [{', '.join(rest)}]"
    return None


def _registry_domain(name: str, registry: List[Dict[str, Any]]) -> Optional[str]:
    for var in registry or []:
        base = var.get("name")
        if base and (name == base or name.startswith(base + "_")):
            return str(var.get("domain", "")).lower() or None
    return None


def _var_type(domain: Optional[str]) -> str:
    d = (domain or "").lower()
    if "int" in d:
        return "INTEGER"
    if "cont" in d or "real" in d or "float" in d:
        return "CONTINUOUS"
    return "BINARY"


def build_variables(spec: Dict[str, Any], ir: Any, solution: Dict[str, Any]) -> List[Dict[str, Any]]:
    registry = (spec or {}).get("variable_registry", []) or []

    if solution:
        names = list(solution.keys())
    elif ir is not None:
        names = list(ir.variable_map.decision_vars)
    else:
        names = []

    int_enc = {}
    if ir is not None:
        int_enc = (getattr(ir, "metadata", None) or {}).get("int_encodings", {}) or {}

    out: List[Dict[str, Any]] = []
    for name in names:
        domain = _registry_domain(name, registry)
        vtype = _var_type(domain)
        lower: Optional[float] = 0.0 if vtype == "BINARY" else None
        upper: Optional[float] = 1.0 if vtype == "BINARY" else None
        enc = int_enc.get(name)
        if isinstance(enc, dict):
            lower = _num(enc.get("lb", lower))
            upper = _num(enc.get("ub", upper))
        out.append(
            {
                "name": name,
                "var_type": vtype,
                "lower_bound": lower,
                "upper_bound": upper,
                "description": _registry_label(name, registry),
            }
        )
    return out


def _slack_bit_counts(ir: Any) -> Dict[str, int]:
    """Real number of slack bits per constraint, from the compiled variable map."""
    counts: Dict[str, int] = {}
    if ir is None:
        return counts
    for c in (getattr(ir, "metadata", None) or {}).get("original_constraints", []) or []:
        safe_name = re.sub(r"\W+", "_", str(c.get("name", "")))
        prefix = f"slack_{safe_name}_"
        counts[c["name"]] = sum(1 for s in ir.variable_map.slack_vars if s.startswith(prefix))
    return counts


def build_constraints(
    spec: Dict[str, Any], ir: Any, feasibility: Dict[str, Any]
) -> List[Dict[str, Any]]:
    feasibility = feasibility or {}
    slack_bits = _slack_bit_counts(ir)
    original = (getattr(ir, "metadata", None) or {}).get("original_constraints", []) if ir is not None else []

    out: List[Dict[str, Any]] = []
    if original:
        for idx, c in enumerate(original):
            name = str(c.get("name", f"constraint_{idx + 1}"))
            op = str(c.get("op", "<="))
            rhs = _num(c.get("right"))
            report = feasibility.get(name) or {}
            lhs = _num(report.get("lhs"))
            slack: Optional[float] = None
            if lhs is not None and rhs is not None:
                if op == "<=":
                    slack = rhs - lhs
                elif op == ">=":
                    slack = lhs - rhs
                else:
                    slack = abs(lhs - rhs)
            out.append(
                {
                    "id": f"c_{idx}",
                    "name": name,
                    "left": str(c.get("left", "")),
                    "op": "==" if op == "=" else op,
                    "right": rhs,
                    "lhs_value": lhs,
                    "satisfied": report.get("feasible") if "feasible" in report else None,
                    "slack": slack,
                    "slack_bits": slack_bits.get(name),
                }
            )
        return out

    # No compiled IR available: fall back to the parsed registry (names/operators only).
    for idx, c in enumerate((spec or {}).get("constraint_registry", []) or []):
        rhs_obj = c.get("rhs") or {}
        out.append(
            {
                "id": f"c_{idx}",
                "name": str(c.get("name") or c.get("id") or f"constraint_{idx + 1}"),
                "left": str(c.get("description") or ""),
                "op": str(c.get("operator") or "<="),
                "right": _num(rhs_obj.get("value")) if isinstance(rhs_obj, dict) else None,
                "lhs_value": None,
                "satisfied": None,
                "slack": None,
                "slack_bits": None,
            }
        )
    return out


def build_objective(spec: Dict[str, Any], ir: Any) -> Dict[str, Any]:
    meta = (getattr(ir, "metadata", None) or {}) if ir is not None else {}
    expr = meta.get("original_objective_expr")
    sense = meta.get("original_objective_sense")
    if not sense:
        objectives = (spec or {}).get("objectives", []) or []
        if objectives:
            sense = objectives[0].get("sense") or objectives[0].get("type")
    return {
        "sense": str(sense).lower() if sense else None,
        "expression": str(expr) if expr else None,
    }


def build_execution(exec_res: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Solver result exactly as produced by the sampler. None when no solver ran."""
    if not exec_res or "energy" not in exec_res:
        return None
    return {
        "feasible": exec_res.get("feasible"),
        "energy": _num(exec_res.get("energy")),
        "objective_value": _num(exec_res.get("objective_value")),
        "solution": exec_res.get("solution") or {},
        "selected_variables": exec_res.get("selected_variables") or [],
        "num_reads": exec_res.get("num_reads"),
        "penalty_weight": _num(exec_res.get("penalty_weight")),
        "penalty_label": exec_res.get("penalty_label"),
    }


def build_enterprise_payload(workspace: Any, ir: Any) -> Dict[str, Any]:
    spec = workspace.problem_specification or {}
    exec_res = workspace.execution_result or {}
    execution = build_execution(exec_res)
    solution = (execution or {}).get("solution") or {}

    return {
        "objective": build_objective(spec, ir),
        "variables": build_variables(spec, ir, solution),
        "constraints": build_constraints(spec, ir, exec_res.get("feasibility") or {}),
        "q_matrix": build_q_matrix_payload(
            ir,
            penalty_weight=(execution or {}).get("penalty_weight"),
            penalty_label=(execution or {}).get("penalty_label"),
        ),
        "execution": execution,
    }
