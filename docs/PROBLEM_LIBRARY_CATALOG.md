# Quantum Guru — Enterprise Problem Library Catalog

Complete catalog of all **48 independently verified optimization benchmarks** across **6 industries**.

> **Hardened Benchmark Protocol:** Every best-known optimum is proven (`0.00%` gap) by **Google OR-Tools CP-SAT** (`num_workers=1`) or published TSPLIB ground truth. Every BQM passes automated **QUBO≡Original mathematical equivalence verification** (`48/48` passed, `|E_QUBO(x*) - ±f(x*)| < 1e-4`). Penalty `λ` is tuned on `3` strictly disjoint seeds (`[9001, 9002, 9003]`) and evaluated on `N = 20` held-out seeds (`500` reads × `1000` sweeps). Timings separate model build, `λ` tuning, and pure solve time. **D-Wave Simulated Annealing (`dwave-neal`) is classical software** (no physical QPU or quantum advantage is claimed). Verdict `Competitive` requires `>=80%` feasibility and `<=1.0%` **median** gap.

> **QUBO Size Limit (`150` vars):** Empirical interactive-latency and local simulated-annealing benchmark threshold (150 binary decision + slack variables). Not a hard mathematical limit of dwave-neal; problems above 150 QUBO variables still pass exact QUBO equivalence verification and are solved to proven optimality by Google OR-Tools CP-SAT.

**Reproducibility Environment:** Python `3.13.5` · OR-Tools `9.15.6755` · dimod `0.12.21` · dwave-neal `0.6.0` · `macOS-27.2.1-arm64-arm-64bit-Mach-O` (8 cores)

## Summary Overview

- **Total Problems:** 48 across 6 industries (8 per industry)
- **QUBO≡Original Equivalence Proof:** 48/48 passed
- **By Size Tier:** Small (33) · Medium (8) · Large (7)
- **By Solver Fit (20-seed median rule):** Competitive (29) · Classical Wins (13) · Exceeds QUBO Limit (6)

| Industry | Problems | Competitive | Classical Wins | Exceeds QUBO Limit | Problem Types |
|---|---:|---:|---:|---:|---|
| **Construction** | 8 | 3 | 4 | 1 | Equipment + Workforce, Project Planning, Workforce Scheduling |
| **Energy** | 8 | 4 | 3 | 1 | Demand Response, Grid Partitioning (Max-Cut), Plant Location, Set Cover, Unit Commitment |
| **Finance** | 8 | 4 | 3 | 1 | Capital Budgeting, Portfolio Selection, Trade Matching |
| **Logistics** | 8 | 6 | 1 | 1 | Assignment, Facility Location, Knapsack, Set Cover, TSP, Vehicle Routing |
| **Manufacturing** | 8 | 5 | 2 | 1 | Batch Selection, Machine Assignment, Plant Location |
| **Workforce Scheduling** | 8 | 7 | 0 | 1 | Crew Assignment, Set Cover, Shift Scheduling |

## Benchmark Matrix by Industry

### Construction (8 problems)

| # | Slug | Title | Type | Size | QUBO Vars (d+s) | Density | Sense | Best Known | OR-Tools CP-SAT (solve) | D-Wave SA (20-seed median · classical software) | Solver Fit |
|---:|---|---|---|---|---|---:|---|---:|---|---|---|
| 1 | `const-bid-portfolio-12` | Construction Bid Portfolio (12 tenders, synergy) | Project Planning | Small | 19 (12+7) | 100.0% | Maximize | 323 | 323.0 (0.00% · 2.4ms) | med 314.0 (2.79%) · best 323.0 · 20/20 · 133.6ms | **Classical Wins** |
| 2 | `const-trade-rostering-6x4` | Trade Crew Rostering (6 crews, 4 shifts) | Workforce Scheduling | Small | 24 (24+0) | 34.8% | Minimize | 141 | 141.0 (0.00% · 1.6ms) | med 141.0 (0.00%) · best 141.0 · 20/20 · 152.8ms | **Competitive** |
| 3 | `const-time-cost-8x3` | Time-Cost Activity Crashing (8 activities, 3 modes) | Project Planning | Small | 31 (24+7) | 100.0% | Minimize | 411 | 411.0 (0.00% · 1.0ms) | med 438.5 (6.69%) · best 411.0 · 20/20 · 246.7ms | **Classical Wins** |
| 4 | `const-site-layout-6x6` | Site Layout Planning (6 facilities, 6 zones) | Project Planning | Small | 36 (36+0) | 100.0% | Minimize | 611 | 611.0 (0.00% · 82.4ms) | med 611.0 (0.00%) · best 611.0 · 20/20 · 171.7ms | **Competitive** |
| 5 | `const-crew-equip-8x6` | Crew & Heavy Equipment Co-Scheduling (8 tasks, 6 slots) | Equipment + Workforce | Medium | 48 (48+0) | 21.8% | Minimize | 258 | 258.0 (0.00% · 1.6ms) | med 258.0 (0.00%) · best 258.0 · 20/20 · 291.0ms | **Competitive** |
| 6 | `const-subcontractor-6x10` | Subcontractor Package Assignment (6 crews, 10 packages) | Workforce Scheduling | Medium | 86 (60+26) | 19.8% | Minimize | 225 | 225.0 (0.00% · 1.4ms) | med 320.5 (42.44%) · best 268.0 · 20/20 · 546.0ms | **Classical Wins** |
| 7 | `const-rcpsp-10x10` | Multi-Floor RCPSP Schedule (10 tasks, 10 weeks) | Project Planning | Large | 130 (100+30) | 20.0% | Minimize | 191 | 191.0 (0.00% · 3.1ms) | med 264.0 (38.22%) · best 222.0 · 15/20 · 897.2ms | **Classical Wins** |
| 8 | `const-fleet-dispatch-12x14` | Multi-Site Fleet & Crew Dispatch (12 units, 14 sites) | Equipment + Workforce | Large | 180 (180+0) | 6.8% | Minimize | 327 | 327.0 (0.00% · 35.1ms) | Skipped (>150 cap) | **Exceeds QUBO Limit** |

### Energy (8 problems)

| # | Slug | Title | Type | Size | QUBO Vars (d+s) | Density | Sense | Best Known | OR-Tools CP-SAT (solve) | D-Wave SA (20-seed median · classical software) | Solver Fit |
|---:|---|---|---|---|---|---:|---|---:|---|---|---|
| 1 | `energy-maxcut-12` | Substation Phase Balancing (12 nodes) | Grid Partitioning (Max-Cut) | Small | 12 (12+0) | 51.5% | Maximize | 128 | 128.0 (0.00% · 1.6ms) | med 128.0 (0.00%) · best 128.0 · 20/20 · 53.0ms | **Competitive** |
| 2 | `energy-demand-12` | Demand-Response Load Shedding (12 feeders) | Demand Response | Small | 19 (12+7) | 100.0% | Maximize | 355 | 355.0 (0.00% · 0.1ms) | med 325.0 (8.45%) · best 355.0 · 20/20 · 130.2ms | **Classical Wins** |
| 3 | `energy-maxcut-20` | Transmission Grid Partitioning (20 nodes) | Grid Partitioning (Max-Cut) | Small | 20 (20+0) | 30.0% | Maximize | 255 | 255.0 (0.00% · 24.1ms) | med 255.0 (0.00%) · best 255.0 · 20/20 · 92.0ms | **Competitive** |
| 4 | `energy-uc-4x4` | Microgrid Unit Commitment (4 gens, 4 periods) | Unit Commitment | Small | 29 (16+13) | 25.4% | Minimize | 158 | 158.0 (0.00% · 1.1ms) | med 158.0 (0.00%) · best 158.0 · 20/20 · 133.5ms | **Competitive** |
| 5 | `energy-substation-cover` | Backup Generator Coverage (9 units, 12 zones) | Set Cover | Small | 30 (9+21) | 28.3% | Minimize | 44 | 44.0 (0.00% · 0.3ms) | med 44.0 (0.00%) · best 44.0 · 20/20 · 190.8ms | **Competitive** |
| 6 | `energy-uc-5x4` | Regional Unit Commitment (5 gens, 4 periods) | Unit Commitment | Small | 33 (20+13) | 25.6% | Minimize | 188 | 188.0 (0.00% · 1.1ms) | med 193.0 (2.66%) · best 188.0 · 20/20 · 147.2ms | **Classical Wins** |
| 7 | `energy-uc-6x5` | Thermal Fleet Dispatch (6 gens, 5 periods) | Unit Commitment | Small | 50 (30+20) | 20.3% | Minimize | 277 | 277.0 (0.00% · 1.3ms) | med 375.0 (35.38%) · best 339.0 · 20/20 · 238.5ms | **Classical Wins** |
| 8 | `energy-substation-12x14` | Regional Substation Expansion (12 sites, 14 zones) | Plant Location | Large | 180 (180+0) | 6.8% | Minimize | 271 | 271.0 (0.00% · 17.3ms) | Skipped (>150 cap) | **Exceeds QUBO Limit** |

### Finance (8 problems)

| # | Slug | Title | Type | Size | QUBO Vars (d+s) | Density | Sense | Best Known | OR-Tools CP-SAT (solve) | D-Wave SA (20-seed median · classical software) | Solver Fit |
|---:|---|---|---|---|---|---:|---|---:|---|---|---|
| 1 | `finance-portfolio-8-k4` | Equity Portfolio Selection (8 assets, pick 4) | Portfolio Selection | Small | 8 (8+0) | 100.0% | Maximize | 129 | 129.0 (0.00% · 1.7ms) | med 129.0 (0.00%) · best 129.0 · 20/20 · 27.5ms | **Competitive** |
| 2 | `finance-portfolio-12-k5` | Equity Portfolio Selection (12 assets, pick 5) | Portfolio Selection | Small | 12 (12+0) | 100.0% | Maximize | 123 | 123.0 (0.00% · 4.6ms) | med 123.0 (0.00%) · best 123.0 · 20/20 · 85.7ms | **Competitive** |
| 3 | `finance-portfolio-16-k6` | Multi-Sector Portfolio (16 assets, pick 6) | Portfolio Selection | Small | 16 (16+0) | 100.0% | Maximize | 180 | 180.0 (0.00% · 24.8ms) | med 180.0 (0.00%) · best 180.0 · 20/20 · 125.0ms | **Competitive** |
| 4 | `finance-capex-10` | Capital Budgeting Allocation (10 projects) | Capital Budgeting | Small | 17 (10+7) | 100.0% | Maximize | 316 | 316.0 (0.00% · 0.1ms) | med 316.0 (0.00%) · best 316.0 · 20/20 · 108.1ms | **Competitive** |
| 5 | `finance-portfolio-20-k8` | Institutional Portfolio (20 assets, pick 8) | Portfolio Selection | Small | 20 (20+0) | 100.0% | Maximize | 196 | 196.0 (0.00% · 352.7ms) | med 189.0 (3.57%) · best 196.0 · 20/20 · 164.4ms | **Classical Wins** |
| 6 | `finance-capex-15` | R&D Portfolio Budgeting (15 projects) | Capital Budgeting | Small | 22 (15+7) | 100.0% | Maximize | 411 | 411.0 (0.00% · 0.1ms) | med 386.0 (6.08%) · best 404.0 · 20/20 · 147.1ms | **Classical Wins** |
| 7 | `finance-capex-22` | Corporate CapEx Selection (22 projects) | Capital Budgeting | Small | 30 (22+8) | 100.0% | Maximize | 605 | 605.0 (0.00% · 0.1ms) | med 526.0 (13.06%) · best 573.0 · 20/20 · 232.6ms | **Classical Wins** |
| 8 | `finance-clearing-13x13` | Large Clearing Desk Assignment (13x13) | Trade Matching | Large | 169 (169+0) | 14.3% | Minimize | 148 | 148.0 (0.00% · 4.3ms) | Skipped (>150 cap) | **Exceeds QUBO Limit** |

### Logistics (8 problems)

| # | Slug | Title | Type | Size | QUBO Vars (d+s) | Density | Sense | Best Known | OR-Tools CP-SAT (solve) | D-Wave SA (20-seed median · classical software) | Solver Fit |
|---:|---|---|---|---|---|---:|---|---:|---|---|---|
| 1 | `cargo-knapsack-12` | Cargo Loading Knapsack (12 parcels) | Knapsack | Small | 18 (12+6) | 100.0% | Maximize | 249 | 249.0 (0.00% · 0.1ms) | med 249.0 (0.00%) · best 249.0 · 20/20 · 117.4ms | **Competitive** |
| 2 | `facility-location-3x6` | Warehouse Location (3 sites, 6 customers) | Facility Location | Small | 21 (21+0) | 17.1% | Minimize | 144 | 144.0 (0.00% · 0.8ms) | med 144.0 (0.00%) · best 144.0 · 20/20 · 95.1ms | **Competitive** |
| 3 | `tsp-5-city` | Courier Round Trip TSP (5 cities) | TSP | Small | 25 (25+0) | 66.7% | Minimize | 115 | 115.0 (0.00% · 0.7ms) | med 115.0 (0.00%) · best 115.0 · 20/20 · 128.6ms | **Competitive** |
| 4 | `set-cover-depots-10` | Depot Coverage Set Cover (7 depots, 10 regions) | Set Cover | Small | 25 (7+18) | 33.0% | Minimize | 12 | 12.0 (0.00% · 0.3ms) | med 12.0 (0.00%) · best 12.0 · 20/20 · 160.9ms | **Competitive** |
| 5 | `assignment-driver-route-6` | Driver-to-Route Assignment (6x6) | Assignment | Small | 36 (36+0) | 28.6% | Minimize | 65 | 65.0 (0.00% · 1.0ms) | med 65.0 (0.00%) · best 65.0 · 20/20 · 230.9ms | **Competitive** |
| 6 | `cvrp-6c-2v` | Capacitated Vehicle Routing (6 customers, 2 vans) | Vehicle Routing | Medium | 92 (72+20) | 44.1% | Minimize | 138 | 138.0 (0.00% · 19.3ms) | med 155.0 (12.32%) · best 138.0 · 20/20 · 761.0ms | **Classical Wins** |
| 7 | `assignment-driver-route-10` | Driver-to-Route Assignment (10x10) | Assignment | Medium | 100 (100+0) | 18.2% | Minimize | 94 | 94.0 (0.00% · 2.1ms) | med 94.0 (0.00%) · best 94.0 · 20/20 · 639.4ms | **Competitive** |
| 8 | `tsp-burma14` | Burma14 TSP (TSPLIB, 14 cities) | TSP | Large | 196 (196+0) | 26.7% | Minimize | 3323 | 3323.0 (0.00% · 16.6ms) | Skipped (>150 cap) | **Exceeds QUBO Limit** |

