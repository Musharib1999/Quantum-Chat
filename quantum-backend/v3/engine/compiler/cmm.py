# -*- coding: utf-8 -*-
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Union

@dataclass
class CMMSet:
    name: str
    elements: List[Any]

class VarType:
    BINARY = "BINARY"
    INTEGER = "INTEGER"
    CONTINUOUS = "CONTINUOUS"

class ProblemFamily:
    SELECTION = "SELECTION"
    ASSIGNMENT = "ASSIGNMENT"
    ALLOCATION = "ALLOCATION"
    SCHEDULING = "SCHEDULING"
    SEQUENCING = "SEQUENCING"
    ROUTING = "ROUTING"
    PORTFOLIO = "PORTFOLIO"
    FACILITY_LOCATION = "FACILITY_LOCATION"
    PACKING = "PACKING"
    NETWORK_FLOW = "NETWORK_FLOW"
    RESOURCE_ALLOCATION = "RESOURCE_ALLOCATION"
    GRAPH_OPTIMIZATION = "GRAPH_OPTIMIZATION"
    STATE_TRANSITION = "STATE_TRANSITION"
    LOOKUP_OPTIMIZATION = "LOOKUP_OPTIMIZATION"
    DYNAMIC_PROGRAMMING = "DYNAMIC_PROGRAMMING"
    GENERAL_MILP = "GENERAL_MILP"
    GENERAL_QUBO = "GENERAL_QUBO"

class VariableOntologyType:
    BINARY_SCALAR = "BINARY_SCALAR"
    BINARY_VECTOR = "BINARY_VECTOR"
    INTEGER_SCALAR = "INTEGER_SCALAR"
    INTEGER_VECTOR = "INTEGER_VECTOR"
    CONTINUOUS_SCALAR = "CONTINUOUS_SCALAR"
    CONTINUOUS_VECTOR = "CONTINUOUS_VECTOR"
    MATRIX_VARIABLE = "MATRIX_VARIABLE"
    TIME_INDEXED_VARIABLE = "TIME_INDEXED_VARIABLE"
    GRAPH_EDGE_VARIABLE = "GRAPH_EDGE_VARIABLE"
    STATE_VARIABLE = "STATE_VARIABLE"

@dataclass
class CMMParameter:
    name: str
    value: Union[float, int, List[Any], Dict[str, Any]]
    index_sets: List[str] = field(default_factory=list)

@dataclass
class DerivedVariable:
    name: str
    expression: Any  # Expr
    description: str = ""
    source_sentence: str = ""

@dataclass
class CMMFunction:
    name: str
    arguments: List[str]
    return_type: str
    expression: Any  # Expr
    description: str = ""

@dataclass
class CMMVariable:
    name: str
    var_type: str  # VarType
    index_sets: List[str] = field(default_factory=list)
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    ontology_type: str = "BINARY_SCALAR"
    unit: str = ""
    semantic_type: str = ""
    source_sentence: str = "" 

class Expr:
    pass

@dataclass
class Constant(Expr):
    value: Any

@dataclass
class VarRef(Expr):
    var_name: str
    indices: List[Union[str, int]] = field(default_factory=list)

@dataclass
class ParamRef(Expr):
    param_name: str
    indices: List[Union[str, int]] = field(default_factory=list)

@dataclass
class BinaryOp(Expr):
    left: Expr
    op: str
    right: Expr

@dataclass
class Sum(Expr):
    expression: Expr
    index_vars: List[str]
    index_ranges: List[str]

@dataclass
class CMMObjective:
    sense: str  # "MINIMIZE" | "MAXIMIZE"
    expression: Expr

@dataclass
class CMMConstraint:
    name: str
    quantifier: str  # "FORALL" | "NONE"
    left: Expr
    op: str  # "<=", ">=", "=="
    right: Expr
    quantifier_vars: List[str] = field(default_factory=list)
    quantifier_ranges: List[str] = field(default_factory=list)
    source_sentence: str = "" 

@dataclass
class CMMRelationship:
    type: str  # "Requires" | "MutuallyExclusive" | "Precedes"
    left_var: str
    right_var: str
    indices: List[Any] = field(default_factory=list)

@dataclass
class CMMConstraintPattern:
    name: str

@dataclass
class UniquenessPattern(CMMConstraintPattern):
    var_name: str
    row_set: str
    col_set: str
    rhs_value: float = 1.0

@dataclass
class CapacityPattern(CMMConstraintPattern):
    var_name: str
    row_set: str
    col_set: str
    capacity_value: float

@dataclass
class AvailabilityPattern(CMMConstraintPattern):
    var_name: str
    row_set: str
    col_set: str
    unavailable_cols: List[int] = field(default_factory=list)

