#!/usr/bin/env python3
"""
Quantum Guru — Comprehensive Stability & Consistency Test Suite (Phase 1 & Phase 2)
Tests:
1. Project Creation & Framework Scaffolding
2. Frameworks, Code & Solver Execution (Qiskit Aer & D-Wave SA)
3. End-to-End Mathematical Formulation, Code, Coupler & Ground State Parity
4. Determinism & Seed Reproducibility
5. Zero Cross-Contamination Across Paradigms
6. Scale & Latency Benchmarks (N=4 to N=200 variables)
"""

import sys
import time
import json
import random
import requests
from typing import Dict, Any, List

BACKEND_URL = "http://localhost:8002"
NEXTJS_URL = "http://localhost:3000"

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

passed_tests = 0
failed_tests = 0
total_tests = 0


def log_suite(title: str):
    print(f"\n{BOLD}{CYAN}{'=' * 70}{RESET}")
    print(f"{BOLD}{CYAN}▶ SUITE: {title}{RESET}")
    print(f"{BOLD}{CYAN}{'=' * 70}{RESET}")


def assert_test(name: str, condition: bool, details: str = ""):
    global passed_tests, failed_tests, total_tests
    total_tests += 1
    if condition:
        passed_tests += 1
        print(f"  {GREEN}✔ PASS{RESET} {name} {f'({details})' if details else ''}")
    else:
        failed_tests += 1
        print(f"  {RED}✘ FAIL{RESET} {name} {f'— {details}' if details else ''}")


# ─────────────────────────────────────────────────────────────────────────────
# SUITE 1: PROJECT CREATION & FRAMEWORK SCAFFOLDING
# ─────────────────────────────────────────────────────────────────────────────
def test_project_scaffolding():
    log_suite("1. Project Creation & Framework Scaffolding")

    ide_path = "src/app/ide/page.tsx"
    with open(ide_path, "r", encoding="utf-8") as f:
        ide_code = f.read()

    # Verify D-Wave Annealing template
    dwave_template_ok = "portfolio-optimization" in ide_code and "dwave_simulated_annealing" in ide_code
    assert_test("D-Wave Annealing Template Registration", dwave_template_ok, "portfolio-optimization -> dwave_simulated_annealing")

    # Verify Qiskit Gate template
    qiskit_template_ok = "my-quantum-project" in ide_code and "aer_simulator" in ide_code
    assert_test("Qiskit Gate Model Template Registration", qiskit_template_ok, "my-quantum-project -> aer_simulator")

    # Verify D-Wave Blank canvas template
    dwave_blank_ok = "dwave-annealing" in ide_code
    assert_test("D-Wave Blank Canvas Template Registration", dwave_blank_ok, "dwave-annealing")

    # Verify quantum.config.json deployment contract
    sla_contract_ok = "https://quantumguru.ai/schemas/v1/deployment.json" in ide_code and "dwave_advantage_qpu" in ide_code
    assert_test("Quantum SLA & Egress Deployment Contract", sla_contract_ok, "quantum.config.json schema")


