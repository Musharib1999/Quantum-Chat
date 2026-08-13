# -*- coding: utf-8 -*-
"""
Direct Optimization Model Pipeline — QuantumGuru Engine v3
===========================================================
Accepts a user-supplied formulated optimization model (text/LaTeX/Python)
and runs the short pipeline:

  Parse Model → Q Matrix → QUBO Code → Simulator → Output

Skips the full 8-agent NLP chain used by run_optimization_pipeline_stream.
The LLM is called once to extract the IR from the user's model text.

Penalty map (user-facing labels → internal):
  Proposed Penalty 1 → sum_penalty        (SamplingCompiler default sum)
  Proposed Penalty 2 → pos_neg_penalty     (positive/negative balance)
  Proposed Penalty 3 → verma_lewis         (tight, recommended default)
"""

import json
import re
import asyncio
from typing import AsyncGenerator, Optional

from ..qwen_client import call_qwen
from ..compiler.expander import (
    OptimizationModel, ExpandedVariable, ExpandedConstraint, ExpandedObjective
)
from ..compiler.backends.autoqubo_backend import (
    compile_om_to_autoqubo_ir, DWaveAdapter
)

# ── Penalty weight resolver ────────────────────────────────────────────────────

def resolve_penalty_weight(penalty_choice: int, om: OptimizationModel) -> float:
    """
    Compute the penalty λ for the selected proposed penalty.
    Proposed Penalty 1: simple sum of objective coefficients.
    Proposed Penalty 2: max absolute coefficient in objective.
    Proposed Penalty 3: Verma-Lewis tight bound.
    Proposed Penalty 4: Adaptive L2 Norm (RMS)
    Proposed Penalty 5: Lagrange Ratio
    Proposed Penalty 6: Active Density
    """
    try:
        import re
        import math

        var_names = list(om.variables.keys())

        def get_expr_coefficients(expr: str, variables: list) -> dict:
            cleaned = expr.replace(' ', '')
            cleaned = re.sub(r'(?<![+*/-])-', '+-', cleaned)
            if cleaned.startswith('+'):
                cleaned = cleaned[1:]
            terms = cleaned.split('+')
            
            coeffs = {}
            for term in terms:
                if not term:
                    continue
                matched_var = None
                for v in variables:
                    pattern = r'(?<![a-zA-Z0-9_])' + re.escape(v) + r'(?![a-zA-Z0-9_])'
                    if re.search(pattern, term):
                        matched_var = v
                        break
                
                if matched_var:
                    num_part = term
                    for v in variables:
                        pattern = r'(?<![a-zA-Z0-9_])' + re.escape(v) + r'(?![a-zA-Z0-9_])'
                        num_part = re.sub(pattern, '', num_part)
                    num_part = num_part.replace('*', '').replace('(', '').replace(')', '')
                    if not num_part:
                        val = 1.0
                    elif num_part == '-':
                        val = -1.0
                    else:
                        try:
                            val = float(num_part)
                        except ValueError:
                            val = 1.0
                    coeffs[matched_var] = coeffs.get(matched_var, 0.0) + val
            return coeffs

        obj_coeffs = get_expr_coefficients(om.objective.expression, var_names)
        abs_obj_coeffs = [abs(c) for c in obj_coeffs.values()]
        
        # Fallback to simple parser if empty (e.g. invalid string)
        if not abs_obj_coeffs:
            simple_coeffs = [float(c) for c in re.findall(r"[-+]?\d*\.?\d+", om.objective.expression)]
            abs_obj_coeffs = [abs(c) for c in simple_coeffs] if simple_coeffs else [1.0]

        max_c = max(abs_obj_coeffs) if abs_obj_coeffs else 1.0
        sum_c = sum(abs_obj_coeffs) if abs_obj_coeffs else 1.0
        n_constraints = len(om.constraints)

        if penalty_choice == 1:
            return round(sum_c + 1.0, 2)
        elif penalty_choice == 2:
            return round(max_c * n_constraints + 1.0, 2)
        elif penalty_choice == 3:
            return round(max_c + 1.0, 2)
        elif penalty_choice == 4:
            l2_val = math.sqrt(sum(c**2 for c in abs_obj_coeffs)) if abs_obj_coeffs else 1.0
            return round(l2_val + 1.0, 2)
        elif penalty_choice == 5:
            max_ratio = 0.0
            for c in om.constraints:
                c_coeffs = get_expr_coefficients(c.left, var_names)
                for v, c_val in c_coeffs.items():
                    if abs(c_val) > 1e-9 and v in obj_coeffs:
                        ratio = abs(obj_coeffs[v]) / abs(c_val)
                        if ratio > max_ratio:
                            max_ratio = ratio
            if max_ratio > 0.0:
                return round(max_ratio + 1.0, 2)
            else:
                return round(max_c + 1.0, 2)
        elif penalty_choice == 6:
            k = None
            for c in om.constraints:
                if c.op in ('=', '==', '<='):
                    c_coeffs = get_expr_coefficients(c.left, var_names)
                    if c_coeffs and all(abs(val - 1.0) < 1e-9 for val in c_coeffs.values()):
                        try:
                            val_right = int(round(float(c.right)))
                            if k is None or val_right < k:
                                k = val_right
                        except Exception:
                            pass
            if k is None:
                k = max(1, int(math.ceil(len(var_names) * 0.35)))
            
            sorted_coeffs = sorted(abs_obj_coeffs, reverse=True)
            density_sum = sum(sorted_coeffs[:k])
            return round(density_sum + 1.0, 2)
        else:
            return round(max_c + 1.0, 2)
    except Exception:
        return 10.0


