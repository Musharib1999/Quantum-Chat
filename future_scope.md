# Future Scope - Experimental & Secondary Modules

This document tracks the modules that have been moved to the "Future Scope" section of the Admin Dashboard. These modules are currently hidden from the primary navigation to maintain a clean production environment, but they can be toggled back on for development and testing.

## Hidden Modules

| Module Name | Identifier | Status | Purpose |
|:---|:---|:---|:---|
| **Stock Debugger** | `stock_debug` | Experimental | Advanced debugging tools for stock search and data ingestion. |
| **Analytics** | `analytics` | Placeholder | Future usage statistics and query insight dashboard. |
| **Shot Logs** | `experiments` | Secondary | Detailed logs for low-level quantum circuit execution. |
| **News Blocklist** | `news_blocklist` | Internal | Managing blocked sources for the News Integration module. |
| **Market Prompts** | `market_prompts` | Experimental | Specific system prompts for financial market analysis scenarios. |
| **Enterprise Streams** | `enterprise_streams` | In-Progress | Configuring real-time data streams for enterprise clients. |
| **Use Cases** | `use_cases` | Secondary | Management of industry-specific demo scenarios. |

---

## How to Unhide

To re-enable these modules in the UI:
1. Navigate to the **Admin Dashboard**.
2. Look at the bottom of the **Sidebar**.
3. Click the **"Show Future Scope"** button.
4. The modules will appear in an **Experimental** section at the bottom of the navigation menu.

> [!NOTE]
> The toggle state is persistent (saved in `localStorage`), so it will remember your preference across browser sessions.

---

## Technical Details