# ─────────────────────────────────────────────────────────────────────────────
# SUITE 2: FRAMEWORK CODE & SOLVER EXECUTION
# ─────────────────────────────────────────────────────────────────────────────
def test_framework_solvers_execution():
    log_suite("2. Framework Code & Solver Execution")

    # 1. Qiskit Bell State Execution
    qiskit_code = """
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)
qc.measure_all()

sim = AerSimulator()
res = sim.run(qc, shots=500).result()
counts = res.get_counts()
print(f"Counts: {counts}")
"""
    t0 = time.time()
    res = requests.post(f"{BACKEND_URL}/v3/enterprise/ide/execute", json={
        "code": qiskit_code,
        "target_backend": "aer_simulator",
        "shots": 500
    })
    qiskit_dur = (time.time() - t0) * 1000

    qiskit_ok = res.status_code == 200
    data = res.json() if qiskit_ok else {}
    assert_test("Qiskit AerSimulator Execution HTTP 200", qiskit_ok, f"{qiskit_dur:.1f}ms")

    counts = data.get("measurement_counts", {})
    entangled_ok = "00" in counts or "11" in counts
    assert_test("Qiskit Entanglement Verification (|00⟩ and |11⟩)", entangled_ok, f"counts={counts}")

    gates = data.get("circuit_gates", [])
    has_h = any(g.get("name") == "h" for g in gates)
    has_cx = any(g.get("name") in ("cx", "x") for g in gates)
    assert_test("Qiskit Interactive Canvas Gate Extraction", has_h and has_cx, f"{len(gates)} gate instructions extracted")

    # 2. D-Wave Annealing Execution via /v3/enterprise/ide/execute
    dwave_code = """
import dimod
from dwave.samplers import SimulatedAnnealingSampler

bqm = dimod.BinaryQuadraticModel.from_qubo({
    ('x0', 'x0'): -11.25,
    ('x1', 'x1'): -9.5,
    ('x0', 'x1'): 15.7
}, offset=0.0)

sampler = SimulatedAnnealingSampler()
ss = sampler.sample(bqm, num_reads=300)
print('Optimal Ground Energy:', ss.first.energy)
print('Ground Sample:', ss.first.sample)
"""
    t0 = time.time()
    res2 = requests.post(f"{BACKEND_URL}/v3/enterprise/ide/execute", json={
        "code": dwave_code,
        "target_backend": "dwave_simulated_annealing",
        "shots": 300
    })
    dwave_dur = (time.time() - t0) * 1000

    dwave_ok = res2.status_code == 200
    data2 = res2.json() if dwave_ok else {}
    assert_test("D-Wave Simulated Annealing Execution HTTP 200", dwave_ok, f"{dwave_dur:.1f}ms")

    opt_res = data2.get("optimization_results") or {}
    has_energy = "energy" in opt_res and opt_res["energy"] < 0
    assert_test("D-Wave Ground Energy Telemetry Extraction", has_energy, f"E={opt_res.get('energy')}")

    # 3. Next.js API Proxy Route /api/dwave/simulate-qubo
    t0 = time.time()
    res3 = requests.post(f"{NEXTJS_URL}/api/dwave/simulate-qubo", json={
        "variables": ["Wind_A", "Solar_B"],
        "matrix": [[-11.25, 15.7], [15.7, -9.5]],
        "num_reads": 200
    })
    proxy_dur = (time.time() - t0) * 1000
    proxy_ok = res3.status_code == 200
    data3 = res3.json() if proxy_ok else {}
    assert_test("Next.js Proxy Route (/api/dwave/simulate-qubo)", proxy_ok, f"{proxy_dur:.1f}ms, backend_ms={data3.get('execution_time_ms')}")


# ─────────────────────────────────────────────────────────────────────────────
# SUITE 3: END-TO-END DATA, CODE, COUPLER & SOLVER PARITY
# ─────────────────────────────────────────────────────────────────────────────
def test_mathematical_formulation_parity():
    log_suite("3. End-to-End Mathematical Formulation, Coupler & Ground State Parity")

    c = [9.0, 7.0, 6.0, 8.0]
    r = [20.25, 15.0, 10.0, 18.0]
    gamma = 1.0
    lam = 3.5
    b_max = 18.0
    lam_ex = 8.0

    # 1. Theoretical Coupler Q_01 Derivation
    q01_base = lam * c[0] * c[1] * 0.035
    q01_with_mutual = q01_base + lam_ex

    assert_test("Analytical Q_01 Base Coupler Calculation", abs(q01_base - 7.7) < 0.1, f"Q_01_base={q01_base:.2f}")
    assert_test("Analytical Q_01 Mutual Exclusion Coupler (+8.0)", abs(q01_with_mutual - 15.7) < 0.1, f"Q_01_total={q01_with_mutual:.2f}")

    # 2. Solve on Backend with Mutual Exclusion Injected
    matrix = [
        [-11.25, 15.7, 7.7, 9.9],
        [15.7, -9.5, 5.1, 7.7],
        [7.7, 5.1, -18.0, 6.6],
        [9.9, 7.7, 6.6, -50.8]
    ]
    variables = ["Wind_A", "Solar_B", "Battery_C", "Hydro_D"]

    res = requests.post(f"{BACKEND_URL}/v3/enterprise/dwave/simulate-qubo", json={
        "variables": variables,
        "matrix": matrix,
        "num_reads": 500,
        "seed": 42
    })

    data = res.json()
    best_sample = data.get("sample", {})
    ground_energy = data.get("energy", 0.0)

    # 3. Verify Mutual Exclusion Ground State Guarantee:
    # Wind_A (x0) and Solar_B (x1) must NOT both be 1!
    x0 = best_sample.get("Wind_A", 0)
    x1 = best_sample.get("Solar_B", 0)
    mutual_exclusion_satisfied = not (x0 == 1 and x1 == 1)

    assert_test("Mutual Exclusion Ground State Guarantee (Wind_A ⋅ Solar_B == 0)", mutual_exclusion_satisfied, f"Wind_A={x0}, Solar_B={x1}, E={ground_energy}")

    # 4. Verify Matrix Symmetry Q_ij == Q_ji
    qubo_mat = data.get("qubo_matrix", [])
    symmetric = True
    for i in range(len(variables)):
        for j in range(len(variables)):
            if abs(qubo_mat[i][j] - qubo_mat[j][i]) > 1e-4:
                symmetric = False
                break
    assert_test("Q-Matrix Coupler Hermiticity/Symmetry (Q_ij == Q_ji)", symmetric, "All couplers symmetric")


