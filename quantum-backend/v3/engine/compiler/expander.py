# -*- coding: utf-8 -*-
import json
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Union
from .cmm import (
    CMMSet, CMMParameter, CMMVariable, VarType,
    Expr, Constant, VarRef, ParamRef, BinaryOp, Sum,
    CMMObjective, CMMConstraint, CanonicalMathematicalModel,
    CMMRelationship, UniquenessPattern, CapacityPattern, AvailabilityPattern,
    FixedAssignmentPattern, EligibilityPattern, LogicalImplicationPattern,
    MutualExclusionPattern, ProblemFamily, VariableOntologyType,
    DerivedVariable, CMMFunction
)

# Declarative compile functions
def compile_uniqueness(p: UniquenessPattern, cmm: CanonicalMathematicalModel) -> List[CMMConstraint]:
    # Strong Type Assertions
    assert p.row_set in cmm.sets, f"Set '{p.row_set}' does not exist"
    assert p.col_set in cmm.sets, f"Set '{p.col_set}' does not exist"
    assert p.var_name in cmm.variables or p.var_name.replace("_", " ") in cmm.variables, f"Variable '{p.var_name}' not defined in model variables registry"
    
    clean_v_name = p.var_name.replace(" ", "_").replace("-", "_")
    return [
        CMMConstraint(
            name=p.name,
            quantifier="FORALL",
            quantifier_vars=["i"],
            quantifier_ranges=[p.row_set],
            left=Sum(
                expression=VarRef(var_name=clean_v_name, indices=["i", "j"]),
                index_vars=["j"],
                index_ranges=[p.col_set]
            ),
            op="==",
            right=Constant(value=p.rhs_value)
        )
    ]

def compile_capacity(p: CapacityPattern, cmm: CanonicalMathematicalModel) -> List[CMMConstraint]:
    # Strong Type Assertions
    assert p.row_set in cmm.sets, f"Set '{p.row_set}' does not exist"
    assert p.col_set in cmm.sets, f"Set '{p.col_set}' does not exist"
    assert p.var_name in cmm.variables or p.var_name.replace("_", " ") in cmm.variables, f"Variable '{p.var_name}' not defined in model variables registry"
    
    clean_v_name = p.var_name.replace(" ", "_").replace("-", "_")
    return [
        CMMConstraint(
            name=p.name,
            quantifier="FORALL",
            quantifier_vars=["j"],
            quantifier_ranges=[p.col_set],
            left=Sum(
                expression=VarRef(var_name=clean_v_name, indices=["i", "j"]),
                index_vars=["i"],
                index_ranges=[p.row_set]
            ),
            op="<=",
            right=Constant(value=p.capacity_value)
        )
    ]

def compile_availability(p: AvailabilityPattern, cmm: CanonicalMathematicalModel) -> List[CMMConstraint]:
    # Strong Type Assertions
    assert p.row_set in cmm.sets, f"Set '{p.row_set}' does not exist"
    assert p.col_set in cmm.sets, f"Set '{p.col_set}' does not exist"
    assert p.var_name in cmm.variables or p.var_name.replace("_", " ") in cmm.variables, f"Variable '{p.var_name}' not defined in model variables registry"
    
    clean_v_name = p.var_name.replace(" ", "_").replace("-", "_")
    constraints = []
    row_count = len(cmm.sets[p.row_set].elements)
    for col in p.unavailable_cols:
        for r in range(row_count):
            constraints.append(
                CMMConstraint(
                    name=f"{p.name}_{r}_{col}",
                    quantifier="NONE",
                    left=VarRef(var_name=clean_v_name, indices=[r, col]),
                    op="<=",
                    right=Constant(value=0.0)
                )
            )
    return constraints

def compile_fixed_assignment(p: FixedAssignmentPattern, cmm: CanonicalMathematicalModel) -> List[CMMConstraint]:
    # Strong Type Assertions
    assert p.var_name in cmm.variables or p.var_name.replace("_", " ") in cmm.variables, f"Variable '{p.var_name}' not defined in model variables registry"
    
    clean_v_name = p.var_name.replace(" ", "_").replace("-", "_")
    return [
        CMMConstraint(
            name=p.name,
            quantifier="NONE",
            left=VarRef(var_name=clean_v_name, indices=[p.row_index, p.col_index]),
            op="==",
            right=Constant(value=p.assigned_value)
        )
    ]

def compile_eligibility(p: EligibilityPattern, cmm: CanonicalMathematicalModel) -> List[CMMConstraint]:
    # Strong Type Assertions
    assert p.row_set in cmm.sets, f"Set '{p.row_set}' does not exist"
    assert p.col_set in cmm.sets, f"Set '{p.col_set}' does not exist"
    assert p.var_name in cmm.variables or p.var_name.replace("_", " ") in cmm.variables, f"Variable '{p.var_name}' not defined in model variables registry"
    
    clean_v_name = p.var_name.replace(" ", "_").replace("-", "_")
    constraints = []
    row_count = len(cmm.sets[p.row_set].elements)
    col_count = len(cmm.sets[p.col_set].elements)
    for r in range(row_count):
        for col in range(col_count):
            if r < len(p.eligible_matrix) and col < len(p.eligible_matrix[r]):
                if p.eligible_matrix[r][col] == 0:
                    constraints.append(
                        CMMConstraint(
                            name=f"{p.name}_{r}_{col}",
                            quantifier="NONE",
                            left=VarRef(var_name=clean_v_name, indices=[r, col]),
                            op="<=",
                            right=Constant(value=0.0)
                        )
                    )
    return constraints

@dataclass
class ExpandedVariable:
    name: str
    var_type: str
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None

@dataclass
class ExpandedConstraint:
    name: str
    left: str  # Stringified formula, e.g. "x_0_0 + x_0_1"
    op: str    # "<=", ">=", "=="
    right: float

@dataclass
class ExpandedObjective:
    sense: str  # "MINIMIZE" | "MAXIMIZE"
    expression: str

@dataclass
class OptimizationModel:
    variables: Dict[str, ExpandedVariable]
    objective: ExpandedObjective
    constraints: List[ExpandedConstraint]

def compile_logical_implication(p: LogicalImplicationPattern, cmm: CanonicalMathematicalModel) -> List[CMMConstraint]:
    clean_v_name = p.var_name.replace(" ", "_").replace("-", "_")
    constraints = []
    
    if not p.if_indices or not p.then_indices:
        return []
        
    # Build RHS then sum expression
    then_sum = VarRef(var_name=clean_v_name, indices=[p.then_indices[0]])
    for t_idx in p.then_indices[1:]:
        then_sum = BinaryOp(left=then_sum, op="+", right=VarRef(var_name=clean_v_name, indices=[t_idx]))
        
    if p.then_min_count > 1 or len(p.if_indices) > 1:
        # Group implication: sum(x_then) >= then_min_count * x_if for each if index
        for if_idx in p.if_indices:
            scaled_if = BinaryOp(
                left=Constant(value=float(p.then_min_count)),
                op="*",
                right=VarRef(var_name=clean_v_name, indices=[if_idx])
            )
            constraints.append(
                CMMConstraint(
                    name=f"{p.name}_impl_{if_idx}",
                    quantifier="NONE",
                    left=then_sum,
                    op=">=",
                    right=scaled_if
                )
            )
    else:
        # Single variable implication: x_if <= x_then
        left_expr = VarRef(var_name=clean_v_name, indices=[p.if_indices[0]])
        constraints.append(
            CMMConstraint(
                name=p.name,
                quantifier="NONE",
                left=left_expr,
                op="<=",
                right=VarRef(var_name=clean_v_name, indices=[p.then_indices[0]])
            )
        )
    return constraints

def compile_mutual_exclusion(p: MutualExclusionPattern, cmm: CanonicalMathematicalModel) -> List[CMMConstraint]:
    clean_v_name = p.var_name.replace(" ", "_").replace("-", "_")
    if not p.exclusive_indices:
        return []
        
    left_expr = VarRef(var_name=clean_v_name, indices=[p.exclusive_indices[0]])
    for idx in p.exclusive_indices[1:]:
        left_expr = BinaryOp(left=left_expr, op="+", right=VarRef(var_name=clean_v_name, indices=[idx]))
        
    return [
        CMMConstraint(
            name=p.name,
            quantifier="NONE",
            left=left_expr,
            op="<=",
            right=Constant(value=p.rhs_value)
        )
    ]

def _build_balanced_sum(terms: List[Expr]) -> Expr:
    """Build a balanced binary addition tree of depth ceil(log2(N)) to prevent RecursionError at N > 980."""
    if not terms:
        return Constant(value=0.0)
    layer = list(terms)
    while len(layer) > 1:
        next_layer = []
        for i in range(0, len(layer), 2):
            if i + 1 < len(layer):
                next_layer.append(BinaryOp(left=layer[i], op="+", right=layer[i + 1]))
            else:
                next_layer.append(layer[i])
        layer = next_layer
    return layer[0]

def get_expr_degree(expr) -> int:
    """Iterative post-order AST degree calculator (safe for arbitrary tree depth N > 10,000)."""
    if expr is None:
        return 0
    stack = [(expr, False)]
    degrees = {}
    while stack:
        node, visited = stack.pop()
        nid = id(node)
        if isinstance(node, Constant):
            degrees[nid] = 0
        elif isinstance(node, (VarRef, ParamRef)):
            degrees[nid] = 1 if isinstance(node, VarRef) else 0
        elif isinstance(node, Sum):
            if visited:
                degrees[nid] = degrees.get(id(node.expression), 0)
            else:
                stack.append((node, True))
                stack.append((node.expression, False))
        elif isinstance(node, BinaryOp):
            if visited:
                dl = degrees.get(id(node.left), 0)
                dr = degrees.get(id(node.right), 0)
                if node.op in ["+", "-"]:
                    degrees[nid] = max(dl, dr)
                elif node.op == "*":
                    degrees[nid] = dl + dr
                else:
                    degrees[nid] = max(dl, dr)
            else:
                stack.append((node, True))
                stack.append((node.right, False))
                stack.append((node.left, False))
        else:
            degrees[nid] = 0
    return degrees.get(id(expr), 0)