def parse_model_deterministically(model_text: str) -> dict:
    """
    Deterministically parses user pasted optimization models.
    Supports multiline text, LaTeX-style symbols, and implicit multiplication.
    """
    # 1. Standardize line endings and normalize LaTeX
    normalized = model_text.replace("\r\n", "\n").replace("\r", "\n")
    
    # Normalize operators and symbols
    normalized = normalized.replace("\\le", "<=").replace("\\leq", "<=")
    normalized = normalized.replace("\\ge", ">=").replace("\\geq", ">=")
    normalized = normalized.replace(" s.t. ", "\nsubject to\n").replace(" S.T. ", "\nsubject to\n")
    normalized = re.sub(r"\b(subject to|s\.t\.)\b", "subject to", normalized, flags=re.IGNORECASE)

    # Split by periods/semicolons if it is a single-line string
    if "\n" not in normalized.strip():
        normalized = re.sub(r"[\.;]\s+", "\n", normalized)

    lines = [line.strip() for line in normalized.split("\n") if line.strip()]
    
    sense = "MINIMIZE"
    objective_expr = "0"
    constraints = []
    
    obj_line_idx = -1
    for idx, line in enumerate(lines):
        m = re.match(r"^(minimize|maximize|min|max)\b\s*:?\s*(.*)$", line, re.IGNORECASE)
        if m:
            sense_str = m.group(1).upper()
            sense = "MINIMIZE" if sense_str.startswith("MIN") else "MAXIMIZE"
            objective_expr = m.group(2).strip()
            obj_line_idx = idx
            break

    # Add implicit multiplication (e.g. 3x -> 3*x, 3*x_0 -> 3*x_0)
    def expand_implicit_multiplication(expr: str) -> str:
        # e.g., 3x_0 -> 3*x_0, 3x -> 3*x, 3(x) -> 3*(x)
        res = re.sub(r"(\d+)([a-zA-Z_])", r"\1*\2", expr)
        # e.g. 3(x+y) -> 3*(x+y)
        res = re.sub(r"(\d+)\s*\(", r"\1*(", res)
        return res

    objective_expr = expand_implicit_multiplication(objective_expr)

    # 2. Extract constraints
    const_counter = 1
    for idx, line in enumerate(lines):
        if idx == obj_line_idx:
            continue
        
        # Clean structural prefixes
        clean_line = re.sub(r"^(subject to|s\.t\.|st|constraints|variables|vars):?\s*", "", line, flags=re.IGNORECASE).strip()
        if not clean_line:
            continue
            
        # Detect operators
        op_match = re.search(r"(<=|>=|==|=)", clean_line)
        if op_match:
            op = op_match.group(1)
            parts = clean_line.split(op)
            lhs = parts[0].strip()
            rhs = parts[1].strip()
            
            # Extract name if present (e.g. "c1: x + y <= 1")
            name = f"c{const_counter}"
            name_match = re.match(r"^([a-zA-Z0-9_]+)\s*:\s*(.*)$", lhs)
            if name_match:
                name = name_match.group(1)
                lhs = name_match.group(2).strip()
                
            # Normalize '=' to '=='
            if op == "=":
                op = "=="
                
            # Expand lhs implicit multiplication
            lhs = expand_implicit_multiplication(lhs)
            
            # Extract RHS numeric float
            try:
                rhs_val = float(re.findall(r"[-+]?\d*\.?\d+", rhs)[0])
            except Exception:
                rhs_val = 0.0
                
            constraints.append({
                "name": name,
                "left": lhs,
                "op": op,
                "right": rhs_val
            })
            const_counter += 1

    # 3. Detect all variables in objective and constraints
    detected_vars = set()
    all_formula_text = objective_expr + " " + " ".join([c["left"] for c in constraints])
    words = re.findall(r"\b[a-zA-Z_][a-zA-Z0-9_]*\b", all_formula_text)
    
    # Filter out common keywords
    keywords = {
        "min", "max", "minimize", "maximize", "subject", "to", "st", 
        "sum", "forall", "lambda", "x_idx", "and", "or", "not", "abs"
    }
    
    for word in words:
        if word.lower() not in keywords or word.lower() in ["x", "y", "z"]:
            detected_vars.add(word)

    variables = [{"name": var, "type": "BINARY"} for var in sorted(list(detected_vars))]
    
    return {
        "objective": {
            "sense": sense,
            "expression": objective_expr
        },
        "variables": variables,
        "constraints": constraints
    }