### Manufacturing (8 problems)

| # | Slug | Title | Type | Size | QUBO Vars (d+s) | Density | Sense | Best Known | OR-Tools CP-SAT (solve) | D-Wave SA (20-seed median · classical software) | Solver Fit |
|---:|---|---|---|---|---|---:|---|---:|---|---|---|
| 1 | `mfg-batch-12` | Production Batch Selection (12 batches) | Batch Selection | Small | 19 (12+7) | 100.0% | Maximize | 233 | 233.0 (0.00% · 0.1ms) | med 225.0 (3.43%) · best 233.0 · 20/20 · 120.7ms | **Classical Wins** |
| 2 | `mfg-plant-3x6` | Factory Line Allocation (3 plants, 6 orders) | Plant Location | Small | 21 (21+0) | 17.1% | Minimize | 159 | 159.0 (0.00% · 0.7ms) | med 159.0 (0.00%) · best 159.0 · 20/20 · 95.7ms | **Competitive** |
| 3 | `mfg-machine-5x5` | CNC Machine-to-Job Assignment (5x5) | Machine Assignment | Small | 25 (25+0) | 33.3% | Minimize | 109 | 109.0 (0.00% · 0.7ms) | med 109.0 (0.00%) · best 109.0 · 20/20 · 152.7ms | **Competitive** |
| 4 | `mfg-batch-18` | High-Mix Production Selection (18 batches) | Batch Selection | Small | 25 (18+7) | 100.0% | Maximize | 604 | 604.0 (0.00% · 0.1ms) | med 536.0 (11.26%) · best 574.0 · 20/20 · 181.5ms | **Classical Wins** |
| 5 | `mfg-plant-4x8` | Regional Plant Allocation (4 plants, 8 orders) | Plant Location | Small | 36 (36+0) | 12.7% | Minimize | 175 | 175.0 (0.00% · 1.2ms) | med 175.0 (0.00%) · best 175.0 · 20/20 · 166.2ms | **Competitive** |
| 6 | `mfg-machine-7x7` | Assembly Cell Assignment (7x7) | Machine Assignment | Medium | 49 (49+0) | 25.0% | Minimize | 97 | 97.0 (0.00% · 0.8ms) | med 97.0 (0.00%) · best 97.0 · 20/20 · 306.0ms | **Competitive** |
| 7 | `mfg-machine-9x9` | SMT Line Assignment (9x9) | Machine Assignment | Medium | 81 (81+0) | 20.0% | Minimize | 121 | 121.0 (0.00% · 1.7ms) | med 121.0 (0.00%) · best 121.0 · 20/20 · 510.7ms | **Competitive** |
| 8 | `mfg-plant-12x14` | Global Supply Network Allocation (12 plants, 14 hubs) | Plant Location | Large | 180 (180+0) | 6.8% | Minimize | 252 | 252.0 (0.00% · 29.6ms) | Skipped (>150 cap) | **Exceeds QUBO Limit** |

### Workforce Scheduling (8 problems)

| # | Slug | Title | Type | Size | QUBO Vars (d+s) | Density | Sense | Best Known | OR-Tools CP-SAT (solve) | D-Wave SA (20-seed median · classical software) | Solver Fit |
|---:|---|---|---|---|---|---:|---|---:|---|---|---|
| 1 | `workforce-shifts-5x3` | Nurse Shift Rostering (5 staff, 3 shifts) | Shift Scheduling | Small | 15 (15+0) | 42.9% | Minimize | 103 | 103.0 (0.00% · 0.4ms) | med 103.0 (0.00%) · best 103.0 · 20/20 · 93.2ms | **Competitive** |
| 2 | `workforce-shifts-6x4` | Hospital Shift Rostering (6 staff, 4 shifts) | Shift Scheduling | Small | 24 (24+0) | 34.8% | Minimize | 103 | 103.0 (0.00% · 0.8ms) | med 103.0 (0.00%) · best 103.0 · 20/20 · 147.8ms | **Competitive** |
| 3 | `workforce-crew-5x5` | Field Technician Assignment (5x5) | Crew Assignment | Small | 25 (25+0) | 33.3% | Minimize | 100 | 100.0 (0.00% · 0.6ms) | med 100.0 (0.00%) · best 100.0 · 20/20 · 151.9ms | **Competitive** |
| 4 | `workforce-oncall-8x10` | On-Call Skill Coverage (8 engineers, 10 windows) | Set Cover | Small | 25 (8+17) | 32.7% | Minimize | 34 | 34.0 (0.00% · 0.2ms) | med 34.0 (0.00%) · best 34.0 · 20/20 · 164.2ms | **Competitive** |
| 5 | `workforce-shifts-9x4` | Operations Crew Rostering (9 staff, 4 shifts) | Shift Scheduling | Small | 36 (36+0) | 31.4% | Minimize | 138 | 138.0 (0.00% · 1.0ms) | med 138.0 (0.00%) · best 138.0 · 20/20 · 230.6ms | **Competitive** |
| 6 | `workforce-shifts-12x5` | Plant Shift Rostering (12 staff, 5 shifts) | Shift Scheduling | Medium | 60 (60+0) | 25.4% | Minimize | 218 | 218.0 (0.00% · 1.5ms) | med 219.0 (0.46%) · best 218.0 · 20/20 · 403.2ms | **Competitive** |
| 7 | `workforce-crew-8x8` | Flight Crew Pairing Assignment (8x8) | Crew Assignment | Medium | 64 (64+0) | 22.2% | Minimize | 131 | 131.0 (0.00% · 1.0ms) | med 131.0 (0.00%) · best 131.0 · 20/20 · 404.1ms | **Competitive** |
| 8 | `workforce-shifts-20x8` | Enterprise Multi-Site Roster (20 staff, 8 shifts) | Shift Scheduling | Large | 160 (160+0) | 16.4% | Minimize | 274 | 274.0 (0.00% · 3.1ms) | Skipped (>150 cap) | **Exceeds QUBO Limit** |

## Problem Descriptions & Prompts

### Construction

#### Construction Bid Portfolio (12 tenders, synergy) (`const-bid-portfolio-12`)
- **Type:** Project Planning · **Size:** Small (19 QUBO vars: 12 decision + 7 slack, 171 couplings, 100.0% density, max deg 18, dynamic range 784.0×)
- **Objective:** Maximize · **Best Known:** `323` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Classical Wins** — OR-Tools CP-SAT proved optimal (323.0) in 2.4 ms solve, outperforming QUBO SA (median 314.0 [2.79% gap], best 323.0 [0.00% gap], 20/20 feasible at λ=120.0, 133.6 ms solve).
- **20-Seed SA Distribution:** best `323.0` · median `314.0` · mean±std `314.55 ± 5.4358` · worst `308.0` · IQR `8.0` · timings build/tune/solve `0.1ms` / `761.0ms` / `133.6ms`
- **20-Seed CP-SAT:** `OPTIMAL` `323.0` · timings build/solve `0.5ms` / `2.4ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Select from 12 construction tenders under a $65M bonding cap while capturing pairwise mobilization synergies.

```text
Construction Bid Portfolio Selection: choose which of 12 construction tenders to bid on to maximize total expected net margin plus pairwise equipment-mobilization synergies, without exceeding the firm's bonding capacity of 65 ($M). Decision variables bid_0..bid_11 are binary.
- Bonding requirements ($M): [10, 4, 5, 8, 5, 7, 15, 14, 15, 15, 13, 14]
- Expected net margins ($100k): [25, 19, 40, 42, 45, 24, 32, 25, 40, 34, 22, 40]
- Pairwise mobilization synergies ($100k): (Tender 0, Tender 1: +11), (Tender 0, Tender 5: +6), (Tender 0, Tender 7: +7), (Tender 0, Tender 10: +9), (Tender 0, Tender 11: +8), (Tender 1, Tender 2: +12), (Tender 1, Tender 8: +5), (Tender 1, Tender 9: +5), (Tender 2, Tender 3: +4), (Tender 3, Tender 4: +12), (Tender 3, Tender 7: +6), (Tender 3, Tender 8: +13), (Tender 3, Tender 9: +13), (Tender 4, Tender 7: +4), (Tender 4, Tender 11: +7), (Tender 5, Tender 6: +14), (Tender 5, Tender 11: +9), (Tender 6, Tender 10: +13)
- Bonding limit: sum(bond[i] * bid_i) <= 65.
```

#### Trade Crew Rostering (6 crews, 4 shifts) (`const-trade-rostering-6x4`)
- **Type:** Workforce Scheduling · **Size:** Small (24 QUBO vars: 24 decision + 0 slack, 96 couplings, 34.78% density, max deg 8, dynamic range 2.6×)
- **Objective:** Minimize · **Best Known:** `141` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=72.0). Runtime: CP-SAT solve 1.6 ms vs. SA solve 152.8 ms (+ 991 ms λ-tuning).
- **20-Seed SA Distribution:** best `141.0` · median `141.0` · mean±std `141.0 ± 0.0` · worst `141.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `991.1ms` / `152.8ms`
- **20-Seed CP-SAT:** `OPTIMAL` `141.0` · timings build/solve `0.6ms` / `1.6ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Roster 6 trade crews across 4 shifts while minimizing labor cost and quadratic trade-stacking congestion penalties.

```text
Trade Crew Rostering with Congestion Penalties: assign 6 trade crews (Concrete, Structural Steel, Electrical, Plumbing, HVAC, Drywall) to 4 floor shift windows so every crew works exactly 1 shift and shift staffing matches [2, 2, 1, 1], minimizing shift labor cost plus pairwise trade-stacking congestion penalties when conflicting trades share a shift.
- Shift cost matrix ($k): Crew 0: [36, 40, 27, 40]; Crew 1: [33, 42, 16, 39]; Crew 2: [30, 38, 30, 21]; Crew 3: [25, 28, 40, 38]; Crew 4: [18, 25, 19, 28]; Crew 5: [18, 31, 18, 29]
- Same-shift trade-stacking penalties: (Concrete + Electrical: +18), (Structural Steel + Drywall: +22), (Electrical + Plumbing: +14), (Plumbing + HVAC: +16), (Concrete + Drywall: +20), (Structural Steel + Electrical: +15).
```

#### Time-Cost Activity Crashing (8 activities, 3 modes) (`const-time-cost-8x3`)
- **Type:** Project Planning · **Size:** Small (31 QUBO vars: 24 decision + 7 slack, 465 couplings, 100.0% density, max deg 30, dynamic range 1184.0×)
- **Objective:** Minimize · **Best Known:** `411` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Classical Wins** — OR-Tools CP-SAT proved optimal (411.0) in 1.0 ms solve, outperforming QUBO SA (median 438.5 [6.69% gap], best 411.0 [0.00% gap], 20/20 feasible at λ=324.0, 246.7 ms solve).
- **20-Seed SA Distribution:** best `411.0` · median `438.5` · mean±std `437.65 ± 14.3293` · worst `474.0` · IQR `19.0` · timings build/tune/solve `0.1ms` / `1.23s` / `246.7ms`
- **20-Seed CP-SAT:** `OPTIMAL` `411.0` · timings build/solve `0.4ms` / `1.0ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Choose Normal, Fast, or Crash execution modes across 8 critical-path activities to hit a 90-day deadline at minimum cost.

```text
Construction Time-Cost Activity Crashing: select exactly one execution mode (0=Normal, 1=Fast, 2=Crash) for each of 8 sequential critical-path activities to minimize total direct and crashing cost ($k) while completing the project within 90 days. Binary variables mode_a_k indicate activity a in mode k.
- Activity modes (duration, cost): Site Clearing & Excavation: Normal(14d, $42k), Fast(12d, $59k), Crash(9d, $74k); Deep Foundation & Piling: Normal(18d, $46k), Fast(14d, $58k), Crash(11d, $78k); Structural Steel Erection: Normal(15d, $28k), Fast(12d, $46k), Crash(9d, $61k); Concrete Core & Decking: Normal(11d, $25k), Fast(8d, $41k), Crash(5d, $54k); Facade & Curtain Wall: Normal(17d, $49k), Fast(14d, $62k), Crash(12d, $80k); MEP Rough-In: Normal(13d, $31k), Fast(11d, $39k), Crash(9d, $62k); Interior Framing & Finishes: Normal(12d, $28k), Fast(9d, $39k), Crash(6d, $58k); Systems Commissioning: Normal(17d, $45k), Fast(13d, $57k), Crash(10d, $81k)
- Constraints: sum_k mode_a_k = 1 for every activity a; total duration <= 90 days.
```

#### Site Layout Planning (6 facilities, 6 zones) (`const-site-layout-6x6`)
- **Type:** Project Planning · **Size:** Small (36 QUBO vars: 36 decision + 0 slack, 630 couplings, 100.0% density, max deg 35, dynamic range 346.67×)
- **Objective:** Minimize · **Best Known:** `611` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=520.0). Runtime: CP-SAT solve 82.4 ms vs. SA solve 171.7 ms (+ 968 ms λ-tuning).
- **20-Seed SA Distribution:** best `611.0` · median `611.0` · mean±std `613.6 ± 5.3703` · worst `629.0` · IQR `4.0` · timings build/tune/solve `0.6ms` / `968.0ms` / `171.7ms`
- **20-Seed CP-SAT:** `OPTIMAL` `611.0` · timings build/solve `5.4ms` / `82.4ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Assign 6 temporary construction site facilities to 6 zones to minimize quadratic material-hauling flow × distance.

```text
Construction Site Layout Planning (Quadratic Assignment): place 6 temporary site facilities (Concrete Batch Plant, Tower Crane Base, Rebar Fabrication Yard, Steel Laydown Area, MEP Staging Depot, Site Management Office) one-to-one into 6 site zones (0..5) to minimize total daily material-hauling flow times distance. Binary variable place_i_p = 1 if facility i is placed in zone p.
- Material flow matrix (trips/day): Fac 0: [0, 8, 3, 6, 1, 3]; Fac 1: [8, 0, 4, 8, 6, 7]; Fac 2: [3, 4, 0, 4, 6, 9]; Fac 3: [6, 8, 4, 0, 1, 10]; Fac 4: [1, 6, 6, 1, 0, 8]; Fac 5: [3, 7, 9, 10, 8, 0]
- Zone distance matrix (10m units): Zone 0: [0, 4, 7, 6, 9, 7]; Zone 1: [4, 0, 8, 9, 10, 10]; Zone 2: [7, 8, 0, 10, 3, 11]; Zone 3: [6, 9, 10, 0, 12, 6]; Zone 4: [9, 10, 3, 12, 0, 13]; Zone 5: [7, 10, 11, 6, 13, 0]
- Constraints: each facility placed in exactly 1 zone, and each zone hosts exactly 1 facility.
```

#### Crew & Heavy Equipment Co-Scheduling (8 tasks, 6 slots) (`const-crew-equip-8x6`)
- **Type:** Equipment + Workforce · **Size:** Medium (48 QUBO vars: 48 decision + 0 slack, 246 couplings, 21.81% density, max deg 14, dynamic range 70.0×)
- **Objective:** Minimize · **Best Known:** `258` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=70.0). Runtime: CP-SAT solve 1.6 ms vs. SA solve 291.0 ms (+ 1612 ms λ-tuning).
- **20-Seed SA Distribution:** best `258.0` · median `258.0` · mean±std `258.0 ± 0.0` · worst `258.0` · IQR `0.0` · timings build/tune/solve `0.2ms` / `1.61s` / `291.0ms`
- **20-Seed CP-SAT:** `OPTIMAL` `258.0` · timings build/solve `0.8ms` / `1.6ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Co-schedule 8 site tasks across 6 shifts respecting shared tower crane, excavator, crew non-overlap, and precedence.