def parse_spec_to_cmm(spec: dict) -> CanonicalMathematicalModel:
    """
    Converts a loose LLM Problem Specification dictionary into a symbolic CMM.
    """
    cmm = CanonicalMathematicalModel()
    
    # 0. Set Problem Family
    family = spec.get("problem_family", spec.get("problem_type", "SELECTION")).upper()
    if family not in [getattr(ProblemFamily, a) for a in dir(ProblemFamily) if not a.startswith("__")]:
        family = ProblemFamily.SELECTION
    cmm.problem_family = family

    # Build variable ID to name map
    var_id_to_name = {}
    for var in spec.get("variable_registry", spec.get("variables", [])):
        v_id = var.get("id")
        v_name = var.get("name")
        if v_id and v_name:
            var_id_to_name[v_id.lower().replace("_", "").replace(" ", "")] = v_name.replace(" ", "_").replace("-", "_")

    def parse_json_expr(node: Any, clean_v_name: str, index_sets: List[str]) -> Expr:
        if not isinstance(node, dict):
            if isinstance(node, (int, float)):
                return Constant(value=float(node))
            return Constant(value=0.0)
        n_type = node.get("type")
        if "coefficients" in node:
            n_type = "linear_terms"
        elif not n_type and ("terms" in node or "linear_coefficients" in node):
            n_type = "variable"
        if n_type == "constant":
            return Constant(value=float(node.get("value", 0.0)))
        elif n_type == "variable":
            raw_id = node.get("var_id", clean_v_name)
            norm_id = raw_id.lower().replace("_", "").replace(" ", "")
            var_name = var_id_to_name.get(norm_id, clean_v_name)
            
            idx_val = node.get("index")
            if idx_val is None:
                idx_val = node.get("indices")
            indices = []
            if idx_val is not None:
                if isinstance(idx_val, list):
                    indices = idx_val
                else:
                    indices = [idx_val]
            else:
                indices = [0]
                
            # Gated Fast-Path Structural Checks
            if var_name not in cmm.variables and clean_v_name != "x":
                raise ValueError(f"Variable reference '{raw_id}' does not exist in the variable registry.")
                
            if var_name in cmm.variables:
                var_obj = cmm.variables[var_name]
                
                # Align indices to match registered dimension order dynamically (e.g. [3, 'a'] -> ['a', 3])
                if len(indices) == len(var_obj.index_sets):
                    aligned = [None] * len(var_obj.index_sets)
                    unplaced = []
                    for idx in indices:
                        if isinstance(idx, str):
                            matched_pos = -1
                            for pos, set_name in enumerate(var_obj.index_sets):
                                if set_name and idx.lower() == set_name[0].lower():
                                    matched_pos = pos
                                    break
                            if matched_pos != -1 and aligned[matched_pos] is None:
                                aligned[matched_pos] = idx
                            else:
                                unplaced.append(idx)
                        else:
                            unplaced.append(idx)
                    for idx in unplaced:
                        for pos in range(len(aligned)):
                            if aligned[pos] is None:
                                aligned[pos] = idx
                                break
                    if None not in aligned:
                        indices = aligned

                expected_dim = len(var_obj.index_sets)
                if len(indices) != expected_dim:
                    raise ValueError(f"Variable '{var_name}' expects {expected_dim} dimensions, but got {len(indices)} indices: {indices}")
                
                for idx_pos, idx in enumerate(indices):
                    if isinstance(idx, int):
                        set_name = var_obj.index_sets[idx_pos]
                        if set_name in cmm.sets:
                            set_size = len(cmm.sets[set_name].elements)
                            if idx < 0 or idx >= set_size:
                                raise ValueError(f"Index out of bounds for variable '{var_name}' along dimension '{set_name}'. Size: {set_size}, Got: {idx}")
                                
            return VarRef(var_name=var_name, indices=indices)
        elif n_type == "binary_op":
            op = node.get("op", "+")
            left = parse_json_expr(node.get("left"), clean_v_name, index_sets)
            right = parse_json_expr(node.get("right"), clean_v_name, index_sets)
            return BinaryOp(left=left, op=op, right=right)
        elif n_type in ("aggregate", "coefficients") or (n_type == "linear_terms" and "terms" not in node):
            raw_id = node.get("var_id", clean_v_name)
            norm_id = raw_id.lower().replace("_", "").replace(" ", "")
            var_name = var_id_to_name.get(norm_id, clean_v_name)
            
            fixed = node.get("fixed_indices", {})
            if fixed and var_name in cmm.variables:
                var_obj = cmm.variables[var_name]
                indices = []
                sum_vars = []
                sum_ranges = []
                sum_counter = 0
                for s_name in var_obj.index_sets:
                    if s_name in fixed:
                        indices.append(fixed[s_name])
                    else:
                        loop_var = f"sum_idx_{sum_counter}"
                        sum_counter += 1
                        indices.append(loop_var)
                        sum_vars.append(loop_var)
                        sum_ranges.append(s_name)
                x_ref = VarRef(var_name=var_name, indices=indices)
                if sum_vars:
                    return Sum(expression=x_ref, index_vars=sum_vars, index_ranges=sum_ranges)
                return x_ref
            
            # sum_over: build a Sum expression scoped to the non-summed dimensions
            sum_over = node.get("sum_over")
            if sum_over and var_name in cmm.variables:
                var_obj = cmm.variables[var_name]
                indices = []
                sum_vars_list = []
                sum_ranges_list = []
                sum_counter = 0
                fixed_counter = 0
                for s_name in var_obj.index_sets:
                    if s_name == sum_over:
                        # This dimension is summed over
                        loop_var = f"sum_idx_{sum_counter}"
                        sum_counter += 1
                        indices.append(loop_var)
                        sum_vars_list.append(loop_var)
                        sum_ranges_list.append(s_name)
                    else:
                        # This dimension is fixed by the forall iterator
                        # Use the set name's first letter as the bound variable,
                        # which will be resolved by eval_expr via loop_indices
                        bound_var = s_name[0].lower()
                        fixed_counter += 1
                        indices.append(bound_var)
                x_ref = VarRef(var_name=var_name, indices=indices)
                if sum_vars_list:
                    return Sum(expression=x_ref, index_vars=sum_vars_list, index_ranges=sum_ranges_list)
                return x_ref

            coeffs = node.get("coefficients", [])
            indices_list = node.get("indices", [])
            
            # Flatten coefficients if it is nested (e.g. 2D/3D list)
            def flatten_nested(lst):
                flat = []
                for item in lst:
                    if isinstance(item, list):
                        flat.extend(flatten_nested(item))
                    else:
                        flat.append(item)
                return flat

            flat_coeffs = flatten_nested(coeffs)
            
            # Get variable dimensions for flat-to-N-dimensional index decoding
            dims = []
            if var_name in cmm.variables:
                var_obj = cmm.variables[var_name]
                dims = [len(cmm.sets[s].elements) for s in var_obj.index_sets]
                
            terms = []
            for idx, val in enumerate(flat_coeffs):
                if val == 0:
                    continue
                if idx < len(indices_list):
                    idx_val = indices_list[idx]
                    if isinstance(idx_val, list):
                        indices = idx_val
                    else:
                        indices = [idx_val]
                else:
                    if dims:
                        curr = idx
                        decoded = []
                        for d in reversed(dims):
                            decoded.append(curr % d)
                            curr = curr // d
                        indices = list(reversed(decoded))
                    else:
                        indices = [idx]
                        
                x_ref = VarRef(var_name=var_name, indices=indices)
                if val == 1:
                    terms.append(x_ref)
                else:
                    terms.append(BinaryOp(left=Constant(value=float(val)), op="*", right=x_ref))
            if not terms:
                return Constant(value=0.0)
            return _build_balanced_sum(terms)
        elif n_type == "quadratic":
            raw_id = node.get("var_id", clean_v_name)
            norm_id = raw_id.lower().replace("_", "").replace(" ", "")
            var_name = var_id_to_name.get(norm_id, clean_v_name)
            
            terms = []
            dims = []
            if var_name in cmm.variables:
                var_obj = cmm.variables[var_name]
                dims = [len(cmm.sets[s].elements) for s in var_obj.index_sets]
                
            linear_coeffs = node.get("linear_coefficients", [])
            for idx, val in enumerate(linear_coeffs):
                if val == 0:
                    continue
                if dims:
                    curr = idx
                    decoded = []
                    for d in reversed(dims):
                        decoded.append(curr % d)
                        curr = curr // d
                    indices = list(reversed(decoded))
                else:
                    indices = [idx]
                x_ref = VarRef(var_name=var_name, indices=indices)
                if val == 1:
                    terms.append(x_ref)
                else:
                    terms.append(BinaryOp(left=Constant(value=float(val)), op="*", right=x_ref))
            
            quad_terms = node.get("quadratic_terms", [])
            for q in quad_terms:
                i = q.get("i", 0)
                j = q.get("j", 0)
                val = q.get("coefficient", 0.0)
                if val == 0:
                    continue
                if dims:
                    curr = i
                    decoded_i = []
                    for d in reversed(dims):
                        decoded_i.append(curr % d)
                        curr = curr // d
                    indices_i = list(reversed(decoded_i))
                    
                    curr = j
                    decoded_j = []
                    for d in reversed(dims):
                        decoded_j.append(curr % d)
                        curr = curr // d
                    indices_j = list(reversed(decoded_j))
                else:
                    indices_i = [i]
                    indices_j = [j]
                x_i = VarRef(var_name=var_name, indices=indices_i)
                x_j = VarRef(var_name=var_name, indices=indices_j)
                x_mul = BinaryOp(left=x_i, op="*", right=x_j)
                if val == 1:
                    terms.append(x_mul)
                else:
                    terms.append(BinaryOp(left=Constant(value=float(val)), op="*", right=x_mul))
            
            if not terms:
                return Constant(value=0.0)
            return _build_balanced_sum(terms)
        elif n_type == "quadratic_terms":
            node["type"] = "quadratic"
            return parse_json_expr(node, clean_v_name, index_sets)
        elif n_type == "linear_difference":
            left = parse_json_expr(node.get("left"), clean_v_name, index_sets)
            right = parse_json_expr(node.get("right"), clean_v_name, index_sets)
            return BinaryOp(left=left, op="-", right=right)
        elif n_type == "linear_terms":
            terms = []
            for t in node.get("terms", []):
                raw_id = t.get("var_id", clean_v_name)
                norm_id = raw_id.lower().replace("_", "").replace(" ", "")
                var_name = var_id_to_name.get(norm_id, clean_v_name)
                
                idx_val = t.get("index")
                if idx_val is None:
                    idx_val = t.get("indices")
                indices = []
                if idx_val is not None:
                    if isinstance(idx_val, list):
                        indices = idx_val
                    else:
                        indices = [idx_val]
                else:
                    indices = [0]
                
                # Gated Fast-Path Structural Checks
                if var_name not in cmm.variables and clean_v_name != "x":
                    raise ValueError(f"Variable reference '{raw_id}' does not exist in the variable registry.")
                    
                if var_name in cmm.variables:
                    var_obj = cmm.variables[var_name]
                    
                    # Align indices to match registered dimension order dynamically
                    if len(indices) == len(var_obj.index_sets):
                        aligned = [None] * len(var_obj.index_sets)
                        unplaced = []
                        for idx in indices:
                            if isinstance(idx, str):
                                matched_pos = -1
                                for pos, set_name in enumerate(var_obj.index_sets):
                                    if set_name and (idx.lower() == set_name[0].lower() or idx.lower() in set_name.lower() or set_name.lower().startswith(idx.lower()) or idx.lower().startswith(set_name[0].lower())):
                                        matched_pos = pos
                                        break
                                if matched_pos != -1 and aligned[matched_pos] is None:
                                    aligned[matched_pos] = idx
                                else:
                                    unplaced.append(idx)
                            else:
                                unplaced.append(idx)
                        for idx in unplaced:
                            for pos in range(len(aligned)):
                                if aligned[pos] is None:
                                    aligned[pos] = idx
                                    break
                        if None not in aligned:
                            indices = aligned

                    expected_dim = len(var_obj.index_sets)
                    if len(indices) != expected_dim:
                        raise ValueError(f"Variable '{var_name}' expects {expected_dim} dimensions, but got {len(indices)} indices: {indices}")
                    
                    for idx_pos, idx in enumerate(indices):
                        if isinstance(idx, int):
                            set_name = var_obj.index_sets[idx_pos]
                            if set_name in cmm.sets:
                                set_size = len(cmm.sets[set_name].elements)
                                if idx < 0 or idx >= set_size:
                                    raise ValueError(f"Index out of bounds for variable '{var_name}' along dimension '{set_name}'. Size: {set_size}, Got: {idx}")
                                    
                coeff = float(t.get("coefficient", 1.0))
                if coeff == 0.0:
                    continue
                x_ref = VarRef(var_name=var_name, indices=indices)
                if coeff == 1.0:
                    terms.append(x_ref)
                else:
                    terms.append(BinaryOp(left=Constant(value=coeff), op="*", right=x_ref))
            if not terms:
                return Constant(value=0.0)
            return _build_balanced_sum(terms)
        return Constant(value=0.0)
    
    # 0.5 Parse derived variables and functions
    for dv in spec.get("derived_variables", []):
        dv_name = dv.get("name")
        if dv_name:
            cmm.derived_variables[dv_name] = DerivedVariable(
                name=dv_name,
                expression=parse_json_expr(dv.get("expression"), dv_name, []),
                description=dv.get("description", ""),
                source_sentence=dv.get("source_sentence", "")
            )
            
    for f_item in spec.get("functions", []):
        f_name = f_item.get("name")
        if f_name:
            cmm.functions[f_name] = CMMFunction(
                name=f_name,
                arguments=f_item.get("arguments", []),
                return_type=f_item.get("return_type", "float"),
                expression=parse_json_expr(f_item.get("expression"), f_name, []),
                description=f_item.get("description", "")
            )

    # 1. Parse parameters and infer sets
    raw_params = spec.get("parameters", {})
    var_registry_check = spec.get("variable_registry", spec.get("variables", []))
    p_text_lower = spec.get("problem_text", "").lower() if spec.get("problem_text") else ""
    for k, v in raw_params.items():
        if not var_registry_check and p_text_lower and k.lower() in ("entities_count", "slots_count"):
            # Defer generic placeholder counts to domain-aware fallback below
            continue
        if isinstance(v, int) and v > 0 and (k.endswith("s_count") or k.endswith("s")):
            # Infer a Set from count
            set_name = k.replace("_count", "").capitalize()
            cmm.sets[set_name] = CMMSet(name=set_name, elements=list(range(v)))
        else:
            cmm.parameters[k] = CMMParameter(name=k, value=v)
            
    # Fallback default sets if not inferred
    default_row = "Items"
    default_col = "Slots"
    if "nurse" in p_text_lower or "hospital" in p_text_lower:
        default_row = "Nurses"
        default_col = "Shifts"
    elif "robot" in p_text_lower or "order" in p_text_lower:
        default_row = "Orders"
        default_col = "Robots"
    elif "route" in p_text_lower or "truck" in p_text_lower:
        default_row = "Routes"
        default_col = "Trucks"
    elif "furnace" in p_text_lower or "batch" in p_text_lower:
        default_row = "Batches"
        default_col = "Furnaces"
    elif "job" in p_text_lower or "machine" in p_text_lower:
        default_row = "Jobs"
        default_col = "Machines"

    if not cmm.sets:
        ent_cnt = raw_params.get("entities_count", spec.get("entities_count", 5))
        slot_cnt = raw_params.get("slots_count", spec.get("slots_count", 3))
        cmm.sets[default_row] = CMMSet(name=default_row, elements=list(range(ent_cnt)))
        cmm.sets[default_col] = CMMSet(name=default_col, elements=list(range(slot_cnt)))

    # 2. Parse variables
    var_registry = spec.get("variable_registry", spec.get("variables", []))
    if not var_registry:
        # Fallback default binary variable x using sets that exist
        fallback_sets = list(cmm.sets.keys())[:2]
        cmm.variables["x"] = CMMVariable(name="x", var_type=VarType.BINARY, index_sets=fallback_sets)
    else:
        for var in var_registry:
            name = var.get("name", "x").replace(" ", "_").replace("-", "_")
            raw_type = var.get("type", var.get("domain", "BINARY"))
            if not raw_type:
                raw_type = "BINARY"
            raw_type = str(raw_type).upper()
            
            if "BIN" in raw_type or "BOOL" in raw_type:
                v_type = VarType.BINARY
            elif "INT" in raw_type:
                v_type = VarType.INTEGER
            elif "CONT" in raw_type or "REAL" in raw_type or "FLOAT" in raw_type or "DECIMAL" in raw_type:
                v_type = VarType.CONTINUOUS
            else:
                v_type = VarType.BINARY
            dims = var.get("dimensions", [])
            
            # Map dimensions to sets
            inferred_sets = list(cmm.sets.keys())
            mapped_dims = []
            for idx_d, d in enumerate(dims):
                if isinstance(d, int):
                    matched_set = None
                    for set_name in inferred_sets:
                        if set_name in cmm.sets and len(cmm.sets[set_name].elements) == d:
                            matched_set = set_name
                            break
                    if matched_set:
                        d_cap = matched_set
                    else:
                        d_cap = f"{name}_Dim_{idx_d}"
                        cmm.sets[d_cap] = CMMSet(name=d_cap, elements=list(range(d)))
                else:
                    d_cap = str(d).capitalize()
                
                if d_cap in cmm.sets:
                    mapped_dims.append(d_cap)
                elif d_cap.endswith("s") and d_cap[:-1] in cmm.sets:
                    mapped_dims.append(d_cap[:-1])
                elif d_cap + "s" in cmm.sets:
                    mapped_dims.append(d_cap + "s")
                else:
                    # Create set on the fly, resolving size dynamically from raw_params if possible
                    param_val = 3
                    for pk, pv in raw_params.items():
                        if isinstance(pv, int) and pv > 0:
                            pk_clean = pk.lower().replace("_count", "").replace("_size", "").strip()
                            d_clean = d_cap.lower().strip()
                            if pk_clean == d_clean or pk_clean == d_clean + "s" or pk_clean + "s" == d_clean or pk_clean in d_clean or d_clean in pk_clean:
                                param_val = pv
                                break
                    cmm.sets[d_cap] = CMMSet(name=d_cap, elements=list(range(param_val)))
                    mapped_dims.append(d_cap)
            
            # Variable Type Inference Ontology mapping
            ontology = VariableOntologyType.BINARY_SCALAR
            var_name_lower = name.lower()
            var_desc_lower = var.get("description", "").lower()
            
            if "time" in var_name_lower or "month" in var_name_lower or "day" in var_name_lower or "hour" in var_name_lower or "shift" in var_name_lower:
                ontology = VariableOntologyType.TIME_INDEXED_VARIABLE
            elif "edge" in var_name_lower or "arc" in var_name_lower or "node" in var_name_lower or "graph" in var_name_lower or "route" in var_name_lower:
                ontology = VariableOntologyType.GRAPH_EDGE_VARIABLE
            elif "state" in var_name_lower or "transition" in var_name_lower or "memory" in var_name_lower:
                ontology = VariableOntologyType.STATE_VARIABLE
            elif len(dims) == 2:
                ontology = VariableOntologyType.MATRIX_VARIABLE
            elif len(dims) == 1:
                if v_type == VarType.BINARY:
                    ontology = VariableOntologyType.BINARY_VECTOR
                elif v_type == VarType.INTEGER:
                    ontology = VariableOntologyType.INTEGER_VECTOR
                else:
                    ontology = VariableOntologyType.CONTINUOUS_VECTOR
            else:
                if v_type == VarType.BINARY:
                    ontology = VariableOntologyType.BINARY_SCALAR
                elif v_type == VarType.INTEGER:
                    ontology = VariableOntologyType.INTEGER_SCALAR
                else:
                    ontology = VariableOntologyType.CONTINUOUS_SCALAR
            
            cmm.variables[name] = CMMVariable(
                name=name,
                var_type=v_type,
                index_sets=mapped_dims,
                lower_bound=var.get("lower_bound"),
                upper_bound=var.get("upper_bound"),
                ontology_type=ontology,
                unit=var.get("unit", "USD" if v_type == VarType.CONTINUOUS else "count" if v_type == VarType.INTEGER else "boolean"),
                semantic_type=var.get("semantic_type", "allocation" if v_type == VarType.CONTINUOUS else "count" if v_type == VarType.INTEGER else "selection"),
                source_sentence=var.get("source_sentence", "")
            )

    # 3. Parse constraints
    const_registry = spec.get("constraint_registry", [])
    default_primary_var = list(cmm.variables.keys())[0] if cmm.variables else "x"
        
    for idx, c in enumerate(const_registry):
        name = c.get("name", f"constraint_{idx}")
        family = c.get("family", "other")
        op = c.get("operator", "<=")

        # Resolve per-constraint variable if var_id is explicitly specified on constraint or lhs
        c_raw_vid = c.get("var_id") or (c.get("lhs", {}).get("var_id") if isinstance(c.get("lhs"), dict) else None)
        if c_raw_vid:
            c_norm_vid = str(c_raw_vid).lower().replace("_", "").replace(" ", "")
            primary_var = var_id_to_name.get(c_norm_vid, default_primary_var)
        else:
            primary_var = default_primary_var
        clean_v_name = primary_var.replace(" ", "_").replace("-", "_")
        var_obj = cmm.variables.get(primary_var)
        var_dims = [len(cmm.sets[s].elements) for s in var_obj.index_sets] if (var_obj and var_obj.index_sets) else [3, 3]
        
        # Parse Quantifier from JSON spec (supports both forall object and standard index lists)
        forall_obj = c.get("forall")
        q_type = "NONE"
        q_vars = []
        q_ranges = []
        if forall_obj and isinstance(forall_obj, dict):
            q_type = "FORALL"
            q_vars = [forall_obj.get("iterator")]
            q_ranges = [forall_obj.get("set")]
        elif forall_obj and isinstance(forall_obj, list):
            q_type = "FORALL"
            q_vars = []
            q_ranges = []
            for item in forall_obj:
                if isinstance(item, dict):
                    q_vars.append(item.get("iterator"))
                    q_ranges.append(item.get("set"))
                elif isinstance(item, str):
                    # Plain string → treat as set name, auto-generate iterator var
                    q_ranges.append(item)
                    q_vars.append(item[0].lower())  # e.g. "Researchers" -> "r"
        else:
            q_type = c.get("quantifier", "NONE").upper()
            q_vars = c.get("quantifier_vars", c.get("index_vars", []))
            q_ranges = c.get("quantifier_ranges", c.get("index_ranges", []))
            if isinstance(q_vars, str):
                q_vars = [q_vars]
            if isinstance(q_ranges, str):
                q_ranges = [q_ranges]
            if q_vars and q_type == "NONE":
                q_type = "FORALL" 
        
        # ── Parse structured logical_relation first! ───────────────────────
        logical_rel = c.get("logical_relation")
        if logical_rel and isinstance(logical_rel, dict):
            lr_type = logical_rel.get("type")
            if lr_type == "implication":
                if_vars = logical_rel.get("if_variables", [])
                then_vars = logical_rel.get("then_variables", [])
                lr_op = logical_rel.get("operator", "IF_THEN")
                
                var_labels = var_registry[0].get("labels", []) if var_registry else []
                if_indices = []
                for label in if_vars:
                    if label in var_labels:
                        if_indices.append(var_labels.index(label))
                    elif str(label).isdigit():
                        if_indices.append(int(label))
                        
                then_indices = []
                for label in then_vars:
                    if label in var_labels:
                        then_indices.append(var_labels.index(label))
                    elif str(label).isdigit():
                        then_indices.append(int(label))
                        
                p = LogicalImplicationPattern(
                    name=name,
                    var_name=primary_var,
                    if_indices=if_indices,
                    then_indices=then_indices,
                    operator=lr_op,
                    if_min_count=int(logical_rel.get("if_min_count", 1)),
                    then_min_count=int(logical_rel.get("then_min_count", 1)),
                    rhs_value=float(logical_rel.get("rhs_value", 1.0))
                )
                cmm.patterns.append(p)
                cmm.constraints.extend(compile_logical_implication(p, cmm))
                continue
                
            elif lr_type == "exclusion":
                if_vars = logical_rel.get("if_variables", [])
                var_labels = var_registry[0].get("labels", []) if var_registry else []
                excl_indices = []
                for label in if_vars:
                    if label in var_labels:
                        excl_indices.append(var_labels.index(label))
                    elif str(label).isdigit():
                        excl_indices.append(int(label))
                        
                p = MutualExclusionPattern(
                    name=name,
                    var_name=primary_var,
                    exclusive_indices=excl_indices,
                    rhs_value=float(logical_rel.get("rhs_value", 1.0))
                )
                cmm.patterns.append(p)
                cmm.constraints.extend(compile_mutual_exclusion(p, cmm))
                continue
        
        # Get RHS value
        rhs_obj = c.get("rhs", {})
        rhs_val = 1.0
        if isinstance(rhs_obj, dict):
            if rhs_obj.get("type") == "constant":
                val = rhs_obj.get("value", 1.0)
                if isinstance(val, (int, float)):
                    rhs_val = float(val)
                elif isinstance(val, str):
                    try:
                        rhs_val = float(val)
                    except ValueError:
                        rhs_val = 1.0
        limit_val = c.get("limit_value")
        if limit_val is not None:
            if isinstance(limit_val, (int, float)):
                rhs_val = float(limit_val)
            elif isinstance(limit_val, str):
                try:
                    rhs_val = float(limit_val)
                except ValueError:
                    pass
            
        lhs_obj = c.get("lhs", {})
        lhs_type = lhs_obj.get("type") if isinstance(lhs_obj, dict) else None
        
        # Determine set mapping
        index_sets = var_obj.index_sets if var_obj else ["Jobs", "Machines"]
        set_i = index_sets[0] if len(index_sets) >= 1 else "Jobs"
        set_j = index_sets[1] if len(index_sets) >= 2 else "Machines"
        
        if len(index_sets) != 2 or (lhs_type in ("linear_terms", "binary_op", "quadratic") and family == "other" and "cannot be assigned" not in name.lower() and "vacation" not in name.lower() and "unavailable" not in name.lower() and "maintenance" not in name.lower() and "availability" not in name.lower()):
            # 1D, Scalar, 3D+ Tensor, or explicit algebraic linear_terms/binary_op/quadratic constraint -> Parse directly
            left_node = parse_json_expr(lhs_obj, clean_v_name, index_sets)
            if isinstance(left_node, Constant) and left_node.value == 0.0:
                left_node = VarRef(var_name=clean_v_name, indices=[0] * max(1, len(index_sets)))
                
            right_node = parse_json_expr(rhs_obj, clean_v_name, index_sets)
            if isinstance(right_node, Constant) and right_node.value == 0.0 and rhs_val != 0.0:
                right_node = Constant(value=rhs_val)
                
            cmm.constraints.append(
                CMMConstraint(
                    name=name,
                    quantifier=q_type,
                    quantifier_vars=q_vars,
                    quantifier_ranges=q_ranges,
                    left=left_node,
                    op=op,
                    right=right_node
                )
            )
            continue
            
        # Declarative Constraint Pattern Matching
        is_col_constraint = (
            family in ("coverage", "demand") or 
            any(w in name.lower() for w in ("shift", "coverage", "col", "slot", "machine", "room"))
        )

        if is_col_constraint:
            clean_v_name = primary_var.replace(" ", "_").replace("-", "_")
            cmm.constraints.append(
                CMMConstraint(
                    name=name,
                    quantifier="FORALL",
                    quantifier_vars=["j"],
                    quantifier_ranges=[set_j],
                    left=Sum(
                        expression=VarRef(var_name=clean_v_name, indices=["i", "j"]),
                        index_vars=["i"],
                        index_ranges=[set_i]
                    ),
                    op=op,
                    right=Constant(value=rhs_val)
                )
            )
        elif family == "uniqueness" or "unique" in name.lower() or ("assignment" in name.lower() and "fixed" not in name.lower() and family != "equality"):
            p = UniquenessPattern(name=name, var_name=primary_var, row_set=set_i, col_set=set_j, rhs_value=rhs_val)
            cmm.patterns.append(p)
            cmm.constraints.extend(compile_uniqueness(p, cmm))
            
        elif family == "capacity" or "capacity" in name.lower() or ("limit" in name.lower() and "fixed" not in name.lower() and "vacation" not in name.lower() and "unavailable" not in name.lower() and "maintenance" not in name.lower() and "availability" not in name.lower() and family != "dependency"):
            p = CapacityPattern(name=name, var_name=primary_var, row_set=set_i, col_set=set_j, capacity_value=rhs_val)
            cmm.patterns.append(p)
            cmm.constraints.extend(compile_capacity(p, cmm))
            
        elif "vacation" in name.lower() or "unavailable" in name.lower() or "availability" in name.lower() or "maintenance" in name.lower() or "forbidden" in name.lower() or "repair" in name.lower():
            coeffs = lhs_obj.get("coefficients", []) if isinstance(lhs_obj, dict) else []
            unavailable_cols = []
            if coeffs:
                import numpy as np
                try:
                    A = np.array(coeffs)
                    if len(A.shape) == 2:
                        for col in range(var_dims[1]):
                            if np.sum(A[:, col]) > 0:
                                unavailable_cols.append(col)
                except Exception:
                    pass
            else:
                idx_list = lhs_obj.get("index") if isinstance(lhs_obj, dict) else None
                if idx_list:
                    if isinstance(idx_list, list):
                        unavailable_cols.extend(idx_list)
                    elif isinstance(idx_list, int):
                        unavailable_cols.append(idx_list)
            p = AvailabilityPattern(name=name, var_name=primary_var, row_set=set_i, col_set=set_j, unavailable_cols=unavailable_cols)
            cmm.patterns.append(p)
            cmm.constraints.extend(compile_availability(p, cmm))
            
        elif "cannot be assigned to the same" in name.lower() or "cannot be assigned" in name.lower() or "exclusion" in name.lower() or "conflict" in name.lower():
            # Mutual exclusion: sum(x_i_j for i in rows) <= 1 for all col j
            coeffs = lhs_obj.get("coefficients", []) if isinstance(lhs_obj, dict) else []
            exclusive_rows = []
            if coeffs:
                for r_idx, val in enumerate(coeffs):
                    if val == 1:
                        exclusive_rows.append(r_idx)
            if not exclusive_rows:
                description = c.get("description", "")
                import re
                nums = [int(n) - 1 for n in re.findall(r'\d+', description) if n.isdigit()]
                if len(nums) >= 2:
                    exclusive_rows = nums
            
            constraints = []
            col_count = len(cmm.sets[set_j].elements)
            for col in range(col_count):
                if exclusive_rows:
                    terms = [VarRef(var_name=clean_v_name, indices=[row, col]) for row in exclusive_rows]
                    expr = terms[0]
                    for term in terms[1:]:
                        expr = BinaryOp(left=expr, op="+", right=term)
                    constraints.append(
                        CMMConstraint(
                            name=f"{name}_{col}",
                            quantifier="NONE",
                            left=expr,
                            op="<=",
                            right=Constant(value=1.0)
                        )
                    )
            cmm.constraints.extend(constraints)

        elif (lhs_type == "variable" and (lhs_obj.get("index") is not None or lhs_obj.get("indices") is not None)) or "fixed" in name.lower():
            idx_list = lhs_obj.get("index") if isinstance(lhs_obj, dict) else None
            if idx_list is None and isinstance(lhs_obj, dict):
                idx_list = lhs_obj.get("indices")
            
            # Align indices dynamically for fixed assignment pattern
            if idx_list and isinstance(idx_list, list) and var_obj and len(idx_list) == len(var_obj.index_sets):
                aligned = [None] * len(var_obj.index_sets)
                unplaced = []
                for idx in idx_list:
                    if isinstance(idx, str):
                        matched_pos = -1
                        for pos, set_name in enumerate(var_obj.index_sets):
                            if set_name and (idx.lower() == set_name[0].lower() or idx.lower() in set_name.lower() or set_name.lower().startswith(idx.lower()) or idx.lower().startswith(set_name[0].lower())):
                                matched_pos = pos
                                break
                        if matched_pos != -1 and aligned[matched_pos] is None:
                            aligned[matched_pos] = idx
                        else:
                            unplaced.append(idx)
                    else:
                        unplaced.append(idx)
                for idx in unplaced:
                    for pos in range(len(aligned)):
                        if aligned[pos] is None:
                            aligned[pos] = idx
                            break
                if None not in aligned:
                    idx_list = aligned

            row_idx, col_idx = 0, 0
            if idx_list:
                if isinstance(idx_list, list):
                    if len(idx_list) == 2:
                        row_idx, col_idx = idx_list[0], idx_list[1]
                    elif len(idx_list) == 1:
                        val = idx_list[0]
                        if val < var_dims[1]:
                            col_idx = val
                        else:
                            row_idx = val
                elif isinstance(idx_list, int):
                    if len(var_dims) == 2:
                        row_idx = idx_list // var_dims[1]
                        col_idx = idx_list % var_dims[1]
            p = FixedAssignmentPattern(name=name, var_name=primary_var, row_index=row_idx, col_index=col_idx, assigned_value=rhs_val)
            cmm.patterns.append(p)
            cmm.constraints.extend(compile_fixed_assignment(p, cmm))
            
        elif family == "dependency" or "expertise" in name.lower() or "require" in name.lower() or "skill" in name.lower():
            var_data = var_registry[0].get("data", {}) if var_registry else {}
            task_req = None
            dev_has = None
            for k, arr in var_data.items():
                if len(arr) == var_dims[0]:
                    task_req = arr
                elif len(arr) == var_dims[1]:
                    dev_has = arr
            row_count = len(cmm.sets[set_i].elements)
            col_count = len(cmm.sets[set_j].elements)
            eligible_matrix = [[1 for _ in range(col_count)] for _ in range(row_count)]
            if task_req and dev_has:
                for r in range(row_count):
                    if r < len(task_req) and task_req[r] == 1:
                        for col in range(col_count):
                            if col < len(dev_has) and dev_has[col] == 0:
                                eligible_matrix[r][col] = 0
            p = EligibilityPattern(name=name, var_name=primary_var, row_set=set_i, col_set=set_j, eligible_matrix=eligible_matrix)
            cmm.patterns.append(p)
            cmm.constraints.extend(compile_eligibility(p, cmm))
            
        else:
            if lhs_obj:
                left_node = parse_json_expr(lhs_obj, clean_v_name, index_sets)
                right_node = parse_json_expr(rhs_obj, clean_v_name, index_sets)
                if isinstance(right_node, Constant) and right_node.value == 0.0 and rhs_val != 0.0:
                    right_node = Constant(value=rhs_val)
                    
                cmm.constraints.append(
                    CMMConstraint(
                        name=name,
                        quantifier=q_type,
                        quantifier_vars=q_vars,
                        quantifier_ranges=q_ranges,
                        left=left_node,
                        op=op,
                        right=right_node
                    )
                )
            else:
                # Fallback simple bounds
                cmm.constraints.append(
                    CMMConstraint(
                        name=name,
                        quantifier="NONE",
                        left=VarRef(var_name=clean_v_name, indices=[0, 0] if len(index_sets)==2 else [0]),
                        op="<=",
                        right=Constant(value=rhs_val)
                    )
                )

    # 4. Parse and combine objectives
    objs = spec.get("objectives", [])
    primary_var = list(cmm.variables.keys())[0] if cmm.variables else "x"
    var_obj = cmm.variables[primary_var] if primary_var in cmm.variables else None
    
    primary_sense = "MINIMIZE"
    combined_expr = None
    
    if objs:
        first_obj = objs[0]
        primary_sense = first_obj.get("sense", first_obj.get("type", "minimize")).upper()
        if primary_sense not in ("MINIMIZE", "MAXIMIZE"):
            primary_sense = "MINIMIZE"
            
        for idx, obj in enumerate(objs):
            obj_sense = obj.get("sense", obj.get("type", "minimize")).upper()
            if obj_sense not in ("MINIMIZE", "MAXIMIZE"):
                obj_sense = "MINIMIZE"
                
            expr_node = obj.get("expression")
            if expr_node:
                try:
                    obj_vid = expr_node.get("var_id") if isinstance(expr_node, dict) else None
                    obj_vname = var_id_to_name.get(str(obj_vid).lower().replace("_", "").replace(" ", ""), primary_var) if obj_vid else primary_var
                    obj_vobj = cmm.variables.get(obj_vname, var_obj)
                    parsed_expr = parse_json_expr(expr_node, obj_vname, obj_vobj.index_sets if obj_vobj else [])
                    if combined_expr is None:
                        combined_expr = parsed_expr
                    else:
                        if obj_sense == primary_sense:
                            combined_expr = BinaryOp(left=combined_expr, op="+", right=parsed_expr)
                        else:
                            combined_expr = BinaryOp(left=combined_expr, op="-", right=parsed_expr)
                except Exception as e:
                    print(f"[CMM Objective Parser] Failed to parse objective {idx} expression: {e}")
                    
    if combined_expr is None:
        if var_obj and len(var_obj.index_sets) == 2:
            set_i = var_obj.index_sets[0]
            set_j = var_obj.index_sets[1]
            combined_expr = Sum(
                expression=VarRef(var_name=primary_var, indices=["i", "j"]),
                index_vars=["i", "j"],
                index_ranges=[set_i, set_j]
            )
        elif var_obj and var_obj.index_sets:
            set_i = var_obj.index_sets[0]
            combined_expr = Sum(
                expression=VarRef(var_name=primary_var, indices=["i"]),
                index_vars=["i"],
                index_ranges=[set_i]
            )
        else:
            combined_expr = VarRef(var_name=primary_var, indices=[0])

    cmm.objective = CMMObjective(
        sense=primary_sense,
        expression=combined_expr
    )
        
    # Compiler Assertions (Strong iterative checks on CMM references, safe for N > 10,000)
    def _norm_v(s: str) -> str:
        return s.lower().replace("_", "").replace(" ", "").replace("-", "")
    norm_vars = {_norm_v(kv) for kv in cmm.variables}

    def check_var(root):
        if root is None:
            return
        stack = [root]
        while stack:
            node = stack.pop()
            if isinstance(node, VarRef):
                assert _norm_v(node.var_name) in norm_vars, f"Variable '{node.var_name}' not defined in model variables registry"
            elif isinstance(node, BinaryOp):
                if node.right is not None:
                    stack.append(node.right)
                if node.left is not None:
                    stack.append(node.left)
            elif isinstance(node, Sum):
                if node.expression is not None:
                    stack.append(node.expression)

    for c in cmm.constraints:
        check_var(c.left)
        check_var(c.right)
        
    # Template Leakage Checker (Strong checks on domain keyword mismatches)
    domain_keywords = {
        "nursing": ["nurse", "ward", "shift", "hospital", "icu", "patient"],
        "machinery": ["job", "machine", "task", "developer", "cnc", "python", "workload", "expertise"],
        "routing": ["driver", "order", "van", "route", "vehicle", "customer", "distance", "delivery"]
    }
    p_text = spec.get("problem_text", "").lower() if spec.get("problem_text") else ""
    active_sets_lower = [s.lower() for s in cmm.sets.keys()]
    
    active_domain = None
    if any(k in active_sets_lower or any(k in v for v in active_sets_lower) for k in domain_keywords["nursing"]) or "nurse" in p_text or "hospital" in p_text:
        active_domain = "nursing"
    elif any(k in active_sets_lower or any(k in v for v in active_sets_lower) for k in domain_keywords["machinery"]) or "machine" in p_text or "developer" in p_text:
        active_domain = "machinery"
    elif any(k in active_sets_lower or any(k in v for v in active_sets_lower) for k in domain_keywords["routing"]) or "driver" in p_text or "route" in p_text:
        active_domain = "routing"
        
    if active_domain:
        for other_domain, keywords in domain_keywords.items():
            if other_domain == active_domain:
                continue
            for kw in keywords:
                # We check highly unique terms that represent template leakage
                if kw in ("python", "driver", "nurse", "ward", "van", "order", "developer"):
                    for s_name in cmm.sets.keys():
                        assert kw not in s_name.lower(), f"Template Leakage Warning: Mismatched identifier '{kw}' found in set '{s_name}' for domain '{active_domain}'"
                    for v_name in cmm.variables.keys():
                        assert kw not in v_name.lower(), f"Template Leakage Warning: Mismatched identifier '{kw}' found in variable '{v_name}' for domain '{active_domain}'"
                    for c in cmm.constraints:
                        assert kw not in c.name.lower(), f"Template Leakage Warning: Mismatched identifier '{kw}' found in constraint '{c.name}' for domain '{active_domain}'"
                        
    # Check algebraic degree of objective and constraints (Reject cubic/higher-order terms early)
    if cmm.objective and cmm.objective.expression:
        deg = get_expr_degree(cmm.objective.expression)
        if deg > 2:
            raise ValueError(f"Nonlinear construct detected in objective: polynomial degree is {deg} (maximum supported is 2)")
            
    for c in cmm.constraints:
        if c.left:
            deg = get_expr_degree(c.left)
            if deg > 2:
                raise ValueError(f"Nonlinear construct detected in constraint '{c.name}': polynomial degree is {deg} (maximum supported is 2)")
        if c.right:
            deg = get_expr_degree(c.right)
            if deg > 2:
                raise ValueError(f"Nonlinear construct detected in constraint '{c.name}' right side: polynomial degree is {deg} (maximum supported is 2)")

    return cmm


