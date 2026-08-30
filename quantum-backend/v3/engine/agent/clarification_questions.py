"""
Quantum Guru V4 - Domain Clarification Question System
Catalogue of 40 Domain-Specific Clarification Questions across all 4 pipelines.
Enables autonomous agent to request user decision on underspecified parameters.
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class ClarificationOption(BaseModel):
    label: str
    value: str
    is_recommended: bool = False
    description: Optional[str] = None


class ClarificationQuestion(BaseModel):
    id: str
    domain: str  # chemistry, optimization, qml, circuits
    trigger_keywords: List[str]
    question: str
    options: List[ClarificationOption]
    default_value: str


# =====================================================================
# 40 CURATED DOMAIN QUESTIONS ACROSS 4 PIPELINES
# =====================================================================
CLARIFICATION_QUESTION_CATALOGUE: Dict[str, List[ClarificationQuestion]] = {
    # -----------------------------------------------------------------
    # 1. 🧪 QUANTUM CHEMISTRY CAS-VQE (10 Questions)
    # -----------------------------------------------------------------
    "chemistry": [
        ClarificationQuestion(
            id="chem_active_space",
            domain="chemistry",
            trigger_keywords=["active space", "cas", "orbitals", "electrons"],
            question="How would you like to partition the molecular orbital active space for this molecule?",
            options=[
                ClarificationOption(label="CAS(4,4) — 4e, 4 orbitals (8 qubits)", value="cas_4_4", is_recommended=True, description="Optimal balance between chemical correlation and qubit count."),
                ClarificationOption(label="Minimal CAS(2,2) — HOMO-LUMO (4 qubits)", value="cas_2_2", description="Fastest simulation with essential frontier orbitals."),
                ClarificationOption(label="Full CI Active Space — All valence orbitals", value="full_cas", description="Maximum accuracy, high qubit count.")
            ],
            default_value="cas_4_4"
        ),
        ClarificationQuestion(
            id="chem_fermion_mapping",
            domain="chemistry",
            trigger_keywords=["mapping", "jordan wigner", "bravyi", "parity", "qubit encoding"],
            question="Which fermionic operator transformation should we apply to encode the Hamiltonian?",
            options=[
                ClarificationOption(label="Jordan-Wigner (Standard Pauli Strings)", value="jordan_wigner", is_recommended=True, description="Direct 1-to-1 mapping of fermionic occupations to qubit states."),
                ClarificationOption(label="Bravyi-Kitaev (Logarithmic Operator Weight)", value="bravyi_kitaev", description="Reduces Pauli string length to O(log N)."),
                ClarificationOption(label="Parity Mapping (2-Qubit Reduction)", value="parity", description="Eliminates 2 qubits using particle-number Z2 symmetries.")
            ],
            default_value="jordan_wigner"
        ),
        ClarificationQuestion(
            id="chem_basis_set",
            domain="chemistry",
            trigger_keywords=["basis", "sto-3g", "6-31g", "pvdz"],
            question="Which atomic orbital basis set should we use for Hartree-Fock integral generation?",
            options=[
                ClarificationOption(label="STO-3G (Minimal Basis)", value="sto-3g", is_recommended=True, description="Minimal Slater-type orbital representation for fast simulation."),
                ClarificationOption(label="6-31G (Split-Valence Basis)", value="6-31g", description="Higher radial flexibility for valence shells."),
                ClarificationOption(label="cc-pVDZ (Correlation-Consistent)", value="cc-pvdz", description="High-precision benchmark basis set.")
            ],
            default_value="sto-3g"
        ),
        ClarificationQuestion(
            id="chem_ansatz_type",
            domain="chemistry",
            trigger_keywords=["ansatz", "uccsd", "hardware efficient", "adapt"],
            question="Which parameterized variational quantum circuit ansatz should we synthesize?",
            options=[
                ClarificationOption(label="UCCSD (Unitary Coupled Cluster Singles & Doubles)", value="uccsd", is_recommended=True, description="Physically motivated, particle-conserving excitation ansatz."),
                ClarificationOption(label="Hardware-Efficient Ansatz (Ry/Rz + CNOTs)", value="hea", description="Low depth circuit tailored for NISQ hardware execution."),
                ClarificationOption(label="ADAPT-VQE (Dynamical Operator Pool)", value="adapt_vqe", description="Iteratively appends highest-gradient operators.")
            ],
            default_value="uccsd"
        ),
        ClarificationQuestion(
            id="chem_spin_state",
            domain="chemistry",
            trigger_keywords=["spin", "multiplicity", "singlet", "triplet", "doublet"],
            question="What is the targeted total spin multiplicity (2S+1) for this molecular state?",
            options=[
                ClarificationOption(label="Singlet (S=0, 2S+1=1) — Closed-shell ground state", value="singlet", is_recommended=True, description="Paired electron ground state."),
                ClarificationOption(label="Triplet (S=1, 2S+1=3) — Open-shell excited state", value="triplet", description="Two unpaired parallel spin electrons."),
                ClarificationOption(label="Doublet (S=1/2, 2S+1=2) — Radical species", value="doublet", description="One unpaired electron state.")
            ],
            default_value="singlet"
        ),
        ClarificationQuestion(
            id="chem_optimizer",
            domain="chemistry",
            trigger_keywords=["optimizer", "slsqp", "cobyla", "spsa", "l-bfgs"],
            question="Which classical optimizer should drive the VQE variational energy minimization?",
            options=[
                ClarificationOption(label="SLSQP (Sequential Least Squares)", value="slsqp", is_recommended=True, description="Fast gradient-based convergence for noise-free simulators."),
                ClarificationOption(label="COBYLA (Constrained Optimization By Linear Approx)", value="cobyla", description="Robust gradient-free simplex search."),
                ClarificationOption(label="SPSA (Simultaneous Perturbation Stochastic Approx)", value="spsa", description="Resilient against shot noise on physical QPUs.")
            ],
            default_value="slsqp"
        ),
        ClarificationQuestion(
            id="chem_accuracy_threshold",
            domain="chemistry",
            trigger_keywords=["accuracy", "tolerance", "mha", "chemical accuracy", "threshold"],
            question="What is your target chemical accuracy convergence threshold for the ground state energy?",
            options=[
                ClarificationOption(label="1.6 mHa (1.0 kcal/mol) — Chemical Accuracy Standard", value="1.6mHa", is_recommended=True, description="Standard required for predictive reaction energetics."),
                ClarificationOption(label="0.5 mHa — High-Precision Spectroscopic Standard", value="0.5mHa", description="Ultra-tight convergence for vibrational frequencies."),
                ClarificationOption(label="10.0 mHa — Exploratory Preview", value="10.0mHa", description="Fast loose convergence for rapid ansatz prototyping.")
            ],
            default_value="1.6mHa"
        ),
        ClarificationQuestion(
            id="chem_pes_scan",
            domain="chemistry",
            trigger_keywords=["pes", "potential energy surface", "bond scan", "dissociation"],
            question="Do you want a single equilibrium geometry calculation or a 1D bond-stretch potential scan?",
            options=[
                ClarificationOption(label="Single Equilibrium Point (Static Geometry XYZ)", value="single_point", is_recommended=True, description="Evaluates energy at the specified molecular coordinate."),
                ClarificationOption(label="1D Bond Dissociation Scan (R = 0.5Å to 3.0Å)", value="1d_scan", description="Computes ground state energy curve across 15 bond distances."),
                ClarificationOption(label="Dihedral Angle Torsional Scan", value="dihedral_scan", description="Rotates molecular functional group in 15° increments.")
            ],
            default_value="single_point"
        ),
        ClarificationQuestion(
            id="chem_error_mitigation",
            domain="chemistry",
            trigger_keywords=["mitigation", "zne", "readout", "noise mitigation", "m3"],
            question="What level of quantum error mitigation should be applied to expectation values?",
            options=[
                ClarificationOption(label="None (Ideal Statevector Simulator)", value="none", is_recommended=True, description="Direct exact wave function expectation value."),
                ClarificationOption(label="Readout Error Mitigation (M3 Calibration)", value="readout_m3", description="Calibrates measurement assignment probability matrix."),
                ClarificationOption(label="Zero-Noise Extrapolation (ZNE Gate Folding)", value="zne", description="Extrapolates expectation value to zero-noise limit.")
            ],
            default_value="none"
        ),
        ClarificationQuestion(
            id="chem_backend_target",
            domain="chemistry",
            trigger_keywords=["backend", "aer", "statevector", "ibm qpu", "simulator"],
            question="Which quantum execution backend should evaluate the molecular Hamiltonian?",
            options=[
                ClarificationOption(label="Aer Statevector Simulator (C++ Exact)", value="aer_simulator", is_recommended=True, description="Zero shot noise, deterministic ground state evaluation."),
                ClarificationOption(label="Aer QasmSimulator with Thermal Noise (T1/T2)", value="aer_noisy", description="Simulates realistic decoherence and dephasing."),
                ClarificationOption(label="IBM Heron / Eagle QPU Hardware", value="ibm_qpu", description="Submits transcompiled jobs to cloud superconducting QPU.")
            ],
            default_value="aer_simulator"
        )
    ],

    # -----------------------------------------------------------------
    # 2. 📈 PORTFOLIO OPTIMIZATION & QUBO (10 Questions)
    # -----------------------------------------------------------------
    "optimization": [
        ClarificationQuestion(
            id="opt_risk_lambda",
            domain="optimization",
            trigger_keywords=["risk", "return", "lambda", "tradeoff", "risk aversion"],
            question="What is your risk aversion factor (λ) in the mean-variance objective function?",
            options=[
                ClarificationOption(label="Balanced (λ = 0.5) — Equal weight on return and risk", value="0.5", is_recommended=True, description="Maximizes Sharpe ratio under standard volatility."),
                ClarificationOption(label="Conservative (λ = 0.8) — High penalty on covariance risk", value="0.8", description="Prioritizes capital preservation and low beta."),
                ClarificationOption(label="Aggressive (λ = 0.2) — Maximum expected return focus", value="0.2", description="Accepts higher volatility for upside yield.")
            ],
            default_value="0.5"
        ),
        ClarificationQuestion(
            id="opt_cardinality_k",
            domain="optimization",
            trigger_keywords=["cardinality", "budget", "k assets", "select k", "how many assets"],
            question="How many assets should be selected from the universe (k out of N)?",
            options=[
                ClarificationOption(label="Exact Selection (k = 2 out of 4)", value="exact_2", is_recommended=True, description="Enforces strict cardinality equality constraint Σ x_i == 2."),
                ClarificationOption(label="Flexible Range (1 <= k <= 3 assets)", value="range_1_3", description="Enforces inequality slack boundary on portfolio size."),
                ClarificationOption(label="Unconstrained Budget (Continuous Selection)", value="unconstrained", description="Selects any number of assets maximizing net utility.")
            ],
            default_value="exact_2"
        ),
        ClarificationQuestion(
            id="opt_penalty_multiplier",
            domain="optimization",
            trigger_keywords=["penalty", "multiplier", "lagrange", "constraint weight"],
            question="What penalty multiplier (λ_penalty) should enforce valid portfolio constraints?",
            options=[
                ClarificationOption(label="Auto-Calibrate (λ = 5 * max |Q_ij|)", value="auto_calibrate", is_recommended=True, description="Dynamically scales penalty above maximum quadratic cost."),
                ClarificationOption(label="Strict Hard Penalty (λ = 10.0)", value="hard_10", description="Strictly eliminates invalid bitstrings from sample pool."),
                ClarificationOption(label="Soft Penalty (λ = 1.0)", value="soft_1", description="Allows mild boundary exploration during annealing.")
            ],
            default_value="auto_calibrate"
        ),
        ClarificationQuestion(
            id="opt_solver_engine",
            domain="optimization",
            trigger_keywords=["solver", "dwave", "qaoa", "annealer", "ortools"],
            question="Which quantum or annealing solver engine should execute the QUBO matrix?",
            options=[
                ClarificationOption(label="D-Wave Simulated Annealing (Fast & Scalable)", value="dwave_sa", is_recommended=True, description="Simulates transverse Ising spin dynamics for up to 100+ variables."),
                ClarificationOption(label="QAOA on Qiskit Aer (Gate-based Variational)", value="qaoa", description="Executes alternating cost and mixer Hamiltonian unitaries."),
                ClarificationOption(label="Google OR-Tools CP-SAT (Classical Exact)", value="ortools", description="Provides verified deterministic integer solution baseline.")
            ],
            default_value="dwave_sa"
        ),
        ClarificationQuestion(
            id="opt_qaoa_layers",
            domain="optimization",
            trigger_keywords=["p layers", "qaoa depth", "alternating layers", "qaoa steps"],
            question="How many variational QAOA alternating layers (p) should be constructed?",
            options=[
                ClarificationOption(label="p = 1 Layer (Low Depth, Noise-Resilient)", value="p1", is_recommended=True, description="Fast 2-parameter optimization with low gate error."),
                ClarificationOption(label="p = 2 Layers (Higher Approximation Ratio)", value="p2", description="4 variational parameters (gamma_1, gamma_2, beta_1, beta_2)."),
                ClarificationOption(label="p = 3 Layers (Near-Optimal Energy)", value="p3", description="Deeper circuit for maximum theoretical ground state overlap.")
            ],
            default_value="p1"
        ),
        ClarificationQuestion(
            id="opt_variable_encoding",
            domain="optimization",
            trigger_keywords=["encoding", "binary", "lots", "shares", "slack"],
            question="Are decision variables single binary inclusions or discrete multi-lot shares?",
            options=[
                ClarificationOption(label="Binary Selection (x_i in {0, 1})", value="binary", is_recommended=True, description="1 qubit per asset, indicating inclusion or exclusion."),
                ClarificationOption(label="Discrete 2-Bit Lot Allocation (x_i in {0, 1, 2, 3})", value="2bit_lots", description="2 qubits per asset for weighted lot sizing."),
                ClarificationOption(label="Logarithmic Capital Allocation (Base-2 Weights)", value="log_weights", description="Log-encoded portfolio weighting scheme.")
            ],
            default_value="binary"
        ),
        ClarificationQuestion(
            id="opt_num_reads",
            domain="optimization",
            trigger_keywords=["reads", "samples", "num reads", "annealing shots"],
            question="How many sampling reads should be evaluated on the annealing backend?",
            options=[
                ClarificationOption(label="1,024 Reads (Standard Statistical Confidence)", value="1024", is_recommended=True, description="Standard sample size for reliable ground state extraction."),
                ClarificationOption(label="500 Reads (Fast Exploratory Profiling)", value="500", description="Quick turnaround for rapid parameter tuning."),
                ClarificationOption(label="5,000 Reads (High-Confidence Sampling)", value="5000", description="Exhaustive sample histogram for complex landscapes.")
            ],
            default_value="1024"
        ),
        ClarificationQuestion(
            id="opt_covariance_source",
            domain="optimization",
            trigger_keywords=["covariance", "matrix", "ledoit wolf", "shrinkage", "returns"],
            question="Which covariance estimation model should be used for asset return risk?",
            options=[
                ClarificationOption(label="Sample Covariance Matrix (Standard)", value="sample_cov", is_recommended=True, description="Empirical historical variance-covariance matrix."),
                ClarificationOption(label="Ledoit-Wolf Shrinkage (Noise-Reduced)", value="ledoit_wolf", description="Optimal shrinkage for small historical sample sizes."),
                ClarificationOption(label="Semi-Variance (Downside Risk Only)", value="semi_variance", description="Penalizes negative deviations below target return.")
            ],
            default_value="sample_cov"
        ),
        ClarificationQuestion(
            id="opt_transaction_costs",
            domain="optimization",
            trigger_keywords=["transaction", "turnover", "rebalance", "fees", "commission"],
            question="Should transaction costs or turnover rebalancing penalties be modeled?",
            options=[
                ClarificationOption(label="Zero Rebalancing Cost (One-Shot Static)", value="zero_cost", is_recommended=True, description="Pure asset allocation without transition drag."),
                ClarificationOption(label="Linear Turnover Penalty (|x_i - x_current| <= delta)", value="turnover_penalty", description="Penalizes deviation from existing holdings."),
                ClarificationOption(label="Fixed Brokerage Ticket Fee", value="fixed_fee", description="Fixed penalty per active transaction.")
            ],
            default_value="zero_cost"
        ),
        ClarificationQuestion(
            id="opt_benchmark_baseline",
            domain="optimization",
            trigger_keywords=["benchmark", "baseline", "pulp", "exact solver", "optimality gap"],
            question="Which classical solver should benchmark the quantum optimality gap?",
            options=[
                ClarificationOption(label="PuLP / CBC Branch-and-Bound (Exact Global Minimum)", value="pulp_exact", is_recommended=True, description="Computes exact discrete mathematical optimum."),
                ClarificationOption(label="Google OR-Tools CP-SAT Solver", value="ortools_cpsat", description="Constraint programming solver baseline."),
                ClarificationOption(label="Greedy Heuristic Baseline", value="greedy", description="Fast polynomial greedy selection heuristic.")
            ],
            default_value="pulp_exact"
        )
    ],

    # -----------------------------------------------------------------
    # 3. 🧠 QUANTUM MACHINE LEARNING (QML - 10 Questions)
    # -----------------------------------------------------------------
    "qml": [
        ClarificationQuestion(
            id="qml_dim_reduction",
            domain="qml",
            trigger_keywords=["pca", "dimension", "features", "reduce features", "qubit register"],
            question="How should classical features be reduced to match the quantum register size?",
            options=[
                ClarificationOption(label="PCA Reduction to 4 Principal Components", value="pca_4", is_recommended=True, description="Captures 95%+ of variance while maintaining 4-qubit register."),
                ClarificationOption(label="SelectKBest (ANOVA F-Value Feature Selection)", value="select_k_best", description="Preserves original interpretable feature columns."),
                ClarificationOption(label="Direct Feature Truncation (Top N Columns)", value="truncate", description="Uses first N columns without transformation.")
            ],
            default_value="pca_4"
        ),
        ClarificationQuestion(
            id="qml_feature_map",
            domain="qml",
            trigger_keywords=["feature map", "zzfeaturemap", "zfeaturemap", "paulifeaturemap", "embedding"],
            question="Which non-linear feature embedding map should encode data into Hilbert space?",
            options=[
                ClarificationOption(label="ZZFeatureMap (2nd-Order Non-Linear Pauli Embedding)", value="zz_feature_map", is_recommended=True, description="Encodes pair-wise non-linear feature correlations."),
                ClarificationOption(label="ZFeatureMap (1st-Order Linear Pauli Embedding)", value="z_feature_map", description="Single-qubit product state rotation without entanglement."),
                ClarificationOption(label="PauliFeatureMap (XYZ Mixed Interaction Tensor)", value="pauli_feature_map", description="High-dimensional mixed Pauli encoding for complex datasets.")
            ],
            default_value="zz_feature_map"
        ),
        ClarificationQuestion(
            id="qml_entanglement_topology",
            domain="qml",
            trigger_keywords=["entanglement", "linear", "full", "circular", "cnot topology"],
            question="What entanglement topology should connect the feature map and ansatz?",
            options=[
                ClarificationOption(label="Linear Entanglement (Adjacent Qubits, Low Depth)", value="linear", is_recommended=True, description="CNOTs between nearest neighbors, ideal for linear QPU coupling."),
                ClarificationOption(label="Full Entanglement (All-to-All Qubit Coupling)", value="full", description="Maximum expressive power at the cost of higher CNOT depth."),
                ClarificationOption(label="Circular Entanglement (Periodic Ring Boundary)", value="circular", description="Closes boundary between first and last qubits.")
            ],
            default_value="linear"
        ),
        ClarificationQuestion(
            id="qml_paradigm",
            domain="qml",
            trigger_keywords=["vqc", "qsvm", "kernel", "classifier", "paradigm"],
            question="Which quantum machine learning paradigm should be trained on this dataset?",
            options=[
                ClarificationOption(label="Variational Quantum Classifier (VQC Neural Ansatz)", value="vqc", is_recommended=True, description="Parameterized circuit optimized iteratively via loss gradient."),
                ClarificationOption(label="Quantum Support Vector Machine (QSVM Kernel Matrix)", value="qsvm", description="Computes quantum state fidelity Gram matrix for classical dual SVM."),
                ClarificationOption(label="Quantum Neural Network with Parity Readout", value="qnn_parity", description="Multi-layer parameterized network with parity bit observable.")
            ],
            default_value="vqc"
        ),
        ClarificationQuestion(
            id="qml_ansatz_design",
            domain="qml",
            trigger_keywords=["ansatz", "realamplitudes", "efficientsu2", "twolocal"],
            question="Which parameterized variational quantum circuit should serve as the trainable model?",
            options=[
                ClarificationOption(label="RealAmplitudes (Ry Rotations + Linear CNOTs)", value="real_amplitudes", is_recommended=True, description="Restricts amplitudes to real numbers, reducing parameter count."),
                ClarificationOption(label="EfficientSU2 (Ry + Rz Rotations, Complex Hilbert Space)", value="efficient_su2", description="Full single-qubit SU(2) expressivity per layer."),
                ClarificationOption(label="TwoLocal Custom Entangled Block Ansatz", value="two_local", description="Custom rotation and entanglement gate pool.")
            ],
            default_value="real_amplitudes"
        ),
        ClarificationQuestion(
            id="qml_ansatz_reps",
            domain="qml",
            trigger_keywords=["reps", "repetitions", "ansatz depth", "layers"],
            question="How many ansatz layer repetitions (reps) should be stacked?",
            options=[
                ClarificationOption(label="reps = 2 (Balanced Expressivity & Trainability)", value="reps_2", is_recommended=True, description="12 trainable weights for 4 qubits; prevents barren plateaus."),
                ClarificationOption(label="reps = 1 (Fast Low-Depth Prototyping)", value="reps_1", description="Minimal parameter count for quick convergence."),
                ClarificationOption(label="reps = 4 (Deep High-Capacity Model)", value="reps_4", description="Higher expressive power for non-linearly separable datasets.")
            ],
            default_value="reps_2"
        ),
        ClarificationQuestion(
            id="qml_loss_function",
            domain="qml",
            trigger_keywords=["loss", "cross entropy", "mse", "hinge", "objective"],
            question="Which loss function should guide parameter weight optimization?",
            options=[
                ClarificationOption(label="Cross-Entropy Loss with Softmax Probabilities", value="cross_entropy", is_recommended=True, description="Standard multi-class probabilistic classification loss."),
                ClarificationOption(label="Mean Squared Error (MSE) on Expectation <Z_0>", value="mse", description="Direct expectation value regression loss."),
                ClarificationOption(label="Hinge Loss (Margin Maximization)", value="hinge", description="Optimizes decision boundary separation margins.")
            ],
            default_value="cross_entropy"
        ),
        ClarificationQuestion(
            id="qml_gradient_evaluator",
            domain="qml",
            trigger_keywords=["gradient", "spsa", "parameter shift", "finite differences"],
            question="How should analytical quantum circuit gradients be calculated during training?",
            options=[
                ClarificationOption(label="SPSA (Simultaneous Perturbation Stochastic Approx)", value="spsa", is_recommended=True, description="Only 2 evaluations per step, resilient to simulator and QPU noise."),
                ClarificationOption(label="Parameter-Shift Rule (Exact Analytical Gradients)", value="param_shift", description="Evaluates f(theta + pi/2) - f(theta - pi/2) for exact derivatives."),
                ClarificationOption(label="Finite Differences (Numerical Step Delta)", value="finite_diff", description="Standard numerical difference approximation.")
            ],
            default_value="spsa"
        ),
        ClarificationQuestion(
            id="qml_training_budget",
            domain="qml",
            trigger_keywords=["epochs", "budget", "batch size", "iterations"],
            question="What training budget (epochs & batch size) should we allocate?",
            options=[
                ClarificationOption(label="40 Epochs, Batch Size 16 (Standard Convergence)", value="40_epochs", is_recommended=True, description="Fast training reaching 95%+ accuracy in sub-second time."),
                ClarificationOption(label="20 Epochs, Batch Size 32 (Quick Preview)", value="20_epochs", description="Rapid exploration of feature map expressivity."),
                ClarificationOption(label="100 Epochs with Early Stopping", value="100_epochs", description="Deep convergence search with loss plateau detection.")
            ],
            default_value="40_epochs"
        ),
        ClarificationQuestion(
            id="qml_benchmark_model",
            domain="qml",
            trigger_keywords=["benchmark", "classical svm", "rbf", "random forest", "mlp"],
            question="Which classical ML model should benchmark the quantum advantage gap?",
            options=[
                ClarificationOption(label="Classical Support Vector Machine (RBF Kernel)", value="svm_rbf", is_recommended=True, description="Standard non-linear classical kernel baseline."),
                ClarificationOption(label="Random Forest Classifier (100 Decision Trees)", value="random_forest", description="Ensemble tree model baseline."),
                ClarificationOption(label="Multi-Layer Perceptron (Classical Deep Neural Net)", value="mlp", description="2-layer dense neural network baseline.")
            ],
            default_value="svm_rbf"
        )
    ],

    # -----------------------------------------------------------------
    # 4. ⚛️ BLANK / GENERAL QUANTUM CIRCUITS (10 Questions)
    # -----------------------------------------------------------------
    "circuits": [
        ClarificationQuestion(
            id="circ_basis_gates",
            domain="circuits",
            trigger_keywords=["basis", "gates", "basis gates", "native gates", "target architecture"],
            question="Which physical hardware basis gate set should the circuit be decomposed into?",
            options=[
                ClarificationOption(label="IBM Eagle/Heron Basis: {rz, sx, x, cx}", value="ibm_basis", is_recommended=True, description="Native superconducting basis gate set for IBM quantum processors."),
                ClarificationOption(label="Rigetti Superconducting: {rx, rz, cz}", value="rigetti_basis", description="Native gate set for Rigetti Ankaa/Aspen processors."),
                ClarificationOption(label="IonQ Trapped Ion: {gpi, gpi2, ms}", value="ionq_basis", description="All-to-all native Molmer-Sorensen gate set."),
                ClarificationOption(label="Universal Discrete: {h, t, s, cx}", value="discrete_basis", description="Standard Clifford+T universal decomposition.")
            ],
            default_value="ibm_basis"
        ),
        ClarificationQuestion(
            id="circ_transpile_level",
            domain="circuits",
            trigger_keywords=["transpile", "optimization level", "passmanager", "level 0", "level 2", "level 3"],
            question="What compiler optimization pass level should the Transpiler PassManager apply?",
            options=[
                ClarificationOption(label="Level 2 (Standard) — Commutative cancellations & depth reduction", value="level_2", is_recommended=True, description="Reduces circuit depth by 30-40% via commutation analysis."),
                ClarificationOption(label="Level 1 (Light) — Adjacent single-gate cancellation", value="level_1", description="Fast peephole optimization preserving layout."),
                ClarificationOption(label="Level 3 (Heavy) — Consolidated blocks & SABRE routing", value="level_3", description="Exhaustive heuristic search for minimum CNOT depth."),
                ClarificationOption(label="Level 0 (None) — Pure literal gate preservation", value="level_0", description="Maintains exact user-authored circuit without modification.")
            ],
            default_value="level_2"
        ),
        ClarificationQuestion(
            id="circ_param_binding",
            domain="circuits",
            trigger_keywords=["symbolic", "bind", "parameters", "angles", "assign_parameters"],
            question="How should variational angle parameters be handled in the code buffer?",
            options=[
                ClarificationOption(label="Symbolic Binding via assign_parameters() (Dynamic)", value="symbolic", is_recommended=True, description="Maintains Qiskit Parameter objects with runtime dictionary binding."),
                ClarificationOption(label="Hardcoded Static Floating-Point Angles (Concrete Constants)", value="static_floats", description="Direct numerical angle floats embedded directly in gate calls."),
                ClarificationOption(label="NumPy Parameter Vector Array", value="numpy_array", description="Vectorized parameter array passed to circuit evaluation.")
            ],
            default_value="symbolic"
        ),
        ClarificationQuestion(
            id="circ_measurement_strategy",
            domain="circuits",
            trigger_keywords=["measurement", "mid circuit", "measure all", "reset", "clbits"],
            question="Where and how should measurement operations be attached to the circuit?",
            options=[
                ClarificationOption(label="Terminal Measurement of All Qubits to Classical Register", value="measure_all", is_recommended=True, description="Appends measure_all() at the end of the circuit execution."),
                ClarificationOption(label="Mid-Circuit Dynamic Measurement with Conditional Resets", value="mid_circuit", description="Measures intermediate qubits and branches dynamically on clbits."),
                ClarificationOption(label="Zero Measurement (Pure Statevector Analysis)", value="no_measure", description="Evaluates exact unitary wave function without wavefunction collapse.")
            ],
            default_value="measure_all"
        ),
        ClarificationQuestion(
            id="circ_noise_environment",
            domain="circuits",
            trigger_keywords=["noise", "thermal", "t1", "t2", "decoherence", "depolarizing"],
            question="Should quantum noise channels (decoherence and gate infidelity) be simulated?",
            options=[
                ClarificationOption(label="Ideal Simulator (Zero Noise, 100% Unitary Fidelity)", value="ideal", is_recommended=True, description="Pure state evolution without environmental decoherence."),
                ClarificationOption(label="Thermal Relaxation Noise (T1 = 50μs, T2 = 70μs)", value="thermal_noise", description="Simulates realistic physical qubit energy decay and dephasing."),
                ClarificationOption(label="Depolarizing Gate Noise Channel (p_error = 0.1%)", value="depolarizing", description="Applies uniform Pauli error channel after every 2-qubit gate.")
            ],
            default_value="ideal"
        ),
        ClarificationQuestion(
            id="circ_simulation_method",
            domain="circuits",
            trigger_keywords=["method", "simulation method", "matrix product state", "mps", "stabilizer"],
            question="Which numerical simulation engine should evaluate the quantum state?",
            options=[
                ClarificationOption(label="Statevector (Exact 2^N Wavefunction Amplitude Evolution)", value="statevector", is_recommended=True, description="Full state vector simulation for up to 30 qubits."),
                ClarificationOption(label="Matrix Product State (MPS Tensor Network for >30 Qubits)", value="mps", description="Efficient 1D tensor contraction for low-entanglement circuits."),
                ClarificationOption(label="Stabilizer (Clifford Tableau Simulator)", value="stabilizer", description="Fast polynomial-time simulation for Clifford-only circuits.")
            ],
            default_value="statevector"
        ),
        ClarificationQuestion(
            id="circ_qubit_budget",
            domain="circuits",
            trigger_keywords=["qubit count", "how many qubits", "register size", "budget"],
            question="What is the maximum qubit register size we should allocate for this algorithm?",
            options=[
                ClarificationOption(label="4 Qubits (Instant Local Simulation & Visualization)", value="4_qubits", is_recommended=True, description="Instant execution and clean continuous ASCII canvas rendering."),
                ClarificationOption(label="8 Qubits (Standard Algorithmic Benchmark)", value="8_qubits", description="Standard size for Grover / Shor / VQE proof-of-concept."),
                ClarificationOption(label="16+ Qubits (High-Memory High-Entanglement Simulation)", value="16_qubits", description="Scaled algorithmic circuit testing.")
            ],
            default_value="4_qubits"
        ),
        ClarificationQuestion(
            id="circ_canvas_layout",
            domain="circuits",
            trigger_keywords=["canvas", "rendering", "fold", "ascii", "unicode", "draw"],
            question="How would you prefer the ASCII/Unicode circuit representation to be formatted?",
            options=[
                ClarificationOption(label="Continuous Horizontal Canvas (fold=-1, Zero Vertical Wrapping)", value="continuous", is_recommended=True, description="Displays circuit in single horizontal plane with horizontal scroll."),
                ClarificationOption(label="Folded Multi-Line Terminal Style (fold=80 Columns)", value="folded", description="Standard wrapping terminal format."),
                ClarificationOption(label="LaTeX / Q-circuit Code Output", value="latex", description="Generates publication-ready LaTeX TikZ circuit code.")
            ],
            default_value="continuous"
        ),
        ClarificationQuestion(
            id="circ_initial_state",
            domain="circuits",
            trigger_keywords=["initial state", "state prep", "superposition", "ground state", "|0>"],
            question="What initial state should the quantum register be initialized to?",
            options=[
                ClarificationOption(label="Ground State |0>^(⊗N) (All Zero Initialized)", value="ground_state", is_recommended=True, description="Standard computational ground state initialization."),
                ClarificationOption(label="Uniform Superposition State |+>^(⊗N) (Hadamard Layer)", value="superposition", description="Applies H gates across all qubits for quantum parallelism."),
                ClarificationOption(label="Custom Bitstring State (e.g. |1010>)", value="custom_bitstring", description="Prepares specific computational basis state via X gates.")
            ],
            default_value="ground_state"
        ),
        ClarificationQuestion(
            id="circ_self_healing",
            domain="circuits",
            trigger_keywords=["self healing", "cancel gates", "redundant gates", "clean circuit"],
            question="Should the agent automatically detect and remove redundant or cancelling gate pairs?",
            options=[
                ClarificationOption(label="Enabled (Auto-cancel H·H = I, X·X = I, and adjacent rotations)", value="enabled", is_recommended=True, description="Applies algebraic identity cancellation to clean code AST."),
                ClarificationOption(label="Disabled (Keep verbatim gate sequence for pedagogical review)", value="disabled", description="Preserves every gate explicitly authored by the user.")
            ],
            default_value="enabled"
        )
    ]
}


def find_clarification_question(domain: str, user_message: str) -> Optional[ClarificationQuestion]:
    """
    Scans the domain question catalogue for relevant trigger keywords.
    Returns the highest matching ClarificationQuestion if ambiguity is detected.
    """
    domain_key = domain.lower()
    if domain_key not in CLARIFICATION_QUESTION_CATALOGUE:
        domain_key = "circuits"

    msg_lower = user_message.lower()
    questions = CLARIFICATION_QUESTION_CATALOGUE.get(domain_key, [])

    for q in questions:
        for kw in q.trigger_keywords:
            if kw in msg_lower:
                return q

    return None