```text
Crew & Heavy Equipment Co-Scheduling: schedule 8 construction tasks across 6 shift slots (binary sched_i_t = 1 if task i runs in slot t) to minimize total mobilization and delay cost ($k).
- Tasks: T0: Footing Excavation (Excavator + EarthCrew); T1: Trenching & Utilities (Excavator + EarthCrew); T2: Structural Steel Lift A (TowerCrane + IronCrew); T3: Precast Panel Lift (TowerCrane + RiggingCrew); T4: Slab Concrete Pour (ConcretePump + ConcreteCrew); T5: Structural Steel Lift B (TowerCrane + IronCrew); T6: Curtain Wall Hoist (TowerCrane + GlazingCrew); T7: Backfill & Grading (Excavator + EarthCrew)
- Shared equipment/crew non-overlap groups (max 1 task per slot per group): TowerCrane=[2, 3, 5, 6], Excavator+EarthCrew=[0, 1, 7]
- Precedence dependencies (slot_a < slot_b): [(0, 2), (2, 5), (4, 6), (1, 7)]
- Cost matrix ($k): Task 0: [29, 50, 56, 33, 59, 41]; Task 1: [35, 34, 53, 59, 43, 39]; Task 2: [36, 58, 23, 41, 58, 70]; Task 3: [43, 32, 28, 30, 50, 58]; Task 4: [49, 30, 33, 52, 53, 33]; Task 5: [20, 51, 35, 50, 42, 68]; Task 6: [19, 29, 29, 37, 29, 52]; Task 7: [26, 58, 43, 31, 64, 60].
```

#### Subcontractor Package Assignment (6 crews, 10 packages) (`const-subcontractor-6x10`)
- **Type:** Workforce Scheduling · **Size:** Medium (86 QUBO vars: 60 decision + 26 slack, 724 couplings, 19.81% density, max deg 19, dynamic range 52.39×)
- **Objective:** Minimize · **Best Known:** `225` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Classical Wins** — OR-Tools CP-SAT proved optimal (225.0) in 1.4 ms solve, outperforming QUBO SA (median 320.5 [42.44% gap], best 268.0 [19.11% gap], 20/20 feasible at λ=65.0, 546.0 ms solve).
- **20-Seed SA Distribution:** best `268.0` · median `320.5` · mean±std `318.2 ± 22.9991` · worst `352.0` · IQR `33.25` · timings build/tune/solve `0.2ms` / `2.78s` / `546.0ms`
- **20-Seed CP-SAT:** `OPTIMAL` `225.0` · timings build/solve `0.6ms` / `1.4ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Assign 10 construction work packages across 6 trade subcontractors under crew-day capacity caps.

```text
Subcontractor Work-Package Assignment: assign 10 construction work packages to 6 trade subcontractor crews (binary sub_c_p = 1 if crew c takes package p) to minimize total bid and mobilization cost ($k).
- Package crew-day workloads: [7, 4, 4, 3, 6, 7, 5, 7, 7, 8]
- Subcontractor crew-day capacity caps: [14, 14, 14, 17, 14, 17]
- Bid cost matrix ($k): Sub 0: [20, 64, 62, 20, 37, 23, 23, 47, 60, 62]; Sub 1: [32, 29, 56, 32, 44, 35, 20, 27, 43, 51]; Sub 2: [55, 35, 58, 61, 33, 18, 27, 39, 25, 19]; Sub 3: [50, 61, 26, 38, 47, 18, 25, 53, 57, 53]; Sub 4: [26, 28, 65, 62, 27, 51, 43, 30, 37, 24]; Sub 5: [65, 25, 19, 47, 27, 55, 20, 53, 64, 28]
- Constraints: every package assigned to exactly 1 subcontractor; each subcontractor's total workload <= capacity.
```

#### Multi-Floor RCPSP Schedule (10 tasks, 10 weeks) (`const-rcpsp-10x10`)
- **Type:** Project Planning · **Size:** Large (130 QUBO vars: 100 decision + 30 slack, 1680 couplings, 20.04% density, max deg 39, dynamic range 21.0×)
- **Objective:** Minimize · **Best Known:** `191` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Classical Wins** — OR-Tools CP-SAT proved optimal (191.0) in 3.1 ms solve, outperforming QUBO SA (median 264.0 [38.22% gap], best 222.0 [16.23% gap], 15/20 feasible at λ=480.0, 897.2 ms solve).
- **20-Seed SA Distribution:** best `222.0` · median `264.0` · mean±std `265.2667 ± 26.9034` · worst `327.0` · IQR `40.0` · timings build/tune/solve `0.9ms` / `4.51s` / `897.2ms`
- **20-Seed CP-SAT:** `OPTIMAL` `191.0` · timings build/solve `2.1ms` / `3.1ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Schedule 10 multi-floor work packages over 10 weeks under precedence arcs and a 7-crew weekly cap.

```text
Multi-Floor RCPSP Project Schedule: schedule 10 construction work packages across 10 weekly slots (binary wk_i_t = 1 if task i executes in week t+1) to minimize priority-weighted completion time.
- Crew units required per task: [4, 2, 3, 4, 2, 2, 4, 4, 2, 3]
- Priority weights per task: [6, 11, 3, 12, 9, 4, 3, 3, 4, 3]
- Weekly site crew capacity cap: 7 crew units
- Precedence arcs (week_a < week_b): [(0, 1), (0, 2), (1, 3), (2, 4), (3, 5), (4, 5), (5, 6), (5, 7), (6, 8), (7, 9)].
```

#### Multi-Site Fleet & Crew Dispatch (12 units, 14 sites) (`const-fleet-dispatch-12x14`)
- **Type:** Equipment + Workforce · **Size:** Large (180 QUBO vars: 180 decision + 0 slack, 1092 couplings, 6.78% density, max deg 14, dynamic range 48.8×)
- **Objective:** Minimize · **Best Known:** `327` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Exceeds QUBO Limit** — Formulation requires 180 QUBO vars (180 decision + 0 slack, 1092 couplings), exceeding the 150-var interactive benchmark cap. QUBO equivalence verified (err=0.0); OR-Tools CP-SAT proved optimal (327.0) in 35.1 ms solve.
- **20-Seed CP-SAT:** `OPTIMAL` `327.0` · timings build/solve `1.4ms` / `35.1ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Mobilize and dispatch 12 equipment-operator units across 14 active job sites at minimum mobilization + travel cost.

```text
Multi-Site Fleet & Crew Dispatch: decide which of 12 heavy equipment + certified operator units to mobilize (binary deploy_i) and assign them to cover 14 active construction sites (binary assign_i_j), minimizing mobilization plus site-dispatch fuel and travel cost ($k).
- Unit mobilization costs ($k): [43, 77, 48, 49, 36, 37, 75, 67, 66, 66, 52, 80]
- Dispatch cost matrix ($k): Unit 0: [21, 38, 18, 15, 16, 16, 31, 14, 39, 42, 18, 32, 22, 16]; Unit 1: [14, 16, 37, 37, 19, 15, 38, 14, 26, 40, 30, 12, 13, 27]; Unit 2: [19, 22, 19, 21, 15, 12, 28, 25, 17, 42, 35, 42, 12, 11]; Unit 3: [40, 38, 17, 30, 32, 25, 25, 35, 20, 19, 26, 26, 11, 20]; Unit 4: [31, 12, 24, 31, 12, 18, 34, 15, 23, 42, 23, 11, 29, 12]; Unit 5: [32, 10, 18, 29, 24, 26, 19, 42, 20, 33, 15, 15, 33, 16]; Unit 6: [25, 19, 11, 16, 39, 18, 32, 17, 16, 36, 38, 26, 15, 12]; Unit 7: [19, 35, 14, 19, 13, 31, 21, 21, 28, 33, 34, 41, 16, 10]; Unit 8: [16, 22, 37, 10, 21, 12, 31, 29, 24, 14, 39, 35, 38, 38]; Unit 9: [20, 39, 20, 22, 26, 30, 22, 25, 39, 22, 38, 29, 25, 14]; Unit 10: [35, 31, 29, 14, 34, 11, 26, 28, 40, 20, 22, 38, 22, 21]; Unit 11: [40, 32, 25, 15, 10, 29, 10, 28, 23, 13, 31, 10, 13, 30]
- Constraints: every site served by exactly 1 unit; assign_i_j <= deploy_i.
```

### Energy

#### Substation Phase Balancing (12 nodes) (`energy-maxcut-12`)
- **Type:** Grid Partitioning (Max-Cut) · **Size:** Small (12 QUBO vars: 12 decision + 0 slack, 34 couplings, 51.52% density, max deg 9, dynamic range 24.0×)
- **Objective:** Maximize · **Best Known:** `128` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=10.0). Runtime: CP-SAT solve 1.6 ms vs. SA solve 53.0 ms (+ 295 ms λ-tuning).
- **20-Seed SA Distribution:** best `128.0` · median `128.0` · mean±std `128.0 ± 0.0` · worst `128.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `294.9ms` / `53.0ms`
- **20-Seed CP-SAT:** `OPTIMAL` `128.0` · timings build/solve `0.8ms` / `1.6ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Partition 12 grid substations across 34 weighted transmission links to maximize cut capacity.

```text
Partition 12 electrical substations (0 to 11) into two balanced phase zones to maximize total weighted cut capacity across 34 transmission links. Weighted edges [u, v, weight]: [[0, 3, 8], [0, 4, 3], [0, 6, 10], [0, 7, 2], [0, 8, 2], [0, 10, 9], [0, 11, 6], [1, 3, 1], [1, 10, 10], [1, 11, 9], [2, 3, 1], [2, 4, 1], [2, 6, 4], [2, 7, 1], [2, 9, 8], [2, 10, 5], [2, 11, 3], [3, 6, 1], [3, 9, 4], [3, 11, 5], [4, 6, 4], [4, 10, 7], [4, 11, 5], [5, 6, 5], [5, 7, 9], [5, 8, 5], [5, 9, 10], [5, 10, 1], [5, 11, 2], [6, 8, 7], [6, 11, 6], [7, 11, 3], [9, 10, 8], [10, 11, 8]].
```

#### Demand-Response Load Shedding (12 feeders) (`energy-demand-12`)
- **Type:** Demand Response · **Size:** Small (19 QUBO vars: 12 decision + 7 slack, 171 couplings, 100.0% density, max deg 18, dynamic range 816.0×)
- **Objective:** Maximize · **Best Known:** `355` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Classical Wins** — OR-Tools CP-SAT proved optimal (355.0) in 0.1 ms solve, outperforming QUBO SA (median 325.0 [8.45% gap], best 355.0 [0.00% gap], 20/20 feasible at λ=296.0, 130.2 ms solve).
- **20-Seed SA Distribution:** best `355.0` · median `325.0` · mean±std `324.75 ± 15.3423` · worst `297.0` · IQR `19.25` · timings build/tune/solve `0.1ms` / `690.1ms` / `130.2ms`
- **20-Seed CP-SAT:** `OPTIMAL` `355.0` · timings build/solve `0.2ms` / `0.1ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Select feeders within a 67 curtailment (MW) limit to maximize grid stability score.

```text
Select a subset of 12 feeders subject to a total curtailment (MW) cap of 67. Candidates: feeder 0: curtailment (MW) 14, grid stability score 13; feeder 1: curtailment (MW) 5, grid stability score 44; feeder 2: curtailment (MW) 18, grid stability score 74; feeder 3: curtailment (MW) 13, grid stability score 12; feeder 4: curtailment (MW) 14, grid stability score 67; feeder 5: curtailment (MW) 15, grid stability score 22; feeder 6: curtailment (MW) 9, grid stability score 57; feeder 7: curtailment (MW) 22, grid stability score 49; feeder 8: curtailment (MW) 8, grid stability score 53; feeder 9: curtailment (MW) 19, grid stability score 30; feeder 10: curtailment (MW) 9, grid stability score 21; feeder 11: curtailment (MW) 4, grid stability score 39. Maximize total grid stability score.
```