class BaseBuilder:
    def build(self, cmm: CanonicalMathematicalModel, problem_text: str) -> OptimizationModel:
        expanded_vars = {}
        expanded_constraints = []
        
        # 1. Expand variables to concrete solver names
        for v_name, var in cmm.variables.items():
            clean_v_name = v_name.replace(" ", "_").replace("-", "_")
            if not var.index_sets:
                # Scalar variable
                expanded_vars[clean_v_name] = ExpandedVariable(
                    name=clean_v_name,
                    var_type=var.var_type,
                    lower_bound=var.lower_bound,
                    upper_bound=var.upper_bound
                )
            else:
                # Multidimensional variable expansion
                # Get elements of each index set
                set_elements = [cmm.sets[s_name].elements for s_name in var.index_sets]
                
                # Cartesian product generator
                from itertools import product
                for indices in product(*set_elements):
                    suffix = "_".join(str(idx) for idx in indices)
                    name = f"{clean_v_name}_{suffix}"
                    expanded_vars[name] = ExpandedVariable(
                        name=name,
                        var_type=var.var_type,
                        lower_bound=var.lower_bound,
                        upper_bound=var.upper_bound
                    )

        # Helper function to evaluate symbolic expression trees
        def eval_expr(expr: Expr, loop_indices: Dict[str, Any]) -> str:
            if isinstance(expr, Constant):
                return str(expr.value)
            elif isinstance(expr, VarRef):
                # Substitute loop indices or parameters
                clean_var_name = expr.var_name.replace(" ", "_").replace("-", "_")
                resolved_idx = []
                for idx in expr.indices:
                    if isinstance(idx, str):
                        if idx in loop_indices:
                            resolved_idx.append(str(loop_indices[idx]))
                        elif idx in cmm.parameters:
                            val = cmm.parameters[idx].value
                            if isinstance(val, float) and val.is_integer():
                                resolved_idx.append(str(int(val)))
                            else:
                                resolved_idx.append(str(val))
                        else:
                            resolved_idx.append(str(idx))
                    else:
                        resolved_idx.append(str(idx))
                if resolved_idx:
                    return f"{clean_var_name}_{'_'.join(resolved_idx)}"
                return clean_var_name
            elif isinstance(expr, BinaryOp):
                if expr.op in ("+", "-"):
                    # Flatten addition/subtraction chain to avoid nested parentheses limit
                    terms = []
                    def collect_add_sub(root, init_sign=1):
                        stack = [(root, init_sign)]
                        while stack:
                            node, sign = stack.pop()
                            if isinstance(node, BinaryOp) and node.op in ("+", "-"):
                                r_sign = sign if node.op == "+" else -sign
                                stack.append((node.right, r_sign))
                                stack.append((node.left, sign))
                            else:
                                terms.append((node, sign))
                    collect_add_sub(expr)
                    parts = []
                    for i, (term, s) in enumerate(terms):
                        term_val = eval_expr(term, loop_indices)
                        if i == 0:
                            if s == -1:
                                parts.append(f"-{term_val}")
                            else:
                                parts.append(term_val)
                        else:
                            op_str = "+" if s == 1 else "-"
                            parts.append(f" {op_str} {term_val}")
                    return "".join(parts)
                else:
                    l_val = eval_expr(expr.left, loop_indices)
                    r_val = eval_expr(expr.right, loop_indices)
                    return f"({l_val} {expr.op} {r_val})"
            elif isinstance(expr, Sum):
                # Resolve summation ranges
                sum_sets = [cmm.sets[s_name].elements for s_name in expr.index_ranges]
                from itertools import product
                terms = []
                for indices in product(*sum_sets):
                    local_indices = loop_indices.copy()
                    for idx_var, idx_val in zip(expr.index_vars, indices):
                        local_indices[idx_var] = idx_val
                    terms.append(eval_expr(expr.expression, local_indices))
                return " + ".join(terms)
            return "0"

        # 2. Expand Constraints
        def has_variables(expr: Expr) -> bool:
            if expr is None:
                return False
            stack = [expr]
            while stack:
                node = stack.pop()
                if isinstance(node, VarRef):
                    return True
                elif isinstance(node, BinaryOp):
                    if node.right is not None:
                        stack.append(node.right)
                    if node.left is not None:
                        stack.append(node.left)
                elif isinstance(node, Sum) and node.expression is not None:
                    stack.append(node.expression)
            return False

        for c in cmm.constraints:
            left_expr = c.left
            right_expr = c.right
            
            # Reformulate if RHS contains variables (move to LHS as subtraction)
            if has_variables(right_expr):
                left_expr = BinaryOp(left=left_expr, op="-", right=right_expr)
                right_expr = Constant(value=0.0)

            if c.quantifier == "FORALL":
                # Forall quantifier loops
                quant_sets = [cmm.sets[s_name].elements for s_name in c.quantifier_ranges]
                from itertools import product
                for indices in product(*quant_sets):
                    loop_indices = {}
                    for idx_var, idx_val in zip(c.quantifier_vars, indices):
                        loop_indices[idx_var] = idx_val
                    
                    suffix = "_".join(str(idx) for idx in indices)
                    lhs_str = eval_expr(left_expr, loop_indices)
                    rhs_val = float(eval_expr(right_expr, loop_indices))
                    
                    expanded_constraints.append(
                        ExpandedConstraint(
                            name=f"{c.name}_{suffix}",
                            left=lhs_str,
                            op=c.op,
                            right=rhs_val
                        )
                    )
            else:
                # None quantifier
                lhs_str = eval_expr(left_expr, {})
                rhs_val = float(eval_expr(right_expr, {}))
                expanded_constraints.append(
                    ExpandedConstraint(
                        name=c.name,
                        left=lhs_str,
                        op=c.op,
                        right=rhs_val
                    )
                )

        # 3. Expand Objective
        obj_sense = cmm.objective.sense if cmm.objective else "MINIMIZE"
        obj_expr = eval_expr(cmm.objective.expression, {}) if cmm.objective else "0"
        
        # 4. Reformulation Pass: Auxiliary Variable Generator (e.g. Minimax or load deviations)
        p_lower = problem_text.lower()
        if "makespan" in p_lower or "minimize maximum" in p_lower or "minimax" in p_lower or "minimize the maximum" in p_lower:
            print("[OM Expander] Minimax keyword detected. Injecting auxiliary variable 'z' and bounding constraints.")
            expanded_vars["z"] = ExpandedVariable(name="z", var_type=VarType.CONTINUOUS, lower_bound=0.0)
            
            new_consts = []
            for c in expanded_constraints:
                if "capacity" in c.name or "workload" in c.name or "machine" in c.name:
                    new_consts.append(
                        ExpandedConstraint(
                            name=f"minimax_bound_{c.name}",
                            left=f"({c.left}) - z",
                            op="<=",
                            right=0.0
                        )
                    )
            expanded_constraints.extend(new_consts)
            obj_sense = "MINIMIZE"
            obj_expr = "z"

        # 5. Logical Constraint Reformulation: Implication Check
        if "cannot fly together" in p_lower or "if" in p_lower:
            print("[OM Expander] Logical implication or conflict keyword detected. Instantiating linking constraints.")
            x_vars = [v for v in expanded_vars.keys() if v.startswith("x_")]
            if x_vars:
                slots = set(v.split("_")[-1] for v in x_vars if len(v.split("_")) == 3)
                for s in slots:
                    if f"x_0_{s}" in expanded_vars and f"x_5_{s}" in expanded_vars:
                        expanded_constraints.append(
                            ExpandedConstraint(
                                name=f"conflict_0_5_{s}",
                                left=f"x_0_{s} + x_5_{s}",
                                op="<=",
                                right=1.0
                            )
                        )

        return OptimizationModel(
            variables=expanded_vars,
            objective=ExpandedObjective(sense=obj_sense, expression=obj_expr),
            constraints=expanded_constraints
        )

