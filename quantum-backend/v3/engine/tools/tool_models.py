"""
Pydantic Schemas for the 33 Quantum AI Tools in Quantum Guru IDE.
"""

from typing import List, Dict, Any, Optional, Tuple, Union
from pydantic import BaseModel, Field

# ==========================================
# 1. OPTIMIZATION STUDIO (TOOLS 01 - 06)
# ==========================================
class OptFormulateProblemRequest(BaseModel):
    description: str
    variables: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    maximize: bool = False

class OptFormulateProblemResponse(BaseModel):
    var_names: list[str]
    objective_terms: dict[str, float]
    constraint_exprs: list[dict[str, Any]]
    bounds: dict[str, tuple[float, float]]

class OptTranslateToQUBORequest(BaseModel):
    objective_terms: dict[str, float]
    constraint_exprs: list[dict[str, Any]] = Field(default_factory=list)
    penalty_multiplier: float = 10.0

class OptTranslateToQUBOResponse(BaseModel):
    qubo_matrix: list[list[float]]
    var_names: list[str]
    linear_biases: dict[str, float]
    quadratic_couplings: dict[str, float]
    offset: float

class OptMapQuantumSolverRequest(BaseModel):
    qubo_matrix: list[list[float]]
    var_names: list[str] = Field(default_factory=list)
    solver_target: str = "qaoa"  # "qaoa", "dwave_sa", "cqm"
    p_layers: int = 1

class OptMapQuantumSolverResponse(BaseModel):
    ising_hamiltonian: str
    num_qubits: int
    solver_target: str
    qaoa_circuit_template: str

class OptExecuteSolverRequest(BaseModel):
    solver_target: str = "dwave_sa"  # "dwave_sa", "qaoa"
    qubo_matrix: list[list[float]]
    var_names: list[str] = Field(default_factory=list)
    shots: int = 1024
    num_reads: int = 200

class OptExecuteSolverResponse(BaseModel):
    optimal_bitstring: str
    ground_energy: float
    raw_samples: list[dict[str, Any]]
    execution_time_sec: float

class OptDecodeSolutionRequest(BaseModel):
    optimal_bitstring: str
    var_names: list[str]
    constraint_exprs: list[dict[str, Any]] = Field(default_factory=list)

class OptDecodeSolutionResponse(BaseModel):
    decoded_solution: dict[str, float]
    is_feasible: bool
    penalty_violations: list[str]
    final_cost: float

class OptBenchmarkClassicalRequest(BaseModel):
    qubo_matrix: list[list[float]]
    quantum_cost: float
    execution_time_sec: float

class OptBenchmarkClassicalResponse(BaseModel):
    classical_optimal_cost: float
    optimality_gap_percent: float
    quantum_speedup_ratio: float
    comparison_table: list[dict[str, Any]]


# ==========================================
# 2. QUANTUM ACADEMY (TOOLS 07 - 11)
# ==========================================
class AcademyConceptExplainerRequest(BaseModel):
    topic: str
    depth_level: str = "beginner"  # "beginner", "undergrad", "research"
    focus_area: str = "intuition"

class AcademyConceptExplainerResponse(BaseModel):
    concept_title: str
    physical_intuition: str
    computational_significance: str
    key_takeaways: list[str]

class AcademyMathDerivationRequest(BaseModel):
    equation_type: str
    operators: list[str] = Field(default_factory=list)
    target_proof: str = ""

class AcademyMathDerivationResponse(BaseModel):
    latex_derivation: list[str]
    matrix_representation: list[list[str]]
    intermediate_statevectors: list[str]

class AcademyGenerateTutorialCircuitRequest(BaseModel):
    phenomenon: str = "bell_state"  # "bell_state", "teleportation", "superdense_coding"
    num_qubits: int = 2

class AcademyGenerateTutorialCircuitResponse(BaseModel):
    qiskit_code: str
    ascii_circuit: str
    state_evolution_steps: list[dict[str, Any]]

class AcademySocraticAssessmentRequest(BaseModel):
    topic_id: str
    difficulty: int = 1

class AcademySocraticAssessmentResponse(BaseModel):
    question_text: str
    options: list[str]
    correct_option_index: int
    hint: str
    explanation: str

class AcademyMisconceptionDebuggerRequest(BaseModel):
    student_statement_or_code: str
    target_concept: str

class AcademyMisconceptionDebuggerResponse(BaseModel):
    has_misconception: bool
    misconception_type: str
    clarification: str
    corrected_code_or_proof: str


# ==========================================
# 3. QUANTUM ALGORITHMS (TOOLS 12 - 16)
# ==========================================
class AlgoClassifyAlgorithmRequest(BaseModel):
    problem_type: str  # "search", "factoring", "phase_estimation", "linear_systems"
    input_dimension: int = 4

class AlgoClassifyAlgorithmResponse(BaseModel):
    recommended_algorithm: str
    classical_complexity: str
    quantum_complexity: str
    theoretical_speedup: str