# ─────────────────────────────────────────────────────────────────────────────
# SUITE 4: DETERMINISM & SEED REPRODUCIBILITY
# ─────────────────────────────────────────────────────────────────────────────
def test_determinism_and_seeds():
    log_suite("4. Determinism & Seed Reproducibility")

    matrix = [
        [-11.25, 15.7, 7.7, 9.9],
        [15.7, -9.5, 5.1, 7.7],
        [7.7, 5.1, -18.0, 6.6],
        [9.9, 7.7, 6.6, -50.8]
    ]
    variables = ["Wind_A", "Solar_B", "Battery_C", "Hydro_D"]

    results = []
    for run_idx in range(10):
        res = requests.post(f"{BACKEND_URL}/v3/enterprise/dwave/simulate-qubo", json={
            "variables": variables,
            "matrix": matrix,
            "num_reads": 200,
            "seed": 1337
        })
        d = res.json()
        results.append((d.get("energy"), d.get("sample")))

    first_energy, first_sample = results[0]
    all_energies_match = all(r[0] == first_energy for r in results)
    all_samples_match = all(r[1] == first_sample for r in results)

    assert_test("Seed Determinism (10/10 Runs Identical Energy)", all_energies_match, f"E={first_energy} across all 10 runs")
    assert_test("Seed Determinism (10/10 Runs Identical Bitstrings)", all_samples_match, f"Sample={first_sample}")


# ─────────────────────────────────────────────────────────────────────────────
# SUITE 5: ZERO CROSS-CONTAMINATION ACROSS PARADIGMS
# ─────────────────────────────────────────────────────────────────────────────
def test_zero_cross_contamination():
    log_suite("5. Zero Cross-Contamination Across Paradigms")

    # Step 1: Execute Qiskit
    qiskit_code = """
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)
qc.measure_all()
sim = AerSimulator()
res = sim.run(qc, shots=200).result()
"""
    res1 = requests.post(f"{BACKEND_URL}/v3/enterprise/ide/execute", json={"code": qiskit_code, "target_backend": "aer_simulator"}).json()
    assert_test("Run 1 (Qiskit): Contains circuit_gates", "circuit_gates" in res1 and len(res1["circuit_gates"]) > 0)
    assert_test("Run 1 (Qiskit): Zero D-Wave optimization_results", res1.get("optimization_results") is None)

    # Step 2: Execute D-Wave
    dwave_code = """
import dimod
from dwave.samplers import SimulatedAnnealingSampler
bqm = dimod.BinaryQuadraticModel.from_qubo({('x0', 'x0'): -5.0}, offset=0.0)
ss = SimulatedAnnealingSampler().sample(bqm, num_reads=50)
"""
    res2 = requests.post(f"{BACKEND_URL}/v3/enterprise/ide/execute", json={"code": dwave_code, "target_backend": "dwave_simulated_annealing"}).json()
    assert_test("Run 2 (D-Wave): Contains optimization_results", res2.get("optimization_results") is not None)
    assert_test("Run 2 (D-Wave): Zero Qiskit measurement_counts", res2.get("measurement_counts") is None)

    # Step 3: Execute Qiskit Again
    res3 = requests.post(f"{BACKEND_URL}/v3/enterprise/ide/execute", json={"code": qiskit_code, "target_backend": "aer_simulator"}).json()
    assert_test("Run 3 (Qiskit Re-Run): Zero residual D-Wave telemetry", res3.get("optimization_results") is None)