#### Transmission Grid Partitioning (20 nodes) (`energy-maxcut-20`)
- **Type:** Grid Partitioning (Max-Cut) · **Size:** Small (20 QUBO vars: 20 decision + 0 slack, 57 couplings, 30.0% density, max deg 11, dynamic range 28.0×)
- **Objective:** Maximize · **Best Known:** `255` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=10.0). Runtime: CP-SAT solve 24.1 ms vs. SA solve 92.0 ms (+ 488 ms λ-tuning).
- **20-Seed SA Distribution:** best `255.0` · median `255.0` · mean±std `255.0 ± 0.0` · worst `255.0` · IQR `0.0` · timings build/tune/solve `0.2ms` / `488.2ms` / `92.0ms`
- **20-Seed CP-SAT:** `OPTIMAL` `255.0` · timings build/solve `1.2ms` / `24.1ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Partition 20 grid substations across 57 weighted transmission links to maximize cut capacity.

```text
Partition 20 electrical substations (0 to 19) into two balanced phase zones to maximize total weighted cut capacity across 57 transmission links. Weighted edges [u, v, weight]: [[0, 2, 6], [0, 6, 6], [0, 8, 7], [0, 10, 9], [0, 14, 4], [1, 2, 5], [1, 3, 7], [1, 5, 10], [1, 7, 10], [1, 14, 8], [1, 17, 9], [2, 5, 10], [2, 6, 2], [2, 14, 2], [2, 16, 1], [3, 6, 7], [3, 9, 4], [3, 14, 2], [3, 15, 4], [3, 18, 6], [4, 5, 3], [4, 10, 7], [4, 12, 9], [4, 17, 8], [5, 6, 1], [5, 13, 4], [5, 16, 8], [5, 19, 3], [6, 7, 9], [6, 10, 10], [6, 11, 2], [6, 14, 4], [7, 12, 5], [7, 13, 4], [7, 15, 8], [7, 17, 2], [7, 18, 2], [7, 19, 10], [8, 9, 4], [8, 13, 1], [8, 14, 2], [9, 17, 9], [10, 12, 1], [10, 13, 10], [10, 14, 1], [10, 16, 3], [10, 17, 10], [10, 19, 5], [11, 14, 8], [11, 15, 8], [12, 15, 10], [13, 14, 2], [14, 18, 4], [14, 19, 6], [15, 19, 9], [16, 19, 7], [18, 19, 10]].
```

#### Microgrid Unit Commitment (4 gens, 4 periods) (`energy-uc-4x4`)
- **Type:** Unit Commitment · **Size:** Small (29 QUBO vars: 16 decision + 13 slack, 103 couplings, 25.37% density, max deg 9, dynamic range 384.0×)
- **Objective:** Minimize · **Best Known:** `158` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=40.0). Runtime: CP-SAT solve 1.1 ms vs. SA solve 133.5 ms (+ 726 ms λ-tuning).
- **20-Seed SA Distribution:** best `158.0` · median `158.0` · mean±std `158.15 ± 0.3571` · worst `159.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `725.5ms` / `133.5ms`
- **20-Seed CP-SAT:** `OPTIMAL` `158.0` · timings build/solve `0.3ms` / `1.1ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Dispatch 4 generators over 4 periods to satisfy demand [7, 4, 7, 8] MW at minimum cost.

```text
Schedule 4 power generators across 4 time periods to meet hourly grid demand [7, 4, 7, 8] MW. Generator capacities (MW): [3, 3, 4, 2]; hourly operating costs: [15, 14, 17, 29]; startup costs: [10, 6, 11, 5]. Minimize total operating plus startup cost.
```

#### Backup Generator Coverage (9 units, 12 zones) (`energy-substation-cover`)
- **Type:** Set Cover · **Size:** Small (30 QUBO vars: 9 decision + 21 slack, 123 couplings, 28.28% density, max deg 19, dynamic range 4.0×)
- **Objective:** Minimize · **Best Known:** `44` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=20.0). Runtime: CP-SAT solve 0.3 ms vs. SA solve 190.8 ms (+ 1019 ms λ-tuning).
- **20-Seed SA Distribution:** best `44.0` · median `44.0` · mean±std `44.0 ± 0.0` · worst `44.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `1.02s` / `190.8ms`
- **20-Seed CP-SAT:** `OPTIMAL` `44.0` · timings build/solve `0.2ms` / `0.3ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Select the minimum-cost subset of 9 backup units covering all 12 grid zones.

```text
Choose backup units to cover all 12 grid zones (0 to 11) at minimum cost. Options: backup unit 0 (cost 8) covers grid zones [1, 2, 4, 6]; backup unit 1 (cost 17) covers grid zones [1, 3, 5]; backup unit 2 (cost 11) covers grid zones [1, 5, 6, 10, 11]; backup unit 3 (cost 5) covers grid zones [0, 5, 7]; backup unit 4 (cost 5) covers grid zones [0, 6, 8, 9, 10]; backup unit 5 (cost 6) covers grid zones [4, 5, 8]; backup unit 6 (cost 20) covers grid zones [0, 1, 2, 7, 9]; backup unit 7 (cost 18) covers grid zones [1, 3, 5, 6]; backup unit 8 (cost 16) covers grid zones [2, 5, 6, 7, 11].
```

#### Regional Unit Commitment (5 gens, 4 periods) (`energy-uc-5x4`)
- **Type:** Unit Commitment · **Size:** Small (33 QUBO vars: 20 decision + 13 slack, 135 couplings, 25.57% density, max deg 10, dynamic range 428.57×)
- **Objective:** Minimize · **Best Known:** `188` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Classical Wins** — OR-Tools CP-SAT proved optimal (188.0) in 1.1 ms solve, outperforming QUBO SA (median 193.0 [2.66% gap], best 188.0 [0.00% gap], 20/20 feasible at λ=40.0, 147.2 ms solve).
- **20-Seed SA Distribution:** best `188.0` · median `193.0` · mean±std `191.7 ± 3.8354` · worst `200.0` · IQR `5.0` · timings build/tune/solve `0.1ms` / `855.2ms` / `147.2ms`
- **20-Seed CP-SAT:** `OPTIMAL` `188.0` · timings build/solve `0.4ms` / `1.1ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Dispatch 5 generators over 4 periods to satisfy demand [11, 6, 11, 11] MW at minimum cost.

```text
Schedule 5 power generators across 4 time periods to meet hourly grid demand [11, 6, 11, 11] MW. Generator capacities (MW): [3, 4, 4, 4, 2]; hourly operating costs: [12, 20, 26, 12, 32]; startup costs: [8, 8, 7, 8, 7]. Minimize total operating plus startup cost.
```

#### Thermal Fleet Dispatch (6 gens, 5 periods) (`energy-uc-6x5`)
- **Type:** Unit Commitment · **Size:** Small (50 QUBO vars: 30 decision + 20 slack, 249 couplings, 20.33% density, max deg 11, dynamic range 1487.5×)
- **Objective:** Minimize · **Best Known:** `277` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Classical Wins** — OR-Tools CP-SAT proved optimal (277.0) in 1.3 ms solve, outperforming QUBO SA (median 375.0 [35.38% gap], best 339.0 [22.38% gap], 20/20 feasible at λ=51.0, 238.5 ms solve).
- **20-Seed SA Distribution:** best `339.0` · median `375.0` · mean±std `372.5 ± 16.8656` · worst `401.0` · IQR `26.0` · timings build/tune/solve `0.2ms` / `1.28s` / `238.5ms`
- **20-Seed CP-SAT:** `OPTIMAL` `277.0` · timings build/solve `0.5ms` / `1.3ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Dispatch 6 generators over 5 periods to satisfy demand [14, 9, 9, 10, 9] MW at minimum cost.

```text
Schedule 6 power generators across 5 time periods to meet hourly grid demand [14, 9, 9, 10, 9] MW. Generator capacities (MW): [5, 3, 3, 5, 2, 5]; hourly operating costs: [19, 21, 29, 23, 26, 35]; startup costs: [10, 11, 6, 16, 13, 6]. Minimize total operating plus startup cost.
```

#### Regional Substation Expansion (12 sites, 14 zones) (`energy-substation-12x14`)
- **Type:** Plant Location · **Size:** Large (180 QUBO vars: 180 decision + 0 slack, 1092 couplings, 6.78% density, max deg 14, dynamic range 74.67×)
- **Objective:** Minimize · **Best Known:** `271` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Exceeds QUBO Limit** — Formulation requires 180 QUBO vars (180 decision + 0 slack, 1092 couplings), exceeding the 150-var interactive benchmark cap. QUBO equivalence verified (err=0.0); OR-Tools CP-SAT proved optimal (271.0) in 17.3 ms solve.
- **20-Seed CP-SAT:** `OPTIMAL` `271.0` · timings build/solve `1.4ms` / `17.3ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Open a subset of 12 plants and assign 14 orders at minimum total cost.

```text
Decide which of 12 production plants to open (fixed costs [79, 39, 65, 70, 82, 74, 84, 84, 43, 76, 81, 48]) and assign each of 14 orders to exactly one open plant. Fulfillment cost matrix (rows plants, columns orders): plant 0: [27, 12, 24, 7, 28, 24, 22, 18, 25, 15, 24, 7, 16, 7]; plant 1: [15, 9, 27, 15, 24, 12, 20, 28, 15, 21, 14, 6, 28, 27]; plant 2: [25, 20, 25, 8, 15, 25, 9, 14, 11, 12, 14, 7, 7, 24]; plant 3: [13, 19, 15, 9, 9, 15, 23, 7, 12, 16, 27, 7, 12, 17]; plant 4: [16, 23, 17, 28, 17, 12, 19, 24, 14, 25, 22, 18, 9, 25]; plant 5: [6, 9, 23, 27, 24, 10, 10, 13, 12, 12, 9, 19, 15, 12]; plant 6: [12, 9, 12, 21, 28, 17, 11, 13, 25, 13, 17, 20, 26, 18]; plant 7: [18, 21, 21, 9, 13, 14, 28, 27, 25, 12, 9, 18, 28, 12]; plant 8: [7, 9, 23, 16, 21, 28, 24, 27, 18, 12, 20, 21, 13, 20]; plant 9: [15, 16, 10, 22, 9, 6, 10, 21, 13, 19, 22, 8, 6, 18]; plant 10: [20, 15, 21, 20, 8, 28, 17, 10, 14, 7, 6, 28, 8, 24]; plant 11: [14, 9, 14, 23, 17, 27, 10, 17, 16, 25, 13, 15, 20, 11]. Minimize total fixed opening plus fulfillment cost.
```

### Finance

#### Equity Portfolio Selection (8 assets, pick 4) (`finance-portfolio-8-k4`)
- **Type:** Portfolio Selection · **Size:** Small (8 QUBO vars: 8 decision + 0 slack, 28 couplings, 100.0% density, max deg 7, dynamic range 3.73×)
- **Objective:** Maximize · **Best Known:** `129` (Exact quadratic-linearized optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=94.0). Runtime: CP-SAT solve 1.7 ms vs. SA solve 27.5 ms (+ 225 ms λ-tuning).
- **20-Seed SA Distribution:** best `129.0` · median `129.0` · mean±std `129.0 ± 0.0` · worst `129.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `225.1ms` / `27.5ms`
- **20-Seed CP-SAT:** `OPTIMAL` `129.0` · timings build/solve `0.6ms` / `1.7ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Pick exactly 4 of 8 assets to maximize expected return minus pairwise covariance risk.

```text
Select exactly 4 assets out of 8 candidate equities to maximize risk-adjusted return (expected return minus pairwise covariance penalty). Expected returns: [41, 17, 47, 38, 24, 32, 38, 28]. Symmetric risk covariance matrix: asset 0: [0, 10, 4, 6, 1, 5, 9, 8]; asset 1: [10, 0, 9, 6, 8, 1, 9, 6]; asset 2: [4, 9, 0, 8, 6, 5, 2, 7]; asset 3: [6, 6, 8, 0, 10, 10, 10, 7]; asset 4: [1, 8, 6, 10, 0, 9, 8, 7]; asset 5: [5, 1, 5, 10, 9, 0, 4, 1]; asset 6: [9, 9, 2, 10, 8, 4, 0, 6]; asset 7: [8, 6, 7, 7, 7, 1, 6, 0].
```

#### Equity Portfolio Selection (12 assets, pick 5) (`finance-portfolio-12-k5`)
- **Type:** Portfolio Selection · **Size:** Small (12 QUBO vars: 12 decision + 0 slack, 66 couplings, 100.0% density, max deg 11, dynamic range 4.72×)
- **Objective:** Maximize · **Best Known:** `123` (Exact quadratic-linearized optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=92.0). Runtime: CP-SAT solve 4.6 ms vs. SA solve 85.7 ms (+ 618 ms λ-tuning).
- **20-Seed SA Distribution:** best `123.0` · median `123.0` · mean±std `123.0 ± 0.0` · worst `123.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `617.8ms` / `85.7ms`
- **20-Seed CP-SAT:** `OPTIMAL` `123.0` · timings build/solve `1.1ms` / `4.6ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Pick exactly 5 of 12 assets to maximize expected return minus pairwise covariance risk.

```text
Select exactly 5 assets out of 12 candidate equities to maximize risk-adjusted return (expected return minus pairwise covariance penalty). Expected returns: [43, 35, 26, 15, 21, 38, 17, 26, 46, 26, 28, 26]. Symmetric risk covariance matrix: asset 0: [0, 8, 9, 8, 8, 8, 8, 4, 9, 3, 4, 7]; asset 1: [8, 0, 3, 9, 8, 9, 2, 6, 9, 8, 2, 6]; asset 2: [9, 3, 0, 10, 1, 9, 5, 3, 5, 10, 10, 7]; asset 3: [8, 9, 10, 0, 10, 6, 5, 8, 9, 2, 3, 8]; asset 4: [8, 8, 1, 10, 0, 2, 7, 4, 9, 4, 6, 8]; asset 5: [8, 9, 9, 6, 2, 0, 9, 5, 10, 5, 6, 5]; asset 6: [8, 2, 5, 5, 7, 9, 0, 9, 6, 7, 2, 5]; asset 7: [4, 6, 3, 8, 4, 5, 9, 0, 8, 10, 1, 6]; asset 8: [9, 9, 5, 9, 9, 10, 6, 8, 0, 1, 6, 10]; asset 9: [3, 8, 10, 2, 4, 5, 7, 10, 1, 0, 6, 10]; asset 10: [4, 2, 10, 3, 6, 6, 2, 1, 6, 6, 0, 5]; asset 11: [7, 6, 7, 8, 8, 5, 5, 6, 10, 10, 5, 0].
```

