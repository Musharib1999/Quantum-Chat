# Quantum Guru — Repository, Branch & Version Registry

> **Single Source of Truth** for repository remotes, synchronization status, branch mappings, and version milestones for the **Quantum Guru** platform.

---

## 1. Remote Repositories & Sync Group

All code commits and releases are maintained in continuous synchronization across the primary remotes:

| Remote Alias | Repository URL | Primary Purpose | Current Sync State |
| :--- | :--- | :--- | :--- |
| **`railway`** | `https://github.com/musharibsep-eng/Quantum-Guru-09-09-2026.git` | Production Deployment / Railway CI/CD Target | **Synchronized (`d70a26d`)** |
| **`quantum-chat`** | `https://github.com/Musharib1999/Quantum-Chat.git` | Primary Collaboration & Source Repository | **Synchronized (`d70a26d`)** |
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
* **Latest Sync Timestamp:** `2026-09-29 19:35:00 +05:30`
* **Latest Commit Hash:** `d70a26d`

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
| **[HEAD]** | 2026-09-29 | Musharib Subhani | **fix(ide): eliminate residual placeholder values on custom projects & fix stale useCallback dwaveCode execution**<br>• Fixed root cause where `handleRunOrRecompile` closed over stale mount-time `dwaveCode` (missing from `useCallback` dependency array), causing runs to execute Clean Energy Portfolio code<br>• Isolated Clean Energy sliders, slack transformation ($H_{\\text{penalty}}$), and $Q_{ii}$ expansion to `clean_energy_portfolio` project only<br>• Replaced hardcoded portfolio cost/score metrics (`Cost: $14/$18 · Score: 18.5`) in status bar with dynamic QUBO telemetry (`Variables: N · Active: K · Energy: E · Reads: R`)<br>• Added empty-state prompt in `QMatrixHeatmap` when couplers are uncompiled, preventing residual 4x4 asset matrix leaks<br>• Added per-project results caching (`quantum_ide_result_${projectId}`) to prevent cross-project result contamination |
| **`d70a26d`** | 2026-09-29 | Musharib Subhani | **fix(ide): full localStorage persistence for active project, custom projects & editor code across reloads**<br>• Replaced hardcoded initial project and code state with synchronous `localStorage` lazy initializers<br>• Auto-saved user's written and pasted code (`dwaveCode` / `qiskitCode`) in real-time per project and file to `localStorage`<br>• Restored custom projects, active files, and editor buffer on refresh, stopping unintentional resets back to the Clean Energy Portfolio<br>• Populated template `fileContents` across all built-in projects (Clean Energy, Quantum Teleportation, Max-Cut, and VQE H2) |
| **`09f3503`** | 2026-09-29 | Musharib Subhani | **fix(ide): dynamic BQM formulation, live QUBO Q-matrix, elevated terminal stdout & spectrum telemetry**<br>• Replaced hardcoded Clean Energy Portfolio matrix in `QMatrixHeatmap` with live `solverResult.qubo_matrix` and dynamic variable headers<br>• Added runtime symbolic LaTeX Hamiltonian generation (`latex_formula`) in `execution_runner.py` rendered dynamically in `FormulationCanvas`<br>• Elevated stdout to display immediately below command prompt in terminal, expanded terminal drawer height to `h-48`<br>• Wired dynamic `num_reads` and active variables into `EnergySpectrumView` telemetry |
| **`57a8538`** | 2026-09-29 | Musharib Subhani | **fix(dwave): preserve custom editor code on compile, execute real dimod code via /api/ide/execute**<br>• Fixed root cause where clicking `⚡ Recompile` triggered `setDwaveCode(...)`, obliterating user pasted or typed code<br>• Rerouted D-Wave execution to `/api/ide/execute` with target backend `dwave_simulated_annealing`<br>• Added runtime sandbox support for legacy `from qubo_matrix import get_qubo_model` and auto-extraction of `dimod` optimization solutions (ground energy, active variable decisions, sampled eigenstates)<br>• Preserved user's code in Monaco editor 100% across all compilation and execution runs |
| **`b2834f0`** | 2026-09-29 | Musharib Subhani | **fix(qiskit): route execution via /api/ide/execute proxy, live Aer results & dynamic circuit canvas**<br>• Switched direct client-side fetch from \`http://localhost:8002\` to internal Next.js proxy \`/api/ide/execute\` (resolving CORS / gateway offline errors)<br>• Dynamically populated statevector measurement counts, active qubit count, circuit depth, and shot count from Qiskit Aer<br>• Replaced hardcoded circuit placeholder in \`CircuitCanvasView\` with dynamic gate wire synthesis and official Qiskit ASCII diagram drawer<br>• Wired live telemetry specs (\`Qubits\`, \`Depth\`, \`Shots\`) into bottom status bar<br>• Added real-time output terminal streaming with stdout and ASCII circuit diagrams |
| **`e30a569`** | 2026-09-29 | Musharib Subhani | **chore(landing): rename IDE to Studio across landing page and metadata**<br>• Renamed \`Quantum IDE & Studio\` workspace title to \`Quantum Studio\`<br>• Updated navbar and hero CTA buttons to \`Launch Studio\` and \`Launch Quantum Studio →\`<br>• Updated modal and rollout copy to refer exclusively to \`Quantum Studio\`<br>• Aligned page metadata title to \`Quantum Guru AI — AI-Native Quantum Studio\` |
| **`25e0d53`** | 2026-09-29 | Musharib Subhani | **fix(ide): navbar QUANTUM GURU branding, theme persistence, light theme contrast & account logout**<br>• Added \`QUANTUM GURU\` uppercase brand text between logo and Code tab with comfortable spacing<br>• Removed misleading non-functional dropdown chevron from simulator chip (\`AerSimulator\` / \`D-Wave\`)<br>• Fixed invisible execution and Copilot send buttons in light mode by replacing uncompiled CSS classes with high-contrast Tailwind utilities<br>• Implemented \`localStorage\` theme persistence with DOM synchronization across browser reloads<br>• Removed \`QUANTUM GURU\` from bottom status bar to declutter telemetry<br>• Added interactive user account menu popover and direct one-click logout button |
| **`6bc3706`** | 2026-09-29 | Musharib Subhani | **docs: add repo.md registry for repositories, branches, sync status & versions** |
| **`a187c5b`** | 2026-09-29 | Musharib Subhani | **feat(ide): high-density studio navbar, standalone logo, 442px copilot & bottom telemetry bar**<br>• Scaled standalone logo mark (36px) with white rounded container<br>• Grouped navigation tabs on left (D-Wave: Code/Model/QUBO/Results; Qiskit: Code/Circuit/Results)<br>• Cleaned header clutter (hidden sync pill, copy, navbar console, new project button)<br>• Realigned bottom status bar: Theme toggle & full `QUANTUM GURU` branding on left; Telemetry metrics & `Console ↑` right-aligned<br>• Widened AI Copilot sidebar by 15% (442px) with horizontal scroll KaTeX math bounds |
| **`04a2800`** | 2026-09-17 | Musharib Subhani | **fix(opt): resolve blank energy/qubo results tab**<br>• Fixed QAOA template `NameError`<br>• Auto-populate `optimization_results` on agent synthesis<br>• Direct `Execute Annealer` wiring to `handleRun` |
| **`8f130ce`** | 2026-09-17 | Musharib Subhani | **fix(ide): auto-reconstruct BQM from Q_matrix**<br>• Auto-focus Energy & QUBO Results tab upon execution completion |
| **`bab7a24`** | 2026-09-17 | Musharib Subhani | **feat(optimization): autonomous QUBO pipeline**<br>• Algebraic slack compilation and dual solver synthesis |
