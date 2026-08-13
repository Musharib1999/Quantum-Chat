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
        decoded_sol = {}
        for i in range(n_decision):
            var_name = ir.variable_map.decision_vars[i]
            decoded_sol[var_name] = int(best_sample[i])

        # ── Feasibility & Objective Evaluation Pass ──
        # Re-evaluate objective value using the original algebraic formulation
        obj_expr = ir.metadata.get("original_objective_expr", "0.0")
        obj_sense = ir.metadata.get("original_objective_sense", "MINIMIZE")
        
        def safe_eval(expr_str: str, sol: dict) -> float:
            safe = expr_str
            for name, val in sorted(sol.items(), key=lambda x: -len(x[0])):
                safe = re.sub(r"\b" + re.escape(name) + r"\b", str(val), safe)
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
    
    decision_vars = list(om.variables.keys())
    v_map = VariableMap(decision_vars=decision_vars)

    # 2. Analyze inequality constraints and dynamically generate slack variables
    slack_blocks = {}
    dependency_constraints = {}
    mutual_exclusion_constraints = {}
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

            # Identify mutual exclusion constraint: x_i + x_j <= 1
            if c.op == "<=" and float(c.right) == 1.0 and len(pos_vars) == 2 and len(neg_vars) == 0 and len(other_vars) == 0:
                # Mathematically exact binary mutual exclusion: x_i + x_j <= 1 -> Penalty = x_i * x_j
                # No slack variables required!
                mutual_exclusion_constraints[c.name] = (pos_vars[0], pos_vars[1])
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

    # Helper to replace variable names in algebraic formulas with x[i]
    def to_safe_expr(expr_str: str) -> str:
        safe = expr_str
        for name, idx in sorted(var_to_idx.items(), key=lambda x: -len(x[0])):
            safe = re.sub(r"\b" + re.escape(name) + r"\b", f"x[{idx}]", safe)
        return safe

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

    # Objective function code block
    safe_obj = to_safe_expr(om.objective.expression or "0.0")
    sign = "-1.0 * " if om.objective.sense.upper() == "MAXIMIZE" else ""
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
    # Collect constraint specs as tuples at compile-time, then emit 4 compact
    # list literals + 4 one-liner for-loops instead of N*2 append statements.
    # For a 300-constraint model, this saves ~12,000+ characters in generated code.
    dep_specs  = []   # [(idx_pos, idx_neg, name), ...]
    mut_specs  = []   # [(idx_a,   idx_b,   name), ...]
    eq_specs   = []   # [(lhs_indices, lhs_coefs, rhs, name), ...]
    ineq_specs = []   # [(lhs_indices, lhs_coefs, slack_indices, slack_coefs, rhs, op, name), ...]

    for c in om.constraints:
        if c.name in dependency_constraints:
            pos_var, neg_var = dependency_constraints[c.name]
            dep_specs.append((var_to_idx[pos_var], var_to_idx[neg_var], c.name))
            continue

        if c.name in mutual_exclusion_constraints:
            var_a, var_b = mutual_exclusion_constraints[c.name]
            mut_specs.append((var_to_idx[var_a], var_to_idx[var_b], c.name))
            continue

        # Skip inequalities that are always satisfiable (s_max <= 0)
        if c.name in always_satisfied_inequalities:
            continue

        coefs = parse_linear_expression(c.left, decision_vars)
        # Filter zero coefficients for sparse, correct constraint representation
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
    if eq_specs:
        lines.append(f"_eq_specs = {eq_specs}")
        lines.append("for _li, _lc, _r, _nm in _eq_specs: constraint_fns.append(make_eq(_li, _lc, _r)); constraint_names.append(_nm)")
    if ineq_specs:
        lines.append(f"_ineq_specs = {ineq_specs}")
        lines.append("for _li, _lc, _si, _sc, _r, _op, _nm in _ineq_specs: constraint_fns.append(make_ineq(_li, _lc, _si, _sc, _r, _op)); constraint_names.append(_nm)")


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

    qubo_code = "\n".join(lines)

    # 4. Generate the matrix by executing the generated Python code block in-memory
    local_env = dict(globals())
    exec(qubo_code, local_env)
    Q, offset = local_env["get_qubo"]()

    # 5. Equivalence Verification Pass (regression tests against 1000 configurations)
    np.random.seed(42)
    n_tests = min(1000, 2 ** v_map.total_vars)
    test_configs = []
    if v_map.total_vars <= 10:
        for val in range(2 ** v_map.total_vars):
            bits = [int(x) for x in bin(val)[2:].zfill(v_map.total_vars)]
            test_configs.append(np.array(bits))
    else:
        for _ in range(n_tests):
            test_configs.append(np.random.randint(2, size=v_map.total_vars))

    obj_fn = local_env["objective_fn"]
    con_fn = lambda x: sum(fn(x) for fn in local_env["constraint_fns"])

    for idx, x in enumerate(test_configs):
        target = obj_fn(x) + penalty_weight * con_fn(x)
        try:
            qubo_val = float(x @ Q @ x + offset)
        except Exception as matmul_err:
            print(f"[AUTOQUBO EXCEPTION] x shape: {x.shape}, Q shape: {Q.shape if hasattr(Q, 'shape') else 'no shape'}, Q type: {type(Q)}, offset: {offset}, total_vars: {v_map.total_vars}, Q matrix: {Q}")
            raise matmul_err
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
        "original_objective_expr": om.objective.expression or "0.0",
        "original_objective_sense": om.objective.sense.upper(),
        "original_constraints": [
            {
                "name": c.name,
                "left": c.left,
                "op": c.op,
                "right": float(c.right)
            }
            for c in om.constraints
        ],
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