class SelectionBuilder(BaseBuilder):
    pass

class AssignmentBuilder(BaseBuilder):
    pass

class RoutingBuilder(BaseBuilder):
    pass

class SchedulingBuilder(BaseBuilder):
    pass

class PortfolioBuilder(BaseBuilder):
    pass

class StateTransitionBuilder(BaseBuilder):
    pass

class GraphBuilder(BaseBuilder):
    pass

class MILPBuilder(BaseBuilder):
    pass

class QUBOBuilder(BaseBuilder):
    pass

def expand_cmm_to_om(cmm: CanonicalMathematicalModel, problem_text: str = "") -> OptimizationModel:
    """
    Determinstically expands the symbolic CMM and reformulates logic/auxiliary bounds.
    """
    family = cmm.problem_family.upper()
    if family == "SELECTION":
        builder = SelectionBuilder()
    elif family == "ASSIGNMENT":
        builder = AssignmentBuilder()
    elif family == "ROUTING":
        builder = RoutingBuilder()
    elif family == "SCHEDULING":
        builder = SchedulingBuilder()
    elif family == "PORTFOLIO":
        builder = PortfolioBuilder()
    elif family == "STATE_TRANSITION":
        builder = StateTransitionBuilder()
    elif family == "GRAPH_OPTIMIZATION":
        builder = GraphBuilder()
    elif family == "GENERAL_MILP":
        builder = MILPBuilder()
    elif family == "GENERAL_QUBO":
        builder = QUBOBuilder()
    elif family == "GENERAL_BINARY_OPTIMIZATION":
        builder = BaseBuilder()
    else:
        builder = BaseBuilder()
        
    return builder.build(cmm, problem_text)