class AlgoSynthesizeOracleRequest(BaseModel):
    target_marked_states: list[str] = Field(default_factory=lambda: ["11"])
    num_qubits: int = 2

class AlgoSynthesizeOracleResponse(BaseModel):
    oracle_circuit_code: str
    ascii_oracle: str
    num_qubits: int

class AlgoBuildDiffusionOperatorRequest(BaseModel):
    num_qubits: int = 2
    algorithm: str = "grover"

class AlgoBuildDiffusionOperatorResponse(BaseModel):
    full_algorithm_circuit: str
    ascii_circuit: str
    optimal_iterations: int
    expected_success_probability: float

class AlgoSimulateStatevectorRequest(BaseModel):
    circuit_code: str
    shots: int = 1024

class AlgoSimulateStatevectorResponse(BaseModel):
    statevector: list[str]
    probabilities: dict[str, float]
    fidelity: float

class AlgoAnalyzeQuantumSpeedupRequest(BaseModel):
    num_qubits: int
    classical_eval_sec: float = 0.001
    quantum_gate_time_ns: float = 100.0

class AlgoAnalyzeQuantumSpeedupResponse(BaseModel):
    crossover_qubit_threshold: int
    quantum_runtime_estimate_ms: float
    advantage_achieved: bool


# ==========================================
# 4. QUANTUM CIRCUITS (TOOLS 17 - 21)
# ==========================================
class CircuitBuildRequest(BaseModel):
    num_qubits: int = 4
    num_clbits: int = 4
    gate_operations: list[dict[str, Any]] = Field(default_factory=list)

class CircuitBuildResponse(BaseModel):
    qiskit_code: str
    initial_depth: int
    initial_gate_count: dict[str, int]
    num_qubits: int

class CircuitBindParametersRequest(BaseModel):
    circuit_code: str
    parameter_values: list[float]

class CircuitBindParametersResponse(BaseModel):
    bound_circuit_code: str
    bound_parameters_count: int
    is_fully_bound: bool

class CircuitTranspilePassesRequest(BaseModel):
    circuit_code: str
    optimization_level: int = 2
    basis_gates: list[str] = Field(default_factory=lambda: ["rz", "sx", "x", "cx"])

class CircuitTranspilePassesResponse(BaseModel):
    transpiled_circuit_code: str
    depth_before: int
    depth_after: int
    depth_reduction_percent: float
    cnot_count_before: int
    cnot_count_after: int

class CircuitSimulateNoisyRequest(BaseModel):
    circuit_code: str
    shots: int = 1024
    t1_us: float = 50.0
    t2_us: float = 70.0
    gate_error_rate: float = 0.001

class CircuitSimulateNoisyResponse(BaseModel):
    noisy_counts: dict[str, int]
    noisy_fidelity: float
    ideal_counts: dict[str, int]

class CircuitRenderContinuousRequest(BaseModel):
    circuit_code: str

class CircuitRenderContinuousResponse(BaseModel):
    continuous_circuit_text: str
    total_qubit_lines: int
    horizontal_character_width: int


# ==========================================
# 5. QUANTUM CHEMISTRY (TOOLS 22 - 27)
# ==========================================
class ChemIngestGeometryRequest(BaseModel):
    geometry_xyz: str
    basis_set: str = "sto-3g"
    charge: int = 0
    spin: int = 0

class ChemIngestGeometryResponse(BaseModel):
    molecule_formula: str
    total_electrons: int
    total_atomic_orbitals: int
    nuclear_repulsion_energy: float

class ChemComputeSCFIntegralsRequest(BaseModel):
    geometry_xyz: str
    basis_set: str = "sto-3g"
    charge: int = 0
    spin: int = 0

class ChemComputeSCFIntegralsResponse(BaseModel):
    hf_energy: float
    num_orbitals: int
    one_electron_integrals_shape: list[int]
    two_electron_integrals_shape: list[int]

class ChemSelectActiveSpaceRequest(BaseModel):
    geometry_xyz: str
    basis_set: str = "sto-3g"
    active_electrons: int = 2
    active_spatial_orbitals: int = 2

class ChemSelectActiveSpaceResponse(BaseModel):
    cas_energy: float
    active_qubits: int
    active_electrons: int
    active_spatial_orbitals: int

class ChemFermionToQubitMappingRequest(BaseModel):
    active_qubits: int = 4
    mapping: str = "jordan_wigner"  # "jordan_wigner", "bravyi_kitaev", "parity"

class ChemFermionToQubitMappingResponse(BaseModel):
    pauli_hamiltonian: str
    num_pauli_terms: int
    active_qubits: int

class ChemBuildChemistryAnsatzRequest(BaseModel):
    active_qubits: int = 4
    active_electrons: int = 2
    ansatz_type: str = "uccsd"
    reps: int = 1

class ChemBuildChemistryAnsatzResponse(BaseModel):
    chemistry_ansatz_code: str
    num_variational_parameters: int
    circuit_depth: int