#### Multi-Sector Portfolio (16 assets, pick 6) (`finance-portfolio-16-k6`)
- **Type:** Portfolio Selection · **Size:** Small (16 QUBO vars: 16 decision + 0 slack, 120 couplings, 100.0% density, max deg 15, dynamic range 5.72×)
- **Objective:** Maximize · **Best Known:** `180` (Exact quadratic-linearized optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=100.0). Runtime: CP-SAT solve 24.8 ms vs. SA solve 125.0 ms (+ 973 ms λ-tuning).
- **20-Seed SA Distribution:** best `180.0` · median `180.0` · mean±std `179.15 ± 1.1948` · worst `177.0` · IQR `2.0` · timings build/tune/solve `0.2ms` / `972.6ms` / `125.0ms`
- **20-Seed CP-SAT:** `OPTIMAL` `180.0` · timings build/solve `1.9ms` / `24.8ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Pick exactly 6 of 16 assets to maximize expected return minus pairwise covariance risk.

```text
Select exactly 6 assets out of 16 candidate equities to maximize risk-adjusted return (expected return minus pairwise covariance penalty). Expected returns: [42, 38, 18, 49, 19, 37, 45, 46, 35, 32, 25, 21, 43, 19, 37, 50]. Symmetric risk covariance matrix: asset 0: [0, 8, 7, 5, 9, 9, 5, 9, 7, 3, 4, 1, 5, 7, 5, 4]; asset 1: [8, 0, 10, 4, 10, 1, 10, 3, 3, 8, 9, 4, 6, 9, 3, 8]; asset 2: [7, 10, 0, 5, 4, 7, 2, 8, 10, 8, 2, 8, 7, 8, 5, 9]; asset 3: [5, 4, 5, 0, 8, 10, 8, 10, 7, 6, 6, 10, 7, 5, 7, 6]; asset 4: [9, 10, 4, 8, 0, 6, 4, 2, 10, 8, 2, 4, 9, 5, 6, 6]; asset 5: [9, 1, 7, 10, 6, 0, 10, 2, 8, 4, 4, 1, 9, 7, 5, 6]; asset 6: [5, 10, 2, 8, 4, 10, 0, 4, 9, 2, 3, 9, 7, 7, 4, 8]; asset 7: [9, 3, 8, 10, 2, 2, 4, 0, 2, 10, 1, 10, 7, 9, 10, 5]; asset 8: [7, 3, 10, 7, 10, 8, 9, 2, 0, 10, 6, 10, 1, 6, 7, 8]; asset 9: [3, 8, 8, 6, 8, 4, 2, 10, 10, 0, 10, 6, 2, 7, 3, 3]; asset 10: [4, 9, 2, 6, 2, 4, 3, 1, 6, 10, 0, 8, 2, 8, 7, 10]; asset 11: [1, 4, 8, 10, 4, 1, 9, 10, 10, 6, 8, 0, 2, 4, 9, 4]; asset 12: [5, 6, 7, 7, 9, 9, 7, 7, 1, 2, 2, 2, 0, 1, 1, 10]; asset 13: [7, 9, 8, 5, 5, 7, 7, 9, 6, 7, 8, 4, 1, 0, 6, 3]; asset 14: [5, 3, 5, 7, 6, 5, 4, 10, 7, 3, 7, 9, 1, 6, 0, 9]; asset 15: [4, 8, 9, 6, 6, 6, 8, 5, 8, 3, 10, 4, 10, 3, 9, 0].
```

#### Capital Budgeting Allocation (10 projects) (`finance-capex-10`)
- **Type:** Capital Budgeting · **Size:** Small (17 QUBO vars: 10 decision + 7 slack, 136 couplings, 100.0% density, max deg 16, dynamic range 784.0×)
- **Objective:** Maximize · **Best Known:** `316` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=72.0). Runtime: CP-SAT solve 0.1 ms vs. SA solve 108.1 ms (+ 585 ms λ-tuning).
- **20-Seed SA Distribution:** best `316.0` · median `316.0` · mean±std `315.5 ± 1.5` · worst `311.0` · IQR `0.0` · timings build/tune/solve `0.0ms` / `585.1ms` / `108.1ms`
- **20-Seed CP-SAT:** `OPTIMAL` `316.0` · timings build/solve `0.2ms` / `0.1ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Select projects within a 65 budget ($M) limit to maximize NPV ($M).

```text
Select a subset of 10 projects subject to a total budget ($M) cap of 65. Candidates: project 0: budget ($M) 23, NPV ($M) 15; project 1: budget ($M) 23, NPV ($M) 66; project 2: budget ($M) 12, NPV ($M) 72; project 3: budget ($M) 13, NPV ($M) 61; project 4: budget ($M) 19, NPV ($M) 65; project 5: budget ($M) 20, NPV ($M) 62; project 6: budget ($M) 11, NPV ($M) 47; project 7: budget ($M) 7, NPV ($M) 66; project 8: budget ($M) 13, NPV ($M) 24; project 9: budget ($M) 4, NPV ($M) 46. Maximize total NPV ($M).
```

#### Institutional Portfolio (20 assets, pick 8) (`finance-portfolio-20-k8`)
- **Type:** Portfolio Selection · **Size:** Small (20 QUBO vars: 20 decision + 0 slack, 190 couplings, 100.0% density, max deg 19, dynamic range 7.71×)
- **Objective:** Maximize · **Best Known:** `196` (Exact quadratic-linearized optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Classical Wins** — OR-Tools CP-SAT proved optimal (196.0) in 352.7 ms solve, outperforming QUBO SA (median 189.0 [3.57% gap], best 196.0 [0.00% gap], 20/20 feasible at λ=98.0, 164.4 ms solve).
- **20-Seed SA Distribution:** best `196.0` · median `189.0` · mean±std `189.5 ± 3.7616` · worst `181.0` · IQR `3.25` · timings build/tune/solve `0.2ms` / `1.31s` / `164.4ms`
- **20-Seed CP-SAT:** `OPTIMAL` `196.0` · timings build/solve `2.7ms` / `352.7ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Pick exactly 8 of 20 assets to maximize expected return minus pairwise covariance risk.

```text
Select exactly 8 assets out of 20 candidate equities to maximize risk-adjusted return (expected return minus pairwise covariance penalty). Expected returns: [22, 46, 38, 39, 21, 33, 49, 32, 36, 23, 28, 45, 24, 47, 44, 31, 36, 22, 20, 16]. Symmetric risk covariance matrix: asset 0: [0, 1, 8, 8, 3, 2, 10, 7, 1, 7, 7, 2, 1, 4, 3, 9, 10, 5, 5, 5]; asset 1: [1, 0, 4, 6, 7, 3, 10, 4, 4, 1, 8, 2, 4, 8, 8, 3, 6, 7, 3, 7]; asset 2: [8, 4, 0, 9, 3, 7, 6, 9, 7, 4, 6, 6, 7, 6, 10, 8, 6, 6, 3, 3]; asset 3: [8, 6, 9, 0, 2, 4, 10, 3, 3, 9, 6, 5, 7, 9, 9, 4, 3, 3, 9, 6]; asset 4: [3, 7, 3, 2, 0, 6, 4, 9, 7, 2, 5, 4, 2, 9, 2, 2, 7, 6, 5, 10]; asset 5: [2, 3, 7, 4, 6, 0, 10, 10, 5, 6, 9, 4, 7, 2, 10, 10, 9, 1, 3, 8]; asset 6: [10, 10, 6, 10, 4, 10, 0, 3, 7, 8, 7, 5, 1, 3, 4, 8, 10, 2, 4, 1]; asset 7: [7, 4, 9, 3, 9, 10, 3, 0, 3, 6, 3, 8, 6, 9, 9, 3, 8, 4, 10, 9]; asset 8: [1, 4, 7, 3, 7, 5, 7, 3, 0, 9, 7, 4, 9, 2, 1, 8, 8, 7, 1, 8]; asset 9: [7, 1, 4, 9, 2, 6, 8, 6, 9, 0, 5, 8, 4, 6, 6, 10, 4, 8, 5, 5]; asset 10: [7, 8, 6, 6, 5, 9, 7, 3, 7, 5, 0, 5, 3, 4, 8, 7, 2, 9, 8, 3]; asset 11: [2, 2, 6, 5, 4, 4, 5, 8, 4, 8, 5, 0, 1, 8, 2, 9, 10, 8, 1, 3]; asset 12: [1, 4, 7, 7, 2, 7, 1, 6, 9, 4, 3, 1, 0, 7, 7, 1, 7, 3, 7, 5]; asset 13: [4, 8, 6, 9, 9, 2, 3, 9, 2, 6, 4, 8, 7, 0, 5, 4, 1, 4, 1, 7]; asset 14: [3, 8, 10, 9, 2, 10, 4, 9, 1, 6, 8, 2, 7, 5, 0, 6, 2, 5, 4, 3]; asset 15: [9, 3, 8, 4, 2, 10, 8, 3, 8, 10, 7, 9, 1, 4, 6, 0, 8, 2, 4, 5]; asset 16: [10, 6, 6, 3, 7, 9, 10, 8, 8, 4, 2, 10, 7, 1, 2, 8, 0, 7, 8, 10]; asset 17: [5, 7, 6, 3, 6, 1, 2, 4, 7, 8, 9, 8, 3, 4, 5, 2, 7, 0, 8, 1]; asset 18: [5, 3, 3, 9, 5, 3, 4, 10, 1, 5, 8, 1, 7, 1, 4, 4, 8, 8, 0, 3]; asset 19: [5, 7, 3, 6, 10, 8, 1, 9, 8, 5, 3, 3, 5, 7, 3, 5, 10, 1, 3, 0].
```

#### R&D Portfolio Budgeting (15 projects) (`finance-capex-15`)
- **Type:** Capital Budgeting · **Size:** Small (22 QUBO vars: 15 decision + 7 slack, 231 couplings, 100.0% density, max deg 21, dynamic range 1870.0×)
- **Objective:** Maximize · **Best Known:** `411` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Classical Wins** — OR-Tools CP-SAT proved optimal (411.0) in 0.1 ms solve, outperforming QUBO SA (median 386.0 [6.08% gap], best 404.0 [1.70% gap], 20/20 feasible at λ=74.0, 147.1 ms solve).
- **20-Seed SA Distribution:** best `404.0` · median `386.0` · mean±std `385.25 ± 11.2822` · worst `364.0` · IQR `16.0` · timings build/tune/solve `0.1ms` / `798.8ms` / `147.1ms`
- **20-Seed CP-SAT:** `OPTIMAL` `411.0` · timings build/solve `0.2ms` / `0.1ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Select projects within a 107 budget ($M) limit to maximize NPV ($M).

```text
Select a subset of 15 projects subject to a total budget ($M) cap of 107. Candidates: project 0: budget ($M) 15, NPV ($M) 42; project 1: budget ($M) 9, NPV ($M) 15; project 2: budget ($M) 17, NPV ($M) 50; project 3: budget ($M) 14, NPV ($M) 34; project 4: budget ($M) 23, NPV ($M) 15; project 5: budget ($M) 16, NPV ($M) 62; project 6: budget ($M) 22, NPV ($M) 44; project 7: budget ($M) 5, NPV ($M) 21; project 8: budget ($M) 20, NPV ($M) 26; project 9: budget ($M) 20, NPV ($M) 49; project 10: budget ($M) 15, NPV ($M) 71; project 11: budget ($M) 4, NPV ($M) 50; project 12: budget ($M) 24, NPV ($M) 35; project 13: budget ($M) 19, NPV ($M) 27; project 14: budget ($M) 16, NPV ($M) 74. Maximize total NPV ($M).
```

#### Corporate CapEx Selection (22 projects) (`finance-capex-22`)
- **Type:** Capital Budgeting · **Size:** Small (30 QUBO vars: 22 decision + 8 slack, 435 couplings, 100.0% density, max deg 29, dynamic range 4288.0×)
- **Objective:** Maximize · **Best Known:** `605` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Classical Wins** — OR-Tools CP-SAT proved optimal (605.0) in 0.1 ms solve, outperforming QUBO SA (median 526.0 [13.06% gap], best 573.0 [5.29% gap], 20/20 feasible at λ=568.0, 232.6 ms solve).
- **20-Seed SA Distribution:** best `573.0` · median `526.0` · mean±std `526.15 ± 20.9076` · worst `491.0` · IQR `19.5` · timings build/tune/solve `0.1ms` / `1.24s` / `232.6ms`
- **20-Seed CP-SAT:** `OPTIMAL` `605.0` · timings build/solve `0.3ms` / `0.1ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Select projects within a 166 budget ($M) limit to maximize NPV ($M).

```text
Select a subset of 22 projects subject to a total budget ($M) cap of 166. Candidates: project 0: budget ($M) 20, NPV ($M) 50; project 1: budget ($M) 10, NPV ($M) 34; project 2: budget ($M) 23, NPV ($M) 14; project 3: budget ($M) 20, NPV ($M) 69; project 4: budget ($M) 7, NPV ($M) 46; project 5: budget ($M) 24, NPV ($M) 40; project 6: budget ($M) 13, NPV ($M) 37; project 7: budget ($M) 11, NPV ($M) 13; project 8: budget ($M) 24, NPV ($M) 67; project 9: budget ($M) 7, NPV ($M) 17; project 10: budget ($M) 19, NPV ($M) 71; project 11: budget ($M) 20, NPV ($M) 24; project 12: budget ($M) 21, NPV ($M) 38; project 13: budget ($M) 23, NPV ($M) 66; project 14: budget ($M) 15, NPV ($M) 14; project 15: budget ($M) 15, NPV ($M) 55; project 16: budget ($M) 7, NPV ($M) 41; project 17: budget ($M) 11, NPV ($M) 56; project 18: budget ($M) 22, NPV ($M) 42; project 19: budget ($M) 14, NPV ($M) 63; project 20: budget ($M) 24, NPV ($M) 34; project 21: budget ($M) 21, NPV ($M) 12. Maximize total NPV ($M).
```

#### Large Clearing Desk Assignment (13x13) (`finance-clearing-13x13`)
- **Type:** Trade Matching · **Size:** Large (169 QUBO vars: 169 decision + 0 slack, 2028 couplings, 14.29% density, max deg 24, dynamic range 1.33×)
- **Objective:** Minimize · **Best Known:** `148` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Exceeds QUBO Limit** — Formulation requires 169 QUBO vars (169 decision + 0 slack, 2028 couplings), exceeding the 150-var interactive benchmark cap. QUBO equivalence verified (err=0.0); OR-Tools CP-SAT proved optimal (148.0) in 4.3 ms solve.
- **20-Seed CP-SAT:** `OPTIMAL` `148.0` · timings build/solve `1.1ms` / `4.3ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** One-to-one assignment of 13 desks to 13 portfolios at minimum cost.

```text
Assign 13 desks to 13 portfolios one-to-one so every desk handles exactly one portfolio. Cost matrix (rows desks, columns portfolios): desk 0: [21, 20, 21, 19, 37, 13, 35, 38, 34, 45, 12, 33, 47]; desk 1: [26, 49, 41, 37, 39, 18, 15, 50, 32, 34, 22, 24, 11]; desk 2: [34, 33, 11, 19, 23, 20, 47, 36, 47, 15, 47, 37, 30]; desk 3: [30, 12, 32, 9, 39, 14, 49, 50, 19, 26, 33, 41, 22]; desk 4: [19, 47, 44, 12, 47, 49, 10, 42, 31, 40, 25, 43, 17]; desk 5: [19, 46, 27, 28, 45, 11, 35, 41, 26, 18, 13, 44, 30]; desk 6: [34, 13, 16, 48, 12, 33, 29, 13, 34, 19, 39, 33, 26]; desk 7: [33, 30, 37, 48, 12, 43, 39, 28, 9, 45, 35, 29, 11]; desk 8: [21, 23, 14, 28, 34, 43, 49, 30, 40, 23, 15, 9, 46]; desk 9: [45, 15, 20, 36, 48, 44, 45, 22, 39, 49, 9, 31, 27]; desk 10: [45, 36, 8, 16, 32, 35, 44, 46, 22, 40, 47, 29, 47]; desk 11: [50, 44, 16, 33, 11, 34, 12, 10, 27, 43, 40, 22, 12]; desk 12: [43, 14, 12, 50, 38, 24, 39, 43, 20, 39, 15, 37, 27]. Minimize total assignment cost.
```

### Logistics

#### Cargo Loading Knapsack (12 parcels) (`cargo-knapsack-12`)
- **Type:** Knapsack · **Size:** Small (18 QUBO vars: 12 decision + 6 slack, 153 couplings, 100.0% density, max deg 17, dynamic range 410.0×)
- **Objective:** Maximize · **Best Known:** `249` (Dynamic programming and OR-Tools CP-SAT agree) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=114.0). Runtime: CP-SAT solve 0.1 ms vs. SA solve 117.4 ms (+ 642 ms λ-tuning).
- **20-Seed SA Distribution:** best `249.0` · median `249.0` · mean±std `246.3 ± 4.755` · worst `232.0` · IQR `3.0` · timings build/tune/solve `0.1ms` / `641.7ms` / `117.4ms`
- **20-Seed CP-SAT:** `OPTIMAL` `249.0` · timings build/solve `0.2ms` / `0.1ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Pick parcels for a van with a 51 kg limit to maximize revenue.

```text
A delivery van can carry at most 51 kg. There are 12 parcels to choose from: parcel 0: weight 9 kg, revenue 22; parcel 1: weight 8 kg, revenue 27; parcel 2: weight 14 kg, revenue 26; parcel 3: weight 7 kg, revenue 55; parcel 4: weight 15 kg, revenue 19; parcel 5: weight 17 kg, revenue 48; parcel 6: weight 4 kg, revenue 28; parcel 7: weight 16 kg, revenue 20; parcel 8: weight 4 kg, revenue 57; parcel 9: weight 6 kg, revenue 31; parcel 10: weight 12 kg, revenue 29; parcel 11: weight 16 kg, revenue 34. Choose which parcels to load so that the total weight does not exceed 51 kg and the total revenue is maximized.
```

#### Warehouse Location (3 sites, 6 customers) (`facility-location-3x6`)
- **Type:** Facility Location · **Size:** Small (21 QUBO vars: 21 decision + 0 slack, 36 couplings, 17.14% density, max deg 6, dynamic range 40.4×)
- **Objective:** Minimize · **Best Known:** `144` (Exhaustive subset enumeration and OR-Tools CP-SAT agree) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=101.0). Runtime: CP-SAT solve 0.8 ms vs. SA solve 95.1 ms (+ 562 ms λ-tuning).
- **20-Seed SA Distribution:** best `144.0` · median `144.0` · mean±std `144.0 ± 0.0` · worst `144.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `562.4ms` / `95.1ms`
- **20-Seed CP-SAT:** `OPTIMAL` `144.0` · timings build/solve `0.3ms` / `0.8ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Open a subset of 3 warehouses and serve 6 customers at minimum total cost.

```text
Choose which of 3 candidate warehouses to open and assign each of 6 customers to exactly one open warehouse. Opening costs for warehouses 0 to 2 are [67, 71, 60]. The cost of serving a customer from a warehouse is given by this matrix (rows are warehouses, columns are customers 0 to 5): warehouse 0: [28, 8, 30, 5, 13, 20]; warehouse 1: [8, 20, 15, 6, 22, 23]; warehouse 2: [11, 18, 13, 19, 18, 5]. A customer can only be served by a warehouse that is open. Minimize total opening cost plus total service cost.
```

#### Courier Round Trip TSP (5 cities) (`tsp-5-city`)
- **Type:** TSP · **Size:** Small (25 QUBO vars: 25 decision + 0 slack, 200 couplings, 66.67% density, max deg 16, dynamic range 12.25×)
- **Objective:** Minimize · **Best Known:** `115` (Exhaustive permutation search and OR-Tools CP-SAT circuit model agree) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=49.0). Runtime: CP-SAT solve 0.7 ms vs. SA solve 128.6 ms (+ 657 ms λ-tuning).
- **20-Seed SA Distribution:** best `115.0` · median `115.0` · mean±std `115.0 ± 0.0` · worst `115.0` · IQR `0.0` · timings build/tune/solve `0.2ms` / `656.7ms` / `128.6ms`
- **20-Seed CP-SAT:** `OPTIMAL` `115.0` · timings build/solve `0.3ms` / `0.7ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Shortest round trip through 5 cities starting and ending at city 0.