def build_om_from_ir(ir: dict) -> OptimizationModel:
    """Convert the parsed IR dict into an OptimizationModel dataclass."""
    from ..compiler.cmm import VarType

    variables = {}
    for v in ir.get("variables", []):
        vtype = VarType.BINARY if v.get("type", "BINARY").upper() == "BINARY" else VarType.CONTINUOUS
        variables[v["name"]] = ExpandedVariable(
            name=v["name"],
            var_type=vtype,
            lower_bound=0.0,
            upper_bound=1.0,
        )

    objective = ExpandedObjective(
        sense=ir["objective"]["sense"].upper(),
        expression=ir["objective"]["expression"],
    )

    constraints = []
    for c in ir.get("constraints", []):
        constraints.append(ExpandedConstraint(
            name=c["name"],
            left=c["left"],
            op=c["op"],
            right=float(c["right"]),
        ))

    return OptimizationModel(
        variables=variables,
        objective=objective,
        constraints=constraints,
    )


async def run_direct_model_pipeline_stream(
    model_text: str,
    penalty_choice: int = 3,
    num_reads: int = 5000,
    email: Optional[str] = None,
    session_id: Optional[str] = None,
    run_solver: bool = False,
) -> AsyncGenerator[dict, None]:
    """
    Streamed direct model pipeline. Yields step dicts:
      step = "parsing"      | "q_matrix" | "qubo_code"
           | "simulator"    | "output"   | "error"
    """

    # ── Stage 1: Parse model ──────────────────────────────────────────────────
    yield {"step": "parsing", "status": "running", "message": "Parsing your optimization model locally..."}
    await asyncio.sleep(0.1)

    default_penalty = None
    try:
        is_json = model_text.strip().startswith('{')
        if is_json:
            # Heal common JSON syntax typos (e.g. missing quote at "var_id": "vars},)
            healed_text = model_text.strip()
            healed_text = re.sub(r'("var_id":\s*")([^"\n]*?)([},])', r'\1\2"\3', healed_text)
            try:
                spec = json.loads(healed_text)
            except Exception as json_err:
                raise ValueError(f"Malformed JSON specification. Please verify quotes, braces, and commas. Details: {json_err}")
            
            from ..compiler.expander import parse_spec_to_cmm, expand_cmm_to_om
            print(f"DEBUG PIPELINE SPEC: {json.dumps(spec)}")
            print("DEBUG PIPELINE: spec loaded successfully. Parsing CMM...")
            import traceback
            try:
                cmm = parse_spec_to_cmm(spec)
                print("DEBUG PIPELINE: CMM parsed. Expanding to OM...")
                om = expand_cmm_to_om(cmm)
                print("DEBUG PIPELINE: OM expanded successfully.")
            except Exception as parse_err:
                print("DEBUG PIPELINE: Exception caught during CMM/OM parsing:")
                traceback.print_exc()
                raise parse_err
            default_penalty = spec.get("penalty_weight")
        else:
            ir_dict = parse_model_deterministically(model_text)
            om = build_om_from_ir(ir_dict)
    except Exception as e:
        print("DEBUG PIPELINE: Top-level parse exception caught:")
        traceback.print_exc()
        yield {"step": "error", "message": f"Model parsing failed: {e}"}
        return

    n_vars = len(om.variables)
    var_names = list(om.variables.keys())
    yield {
        "step": "parsing",
        "status": "done",
        "message": f"Model parsed — {n_vars} variables, {len(om.constraints)} constraints",
        "variables": var_names,
        "constraints": [{"name": c.name, "left": c.left, "op": c.op, "right": c.right} for c in om.constraints],
        "objective": {"sense": om.objective.sense, "expression": om.objective.expression},
    }
    await asyncio.sleep(0.1)

    # ── Stage 2: Compute penalty & compile Q matrix ───────────────────────────
    if penalty_choice not in (1, 2, 3, 4, 5, 6):
        penalty_weight = float(penalty_choice)
    else:
        penalty_weight = resolve_penalty_weight(penalty_choice, om)
    penalty_labels = {1: "Proposed Penalty 1 (Sum)", 2: "Proposed Penalty 2 (Moderate)", 3: "Proposed Penalty 3 (Verma-Lewis)", 4: "Adaptive L2 Norm", 5: "Lagrange Ratio", 6: "Active Density"}
    penalty_label = penalty_labels.get(penalty_choice, f"Custom λ={penalty_weight}")

    yield {
        "step": "q_matrix",
        "status": "running",
        "message": f"Building Q matrix with {penalty_label} (λ={penalty_weight})...",
    }
    await asyncio.sleep(0.1)

    try:
        import os
        debug_mode = os.environ.get("AUTOQUBO_DEBUG") == "true"
        print("DEBUG PIPELINE: Calling compile_om_to_autoqubo_ir...")
        ir = compile_om_to_autoqubo_ir(om, penalty_weight=penalty_weight, debug=debug_mode)
        print("DEBUG PIPELINE: Q matrix compiled successfully.")
    except Exception as e:
        print("DEBUG PIPELINE: Exception caught during Q matrix compilation:")
        import traceback
        traceback.print_exc()
        yield {"step": "error", "message": f"Q matrix compilation failed: {e}"}
        return

    q_size = ir.variable_map.total_vars
    q_nnz = int((ir.Q != 0).sum()) if ir.Q is not None else 0
    q_preview_rows = []
    if ir.Q is not None:
        preview_n = min(5, q_size)
        for i in range(preview_n):
            row = {}
            for j in range(preview_n):
                val = float(ir.Q[i, j])
                if val != 0.0:
                    row[f"Q[{i},{j}]"] = round(val, 4)
            if row:
                q_preview_rows.append(row)

    num_decision_vars = len(ir.variable_map.decision_vars)
    num_slack_vars = len(ir.variable_map.slack_vars)
    matrix_density = (q_nnz / (q_size * q_size)) * 100.0 if q_size > 0 else 0.0

    yield {
        "step": "q_matrix",
        "status": "done",
        "message": f"Q matrix built — {q_size}×{q_size} ({q_nnz} non-zero entries)",
        "q_size": q_size,
        "q_nnz": q_nnz,
        "q_preview": q_preview_rows,
        "penalty_weight": penalty_weight,
        "penalty_label": penalty_label,
        "variable_map": ir.variable_map.all_vars,
        "decision_vars_count": num_decision_vars,
        "slack_vars_count": num_slack_vars,
        "matrix_density": round(matrix_density, 2),
        "certificate_status": "PASSED" if debug_mode else "ACTIVE_FAST_PATH",
        "max_degree": ir.metadata.get("max_degree", 0),
        "avg_degree": ir.metadata.get("avg_degree", 0.0),
        "connected_components": ir.metadata.get("connected_components", 1),
        "warnings": ir.metadata.get("warnings", []),
    }
    await asyncio.sleep(0.1)

    # ── Stage 3: QUBO code ────────────────────────────────────────────────────
    yield {"step": "qubo_code", "status": "done", "message": "QUBO Python script generated", "code": ir.qubo_code}
    await asyncio.sleep(0.1)
    if not run_solver:
        return # STOP HERE IF WE ONLY WANT TO COMPILE!

    # ── Stage 4: Simulator ────────────────────────────────────────────────────
    yield {
        "step": "simulator",
        "status": "running",
        "message": f"Running D-Wave Simulated Annealing sampler ({num_reads:,} reads)...",
        "num_reads": num_reads,
        "sampler": "D-Wave SimulatedAnnealingSampler",
    }
    await asyncio.sleep(0.1)

    try:
        adapter = DWaveAdapter()
        result = adapter.solve(ir, num_reads=num_reads)
    except Exception as e:
        yield {"step": "error", "message": f"Simulator failed: {e}"}
        return

    yield {
        "step": "simulator",
        "status": "done",
        "message": "Simulator completed",
        "energy": result.get("energy"),
        "feasible": result.get("feasible"),
        "num_reads": num_reads,
    }
    await asyncio.sleep(0.1)

    # ── Stage 5: Output ───────────────────────────────────────────────────────
    solution = result.get("solution", {})
    feasibility = result.get("feasibility_report", {})
    feasible = result.get("feasible", False)
    energy = result.get("energy", 0.0)

    # Build readable solution lines
    selected = [k for k, v in solution.items() if v == 1]
    not_selected = [k for k, v in solution.items() if v == 0]

    feasibility_lines = []
    if feasibility:
        for c_name, report in feasibility.items():
            ok = report.get("feasible", False)
            icon = "✓" if ok else "✗"
            feasibility_lines.append(f"  {icon} {c_name}: {'SATISFIED' if ok else 'VIOLATED'}")

    output_text = f"""## Direct QUBO Solver Output

**Status:** {'✅ FEASIBLE' if feasible else '⚠️ INFEASIBLE'}  
**Objective Energy:** `{round(energy, 4)}`  
**Penalty Applied:** {penalty_label} (λ = {penalty_weight})  
**Sampler:** D-Wave Simulated Annealing · {num_reads:,} reads  
**Logical Qubits:** {q_size}

---

### Solution Assignment
**Selected variables ({len(selected)}):** {', '.join(f'`{v}`' for v in selected) if selected else '_none_'}  
**Not selected ({len(not_selected)}):** {', '.join(f'`{v}`' for v in not_selected) if not_selected else '_none_'}

### Constraint Feasibility
{chr(10).join(feasibility_lines) if feasibility_lines else '_No constraint data available_'}

### Q Matrix Summary
- **Dimensions:** {q_size} × {q_size} logical qubits  
- **Non-zero entries:** {q_nnz}  
- **Variable map:** {', '.join(f'`{v}`' for v in ir.variable_map.all_vars[:10])}{'...' if len(ir.variable_map.all_vars) > 10 else ''}
"""

    yield {
        "step": "output",
        "status": "done",
        "message": "Pipeline complete",
        "output_text": output_text,
        "feasible": feasible,
        "energy": energy,
        "solution": solution,
        "feasibility": feasibility,
        "selected_variables": selected,
        "q_size": q_size,
        "penalty_label": penalty_label,
    }

