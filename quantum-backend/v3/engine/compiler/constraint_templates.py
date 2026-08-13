# -*- coding: utf-8 -*-
"""
Constraint Templates Library — Bit2Qubit Compiler V9
=====================================================
Each constraint family is a self-contained class that owns its canonical
mathematical representation and knows how to emit solver-specific code for
every supported backend:

    to_cqm()          -> Python code string targeting dimod CQM
    to_ortools()      -> Python code string targeting OR-Tools CP-SAT
    to_python_fn()    -> (objective_fn, constraint_fn) callables for AutoQUBO
    to_milp()         -> PuLP expression lines (when pulp is available)
    to_latex()        -> LaTeX math string for UI rendering

This is pure compiler engineering — no AI, no heuristics.
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# ── Base Template ──────────────────────────────────────────────────────────────

class ConstraintTemplate(ABC):
    """Abstract base for all constraint templates."""

    @property
    @abstractmethod
    def family(self) -> str:
        """Canonical family name, e.g. 'budget', 'coverage'."""

    @abstractmethod
    def to_cqm(self) -> str:
        """Return Python code lines for a dimod CQM."""

    @abstractmethod
    def to_ortools(self) -> str:
        """Return Python code lines for OR-Tools CP-SAT."""

    @abstractmethod
    def to_latex(self) -> str:
        """Return LaTeX math string."""

    def to_python_fn(self) -> str:
        """Return a Python function body string for AutoQUBO consumption."""
        return f"lambda x: 0  # {self.family} — override in subclass"

    def to_milp(self) -> str:
        """Return Python code lines for PuLP MILP."""
        return f"# {self.family} constraint — override in subclass"


# ── Budget Template ────────────────────────────────────────────────────────────

@dataclass
class BudgetTemplate(ConstraintTemplate):
    """
    Canonical form:  Σ c[i] · x[i]  ≤  B

    E.g. total cost of selected locations must not exceed budget B.
    """
    name: str
    var_names: List[str]
    coefficients: List[float]
    budget: float
    operator: str = "<="

    @property
    def family(self) -> str:
        return "budget"

    def to_cqm(self) -> str:
        terms = " + ".join(
            f"{c} * {v}" if c != 1.0 else v
            for c, v in zip(self.coefficients, self.var_names)
        )
        return f"cqm.add_constraint({terms} {self.operator} {self.budget}, label='{self.name}')"

    def to_ortools(self) -> str:
        terms = " + ".join(
            f"{int(round(c))} * {v}" if c != 1.0 else v
            for c, v in zip(self.coefficients, self.var_names)
        )
        return f"model.Add({terms} {self.operator} {int(self.budget)})  # {self.name}"

    def to_python_fn(self) -> str:
        n = len(self.var_names)
        coeffs = list(self.coefficients)
        b = self.budget
        return (
            f"def constraint_{self.name}(x):\n"
            f"    coeffs = {coeffs}\n"
            f"    total = sum(coeffs[i] * x[i] for i in range({n}))\n"
            f"    return max(0, total - {b}) ** 2  # {self.name}: budget ≤ {b}"
        )

    def to_milp(self) -> str:
        terms = " + ".join(
            f"{c} * vars['{v}']" if c != 1.0 else f"vars['{v}']"
            for c, v in zip(self.coefficients, self.var_names)
        )
        return f"prob += ({terms} {self.operator} {self.budget}), '{self.name}'"

    def to_latex(self) -> str:
        op_latex = {"<=": r"\leq", ">=": r"\geq", "==": "="}.get(self.operator, self.operator)
        return rf"\sum_{{i}} c_i x_i {op_latex} {self.budget}"


# ── Coverage Template ──────────────────────────────────────────────────────────

@dataclass
class CoverageTemplate(ConstraintTemplate):
    """
    Canonical form:  Σ x[i], i∈subset  ≥  k

    E.g. at least k stations must be open in the north region.
    """
    name: str
    var_names: List[str]
    threshold: float
    operator: str = ">="
    subset_name: str = "S"

    @property
    def family(self) -> str:
        return "coverage"

    def to_cqm(self) -> str:
        terms = " + ".join(self.var_names)
        return f"cqm.add_constraint({terms} {self.operator} {self.threshold}, label='{self.name}')"

    def to_ortools(self) -> str:
        terms = " + ".join(self.var_names)
        return f"model.Add({terms} {self.operator} {int(self.threshold)})  # {self.name}"

    def to_python_fn(self) -> str:
        n = len(self.var_names)
        indices = list(range(n))
        k = self.threshold
        return (
            f"def constraint_{self.name}(x):\n"
            f"    subset_indices = {indices}\n"
            f"    total = sum(x[i] for i in subset_indices)\n"
            f"    return max(0, {k} - total) ** 2  # {self.name}: Σx[i] ≥ {k}"
        )

    def to_milp(self) -> str:
        terms = " + ".join(f"vars['{v}']" for v in self.var_names)
        return f"prob += ({terms} {self.operator} {self.threshold}), '{self.name}'"

    def to_latex(self) -> str:
        op_latex = {"<=": r"\leq", ">=": r"\geq", "==": "="}.get(self.operator, self.operator)
        return rf"\sum_{{i \in {self.subset_name}}} x_i {op_latex} {int(self.threshold)}"


# ── Mutual Exclusion Template ──────────────────────────────────────────────────

@dataclass
class MutualExclusionTemplate(ConstraintTemplate):
    """
    Canonical form:  x[i] + x[j]  ≤  1

    E.g. two items cannot both be selected simultaneously.
    """
    name: str
    var_i: str
    var_j: str

    @property
    def family(self) -> str:
        return "mutual_exclusion"

    def to_cqm(self) -> str:
        return f"cqm.add_constraint({self.var_i} + {self.var_j} <= 1, label='{self.name}')"

    def to_ortools(self) -> str:
        return f"model.Add({self.var_i} + {self.var_j} <= 1)  # {self.name}"

    def to_python_fn(self) -> str:
        return (
            f"def constraint_{self.name}(x, i, j):\n"
            f"    return max(0, x[i] + x[j] - 1) ** 2  # {self.name}: x[i] + x[j] ≤ 1"
        )

    def to_milp(self) -> str:
        return f"prob += (vars['{self.var_i}'] + vars['{self.var_j}'] <= 1), '{self.name}'"

    def to_latex(self) -> str:
        return rf"x_i + x_j \leq 1"


# ── Dependency Template ────────────────────────────────────────────────────────

@dataclass
class DependencyTemplate(ConstraintTemplate):
    """
    Canonical form:  x[if]  ≤  x[then]

    E.g. if a hub is open, a feeder station can be active; otherwise it cannot.
    """
    name: str
    var_if: str
    var_then: str

    @property
    def family(self) -> str:
        return "dependency"

    def to_cqm(self) -> str:
        return f"cqm.add_constraint({self.var_if} - {self.var_then} <= 0, label='{self.name}')"

    def to_ortools(self) -> str:
        return f"model.Add({self.var_if} <= {self.var_then})  # {self.name}"

    def to_python_fn(self) -> str:
        return (
            f"def constraint_{self.name}(x, i_if, i_then):\n"
            f"    return max(0, x[i_if] - x[i_then]) ** 2  # {self.name}: x[if] ≤ x[then]"
        )

    def to_milp(self) -> str:
        return f"prob += (vars['{self.var_if}'] <= vars['{self.var_then}']), '{self.name}'"

    def to_latex(self) -> str:
        return rf"x_{{\text{{if}}}} \leq x_{{\text{{then}}}}"


# ── Cardinality / Assignment Uniqueness Template ───────────────────────────────

@dataclass
class CardinalityTemplate(ConstraintTemplate):
    """
    Canonical form:  Σ_j x[i,j]  =  1   ∀ i ∈ Rows

    E.g. each task is assigned to exactly one machine (assignment uniqueness).
    """
    name: str
    var_names_per_row: List[List[str]]
    rhs: float = 1.0
    operator: str = "=="

    @property
    def family(self) -> str:
        return "cardinality"

    def to_cqm(self) -> str:
        lines = []
        for i, row_vars in enumerate(self.var_names_per_row):
            terms = " + ".join(row_vars)
            lines.append(
                f"cqm.add_constraint({terms} {self.operator} {self.rhs}, label='{self.name}_row{i}')"
            )
        return "\n".join(lines)

    def to_ortools(self) -> str:
        lines = []
        for i, row_vars in enumerate(self.var_names_per_row):
            terms = " + ".join(row_vars)
            lines.append(f"model.Add({terms} {self.operator} {int(self.rhs)})  # {self.name} row {i}")
        return "\n".join(lines)

    def to_python_fn(self) -> str:
        rows_def = [list(range(len(r))) for r in self.var_names_per_row]
        rhs = self.rhs
        return (
            f"def constraint_{self.name}(x):\n"
            f"    rows = {rows_def}\n"
            f"    total_penalty = 0\n"
            f"    for row in rows:\n"
            f"        total_penalty += (sum(x[j] for j in row) - {rhs}) ** 2\n"
            f"    return total_penalty  # {self.name}: Σ_j x[i,j] = {rhs} ∀i"
        )

    def to_milp(self) -> str:
        lines = []
        for i, row_vars in enumerate(self.var_names_per_row):
            terms = " + ".join(f"vars['{v}']" for v in row_vars)
            lines.append(f"prob += ({terms} {self.operator} {self.rhs}), '{self.name}_row{i}'")
        return "\n".join(lines)

    def to_latex(self) -> str:
        op_latex = {"<=": r"\leq", ">=": r"\geq", "==": "="}.get(self.operator, self.operator)
        return rf"\sum_{{j}} x_{{ij}} {op_latex} {int(self.rhs)} \quad \forall i"


# ── Capacity Template ──────────────────────────────────────────────────────────

@dataclass
class CapacityTemplate(ConstraintTemplate):
    """
    Canonical form:  Σ_i x[i,j]  ≤  C   ∀ j ∈ Columns

    E.g. each machine can handle at most C tasks.
    """
    name: str
    var_names_per_col: List[List[str]]
    capacity: float
    operator: str = "<="

    @property
    def family(self) -> str:
        return "capacity"

    def to_cqm(self) -> str:
        lines = []
        for j, col_vars in enumerate(self.var_names_per_col):
            terms = " + ".join(col_vars)
            lines.append(
                f"cqm.add_constraint({terms} {self.operator} {self.capacity}, label='{self.name}_col{j}')"
            )
        return "\n".join(lines)

    def to_ortools(self) -> str:
        lines = []
        for j, col_vars in enumerate(self.var_names_per_col):
            terms = " + ".join(col_vars)
            lines.append(
                f"model.Add({terms} {self.operator} {int(self.capacity)})  # {self.name} col {j}"
            )
        return "\n".join(lines)

    def to_python_fn(self) -> str:
        cols_def = [list(range(len(c))) for c in self.var_names_per_col]
        cap = self.capacity
        return (
            f"def constraint_{self.name}(x):\n"
            f"    cols = {cols_def}\n"
            f"    total_penalty = 0\n"
            f"    for col in cols:\n"
            f"        total_penalty += max(0, sum(x[i] for i in col) - {cap}) ** 2\n"
            f"    return total_penalty  # {self.name}: Σ_i x[i,j] ≤ {cap} ∀j"
        )

    def to_milp(self) -> str:
        lines = []
        for j, col_vars in enumerate(self.var_names_per_col):
            terms = " + ".join(f"vars['{v}']" for v in col_vars)
            lines.append(
                f"prob += ({terms} {self.operator} {self.capacity}), '{self.name}_col{j}'"
            )
        return "\n".join(lines)

    def to_latex(self) -> str:
        op_latex = {"<=": r"\leq", ">=": r"\geq", "==": "="}.get(self.operator, self.operator)
        return rf"\sum_{{i}} x_{{ij}} {op_latex} {int(self.capacity)} \quad \forall j"


# ── Objective Template ─────────────────────────────────────────────────────────

@dataclass
class ObjectiveTerm:
    """A single weighted variable term in an objective: coefficient × variable."""
    variable_name: str
    coefficient: float = 1.0
    coefficient_param: str = ""  # parameter label, e.g. "revenue"


@dataclass
class ObjectiveTemplate:
    """
    Canonical objective:  sense  Σ_i coeff[i] · x[i]

    E.g. maximize Σ revenue[i] · x[i]
    """
    sense: str                               # "MAXIMIZE" | "MINIMIZE"
    terms: List[ObjectiveTerm] = field(default_factory=list)
    constant: float = 0.0
    raw_expression: str = ""                 # preserved original string fallback

    def to_cqm(self) -> str:
        if not self.terms and self.raw_expression:
            return f"cqm.set_objective({self.raw_expression})"
        if not self.terms:
            return "cqm.set_objective(0)"
        expr = " + ".join(
            f"{t.coefficient} * {t.variable_name}" if t.coefficient != 1.0 else t.variable_name
            for t in self.terms
        )
        # dimod minimizes by default — negate expression for MAXIMIZE
        if self.sense == "MAXIMIZE":
            expr = f"-({expr})"
        return f"cqm.set_objective({expr})"

    def to_ortools(self) -> str:
        if not self.terms and self.raw_expression:
            sense_method = "Minimize" if self.sense == "MINIMIZE" else "Maximize"
            return f"model.{sense_method}({self.raw_expression})"
        expr = " + ".join(
            f"{int(round(t.coefficient))} * {t.variable_name}" if t.coefficient != 1.0
            else t.variable_name
            for t in self.terms
        ) if self.terms else "0"
        sense_method = "Minimize" if self.sense == "MINIMIZE" else "Maximize"
        return f"model.{sense_method}({expr})"

    def to_python_fn(self) -> str:
        """Returns an objective function definition string for AutoQUBO."""
        n = len(self.terms)
        coeffs = [t.coefficient for t in self.terms]
        # AutoQUBO always minimizes; negate for MAXIMIZE
        sign = -1.0 if self.sense == "MAXIMIZE" else 1.0
        return (
            f"def objective_fn(x):\n"
            f"    coeffs = {coeffs}\n"
            f"    # sign={sign}: AutoQUBO minimizes — we {self.sense.lower()} so negate\n"
            f"    return {sign} * sum(coeffs[i] * x[i] for i in range({n}))"
        )

    def to_milp(self) -> str:
        if not self.terms and self.raw_expression:
            return f"prob += {self.raw_expression}  # objective"
        expr = " + ".join(
            f"{t.coefficient} * vars['{t.variable_name}']" if t.coefficient != 1.0
            else f"vars['{t.variable_name}']"
            for t in self.terms
        ) if self.terms else "0"
        return f"prob += {expr}  # {self.sense.lower()} objective"

    def to_latex(self) -> str:
        sense_str = r"\max" if self.sense == "MAXIMIZE" else r"\min"
        if not self.terms:
            return rf"{sense_str} \; {self.raw_expression}"
        param = self.terms[0].coefficient_param if self.terms[0].coefficient_param else "c"
        return rf"{sense_str} \; \sum_{{i}} {param}_i \, x_i"


# ── Template Registry ──────────────────────────────────────────────────────────

TEMPLATE_REGISTRY: Dict[str, type] = {
    "budget":           BudgetTemplate,
    "coverage":         CoverageTemplate,
    "mutual_exclusion": MutualExclusionTemplate,
    "mutualexclusion":  MutualExclusionTemplate,
    "dependency":       DependencyTemplate,
    "cardinality":      CardinalityTemplate,
    "uniqueness":       CardinalityTemplate,
    "assignment":       CardinalityTemplate,
    "capacity":         CapacityTemplate,
}


def get_template_class(family: str) -> Optional[type]:
    """Return the template class for a given constraint family name."""
    return TEMPLATE_REGISTRY.get(family.lower().replace(" ", "_").replace("-", "_"))