```text
A courier must visit 5 cities (numbered 0 to 4) exactly once, starting and ending at city 0. The travel distance between cities is given by this symmetric matrix: city 0: [0, 14, 45, 8, 36]; city 1: [14, 0, 38, 22, 35]; city 2: [45, 38, 0, 49, 18]; city 3: [8, 22, 49, 0, 37]; city 4: [36, 35, 18, 37, 0]. Find the shortest round trip that visits every city exactly once.
```

#### Depot Coverage Set Cover (7 depots, 10 regions) (`set-cover-depots-10`)
- **Type:** Set Cover · **Size:** Small (25 QUBO vars: 7 decision + 18 slack, 99 couplings, 33.0% density, max deg 18, dynamic range 4.0×)
- **Objective:** Minimize · **Best Known:** `12` (Exhaustive subset enumeration and OR-Tools CP-SAT agree) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=9.0). Runtime: CP-SAT solve 0.3 ms vs. SA solve 160.9 ms (+ 863 ms λ-tuning).
- **20-Seed SA Distribution:** best `12.0` · median `12.0` · mean±std `12.0 ± 0.0` · worst `12.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `862.8ms` / `160.9ms`
- **20-Seed CP-SAT:** `OPTIMAL` `12.0` · timings build/solve `0.2ms` / `0.3ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Open the cheapest set of depots that covers all 10 regions.

```text
Choose which depots to open so that every one of 10 regions (numbered 0 to 9) is covered by at least one open depot. Candidate depots: depot 0 (cost 3) covers regions [0, 2, 3, 6, 7]; depot 1 (cost 6) covers regions [2, 3, 4, 7, 9]; depot 2 (cost 6) covers regions [1, 5, 8, 9]; depot 3 (cost 9) covers regions [1, 6, 7, 8]; depot 4 (cost 3) covers regions [1, 4, 5, 7]; depot 5 (cost 9) covers regions [1, 2, 4, 6, 8]; depot 6 (cost 3) covers regions [1, 3, 6, 7, 8]. Minimize the total cost of the opened depots.
```

#### Driver-to-Route Assignment (6x6) (`assignment-driver-route-6`)
- **Type:** Assignment · **Size:** Small (36 QUBO vars: 36 decision + 0 slack, 180 couplings, 28.57% density, max deg 10, dynamic range 2.0×)
- **Objective:** Minimize · **Best Known:** `65` (Hungarian algorithm (SciPy) and OR-Tools CP-SAT agree) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=40.0). Runtime: CP-SAT solve 1.0 ms vs. SA solve 230.9 ms (+ 1293 ms λ-tuning).
- **20-Seed SA Distribution:** best `65.0` · median `65.0` · mean±std `65.0 ± 0.0` · worst `65.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `1.29s` / `230.9ms`
- **20-Seed CP-SAT:** `OPTIMAL` `65.0` · timings build/solve `0.4ms` / `1.0ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Assign 6 drivers to 6 routes at minimum total cost (one-to-one).

```text
Assign 6 drivers to 6 delivery routes. Each driver must be assigned to exactly one route and each route must be covered by exactly one driver. The cost of assigning a driver to a route is given by this matrix (rows are drivers 0 to 5, columns are routes 0 to 5): driver 0: [27, 31, 28, 18, 16, 15]; driver 1: [14, 40, 14, 30, 14, 19]; driver 2: [23, 12, 30, 38, 22, 38]; driver 3: [18, 17, 24, 8, 24, 8]; driver 4: [38, 28, 6, 32, 18, 17]; driver 5: [10, 6, 9, 23, 31, 14]. Minimize the total assignment cost.
```

#### Capacitated Vehicle Routing (6 customers, 2 vans) (`cvrp-6c-2v`)
- **Type:** Vehicle Routing · **Size:** Medium (92 QUBO vars: 72 decision + 20 slack, 1848 couplings, 44.15% density, max deg 46, dynamic range 76.04×)
- **Objective:** Minimize · **Best Known:** `138` (Exhaustive enumeration of all customer orderings and 2-route splits) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Classical Wins** — OR-Tools CP-SAT proved optimal (138.0) in 19.3 ms solve, outperforming QUBO SA (median 155.0 [12.32% gap], best 138.0 [0.00% gap], 20/20 feasible at λ=52.0, 761.0 ms solve).
- **20-Seed SA Distribution:** best `138.0` · median `155.0` · mean±std `164.95 ± 23.9259` · worst `213.0` · IQR `31.25` · timings build/tune/solve `1.2ms` / `3.81s` / `761.0ms`
- **20-Seed CP-SAT:** `OPTIMAL` `138.0` · timings build/solve `1.1ms` / `19.3ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Route 2 capacity-10 vans to serve 6 customers at minimum distance.

```text
2 delivery vans, each with capacity 10, start and end at the depot (node 0). There are 6 customers (nodes 1 to 6) with demands [3, 3, 3, 5, 2, 1] respectively. The travel distance matrix between nodes 0 to 6 is: node 0: [0, 28, 28, 21, 25, 10, 15]; node 1: [28, 0, 26, 12, 52, 38, 31]; node 2: [28, 26, 0, 15, 41, 34, 17]; node 3: [21, 12, 15, 0, 42, 30, 20]; node 4: [25, 52, 41, 42, 0, 16, 24]; node 5: [10, 38, 34, 30, 16, 0, 17]; node 6: [15, 31, 17, 20, 24, 17, 0]. Each customer must be visited exactly once by exactly one van, and no van may carry more than 10 in total demand. Minimize the total distance travelled by all vans.
```

#### Driver-to-Route Assignment (10x10) (`assignment-driver-route-10`)
- **Type:** Assignment · **Size:** Medium (100 QUBO vars: 100 decision + 0 slack, 900 couplings, 18.18% density, max deg 18, dynamic range 2.0×)
- **Objective:** Minimize · **Best Known:** `94` (Hungarian algorithm (SciPy) and OR-Tools CP-SAT agree) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=40.0). Runtime: CP-SAT solve 2.1 ms vs. SA solve 639.4 ms (+ 3558 ms λ-tuning).
- **20-Seed SA Distribution:** best `94.0` · median `94.0` · mean±std `94.7 ± 1.1` · worst `97.0` · IQR `2.0` · timings build/tune/solve `0.2ms` / `3.56s` / `639.4ms`
- **20-Seed CP-SAT:** `OPTIMAL` `94.0` · timings build/solve `0.8ms` / `2.1ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Assign 10 drivers to 10 routes at minimum total cost (one-to-one).

```text
Assign 10 drivers to 10 delivery routes. Each driver must be assigned to exactly one route and each route must be covered by exactly one driver. The cost of assigning a driver to a route is given by this matrix (rows are drivers 0 to 9, columns are routes 0 to 9): driver 0: [28, 13, 38, 31, 31, 15, 17, 23, 15, 21]; driver 1: [39, 34, 24, 36, 9, 21, 12, 23, 17, 11]; driver 2: [12, 8, 7, 38, 23, 20, 18, 37, 31, 36]; driver 3: [7, 28, 37, 16, 39, 34, 5, 11, 39, 14]; driver 4: [12, 37, 7, 12, 23, 24, 27, 20, 14, 25]; driver 5: [8, 31, 23, 39, 10, 27, 9, 40, 37, 16]; driver 6: [23, 18, 13, 26, 5, 21, 20, 23, 28, 22]; driver 7: [11, 30, 26, 22, 34, 29, 23, 10, 23, 5]; driver 8: [35, 32, 25, 19, 33, 32, 17, 30, 13, 30]; driver 9: [37, 8, 36, 35, 35, 10, 14, 39, 15, 11]. Minimize the total assignment cost.
```

#### Burma14 TSP (TSPLIB, 14 cities) (`tsp-burma14`)
- **Type:** TSP · **Size:** Large (196 QUBO vars: 196 decision + 0 slack, 5096 couplings, 26.67% density, max deg 52, dynamic range 265.47×)
- **Objective:** Minimize · **Best Known:** `3323` (Published TSPLIB optimum (3323), independently re-proven with OR-Tools CP-SAT on the downloaded data) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Exceeds QUBO Limit** — Formulation requires 196 QUBO vars (196 decision + 0 slack, 5096 couplings), exceeding the 150-var interactive benchmark cap. QUBO equivalence verified (err=0.0); OR-Tools CP-SAT proved optimal (3323.0) in 16.6 ms solve.
- **20-Seed CP-SAT:** `OPTIMAL` `3323.0` · timings build/solve `1.1ms` / `16.6ms`
- **Source:** TSPLIB95 burma14 (Reinelt) (Freely available for research use (TSPLIB))
- **Summary:** Classic public 14-city benchmark with a published optimal tour length of 3323.

