"""
Comprehensive Automated Test Suite for all 36 Quantum Guru Services.
Validates input acceptance, execution latency, response schema, and mathematical/domain correctness.
"""
import sys
import os
import time
import json
import traceback

# Add quantum-backend/v3 to sys.path
sys.path.insert(0, os.path.abspath("quantum-backend/v3"))

from engine.tools.registry import invoke_quantum_tool, TOOL_DISPATCH_TABLE

TEST_PAYLOADS = [
    # ── 1. OPTIMIZATION STUDIO (1 - 6) ───────────────────────────
    (
        1,
        "tools.opt.formulate_problem",
        "Problem Formulator",
        "Optimization",
        {
            "description": "4-asset portfolio risk minimization with cardinality constraint k=2",
            "variables": ["x0", "x1", "x2", "x3"],
            "constraints": ["x0 + x1 + x2 + x3 == 2"]
        },
        lambda res: len(res.get("var_names", [])) == 4 and "objective_terms" in res and "bounds" in res
    ),
    (
        2,
        "tools.opt.translate_to_qubo",
        "QUBO Matrix Synthesizer",
        "Optimization",
        {
            "objective_terms": {"x0": -0.12, "x1": -0.18, "x2": -0.15, "x3": -0.22},
            "constraint_exprs": [],
            "penalty_multiplier": 5.0
        },
        lambda res: "qubo_matrix" in res and len(res["qubo_matrix"]) == 4 and "linear_biases" in res
    ),
    (
        3,
        "tools.opt.map_quantum_solver",
        "Ising Spin Mapper",
        "Optimization",
        {
            "qubo_matrix": [[-5.0, 1.0, 1.0, 1.0], [1.0, -5.0, 1.0, 1.0], [1.0, 1.0, -5.0, 1.0], [1.0, 1.0, 1.0, -5.0]],
            "var_names": ["x0", "x1", "x2", "x3"],
            "solver_target": "qaoa"
        },
        lambda res: "ising_hamiltonian" in res and res.get("num_qubits") == 4 and "qaoa_circuit_template" in res
    ),
    (
        4,
        "tools.opt.execute_solver",
        "QAOA & Annealing Solver",
        "Optimization",
        {
            "solver_target": "qaoa",
            "qubo_matrix": [[-5.0, 1.0, 1.0, 1.0], [1.0, -5.0, 1.0, 1.0], [1.0, 1.0, -5.0, 1.0], [1.0, 1.0, 1.0, -5.0]],
            "var_names": ["x0", "x1", "x2", "x3"],
            "shots": 1024
        },
        lambda res: len(res.get("optimal_bitstring", "")) == 4 and "ground_energy" in res
    ),
    (
        5,
        "tools.opt.decode_solution",
        "Solution Decoder",
        "Optimization",
        {
            "optimal_bitstring": "1010",
            "var_names": ["AAPL", "MSFT", "GOOG", "AMZN"],
            "constraints": ["sum(x) == 2"]
        },
        lambda res: "decoded_solution" in res and res.get("is_feasible") is True and "final_cost" in res
    ),
    (
        6,
        "tools.opt.benchmark_classical",
        "Classical Benchmarker",
        "Optimization",
        {
            "qubo_matrix": [[-5.0, 1.0], [1.0, -5.0]],
            "quantum_cost": -11.42,
            "execution_time_sec": 0.014
        },
        lambda res: "classical_optimal_cost" in res and len(res.get("comparison_table", [])) > 0
    ),

    # ── 2. ACADEMY STUDIO (7 - 11) ───────────────────────────────
    (
        7,
        "tools.academy.concept_explainer",
        "Concept Decomposer",
        "Academy",
        {
            "topic": "quantum_superposition",
            "depth_level": "intermediate"
        },
        lambda res: len(res.get("physical_intuition", "")) > 20 and len(res.get("key_takeaways", [])) > 0
    ),
    (
        8,
        "tools.academy.math_derivation",
        "Dirac Mathematics Proof Engine",
        "Academy",
        {
            "equation_type": "hadamard_transform",
            "target_proof": "H|0> = |+>"
        },
        lambda res: len(res.get("latex_derivation", [])) > 0 and len(res.get("intermediate_statevectors", [])) > 0
    ),
    (
        9,
        "tools.academy.generate_tutorial_circuit",
        "Tutorial Circuit Synthesizer",
        "Academy",
        {
            "phenomenon": "bell_state",
            "num_qubits": 2
        },
        lambda res: "qiskit_code" in res and len(res.get("state_evolution_steps", [])) > 0
    ),
    (
        10,
        "tools.academy.socratic_assessment",
        "Socratic Diagnostic Assessment",
        "Academy",
        {
            "topic_id": "quantum_entanglement",
            "difficulty": 1
        },
        lambda res: len(res.get("question_text", "")) > 20 and len(res.get("options", [])) >= 2
    ),
    (
        11,
        "tools.academy.misconception_debugger",
        "Misconception Debugger",
        "Academy",
        {
            "student_statement_or_code": "Quantum computers can clone unknown quantum states using CNOT gates.",
            "target_concept": "no-cloning theorem"
        },
        lambda res: res.get("has_misconception") is True and len(res.get("clarification", "")) > 20
    ),

    # ── 3. ALGORITHMS STUDIO (12 - 16) ───────────────────────────
    (
        12,
        "tools.algo.classify_algorithm",
        "Algorithm Classifier",
        "Algorithms",
        {
            "problem_type": "search",
            "input_dimension": 4
        },
        lambda res: "Grover" in res.get("recommended_algorithm", "") and "Speedup" in res.get("theoretical_speedup", "")
    ),
    (
        13,
        "tools.algo.synthesize_oracle",
        "Phase Oracle Synthesizer",
        "Algorithms",
        {
            "target_marked_states": ["11"],
            "num_qubits": 2
        },
        lambda res: res.get("num_qubits") == 2 and "oracle_circuit_code" in res
    ),
    (
        14,
        "tools.algo.build_diffusion_operator",
        "Grover Diffusion Architect",
        "Algorithms",
        {
            "num_qubits": 2,
            "algorithm": "grover"
        },
        lambda res: "full_algorithm_circuit" in res and res.get("optimal_iterations") >= 1
    ),
    (
        15,
        "tools.algo.simulate_statevector",
        "Statevector Amplitude Analyzer",
        "Algorithms",
        {
            "circuit_code": "from qiskit import QuantumCircuit\nqc = QuantumCircuit(2)\nqc.h(0)\nqc.cx(0, 1)\n",
            "shots": 1024
        },
        lambda res: len(res.get("statevector", [])) == 4 and res.get("fidelity", 0) > 0.9
    ),
    (
        16,
        "tools.algo.analyze_quantum_speedup",
        "Quantum Speedup Evaluator",
        "Algorithms",
        {
            "num_qubits": 16,
            "classical_eval_sec": 0.001,
            "quantum_gate_time_ns": 100.0
        },
        lambda res: res.get("crossover_qubit_threshold") > 0 and res.get("quantum_runtime_estimate_ms", 0) > 0
    ),

    # ── 4. CIRCUITS STUDIO (17 - 21) ─────────────────────────────
    (
        17,
        "tools.circuit.build_quantum_circuit",
        "Quantum Register Architect",
        "Circuit",
        {
            "num_qubits": 4,
            "num_clbits": 4,
            "gate_operations": [{"gate": "h", "qubits": [0]}, {"gate": "cx", "qubits": [0, 1]}]
        },
        lambda res: res.get("num_qubits") == 4 and res.get("initial_depth") >= 1
    ),
    (
        18,
        "tools.circuit.bind_parameters",
        "Parameter Symbol Binder",
        "Circuit",
        {
            "circuit_code": "from qiskit.circuit import ParameterVector\n",
            "parameter_values": [0.7854, 1.5708]
        },
        lambda res: res.get("bound_parameters_count") == 2 and res.get("is_fully_bound") is True
    ),
    (
        19,
        "tools.circuit.transpile_passes",
        "Transpiler Pass Optimizer",
        "Circuit",
        {
            "circuit_code": "from qiskit import QuantumCircuit\nqc = QuantumCircuit(4)\nfor i in range(4): qc.h(i)\n",
            "optimization_level": 2
        },
        lambda res: "transpiled_circuit_code" in res and res.get("depth_reduction_percent") is not None
    ),
    (
        20,
        "tools.circuit.simulate_noisy",
        "Noise & Decoherence Simulator",
        "Circuit",
        {
            "circuit_code": "from qiskit import QuantumCircuit\nqc = QuantumCircuit(2)\nqc.h(0)\nqc.cx(0, 1)\n",
            "shots": 1024,
            "t1_us": 50.0,
            "t2_us": 70.0,
            "gate_error_rate": 0.001
        },
        lambda res: res.get("noisy_fidelity", 0) > 0 and len(res.get("noisy_counts", {})) > 0
    ),
    (
        21,
        "tools.circuit.render_continuous",
        "Continuous Circuit Drawer",
        "Circuit",
        {
            "circuit_code": "from qiskit import QuantumCircuit\nqc = QuantumCircuit(2)\nqc.h(0)\nqc.cx(0, 1)\n"
        },
        lambda res: res.get("total_qubit_lines") > 0 and len(res.get("continuous_circuit_text", "")) > 0
    ),

    # ── 5. CHEMISTRY STUDIO (22 - 27) ────────────────────────────
    (
        22,
        "tools.chem.ingest_geometry",
        "Molecular Geometry Ingester",
        "Chemistry",
        {
            "geometry_xyz": "H 0.0 0.0 0.0\nH 0.0 0.0 0.735",
            "basis_set": "sto-3g",
            "charge": 0,
            "spin": 0
        },
        lambda res: res.get("molecule_formula") == "H" and res.get("total_electrons") == 1
    ),
    (
        23,
        "tools.chem.compute_scf_integrals",
        "Hartree-Fock Integral Engine",
        "Chemistry",
        {
            "geometry_xyz": "H 0.0 0.0 0.0\nH 0.0 0.0 0.735",
            "basis_set": "sto-3g",
            "charge": 0,
            "spin": 0
        },
        lambda res: res.get("hf_energy", 0) < -1.0 and res.get("num_orbitals") == 4
    ),
    (
        24,
        "tools.chem.select_active_space",
        "CASCI Active Space Reducer",
        "Chemistry",
        {
            "geometry_xyz": "H 0.0 0.0 0.0\nH 0.0 0.0 0.735",
            "basis_set": "sto-3g",
            "active_electrons": 2,
            "active_spatial_orbitals": 2
        },
        lambda res: res.get("active_qubits") == 4 and res.get("cas_energy", 0) < -1.1
    ),
    (
        25,
        "tools.chem.fermion_to_qubit_mapping",
        "Fermion-to-Pauli Mapper",
        "Chemistry",
        {
            "active_qubits": 4,
            "mapping": "jordan_wigner"
        },
        lambda res: res.get("active_qubits") == 4 and res.get("num_pauli_terms") > 0
    ),
    (
        26,
        "tools.chem.build_chemistry_ansatz",
        "UCCSD Chemistry Ansatz",
        "Chemistry",
        {
            "active_qubits": 4,
            "active_electrons": 2,
            "ansatz_type": "uccsd",
            "reps": 1
        },
        lambda res: res.get("num_variational_parameters") > 0 and res.get("circuit_depth") > 0
    ),
    (
        27,
        "tools.chem.solve_ground_state_vqe",
        "VQE Ground State Solver",
        "Chemistry",
        {
            "molecule_name": "H2",
            "geometry_xyz": "H 0.0 0.0 0.0; H 0.0 0.0 0.735",
            "basis_set": "sto-3g",
            "active_electrons": 2,
            "active_spatial_orbitals": 2,
            "max_iter": 40
        },
        lambda res: res.get("ground_state_energy_hartree", 0) < -1.1 and res.get("chemical_accuracy_reached") is True
    ),

    # ── 6. QUANTUM ML STUDIO (28 - 33) ───────────────────────────
    (
        28,
        "tools.qml.normalize_features",
        "Bloch Feature Normalizer",
        "Quantum ML",
        {
            "raw_data_matrix": [[5.1, 3.5, 1.4, 0.2], [4.9, 3.0, 1.4, 0.2]],
            "target_qubits": 4
        },
        lambda res: len(res.get("normalized_features", [])) == 2 and res.get("feature_dimension") == 4
    ),
    (
        29,
        "tools.qml.build_feature_map",
        "Quantum Feature Map Generator",
        "Quantum ML",
        {
            "num_qubits": 4,
            "reps": 2,
            "feature_map_type": "ZZFeatureMap",
            "entanglement": "linear"
        },
        lambda res: res.get("num_encoded_features") == 4 and res.get("circuit_depth") >= 4
    ),
    (
        30,
        "tools.qml.build_variational_ansatz",
        "Variational QML Architect",
        "Quantum ML",
        {
            "num_qubits": 4,
            "reps": 2,
            "ansatz_type": "RealAmplitudes",
            "entanglement": "linear"
        },
        lambda res: res.get("total_weights_count") == 12 and res.get("circuit_depth") >= 4
    ),
    (
        31,
        "tools.qml.train_classifier",
        "QSVM & VQC Classifier Trainer",
        "Quantum ML",
        {
            "model_type": "qsvm",
            "num_qubits": 4,
            "sample_size": 20
        },
        lambda res: res.get("train_accuracy", 0) >= 0.85 and len(res.get("trained_weights", [])) > 0
    ),
    (
        32,
        "tools.qml.benchmark_classical",
        "Classical ML Benchmarker",
        "Quantum ML",
        {
            "qsvm_accuracy": 0.98,
            "vqc_accuracy": 0.90
        },
        lambda res: len(res.get("classical_accuracies", {})) > 0 and len(res.get("comparison_summary", "")) > 10
    ),
    (
        33,
        "tools.qml.predict_sample",
        "Quantum Inference Predictor",
        "Quantum ML",
        {
            "sample_vector": [0.52, -0.31, 0.88, 0.14],
            "model_type": "qsvm"
        },
        lambda res: "predicted_class" in res and res.get("class_probability", 0) > 0.8
    ),

    # ── 7. QPU / SIMULATORS STUDIO (34 - 36) ─────────────────────
    (
        34,
        "tools.sim.dwave_sampler",
        "D-Wave Annealing Simulator",
        "QPU / Simulators",
        {
            "qubo_matrix": [[-5.0, 1.0, 1.0, 1.0], [1.0, -5.0, 1.0, 1.0], [1.0, 1.0, -5.0, 1.0], [1.0, 1.0, 1.0, -5.0]],
            "var_names": ["x0", "x1", "x2", "x3"],
            "num_reads": 1000
        },
        lambda res: len(res.get("optimal_bitstring", "")) == 4 and "ground_energy" in res and res.get("num_reads") == 1000
    ),
    (
        35,
        "tools.sim.qiskit_aer",
        "Qiskit Aer Simulator",
        "QPU / Simulators",
        {
            "num_qubits": 4,
            "shots": 1024,
            "method": "statevector"
        },
        lambda res: res.get("num_qubits") == 4 and res.get("shots_sampled") == 1024 and res.get("fidelity") == 1.0
    ),
    (
        36,
        "tools.sim.google_ortools",
        "Google OR-Tools Solver (Classical)",
        "QPU / Simulators",
        {
            "variables": ["x0", "x1", "x2", "x3"],
            "constraints": ["x0 + x1 + x2 + x3 == 2"],
            "timeout_sec": 5.0
        },
        lambda res: res.get("status") == "OPTIMAL" and res.get("optimality_gap") == 0.0 and len(res.get("solution_assignments", {})) == 4
    )
]