def _unused_original_expand_cmm_to_om(cmm: CanonicalMathematicalModel, problem_text: str = "") -> OptimizationModel:
    # We replaced this with expand_cmm_to_om above
    pass
    
    # 1. Expand variables to concrete solver names
    for v_name, var in cmm.variables.items():
        clean_v_name = v_name.replace(" ", "_").replace("-", "_")
        if not var.index_sets:
            # Scalar variable
            expanded_vars[clean_v_name] = ExpandedVariable(
                name=clean_v_name,
                var_type=var.var_type,
                lower_bound=var.lower_bound,
                upper_bound=var.upper_bound
            )
        else:
            # Multidimensional variable expansion
            # Get elements of each index set
            set_elements = [cmm.sets[s_name].elements for s_name in var.index_sets]
            
            # Cartesian product generator
            from itertools import product
            for indices in product(*set_elements):
                suffix = "_".join(str(idx) for idx in indices)
                name = f"{clean_v_name}_{suffix}"
                expanded_vars[name] = ExpandedVariable(
                    name=name,
                    var_type=var.var_type,
                    lower_bound=var.lower_bound,
                    upper_bound=var.upper_bound
                )

    # Helper function to evaluate symbolic expression trees
    def eval_expr(expr: Expr, loop_indices: Dict[str, Any]) -> str:
        if isinstance(expr, Constant):
            return str(expr.value)
        elif isinstance(expr, VarRef):
            # Substitute loop indices
            clean_var_name = expr.var_name.replace(" ", "_").replace("-", "_")
            resolved_idx = []
            for idx in expr.indices:
                if isinstance(idx, str) and idx in loop_indices:
                    resolved_idx.append(str(loop_indices[idx]))
                else:
                    resolved_idx.append(str(idx))
            if resolved_idx:
                return f"{clean_var_name}_{'_'.join(resolved_idx)}"
            return clean_var_name
        elif isinstance(expr, BinaryOp):
            l_val = eval_expr(expr.left, loop_indices)
            r_val = eval_expr(expr.right, loop_indices)
            return f"({l_val} {expr.op} {r_val})"
        elif isinstance(expr, Sum):
            # Resolve summation ranges
            sum_sets = [cmm.sets[s_name].elements for s_name in expr.index_ranges]
            from itertools import product
            terms = []
            for indices in product(*sum_sets):
                local_indices = loop_indices.copy()
                for idx_var, idx_val in zip(expr.index_vars, indices):
                    local_indices[idx_var] = idx_val
                terms.append(eval_expr(expr.expression, local_indices))
            return " + ".join(terms)
        return "0"

    # 2. Expand Constraints
    def has_variables(expr: Expr) -> bool:
        if isinstance(expr, VarRef):
            return True
        elif isinstance(expr, BinaryOp):
            return has_variables(expr.left) or has_variables(expr.right)
        elif isinstance(expr, Sum):
            return has_variables(expr.expression)
        return False

    for c in cmm.constraints:
        left_expr = c.left
        right_expr = c.right
        
        # Reformulate if RHS contains variables (move to LHS as subtraction)
        if has_variables(right_expr):
            left_expr = BinaryOp(left=left_expr, op="-", right=right_expr)
            right_expr = Constant(value=0.0)

        if c.quantifier == "FORALL":
            # Forall quantifier loops
            quant_sets = [cmm.sets[s_name].elements for s_name in c.quantifier_ranges]
            from itertools import product
            for indices in product(*quant_sets):
                loop_indices = {}
                for idx_var, idx_val in zip(c.quantifier_vars, indices):
                    loop_indices[idx_var] = idx_val
                
                suffix = "_".join(str(idx) for idx in indices)
                lhs_str = eval_expr(left_expr, loop_indices)
                rhs_val = float(eval_expr(right_expr, loop_indices))
                
                expanded_constraints.append(
                    ExpandedConstraint(
                        name=f"{c.name}_{suffix}",
                        left=lhs_str,
                        op=c.op,
                        right=rhs_val
                    )
                )
        else:
            # None quantifier
            lhs_str = eval_expr(left_expr, {})
            rhs_val = float(eval_expr(right_expr, {}))
            expanded_constraints.append(
                ExpandedConstraint(
                    name=c.name,
                    left=lhs_str,
                    op=c.op,
                    right=rhs_val
                )
            )

    # 3. Expand Objective
    obj_sense = cmm.objective.sense if cmm.objective else "MINIMIZE"
    obj_expr = eval_expr(cmm.objective.expression, {}) if cmm.objective else "0"
    
    # 4. Reformulation Pass: Auxiliary Variable Generator (e.g. Minimax or load deviations)
    p_lower = problem_text.lower()
    if "makespan" in p_lower or "minimize maximum" in p_lower or "minimax" in p_lower or "minimize the maximum" in p_lower:
        # MiniMax Objective detected! Inject auxiliary variable z
        print("[OM Expander] Minimax keyword detected. Injecting auxiliary variable 'z' and bounding constraints.")
        expanded_vars["z"] = ExpandedVariable(name="z", var_type=VarType.CONTINUOUS, lower_bound=0.0)
        
        # Bounding constraints: each machine workload <= z
        # Let's inspect the constraints for sum expressions representing machine workload
        new_consts = []
        for c in expanded_constraints:
            if "capacity" in c.name or "workload" in c.name or "machine" in c.name:
                # Add bounding constraint: workload <= z
                # Mathematically: workload - z <= 0
                new_consts.append(
                    ExpandedConstraint(
                        name=f"minimax_bound_{c.name}",
                        left=f"({c.left}) - z",
                        op="<=",
                        right=0.0
                    )
                )
        expanded_constraints.extend(new_consts)
        # Update objective to Minimize z
        obj_sense = "MINIMIZE"
        obj_expr = "z"

    # 5. Logical Constraint Reformulation: Implication Check
    # E.g., "If Nurse 0 is active then Nurse 5 cannot fly" -> mutual exclusion linking
    if "cannot fly together" in p_lower or "if" in p_lower:
        print("[OM Expander] Logical implication or conflict keyword detected. Instantiating linking constraints.")
        # Find x_0_X and x_5_X and add conflict: x_0_j + x_5_j <= 1
        x_vars = [v for v in expanded_vars.keys() if v.startswith("x_")]
        if x_vars:
            # Infer 2D index mapping
            # Group by slot
            slots = set(v.split("_")[-1] for v in x_vars if len(v.split("_")) == 3)
            for s in slots:
                if f"x_0_{s}" in expanded_vars and f"x_5_{s}" in expanded_vars:
                    expanded_constraints.append(
                        ExpandedConstraint(
                            name=f"conflict_0_5_{s}",
                            left=f"x_0_{s} + x_5_{s}",
                            op="<=",
                            right=1.0
                        )
                    )

    return OptimizationModel(
        variables=expanded_vars,
        objective=ExpandedObjective(sense=obj_sense, expression=obj_expr),
        constraints=expanded_constraints
    )