```text
A courier must visit 14 cities (numbered 0 to 13) exactly once, starting and ending at city 0. The travel distance between cities is given by this symmetric matrix: city 0: [0, 153, 510, 706, 966, 581, 455, 70, 160, 372, 157, 567, 342, 398]; city 1: [153, 0, 422, 664, 997, 598, 507, 197, 311, 479, 310, 581, 417, 376]; city 2: [510, 422, 0, 289, 744, 390, 437, 491, 645, 880, 618, 374, 455, 211]; city 3: [706, 664, 289, 0, 491, 265, 410, 664, 804, 1070, 768, 259, 499, 310]; city 4: [966, 997, 744, 491, 0, 400, 514, 902, 990, 1261, 947, 418, 635, 636]; city 5: [581, 598, 390, 265, 400, 0, 168, 522, 634, 910, 593, 19, 284, 239]; city 6: [455, 507, 437, 410, 514, 168, 0, 389, 482, 757, 439, 163, 124, 232]; city 7: [70, 197, 491, 664, 902, 522, 389, 0, 154, 406, 133, 508, 273, 355]; city 8: [160, 311, 645, 804, 990, 634, 482, 154, 0, 276, 43, 623, 358, 498]; city 9: [372, 479, 880, 1070, 1261, 910, 757, 406, 276, 0, 318, 898, 633, 761]; city 10: [157, 310, 618, 768, 947, 593, 439, 133, 43, 318, 0, 582, 315, 464]; city 11: [567, 581, 374, 259, 418, 19, 163, 508, 623, 898, 582, 0, 275, 221]; city 12: [342, 417, 455, 499, 635, 284, 124, 273, 358, 633, 315, 275, 0, 247]; city 13: [398, 376, 211, 310, 636, 239, 232, 355, 498, 761, 464, 221, 247, 0]. Find the shortest round trip that visits every city exactly once.
```

### Manufacturing

#### Production Batch Selection (12 batches) (`mfg-batch-12`)
- **Type:** Batch Selection · **Size:** Small (19 QUBO vars: 12 decision + 7 slack, 171 couplings, 100.0% density, max deg 18, dynamic range 1104.0×)
- **Objective:** Maximize · **Best Known:** `233` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Classical Wins** — OR-Tools CP-SAT proved optimal (233.0) in 0.1 ms solve, outperforming QUBO SA (median 225.0 [3.43% gap], best 233.0 [0.00% gap], 20/20 feasible at λ=440.0, 120.7 ms solve).
- **20-Seed SA Distribution:** best `233.0` · median `225.0` · mean±std `225.65 ± 6.5213` · worst `212.0` · IQR `12.0` · timings build/tune/solve `0.1ms` / `654.6ms` / `120.7ms`
- **20-Seed CP-SAT:** `OPTIMAL` `233.0` · timings build/solve `0.2ms` / `0.1ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Select batchs within a 85 machine hours limit to maximize margin ($k).

```text
Select a subset of 12 batchs subject to a total machine hours cap of 85. Candidates: batch 0: machine hours 19, margin ($k) 32; batch 1: machine hours 6, margin ($k) 30; batch 2: machine hours 19, margin ($k) 55; batch 3: machine hours 17, margin ($k) 34; batch 4: machine hours 17, margin ($k) 22; batch 5: machine hours 24, margin ($k) 30; batch 6: machine hours 11, margin ($k) 27; batch 7: machine hours 5, margin ($k) 34; batch 8: machine hours 24, margin ($k) 28; batch 9: machine hours 16, margin ($k) 40; batch 10: machine hours 8, margin ($k) 13; batch 11: machine hours 23, margin ($k) 43. Maximize total margin ($k).
```

#### Factory Line Allocation (3 plants, 6 orders) (`mfg-plant-3x6`)
- **Type:** Plant Location · **Size:** Small (21 QUBO vars: 21 decision + 0 slack, 36 couplings, 17.14% density, max deg 6, dynamic range 33.0×)
- **Objective:** Minimize · **Best Known:** `159` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=99.0). Runtime: CP-SAT solve 0.7 ms vs. SA solve 95.7 ms (+ 556 ms λ-tuning).
- **20-Seed SA Distribution:** best `159.0` · median `159.0` · mean±std `159.0 ± 0.0` · worst `159.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `555.8ms` / `95.7ms`
- **20-Seed CP-SAT:** `OPTIMAL` `159.0` · timings build/solve `0.3ms` / `0.7ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Open a subset of 3 plants and assign 6 orders at minimum total cost.

```text
Decide which of 3 production plants to open (fixed costs [51, 72, 64]) and assign each of 6 orders to exactly one open plant. Fulfillment cost matrix (rows plants, columns orders): plant 0: [16, 26, 14, 26, 13, 16]; plant 1: [17, 7, 12, 27, 18, 6]; plant 2: [17, 21, 25, 25, 14, 15]. Minimize total fixed opening plus fulfillment cost.
```

#### CNC Machine-to-Job Assignment (5x5) (`mfg-machine-5x5`)
- **Type:** Machine Assignment · **Size:** Small (25 QUBO vars: 25 decision + 0 slack, 100 couplings, 33.33% density, max deg 8, dynamic range 2.0×)
- **Objective:** Minimize · **Best Known:** `109` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=49.0). Runtime: CP-SAT solve 0.7 ms vs. SA solve 152.7 ms (+ 868 ms λ-tuning).
- **20-Seed SA Distribution:** best `109.0` · median `109.0` · mean±std `109.0 ± 0.0` · worst `109.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `868.1ms` / `152.7ms`
- **20-Seed CP-SAT:** `OPTIMAL` `109.0` · timings build/solve `0.3ms` / `0.7ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** One-to-one assignment of 5 machines to 5 jobs at minimum cost.

```text
Assign 5 machines to 5 jobs one-to-one so every machine handles exactly one job. Cost matrix (rows machines, columns jobs): machine 0: [42, 29, 31, 17, 36]; machine 1: [24, 30, 14, 48, 32]; machine 2: [18, 37, 31, 20, 21]; machine 3: [35, 28, 49, 42, 35]; machine 4: [41, 41, 24, 13, 45]. Minimize total assignment cost.
```

#### High-Mix Production Selection (18 batches) (`mfg-batch-18`)
- **Type:** Batch Selection · **Size:** Small (25 QUBO vars: 18 decision + 7 slack, 300 couplings, 100.0% density, max deg 24, dynamic range 2371.75×)
- **Objective:** Maximize · **Best Known:** `604` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Classical Wins** — OR-Tools CP-SAT proved optimal (604.0) in 0.1 ms solve, outperforming QUBO SA (median 536.0 [11.26% gap], best 574.0 [4.97% gap], 20/20 feasible at λ=72.0, 181.5 ms solve).
- **20-Seed SA Distribution:** best `574.0` · median `536.0` · mean±std `535.15 ± 19.7668` · worst `500.0` · IQR `28.5` · timings build/tune/solve `0.1ms` / `972.6ms` / `181.5ms`
- **20-Seed CP-SAT:** `OPTIMAL` `604.0` · timings build/solve `0.3ms` / `0.1ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Select batchs within a 116 machine hours limit to maximize margin ($k).

```text
Select a subset of 18 batchs subject to a total machine hours cap of 116. Candidates: batch 0: machine hours 21, margin ($k) 62; batch 1: machine hours 21, margin ($k) 32; batch 2: machine hours 18, margin ($k) 67; batch 3: machine hours 23, margin ($k) 31; batch 4: machine hours 18, margin ($k) 26; batch 5: machine hours 19, margin ($k) 14; batch 6: machine hours 8, margin ($k) 60; batch 7: machine hours 24, margin ($k) 20; batch 8: machine hours 12, margin ($k) 69; batch 9: machine hours 7, margin ($k) 72; batch 10: machine hours 11, margin ($k) 49; batch 11: machine hours 7, margin ($k) 43; batch 12: machine hours 5, margin ($k) 48; batch 13: machine hours 11, margin ($k) 42; batch 14: machine hours 8, margin ($k) 47; batch 15: machine hours 12, margin ($k) 49; batch 16: machine hours 12, margin ($k) 58; batch 17: machine hours 22, margin ($k) 25. Maximize total margin ($k).
```

#### Regional Plant Allocation (4 plants, 8 orders) (`mfg-plant-4x8`)
- **Type:** Plant Location · **Size:** Small (36 QUBO vars: 36 decision + 0 slack, 80 couplings, 12.7% density, max deg 8, dynamic range 33.67×)
- **Objective:** Minimize · **Best Known:** `175` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=101.0). Runtime: CP-SAT solve 1.2 ms vs. SA solve 166.2 ms (+ 969 ms λ-tuning).
- **20-Seed SA Distribution:** best `175.0` · median `175.0` · mean±std `175.0 ± 0.0` · worst `175.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `968.9ms` / `166.2ms`
- **20-Seed CP-SAT:** `OPTIMAL` `175.0` · timings build/solve `0.4ms` / `1.2ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Open a subset of 4 plants and assign 8 orders at minimum total cost.

```text
Decide which of 4 production plants to open (fixed costs [74, 67, 61, 58]) and assign each of 8 orders to exactly one open plant. Fulfillment cost matrix (rows plants, columns orders): plant 0: [10, 7, 24, 13, 20, 9, 11, 14]; plant 1: [25, 23, 22, 11, 22, 23, 18, 20]; plant 2: [8, 18, 18, 6, 16, 7, 19, 22]; plant 3: [25, 27, 23, 9, 21, 24, 27, 21]. Minimize total fixed opening plus fulfillment cost.
```

#### Assembly Cell Assignment (7x7) (`mfg-machine-7x7`)
- **Type:** Machine Assignment · **Size:** Medium (49 QUBO vars: 49 decision + 0 slack, 294 couplings, 25.0% density, max deg 12, dynamic range 2.0×)
- **Objective:** Minimize · **Best Known:** `97` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=50.0). Runtime: CP-SAT solve 0.8 ms vs. SA solve 306.0 ms (+ 1733 ms λ-tuning).
- **20-Seed SA Distribution:** best `97.0` · median `97.0` · mean±std `97.0 ± 0.0` · worst `97.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `1.73s` / `306.0ms`
- **20-Seed CP-SAT:** `OPTIMAL` `97.0` · timings build/solve `0.5ms` / `0.8ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** One-to-one assignment of 7 cells to 7 orders at minimum cost.

```text
Assign 7 cells to 7 orders one-to-one so every cell handles exactly one order. Cost matrix (rows cells, columns orders): cell 0: [13, 12, 47, 25, 14, 24, 38]; cell 1: [31, 50, 43, 48, 44, 9, 50]; cell 2: [12, 15, 31, 41, 26, 12, 27]; cell 3: [11, 26, 20, 35, 43, 45, 46]; cell 4: [39, 41, 14, 20, 42, 18, 24]; cell 5: [23, 31, 10, 19, 41, 39, 34]; cell 6: [48, 20, 21, 14, 44, 17, 49]. Minimize total assignment cost.
```

#### SMT Line Assignment (9x9) (`mfg-machine-9x9`)
- **Type:** Machine Assignment · **Size:** Medium (81 QUBO vars: 81 decision + 0 slack, 648 couplings, 20.0% density, max deg 16, dynamic range 2.0×)
- **Objective:** Minimize · **Best Known:** `121` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=50.0). Runtime: CP-SAT solve 1.7 ms vs. SA solve 510.7 ms (+ 2861 ms λ-tuning).
- **20-Seed SA Distribution:** best `121.0` · median `121.0` · mean±std `121.65 ± 1.3883` · worst `126.0` · IQR `0.25` · timings build/tune/solve `0.2ms` / `2.86s` / `510.7ms`
- **20-Seed CP-SAT:** `OPTIMAL` `121.0` · timings build/solve `0.7ms` / `1.7ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** One-to-one assignment of 9 lines to 9 boards at minimum cost.

```text
Assign 9 lines to 9 boards one-to-one so every line handles exactly one board. Cost matrix (rows lines, columns boards): line 0: [35, 20, 32, 43, 30, 49, 29, 34, 19]; line 1: [12, 43, 36, 15, 17, 46, 17, 11, 36]; line 2: [43, 47, 34, 26, 23, 18, 35, 31, 13]; line 3: [47, 24, 26, 17, 49, 47, 38, 18, 24]; line 4: [11, 27, 10, 49, 40, 42, 41, 9, 32]; line 5: [14, 41, 42, 24, 14, 33, 8, 25, 44]; line 6: [47, 44, 28, 10, 22, 44, 12, 21, 20]; line 7: [22, 32, 8, 34, 16, 50, 12, 49, 8]; line 8: [32, 12, 37, 32, 19, 23, 12, 47, 18]. Minimize total assignment cost.
```

#### Global Supply Network Allocation (12 plants, 14 hubs) (`mfg-plant-12x14`)
- **Type:** Plant Location · **Size:** Large (180 QUBO vars: 180 decision + 0 slack, 1092 couplings, 6.78% density, max deg 14, dynamic range 74.0×)
- **Objective:** Minimize · **Best Known:** `252` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Exceeds QUBO Limit** — Formulation requires 180 QUBO vars (180 decision + 0 slack, 1092 couplings), exceeding the 150-var interactive benchmark cap. QUBO equivalence verified (err=0.0); OR-Tools CP-SAT proved optimal (252.0) in 29.6 ms solve.
- **20-Seed CP-SAT:** `OPTIMAL` `252.0` · timings build/solve `1.4ms` / `29.6ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Open a subset of 12 plants and assign 14 orders at minimum total cost.

```text
Decide which of 12 production plants to open (fixed costs [80, 49, 70, 55, 73, 45, 82, 56, 62, 83, 58, 66]) and assign each of 14 orders to exactly one open plant. Fulfillment cost matrix (rows plants, columns orders): plant 0: [19, 28, 19, 14, 12, 28, 24, 13, 13, 25, 14, 25, 16, 25]; plant 1: [12, 11, 10, 17, 7, 21, 16, 24, 22, 28, 24, 24, 9, 21]; plant 2: [18, 6, 21, 20, 10, 19, 8, 9, 9, 19, 26, 26, 18, 13]; plant 3: [20, 17, 20, 11, 10, 14, 27, 24, 28, 21, 17, 7, 9, 8]; plant 4: [28, 6, 17, 14, 13, 10, 21, 7, 14, 19, 21, 10, 16, 12]; plant 5: [20, 15, 9, 19, 6, 24, 15, 19, 16, 11, 26, 10, 22, 26]; plant 6: [9, 7, 24, 10, 19, 11, 14, 28, 9, 23, 23, 23, 15, 11]; plant 7: [25, 21, 15, 21, 22, 12, 24, 9, 20, 8, 24, 24, 27, 18]; plant 8: [17, 7, 11, 28, 15, 12, 26, 26, 9, 13, 13, 18, 20, 19]; plant 9: [11, 6, 24, 9, 25, 6, 15, 22, 25, 27, 12, 10, 25, 11]; plant 10: [23, 14, 11, 19, 23, 7, 13, 21, 13, 19, 10, 7, 15, 28]; plant 11: [9, 24, 10, 15, 12, 8, 23, 11, 12, 20, 8, 9, 12, 13]. Minimize total fixed opening plus fulfillment cost.
```

