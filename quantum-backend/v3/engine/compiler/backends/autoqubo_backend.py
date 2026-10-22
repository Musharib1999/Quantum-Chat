# -*- coding: utf-8 -*-
"""
AutoQUBO Backend — Bit2Qubit Compiler V10 (Fujitsu Research Integration)
========================================================================
Converts an OptimizationModel into a QUBO matrix via Fujitsu Research's
`autoqubo` package, which uses a data-driven sampling method to derive
the Q coefficients automatically from Python objective and penalty functions.

This version implements a modular architecture:
  1. VariableMap & QuboIR data containers.
  2. Dynamic slack variable calculator for inequality constraints.
  3. Readable Python code generator.
  4. Q Matrix Validation.
  5. DWaveAdapter for solver adapter interface with integrated feasibility checking.
  6. Equivalence Verification Pass.
"""

from __future__ import annotations
import re
import math
import numpy as np
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Dict, Any, List, Callable, Optional

if TYPE_CHECKING:
    from ..expander import OptimizationModel

# ── 1. Data Models ────────────────────────────────────────────────────────────

@dataclass
class VariableMap:
    decision_vars: List[str] = field(default_factory=list)
    slack_vars: List[str] = field(default_factory=list)

    @property
    def total_vars(self) -> int:
        return len(self.decision_vars) + len(self.slack_vars)

    @property
    def all_vars(self) -> List[str]:
        return self.decision_vars + self.slack_vars

@dataclass
class QuboIR:
    Q: Optional[np.ndarray]
    offset: float
    variable_map: VariableMap
    metadata: Dict[str, Any] = field(default_factory=dict)
    qubo_code: str = ""

# ── 2. Validation ─────────────────────────────────────────────────────────────

def get_expr_degree(expr) -> int:
    cls_name = expr.__class__.__name__
    if cls_name == "Constant":
        return 0
    elif cls_name == "VarRef":
        return 1
    elif cls_name == "Sum":
        return get_expr_degree(expr.expression)
    elif cls_name == "BinaryOp":
        if expr.op in ["+", "-"]:
            return max(get_expr_degree(expr.left), get_expr_degree(expr.right))
        elif expr.op == "*":
            return get_expr_degree(expr.left) + get_expr_degree(expr.right)
    return 0

def validate_optimization_model(om: "OptimizationModel"):
    """Run frontend validation checks on the OptimizationModel before compiling."""
    decision_vars = list(om.variables.keys())
    
    # 1. Duplicated variable names check
    if len(decision_vars) != len(set(decision_vars)):
        raise ValueError("Duplicate variable names detected in the registry")
        
    # 2. Duplicate constraint names check
    c_names = [c.name for c in om.constraints]
    if len(c_names) != len(set(c_names)):
        raise ValueError("Duplicate constraint names detected")

    # 3. Missing variable references check
    for c in om.constraints:
        tokens = re.findall(r"\b[a-zA-Z_]\w*\b", c.left)
        for token in tokens:
            if token.lower() in ["max", "sum", "min", "abs"] or token.isdigit():
                continue
            if token not in decision_vars:
                raise ValueError(f"Constraint '{c.name}' references undefined variable '{token}'")
                


def validate_qubo(Q: np.ndarray, expected_dim: int):
    """Validate mathematical structure of the generated Q matrix."""
    if Q is None:
        raise ValueError("Q matrix is None")
    if Q.ndim != 2:
        raise ValueError(f"Q must be a 2D matrix, got dimension {Q.ndim}")
    if Q.shape[0] != Q.shape[1]:
        raise ValueError(f"Q must be square, got shape {Q.shape}")
    if Q.shape[0] != expected_dim:
        raise ValueError(f"Dimension mismatch: expected {expected_dim}, got {Q.shape[0]}")
    if not np.isfinite(Q).all():
        raise ValueError("Q matrix contains NaN or infinite values")
    if not np.allclose(Q, np.triu(Q)):
        raise ValueError("Q matrix must be upper triangular")

# ── 3. D-Wave Adapter ─────────────────────────────────────────────────────────

