import json
from typing import Dict, List, Any, Optional
from .ir import OptimizationIR, Expr, Constant, VarRef, BinaryOp, Aggregate, Aggregate2D, Constraint, Variable

class FormulaRenderer:
    @staticmethod
    def get_subscript(var_id: str, idx: int, ir: OptimizationIR) -> str:
        var = next((v for v in ir.variables if v.id == var_id), None)
        if var and var.labels and idx < len(var.labels):
            label = str(var.labels[idx]).replace("_", "\\_").replace("#", "\\#").replace("%", "\\%")
            return f"\\text{{{label}}}"
        return str(idx + 1)

    @staticmethod
    def render_expr(expr: Expr, ir: OptimizationIR) -> str:
        if isinstance(expr, Constant):
            val = expr.value
            if isinstance(val, list):
                return "[" + ", ".join(str(int(v)) if isinstance(v, (int, float)) and hasattr(v, 'is_integer') and v.is_integer() else str(v) for v in val) + "]"
            if isinstance(val, (int, float)):
                if hasattr(val, 'is_integer') and val.is_integer():
                    return str(int(val))
                return f"{val:.2f}" if isinstance(val, float) else str(val)
            return str(val)

        elif isinstance(expr, VarRef):
            sub = expr.index
            if sub is not None:
                try:
                    idx = int(sub)
                    sub_str = FormulaRenderer.get_subscript(expr.var_id, idx, ir)
                except ValueError:
                    sub_str = str(sub).replace("_", "\\_")
                return f"{expr.var_id}_{{{sub_str}}}"
            return expr.var_id

        elif isinstance(expr, BinaryOp):
            left_str = FormulaRenderer.render_expr(expr.left, ir)
            right_str = FormulaRenderer.render_expr(expr.right, ir)
            op_map = {"*": " \\cdot ", "/": " / ", "+": " + ", "-": " - "}
            op_str = op_map.get(expr.op, expr.op)
            return f"{left_str} {op_str} {right_str}"

        elif isinstance(expr, Aggregate):
            func_map = {"sum": "\\sum", "min": "\\min", "max": "\\max"}
            f = func_map.get(expr.func.lower(), expr.func)
            idx_var = expr.index_var
            rng = expr.index_range
            var = expr.var_id

            non_zero_terms = []
            if expr.coefficients:
                for i, coeff in enumerate(expr.coefficients):
                    if coeff != 0:
                        sub = FormulaRenderer.get_subscript(var, i, ir)
                        term_var = f"{var}_{{{sub}}}"
                        if coeff == 1:
                            non_zero_terms.append(term_var)
                        elif coeff == -1:
                            non_zero_terms.append(f"-{term_var}")
                        else:
                            coeff_str = str(int(coeff)) if float(coeff).is_integer() else f"{coeff:.2f}"
                            non_zero_terms.append(f"{coeff_str} {term_var}")
            else:
                for i in range(rng):
                    sub = FormulaRenderer.get_subscript(var, i, ir)
                    non_zero_terms.append(f"{var}_{{{sub}}}")

            if expr.func.lower() == "sum" and len(non_zero_terms) > 0 and (len(non_zero_terms) <= 6 or rng <= 8):
                res = " + ".join(non_zero_terms)
                res = res.replace(" + -", " - ")
                return res

            if expr.coefficients:
                if all(c == 1 for c in expr.coefficients):
                    return f"{f}_{{{idx_var}=1}}^{{{rng}}} {var}_{{{idx_var}}}"
                return f"{f}_{{{idx_var}=1}}^{{{rng}}} c_{{{idx_var}}} \\cdot {var}_{{{idx_var}}}"
            
            return f"{f}_{{{idx_var}=1}}^{{{rng}}} {var}_{{{idx_var}}}"

        elif isinstance(expr, Aggregate2D):
            func_map = {"sum": "\\sum", "min": "\\min", "max": "\\max"}
            f = func_map.get(expr.func.lower(), expr.func)
            r_var = expr.row_var
            c_var = expr.col_var
            r_rng = expr.row_range
            c_rng = expr.col_range
            var = expr.var_id

            if expr.coefficients_2d:
                return f"{f}_{{{r_var}=1}}^{{{r_rng}}} {f}_{{{c_var}=1}}^{{{c_rng}}} c_{{{r_var},{c_var}}} \\cdot {var}_{{{r_var},{c_var}}}"
            return f"{f}_{{{r_var}=1}}^{{{r_rng}}} {f}_{{{c_var}=1}}^{{{c_rng}}} {var}_{{{r_var},{c_var}}}"

        return str(expr)

    @staticmethod
    def render_variable_definitions(ir: OptimizationIR) -> List[Dict[str, Any]]:
        defs = []
        for v in ir.variables:
            domain_latex = ""
            if v.domain == "boolean":
                domain_latex = "\\{0, 1\\}"
            elif v.domain == "integer":
                domain_latex = "\\mathbb{Z}_{\\ge 0}"
            else:
                domain_latex = "\\mathbb{R}_{\\ge 0}"
            
            dim_suffix = f"^{{{' \\times '.join(str(d) for d in v.dimensions)}}}" if v.dimensions else ""
            latex_def = f"{v.id}_i \\in {domain_latex}{dim_suffix}"
            
            if v.labels:
                labels_str = ", ".join(str(l) for l in v.labels[:12])
                if len(v.labels) > 12:
                    labels_str += ", \\dots"
                index_set = "i \\in \\{" + labels_str + "\\}"
            else:
                index_set = "i \\in \\{1, \\dots, " + str(v.dimensions[0]) + "\\}" if v.dimensions else ""

            if v.domain == "boolean":
                mapping_text = f"1 if {v.name.lower()} index $i$ is selected/active, 0 otherwise"
            else:
                mapping_text = f"Value representing {v.name.lower()} index $i$"

            defs.append({
                "id": v.id,
                "name": v.name,
                "latex_def": latex_def,
                "index_set": index_set,
                "mapping_text": mapping_text
            })
        return defs

    @staticmethod
    def render_parameters(ir: OptimizationIR) -> List[Dict[str, Any]]:
        params = []
        for v in ir.variables:
            if v.data_values:
                for key, val in v.data_values.items():
                    if isinstance(val, list):
                        formatted_val = "[" + ", ".join(str(x) for x in val[:8])
                        if len(val) > 8:
                            formatted_val += ", ..."
                        formatted_val += "]"
                    else:
                        formatted_val = str(val)
                    
                    params.append({
                        "name": f"{key.capitalize()} ({key[0]}_i)",
                        "value": formatted_val
                    })
        return params

    @staticmethod
    def get_constraint_counts(ir: OptimizationIR) -> Dict[str, int]:
        counts = {}
        for c in ir.constraints:
            family = c.type.value if hasattr(c.type, 'value') else str(c.type)
            family = family.capitalize().replace("_", " ")
            
            if c.type.value == "cardinality" and c.operator == "<=" and isinstance(c.rhs, Constant) and c.rhs.value == 1:
                family = "Mutual Exclusion"
                
            counts[family] = counts.get(family, 0) + 1
        return counts

    @staticmethod
    def render_solver_recommendation(ir: OptimizationIR, final_strategy: str) -> Dict[str, Any]:
        features = []
        
        has_boolean = any(v.domain.value == "boolean" if hasattr(v.domain, 'value') else v.domain == "boolean" for v in ir.variables)
        has_integer = any(v.domain.value == "integer" if hasattr(v.domain, 'value') else v.domain == "integer" for v in ir.variables)
        has_continuous = any(v.domain.value == "continuous" if hasattr(v.domain, 'value') else v.domain == "continuous" for v in ir.variables)
        
        var_types = []
        if has_boolean: var_types.append("Boolean")
        if has_integer: var_types.append("Integer")
        if has_continuous: var_types.append("Continuous")
        features.append({
            "name": f"{'/'.join(var_types)} variables",
            "checked": True
        })

        features.append({
            "name": "Linear objective",
            "checked": True
        })

        features.append({
            "name": "Linear constraints",
            "checked": True
        })

        features.append({
            "name": "No quadratic terms",
            "checked": True
        })

        return {
            "features": features,
            "recommended_solver": final_strategy or "CP-SAT"
        }

    @staticmethod
    def to_math_rigor_dict(ir: OptimizationIR, final_strategy: str) -> Dict[str, Any]:
        obj_latex = ""
        obj_expanded = ""
        obj_is_large = False
        
        if ir.objectives:
            obj = ir.objectives[0]
            sense = "\\text{Maximize}" if obj.sense == "maximize" else "\\text{Minimize}"
            
            expr = obj.expression
            if isinstance(expr, Aggregate):
                f_latex = FormulaRenderer.render_expr(expr, ir)
                obj_latex = f"$$ {sense} \\quad {f_latex} $$"
                
                if expr.index_range > 8 and expr.coefficients:
                    obj_is_large = True
                    expanded_terms = []
                    for i, coeff in enumerate(expr.coefficients):
                        sub = FormulaRenderer.get_subscript(expr.var_id, i, ir)
                        term_var = f"{expr.var_id}_{{{sub}}}"
                        coeff_str = str(int(coeff)) if float(coeff).is_integer() else f"{coeff:.2f}"
                        if i < 4:
                            expanded_terms.append(f"{coeff_str}{term_var}")
                        elif i == 4:
                            expanded_terms.append("\\dots")
                        elif i >= len(expr.coefficients) - 2:
                            expanded_terms.append(f"{coeff_str}{term_var}")
                    obj_expanded = f"$$ {sense} \\quad " + " + ".join(expanded_terms).replace(" + \\dots + ", " + \dots + ") + " $$"
            else:
                obj_latex = f"$$ {sense} \\quad {FormulaRenderer.render_expr(expr, ir)} $$"
                
        constraints_list = []
        for c in ir.constraints:
            latex = c.to_latex(ir)
            constraints_list.append({
                "id": c.id,
                "name": c.name,
                "family": c.type.value if hasattr(c.type, 'value') else str(c.type),
                "latex": f"$$ {latex} \\quad \\text{{({c.name})}} $$",
                "description": c.description
            })
            
        return {
            "objective_latex": obj_latex,
            "objective_expanded": obj_expanded,
            "objective_is_large": obj_is_large,
            "variables": FormulaRenderer.render_variable_definitions(ir),
            "parameters": FormulaRenderer.render_parameters(ir),
            "constraints": constraints_list,
            "constraint_counts": FormulaRenderer.get_constraint_counts(ir),
            "solver_recommendation": FormulaRenderer.render_solver_recommendation(ir, final_strategy)
        }