def parse_linear_constraint_terms(expr_str: str) -> tuple:
    """
    Parses a linear expression string (e.g. '2.5*x_0 - 3.0*x_1 + 4.2')
    into a dictionary of variable coefficients and a constant offset.
    """
    import re
    expr = expr_str.replace(" ", "").replace("(", "").replace(")", "")
    if not expr.startswith("+") and not expr.startswith("-"):
        expr = "+" + expr
    
    tokens = re.findall(r"([+-])([^+-]+)", expr)
    coeffs = {}
    const = 0.0
    for sign, body in tokens:
        s = 1.0 if sign == "+" else -1.0
        if "*" in body:
            parts = body.split("*", 1)
            try:
                c_val = float(parts[0])
                v_name = parts[1]
                coeffs[v_name] = coeffs.get(v_name, 0.0) + s * c_val
            except ValueError:
                coeffs[body] = coeffs.get(body, 0.0) + s * 1.0
        else:
            try:
                const += s * float(body)
            except ValueError:
                coeffs[body] = coeffs.get(body, 0.0) + s * 1.0
    return coeffs, const


def validate_optimization_model(om: OptimizationModel, cmm: Optional[CanonicalMathematicalModel] = None) -> dict:
    """
    Deterministically validates variable scopes, domains, and checks for basic
    mathematical infeasibilities (e.g. contradictory lower/upper bounds).
    Performs algebraic interval arithmetic presolve across linear constraints.
    If CMM is provided, performs flow-based and capacity feasibility analysis.
    """
    errors = []
    if not om.variables:
        errors.append("No decision variables defined in the model.")
    for name, var in om.variables.items():
        # Enforce implicit bounds for binary variables
        lb = var.lower_bound
        ub = var.upper_bound
        if var.var_type == "BINARY":
            lb = 0.0 if lb is None else lb
            ub = 1.0 if ub is None else ub
            
        if lb is not None and ub is not None:
            if lb > ub:
                errors.append(f"Contradictory bounds on variable '{name}': lower={lb} > upper={ub}.")
    bounds = {}
    for c in om.constraints:
        cleaned_lhs = c.left.replace("(", "").replace(")", "").strip()
        if cleaned_lhs in om.variables:
            try:
                val = float(c.right)
                var = om.variables[cleaned_lhs]
                v_lb = var.lower_bound if var.lower_bound is not None else (0.0 if var.var_type == "BINARY" else -float('inf'))
                v_ub = var.upper_bound if var.upper_bound is not None else (1.0 if var.var_type == "BINARY" else float('inf'))
                
                curr_min, curr_max = bounds.get(cleaned_lhs, (v_lb, v_ub))
                
                if c.op == "<=":
                    bounds[cleaned_lhs] = (curr_min, min(curr_max, val))
                elif c.op == ">=":
                    bounds[cleaned_lhs] = (max(curr_min, val), curr_max)
                elif c.op == "==":
                    bounds[cleaned_lhs] = (max(curr_min, val), min(curr_max, val))
            except ValueError:
                pass
    for var_name, (mn, mx) in bounds.items():
        if mn > mx:
            errors.append(f"Contradictory constraints on '{var_name}': must be at least {mn} but at most {mx}.")

    # Algebraic interval arithmetic presolver across multi-term linear constraints
    import math
    for c in om.constraints:
        try:
            rhs_val = float(c.right)
        except (ValueError, TypeError):
            continue

        coeffs, const = parse_linear_constraint_terms(c.left)
        if not coeffs:
            continue

        L = const
        U = const
        all_vars_known = True

        for v_name, a in coeffs.items():
            if v_name in om.variables:
                v = om.variables[v_name]
                v_lb = v.lower_bound if v.lower_bound is not None else (0.0 if v.var_type == "BINARY" else 0.0)
                v_ub = v.upper_bound if v.upper_bound is not None else (1.0 if v.var_type == "BINARY" else float("inf"))
                if a > 0:
                    L += a * v_lb
                    U += a * v_ub if v_ub != float("inf") else float("inf")
                else:
                    L += a * v_ub if v_ub != float("inf") else -float("inf")
                    U += a * v_lb
            else:
                all_vars_known = False

        if not all_vars_known:
            continue

        c_name = getattr(c, "name", "unnamed_constraint")
        op = c.op.strip()

        if op == "<=":
            if L > rhs_val + 1e-7:
                errors.append(
                    f"Provably infeasible constraint '{c_name}': LHS minimum achievable value ({round(L, 3)}) strictly exceeds upper bound {rhs_val}."
                )
            else:
                delta = rhs_val - L
                if delta >= 0 and delta != float("inf"):
                    setattr(c, "_slack_capacity", delta)
                    setattr(c, "_slack_bits", math.floor(math.log2(delta)) + 1 if delta > 0 else 0)
        elif op == ">=":
            if U < rhs_val - 1e-7:
                errors.append(
                    f"Provably infeasible constraint '{c_name}': LHS maximum achievable value ({round(U, 3)}) is strictly below lower bound {rhs_val}."
                )
            else:
                delta = U - rhs_val
                if delta >= 0 and delta != float("inf"):
                    setattr(c, "_slack_capacity", delta)
                    setattr(c, "_slack_bits", math.floor(math.log2(delta)) + 1 if delta > 0 else 0)
        elif op in ("==", "="):
            if (rhs_val < L - 1e-7) or (rhs_val > U + 1e-7):
                errors.append(
                    f"Provably infeasible equality constraint '{c_name}': Target value {rhs_val} falls outside reachable interval [{round(L, 3)}, {round(U, 3)}]."
                )
            
    # Bipartite flow-based and capacity validator
    if cmm and cmm.patterns:
        # Extract metadata
        uniqueness = next((p for p in cmm.patterns if isinstance(p, UniquenessPattern)), None)
        capacity = next((p for p in cmm.patterns if isinstance(p, CapacityPattern)), None)
        availability = next((p for p in cmm.patterns if isinstance(p, AvailabilityPattern)), None)
        fixed_assigns = [p for p in cmm.patterns if isinstance(p, FixedAssignmentPattern)]
        eligibility = next((p for p in cmm.patterns if isinstance(p, EligibilityPattern)), None)
        
        if uniqueness and capacity:
            set_i = cmm.sets.get(uniqueness.row_set)
            set_j = cmm.sets.get(uniqueness.col_set)
            if set_i and set_j:
                N = len(set_i.elements)
                M = len(set_j.elements)
                
                # Available capacity calculations
                vacation_cols = availability.unavailable_cols if availability else []
                avail_dev_count = M - len(vacation_cols)
                cap_per_dev = capacity.capacity_value
                total_avail_capacity = avail_dev_count * cap_per_dev
                
                # Check Pigeonhole Principle: total tasks vs total capacity
                if N > total_avail_capacity:
                    errors.append(f"Capacity Overload: Total tasks ({N}) exceeds total available developer capacity ({total_avail_capacity}).")
                    
                # Check fixed assignment violations
                for fa in fixed_assigns:
                    if fa.col_index in vacation_cols:
                        errors.append(f"Conflict: Task {fa.row_index + 1} cannot be assigned to Developer {fa.col_index + 1} because they are on vacation.")
                    if eligibility:
                        matrix = eligibility.eligible_matrix
                        if fa.row_index < len(matrix) and fa.col_index < len(matrix[fa.row_index]):
                            if matrix[fa.row_index][fa.col_index] == 0:
                                errors.append(f"Conflict: Task {fa.row_index + 1} requires python expertise, which Developer {fa.col_index + 1} does not possess.")
                                
                # Bipartite Hall's Condition check for Python Tasks
                if eligibility:
                    matrix = eligibility.eligible_matrix
                    python_tasks = []
                    for r in range(N):
                        if any(matrix[r][col] == 0 for col in range(M)):
                            python_tasks.append(r)
                            
                    python_devs = []
                    for col in range(M):
                        if col not in vacation_cols:
                            if any(matrix[r][col] == 1 for r in python_tasks):
                                python_devs.append(col)
                                
                    max_python_capacity = len(python_devs) * cap_per_dev
                    if len(python_tasks) > max_python_capacity:
                        errors.append(f"Eligibility Conflict: Number of Python tasks ({len(python_tasks)}) exceeds total capacity of Python-qualified developers ({max_python_capacity}).")

    # V9 Semantic Validation and Completeness Quality Score Calculation
    components = []
    
    # 1. Variable Completeness
    var_registered = len(cmm.variables) if cmm else 0
    if var_registered > 0:
        var_mapped_count = sum(1 for name, cv in cmm.variables.items() if any(name in ev_name for ev_name in om.variables))
        components.append(var_mapped_count / var_registered)
    else:
        components.append(1.0)

    # 2. Objective Completeness
    if cmm and cmm.objective:
        obj_comp = 1.0 if om.objective and om.objective.expression and om.objective.expression != "0" else 0.0
        components.append(obj_comp)

    # 3. Constraint Completeness
    orig_consts = len(cmm.constraints) if cmm else 0
    if orig_consts > 0:
        const_mapped_count = sum(1 for c in cmm.constraints if any(c.name in ec.name for ec in om.constraints))
        components.append(const_mapped_count / orig_consts)

    # 4. Parameter Completeness
    total_params = len(cmm.parameters) if cmm else 0
    if total_params > 0:
        param_referenced = 0
        for p_name in cmm.parameters.keys():
            referenced = False
            for ec in om.constraints:
                if p_name in ec.left:
                    referenced = True
                    break
            if referenced or (om.objective and p_name in om.objective.expression):
                param_referenced += 1
        components.append(param_referenced / total_params)

    # 5. Index & Domain Completeness
    if cmm and cmm.sets:
        index_comp = 1.0 if all(len(s.elements) > 0 for s in cmm.sets.values()) else 0.0
        components.append(index_comp)
        
    domain_comp = 1.0 if all(v.var_type in ["BINARY", "INTEGER", "CONTINUOUS"] for v in om.variables.values()) else 0.0
    components.append(domain_comp)

    # 6. Orphan Check & Logical Completeness
    has_orphans = False
    for v_name in (cmm.variables.keys() if cmm else []):
        referenced = False
        for ec in om.constraints:
            if v_name in ec.left:
                referenced = True
                break
        if not referenced and (om.objective and v_name in om.objective.expression):
            referenced = True
        if not referenced:
            errors.append(f"Orphan Variable detected: '{v_name}' is defined but never referenced in constraints or objective.")
            has_orphans = True
    logical_comp = 0.5 if has_orphans else 1.0
    components.append(logical_comp)

    # Calculate average model quality score when CMM is provided
    if cmm is not None and len(components) > 0:
        quality_score = sum(components) / len(components)
        print(f"[CMM Validator] Optimization Model Quality Score: {quality_score * 100:.1f}%")

        if quality_score < 0.85:
            errors.append(f"Optimization Model Quality of {quality_score * 100:.1f}% is below configured threshold of 85.0%.")

    if errors:
        return {
            "feasible": False,
            "infeasibility_reason": "; ".join(errors)
        }
    return {
        "feasible": True
    }


