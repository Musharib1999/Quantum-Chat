"""
IR — Structured Optimization Intermediate Representation
DCC V6.7 Compiler Module

Expression-tree-driven IR replacing the flat dict schema.
V6.7: Improved coefficient preservation in constraint normalization.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Union


# ── Expression Tree ─────────────────────────────────────────────────────
class Expr:
    """Base class for all IR expressions."""
    def to_latex(self) -> str:
        raise NotImplementedError()


@dataclass
class Constant(Expr):
    value: Any

    def __repr__(self):
        return str(self.value)

    def to_latex(self) -> str:
        if isinstance(self.value, list):
            return "[" + ", ".join(str(int(v)) if isinstance(v, (int, float)) and hasattr(v, 'is_integer') and v.is_integer() else str(v) for v in self.value) + "]"
        val = self.value
        if isinstance(val, (int, float)) and hasattr(val, 'is_integer') and val.is_integer():
            return str(int(val))
        return f"{val:.2f}" if isinstance(val, float) else str(val)


@dataclass
class VarRef(Expr):
    """Reference to a decision variable, optionally indexed."""
    var_id: str
    index: Optional[str] = None

    def __repr__(self):
        if self.index is not None:
            return f"{self.var_id}[{self.index}]"
        return self.var_id

    def to_latex(self) -> str:
        if self.index is not None:
            return f"{self.var_id}_{{{self.index}}}"
        return self.var_id


@dataclass
class BinaryOp(Expr):
    """Binary arithmetic operation: left op right."""
    left: Expr
    op: str  # +, -, *, /
    right: Expr

    def __repr__(self):
        return f"({self.left} {self.op} {self.right})"

    def to_latex(self) -> str:
        op_map = {"*": " \\cdot ", "/": " / ", "+": " + ", "-": " - "}
        lhs_l = self.left.to_latex()
        rhs_l = self.right.to_latex()
        op_l = op_map.get(self.op, self.op)
        return f"({lhs_l} {op_l} {rhs_l})" 


@dataclass
class Aggregate(Expr):
    """Aggregation over an indexed set: sum, min, max."""
    func: str
    var_id: str
    index_var: str
    index_range: int
    coefficients: Optional[list] = None

    def __repr__(self):
        c = " * coeff" if self.coefficients else ""
        return f"{self.func}({self.var_id}[{self.index_var}]{c}, {self.index_var}=0..{self.index_range - 1})"

    def to_latex(self) -> str:
        func_map = {"sum": "\\sum", "min": "\\min", "max": "\\max"}
        f = func_map.get(self.func.lower(), self.func)
        idx = self.index_var
        rng = self.index_range
        var = self.var_id
        
        if self.coefficients:
            return f"{f}_{{{idx}=0}}^{{{rng - 1}}} c_{{{idx}}} \\cdot {var}_{{{idx}}}"
        return f"{f}_{{{idx}=0}}^{{{rng - 1}}} {var}_{{{idx}}}" 


@dataclass
class Aggregate2D(Expr):
    """Aggregation over a 2D indexed set."""
    func: str
    var_id: str
    row_var: str
    col_var: str
    row_range: int
    col_range: int
    coefficients_2d: Optional[list] = None

    def __repr__(self):
        return f"{self.func}({self.var_id}[{self.row_var},{self.col_var}], {self.row_var}=0..{self.row_range - 1}, {self.col_var}=0..{self.col_range - 1})"

    def to_latex(self) -> str:
        func_map = {"sum": "\\sum", "min": "\\min", "max": "\\max"}
        f = func_map.get(self.func.lower(), self.func)
        r_var = self.row_var
        c_var = self.col_var
        r_rng = self.row_range
        c_rng = self.col_range
        var = self.var_id
        
        if self.coefficients_2d:
            return f"{f}_{{{r_var}=0}}^{{{r_rng - 1}}} {f}_{{{c_var}=0}}^{{{c_rng - 1}}} c_{{{r_var},{c_var}}} \\cdot {var}_{{{r_var},{c_var}}}"
        return f"{f}_{{{r_var}=0}}^{{{r_rng - 1}}} {f}_{{{c_var}=0}}^{{{c_rng - 1}}} {var}_{{{r_var},{c_var}}}" 


# ── Constraint Types ────────────────────────────────────────────────────
class ConstraintType(str, Enum):
    LOWER_BOUND = "lower_bound"
    UPPER_BOUND = "upper_bound"
    RANGE = "range"
    EQUALITY = "equality"
    BUDGET = "budget"
    CAPACITY = "capacity"
    LINKING = "linking"
    DEPENDENCY = "dependency"
    COVERAGE = "coverage"
    CONFLICT = "conflict"
    BALANCE = "balance"
    ORDERING = "ordering"
    CARDINALITY = "cardinality"
    UNIQUENESS = "uniqueness"


@dataclass
class Constraint:
    id: str
    name: str
    type: ConstraintType
    lhs: Expr
    operator: str
    rhs: Expr
    confidence: float = 1.0
    description: str = ""

    def __repr__(self):
        return f"Constraint({self.name}: {self.lhs} {self.operator} {self.rhs} [{self.confidence:.2f}])"

    def to_latex(self, ir=None) -> str:
        if ir is None:
            lhs_l = self.lhs.to_latex() if hasattr(self.lhs, 'to_latex') else str(self.lhs)
            rhs_l = self.rhs.to_latex() if hasattr(self.rhs, 'to_latex') else str(self.rhs)
        else:
            from .formula_renderer import FormulaRenderer
            lhs_l = FormulaRenderer.render_expr(self.lhs, ir)
            rhs_l = FormulaRenderer.render_expr(self.rhs, ir)
        op_map = {"<=": "\\le", ">=": "\\ge", "==": "="}
        op = op_map.get(self.operator, self.operator)
        return f"{lhs_l} {op} {rhs_l}" 


# ── Variable Domain ─────────────────────────────────────────────────────
class Domain(str, Enum):
    BOOLEAN = "boolean"
    INTEGER = "integer"
    CONTINUOUS = "continuous"


@dataclass
class Variable:
    id: str
    name: str
    domain: Domain
    dimensions: list
    labels: Optional[list] = None
    data_values: Optional[dict] = None

    @property
    def is_1d(self) -> bool:
        return len(self.dimensions) == 1

    @property
    def is_2d(self) -> bool:
        return len(self.dimensions) == 2

    @property
    def size(self) -> int:
        r = 1
        for d in self.dimensions:
            r *= d
        return r


@dataclass
class Objective:
    sense: str  # "minimize" or "maximize"
    expression: Expr

    def to_latex(self) -> str:
        sense_l = "\\text{Maximize}" if self.sense.lower() == "maximize" else "\\text{Minimize}"
        expr_l = self.expression.to_latex() if hasattr(self.expression, 'to_latex') else str(self.expression)
        return f"{sense_l} \\quad {expr_l}" 


# ── Top-Level IR Container ──────────────────────────────────────────────
@dataclass
class OptimizationIR:
    variables: list = field(default_factory=list)
    constraints: list = field(default_factory=list)
    objectives: list = field(default_factory=list)
    parameters: dict = field(default_factory=dict)
    metadata: dict = field(default_factory=dict)


# ── IR Normalizer (parser JSON -> canonical IR) ─────────────────────────
class IRNormalizer:
    """
    Converts raw parsed JSON from the Groq NLP parser into a canonical
    OptimizationIR object with typed expression trees.
    """

    @staticmethod
    def normalize(parsed_json: dict) -> OptimizationIR:
        ir = OptimizationIR()
        ir.metadata = parsed_json.get("metadata", {})

        # Support both 'variables' and 'variable_registry'
        vars_list = parsed_json.get("variables", parsed_json.get("variable_registry", []))
        for v in vars_list:
            domain_str = v.get("domain", "boolean").lower()
            domain = Domain.BOOLEAN
            if "int" in domain_str:
                domain = Domain.INTEGER
            elif "cont" in domain_str or "real" in domain_str or "float" in domain_str:
                domain = Domain.CONTINUOUS

            dims = v.get("dimensions", [1])
            if isinstance(dims, int):
                dims = [dims]

            var = Variable(
                id=v.get("id", f"x_{len(ir.variables)}"),
                name=v.get("name", v.get("id", "x")),
                domain=domain,
                dimensions=dims,
                labels=v.get("labels"),
                data_values=v.get("data", {}),
            )
            ir.variables.append(var)

        # Support both 'constraints' and 'constraint_registry'
        cons_list = parsed_json.get("constraints", parsed_json.get("constraint_registry", []))
        for c in cons_list:
            constraint = IRNormalizer._normalize_constraint(c, ir.variables)
            if constraint:
                ir.constraints.append(constraint)

        # Support both 'objectives' and 'objective_registry'
        objs_list = parsed_json.get("objectives", parsed_json.get("objective_registry", []))
        # Handle case where objectives is a single dictionary instead of a list
        if isinstance(objs_list, dict):
            objs_list = [objs_list]
        for o in objs_list:
            obj = IRNormalizer._normalize_objective(o, ir.variables)
            if obj:
                ir.objectives.append(obj)

        return ir

    @staticmethod
    def _normalize_constraint(c: dict, variables: list) -> Optional[Constraint]:
        # Support both 'type' and 'family' (e.g. from v2 facts parser)
        c_type_str = c.get("type", c.get("family", "upper_bound")).lower().replace(" ", "_")
        type_map = {t.value: t for t in ConstraintType}
        c_type = type_map.get(c_type_str, ConstraintType.UPPER_BOUND)

        operator = c.get("operator", "<=")
        confidence = c.get("confidence", 0.95)

        # Build LHS expression (if missing, use parameter-binding fallback)
        lhs_data = c.get("lhs", c.get("expression"))
        if not lhs_data:
            # V6.7: Enhanced fallback — match variable AND preserve coefficients
            matched_var = None

            # Try to match by explicit variable_id reference in constraint
            var_id_ref = c.get("variable_id", c.get("var_id", c.get("variable")))
            if var_id_ref:
                matched_var = next((v for v in variables if v.id == var_id_ref or v.name == var_id_ref), None)

            # Type-specific variable matching
            if not matched_var:
                if c_type in (ConstraintType.UNIQUENESS, ConstraintType.CAPACITY):
                    matched_var = next((v for v in variables if v.is_2d), None)
                elif c_type == ConstraintType.LINKING:
                    matched_var = next((v for v in variables if v.is_1d), None)

            if not matched_var:
                matched_var = next((v for v in variables if v.is_1d), None)
            if not matched_var and variables:
                matched_var = variables[0]

            if matched_var:
                # V6.7: Generalised coefficient extraction — matches any data_values key
                # whose value is a list matching the variable dimension.
                # Priority: (1) exact name match with constraint, (2) first matching-length list.
                coefficients = None
                if matched_var.data_values and c_type not in (
                    ConstraintType.UNIQUENESS, ConstraintType.LINKING,
                    ConstraintType.DEPENDENCY, ConstraintType.CONFLICT,
                ):
                    c_name_lower = c.get("name", "").lower().replace("_", "")
                    dim = matched_var.dimensions[0]
                    best_key = None
                    # Pass 1: key whose name appears in the constraint name
                    for key, val in matched_var.data_values.items():
                        if isinstance(val, list) and len(val) == dim:
                            if key.lower().replace("_", "") in c_name_lower or c_name_lower in key.lower().replace("_", ""):
                                best_key = key
                                break
                    # Pass 2: first list of the right length (not already used for another constraint)
                    if best_key is None:
                        for key, val in matched_var.data_values.items():
                            if isinstance(val, list) and len(val) == dim:
                                best_key = key
                                break
                    if best_key is not None:
                        coefficients = [float(v) for v in matched_var.data_values[best_key]]

                if matched_var.is_2d:
                    lhs = Aggregate2D(
                        func="sum",
                        var_id=matched_var.id,
                        row_var="i",
                        col_var="j",
                        row_range=matched_var.dimensions[0],
                        col_range=matched_var.dimensions[1],
                    )
                else:
                    lhs = Aggregate(
                        func="sum",
                        var_id=matched_var.id,
                        index_var="i",
                        index_range=matched_var.dimensions[0],
                        coefficients=coefficients,
                    )
            else:
                lhs = Constant(0.0)
        else:
            lhs = IRNormalizer._build_expression(lhs_data, variables)

        # Support rhs values from limit, value, limit_value
        rhs_raw = c.get("rhs", c.get("value", c.get("limit", c.get("limit_value", 1.0))))
        if isinstance(rhs_raw, (int, float)):
            rhs = Constant(float(rhs_raw))
        elif isinstance(rhs_raw, dict):
            rhs = IRNormalizer._build_expression(rhs_raw, variables)
        elif isinstance(rhs_raw, str):
            matched_var = next((v for v in variables if v.id == rhs_raw or v.name == rhs_raw), None)
            if matched_var:
                rhs = VarRef(matched_var.id)
            else:
                try:
                    rhs = Constant(float(rhs_raw))
                except ValueError:
                    rhs = VarRef(rhs_raw)
        else:
            rhs = Constant(1.0)

        return Constraint(
            id=c.get("id", f"c_{id(c)}"),
            name=c.get("name", "constraint"),
            type=c_type,
            lhs=lhs,
            operator=operator,
            rhs=rhs,
            confidence=confidence,
            description=c.get("description", ""),
        )

    @staticmethod
    def _normalize_objective(o: dict, variables: list) -> Optional[Objective]:
        sense = o.get("sense")
        if not sense:
            # Match semantic reward/penalty type to sense
            o_type = o.get("type", "cost").lower()
            sense = "maximize" if o_type in ("reward", "maximize", "profit", "benefit") else "minimize"
        else:
            sense = sense.lower()

        expr_data = o.get("expression")
        if not expr_data:
            # V6.7: Build default aggregate; try to extract profit/reward coefficients
            first_var = variables[0] if variables else None
            if first_var:
                # Search data_values for a list matching the variable dimension
                # that looks like a profit/reward (keyword match first, then any)
                obj_coeffs = None
                dim = first_var.dimensions[0] if first_var.dimensions else 1
                profit_keys = ("profit", "reward", "revenue", "value", "gain", "benefit",
                               "cost", "penalty", "loss")
                if first_var.data_values:
                    # Pass 1: semantic match
                    for key, val in first_var.data_values.items():
                        if isinstance(val, list) and len(val) == dim:
                            if any(k in key.lower() for k in profit_keys):
                                obj_coeffs = [float(v) for v in val]
                                break
                    # Pass 2: any matching-length list not yet consumed by a constraint
                    if obj_coeffs is None:
                        used_keys = set()
                        for key, val in first_var.data_values.items():
                            if isinstance(val, list) and len(val) == dim and key not in used_keys:
                                obj_coeffs = [float(v) for v in val]
                                break
                expr_data = {
                    "type": "aggregate",
                    "func": "sum",
                    "var_id": first_var.id,
                    "index_var": "i",
                    "size": dim,
                    "coefficients": obj_coeffs,
                }

        expr = IRNormalizer._build_expression(expr_data, variables)
        return Objective(sense=sense, expression=expr)

    @staticmethod
    def _build_expression(expr_data: dict, variables: list) -> Expr:
        if not expr_data or not isinstance(expr_data, dict):
            return Constant(0.0)

        etype = expr_data.get("type", "constant")

        if etype == "constant":
            val = expr_data.get("value", 0.0)
            if isinstance(val, list):
                return Constant([float(v) for v in val])
            return Constant(float(val))

        elif etype == "variable":
            var_id = expr_data.get("var_id", "x")
            index = expr_data.get("index")
            return VarRef(var_id, index)

        elif etype == "binary_op":
            left = IRNormalizer._build_expression(expr_data.get("left", {}), variables)
            right = IRNormalizer._build_expression(expr_data.get("right", {}), variables)
            op = expr_data.get("op", "+")
            return BinaryOp(left, op, right)

        elif etype in ("aggregate", "sum", "min", "max"):
            func = expr_data.get("func", "sum")
            var_id = expr_data.get("var_id", "x")
            matched_var = next((v for v in variables if v.id == var_id), None)

            if matched_var and matched_var.is_2d:
                coeffs_2d = expr_data.get("coefficients_2d")
                if not coeffs_2d:
                    coeffs = expr_data.get("coefficients")
                    if coeffs and isinstance(coeffs, list) and len(coeffs) > 0 and isinstance(coeffs[0], list):
                        coeffs_2d = [[float(v) for v in row] for row in coeffs]
                    elif matched_var.data_values:
                        for key, val in matched_var.data_values.items():
                            if isinstance(val, list) and len(val) > 0 and isinstance(val[0], list):
                                coeffs_2d = [[float(v) for v in row] for row in val]
                                break
                return Aggregate2D(
                    func=func,
                    var_id=var_id,
                    row_var=expr_data.get("row_var", "i"),
                    col_var=expr_data.get("col_var", "j"),
                    row_range=matched_var.dimensions[0],
                    col_range=matched_var.dimensions[1],
                    coefficients_2d=coeffs_2d,
                )
            else:
                size = matched_var.dimensions[0] if matched_var else expr_data.get("size", 1)
                # V6.7: Also try to pull coefficients from variable data_values
                coefficients = expr_data.get("coefficients")
                if not coefficients and matched_var and matched_var.data_values:
                    for key in ("cost", "price", "weight", "setup", "operating_cost", "fixed_cost", "workload", "demand"):
                        if key in matched_var.data_values and isinstance(matched_var.data_values[key], list):
                            coefficients = [float(x) for x in matched_var.data_values[key]]
                            break
                # V6.7: prefer explicit coefficients from parser; fall back to data_values
                explicit_coeffs = expr_data.get("coefficients")
                if explicit_coeffs and isinstance(explicit_coeffs, list):
                    coefficients = [float(c) for c in explicit_coeffs]
                return Aggregate(
                    func=func,
                    var_id=var_id,
                    index_var=expr_data.get("index_var", "i"),
                    index_range=size,
                    coefficients=coefficients,
                )

        # V6.7: Handle 'implication' type for logical constraints
        elif etype == "implication":
            condition = IRNormalizer._build_expression(expr_data.get("condition", {}), variables)
            consequent = IRNormalizer._build_expression(expr_data.get("consequent", {}), variables)
            return BinaryOp(condition, "=>", consequent)

        return Constant(0.0)


# ── Numerical Feasibility Checker ───────────────────────────────────────
@dataclass
class FeasibilityResult:
    constraint_id: str
    constraint_name: str
    status: str  # PASS, FAIL, WARN
    reason: str
    lhs_bound: Optional[float] = None
    rhs_bound: Optional[float] = None


class NumericalFeasibilityChecker:
    """
    Validates constraint bounds against variable domains before compilation.
    Returns per-constraint PASS/FAIL/WARN with numerical evidence.
    """

    @staticmethod
    def check(ir: OptimizationIR) -> list:
        results = []
        for c in ir.constraints:
            result = NumericalFeasibilityChecker._check_constraint(c, ir.variables)
            results.append(result)
        return results

    @staticmethod
    def _check_constraint(c: Constraint, variables: list) -> FeasibilityResult:
        lhs_bounds = NumericalFeasibilityChecker._eval_bounds(c.lhs, variables)
        rhs_bounds = NumericalFeasibilityChecker._eval_bounds(c.rhs, variables)

        if lhs_bounds is None or rhs_bounds is None:
            return FeasibilityResult(c.id, c.name, "WARN", "Cannot evaluate symbolic bounds")

        lhs_min, lhs_max = lhs_bounds
        rhs_min, rhs_max = rhs_bounds

        status = "PASS"
        reason = ""

        if c.operator == "<=":
            if lhs_min > rhs_max:
                status = "FAIL"
                reason = f"Minimum LHS ({lhs_min}) exceeds maximum RHS ({rhs_max})"
            elif lhs_max > rhs_max:
                status = "WARN"
                reason = f"LHS upper bound ({lhs_max}) may exceed RHS ({rhs_max})"
            else:
                reason = f"LHS [{lhs_min}, {lhs_max}] <= RHS [{rhs_min}, {rhs_max}] — PASS"

        elif c.operator == ">=":
            if lhs_max < rhs_min:
                status = "FAIL"
                reason = f"Maximum LHS ({lhs_max}) below minimum RHS ({rhs_min})"
            elif lhs_min < rhs_min:
                status = "WARN"
                reason = f"LHS lower bound ({lhs_min}) may fall below RHS ({rhs_min})"
            else:
                reason = f"LHS [{lhs_min}, {lhs_max}] >= RHS [{rhs_min}, {rhs_max}] — PASS"

        elif c.operator == "==":
            if lhs_max < rhs_min or lhs_min > rhs_max:
                status = "FAIL"
                reason = f"LHS [{lhs_min}, {lhs_max}] and RHS [{rhs_min}, {rhs_max}] do not overlap"
            else:
                reason = "Ranges overlap — equality achievable"

        return FeasibilityResult(c.id, c.name, status, reason, lhs_max, rhs_max)

    @staticmethod
    def _eval_bounds(expr: Expr, variables: list) -> Optional[tuple]:
        """Returns (min_possible, max_possible) for an expression."""
        if isinstance(expr, Constant):
            if isinstance(expr.value, list):
                # For multi-dimensional constraints, evaluate bounds using min/max of the list elements
                clean_list = [float(v) for v in expr.value if isinstance(v, (int, float))]
                if not clean_list:
                    return (0.0, 0.0)
                return (min(clean_list), max(clean_list))
            return (expr.value, expr.value)

        elif isinstance(expr, VarRef):
            var = next((v for v in variables if v.id == expr.var_id), None)
            if not var:
                return None
            if var.domain == Domain.BOOLEAN:
                return (0.0, 1.0)
            elif var.domain == Domain.INTEGER:
                return (0.0, 1000.0)
            else:
                return (0.0, 1e6)

        elif isinstance(expr, BinaryOp):
            lb = NumericalFeasibilityChecker._eval_bounds(expr.left, variables)
            rb = NumericalFeasibilityChecker._eval_bounds(expr.right, variables)
            if lb is None or rb is None:
                return None
            if expr.op == "+":
                return (lb[0] + rb[0], lb[1] + rb[1])
            elif expr.op == "-":
                return (lb[0] - rb[1], lb[1] - rb[0])
            elif expr.op == "*":
                products = [lb[0]*rb[0], lb[0]*rb[1], lb[1]*rb[0], lb[1]*rb[1]]
                return (min(products), max(products))
            return None

        elif isinstance(expr, Aggregate):
            var = next((v for v in variables if v.id == expr.var_id), None)
            if not var:
                return None
            if var.domain == Domain.BOOLEAN:
                var_min, var_max = 0.0, 1.0
            elif var.domain == Domain.INTEGER:
                var_min, var_max = 0.0, 1000.0
            else:
                var_min, var_max = 0.0, 1e6

            n = expr.index_range
            coeffs = expr.coefficients

            if coeffs and len(coeffs) >= n:
                pos_sum = sum(c for c in coeffs[:n] if c > 0)
                neg_sum = sum(c for c in coeffs[:n] if c < 0)
                return (neg_sum * var_max, pos_sum * var_max)
            else:
                return (n * var_min, n * var_max)

        elif isinstance(expr, Aggregate2D):
            var = next((v for v in variables if v.id == expr.var_id), None)
            if not var:
                return None
            if var.domain == Domain.BOOLEAN:
                var_min, var_max = 0.0, 1.0
            else:
                var_min, var_max = 0.0, 1000.0
            n = expr.row_range * expr.col_range
            return (n * var_min, n * var_max)

        return None