- **Sidebar Configuration**: [AdminSidebar.tsx](file:///Users/musharibsubhani/.gemini/antigravity/playground/prime-blazar/src/components/admin/AdminSidebar.tsx)
- **Dashboard Routing**: [page.tsx](file:///Users/musharibsubhani/.gemini/antigravity/playground/prime-blazar/src/app/admin/dashboard/page.tsx)
- **State Logic**: Uses `showFutureScope` state and `localStorage` key `qg_admin_show_future`.

---

# Quantum Optimization Engine — Reverse-Engineering Pipeline (QUBO Decompiler)

## 1. Executive Summary & Objective

Currently, the Quantum Guru Studio optimization pipeline compiles high-level business problems or constrained mathematical formulations into executable QUBO models (forward compilation via `SupervisorAgent`, `ModelingAgent`, and `AutoQUBO`).

The **QUBO Reverse-Engineering Pipeline (Decompiler Engine)** provides the inverse capability:
When an enterprise user pastes or imports raw QUBO code (e.g. `dimod.BinaryQuadraticModel`, dictionary couplings `Q[(u, v)]`, or a NumPy 2D matrix), the engine de-compiles the matrix to reconstruct:
1. **Primal Mathematical Model**: Objective function in standard mathematical notation.
2. **Decision Variables**: Variable registry with names, types ($\{0, 1\}$ or $\{-1, +1\}$), and cardinality.
3. **Implicit Constraints**: Reconstructing inequalities, equalities, mutual exclusions, and slack variables that were squashed into the quadratic penalty Hamiltonian.

---

## 2. Multi-Stage Decompiler Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER-PROVIDED QUBO CODE                  │
│       (dimod.BQM / Python Q-dict / 2D NumPy Matrix)         │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
[ LAYER 1: DETERMINISTIC ENGINE ]           [ LAYER 2: AST & GRAPH ENGINE ]
• Variable Registry Extraction              • Python AST Loop/Expression Tracing
• vartype ({0, 1} vs {-1, +1})              • Coupler Graph Topological Fingerprinting
• Exact Canonical Hamiltonian (LaTeX):      • Slack Bit Recognition (powers of 2)
  min H(x) = ∑ Q_ii x_i + ∑ Q_ij x_i x_j    • Penalty Clique Detection (One-Hot / Exclusions)
       │                                               │
       └───────────────────────┬───────────────────────┘
                               ▼
            [ LAYER 3: INVERSE MODELING AGENT ]
            • Synthesizes Primal Constrained Model:
                min  f(x)
                s.t. g_k(x) ≤ 0,  h_j(x) = 0
                               │
                               ▼
        [ LAYER 4: ROUND-TRIP MATHEMATICAL VERIFICATION ]
        • Passes hypothesized model to AutoQUBO (dcc.py)
        • Forward compiles back to Q_test matrix
        • Mathematical Validation: || Q_test - Q_user || == 0
                               │
                               ▼
        [ STUDIO IDE: BIDIRECTIONAL MODEL SYNCHRONIZATION ]
        • Dynamic Constraint Cards populated in 'Model' tab
        • Visual sliders for bounds and penalty stiffness
        • Bidirectional sync: UI edits update Python code
```

---

## 3. Technical Specifications by Layer

### Layer 1: Deterministic Model & Variable Introspection
* **Variable Extraction**: Deterministically pulls variable labels, count ($N$), and index ordering from `bqm.variables` or keys of `Q`.
* **Canonical Quadratic Formulation**: Constructs the symbolic LaTeX objective without LLM dependency:
  $$\min_{\mathbf{x} \in \{0, 1\}^N} \mathcal{H}(\mathbf{x}) = \sum_{i=1}^N Q_{ii} x_i + \sum_{i < j} Q_{ij} x_i x_j + \text{offset}$$

### Layer 2: Matrix Topological Fingerprinting & AST Inspection
When constraints are squared and multiplied by penalty multipliers ($\lambda$), they leave distinct structural signatures in the coupler matrix:
1. **Mutual Exclusion ($x_i + x_j \le 1$)**: Manifests as strong positive off-diagonal couplers ($+P \gg |Q_{ii}|$) between pairs of variables.
2. **One-Hot / Exact-1 Selection ($\sum_{i=1}^K x_i = 1$)**: A $K$-clique where all off-diagonal couplers are $+2P$ and all diagonal biases are shifted by $-P$.
3. **Cardinality Constraints ($\sum_{i=1}^K x_i = C$)**: Uniform quadratic shifts across variable subsets with diagonal shifts $P(1 - 2C)$ and off-diagonal shifts $+2P$.
4. **Logarithmic Slack Decomposition**: Variables weighted or indexed in powers of 2 ($s_0, s_1, s_2 \dots$ with coefficients $1, 2, 4, 8$) coupled with problem variables indicate an expanded inequality constraint:
   $$\sum_{i} w_i x_i + \sum_{k=0}^M 2^k s_k = \text{Bound}$$

### Layer 3: Inverse Modeling Agent
* Ingests the reconstructed canonical Hamiltonian, variable semantics, code comments, and topological constraint candidates.
* Formulates the high-level primal problem specification (CMM / OM format) with human-readable constraints.

### Layer 4: Round-Trip Formal Verification
* The system executes a closed-loop verification:
  1. Hypothesized Primal Model $\rightarrow$ Forward Compiled via `dcc.py` (AutoQUBO).
  2. Compares the re-generated $Q_{\text{recompiled}}$ against the user's input $Q_{\text{user}}$.
  3. If residuals $\epsilon = |Q_{\text{recompiled}} - Q_{\text{user}}| < 10^{-5}$, the de-compilation is mathematically certified.

---

## 4. Studio User Experience & Product Capabilities

* **Drop-in QUBO Analysis**: A user pastes raw academic or production D-Wave scripts into Studio, and the platform automatically explains the underlying business problem and constraints.
* **Interactive Constraint Editing**: After reverse engineering, users can edit constraints, budget caps, or penalty multipliers using UI sliders, and the Studio regenerates the optimized Python script automatically.
* **Sparsity & Connectivity Telemetry**: Generates interactive coupler graphs, matrix heatmap, and density distribution metrics.

---

## 5. Development Milestones

| Milestone | Target Deliverable | Dependency |
| :--- | :--- | :--- |
| **M1: AST & BQM Inspector** | Deterministic variable extraction and canonical LaTeX Hamiltonian generation | `execution_runner.py` |
| **M2: Topological Constraint Classifier** | Graph algorithms detecting One-Hot cliques, Mutual Exclusion, and Slack powers-of-2 | NetworkX / NumPy |
| **M3: Inverse Modeling Agent** | AI agent synthesizing primal constraints and bound estimates | `multi_agent.py` / Qwen 2.5 |
| **M4: Round-Trip AutoQUBO Verifier** | Mathematical equivalence validator comparing forward compile with input matrix | `dcc.py` / `cmm.py` |
| **M5: Studio UI Integration** | Bidirectional Model Tab integration with editable dynamic constraint cards | `FormulationCanvas.tsx` |
