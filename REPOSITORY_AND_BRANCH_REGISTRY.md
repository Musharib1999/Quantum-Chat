# Quantum Guru & OptiOS — Master Repository & Branch Registry

> **Status:** Active Reference Document  
> **Last Updated:** November 11, 2026  
> **Primary Workspace:** `/Users/musharibsubhani/.gemini/antigravity/playground/prime-blazar`  

---

## 1. Primary Git Remotes & Synchronization Group

All platform development is tracked across three primary GitHub remotes. Continuous deployment requires keeping `railway` and `quantum-chat` synchronized on every release.

| Remote Alias | Repository URL | Purpose | Tracking Status |
| :--- | :--- | :--- | :--- |
| **`railway`** | `https://github.com/ms8809444-arch/Quantum-guru--11-11-2026.git` | Production deployment target for Railway CI/CD & backend API | Synchronized (main & phase-2) |
| **`railway-legacy`** | `https://github.com/musharibsep-eng/Quantum-Guru-09-09-2026.git` | Prior Railway production repository archive | Legacy Archive |
| **`quantum-chat`** | `https://github.com/Musharib1999/Quantum-Chat.git` | Primary team source repository & Next.js frontend code | Synchronized |
| **`origin`** | `https://github.com/Musharib1999/QuantumGuru_Version2_09_11_2026.git` | Upstream platform master archive & reference snapshot | Secondary Archive |

---

## 2. Active Branch Architecture & Status

| Branch Name | Status | Target Solvers / Architectural Focus | Latest Commit Reference |
| :--- | :--- | :--- | :--- |
| **`phase-2/cloud-runpod-qwen`** | **ACTIVE (Current HEAD)** | High-Density Studio IDE, 442px Copilot, D-Wave & Qiskit UI, Warm Simulation Worker Pool, RunPod/Local fallback | `7e2e99a` / `4f69e70` |
| **`main`** | **Production Baseline** | Production release branch across full application suite | `bab7a24` |
| **`local-fallback-working`** | **Fallback Snapshot** | Verified stable local inference checkpoint created prior to cloud migrations | `c798640` |
| **`phase-3/optimization-qubo`** | **Staged** | Autonomous QUBO, algebraic slack variable compilation, multi-objective annealing | `dbfa110` |
| **`phase-4/agentic-chemistry-qml`** | Planned | Active-space VQE (OpenFermion / PySCF) and QSVM kernel classifiers | `dbfa110` |
| **`phase-5/enterprise-deployment`** | Planned | Multi-tenant cluster deployment, RBAC permissions, and usage quota billing | `dbfa110` |

---

## 3. Comprehensive Local & Remote Branch Directory

### Local Branches (`git branch`)
1. **`phase-2/cloud-runpod-qwen`** `[HEAD]` — Current active development branch containing the full Quantum Studio IDE, warm worker pools, and hardened Next.js / FastAPI gateways.
2. **`main`** — Production-ready baseline branch.
3. **`local-fallback-working`** — Dated checkpoint (`2026-08-13`) for safe rollback to local solver configurations.
4. **`phase-1/ide-simulators`** — Initial simulator integration (Qiskit Aer, PennyLane, Neal simulated annealing).
5. **`phase-2/circuit-synthesis`** — Gate-based circuit canvas and ASCII diagram rendering engine.
6. **`phase-2/cloud-deployment`** — Docker containerization and cloud orchestration blueprints.
7. **`phase-2/cloud-groq`** — Direct Groq API acceleration branch (`llama-3.3-70b-versatile`).
8. **`phase-3/optimization-qubo`** — Pure mathematical formulation parser and AutoQUBO engine.
9. **`phase-4/agentic-chemistry-qml`** — VQE molecular geometry and QML studio prototypes.
10. **`phase-5/enterprise-deployment`** — Enterprise telemetry, audit logs, and fleet management.
11. **`feature/quantum-cursor-ide`** — Monaco code editor integration with bidirectional Copilot injection.
12. **`feature/quantum-chemistry-studio`** — Dedicated chemistry workbench with atomic orbital visualization.
13. **`feature/qml-studio`** — Quantum neural network layer builders.
14. **`inspect/c798640-optimization-study`** — Verification sandbox for mathematical solver benchmarks.
15. **`backup/pre-math-rigor`** — Codebase snapshot preserved prior to mathematical IR verification layer.