### Workforce Scheduling

#### Nurse Shift Rostering (5 staff, 3 shifts) (`workforce-shifts-5x3`)
- **Type:** Shift Scheduling · **Size:** Small (15 QUBO vars: 15 decision + 0 slack, 45 couplings, 42.86% density, max deg 6, dynamic range 2.32×)
- **Objective:** Minimize · **Best Known:** `103` (Exact branch-and-cut optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=44.0). Runtime: CP-SAT solve 0.4 ms vs. SA solve 93.2 ms (+ 560 ms λ-tuning).
- **20-Seed SA Distribution:** best `103.0` · median `103.0` · mean±std `103.0 ± 0.0` · worst `103.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `560.3ms` / `93.2ms`
- **20-Seed CP-SAT:** `OPTIMAL` `103.0` · timings build/solve `0.3ms` / `0.4ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Assign 5 engineers across 3 shifts meeting exact coverage [2, 2, 1] at minimum wage cost.

```text
Schedule 5 engineers across 3 shifts. Each engineer must be assigned to exactly one shift (and cannot work consecutive double shifts). Required headcount per shift (shifts 0 to 2) is [2, 2, 1]. Wage cost matrix (rows engineers, columns shifts): engineer 0: [33, 21, 13]; engineer 1: [27, 18, 18]; engineer 2: [20, 44, 12]; engineer 3: [42, 23, 14]; engineer 4: [39, 21, 20]. Minimize total staffing cost.
```

#### Hospital Shift Rostering (6 staff, 4 shifts) (`workforce-shifts-6x4`)
- **Type:** Shift Scheduling · **Size:** Small (24 QUBO vars: 24 decision + 0 slack, 96 couplings, 34.78% density, max deg 8, dynamic range 3.43×)
- **Objective:** Minimize · **Best Known:** `103` (Exact branch-and-cut optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=43.0). Runtime: CP-SAT solve 0.8 ms vs. SA solve 147.8 ms (+ 908 ms λ-tuning).
- **20-Seed SA Distribution:** best `103.0` · median `103.0` · mean±std `103.0 ± 0.0` · worst `103.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `907.7ms` / `147.8ms`
- **20-Seed CP-SAT:** `OPTIMAL` `103.0` · timings build/solve `0.4ms` / `0.8ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Assign 6 engineers across 4 shifts meeting exact coverage [2, 2, 1, 1] at minimum wage cost.

```text
Schedule 6 engineers across 4 shifts. Each engineer must be assigned to exactly one shift (and cannot work consecutive double shifts). Required headcount per shift (shifts 0 to 3) is [2, 2, 1, 1]. Wage cost matrix (rows engineers, columns shifts): engineer 0: [29, 42, 16, 39]; engineer 1: [29, 43, 38, 37]; engineer 2: [15, 20, 16, 25]; engineer 3: [11, 24, 34, 36]; engineer 4: [14, 12, 31, 39]; engineer 5: [41, 19, 18, 15]. Minimize total staffing cost.
```

#### Field Technician Assignment (5x5) (`workforce-crew-5x5`)
- **Type:** Crew Assignment · **Size:** Small (25 QUBO vars: 25 decision + 0 slack, 100 couplings, 33.33% density, max deg 8, dynamic range 2.0×)
- **Objective:** Minimize · **Best Known:** `100` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=46.0). Runtime: CP-SAT solve 0.6 ms vs. SA solve 151.9 ms (+ 870 ms λ-tuning).
- **20-Seed SA Distribution:** best `100.0` · median `100.0` · mean±std `100.0 ± 0.0` · worst `100.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `870.0ms` / `151.9ms`
- **20-Seed CP-SAT:** `OPTIMAL` `100.0` · timings build/solve `0.3ms` / `0.6ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** One-to-one assignment of 5 technicians to 5 sites at minimum cost.

```text
Assign 5 technicians to 5 sites one-to-one so every technician handles exactly one site. Cost matrix (rows technicians, columns sites): technician 0: [18, 34, 17, 19, 35]; technician 1: [10, 15, 41, 39, 24]; technician 2: [35, 46, 39, 35, 39]; technician 3: [20, 13, 30, 27, 20]; technician 4: [46, 18, 32, 25, 36]. Minimize total assignment cost.
```

#### On-Call Skill Coverage (8 engineers, 10 windows) (`workforce-oncall-8x10`)
- **Type:** Set Cover · **Size:** Small (25 QUBO vars: 8 decision + 17 slack, 98 couplings, 32.67% density, max deg 17, dynamic range 4.0×)
- **Objective:** Minimize · **Best Known:** `34` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=20.0). Runtime: CP-SAT solve 0.2 ms vs. SA solve 164.2 ms (+ 885 ms λ-tuning).
- **20-Seed SA Distribution:** best `34.0` · median `34.0` · mean±std `34.0 ± 0.0` · worst `34.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `885.2ms` / `164.2ms`
- **20-Seed CP-SAT:** `OPTIMAL` `34.0` · timings build/solve `0.2ms` / `0.2ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Select the minimum-cost subset of 8 engineers covering all 10 windows.

```text
Choose engineers to cover all 10 windows (0 to 9) at minimum cost. Options: engineer 0 (cost 13) covers windows [1, 3, 7, 9]; engineer 1 (cost 11) covers windows [0, 1, 4, 6, 8]; engineer 2 (cost 18) covers windows [0, 2, 3, 7]; engineer 3 (cost 10) covers windows [2, 5, 8]; engineer 4 (cost 18) covers windows [3, 4, 5]; engineer 5 (cost 5) covers windows [3, 4, 9]; engineer 6 (cost 20) covers windows [1, 2, 4, 5]; engineer 7 (cost 18) covers windows [2, 3, 4, 9].
```

#### Operations Crew Rostering (9 staff, 4 shifts) (`workforce-shifts-9x4`)
- **Type:** Shift Scheduling · **Size:** Small (36 QUBO vars: 36 decision + 0 slack, 198 couplings, 31.43% density, max deg 11, dynamic range 2.89×)
- **Objective:** Minimize · **Best Known:** `138` (Exact branch-and-cut optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=44.0). Runtime: CP-SAT solve 1.0 ms vs. SA solve 230.6 ms (+ 1380 ms λ-tuning).
- **20-Seed SA Distribution:** best `138.0` · median `138.0` · mean±std `138.0 ± 0.0` · worst `138.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `1.38s` / `230.6ms`
- **20-Seed CP-SAT:** `OPTIMAL` `138.0` · timings build/solve `0.5ms` / `1.0ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Assign 9 engineers across 4 shifts meeting exact coverage [3, 2, 2, 2] at minimum wage cost.

```text
Schedule 9 engineers across 4 shifts. Each engineer must be assigned to exactly one shift (and cannot work consecutive double shifts). Required headcount per shift (shifts 0 to 3) is [3, 2, 2, 2]. Wage cost matrix (rows engineers, columns shifts): engineer 0: [15, 42, 31, 13]; engineer 1: [36, 13, 26, 37]; engineer 2: [14, 41, 41, 25]; engineer 3: [18, 10, 10, 17]; engineer 4: [39, 40, 35, 29]; engineer 5: [42, 44, 19, 42]; engineer 6: [37, 35, 22, 10]; engineer 7: [10, 36, 37, 26]; engineer 8: [14, 44, 27, 42]. Minimize total staffing cost.
```

#### Plant Shift Rostering (12 staff, 5 shifts) (`workforce-shifts-12x5`)
- **Type:** Shift Scheduling · **Size:** Medium (60 QUBO vars: 60 decision + 0 slack, 450 couplings, 25.42% density, max deg 15, dynamic range 2.89×)
- **Objective:** Minimize · **Best Known:** `218` (Exact branch-and-cut optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.46% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=45.0). Runtime: CP-SAT solve 1.5 ms vs. SA solve 403.2 ms (+ 2369 ms λ-tuning).
- **20-Seed SA Distribution:** best `218.0` · median `219.0` · mean±std `221.35 ± 3.6094` · worst `229.0` · IQR `3.25` · timings build/tune/solve `0.2ms` / `2.37s` / `403.2ms`
- **20-Seed CP-SAT:** `OPTIMAL` `218.0` · timings build/solve `0.7ms` / `1.5ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Assign 12 engineers across 5 shifts meeting exact coverage [3, 3, 2, 2, 2] at minimum wage cost.

```text
Schedule 12 engineers across 5 shifts. Each engineer must be assigned to exactly one shift (and cannot work consecutive double shifts). Required headcount per shift (shifts 0 to 4) is [3, 3, 2, 2, 2]. Wage cost matrix (rows engineers, columns shifts): engineer 0: [21, 43, 23, 41, 35]; engineer 1: [32, 45, 45, 21, 37]; engineer 2: [19, 20, 32, 41, 29]; engineer 3: [10, 37, 16, 14, 38]; engineer 4: [27, 24, 26, 45, 33]; engineer 5: [32, 36, 37, 19, 20]; engineer 6: [29, 30, 32, 18, 39]; engineer 7: [30, 12, 28, 15, 40]; engineer 8: [44, 21, 15, 36, 21]; engineer 9: [41, 44, 23, 22, 38]; engineer 10: [44, 18, 15, 24, 11]; engineer 11: [24, 31, 18, 45, 41]. Minimize total staffing cost.
```

#### Flight Crew Pairing Assignment (8x8) (`workforce-crew-8x8`)
- **Type:** Crew Assignment · **Size:** Medium (64 QUBO vars: 64 decision + 0 slack, 448 couplings, 22.22% density, max deg 14, dynamic range 2.0×)
- **Objective:** Minimize · **Best Known:** `131` (Exact optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Competitive** — Quality competitive: SA achieved 0.00% median gap (best 0.00%, 20/20 held-out seeds feasible at λ=50.0). Runtime: CP-SAT solve 1.0 ms vs. SA solve 404.1 ms (+ 2238 ms λ-tuning).
- **20-Seed SA Distribution:** best `131.0` · median `131.0` · mean±std `131.0 ± 0.0` · worst `131.0` · IQR `0.0` · timings build/tune/solve `0.1ms` / `2.24s` / `404.1ms`
- **20-Seed CP-SAT:** `OPTIMAL` `131.0` · timings build/solve `0.6ms` / `1.0ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** One-to-one assignment of 8 crews to 8 flights at minimum cost.

```text
Assign 8 crews to 8 flights one-to-one so every crew handles exactly one flight. Cost matrix (rows crews, columns flights): crew 0: [9, 13, 41, 17, 16, 13, 16, 41]; crew 1: [25, 43, 25, 32, 16, 18, 14, 46]; crew 2: [32, 26, 37, 30, 39, 12, 31, 46]; crew 3: [21, 39, 35, 31, 29, 48, 31, 31]; crew 4: [42, 14, 46, 22, 46, 36, 16, 35]; crew 5: [11, 50, 29, 18, 46, 42, 48, 43]; crew 6: [14, 10, 35, 21, 35, 28, 24, 48]; crew 7: [43, 19, 48, 31, 10, 23, 31, 42]. Minimize total assignment cost.
```

#### Enterprise Multi-Site Roster (20 staff, 8 shifts) (`workforce-shifts-20x8`)
- **Type:** Shift Scheduling · **Size:** Large (160 QUBO vars: 160 decision + 0 slack, 2080 couplings, 16.35% density, max deg 26, dynamic range 2.94×)
- **Objective:** Minimize · **Best Known:** `274` (Exact branch-and-cut optimality proven by OR-Tools CP-SAT) · **QUBO≡Original:** `PASS` (max err `0.0`)
- **Solver Fit:** **Exceeds QUBO Limit** — Formulation requires 160 QUBO vars (160 decision + 0 slack, 2080 couplings), exceeding the 150-var interactive benchmark cap. QUBO equivalence verified (err=0.0); OR-Tools CP-SAT proved optimal (274.0) in 3.1 ms solve.
- **20-Seed CP-SAT:** `OPTIMAL` `274.0` · timings build/solve `1.5ms` / `3.1ms`
- **Source:** Synthetic instance (fixed seed) (Original / CC0)
- **Summary:** Assign 20 engineers across 8 shifts meeting exact coverage [3, 3, 3, 3, 2, 2, 2, 2] at minimum wage cost.

```text
Schedule 20 engineers across 8 shifts. Each engineer must be assigned to exactly one shift (and cannot work consecutive double shifts). Required headcount per shift (shifts 0 to 7) is [3, 3, 3, 3, 2, 2, 2, 2]. Wage cost matrix (rows engineers, columns shifts): engineer 0: [19, 37, 13, 37, 38, 14, 14, 41]; engineer 1: [12, 15, 10, 27, 34, 42, 33, 17]; engineer 2: [13, 24, 13, 37, 41, 11, 11, 12]; engineer 3: [40, 32, 14, 29, 10, 33, 18, 28]; engineer 4: [37, 31, 39, 30, 24, 32, 39, 25]; engineer 5: [11, 31, 10, 30, 38, 27, 44, 41]; engineer 6: [41, 41, 40, 11, 19, 37, 37, 28]; engineer 7: [30, 15, 22, 37, 29, 21, 15, 24]; engineer 8: [22, 31, 11, 29, 29, 37, 18, 40]; engineer 9: [28, 20, 27, 16, 21, 40, 26, 10]; engineer 10: [36, 29, 41, 34, 11, 37, 30, 16]; engineer 11: [11, 38, 36, 33, 29, 16, 45, 38]; engineer 12: [28, 41, 32, 31, 16, 30, 21, 14]; engineer 13: [20, 43, 34, 41, 42, 43, 39, 15]; engineer 14: [35, 10, 22, 21, 35, 42, 17, 14]; engineer 15: [16, 28, 43, 29, 16, 30, 16, 33]; engineer 16: [26, 27, 20, 45, 14, 15, 41, 22]; engineer 17: [20, 37, 20, 36, 19, 15, 26, 13]; engineer 18: [23, 14, 19, 36, 28, 22, 19, 27]; engineer 19: [20, 28, 23, 45, 10, 20, 39, 36]. Minimize total staffing cost.
```