class DWaveAdapter:
    """Translates, solves, and decodes generic QuboIR models for D-Wave solvers with safety checks."""
    def __init__(self, sampler=None):
        self.sampler = sampler

    def to_sparse_dict(self, Q: np.ndarray) -> Dict[tuple, float]:
        """Convert dense upper-triangular numpy matrix to D-Wave sparse coordinate dict."""
        qubo_dict = {}
        n = Q.shape[0]
        for i in range(n):
            for j in range(i, n):
                if Q[i, j] != 0.0:
                    qubo_dict[(i, j)] = float(Q[i, j])
        return qubo_dict

    def solve(self, ir: QuboIR, num_reads: int = 5000, seed: Optional[int] = 42) -> Dict[str, Any]:
        """Build BQM and solve using the D-Wave sampler with feasibility verification."""
        if ir.Q is None:
            raise ValueError("Cannot solve a QuboIR with a null Q matrix")
        
        # Validate the matrix shape and content
        validate_qubo(ir.Q, ir.variable_map.total_vars)

        # Convert dense to sparse
        sparse_qubo = self.to_sparse_dict(ir.Q)

        # Load into BQM (incorporating offset)
        import dimod
        bqm = dimod.BinaryQuadraticModel.from_qubo(sparse_qubo, offset=ir.offset)

        # Initialize local simulator if none provided
        sampler = self.sampler
        if sampler is None:
            from dwave.samplers import SimulatedAnnealingSampler
            sampler = SimulatedAnnealingSampler()

        # Solve
        kwargs = {}
        if seed is not None:
            kwargs["seed"] = seed
        sampleset = sampler.sample(bqm, num_reads=num_reads, **kwargs)
        best_sample = sampleset.first.sample

        # Slice decision variables and discard slacks
        n_decision = len(ir.variable_map.decision_vars)
        raw_sol = {}
        for i in range(n_decision):
            var_name = ir.variable_map.decision_vars[i]
            raw_sol[var_name] = int(best_sample[i])

        int_encodings = ir.metadata.get("int_encodings", {})
        if int_encodings:
            decoded_sol = {}
            encoded_bits = set()
            for int_var, enc in int_encodings.items():
                val = int(enc.get("lb", 0))
                for b_name, b_w in enc.get("bits", []):
                    encoded_bits.add(b_name)
                    val += int(round(b_w)) * raw_sol.get(b_name, 0)
                decoded_sol[int_var] = int(val)
            for k, v in raw_sol.items():
                if k not in encoded_bits:
                    decoded_sol[k] = v
        else:
            decoded_sol = raw_sol

        # ── Feasibility & Objective Evaluation Pass ──
        # Re-evaluate objective value using the original algebraic formulation
        obj_expr = ir.metadata.get("original_objective_expr", "0.0")
        obj_sense = ir.metadata.get("original_objective_sense", "MINIMIZE")
        
        _tok_re = re.compile(r"\b[a-zA-Z_]\w*\b")

        def safe_eval(expr_str: str, sol: dict) -> float:
            # Single-pass O(len(expr)) token lookup + chunked evaluation safe for N > 10,000 terms
            safe = _tok_re.sub(lambda m: str(sol.get(m.group(0), m.group(0))), expr_str)
            if safe.count("+") > 250 and "(" not in safe:
                parts = safe.split("+")
                return float(sum(eval("+".join(parts[k:k + 200])) for k in range(0, len(parts), 200)))
            return float(eval(safe))

        obj_val = safe_eval(obj_expr, decoded_sol)

        # Re-evaluate all original constraints
        constraints = ir.metadata.get("original_constraints", [])
        feasibility_report = {}
        overall_feasible = True
        violated_constraints = []

        for c in constraints:
            lhs_val = safe_eval(c["left"], decoded_sol)
            op = c["op"]
            rhs = float(c["right"])
            
            feasible = True
            if op == "<=":
                feasible = lhs_val <= rhs
            elif op == ">=":
                feasible = lhs_val >= rhs
            elif op in ["=", "=="]:
                feasible = abs(lhs_val - rhs) < 1e-5
            
            feasibility_report[c["name"]] = {
                "feasible": feasible,
                "lhs": lhs_val,
                "rhs": rhs,
                "op": op
            }
            if not feasible:
                overall_feasible = False
                violated_constraints.append(c["name"])

        return {
            "success": True,
            "solution": decoded_sol,
            "energy": float(sampleset.first.energy),
            "objective_value": obj_val,
            "feasible": overall_feasible,
            "feasibility_report": feasibility_report,
            "violated_constraints": violated_constraints,
            "metadata": ir.metadata
        }

# ── 4. Expression Parser ──────────────────────────────────────────────────────

def parse_linear_expression(expr_str: str, variables_def: List[str]) -> Dict[str, float]:
    """Parses a linear constraint string and extracts variable coefficients (sparse — only non-zero vars)."""
    expr_str = expr_str.replace(" ", "")
    # Use a set for fast lookup; only accumulate vars that actually appear
    variables_set = set(variables_def)
    coefs: Dict[str, float] = {}
    cleaned = expr_str.replace("(", "").replace(")", "").replace("-", "+-")
    terms = cleaned.split("+")
    for term in terms:
        if not term:
            continue
        if "*" in term:
            parts = term.split("*")
            if len(parts) == 2:
                try:
                    var_name = parts[1]
                    if var_name in variables_set:
                        coefs[var_name] = coefs.get(var_name, 0.0) + float(parts[0])
                except ValueError:
                    pass
        else:
            var_name = term
            sign = 1.0
            if var_name.startswith("-"):
                sign = -1.0
                var_name = var_name[1:]
            elif var_name.startswith("+"):
                var_name = var_name[1:]
            if var_name in variables_set:
                coefs[var_name] = coefs.get(var_name, 0.0) + sign
    # Remove any zero entries that may have accumulated (e.g. +x - x)
    return {k: v for k, v in coefs.items() if v != 0.0}

# ── 5. Compilation Pipeline ───────────────────────────────────────────────────

