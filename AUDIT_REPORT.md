# Quantum Guru AI Engine: 40-Question Performance & Accuracy Audit
**Audit Execution Timestamp:** 2026-09-14 15:09:50
**Total Execution Duration:** 278.6 seconds
**Gateway URL:** `http://127.0.0.1:8002`

## 🏆 Executive Summary Scoreboard

| Metric | QUBO Optimization (20) | Qiskit Circuits (20) | Combined Overall (40) |
|---|---|---|---|
| **Tests Passed** | 15/20 (75.0%) | 3/20 (15.0%) | **18/40 (45.0%)** |
| **Average Accuracy / Fidelity** | **77.5%** | **18.7%** | **48.1%** |
| **HTTP 429 Events Encountered** | - | - | **0** |
| **Total Backoff Wait Time** | - | - | **0.0s** |

---
## ⚡ Part 1: 20 QUBO Benchmarks Performance Audit

| ID | Title | Domain | Status | Accuracy | Found Energy | Ground Truth | Energy Gap | Retries (429) |
|---|---|---|---|---|---|---|---|---|
| `QUBO-01` | Max-Cut on Triangle Graph K3 | Graph Theory | ✓ PASS | 100.0% | -2.0 | -2.0 | 0.0 | 0 |
| `QUBO-02` | Max-Cut on 5-Cycle Graph C5 | Graph Theory | ✓ PASS | 100.0% | -4.0 | -4.0 | 0.0 | 0 |
| `QUBO-03` | Maximum Independent Set on C4 Graph | Graph Theory | ✓ PASS | 100.0% | -2.0 | -2.0 | 0.0 | 0 |
| `QUBO-04` | Minimum Vertex Cover on Star Graph K1,4 | Graph Theory | ✓ PASS | 100.0% | 1.0 | 1.0 | 0.0 | 0 |
| `QUBO-05` | Graph 3-Coloring on Triangle Graph | Constraint Satisfaction | ✓ PASS | 100.0% | 0.0 | 0.0 | 0.0 | 0 |
| `QUBO-06` | Number Partitioning on {3, 1, 1, 2, 2, 1} | Number Theory | ✓ PASS | 100.0% | 0.0 | 0.0 | 0.0 | 0 |
| `QUBO-07` | Number Partitioning on {4, 5, 6, 7, 8} | Number Theory | ✓ PASS | 100.0% | 0.0 | 0.0 | 0.0 | 0 |
| `QUBO-08` | 0/1 Knapsack with 3 Items & Weight Limit | Operations Research | ✓ PASS | 100.0% | -25.0 | -25.0 | 0.0 | 0 |
| `QUBO-09` | Exact Set Cover on 3 Sets | Combinatorics | ✓ PASS | 100.0% | 0.0 | 0.0 | 0.0 | 0 |
| `QUBO-10` | Traveling Salesperson Problem (3 Cities) | Routing & Logistics | ✗ FAIL | 0.0% | 0.0 | 45.0 | 45.0 | 0 |
| `QUBO-11` | 2-Job 2-Machine Task Scheduling | Scheduling | ✓ PASS | 100.0% | 0.0 | 0.0 | 0.0 | 0 |
| `QUBO-12` | Portfolio Optimization (3 Assets, Risk vs Return) | Quantitative Finance | ✓ PASS | 99.0% | -0.17 | -0.16 | 0.01 | 0 |
| `QUBO-13` | Currency Arbitrage Detection via QUBO | Quantitative Finance | ✓ PASS | 99.0% | -0.04 | -0.05 | 0.01 | 0 |
| `QUBO-14` | Warehouse Facility Location Problem | Supply Chain | ✗ FAIL | 0.0% | 0.0 | 12.0 | 12.0 | 0 |
| `QUBO-15` | Traffic Signal Green Phase Optimization | Smart Cities | ✓ PASS | 85.7% | -12.0 | -14.0 | 2.0 | 0 |
| `QUBO-16` | 1D Ferromagnetic Ising Chain (4 Spins) | Quantum Physics | ✗ FAIL | 0.0% | -7.0 | -3.0 | 4.0 | 0 |
| `QUBO-17` | Frustrated Antiferromagnetic Ring (3 Spins) | Quantum Physics | ✗ FAIL | 0.0% | -2.0 | -1.0 | 1.0 | 0 |
| `QUBO-18` | Boolean 2-SAT Satisfiability via QUBO | Logic | ✓ PASS | 100.0% | 0.0 | 0.0 | 0.0 | 0 |
| `QUBO-19` | Binary Linear System Solver (Ax = b) | Linear Algebra | ✓ PASS | 100.0% | 0.0 | 0.0 | 0.0 | 0 |
| `QUBO-20` | Pegasus Hardware Embedding & Coupler Matrix | D-Wave Architecture | ✗ FAIL | 66.7% | -2.0 | -3.0 | 1.0 | 0 |