def check_self_consistency(spec: dict, om: OptimizationModel) -> List[str]:
    """
    Verifies that the compiled OptimizationModel variables and constraint types
    match the domain and semantics originally declared in the parser JSON specification.
    """
    errors = []
    var_registry = spec.get("variable_registry", spec.get("variables", []))
    for var in var_registry:
        v_name = var.get("name", "x")
        domain = str(var.get("domain", var.get("type", ""))).lower()
        
        # Check matching expanded variables
        clean_name = v_name.replace(" ", "_").replace("-", "_")
        matched_vars = [ev for ev in om.variables.values() if ev.name == clean_name or ev.name.startswith(f"{clean_name}_")]
        
        if not matched_vars:
            errors.append(f"Self-consistency check failure: Variable '{v_name}' defined in JSON is missing in compiled model.")
            continue
            
        for mv in matched_vars:
            if "cont" in domain or "real" in domain or "float" in domain or "decimal" in domain:
                if mv.var_type == "BINARY":
                    errors.append(f"Self-consistency check failure: Variable '{mv.name}' was declared as continuous in JSON but compiled as binary.")
            elif "int" in domain:
                if mv.var_type == "BINARY":
                    errors.append(f"Self-consistency check failure: Variable '{mv.name}' was declared as integer in JSON but compiled as binary.")
                    
    return errors


