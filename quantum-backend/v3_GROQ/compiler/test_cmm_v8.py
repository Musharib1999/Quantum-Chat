# -*- coding: utf-8 -*-
import pytest
from v3.compiler.cmm import (
    CMMSet, CMMParameter, CMMVariable, VarType,
    Constant, VarRef, ParamRef, BinaryOp, Sum,
    CMMObjective, CMMConstraint, CanonicalMathematicalModel
)
from v3.compiler.expander import (
    parse_spec_to_cmm, expand_cmm_to_om, validate_optimization_model
)
from v3.compiler.dcc import (
    compile_om_to_cqm, compile_om_to_ortools, compile_compositional_ast
)

def test_cmm_creation():
    cmm = CanonicalMathematicalModel()
    cmm.sets["Orders"] = CMMSet(name="Orders", elements=[0, 1, 2])
    cmm.variables["x"] = CMMVariable(name="x", var_type=VarType.BINARY, index_sets=["Orders"])
    assert len(cmm.sets) == 1
    assert cmm.variables["x"].var_type == "BINARY"

def test_parse_spec_to_cmm():
    spec = {
        "entities_count": 3,
        "slots_count": 2,
        "parameters": {
            "capacity_val": 5
        },
        "variable_registry": [
            {"name": "x", "type": "BINARY", "dimensions": ["Jobs", "Machines"]}
        ],
        "constraint_registry": [
            {"name": "unique_assignment", "family": "assignment"}
        ],
        "objectives": [
            {"name": "cost", "type": "minimize"}
        ]
    }
    cmm = parse_spec_to_cmm(spec)
    assert "Jobs" in cmm.sets
    assert "Machines" in cmm.sets
    assert "x" in cmm.variables
    assert len(cmm.constraints) == 1

def test_expand_cmm_to_om():
    cmm = CanonicalMathematicalModel()
    cmm.sets["Orders"] = CMMSet(name="Orders", elements=[0, 1])
    cmm.sets["Vans"] = CMMSet(name="Vans", elements=[0])
    cmm.variables["x"] = CMMVariable(name="x", var_type=VarType.BINARY, index_sets=["Orders", "Vans"])
    cmm.objective = CMMObjective(sense="MINIMIZE", expression=VarRef(var_name="x", indices=[0, 0]))
    cmm.constraints.append(
        CMMConstraint(
            name="limit",
            quantifier="NONE",
            left=VarRef(var_name="x", indices=[0, 0]),
            op="<=",
            right=Constant(value=1.0)
        )
    )
    om = expand_cmm_to_om(cmm)
    assert "x_0_0" in om.variables
    assert "x_1_0" in om.variables
    assert len(om.constraints) == 1

def test_minimax_reformulation():
    cmm = CanonicalMathematicalModel()
    cmm.sets["Machines"] = CMMSet(name="Machines", elements=[0, 1])
    cmm.variables["x"] = CMMVariable(name="x", var_type=VarType.BINARY, index_sets=["Machines"])
    cmm.objective = CMMObjective(sense="MINIMIZE", expression=VarRef(var_name="x", indices=[0]))
    # Add constraint simulating workload
    cmm.constraints.append(
        CMMConstraint(
            name="machine_workload",
            quantifier="FORALL",
            quantifier_vars=["j"],
            quantifier_ranges=["Machines"],
            left=VarRef(var_name="x", indices=["j"]),
            op="<=",
            right=Constant(value=1.0)
        )
    )
    # Trigger expander with minimax problem text
    om = expand_cmm_to_om(cmm, problem_text="minimize the maximum makespan")
    assert "z" in om.variables
    assert om.objective.expression == "z"
    # Verify bounding constraints added
    bound_consts = [c for c in om.constraints if "minimax_bound" in c.name]
    assert len(bound_consts) > 0

def test_logical_implication_reformulation():
    cmm = CanonicalMathematicalModel()
    cmm.sets["Nurses"] = CMMSet(name="Nurses", elements=[0, 5])
    cmm.sets["Wards"] = CMMSet(name="Wards", elements=[0])
    cmm.variables["x"] = CMMVariable(name="x", var_type=VarType.BINARY, index_sets=["Nurses", "Wards"])
    cmm.objective = CMMObjective(sense="MINIMIZE", expression=VarRef(var_name="x", indices=[0, 0]))
    # Trigger expander with conflict problem text
    om = expand_cmm_to_om(cmm, problem_text="Nurse 0 and 5 cannot fly together")
    conflict_consts = [c for c in om.constraints if "conflict_0_5" in c.name]
    assert len(conflict_consts) > 0
    assert conflict_consts[0].left == "x_0_0 + x_5_0"

def test_validate_optimization_model():
    # 1. Feasible model
    spec = {
        "variable_registry": [{"name": "x", "type": "BINARY", "dimensions": ["Jobs", "Machines"]}],
        "constraint_registry": [{"name": "unique_assignment", "family": "assignment"}]
    }
    cmm = parse_spec_to_cmm(spec)
    om = expand_cmm_to_om(cmm)
    res = validate_optimization_model(om)
    assert res["feasible"] is True

    # 2. Contradictory bounds
    cmm.objective = CMMObjective(sense="MINIMIZE", expression=VarRef(var_name="x", indices=[0, 0]))
    cmm.constraints.append(
        CMMConstraint(
            name="lower",
            quantifier="NONE",
            left=VarRef(var_name="x", indices=[0, 0]),
            op=">=",
            right=Constant(value=2.0)
        )
    )
    cmm.constraints.append(
        CMMConstraint(
            name="upper",
            quantifier="NONE",
            left=VarRef(var_name="x", indices=[0, 0]),
            op="<=",
            right=Constant(value=1.0)
        )
    )
    om_contradictory = expand_cmm_to_om(cmm)
    res_contradictory = validate_optimization_model(om_contradictory)
    assert res_contradictory["feasible"] is False
    assert "Contradictory constraints" in res_contradictory["infeasibility_reason"]

def test_deterministic_compiler_codegen():
    spec = {
        "entities_count": 3,
        "slots_count": 2,
        "variable_registry": [
            {"name": "x", "type": "BINARY", "dimensions": ["Jobs", "Machines"]}
        ]
    }
    # Test compositional ast endpoint compile
    cqm_code = compile_compositional_ast(spec, force_solver="CQM")
    assert "cqm = dimod.ConstrainedQuadraticModel()" in cqm_code
    
    ortools_code = compile_compositional_ast(spec, force_solver="OR-Tools")
    assert "model = cp_model.CpModel()" in ortools_code