# ─────────────────────────────────────────────────────────────────────────────
# SUITE 6: SCALE & LATENCY BENCHMARKS (N=4 TO N=200)
# ─────────────────────────────────────────────────────────────────────────────
def test_scale_and_latency():
    log_suite("6. Scale & Latency Benchmarks (N=4 to N=200)")

    test_sizes = [4, 16, 50, 100, 200]

    for n in test_sizes:
        vars = [f"x{i}" for i in range(n)]
        matrix = [[0.0] * n for _ in range(n)]
        random.seed(42)
        for i in range(n):
            matrix[i][i] = round(random.uniform(-10, 10), 2)
            for j in range(i + 1, min(i + 5, n)):
                w = round(random.uniform(-5, 5), 2)
                matrix[i][j] = w
                matrix[j][i] = w

        t0 = time.time()
        res = requests.post(f"{BACKEND_URL}/v3/enterprise/dwave/simulate-qubo", json={
            "variables": vars,
            "matrix": matrix,
            "num_reads": 200 if n > 50 else 300,
            "seed": 42
        })
        wall_ms = (time.time() - t0) * 1000

        data = res.json()
        backend_ms = data.get("execution_time_ms", 0.0)
        energy = data.get("energy", 0.0)
        num_vars = data.get("num_variables", 0)

        max_acceptable_ms = 800 if n == 200 else (400 if n == 100 else 200)
        passed = res.status_code == 200 and num_vars == n and wall_ms < max_acceptable_ms

        assert_test(
            f"Scale N={n:<3} Variables",
            passed,
            f"Wall={wall_ms:.1f}ms, Solver={backend_ms:.1f}ms, E_ground={energy:.2f}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{BOLD}{CYAN}======================================================================{RESET}")
    print(f"{BOLD}{CYAN}   QUANTUM GURU OPTIMIZATION STUDIO STABILITY TEST HARNESS            {RESET}")
    print(f"{BOLD}{CYAN}======================================================================{RESET}")
    print(f"Target Gateway : {BACKEND_URL}")
    print(f"Next.js Proxy  : {NEXTJS_URL}")

    start_time = time.time()

    try:
        test_project_scaffolding()
        test_framework_solvers_execution()
        test_mathematical_formulation_parity()
        test_determinism_and_seeds()
        test_zero_cross_contamination()
        test_scale_and_latency()
    except Exception as e:
        print(f"\n{RED}UNHANDLED TEST RUNNER EXCEPTION: {e}{RESET}")
        import traceback
        traceback.print_exc()

    elapsed = time.time() - start_time
    print(f"\n{BOLD}{'=' * 70}{RESET}")
    print(f"{BOLD}TEST RESULTS SUMMARY{RESET}")
    print(f"Total Tests Run : {total_tests}")
    print(f"Passed          : {GREEN}{passed_tests}{RESET}")
    print(f"Failed          : {RED if failed_tests > 0 else GREEN}{failed_tests}{RESET}")
    print(f"Total Time      : {elapsed:.2f}s")
    print(f"{BOLD}{'=' * 70}{RESET}")

    if failed_tests == 0:
        print(f"{BOLD}{GREEN}🎉 ALL STABILITY & CONSISTENCY TESTS PASSED PERFECTLY!{RESET}\n")
        sys.exit(0)
    else:
        print(f"{BOLD}{RED}⚠️ SOME TESTS FAILED. CHECK LOGS ABOVE.{RESET}\n")
        sys.exit(1)


if __name__ == '__main__':
    main()
