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
from .simulator_tools import (
    execute_dwave_sampler, execute_qiskit_aer, execute_google_ortools
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

    # 7. QPU / Simulators Studio (34-36)
    "tools.sim.dwave_sampler": (SimDwaveSamplerRequest, execute_dwave_sampler),
    "tools.sim.qiskit_aer": (SimQiskitAerRequest, execute_qiskit_aer),
    "tools.sim.google_ortools": (SimGoogleORToolsRequest, execute_google_ortools),
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

# =====================================================================
# DECLARATIVE CAPABILITY CATALOGUE FOR ALL 36 QUANTUM TOOLS (PHASE 3)
# =====================================================================
from .tool_models import ToolCapabilitySchema

CAPABILITY_CATALOGUE: Dict[str, ToolCapabilitySchema] = {
    # 1. OPTIMIZATION STUDIO (6)
    "tools.opt.formulate_problem": ToolCapabilitySchema(
        id="tools.opt.formulate_problem",
        name="Problem Formulator",
        domain="optimization",
        description="Extracts decision variables, bounds & constraint equations from natural language specifications.",
        accepts=["NaturalLanguageDescription", "VariableList", "ConstraintList"],
        produces=["OptimizationModel", "VariableNames", "ObjectiveTerms"],
        qubit_constraints="N/A (Classical Formulation)",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.opt.translate_to_qubo": ToolCapabilitySchema(
        id="tools.opt.translate_to_qubo",
        name="QUBO Matrix Synthesizer",
        domain="optimization",
        description="Converts constrained optimization models into binary quadratic forms (symmetric Q-matrix) via Lagrange penalty multipliers.",
        accepts=["ObjectiveTerms", "ConstraintEquations"],
        produces=["QUBOMatrix", "PenaltyMultiplier"],
        qubit_constraints="1 to 5000 variables",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.opt.map_quantum_solver": ToolCapabilitySchema(
        id="tools.opt.map_quantum_solver",
        name="Ising Hamiltonian Mapper",
        domain="optimization",
        description="Maps symmetric QUBO matrices to Pauli-Z Ising Spin Hamiltonians (H = sum h_i Z_i + sum J_ij Z_i Z_j) for QAOA or D-Wave BQM graph embeddings.",
        accepts=["QUBOMatrix"],
        produces=["IsingHamiltonian", "LinearBiases", "QuadraticCouplings"],
        qubit_constraints="1 to 127 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.opt.execute_solver": ToolCapabilitySchema(
        id="tools.opt.execute_solver",
        name="QAOA & Annealing Solver",
        domain="optimization",
        description="Executes QAOA parameter optimization or D-Wave Simulated Annealing for lowest energy samples and optimal bitstrings.",
        accepts=["QUBOMatrix", "IsingHamiltonian", "Shots"],
        produces=["BitstringDistribution", "LowestEnergy", "OptimalSample"],
        qubit_constraints="1 to 32 (QAOA), 1 to 5000 (D-Wave Annealer)",
        cost_tier="Free (Local Runtime)",
        alternatives=["tools.sim.dwave_sampler", "tools.sim.google_ortools"]
    ),
    "tools.opt.decode_solution": ToolCapabilitySchema(
        id="tools.opt.decode_solution",
        name="Bitstring Solution Decoder",
        domain="optimization",
        description="Decodes measured binary bitstrings into domain variables (e.g. portfolio asset allocations) and validates constraint feasibility.",
        accepts=["BitstringDistribution", "VariableNames"],
        produces=["SelectedVariables", "ConstraintFeasibility"],
        qubit_constraints="N/A",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.opt.benchmark_classical": ToolCapabilitySchema(
        id="tools.opt.benchmark_classical",
        name="Optimization Benchmarker",
        domain="optimization",
        description="Evaluates quantum optimization performance against exact classical solvers (PuLP, SimAn, OR-Tools).",
        accepts=["QUBOMatrix", "QuantumSolution"],
        produces=["ClassicalSolution", "QuantumSpeedupRatio", "EnergyGap"],
        qubit_constraints="N/A",
        cost_tier="Free (Local Runtime)"
    ),

    # 2. QUANTUM CHEMISTRY STUDIO (6)
    "tools.chem.ingest_geometry": ToolCapabilitySchema(
        id="tools.chem.ingest_geometry",
        name="Molecular Geometry Ingester",
        domain="chemistry",
        description="Parses XYZ molecular coordinates, atomic numbers, basis sets (STO-3G, 6-31G), and nuclear repulsion energies.",
        accepts=["GeometryXYZ", "BasisSet"],
        produces=["MolecularStructure", "TotalElectrons", "NuclearRepulsionEnergy"],
        qubit_constraints="N/A",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.chem.select_active_space": ToolCapabilitySchema(
        id="tools.chem.select_active_space",
        name="CASCI Active Space Reducer",
        domain="chemistry",
        description="Isolates chemically active orbitals (HOMO/LUMO) into a reduced Complete Active Space (CAS) to fit available QPU qubits.",
        accepts=["MolecularStructure", "ActiveElectrons", "ActiveOrbitals"],
        produces=["ReducedActiveSpace", "AllocatedQubitCount", "CoreEnergyOffset"],
        qubit_constraints="2 to 32 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.chem.compute_scf_integrals": ToolCapabilitySchema(
        id="tools.chem.compute_scf_integrals",
        name="Hartree-Fock SCF Integral Engine",
        domain="chemistry",
        description="Computes 1-electron core Hamiltonian tensors (h_pq) and 2-electron Coulomb/Exchange repulsion tensors (g_pqrs) via PySCF.",
        accepts=["MolecularStructure", "ReducedActiveSpace"],
        produces=["OneElectronIntegrals", "TwoElectronIntegrals", "HartreeFockEnergy"],
        qubit_constraints="N/A",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.chem.fermion_to_qubit_mapping": ToolCapabilitySchema(
        id="tools.chem.fermion_to_qubit_mapping",
        name="Fermion-to-Pauli Mapper",
        domain="chemistry",
        description="Transforms fermionic creation/annihilation operators into qubit Pauli operator sums (Jordan-Wigner, Bravyi-Kitaev, Parity).",
        accepts=["OneElectronIntegrals", "TwoElectronIntegrals", "MappingType"],
        produces=["PauliSumOpHamiltonian", "QubitOperatorCount"],
        qubit_constraints="2 to 32 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.chem.build_chemistry_ansatz": ToolCapabilitySchema(
        id="tools.chem.build_chemistry_ansatz",
        name="UCCSD Chemistry Ansatz Builder",
        domain="chemistry",
        description="Constructs Unitary Coupled Cluster (UCCSD) or Hardware-Efficient variational ansatz circuits with particle-conserving excitation gates.",
        accepts=["ActiveQubits", "ActiveElectrons", "AnsatzType"],
        produces=["ParameterizedCircuit", "VariationalParameterCount", "CircuitDepth"],
        qubit_constraints="2 to 32 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.chem.solve_ground_state_vqe": ToolCapabilitySchema(
        id="tools.chem.solve_ground_state_vqe",
        name="VQE Ground State Solver",
        domain="chemistry",
        description="Executes Variational Quantum Eigensolver (VQE) to compute molecular ground state energy within chemical accuracy (< 1.6 mHa).",
        accepts=["PauliSumOpHamiltonian", "ParameterizedCircuit", "Optimizer"],
        produces=["GroundStateEnergy", "ChemicalAccuracyError", "OptimalStatevector"],
        qubit_constraints="2 to 28 qubits (Aer), 2 to 127 (QPU)",
        cost_tier="Free (Local Runtime)",
        alternatives=["tools.chem.compute_scf_integrals"]
    ),

    # 3. QUANTUM ALGORITHMS STUDIO (5)
    "tools.algo.classify_algorithm": ToolCapabilitySchema(
        id="tools.algo.classify_algorithm",
        name="Algorithm Classifier",
        domain="algorithms",
        description="Classifies computational problems into optimal quantum algorithm archetypes (Grover, Shor, QPE, HHL).",
        accepts=["ProblemType", "InputDimension"],
        produces=["AlgorithmFamily", "TheoreticalSpeedup", "EstimatedQubitCount"],
        qubit_constraints="N/A",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.algo.synthesize_oracle": ToolCapabilitySchema(
        id="tools.algo.synthesize_oracle",
        name="Phase Oracle Synthesizer",
        domain="algorithms",
        description="Constructs unitary phase or boolean quantum oracles for targeted marked search bitstrings.",
        accepts=["TargetMarkedStates", "QubitCount"],
        produces=["OracleCircuit", "GateCount"],
        qubit_constraints="1 to 16 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.algo.build_diffusion_operator": ToolCapabilitySchema(
        id="tools.algo.build_diffusion_operator",
        name="Grover Diffusion Architect",
        domain="algorithms",
        description="Builds Grover inversion-about-the-mean diffusion operators and calculates optimal iteration counts (pi/4 * sqrt(N)).",
        accepts=["QubitCount"],
        produces=["DiffusionCircuit", "OptimalIterations"],
        qubit_constraints="1 to 16 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.algo.simulate_statevector": ToolCapabilitySchema(
        id="tools.algo.simulate_statevector",
        name="Statevector Amplitude Analyzer",
        domain="algorithms",
        description="Computes exact statevector evolution, amplitude amplification tracking, and target state probabilities.",
        accepts=["QuantumCircuit", "Shots"],
        produces=["StateAmplitudes", "SuccessProbability", "TopMeasuredBitstrings"],
        qubit_constraints="1 to 28 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.algo.analyze_quantum_speedup": ToolCapabilitySchema(
        id="tools.algo.analyze_quantum_speedup",
        name="Quantum Advantage Evaluator",
        domain="algorithms",
        description="Calculates runtime crossover thresholds where quantum algorithms surpass classical algorithms under physical noise.",
        accepts=["AlgorithmType", "InputSizeRange"],
        produces=["CrossoverPoint", "ClassicalComplexity", "QuantumComplexity"],
        qubit_constraints="N/A",
        cost_tier="Free (Local Runtime)"
    ),

    # 4. QUANTUM CIRCUITS STUDIO (5)
    "tools.circuit.build_quantum_circuit": ToolCapabilitySchema(
        id="tools.circuit.build_quantum_circuit",
        name="Quantum Register Builder",
        domain="circuits",
        description="Instantiates base quantum/classical registers and appends single and multi-qubit gate operations.",
        accepts=["QubitCount", "ClassicalBitCount", "GateOperations"],
        produces=["QuantumCircuit", "CircuitDepth", "GateCounts"],
        qubit_constraints="1 to 127 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.circuit.bind_parameters": ToolCapabilitySchema(
        id="tools.circuit.bind_parameters",
        name="Variational Parameter Binder",
        domain="circuits",
        description="Declares symbolic parameter vectors and binds continuous numerical floating-point values.",
        accepts=["ParameterizedCircuit", "ParameterValues"],
        produces=["BoundCircuit"],
        qubit_constraints="1 to 127 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.circuit.transpile_passes": ToolCapabilitySchema(
        id="tools.circuit.transpile_passes",
        name="Transpiler Pass Optimizer",
        domain="circuits",
        description="Applies Level-1 to Level-3 Qiskit compiler pass managers (CommutativeCancellation, ConsolidateBlocks, CXCancellation).",
        accepts=["CircuitCode", "OptimizationLevel", "BasisGates"],
        produces=["TranspiledCircuit", "DepthReductionPercent", "CNOTReductionPercent"],
        qubit_constraints="1 to 127 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.circuit.simulate_noisy": ToolCapabilitySchema(
        id="tools.circuit.simulate_noisy",
        name="Thermal & Depolarizing Noise Simulator",
        domain="circuits",
        description="Simulates realistic QPU noise models including T1/T2 thermal relaxation, depolarizing channels, and readout errors.",
        accepts=["QuantumCircuit", "T1Microseconds", "T2Microseconds", "DepolarizingErrorRate"],
        produces=["NoisyBitstringDistribution", "FidelityDropPercent"],
        qubit_constraints="1 to 24 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.circuit.render_continuous": ToolCapabilitySchema(
        id="tools.circuit.render_continuous",
        name="Continuous Circuit Drawer",
        domain="circuits",
        description="Renders unwrapped ASCII/Unicode quantum circuit diagrams with infinite horizontal scrolling (zero vertical fold wrapping).",
        accepts=["CircuitCode"],
        produces=["ContinuousASCII", "FormattedUnicode"],
        qubit_constraints="1 to 127 qubits",
        cost_tier="Free (Local Runtime)"
    ),

    # 5. QUANTUM MACHINE LEARNING STUDIO (6)
    "tools.qml.normalize_features": ToolCapabilitySchema(
        id="tools.qml.normalize_features",
        name="Bloch Sphere Feature Scaler",
        domain="qml",
        description="Applies MinMax feature scaling into [0, pi] and PCA dimensionality reduction for quantum state embedding.",
        accepts=["RawFeatures", "TargetDimension"],
        produces=["NormalizedFeatures", "BlochAngles", "PCAExplainedVariance"],
        qubit_constraints="N/A",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.qml.build_feature_map": ToolCapabilitySchema(
        id="tools.qml.build_feature_map",
        name="Quantum Feature Map Synthesizer",
        domain="qml",
        description="Generates ZZFeatureMap or PauliFeatureMap quantum embedding circuits for high-dimensional Hilbert space mapping.",
        accepts=["FeatureDimension", "FeatureMapType", "Reps"],
        produces=["FeatureMapCircuit", "EntanglementStructure"],
        qubit_constraints="2 to 16 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.qml.build_variational_ansatz": ToolCapabilitySchema(
        id="tools.qml.build_variational_ansatz",
        name="QML Variational Ansatz Builder",
        domain="qml",
        description="Constructs parameterized RealAmplitudes or EfficientSU2 classification ansatz circuits.",
        accepts=["QubitCount", "AnsatzType", "Reps"],
        produces=["AnsatzCircuit", "WeightCount"],
        qubit_constraints="2 to 16 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.qml.train_classifier": ToolCapabilitySchema(
        id="tools.qml.train_classifier",
        name="VQC Classifier Trainer",
        domain="qml",
        description="Trains Variational Quantum Classifiers (VQC) using gradient-free SPSA / COBYLA optimizers on cross-entropy loss.",
        accepts=["TrainingFeatures", "Labels", "FeatureMap", "Ansatz", "MaxEpochs"],
        produces=["TrainedWeights", "TrainingLossHistory", "FinalTrainAccuracy"],
        qubit_constraints="2 to 12 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.qml.predict_sample": ToolCapabilitySchema(
        id="tools.qml.predict_sample",
        name="Quantum Sample Predictor",
        domain="qml",
        description="Infers class labels and quantum state probabilities for unseen test samples using trained VQC / QSVM models.",
        accepts=["SampleFeatures", "TrainedWeights"],
        produces=["PredictedClass", "ConfidenceProbabilities", "StatevectorFidelity"],
        qubit_constraints="2 to 12 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.qml.benchmark_classical": ToolCapabilitySchema(
        id="tools.qml.benchmark_classical",
        name="QML Classical Benchmarker",
        domain="qml",
        description="Evaluates Quantum Classifier accuracy and generalization gap against Classical SVM (RBF) and Random Forests.",
        accepts=["DatasetName", "QuantumAccuracy", "TestSize"],
        produces=["ClassicalSVMAccuracy", "RandomForestAccuracy", "GeneralizationGap"],
        qubit_constraints="N/A",
        cost_tier="Free (Local Runtime)"
    ),

    # 6. QUANTUM ACADEMY STUDIO (5)
    "tools.academy.concept_explainer": ToolCapabilitySchema(
        id="tools.academy.concept_explainer",
        name="Concept Decomposer",
        domain="academy",
        description="Decomposes deep quantum mechanics concepts (superposition, entanglement, decoherence) into intuitive physical analogies.",
        accepts=["ConceptTopic", "TargetLevel"],
        produces=["AnalogyExplanation", "CoreEquations", "IntuitionCheckpoints"],
        qubit_constraints="N/A",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.academy.math_derivation": ToolCapabilitySchema(
        id="tools.academy.math_derivation",
        name="Dirac Proof Engine",
        domain="academy",
        description="Generates step-by-step mathematical proofs, Dirac bra-ket equations, and matrix Kronecker products.",
        accepts=["DerivationTarget"],
        produces=["StepByStepProof", "DiracLatex", "MatrixEquations"],
        qubit_constraints="N/A",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.academy.generate_tutorial_circuit": ToolCapabilitySchema(
        id="tools.academy.generate_tutorial_circuit",
        name="Tutorial Circuit Builder",
        domain="academy",
        description="Synthesizes educational starter circuits (Bell State, GHZ, Teleportation) with state evolution checkpoints.",
        accepts=["TutorialTopic"],
        produces=["CircuitCode", "StatevectorCheckpoints", "ExplanationGuide"],
        qubit_constraints="1 to 8 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.academy.socratic_assessment": ToolCapabilitySchema(
        id="tools.academy.socratic_assessment",
        name="Socratic Diagnostic",
        domain="academy",
        description="Generates adaptive diagnostic questions and multi-choice quizzes to verify student comprehension.",
        accepts=["Topic", "Difficulty"],
        produces=["QuestionText", "Options", "ExplanationAnswer"],
        qubit_constraints="N/A",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.academy.misconception_debugger": ToolCapabilitySchema(
        id="tools.academy.misconception_debugger",
        name="Misconception Debugger",
        domain="academy",
        description="Analyzes student statements to detect and clarify fundamental quantum physics misunderstandings (e.g. no-cloning violations).",
        accepts=["StudentStatement"],
        produces=["DetectedMisconception", "PhysicsCorrection", "CounterExampleProof"],
        qubit_constraints="N/A",
        cost_tier="Free (Local Runtime)"
    ),

    # 7. QPU SIMULATORS & SOLVERS (3)
    "tools.sim.qiskit_aer": ToolCapabilitySchema(
        id="tools.sim.qiskit_aer",
        name="Qiskit Aer Simulator",
        domain="simulators",
        description="C++ statevector and density matrix simulator executing arbitrary gate circuits with exact probabilities.",
        accepts=["QuantumCircuit", "Shots"],
        produces=["Statevector", "Counts", "ExecutionLatency"],
        qubit_constraints="1 to 28 qubits",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.sim.dwave_sampler": ToolCapabilitySchema(
        id="tools.sim.dwave_sampler",
        name="D-Wave BQM Sampler",
        domain="simulators",
        description="D-Wave Ocean Binary Quadratic Model (BQM) simulated annealer executing 5000+ variable optimization models.",
        accepts=["QUBOMatrix", "NumReads"],
        produces=["SampleSet", "LowestEnergy", "GroundStateFraction"],
        qubit_constraints="1 to 5000 variables",
        cost_tier="Free (Local Runtime)"
    ),
    "tools.sim.google_ortools": ToolCapabilitySchema(
        id="tools.sim.google_ortools",
        name="Google OR-Tools CP-SAT Solver",
        domain="simulators",
        description="Exact integer programming and constraint programming solver benchmarking quantum solutions against classical baselines.",
        accepts=["OptimizationModel"],
        produces=["OptimalObjective", "SolutionVector", "SolveStatus"],
        qubit_constraints="N/A",
        cost_tier="Free (Local Runtime)"
    )
}

def get_capability_catalogue() -> Dict[str, ToolCapabilitySchema]:
    """Retrieve declarative capability catalogue for all 36 quantum tools."""
    return CAPABILITY_CATALOGUE

def get_tools_by_domain(domain: str) -> List[ToolCapabilitySchema]:
    """Retrieve all tools for a specific scientific domain."""
    return [t for t in CAPABILITY_CATALOGUE.values() if t.domain == domain]
