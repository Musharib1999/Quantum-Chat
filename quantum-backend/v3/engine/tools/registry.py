"""
Central Registry and Dispatcher for the 33 Quantum AI Tools.
"""
from typing import Dict, Any, Callable
from .tool_models import *
from .optimization_tools import (
    formulate_problem, translate_to_qubo, map_quantum_solver,
    execute_solver, decode_solution, benchmark_classical as opt_benchmark
)
from .academy_tools import (
    concept_explainer, math_derivation, generate_tutorial_circuit,
    socratic_assessment, misconception_debugger
)
from .algorithm_tools import (
    classify_algorithm, synthesize_oracle, build_diffusion_operator,
    simulate_statevector, analyze_quantum_speedup
)
from .circuit_tools import (
    build_quantum_circuit, bind_parameters, transpile_passes, simulate_noisy, render_continuous
)
from .chemistry_tools import (
    ingest_geometry, compute_scf_integrals, select_active_space,
    fermion_to_qubit_mapping, build_chemistry_ansatz, solve_ground_state_vqe
)
from .qml_tools import (
    normalize_features, build_feature_map, build_variational_ansatz,
    train_classifier, benchmark_classical as qml_benchmark, predict_sample
)

TOOL_DISPATCH_TABLE: dict[str, tuple[Any, Callable]] = {
    # 1. Optimization Studio (1-6)
    "tools.opt.formulate_problem": (OptFormulateProblemRequest, formulate_problem),
    "tools.opt.translate_to_qubo": (OptTranslateToQUBORequest, translate_to_qubo),
    "tools.opt.map_quantum_solver": (OptMapQuantumSolverRequest, map_quantum_solver),
    "tools.opt.execute_solver": (OptExecuteSolverRequest, execute_solver),
    "tools.opt.decode_solution": (OptDecodeSolutionRequest, decode_solution),
    "tools.opt.benchmark_classical": (OptBenchmarkClassicalRequest, opt_benchmark),

    # 2. Quantum Academy (7-11)
    "tools.academy.concept_explainer": (AcademyConceptExplainerRequest, concept_explainer),
    "tools.academy.math_derivation": (AcademyMathDerivationRequest, math_derivation),
    "tools.academy.generate_tutorial_circuit": (AcademyGenerateTutorialCircuitRequest, generate_tutorial_circuit),
    "tools.academy.socratic_assessment": (AcademySocraticAssessmentRequest, socratic_assessment),
    "tools.academy.misconception_debugger": (AcademyMisconceptionDebuggerRequest, misconception_debugger),

    # 3. Quantum Algorithm Studio (12-16)
    "tools.algo.classify_algorithm": (AlgoClassifyAlgorithmRequest, classify_algorithm),
    "tools.algo.synthesize_oracle": (AlgoSynthesizeOracleRequest, synthesize_oracle),
    "tools.algo.build_diffusion_operator": (AlgoBuildDiffusionOperatorRequest, build_diffusion_operator),
    "tools.algo.simulate_statevector": (AlgoSimulateStatevectorRequest, simulate_statevector),
    "tools.algo.analyze_quantum_speedup": (AlgoAnalyzeQuantumSpeedupRequest, analyze_quantum_speedup),

    # 4. Quantum Circuit Studio (17-21)
    "tools.circuit.build_quantum_circuit": (CircuitBuildRequest, build_quantum_circuit),
    "tools.circuit.bind_parameters": (CircuitBindParametersRequest, bind_parameters),
    "tools.circuit.transpile_passes": (CircuitTranspilePassesRequest, transpile_passes),
    "tools.circuit.simulate_noisy": (CircuitSimulateNoisyRequest, simulate_noisy),
    "tools.circuit.render_continuous": (CircuitRenderContinuousRequest, render_continuous),

    # 5. Quantum Chemistry Studio (22-27)
    "tools.chem.ingest_geometry": (ChemIngestGeometryRequest, ingest_geometry),
    "tools.chem.compute_scf_integrals": (ChemComputeSCFIntegralsRequest, compute_scf_integrals),
    "tools.chem.select_active_space": (ChemSelectActiveSpaceRequest, select_active_space),
    "tools.chem.fermion_to_qubit_mapping": (ChemFermionToQubitMappingRequest, fermion_to_qubit_mapping),
    "tools.chem.build_chemistry_ansatz": (ChemBuildChemistryAnsatzRequest, build_chemistry_ansatz),
    "tools.chem.solve_ground_state_vqe": (ChemSolveGroundStateVQERequest, solve_ground_state_vqe),

    # 6. Quantum Machine Learning Studio (28-33)
    "tools.qml.normalize_features": (QMLNormalizeFeaturesRequest, normalize_features),
    "tools.qml.build_feature_map": (QMLBuildFeatureMapRequest, build_feature_map),
    "tools.qml.build_variational_ansatz": (QMLBuildVariationalAnsatzRequest, build_variational_ansatz),
    "tools.qml.train_classifier": (QMLTrainClassifierRequest, train_classifier),
    "tools.qml.benchmark_classical": (QMLBenchmarkClassicalRequest, qml_benchmark),
    "tools.qml.predict_sample": (QMLPredictSampleRequest, predict_sample),
}

def invoke_quantum_tool(tool_name: str, params: dict[str, Any]) -> dict[str, Any]:
    if tool_name not in TOOL_DISPATCH_TABLE:
        raise ValueError(f"Unknown quantum tool: {tool_name}. Total registered tools: {len(TOOL_DISPATCH_TABLE)}")
        
    req_model, handler = TOOL_DISPATCH_TABLE[tool_name]
    parsed_req = req_model(**params)
    result = handler(parsed_req)
    return result.model_dump()

def get_all_tool_schemas() -> list[dict[str, Any]]:
    schemas = []
    for tool_name, (req_model, _) in TOOL_DISPATCH_TABLE.items():
        schemas.append({
            "type": "function",
            "function": {
                "name": tool_name,
                "description": req_model.__doc__ or f"Execute quantum primitive: {tool_name}",
                "parameters": req_model.model_json_schema()
            }
        })
    return schemas