### Remote Tracking Branches (`git branch -r`)
* `origin/main`
* `origin/phase-2/circuit-synthesis`
* `origin/phase-2/cloud-deployment`
* `quantum-chat/main`
* `quantum-chat/phase-2/circuit-synthesis`
* `quantum-chat/phase-2/cloud-deployment`
* `quantum-chat/phase-2/cloud-groq`
* `quantum-chat/phase-2/cloud-runpod-qwen`
* `railway/main`
* `railway/phase-2/cloud-deployment`
* `railway/phase-2/cloud-groq`
* `railway/phase-2/cloud-runpod-qwen`

---

## 4. Multi-Push Synchronization Standard

To ensure that both the production deployment pipeline (`railway`) and the team source repository (`quantum-chat`) remain completely in sync:

### Standard Tandem Push
```bash
# Push working branch to both remotes
git push railway <branch-name>
git push quantum-chat <branch-name>
```

### Unified Single-Command Push
To push to both destinations with a single command:
```bash
# Configure unified 'all' remote (one-time setup):
git remote add all https://github.com/musharibsep-eng/Quantum-Guru-09-09-2026.git
git remote set-url --add --push all https://github.com/musharibsep-eng/Quantum-Guru-09-09-2026.git
git remote set-url --add --push all https://github.com/Musharib1999/Quantum-Chat.git

# Execute tandem push:
git push all <branch-name>
```

---

## 5. Ecosystem & Ancillary Service Repositories

| Service Component | Repository URL | Purpose |
| :--- | :--- | :--- |
| **OptiOS / Quantum-Chat** | [`Musharib1999/Quantum-Chat`](https://github.com/Musharib1999/Quantum-Chat) | Full-stack platform: Next.js frontend, Python engine, Studio IDE |
| **D-Wave Production Service** | [`Dhananjayg11/QuantumDWAVE`](https://github.com/Dhananjayg11/QuantumDWAVE) | Hardened D-Wave quantum annealing server |
| **Qiskit Simulator Service** | [`Musharib1999/qiskit-simulator`](https://github.com/Musharib1999/qiskit-simulator) | Dedicated microservice for gate-based Aer simulations |
| **OR-Tools Classical Solver** | [`Musharib1999/Classical-Solver-ortools-google`](https://github.com/Musharib1999/Classical-Solver-ortools-google) | Google OR-Tools MILP / CP-SAT solver service |
| **D-Wave Dev Backend** | [`Musharib1999/quantum_calculation_backend_dwave`](https://github.com/Musharib1999/quantum_calculation_backend_dwave) | Staging and experimentation backend for D-Wave |
| **Quantum Market Service** | [`Musharib1999/Quantum-Market-Stock`](https://github.com/Musharib1999/Quantum-Market-Stock) | Quantum sector financial & stock telemetry service |
| **Quantum News Service** | [`Musharib1999/Quantum-News`](https://github.com/Musharib1999/Quantum-News) | Quantum computing industry intelligence & news pipeline |

---

## 6. Verification & Audit History

* **September 29, 2026 (`7e2e99a`):** Autonomous QUBO formulation wiring, Monaco IDE bidirectional injection, and data connectors.
* **September 30, 2026 (`4f69e70`):** Direct-model natural language parsing, dynamic variable map preservation, and KaTeX mathematical escaping fixes.
* **November 9, 2026:** Hardened IDE test suites (AST Penetration 7/7, Concurrency Queue 16/16, Cross-Project Isolation 20/20, Algorithm Bank 26/26). Added Gateway Service Auth, MongoDB Atlas persistence, and warm worker pool (<1.5ms latency).
* **November 11, 2026:** 
  - **Qiskit Canvas Fix**: Resolved loop wipeout race condition via  and loop-aware AST protection.
  - **D-Wave Execution Flow**: Warm pool bypass for single-file scripts and complete dynamic QUBO/BQM/CQM/NumPy introspection.
  - **Strict Framework Isolation**: Added  runtime enforcer blocking Qiskit in D-Wave and vice versa.
  - **AI Copilot Boundary**: Eliminated GHZ hallucination on framework mismatch; Copilot strictly refuses cross-framework synthesis and guides to Project Switcher.
  - **Dynamic Telemetry Synchronization**: Reconciled ground-truth  and  across Monaco editor, stdout, Results badge, and Execution Output History.
  - **Automated Test Suite**: 13/13 rigorous D-Wave integration tests passing (DW-101 to DW-701 scale stress test).