class ChemSolveGroundStateVQERequest(BaseModel):
    molecule_name: str = "H2"
    geometry_xyz: str = "H 0.0 0.0 0.0; H 0.0 0.0 0.735"
    basis_set: str = "sto-3g"
    active_electrons: int = 2
    active_spatial_orbitals: int = 2
    max_iter: int = 50

class ChemSolveGroundStateVQEResponse(BaseModel):
    ground_state_energy_hartree: float
    hf_energy_hartree: float
    fci_energy_hartree: float
    chemical_accuracy_reached: bool
    error_from_fci_mha: float
    vqe_iterations_history: list[float]


# ==========================================
# 6. QUANTUM MACHINE LEARNING (TOOLS 28 - 33)
# ==========================================
class QMLNormalizeFeaturesRequest(BaseModel):
    raw_data_matrix: list[list[float]]
    target_qubits: int = 4

class QMLNormalizeFeaturesResponse(BaseModel):
    normalized_features: list[list[float]]
    explained_variance_ratio: list[float]
    feature_dimension: int

class QMLBuildFeatureMapRequest(BaseModel):
    num_qubits: int = 4
    reps: int = 1
    feature_map_type: str = "ZZFeatureMap"
    entanglement: str = "linear"

class QMLBuildFeatureMapResponse(BaseModel):
    feature_map_code: str
    num_encoded_features: int
    circuit_depth: int

class QMLBuildVariationalAnsatzRequest(BaseModel):
    num_qubits: int = 4
    reps: int = 2
    ansatz_type: str = "RealAmplitudes"
    entanglement: str = "linear"

class QMLBuildVariationalAnsatzResponse(BaseModel):
    ansatz_circuit_code: str
    total_weights_count: int
    circuit_depth: int

class QMLTrainClassifierRequest(BaseModel):
    model_type: str = "qsvm"  # "qsvm", "vqc"
    num_qubits: int = 4
    sample_size: int = 20

class QMLTrainClassifierResponse(BaseModel):
    model_type: str
    train_accuracy: float
    trained_weights: list[float]
    training_time_sec: float

class QMLBenchmarkClassicalRequest(BaseModel):
    qsvm_accuracy: float = 0.95
    vqc_accuracy: float = 0.90

class QMLBenchmarkClassicalResponse(BaseModel):
    qsvm_accuracy: float
    vqc_accuracy: float
    classical_accuracies: dict[str, float]
    comparison_summary: str

class QMLPredictSampleRequest(BaseModel):
    sample_vector: list[float]
    model_type: str = "qsvm"
    trained_weights: list[float] = Field(default_factory=list)

class QMLPredictSampleResponse(BaseModel):
    predicted_class: int
    class_probability: float
    qsvm_prediction: int
    vqc_prediction: int
    classical_prediction: int
    confidence_margin: float


# ── QPU / Simulator Models (Tools 34 - 36) ──────────────────────────────────
class SimDwaveSamplerRequest(BaseModel):
    qubo_matrix: List[List[float]] = Field(..., description="Upper-triangular QUBO Q-matrix")
    var_names: Optional[List[str]] = Field(default_factory=list)
    num_reads: int = Field(1000, description="Number of annealing reads")

class SimDwaveSamplerResponse(BaseModel):
    optimal_bitstring: str
    ground_energy: float
    sample_distribution: Dict[str, int]
    num_reads: int
    execution_time_ms: float
    annealing_schedule: str

class SimQiskitAerRequest(BaseModel):
    num_qubits: int = Field(4, description="Number of qubits")
    shots: int = Field(1024, description="Number of measurement shots")
    method: str = Field("statevector", description="Simulation method")

class SimQiskitAerResponse(BaseModel):
    num_qubits: int
    shots_sampled: int
    expectation_val_z: float
    fidelity: float
    probabilities: Dict[str, float]
    execution_time_ms: float
    simulation_method: str

class SimGoogleORToolsRequest(BaseModel):
    variables: List[str] = Field(default_factory=lambda: ["x0", "x1", "x2", "x3"])
    constraints: List[str] = Field(default_factory=lambda: ["x0 + x1 + x2 + x3 == 2"])
    timeout_sec: float = Field(5.0)

class SimGoogleORToolsResponse(BaseModel):
    status: str
    optimal_objective: float
    optimality_gap: float
    solution_assignments: Dict[str, int]
    search_nodes_explored: int
    solve_time_ms: float
    solver_engine: str

# ==========================================
# DECLARATIVE TOOL CAPABILITY SCHEMA (PHASE 3)
# ==========================================
class ToolCapabilitySchema(BaseModel):
    id: str
    name: str
    domain: str  # optimization, chemistry, algorithms, circuits, qml, academy, simulators
    description: str
    accepts: List[str] = Field(default_factory=list)
    produces: List[str] = Field(default_factory=list)
    qubit_constraints: Optional[str] = "1 to 32 qubits"
    cost_tier: str = "Free (Local Runtime)"
    alternatives: List[str] = Field(default_factory=list)