---
## ⚛️ Part 2: 20 Qiskit Quantum Circuits Performance Audit

| ID | Title | Domain | Status | Fidelity | Qubits (Act/Exp) | Missing Gates | Retries (429) |
|---|---|---|---|---|---|---|---|
| `QISKIT-01` | 2-Qubit Bell State Phi+ | Quantum Entanglement | ✗ FAIL | 0.0% | 0/2 | None | 0 |
| `QISKIT-02` | 2-Qubit Bell State Psi- | Quantum Entanglement | ✗ FAIL | 0.0% | 3/2 | x | 0 |
| `QISKIT-03` | 3-Qubit GHZ State | Entanglement | ✓ PASS | 100.0% | 3/3 | None | 0 |
| `QISKIT-04` | 4-Qubit W-State Preparation | Multipartite Entanglement | ✗ FAIL | 0.0% | 0/4 | cx | 0 |
| `QISKIT-05` | Superdense Coding Protocol | Communication | ✗ FAIL | 0.0% | 3/2 | x, z | 0 |
| `QISKIT-06` | Quantum Teleportation Protocol | Communication | ✗ FAIL | 0.0% | 3/3 | None | 0 |
| `QISKIT-07` | Deutsch Algorithm (Balanced Oracle) | Algorithms | ✗ FAIL | 0.0% | 3/2 | x | 0 |
| `QISKIT-08` | Deutsch-Jozsa (3-Qubit Balanced) | Algorithms | ✗ FAIL | 0.0% | 3/4 | x | 0 |
| `QISKIT-09` | Bernstein-Vazirani (s = 101) | Algorithms | ✗ FAIL | 0.0% | 3/4 | x | 0 |
| `QISKIT-10` | Simon's Algorithm (s = 11) | Algorithms | ✗ FAIL | 0.0% | 3/4 | None | 0 |
| `QISKIT-11` | 2-Qubit Grover Search for |11> | Search | ✓ PASS | 100.0% | 2/2 | None | 0 |
| `QISKIT-12` | 3-Qubit Grover Search for |101> | Search | ✗ FAIL | 74.0% | 3/3 | None | 0 |
| `QISKIT-13` | 3-Qubit Quantum Fourier Transform | Transforms | ✓ PASS | 99.7% | 3/3 | None | 0 |
| `QISKIT-14` | 3-Qubit Inverse QFT (QFT Dag) | Transforms | ✗ FAIL | 0.0% | 0/3 | h, cp | 0 |
| `QISKIT-15` | Quantum Phase Estimation for T-Gate | Phase Estimation | ✗ FAIL | 0.0% | 3/4 | x, cp, swap | 0 |
| `QISKIT-16` | Hardware-Efficient Ansatz (2 Qubits) | VQA | ✗ FAIL | 0.0% | 3/2 | ry | 0 |
| `QISKIT-17` | VQE Ansatz for H2 Ground State | Chemistry | ✗ FAIL | 0.0% | 3/2 | x, ry | 0 |
| `QISKIT-18` | QAOA Circuit for Max-Cut (p=1) | Optimization | ✗ FAIL | 0.0% | 3/3 | rz, rx | 0 |
| `QISKIT-19` | 3-Qubit Bit-Flip Repetition Code | Error Correction | ✗ FAIL | 0.0% | 0/5 | None | 0 |
| `QISKIT-20` | Quantum Half-Adder Circuit | Arithmetic | ✗ FAIL | 0.0% | 3/3 | ccx | 0 |

---
## 🛡️ Groq HTTP 429 Resilience & Rate Limit Telemetry

- **Total 429 Throttling Events:** 0
- **Total Exponential Backoff Wait:** 0.00 seconds
- **Retry Resilience:** All intercepted 429 responses successfully recovered with zero workspace crashes or unhandled exceptions.