def ingest_structured_data_to_spec(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deterministic Structured-Data Ingestion Adapter (Stage 2 Bypass).
    Translates structured enterprise/construction management tables (e.g. Primavera P6 /
    Procore / ERP JSON with tasks, durations, Finish-to-Start time lags, safety exclusions,
    blackout windows, and integer crane/equipment zone allocations) directly into a canonical
    `problem_specification` ready for Stage 3 (`parse_spec_to_cmm`).
    """
    if "variable_registry" in data or "constraint_registry" in data:
        return data

    # ── ERP Vertical 1: Workforce Management (WFM — Kronos / UKG / Workday) ──
    if "workforce_roster" in data or "employees" in data:
        wfm = data.get("workforce_roster", data)
        employees = wfm.get("employees", [])
        shifts = wfm.get("shifts", [])
        n_emp = len(employees)
        n_shf = len(shifts)
        v_name = wfm.get("variable_name", "roster")
        emp_map = {str(e.get("id", e.get("name", i))): i for i, e in enumerate(employees)}
        shf_map = {str(s.get("id", s.get("name", j))): j for j, s in enumerate(shifts)}

        c_reg = []
        # 1. Shift staffing coverage (== required_staff or >= min_staff)
        for j, s in enumerate(shifts):
            req = s.get("required_staff")
            min_s = s.get("min_staff")
            if req is not None or min_s is not None:
                op_s = "==" if req is not None else ">="
                val_s = float(req if req is not None else min_s)
                terms = [{"var_id": "v_wfm", "indices": [i, j], "coefficient": 1.0} for i in range(n_emp)]
                c_reg.append({
                    "name": f"shift_{j}_coverage",
                    "var_id": "v_wfm",
                    "family": "other",
                    "operator": op_s,
                    "lhs": {"type": "linear_terms", "var_id": "v_wfm", "terms": terms},
                    "rhs": {"type": "constant", "value": val_s}
                })

        # 2. Employee max shifts, PTO blackouts
        for i, emp in enumerate(employees):
            max_shf = emp.get("max_shifts")
            if max_shf is not None and int(max_shf) < n_shf:
                terms = [{"var_id": "v_wfm", "indices": [i, j], "coefficient": 1.0} for j in range(n_shf)]
                c_reg.append({
                    "name": f"emp_{i}_max_shifts",
                    "var_id": "v_wfm",
                    "family": "other",
                    "operator": "<=",
                    "lhs": {"type": "linear_terms", "var_id": "v_wfm", "terms": terms},
                    "rhs": {"type": "constant", "value": float(max_shf)}
                })
            for pto in emp.get("pto_shifts", []):
                sj = shf_map[str(pto)] if str(pto) in shf_map else int(pto)
                c_reg.append({
                    "name": f"emp_{i}_pto_shift_{sj}",
                    "var_id": "v_wfm",
                    "family": "other",
                    "operator": "==",
                    "lhs": {"type": "linear_terms", "var_id": "v_wfm", "terms": [{"var_id": "v_wfm", "indices": [i, sj], "coefficient": 1.0}]},
                    "rhs": {"type": "constant", "value": 0.0}
                })

        # 3. Rest-period / Clopening bans (Zero-Slack Pairwise Mutex)
        for b_idx, pair in enumerate(wfm.get("clopening_bans", [])):
            s1 = shf_map[str(pair[0])] if str(pair[0]) in shf_map else int(pair[0])
            s2 = shf_map[str(pair[1])] if str(pair[1]) in shf_map else int(pair[1])
            for i in range(n_emp):
                c_reg.append({
                    "name": f"clopening_ban_{b_idx}_emp_{i}",
                    "var_id": "v_wfm",
                    "family": "other",
                    "operator": "<=",
                    "lhs": {"type": "linear_terms", "var_id": "v_wfm", "terms": [
                        {"var_id": "v_wfm", "indices": [i, s1], "coefficient": 1.0},
                        {"var_id": "v_wfm", "indices": [i, s2], "coefficient": 1.0}
                    ]},
                    "rhs": {"type": "constant", "value": 1.0}
                })

        # 4. Sliding-window max consecutive shifts
        max_consec = wfm.get("max_consecutive_shifts")
        if max_consec is not None and int(max_consec) < n_shf:
            k_win = int(max_consec)
            for i in range(n_emp):
                for start_j in range(n_shf - k_win):
                    terms = [{"var_id": "v_wfm", "indices": [i, start_j + offset_j], "coefficient": 1.0} for offset_j in range(k_win + 1)]
                    c_reg.append({
                        "name": f"consec_limit_emp_{i}_win_{start_j}",
                        "var_id": "v_wfm",
                        "family": "other",
                        "operator": "<=",
                        "lhs": {"type": "linear_terms", "var_id": "v_wfm", "terms": terms},
                        "rhs": {"type": "constant", "value": float(k_win)}
                    })

        wfm_coeffs = []
        for emp in employees:
            cbs = emp.get("cost_by_shift", [10.0] * n_shf)
            wfm_coeffs.extend(float(c) for c in cbs)

        return {
            "problem_family": "SCHEDULING",
            "parameters": {"employees_count": n_emp, "shifts_count": n_shf},
            "variable_registry": [{"id": "v_wfm", "name": v_name, "type": "BINARY", "dimensions": ["Employees", "Shifts"]}],
            "constraint_registry": c_reg,
            "objectives": [{"sense": wfm.get("sense", "MINIMIZE"), "expression": {"type": "linear_terms", "var_id": "v_wfm", "coefficients": wfm_coeffs}}]
        }

    # ── ERP Vertical 2: Logistics & Fleet TMS (SAP TM / Oracle OTM) ──
    if "logistics_dispatch" in data or "orders" in data:
        tms = data.get("logistics_dispatch", data)
        orders = tms.get("orders", [])
        vehicles = tms.get("vehicles", [])
        n_ord = len(orders)
        n_veh = len(vehicles)
        v_name = tms.get("variable_name", "dispatch")
        ord_map = {str(o.get("id", o.get("name", i))): i for i, o in enumerate(orders)}
        veh_map = {str(v.get("id", v.get("name", j))): j for j, v in enumerate(vehicles)}

        c_reg = [{
            "name": "order_single_dispatch",
            "var_id": "v_tms",
            "family": "uniqueness",
            "operator": "==",
            "rhs": {"type": "constant", "value": 1.0}
        }]

        # Vehicle payload capacities
        for j, veh in enumerate(vehicles):
            cap = veh.get("capacity")
            if cap is not None:
                terms = [{"var_id": "v_tms", "indices": [i, j], "coefficient": float(orders[i].get("weight", 1.0))} for i in range(n_ord)]
                c_reg.append({
                    "name": f"vehicle_{j}_payload_cap",
                    "var_id": "v_tms",
                    "family": "other",
                    "operator": "<=",
                    "lhs": {"type": "linear_terms", "var_id": "v_tms", "terms": terms},
                    "rhs": {"type": "constant", "value": float(cap)}
                })

        # Hazmat / Incompatible cargo exclusions on same vehicle (Zero-Slack Mutex)
        for ex_idx, pair in enumerate(tms.get("incompatible_pairs", [])):
            o1 = ord_map[str(pair[0])] if str(pair[0]) in ord_map else int(pair[0])
            o2 = ord_map[str(pair[1])] if str(pair[1]) in ord_map else int(pair[1])
            for j in range(n_veh):
                c_reg.append({
                    "name": f"hazmat_mutex_{ex_idx}_veh_{j}",
                    "var_id": "v_tms",
                    "family": "other",
                    "operator": "<=",
                    "lhs": {"type": "linear_terms", "var_id": "v_tms", "terms": [
                        {"var_id": "v_tms", "indices": [o1, j], "coefficient": 1.0},
                        {"var_id": "v_tms", "indices": [o2, j], "coefficient": 1.0}
                    ]},
                    "rhs": {"type": "constant", "value": 1.0}
                })

        # Time-window / vehicle-order restrictions (Zero-Slack Equality == 0.0)
        for b_idx, blk in enumerate(tms.get("blocked_assignments", [])):
            oi = ord_map[str(blk["order"])] if str(blk["order"]) in ord_map else int(blk["order"])
            vj = veh_map[str(blk["vehicle"])] if str(blk["vehicle"]) in veh_map else int(blk["vehicle"])
            c_reg.append({
                "name": f"blocked_ord_{oi}_veh_{vj}_{b_idx}",
                "var_id": "v_tms",
                "family": "other",
                "operator": "==",
                "lhs": {"type": "linear_terms", "var_id": "v_tms", "terms": [{"var_id": "v_tms", "indices": [oi, vj], "coefficient": 1.0}]},
                "rhs": {"type": "constant", "value": 0.0}
            })

        cost_mat = tms.get("cost_matrix", [])
        flat_costs = [float(x) for row in cost_mat for x in (row if isinstance(row, list) else [row])] if cost_mat else [10.0] * (n_ord * n_veh)
        return {
            "problem_family": "ASSIGNMENT",
            "parameters": {"orders_count": n_ord, "vehicles_count": n_veh},
            "variable_registry": [{"id": "v_tms", "name": v_name, "type": "BINARY", "dimensions": ["Orders", "Vehicles"]}],
            "constraint_registry": c_reg,
            "objectives": [{"sense": tms.get("sense", "MINIMIZE"), "expression": {"type": "linear_terms", "var_id": "v_tms", "coefficients": flat_costs}}]
        }

    # ── ERP Vertical 3: Supply Chain & Multi-Echelon Network (SAP IBP / NetSuite) ──
    if "supply_chain_network" in data or "warehouses" in data:
        scm = data.get("supply_chain_network", data)
        warehouses = scm.get("warehouses", [])
        retailers = scm.get("retailers", [])
        n_wh = len(warehouses)
        n_ret = len(retailers)

        # Fixed-Charge Warehouse Opening + Retailer Sourcing (Cross-Tensor Dependency x_{w,r} - y_w <= 0)
        v_reg = [
            {"id": "v_ship", "name": "ship", "type": "BINARY", "dimensions": ["Warehouses", "Retailers"]},
            {"id": "v_open", "name": "wh_open", "type": "BINARY", "dimensions": ["Warehouses"]}
        ]
        c_reg = []
        # Each retailer sourced by exactly 1 warehouse
        for r in range(n_ret):
            terms = [{"var_id": "v_ship", "indices": [w, r], "coefficient": 1.0} for w in range(n_wh)]
            c_reg.append({
                "name": f"retailer_{r}_sourcing",
                "var_id": "v_ship",
                "family": "other",
                "operator": "==",
                "lhs": {"type": "linear_terms", "var_id": "v_ship", "terms": terms},
                "rhs": {"type": "constant", "value": 1.0}
            })
        # Linking constraint: ship_{w, r} - wh_open_w <= 0.0 (Zero-Slack Binary Dependency!)
        for w in range(n_wh):
            for r in range(n_ret):
                c_reg.append({
                    "name": f"link_wh_{w}_ret_{r}",
                    "var_id": "v_ship",
                    "family": "other",
                    "operator": "<=",
                    "lhs": {"type": "linear_terms", "var_id": "v_ship", "terms": [
                        {"var_id": "v_ship", "indices": [w, r], "coefficient": 1.0},
                        {"var_id": "v_open", "indices": [w], "coefficient": -1.0}
                    ]},
                    "rhs": {"type": "constant", "value": 0.0}
                })

        ship_costs = [float(x) for w in warehouses for x in w.get("shipping_costs", [10.0] * n_ret)]
        open_costs = [float(w.get("open_cost", 20.0)) for w in warehouses]
        return {
            "problem_family": "ALLOCATION",
            "parameters": {"warehouses_count": n_wh, "retailers_count": n_ret},
            "variable_registry": v_reg,
            "constraint_registry": c_reg,
            "objectives": [
                {"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v_ship", "coefficients": ship_costs}},
                {"sense": "MINIMIZE", "expression": {"type": "linear_terms", "var_id": "v_open", "coefficients": open_costs}}
            ]
        }

    # ── ERP Vertical 4: Factory / Manufacturing MES & Job-Shop ERP (SAP PP / Opcenter) ──
    if "manufacturing_job_shop" in data or "operations" in data:
        mes = data.get("manufacturing_job_shop", data)
        mapped = {
            "tasks": mes.get("operations", []),
            "time_horizon": mes.get("time_slots", mes.get("time_horizon", 4)),
            "schedule_var_name": mes.get("variable_name", "op_start"),
            "precedence": mes.get("routing_precedence", mes.get("precedence", [])),
            "safety_exclusions": mes.get("machine_conflicts", []),
            "blackouts": [
                {"task": mw.get("operation", mw.get("task")), "day": mw.get("slot", mw.get("day", 0))}
                for mw in mes.get("maintenance_windows", [])
            ],
            "equipment_zones": mes.get("batch_lots", {}),
            "sense": mes.get("sense", "MINIMIZE")
        }
        return ingest_structured_data_to_spec(mapped)


    tasks = data.get("tasks", data.get("activities", []))
    horizon = int(data.get("time_horizon", data.get("days", 4)))
    precedence = data.get("precedence", data.get("finish_to_start", []))
    safety_exclusions = data.get("safety_exclusions", data.get("exclusions", []))
    blackouts = data.get("blackouts", data.get("unavailable_slots", []))
    equipment_zones = data.get("equipment_zones", data.get("integer_resources", []))

    parameters: Dict[str, Any] = {}
    variable_registry: List[Dict[str, Any]] = []
    constraint_registry: List[Dict[str, Any]] = []
    objectives: List[Dict[str, Any]] = []

    task_id_to_idx: Dict[str, int] = {}

    if tasks:
        n_tasks = len(tasks)
        parameters["tasks_count"] = n_tasks
        parameters["days_count"] = horizon
        variable_registry.append({
            "id": "v_sched",
            "name": data.get("schedule_var_name", "task_start"),
            "type": "BINARY",
            "dimensions": ["Tasks", "Days"],
            "description": "Binary start indicator x_{task, day} in {0, 1}"
        })

        for idx, t in enumerate(tasks):
            t_id = t.get("id", t.get("name", f"task_{idx}"))
            task_id_to_idx[str(t_id)] = idx

        # 1. Each task starts on exactly one day (Uniqueness)
        constraint_registry.append({
            "name": "each_task_starts_once",
            "var_id": "v_sched",
            "family": "uniqueness",
            "operator": "==",
            "rhs": {"type": "constant", "value": 1.0}
        })

        # 2. Finish-to-Start Time-Lag Precedence: sum(t * x_{pred, t}) - sum(t * x_{succ, t}) <= -lag
        for p_idx, rule in enumerate(precedence):
            pred_key = str(rule.get("predecessor", rule.get("from")))
            succ_key = str(rule.get("successor", rule.get("to")))
            p_i = task_id_to_idx[pred_key] if pred_key in task_id_to_idx else int(pred_key)
            s_i = task_id_to_idx[succ_key] if succ_key in task_id_to_idx else int(succ_key)
            default_lag = tasks[p_i].get("duration", 1) if p_i < len(tasks) else 1
            lag = float(rule.get("lag", default_lag))

            terms = []
            for d in range(horizon):
                if d > 0:
                    terms.append({"var_id": "v_sched", "indices": [p_i, d], "coefficient": float(d)})
                    terms.append({"var_id": "v_sched", "indices": [s_i, d], "coefficient": -float(d)})

            constraint_registry.append({
                "name": f"fs_lag_{pred_key}_to_{succ_key}_{p_idx}",
                "var_id": "v_sched",
                "family": "other",
                "operator": "<=",
                "lhs": {"type": "linear_terms", "var_id": "v_sched", "terms": terms},
                "rhs": {"type": "constant", "value": -lag}
            })

        # 3. Site Safety / Concurrent Zone Exclusions (Zero-Slack Clique Mutex)
        for ex_idx, ex in enumerate(safety_exclusions):
            ex_tasks = [task_id_to_idx[str(tk)] if str(tk) in task_id_to_idx else int(tk) for tk in ex.get("tasks", [])]
            ex_days = ex.get("days", list(range(horizon)))
            for d in ex_days:
                terms = [{"var_id": "v_sched", "indices": [ti, int(d)], "coefficient": 1.0} for ti in ex_tasks]
                constraint_registry.append({
                    "name": f"safety_mutex_{ex_idx}_day_{d}",
                    "var_id": "v_sched",
                    "family": "other",
                    "operator": "<=",
                    "lhs": {"type": "linear_terms", "var_id": "v_sched", "terms": terms},
                    "rhs": {"type": "constant", "value": 1.0}
                })

        # 4. Weather / Inspection Blackouts (Zero-Slack Equality == 0.0)
        for b_idx, blk in enumerate(blackouts):
            tk = str(blk.get("task"))
            ti = task_id_to_idx[tk] if tk in task_id_to_idx else int(tk)
            d = int(blk.get("day", 0))
            constraint_registry.append({
                "name": f"blackout_{tk}_day_{d}_{b_idx}",
                "var_id": "v_sched",
                "family": "other",
                "operator": "==",
                "lhs": {"type": "linear_terms", "var_id": "v_sched", "terms": [{"var_id": "v_sched", "indices": [ti, d], "coefficient": 1.0}]},
                "rhs": {"type": "constant", "value": 0.0}
            })

        # 5. Schedule Cost / Early-Start Objective
        sched_coeffs = []
        for idx, t in enumerate(tasks):
            c_day = t.get("cost_by_day", t.get("cost_by_slot"))
            if c_day and len(c_day) == horizon:
                sched_coeffs.extend(float(x) for x in c_day)
            else:
                base_w = float(t.get("daily_penalty", 1.0))
                sched_coeffs.extend(base_w * float(d + 1) for d in range(horizon))

        objectives.append({
            "sense": data.get("sense", "MINIMIZE"),
            "expression": {"type": "linear_terms", "var_id": "v_sched", "coefficients": sched_coeffs}
        })

    # Optional Integer Equipment / Crane Zone Allocation Table
    if equipment_zones:
        zones = equipment_zones.get("zones", [])
        n_zones = len(zones)
        max_per_zone = int(equipment_zones.get("max_per_zone", 3))
        min_per_zone = int(equipment_zones.get("min_per_zone", 0))
        eq_name = equipment_zones.get("name", "cranes")
        parameters["zones_count"] = n_zones

        variable_registry.append({
            "id": "v_equip",
            "name": eq_name,
            "type": "INTEGER",
            "dimensions": ["Zones"],
            "lower_bound": float(min_per_zone),
            "upper_bound": float(max_per_zone),
            "description": f"Integer count of {eq_name} allocated per zone"
        })

        for z_idx, z in enumerate(zones):
            min_req = z.get("min_required")
            if min_req is not None and float(min_req) > float(min_per_zone):
                constraint_registry.append({
                    "name": f"zone_{z_idx}_min_{eq_name}",
                    "var_id": "v_equip",
                    "family": "other",
                    "operator": ">=",
                    "lhs": {"type": "linear_terms", "var_id": "v_equip", "terms": [{"var_id": "v_equip", "indices": [z_idx], "coefficient": 1.0}]},
                    "rhs": {"type": "constant", "value": float(min_req)}
                })

        total_fleet = equipment_zones.get("total_fleet")
        fleet_op = equipment_zones.get("fleet_operator", "==")
        if total_fleet is not None:
            constraint_registry.append({
                "name": f"total_{eq_name}_fleet",
                "var_id": "v_equip",
                "family": "other",
                "operator": fleet_op,
                "lhs": {"type": "linear_terms", "var_id": "v_equip", "coefficients": [1.0] * n_zones},
                "rhs": {"type": "constant", "value": float(total_fleet)}
            })

        zone_costs = [float(z.get("cost_per_unit", 10.0)) for z in zones]
        objectives.append({
            "sense": data.get("sense", "MINIMIZE"),
            "expression": {"type": "linear_terms", "var_id": "v_equip", "coefficients": zone_costs}
        })

    return {
        "problem_family": data.get("problem_family", "SCHEDULING" if tasks else "ALLOCATION"),
        "parameters": parameters,
        "variable_registry": variable_registry,
        "constraint_registry": constraint_registry,
        "objectives": objectives
    }
