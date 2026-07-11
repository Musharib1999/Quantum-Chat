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

@dataclass
class CMMParameter:
    name: str
    value: Union[float, int, List[Any], Dict[str, Any]]
    index_sets: List[str] = field(default_factory=list)

@dataclass
class CMMVariable:
    name: str
    var_type: str  # VarType
    index_sets: List[str] = field(default_factory=list)
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None

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
