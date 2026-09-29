# Quantum Guru — Repository, Branch & Version Registry

> **Single Source of Truth** for repository remotes, synchronization status, branch mappings, and version milestones for the **Quantum Guru** platform.

---

## 1. Remote Repositories & Sync Group

All code commits and releases are maintained in continuous synchronization across the primary remotes:

| Remote Alias | Repository URL | Primary Purpose | Current Sync State |
| :--- | :--- | :--- | :--- |
| **`railway`** | `https://github.com/musharibsep-eng/Quantum-Guru-09-09-2026.git` | Production Deployment / Railway CI/CD Target | **Synchronized (`a187c5b`)** |
| **`quantum-chat`** | `https://github.com/Musharib1999/Quantum-Chat.git` | Primary Collaboration & Source Repository | **Synchronized (`a187c5b`)** |
| **`origin`** | `https://github.com/Musharib1999/QuantumGuru_Version2_09_11_2026.git` | Upstream Platform Master Archive | Secondary Reference |

---

## 2. Active Branch Architecture

| Branch Name | Status | Target Solvers / Features | Latest Commit |
| :--- | :--- | :--- | :--- |
| **`phase-2/cloud-runpod-qwen`** | **ACTIVE (Current HEAD)** | High-Density IDE Studio, 442px Copilot, D-Wave & Qiskit UI, RunPod Qwen-2.5-Coder-32B backend | `a187c5b` |
| **`main`** | **Production** | Stable core release branch across all studios | `bab7a24` |
| **`phase-3/optimization-qubo`** | **Staged** | Autonomous QUBO, algebraic slack compilation, multi-objective annealing | `dbfa110` |
| **`phase-4/agentic-chemistry-qml`** | Planned | Active-space VQE (OpenFermion/PySCF) and QSVM classifiers | `dbfa110` |
| **`phase-5/enterprise-deployment`** | Planned | Multi-tenant cluster deployment and enterprise auth | `dbfa110` |

---

## 3. Current Version & System Snapshot

* **Current Semantic Version:** `v2.2.0-phase2`
* **Release Stage:** Phase 2 (High-Density Studio & Cloud RunPod/Qwen Integration)
* **Active Working Branch:** `phase-2/cloud-runpod-qwen`
* **Latest Sync Timestamp:** `2026-09-29 03:01:30 +05:30`
* **Latest Commit Hash:** `a187c5b`

---

## 4. Synchronization Protocol (Dual-Push Standard)

Whenever code changes or fixes are committed, both primary remotes (`railway` and `quantum-chat`) **must** be updated simultaneously:

```bash
# 1. Commit changes locally
git commit -m "feat(scope): descriptive commit message"

# 2. Push in tandem to both remotes
git push railway <branch-name>
git push quantum-chat <branch-name>
```

### Optional Single-Command Multi-Push Setup
To push to both remotes with a single command:
```bash
git remote add all https://github.com/musharibsep-eng/Quantum-Guru-09-09-2026.git
git remote set-url --add --push all https://github.com/musharibsep-eng/Quantum-Guru-09-09-2026.git
git remote set-url --add --push all https://github.com/Musharib1999/Quantum-Chat.git

# Then push to both simultaneously:
git push all <branch-name>
```

---

## 5. Milestone & Commit History

| Commit | Date | Author | Description & Impact |
| :--- | :--- | :--- | :--- |
| **`a187c5b`** | 2026-09-29 | Musharib Subhani | **feat(ide): high-density studio navbar, standalone logo, 442px copilot & bottom telemetry bar**<br>• Scaled standalone logo mark (36px) with white rounded container<br>• Grouped navigation tabs on left (D-Wave: Code/Model/QUBO/Results; Qiskit: Code/Circuit/Results)<br>• Cleaned header clutter (hidden sync pill, copy, navbar console, new project button)<br>• Realigned bottom status bar: Theme toggle & full `QUANTUM GURU` branding on left; Telemetry metrics & `Console ↑` right-aligned<br>• Widened AI Copilot sidebar by 15% (442px) with horizontal scroll KaTeX math bounds |
| **`04a2800`** | 2026-09-17 | Musharib Subhani | **fix(opt): resolve blank energy/qubo results tab**<br>• Fixed QAOA template `NameError`<br>• Auto-populate `optimization_results` on agent synthesis<br>• Direct `Execute Annealer` wiring to `handleRun` |
| **`8f130ce`** | 2026-09-17 | Musharib Subhani | **fix(ide): auto-reconstruct BQM from Q_matrix**<br>• Auto-focus Energy & QUBO Results tab upon execution completion |
| **`bab7a24`** | 2026-09-17 | Musharib Subhani | **feat(optimization): autonomous QUBO pipeline**<br>• Algebraic slack compilation and dual solver synthesis |