def compile_om_to_autoqubo_ir(
    om: "OptimizationModel",
    penalty_weight: float = 10.0,
    debug: bool = False,
) -> QuboIR:
    """Compile OptimizationModel to QuboIR intermediate representation."""
    
    # 1. Validate the OptimizationModel first
    validate_optimization_model(om)

    orig_obj_expr = om.objective.expression or "0.0"
    orig_obj_sense = om.objective.sense.upper()
    orig_constraints = [
        {
            "name": c.name,
            "left": c.left,
            "op": c.op,
            "right": float(c.right)
        }
        for c in om.constraints
    ]

    # 1b. Automatic Bounded Binary Log-Encoding for INTEGER Decision Variables (v = lb + sum(w_k * b_k))
    int_encodings = {}
    for v_name, v_obj in om.variables.items():
        v_type_str = str(getattr(v_obj.var_type, "value", v_obj.var_type)).upper()
        if "INT" in v_type_str:
            lb = int(round(v_obj.lower_bound)) if v_obj.lower_bound is not None else 0
            ub = int(round(v_obj.upper_bound)) if v_obj.upper_bound is not None else 3
            span = max(0, ub - lb)
            if span == 0:
                int_encodings[v_name] = {"lb": lb, "ub": ub, "bits": []}
            else:
                n_bits = math.ceil(math.log2(span + 1))
                bits = []
                for k in range(n_bits):
                    b_name = f"{v_name}_bit_{k}"
                    b_weight = float((span - (2 ** k) + 1) if k == n_bits - 1 else (2 ** k))
                    bits.append((b_name, b_weight))
                int_encodings[v_name] = {"lb": lb, "ub": ub, "bits": bits}

    if int_encodings:
        from ..expander import OptimizationModel as _OM, ExpandedVariable as _EV, ExpandedConstraint as _EC, ExpandedObjective as _EO
        orig_var_names = list(om.variables.keys())
        bin_variables = {}
        for v_name, v_obj in om.variables.items():
            if v_name in int_encodings:
                for b_name, _ in int_encodings[v_name]["bits"]:
                    bin_variables[b_name] = _EV(name=b_name, var_type="BINARY", lower_bound=0.0, upper_bound=1.0)
            else:
                bin_variables[v_name] = v_obj

        bin_constraints = []
        for c in om.constraints:
            coefs = parse_linear_expression(c.left, orig_var_names)
            rhs_shift = 0.0
            terms_str = []
            for v_name, w in coefs.items():
                if v_name in int_encodings:
                    enc = int_encodings[v_name]
                    rhs_shift += w * enc["lb"]
                    for b_name, b_w in enc["bits"]:
                        terms_str.append(f"{w * b_w}*{b_name}")
                else:
                    terms_str.append(f"{w}*{v_name}")
            new_left = " + ".join(terms_str).replace("+ -", "- ") if terms_str else "0.0"
            new_right = float(c.right) - rhs_shift
            bin_constraints.append(_EC(name=c.name, left=new_left, op=c.op, right=new_right))

        obj_coefs = parse_linear_expression(orig_obj_expr, orig_var_names)
        if obj_coefs:
            obj_terms = []
            for v_name, w in obj_coefs.items():
                if v_name in int_encodings:
                    enc = int_encodings[v_name]
                    for b_name, b_w in enc["bits"]:
                        obj_terms.append(f"{w * b_w}*{b_name}")
                else:
                    obj_terms.append(f"{w}*{v_name}")
            new_obj_expr = " + ".join(obj_terms).replace("+ -", "- ") if obj_terms else "0.0"
        else:
            new_obj_expr = orig_obj_expr

        om = _OM(
            variables=bin_variables,
            objective=_EO(sense=om.objective.sense, expression=new_obj_expr),
            constraints=bin_constraints
        )

    decision_vars = list(om.variables.keys())
    v_map = VariableMap(decision_vars=decision_vars)

    # 2. Analyze inequality constraints and dynamically generate slack variables
    slack_blocks = {}
    dependency_constraints = {}
    mutual_exclusion_constraints = {}
    clique_mutex_constraints = {}
    always_satisfied_inequalities = set()  # inequalities where lhs_max <= rhs (vacuously true)

    for c in om.constraints:
        if c.op in ["<=", ">="]:
            coefs = parse_linear_expression(c.left, decision_vars)
            
            # Identify dependency constraint: x_j - x_i <= 0
            pos_vars = [var for var, val in coefs.items() if val == 1.0]
            neg_vars = [var for var, val in coefs.items() if val == -1.0]
            other_vars = [var for var, val in coefs.items() if val != 0.0 and val != 1.0 and val != -1.0]
            
            if c.op == "<=" and float(c.right) == 0.0 and len(pos_vars) == 1 and len(neg_vars) == 1 and len(other_vars) == 0:
                # Mathematically exact binary dependency constraint: x_j <= x_i -> Penalty = x_j * (1 - x_i)
                # No slack variables required!
                dependency_constraints[c.name] = (pos_vars[0], neg_vars[0])
                continue

            # Identify mutual exclusion constraint: x_i + x_j <= 1 (2-var) or sum_{i in S} x_i <= 1 (k-var clique)
            if c.op == "<=" and float(c.right) == 1.0 and len(pos_vars) == 2 and len(neg_vars) == 0 and len(other_vars) == 0:
                # Mathematically exact binary mutual exclusion: x_i + x_j <= 1 -> Penalty = x_i * x_j
                # No slack variables required!
                mutual_exclusion_constraints[c.name] = (pos_vars[0], pos_vars[1])
                continue

            if c.op == "<=" and float(c.right) == 1.0 and len(pos_vars) > 2 and len(neg_vars) == 0 and len(other_vars) == 0:
                # Mathematically exact k-variable at-most-one constraint: sum_{i in S} x_i <= 1 -> Penalty = sum_{a<b} x_a * x_b
                # No slack variables required!
                clique_mutex_constraints[c.name] = pos_vars
                continue

            # Standard inequality constraint -> requires slack variables
            lhs_max = 0.0
            lhs_min = 0.0
            for var_name, w in coefs.items():
                ub = 1.0  # default binary upper bound
                lb = 0.0  # default binary lower bound
                if w > 0:
                    lhs_max += w * ub
                    lhs_min += w * lb
                else:
                    lhs_max += w * lb
                    lhs_min += w * ub
            
            if c.op == "<=":
                if lhs_max <= c.right:
                    s_max = lhs_max - c.right
                elif lhs_min < 0 and c.right < 0:
                    s_max = c.right - lhs_min
                else:
                    s_max = lhs_max - c.right
            else:
                s_max = c.right - lhs_min

            if s_max > 0:
                n_slack = math.ceil(math.log2(s_max + 1))
                c_slacks = []
                for k in range(n_slack):
                    slack_name = f"slack_{re.sub(r'\W+', '_', c.name)}_{k}"
                    c_slacks.append(slack_name)
                    v_map.slack_vars.append(slack_name)
                slack_blocks[c.name] = (s_max, c_slacks)
            else:
                # s_max <= 0: LHS can never exceed RHS for any binary state
                # Constraint is always satisfied — no penalty needed, skip it
                always_satisfied_inequalities.add(c.name)

    # 3. Generate the self-contained AutoQUBO python solver script code
    all_vars = v_map.all_vars
    var_to_idx = {name: i for i, name in enumerate(all_vars)}

    # Single-pass O(len(expr)) variable token replacer (safe & fast for N > 10,000)
    _var_tok_re = re.compile(r"\b[a-zA-Z_]\w*\b")

    def to_safe_expr(expr_str: str) -> str:
        return _var_tok_re.sub(lambda m: f"x[{var_to_idx[m.group(0)]}]" if m.group(0) in var_to_idx else m.group(0), expr_str)

    lines = [
        "# ── Compiled AutoQUBO Function Builder ──",
        "from autoqubo import SamplingCompiler",
        "import numpy as np",
        "",
        f"variable_map = {all_vars}",
        f"n_vars = {v_map.total_vars}",
        "",
        "# Helper functions for compact representation",
        "def make_dep(idx_pos, idx_neg):",
        "    return lambda x: x[idx_pos] * (1.0 - x[idx_neg])",
        "",
        "def make_mut(idx_a, idx_b):",
        "    return lambda x: x[idx_a] * x[idx_b]",
        "",
        "def make_clique_mut(indices):",
        "    return lambda x: (sum(x[i] for i in indices) * (sum(x[i] for i in indices) - 1.0)) / 2.0",
        "",
        "def make_eq(indices, coefs, rhs):",
        "    return lambda x: (sum(c * x[i] for c, i in zip(coefs, indices)) - rhs) ** 2",
        "",
        "def make_ineq(lhs_indices, lhs_coefs, slack_indices, slack_coefs, rhs, op):",
        "    if op == '<=':",
        "        return lambda x: (sum(c * x[i] for c, i in zip(lhs_coefs, lhs_indices)) + sum(c * x[i] for c, i in zip(slack_coefs, slack_indices)) - rhs) ** 2",
        "    else:",
        "        return lambda x: (rhs + sum(c * x[i] for c, i in zip(slack_coefs, slack_indices)) - sum(c * x[i] for c, i in zip(lhs_coefs, lhs_indices))) ** 2",
        ""
    ]

    # Objective function code block (AST-chunked if > 250 terms so CPython never hits AST recursion depth limit at N > 980)
    raw_obj_expr = om.objective.expression or "0.0"
    safe_obj = to_safe_expr(raw_obj_expr)
    sign = "-1.0 * " if om.objective.sense.upper() == "MAXIMIZE" else ""
    if safe_obj.count("+") > 250 and "*" not in safe_obj.replace(" * x[", "").replace("*x[", ""):
        obj_coefs_map = parse_linear_expression(raw_obj_expr, decision_vars)
        obj_indices = [var_to_idx[k] for k in obj_coefs_map.keys()]
        obj_coefs_list = [float(v) for v in obj_coefs_map.values()]
        lines.extend([
            f"_obj_indices = {obj_indices}",
            f"_obj_coefs = {obj_coefs_list}",
            "def objective_fn(x):",
            f"    return {sign}sum(c * x[i] for c, i in zip(_obj_coefs, _obj_indices))",
            "",
            "constraint_fns = []",
            "constraint_names = []",
            ""
        ])
    else:
        lines.extend([
            "def objective_fn(x):",
            f"    return {sign}({safe_obj})",
            "",
            "constraint_fns = []",
            "constraint_names = []",
            ""
        ])

    # Constraint functions code blocks
    # ── Compact Serialization ─────────────────────────────────────────────────
    dep_specs    = []   # [(idx_pos, idx_neg, name), ...]
    mut_specs    = []   # [(idx_a,   idx_b,   name), ...]
    clique_specs = []   # [(indices_list,     name), ...]
    eq_specs     = []   # [(lhs_indices, lhs_coefs, rhs, name), ...]
    ineq_specs   = []   # [(lhs_indices, lhs_coefs, slack_indices, slack_coefs, rhs, op, name), ...]

    for c in om.constraints:
        if c.name in dependency_constraints:
            pos_var, neg_var = dependency_constraints[c.name]
            dep_specs.append((var_to_idx[pos_var], var_to_idx[neg_var], c.name))
            continue

        if c.name in mutual_exclusion_constraints:
            var_a, var_b = mutual_exclusion_constraints[c.name]
            mut_specs.append((var_to_idx[var_a], var_to_idx[var_b], c.name))
            continue

        if c.name in clique_mutex_constraints:
            c_vars = clique_mutex_constraints[c.name]
            clique_specs.append(([var_to_idx[v] for v in c_vars], c.name))
            continue

        # Skip inequalities that are always satisfiable (s_max <= 0)
        if c.name in always_satisfied_inequalities:
            continue

        coefs = parse_linear_expression(c.left, decision_vars)
        sparse_coefs = {k: v for k, v in coefs.items() if v != 0.0}
        lhs_indices = [var_to_idx[name] for name in sparse_coefs.keys()]
        lhs_coefs   = [float(val) for val in sparse_coefs.values()]

        if c.name in slack_blocks:
            s_max, c_slacks = slack_blocks[c.name]
            slack_indices = []
            slack_coefs   = []
            for k, slack_name in enumerate(c_slacks):
                slack_idx = var_to_idx[slack_name]
                coeff = (s_max - (2 ** k) + 1) if k == len(c_slacks) - 1 else (2 ** k)
                slack_indices.append(slack_idx)
                slack_coefs.append(float(coeff))
            ineq_specs.append((lhs_indices, lhs_coefs, slack_indices, slack_coefs, float(c.right), c.op, c.name))
        else:
            eq_specs.append((lhs_indices, lhs_coefs, float(c.right), c.name))

    # Emit compact data-driven constraint registration (O(1) lines regardless of N constraints)
    if dep_specs:
        lines.append(f"_dep_specs = {dep_specs}")
        lines.append("for _p, _n, _nm in _dep_specs: constraint_fns.append(make_dep(_p, _n)); constraint_names.append(_nm)")
    if mut_specs:
        lines.append(f"_mut_specs = {mut_specs}")
        lines.append("for _a, _b, _nm in _mut_specs: constraint_fns.append(make_mut(_a, _b)); constraint_names.append(_nm)")
    if clique_specs:
        lines.append(f"_clique_specs = {clique_specs}")
        lines.append("for _ci, _nm in _clique_specs: constraint_fns.append(make_clique_mut(_ci)); constraint_names.append(_nm)")
    if eq_specs:
        lines.append(f"_eq_specs = {eq_specs}")
        lines.append("for _li, _lc, _r, _nm in _eq_specs: constraint_fns.append(make_eq(_li, _lc, _r)); constraint_names.append(_nm)")
    if ineq_specs:
        lines.append(f"_ineq_specs = {ineq_specs}")
        lines.append("for _li, _lc, _si, _sc, _r, _op, _nm in _ineq_specs: constraint_fns.append(make_ineq(_li, _lc, _si, _sc, _r, _op)); constraint_names.append(_nm)")

    # Use Active-Subspace SamplingCompiler when n_vars > 45 or total constraints > 45
    use_subspace_sampling = (v_map.total_vars > 45) or (len(om.constraints) > 45)
    if not use_subspace_sampling:
        lines.extend([
            "# ── QUBO Compilation ──",
            "def get_qubo():",
            "    Q_cost, offset_cost = SamplingCompiler.generate_qubo_matrix(",
            "        objective_fn,",
            "        n_vars,",
            "        use_multiprocessing=False",
            "    )",
            "    Q_con, offset_con = SamplingCompiler.generate_qubo_matrix(",
            "        lambda x: sum(fn(x) for fn in constraint_fns),",
            "        n_vars,",
            "        use_multiprocessing=False",
            "    )",
            "    # Fix for AutoQUBO library offset scaling bug",
            f"    Q = Q_cost + {penalty_weight} * Q_con",
            f"    offset = offset_cost + {penalty_weight} * offset_con",
            "    return Q, offset"
        ])
    else:
        lines.extend([
            "# ── QUBO Compilation (Active-Subspace SamplingCompiler for High-Scale N) ──",
            "def _scatter_subspace_qubo(Q_global, active_idx, local_fn):",
            "    k = len(active_idx)",
            "    if k == 0:",
            "        return float(local_fn([]))",
            "    Q_loc, off_loc = SamplingCompiler.generate_qubo_matrix(local_fn, k, use_multiprocessing=False)",
            "    for a in range(k):",
            "        ga = active_idx[a]",
            "        Q_global[ga, ga] += Q_loc[a, a]",
            "        for b in range(a + 1, k):",
            "            gb = active_idx[b]",
            "            if ga < gb:",
            "                Q_global[ga, gb] += Q_loc[a, b] + Q_loc[b, a]",
            "            else:",
            "                Q_global[gb, ga] += Q_loc[a, b] + Q_loc[b, a]",
            "    return float(off_loc)",
            "",
            "def get_qubo():",
            "    Q_cost = np.zeros((n_vars, n_vars), dtype=np.float64)",
            "    offset_cost = 0.0",
            "    if '_obj_indices' in globals():",
            "        for _ch in range(0, len(_obj_indices), 16):",
            "            _sub_i = _obj_indices[_ch:_ch+16]",
            "            _sub_c = _obj_coefs[_ch:_ch+16]",
            f"            _sgn = -1.0 if '{om.objective.sense.upper()}' == 'MAXIMIZE' else 1.0",
            "            offset_cost += _scatter_subspace_qubo(Q_cost, _sub_i, lambda z, sc=_sub_c, sg=_sgn: sg * sum(c * z[j] for j, c in enumerate(sc)))",
            "    elif n_vars <= 80:",
            "        Q_cost, offset_cost = SamplingCompiler.generate_qubo_matrix(objective_fn, n_vars, use_multiprocessing=False)",
            "    else:",
            "        _z0 = [0] * n_vars",
            "        offset_cost = float(objective_fn(_z0))",
            "        for _i in range(n_vars):",
            "            _Q1, _ = SamplingCompiler.generate_qubo_matrix(lambda z, idx=_i: objective_fn([z[0] if k == idx else 0 for k in range(n_vars)]) - offset_cost, 1, use_multiprocessing=False)",
            "            Q_cost[_i, _i] = _Q1[0, 0]",
            "    Q_con = np.zeros((n_vars, n_vars), dtype=np.float64)",
            "    offset_con = 0.0",
            "    if '_dep_specs' in globals():",
            "        for _p, _n, _ in _dep_specs:",
            "            offset_con += _scatter_subspace_qubo(Q_con, [_p, _n], lambda z: z[0] * (1.0 - z[1]))",
            "    if '_mut_specs' in globals():",
            "        for _a, _b, _ in _mut_specs:",
            "            offset_con += _scatter_subspace_qubo(Q_con, [_a, _b], lambda z: z[0] * z[1])",
            "    if '_clique_specs' in globals():",
            "        for _ci, _ in _clique_specs:",
            "            offset_con += _scatter_subspace_qubo(Q_con, _ci, lambda z: (sum(z) * (sum(z) - 1.0)) / 2.0)",
            "    if '_eq_specs' in globals():",
            "        for _li, _lc, _r, _ in _eq_specs:",
            "            offset_con += _scatter_subspace_qubo(Q_con, _li, lambda z, lc=_lc, r=_r: (sum(c * z[j] for j, c in enumerate(lc)) - r) ** 2)",
            "    if '_ineq_specs' in globals():",
            "        for _li, _lc, _si, _sc, _r, _op, _ in _ineq_specs:",
            "            _all_i = _li + _si",
            "            _nl = len(_li)",
            "            if _op == '<=':",
            "                offset_con += _scatter_subspace_qubo(Q_con, _all_i, lambda z, lc=_lc, sc=_sc, nl=_nl, r=_r: (sum(c * z[j] for j, c in enumerate(lc)) + sum(c * z[nl + j] for j, c in enumerate(sc)) - r) ** 2)",
            "            else:",
            "                offset_con += _scatter_subspace_qubo(Q_con, _all_i, lambda z, lc=_lc, sc=_sc, nl=_nl, r=_r: (r + sum(c * z[nl + j] for j, c in enumerate(sc)) - sum(c * z[j] for j, c in enumerate(lc))) ** 2)",
            f"    Q = Q_cost + {penalty_weight} * Q_con",
            f"    offset = offset_cost + {penalty_weight} * offset_con",
            "    return Q, offset"
        ])

    qubo_code = "\n".join(lines)

    # 4. Generate the matrix by executing the generated Python code block in-memory
    local_env = dict(globals())
    exec(qubo_code, local_env)
    Q, offset = local_env["get_qubo"]()

    # 5. Equivalence Verification Pass (vectorized regression tests against up to 1000 configurations)
    np.random.seed(42)
    if v_map.total_vars <= 10:
        n_states = 2 ** v_map.total_vars
        X_mat = np.array([[int(b) for b in bin(val)[2:].zfill(v_map.total_vars)] for val in range(n_states)], dtype=np.float64)
    else:
        n_tests = 200 if (v_map.total_vars > 60 or len(om.constraints) > 100) else 1000
        X_mat = np.random.randint(2, size=(n_tests, v_map.total_vars)).astype(np.float64)

    qubo_vals = np.einsum("bi,ij,bj->b", X_mat, Q, X_mat) + offset
    obj_fn = local_env["objective_fn"]
    con_fns = local_env["constraint_fns"]

    for idx in range(X_mat.shape[0]):
        x = X_mat[idx]
        target = obj_fn(x) + penalty_weight * sum(fn(x) for fn in con_fns)
        qubo_val = float(qubo_vals[idx])
        if abs(target - qubo_val) > 1e-6:
            raise ValueError(
                f"Equivalence verification failure at test assignment {idx}:\n"
                f"  Assignment: {x}\n"
                f"  Target Math Energy: {target}\n"
                f"  QUBO Matrix Energy: {qubo_val}\n"
                f"  Delta: {abs(target - qubo_val)}"
            )

    # Audit 10: Penalty ratio & warnings
    max_obj_coef = 1.0
    obj_linear = parse_linear_expression(om.objective.expression or "0.0", decision_vars)
    if obj_linear:
        max_obj_coef = max(abs(val) for val in obj_linear.values()) or 1.0
        
    max_con_coef = 1.0
    con_coef_vals = []
    for c in om.constraints:
        c_coefs = parse_linear_expression(c.left, decision_vars)
        if c_coefs:
            con_coef_vals.extend(abs(val) for val in c_coefs.values())
    if con_coef_vals:
        max_con_coef = max(con_coef_vals) or 1.0
        
    penalty_ratio = penalty_weight / (max_obj_coef / max_con_coef)
    warnings = []
    if penalty_weight * max_con_coef < 0.1 * max_obj_coef:
        warnings.append(f"Warning: Penalty weight (λ={penalty_weight}) may be too low; constraints might be violated (ratio: {round(penalty_ratio, 2)}).")
    if penalty_weight > 100.0 * max_obj_coef:
        warnings.append(f"Warning: Penalty weight (λ={penalty_weight}) may be too high; objective may be dominated (ratio: {round(penalty_ratio, 2)}).")

    # Audit 11: Connectivity metrics
    n_vars = v_map.total_vars
    adj = {i: set() for i in range(n_vars)}
    quadratic_terms_count = 0
    for i in range(n_vars):
        for j in range(i + 1, n_vars):
            if Q[i, j] != 0.0 or Q[j, i] != 0.0:
                adj[i].add(j)
                adj[j].add(i)
                quadratic_terms_count += 1
                
    degrees = [len(adj[i]) for i in range(n_vars)]
    max_degree = max(degrees) if degrees else 0
    avg_degree = sum(degrees) / n_vars if n_vars > 0 else 0.0
    
    # Connected components
    visited = set()
    connected_components_count = 0
    for i in range(n_vars):
        if i not in visited:
            connected_components_count += 1
            queue = [i]
            visited.add(i)
            while queue:
                curr = queue.pop(0)
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)

    # 6. Populate QuboIR metadata (storing original spec for feasibility checker)
    metadata = {
        "variables": v_map.total_vars,
        "decision_variables": len(decision_vars),
        "slack_variables": len(v_map.slack_vars),
        "constraints": len(om.constraints),
        "penalty": penalty_weight,
        "backend": "AutoQUBO",
        "validation": "PASS",
        "verification": "PASS",
        "original_objective_expr": orig_obj_expr,
        "original_objective_sense": orig_obj_sense,
        "original_constraints": orig_constraints,
        "int_encodings": int_encodings,
        "penalty_ratio": penalty_ratio,
        "max_objective_coefficient": max_obj_coef,
        "max_constraint_coefficient": max_con_coef,
        "warnings": warnings,
        "quadratic_terms": quadratic_terms_count,
        "max_degree": max_degree,
        "avg_degree": round(avg_degree, 2),
        "connected_components": connected_components_count,
    }

    # Append standalone simulator runner to the returned code block (for frontend click-to-execute)
    run_block = f"""\n\n# ── Simulator Execution Block ──
if __name__ == '__main__':
    try:
        import neal
        Q, offset = get_qubo()
        sparse_Q = {{}}
        for i in range(n_vars):
            for j in range(n_vars):
                val = float(Q[i, j])
                if val != 0.0:
                    sparse_Q[(i, j)] = val
        print("[Simulator] Submitting QUBO to D-Wave Simulated Annealing Sampler...")
        print(f"Penalty: {penalty_weight}")
        sampler = neal.SimulatedAnnealingSampler()
        sampleset = sampler.sample_qubo(sparse_Q, num_reads=5000)
        best_sample = sampleset.first.sample
        best_energy = float(sampleset.first.energy) + offset
        print(f"\\nStatus: Success")
        print(f"Logical Qubits: {{n_vars}}")
        print("\\nSolution Assignment:")
        selected = []
        best_x = []
        for i, name in enumerate(variable_map):
            val = best_sample.get(i, 0)
            best_x.append(val)
            print(f"  {{name}} = {{val}}")
            if val == 1:
                selected.append(name)
        print(f"\\nSelected Variables: {{selected}}")

        # -- Constraint Audit --
        print("\\n" + "=" * 60)
        print("  Constraint Audit")
        print("=" * 60)
        col_w = 32
        print(f"  {{'Constraint':<{{col_w}}}}  {{'Status':<14}}  Penalty")
        print("  " + "-" * (col_w + 30))
        total_penalty = 0.0
        lam = {penalty_weight}
        for cname, cfn in zip(constraint_names, constraint_fns):
            raw_violation = cfn(best_x)
            contribution = lam * raw_violation
            status = "Satisfied" if raw_violation < 1e-9 else "VIOLATED"
            print(f"  {{cname:<{{col_w}}}}  {{status:<14}}  {{contribution:.4f}}")
            total_penalty += contribution
        print("  " + "-" * (col_w + 30))
        raw_obj = objective_fn(best_x)
        decomposed = raw_obj + total_penalty
        match = abs(decomposed - best_energy) < 1e-4
        print(f"\\n  Objective Value:              {{raw_obj:.4f}}")
        print(f"  Total Penalty:                {{total_penalty:.4f}}")
        print(f"  ----------------------------------------")
        print(f"  Decomposed (Obj + Penalty):   {{decomposed:.4f}}")
        print(f"  QUBO Energy:                  {{best_energy:.4f}}")
        print(f"  Integrity Check:              {{'PASS' if match else 'FAIL -- encoding error detected'}}")
        print("=" * 60)
    except Exception as e:
        print(f"Execution failed: {{e}}")
"""
    qubo_code += run_block
    
    if debug:
        try:
            print("[AutoQUBO Developer Mode] Running compiler verification checks...")
            import numpy as _np
            import json as _json
            import os as _os
            
            trace_dir = "/Users/musharibsubhani/.gemini/antigravity/brain/4a10a474-c89a-4503-a4e0-68c2b2607d4b/scratch/trace"
            _os.makedirs(trace_dir, exist_ok=True)
            
            # Trace Dump 1: Variables
            with open(_os.path.join(trace_dir, "01_variables.json"), "w") as f:
                _json.dump({"variables": list(om.variables.keys())}, f, indent=2)
                
            # Trace Dump 2: Constraints
            consts_dump = [{"name": c.name, "left": c.left, "op": c.op, "right": c.right} for c in om.constraints]
            with open(_os.path.join(trace_dir, "02_constraints.json"), "w") as f:
                _json.dump(consts_dump, f, indent=2)
                
            n_vars = v_map.total_vars
            all_vars = v_map.all_vars
            
            for _ in range(50):
                state = _np.random.randint(0, 2, size=n_vars)
                state_dict = {name: val for name, val in zip(all_vars, state)}
                
                total_penalties = 0.0
                for c in om.constraints:
                    coefs = parse_linear_expression(c.left, decision_vars)
                    lhs_val = sum(state_dict[var] * val for var, val in coefs.items())
                    
                    if c.name in dependency_constraints:
                        pos, neg = dependency_constraints[c.name]
                        c_val = state_dict[pos] * (1.0 - state_dict[neg])
                    elif c.name in mutual_exclusion_constraints:
                        a, b = mutual_exclusion_constraints[c.name]
                        c_val = state_dict[a] * state_dict[b]
                    elif c.op == "==" or c.op == "=":
                        c_val = (lhs_val - c.right) ** 2
                    elif c.op == "<=":
                        _, s_vars = slack_blocks.get(c.name, (0, []))
                        slack_sum = sum(state_dict[s] * (2**idx) for idx, s in enumerate(s_vars))
                        c_val = (lhs_val + slack_sum - c.right) ** 2
                    else:
                        _, s_vars = slack_blocks.get(c.name, (0, []))
                        slack_sum = sum(state_dict[s] * (2**idx) for idx, s in enumerate(s_vars))
                        c_val = (lhs_val - slack_sum - c.right) ** 2
                        
                    total_penalties += penalty_weight * c_val
                    
                qubo_energy = float(_np.dot(state, _np.dot(Q, state)) + offset)
                
                obj_coefs = parse_linear_expression(om.objective.expression or "0.0", decision_vars)
                obj_val = sum(state_dict[var] * val for var, val in obj_coefs.items())
                sign_obj = -1.0 if om.objective.sense.upper() == "MAXIMIZE" else 1.0
                expected_energy = sign_obj * obj_val + total_penalties
                
                if _np.abs(expected_energy - qubo_energy) > 1e-4:
                    raise ValueError(f"Equivalence validation failed. Expected: {expected_energy}, Got: {qubo_energy}")
            
            print("[AutoQUBO Developer Mode] Verification Certificate: PASSED.")
            
            with open(_os.path.join(trace_dir, "03_qmatrix.json"), "w") as f:
                _json.dump({"shape": Q.shape, "offset": offset}, f, indent=2)
                
        except Exception as e:
            print(f"[AutoQUBO Developer Mode] Invariant Validation failed: {e}")
            raise e
            
    return QuboIR(Q=Q, offset=offset, variable_map=v_map, metadata=metadata, qubo_code=qubo_code)