@dataclass
class FixedAssignmentPattern(CMMConstraintPattern):
    var_name: str
    row_index: int
    col_index: int
    assigned_value: float = 1.0

@dataclass
class EligibilityPattern(CMMConstraintPattern):
    var_name: str
    row_set: str
    col_set: str
    eligible_matrix: List[List[int]] = field(default_factory=list)

@dataclass
class CanonicalMathematicalModel:
    sets: Dict[str, CMMSet] = field(default_factory=dict)
    parameters: Dict[str, CMMParameter] = field(default_factory=dict)
    variables: Dict[str, CMMVariable] = field(default_factory=dict)
    objective: Optional[CMMObjective] = None
    constraints: List[CMMConstraint] = field(default_factory=list)
    relationships: List[CMMRelationship] = field(default_factory=list)
    patterns: List[CMMConstraintPattern] = field(default_factory=list)
    problem_family: str = "SELECTION"
    derived_variables: Dict[str, DerivedVariable] = field(default_factory=dict)
    functions: Dict[str, CMMFunction] = field(default_factory=dict)


@dataclass
class LogicalImplicationPattern(CMMConstraintPattern):
    var_name: str
    if_indices: List[int]
    then_indices: List[int]
    operator: str = "IF_THEN"
    if_min_count: int = 1
    then_min_count: int = 1
    rhs_value: float = 1.0

@dataclass
class MutualExclusionPattern(CMMConstraintPattern):
    var_name: str
    exclusive_indices: List[int]
    rhs_value: float = 1.0


# ── V9: Objective AST Node (solver-independent) ───────────────────────────────

@dataclass
class ObjectiveTerm:
    """
    A single weighted term in the objective function: coefficient × variable.

    Attributes:
        variable_name:      Expanded solver variable name (e.g. 'x_0', 'x_1_2')
        coefficient:        Scalar weight (e.g. 1.0, revenue[i])
        coefficient_param:  Source parameter label for traceability (e.g. 'revenue')
        flat_index:         Flat index in the variable vector (for AutoQUBO x[i])
    """
    variable_name: str
    coefficient: float = 1.0
    coefficient_param: str = ""
    flat_index: int = 0


@dataclass
class ObjectiveNode:
    """
    A fully symbolic, solver-independent objective representation.

    This is the canonical form of the objective — every backend emits
    solver-specific code from this node rather than from a raw string.

    Attributes:
        sense:           "MAXIMIZE" | "MINIMIZE"
        terms:           List of ObjectiveTerm (one per variable in the objective)
        constant:        Additive constant (usually 0)
        raw_expression:  Preserved fallback string from the expander
    """
    sense: str                              # "MAXIMIZE" | "MINIMIZE"
    terms: List[ObjectiveTerm] = field(default_factory=list)
    constant: float = 0.0
    raw_expression: str = ""               # legacy fallback

    def to_cqm_expr(self) -> str:
        """Emit dimod CQM objective expression string."""
        if not self.terms and self.raw_expression:
            expr = self.raw_expression
        elif self.terms:
            expr = " + ".join(
                f"{t.coefficient} * {t.variable_name}" if t.coefficient != 1.0
                else t.variable_name
                for t in self.terms
            )
        else:
            expr = "0"
        return f"-({expr})" if self.sense == "MAXIMIZE" else expr

    def to_ortools_expr(self) -> str:
        """Emit OR-Tools CP-SAT objective expression string."""
        if not self.terms and self.raw_expression:
            return self.raw_expression
        if not self.terms:
            return "0"
        return " + ".join(
            f"{int(round(t.coefficient))} * {t.variable_name}" if t.coefficient != 1.0
            else t.variable_name
            for t in self.terms
        )

    def to_latex(self) -> str:
        """Emit LaTeX math string for UI rendering."""
        sense_str = r"\max" if self.sense == "MAXIMIZE" else r"\min"
        if not self.terms and self.raw_expression:
            return rf"{sense_str} \; {self.raw_expression}"
        if not self.terms:
            return rf"{sense_str} \; 0"
        param = self.terms[0].coefficient_param if self.terms[0].coefficient_param else "c"
        return rf"{sense_str} \; \sum_{{i}} {param}_i \, x_i"

    def to_autoqubo_fn_body(self) -> str:
        """Emit AutoQUBO objective function body (x is a flat binary vector)."""
        n = len(self.terms)
        coeffs = [t.coefficient for t in self.terms]
        sign = -1.0 if self.sense == "MAXIMIZE" else 1.0
        return (
            f"def objective_fn(x):\n"
            f"    coeffs = {coeffs}\n"
            f"    return {sign} * sum(coeffs[i] * x[i] for i in range({n}))"
        )