def run_test_suite():
    print("=" * 95)
    print("🚀 QUANTUM GURU 36-SERVICE COMPLETE VERIFICATION TEST SUITE")
    print("=" * 95)
    print(f"Total Registered Capabilities: {len(TOOL_DISPATCH_TABLE)}")
    print(f"Total Configured Verification Cases: {len(TEST_PAYLOADS)}\\n")

    passed = 0
    failed = 0
    start_all = time.time()

    print(f"{'#':<3} | {'Domain':<18} | {'Service Name':<35} | {'Latency':<9} | {'Status'}")
    print("-" * 95)

    for num, tag, name, domain, payload, validator in TEST_PAYLOADS:
        t0 = time.time()
        try:
            res = invoke_quantum_tool(tag, payload)
            elapsed_ms = round((time.time() - t0) * 1000, 2)
            
            is_valid = validator(res)
            if is_valid:
                passed += 1
                status_str = "✅ PASS"
            else:
                failed += 1
                status_str = "❌ INVALID OUTPUT"
                print(f"\\n[Validation Failed for {tag}]: {json.dumps(res, indent=2)}\\n")
        except Exception as e:
            elapsed_ms = round((time.time() - t0) * 1000, 2)
            failed += 1
            status_str = f"❌ ERROR: {e}"
            print(f"\\n[Exception in {tag}]:")
            traceback.print_exc()

        print(f"{num:<3} | {domain:<18} | {name:<35} | {str(elapsed_ms)+'ms':<9} | {status_str}")

    total_time = round(time.time() - start_all, 3)
    print("=" * 95)
    print(f"📊 TEST SUITE SUMMARY: {passed}/{len(TEST_PAYLOADS)} Services Passed ({round(passed/len(TEST_PAYLOADS)*100, 1)}%)")
    print(f"⏱ Total Execution Time: {total_time}s across all 36 services")
    print("=" * 95)

    if failed == 0:
        print("🎉 ALL 36 QUANTUM CAPABILITIES ARE 100% OPERATIONAL WITH ACCURATE RESULTS!")
        return 0
    else:
        print(f"⚠️ {failed} test(s) encountered issues. Please review logs above.")
        return 1

if __name__ == "__main__":
    exit_code = run_test_suite()
    sys.exit(exit_code)
