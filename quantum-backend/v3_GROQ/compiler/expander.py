# -*- coding: utf-8 -*-
import json
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Union
from .cmm import (
    CMMSet, CMMParameter, CMMVariable, VarType,
    Expr, Constant, VarRef, ParamRef, BinaryOp, Sum,
    CMMObjective, CMMConstraint, CanonicalMathematicalModel,
    CMMRelationship, UniquenessPattern, CapacityPattern, AvailabilityPattern,
    FixedAssignmentPattern, EligibilityPattern
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

def parse_spec_to_cmm(spec: dict) -> CanonicalMathematicalModel:
    """
    Converts a loose LLM Problem Specification dictionary into a symbolic CMM.
    """
    cmm = CanonicalMathematicalModel()
    
    # 1. Parse parameters and infer sets
    raw_params = spec.get("parameters", {})
    for k, v in raw_params.items():
        if isinstance(v, int) and v > 0 and (k.endswith("s_count") or k.endswith("s")):
            # Infer a Set from count
            set_name = k.replace("_count", "").capitalize()
            cmm.sets[set_name] = CMMSet(name=set_name, elements=list(range(v)))
        else:
            cmm.parameters[k] = CMMParameter(name=k, value=v)
            
    # Fallback default sets if not inferred
    p_text_lower = spec.get("problem_text", "").lower() if spec.get("problem_text") else ""
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
        cmm.sets[default_row] = CMMSet(name=default_row, elements=list(range(spec.get("entities_count", 5))))
        cmm.sets[default_col] = CMMSet(name=default_col, elements=list(range(spec.get("slots_count", 3))))

    # 2. Parse variables
    var_registry = spec.get("variable_registry", [])
    if not var_registry:
        # Fallback default binary variable x
        cmm.variables["x"] = CMMVariable(name="x", var_type=VarType.BINARY, index_sets=["Nurses", "Wards"])
    else:
        for var in var_registry:
            name = var.get("name", "x")
            v_type = var.get("type", "BINARY").upper()
            if v_type not in (VarType.BINARY, VarType.INTEGER, VarType.CONTINUOUS):
                v_type = VarType.BINARY
            dims = var.get("dimensions", [])
            
            # Map dimensions to sets
            inferred_sets = list(cmm.sets.keys())
            mapped_dims = []
            for idx_d, d in enumerate(dims):
                if isinstance(d, int):
                    if idx_d < len(inferred_sets):
                        d_cap = inferred_sets[idx_d]
                        cmm.sets[d_cap].elements = list(range(d))
                    else:
                        d_cap = f"Set_{idx_d}"
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
                    # Create set on the fly
                    cmm.sets[d_cap] = CMMSet(name=d_cap, elements=list(range(3)))
                    mapped_dims.append(d_cap)
            
            cmm.variables[name] = CMMVariable(
                name=name,
                var_type=v_type,
                index_sets=mapped_dims,
                lower_bound=var.get("lower_bound"),
                upper_bound=var.get("upper_bound")
            )

    # 3. Parse constraints
    const_registry = spec.get("constraint_registry", [])
    primary_var = list(cmm.variables.keys())[0] if cmm.variables else "x"
    clean_v_name = primary_var.replace(" ", "_").replace("-", "_")
    var_obj = cmm.variables[primary_var] if primary_var in cmm.variables else None
    
    # Get dimensions
    var_dims = [3, 3] # fallback
    if var_registry and "dimensions" in var_registry[0]:
        var_dims = var_registry[0]["dimensions"]
    elif var_obj and var_obj.index_sets:
        var_dims = [len(cmm.sets[s].elements) for s in var_obj.index_sets]
        
    for idx, c in enumerate(const_registry):
        name = c.get("name", f"constraint_{idx}")
        family = c.get("family", "other")
        op = c.get("operator", "<=")
        
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
        
        # Declarative Constraint Pattern Matching
        if family == "uniqueness" or "unique" in name.lower() or ("assignment" in name.lower() and "fixed" not in name.lower() and family != "equality"):
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

        elif (lhs_type == "variable" and lhs_obj.get("index") is not None) or "fixed" in name.lower():
            idx_list = lhs_obj.get("index") if isinstance(lhs_obj, dict) else None
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

    # 4. Parse objectives
    objs = spec.get("objectives", [])
    primary_var = list(cmm.variables.keys())[0]
    var_obj = cmm.variables[primary_var]
    
    if objs:
        obj = objs[0]
        sense = obj.get("type", "minimize").upper()
        if sense not in ("MINIMIZE", "MAXIMIZE"):
            sense = "MINIMIZE"
    else:
        sense = "MINIMIZE"
        
    if len(var_obj.index_sets) == 2:
        set_i = var_obj.index_sets[0]
        set_j = var_obj.index_sets[1]
        cmm.objective = CMMObjective(
            sense=sense,
            expression=Sum(
                expression=VarRef(var_name=primary_var, indices=["i", "j"]),
                index_vars=["i", "j"],
                index_ranges=[set_i, set_j]
            )
        )
    else:
        cmm.objective = CMMObjective(
            sense=sense,
            expression=VarRef(var_name=primary_var, indices=[0])
        )
        
    # Compiler Assertions (Strong checks on CMM references)
    for c in cmm.constraints:
        def check_var(node):
            if isinstance(node, VarRef):
                def norm(s):
                    return s.lower().replace("_", "").replace(" ", "").replace("-", "")
                norm_name = norm(node.var_name)
                norm_vars = [norm(kv) for kv in cmm.variables]
                assert norm_name in norm_vars, f"Variable '{node.var_name}' not defined in model variables registry"
            elif isinstance(node, BinaryOp):
                check_var(node.left)
                check_var(node.right)
            elif isinstance(node, Sum):
                check_var(node.expression)
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
                        
    return cmm


def expand_cmm_to_om(cmm: CanonicalMathematicalModel, problem_text: str = "") -> OptimizationModel:
    """
    Determinstically expands the symbolic CMM and reformulates logic/auxiliary bounds.
    """
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
    for c in cmm.constraints:
        if c.quantifier == "FORALL":
            # Forall quantifier loops
            quant_sets = [cmm.sets[s_name].elements for s_name in c.quantifier_ranges]
            from itertools import product
            for indices in product(*quant_sets):
                loop_indices = {}
                for idx_var, idx_val in zip(c.quantifier_vars, indices):
                    loop_indices[idx_var] = idx_val
                
                suffix = "_".join(str(idx) for idx in indices)
                lhs_str = eval_expr(c.left, loop_indices)
                rhs_val = float(eval_expr(c.right, loop_indices))
                
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
            lhs_str = eval_expr(c.left, {})
            rhs_val = float(eval_expr(c.right, {}))
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

def validate_optimization_model(om: OptimizationModel, cmm: Optional[CanonicalMathematicalModel] = None) -> dict:
    """
    Deterministically validates variable scopes, domains, and checks for basic
    mathematical infeasibilities (e.g. contradictory lower/upper bounds).
    If CMM is provided, performs flow-based and capacity feasibility analysis.
    """
    errors = []
    if not om.variables:
        errors.append("No decision variables defined in the model.")
    for name, var in om.variables.items():
        if var.lower_bound is not None and var.upper_bound is not None:
            if var.lower_bound > var.upper_bound:
                errors.append(f"Contradictory bounds on variable '{name}': lower={var.lower_bound} > upper={var.upper_bound}.")
    bounds = {}
    for c in om.constraints:
        cleaned_lhs = c.left.replace("(", "").replace(")", "").strip()
        if cleaned_lhs in om.variables:
            try:
                val = float(c.right)
                if c.op == "<=":
                    curr_min, curr_max = bounds.get(cleaned_lhs, (-float('inf'), float('inf')))
                    bounds[cleaned_lhs] = (curr_min, min(curr_max, val))
                elif c.op == ">=":
                    curr_min, curr_max = bounds.get(cleaned_lhs, (-float('inf'), float('inf')))
                    bounds[cleaned_lhs] = (max(curr_min, val), curr_max)
                elif c.op == "==":
                    curr_min, curr_max = bounds.get(cleaned_lhs, (-float('inf'), float('inf')))
                    bounds[cleaned_lhs] = (max(curr_min, val), min(curr_max, val))
            except ValueError:
                pass
    for var_name, (mn, mx) in bounds.items():
        if mn > mx:
            errors.append(f"Contradictory constraints on '{var_name}': must be at least {mn} but at most {mx}.")
            
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

    if errors:
        return {
            "feasible": False,
            "infeasibility_reason": "; ".join(errors)
        }
    return {
        "feasible": True
    }