# ── 6. Backward-Compatible Wrapper Endpoints ─────────────────────────────────

def compile_om_to_autoqubo(
    om: "OptimizationModel",
    penalty_weight: float = 10.0,
) -> Dict[str, Any]:
    """
    Convert an OptimizationModel to QUBO using Fujitsu\'s autoqubo package.
    Keeps API backward-compatible with DCC pipeline.
    """
    try:
        from autoqubo import SamplingCompiler
        _autoqubo_available = True
    except ImportError:
        _autoqubo_available = False

    if not _autoqubo_available:
        return {
            "Q_matrix":     None,
            "n_vars":       len(om.variables),
            "variable_map": list(om.variables.keys()),
            "qubo_code":    generate_autoqubo_code(om, penalty_weight),
            "solver":       "AutoQUBO",
            "available":    False,
            "error":        "autoqubo not installed. Run: pip install autoqubo",
        }

    try:
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=penalty_weight)
        return {
            "Q_matrix":     ir.Q,
            "n_vars":       ir.variable_map.total_vars,
            "variable_map": ir.variable_map.all_vars,
            "qubo_code":    ir.qubo_code,
            "solver":       "AutoQUBO",
            "available":    True,
            "error":        None,
            "offset":       ir.offset,
            "ir":           ir
        }
    except Exception as e:
        return {
            "Q_matrix":     None,
            "n_vars":       len(om.variables),
            "variable_map": list(om.variables.keys()),
            "qubo_code":    f"# Compile error: {str(e)}",
            "solver":       "AutoQUBO",
            "available":    True,
            "error":        str(e),
        }

def generate_autoqubo_code(om: "OptimizationModel", penalty_weight: float = 10.0) -> str:
    """Fallback generator if autoqubo package is not installed."""
    try:
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=penalty_weight)
        return ir.qubo_code
    except Exception as e:
        return f"# Code generation failed: {str(e)}"
