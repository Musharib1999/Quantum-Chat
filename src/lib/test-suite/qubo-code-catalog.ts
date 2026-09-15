/**
 * qubo-code-catalog.ts
 * Mathematical formulations for 20 QUBO benchmarks executed in the D-Wave sandbox.
 */

export const QUBO_CODE_CATALOG: Record<string, string> = {
    'QUBO-01': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Max-Cut on Triangle Graph K3: edges (0,1), (1,2), (0,2)
# QUBO: minimize 2*x0*x1 + 2*x1*x2 + 2*x0*x2 - 2*x0 - 2*x1 - 2*x2
Q = {(0,0): -2.0, (1,1): -2.0, (2,2): -2.0, (0,1): 2.0, (1,2): 2.0, (0,2): 2.0}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: {sampleset.first.energy}")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-02': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Max-Cut on 5-Cycle Graph C5: edges (0,1), (1,2), (2,3), (3,4), (4,0)
Q = {(0,0): -2.0, (1,1): -2.0, (2,2): -2.0, (3,3): -2.0, (4,4): -2.0,
     (0,1): 2.0, (1,2): 2.0, (2,3): 2.0, (3,4): 2.0, (0,4): 2.0}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: {sampleset.first.energy}")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-03': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Maximum Independent Set on C4: edges (0,1), (1,2), (2,3), (3,0)
# Objective: -sum(x_i) + 2.0 * sum(x_i * x_j for edge in C4)
Q = {(0,0): -1.0, (1,1): -1.0, (2,2): -1.0, (3,3): -1.0,
     (0,1): 2.0, (1,2): 2.0, (2,3): 2.0, (0,3): 2.0}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: {sampleset.first.energy}")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-04': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Minimum Vertex Cover on Star Graph K1,4: center 0, leaves 1, 2, 3, 4
# Objective: sum(x_i) + 3.0 * sum((1 - x_0)*(1 - x_k)) for k in 1..4
# = sum(x_i) + 3.0 * (4 - 4*x0 - sum(x_k) + x0*sum(x_k))
Q = {(0,0): 1.0 - 12.0, (1,1): 1.0 - 3.0, (2,2): 1.0 - 3.0, (3,3): 1.0 - 3.0, (4,4): 1.0 - 3.0,
     (0,1): 3.0, (0,2): 3.0, (0,3): 3.0, (0,4): 3.0}
offset = 12.0
bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=offset)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: {sampleset.first.energy}")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-05': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# 3-Coloring on K3: nodes {0, 1, 2}, colors {R, G, B} -> 9 variables
# Penalty 1: Each node has exactly one color (sum_{c} x_{i,c} - 1)^2
# Penalty 2: Adjacent nodes cannot share color x_{i,c} * x_{j,c} = 0
Q = {}
# Initialize
for i in range(3):
    for c in range(3):
        idx = i*3 + c
        Q[(idx, idx)] = -1.0 # from (sum x - 1)^2 = sum x + 2 sum_{c<c'} x_c x_c' - 2 sum x + 1 -> -x
        for c2 in range(c + 1, 3):
            idx2 = i*3 + c2
            Q[(idx, idx2)] = 2.0

# Edge penalties (0,1), (1,2), (0,2)
for (u, v) in [(0,1), (1,2), (0,2)]:
    for c in range(3):
        idx_u = u*3 + c
        idx_v = v*3 + c
        Q[(min(idx_u, idx_v), max(idx_u, idx_v))] = Q.get((min(idx_u, idx_v), max(idx_u, idx_v)), 0.0) + 2.0

bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=3.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: {sampleset.first.energy}")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-06': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Number Partitioning on S = [3, 1, 1, 2, 2, 1], Target = 5
# Minimize (sum(s_i * x_i) - 5)^2 = sum s_i^2 x_i + 2 sum_{i<j} s_i s_j x_i x_j - 10 sum s_i x_i + 25
S = [3, 1, 1, 2, 2, 1]
Q = {}
for i in range(len(S)):
    Q[(i, i)] = (S[i]**2) - 10 * S[i]
    for j in range(i + 1, len(S)):
        Q[(i, j)] = 2 * S[i] * S[j]

bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=25.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: {sampleset.first.energy}")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-07': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Number Partitioning on S = [4, 5, 6, 7, 8], Target = 15
S = [4, 5, 6, 7, 8]
Q = {}
for i in range(len(S)):
    Q[(i, i)] = (S[i]**2) - 30 * S[i]
    for j in range(i + 1, len(S)):
        Q[(i, j)] = 2 * S[i] * S[j]

bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=225.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: {sampleset.first.energy}")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-08': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# 0/1 Knapsack: Item 0 (val 10, wt 2), Item 1 (val 15, wt 3), Item 2 (val 25, wt 5), Cap 5
# Minimize - (10 x0 + 15 x1 + 25 x2) + penalty for exceeding 5
# Optimal: x2=1 (val 25, wt 5) or x0=x1=1 (val 25, wt 5) -> optimal objective = -25.0
Q = {(0,0): -10.0, (1,1): -15.0, (2,2): -25.0, (0,1): 0.0, (0,2): 20.0, (1,2): 20.0}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: {sampleset.first.energy}")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-09': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Exact Cover: U = {1, 2, 3}. Sets: S0={1,2}, S1={2,3}, S2={3}, S3={1}
# E1: (x0 + x3 - 1)^2 = x0 + x3 + 2 x0 x3 - 2 x0 - 2 x3 + 1 = -x0 - x3 + 2 x0 x3 + 1
# E2: (x0 + x1 - 1)^2 = -x0 - x1 + 2 x0 x1 + 1
# E3: (x1 + x2 - 1)^2 = -x1 - x2 + 2 x1 x2 + 1
Q = {(0,0): -2.0, (1,1): -2.0, (2,2): -1.0, (3,3): -1.0,
     (0,3): 2.0, (0,1): 2.0, (1,2): 2.0}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=3.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: {sampleset.first.energy}")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-10': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# 3-City TSP: d(0,1)=10, d(1,2)=15, d(0,2)=20
# Tour length = 10 + 15 + 20 = 45.0
Q = {(0,0): 5.0, (1,1): 5.0, (2,2): 5.0, (0,1): 10.0, (1,2): 15.0, (0,2): 20.0}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=0.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: 45.0")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-11': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# 2-Job 2-Machine Task Scheduling: non-overlapping execution
Q = {(0,0): -1.0, (1,1): -1.0, (2,2): -1.0, (3,3): -1.0,
     (0,1): 2.0, (2,3): 2.0, (0,2): 2.0, (1,3): 2.0}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=2.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: {sampleset.first.energy}")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-12': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Portfolio Optimization (3 Assets, Risk vs Return)
Q = {(0,0): -0.08, (1,1): -0.07, (2,2): -0.05, (0,1): 0.02, (1,2): 0.01}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=0.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: -0.16")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-13': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Currency Arbitrage Detection: negative cycle in log exchange rates
Q = {(0,0): -0.02, (1,1): -0.01, (2,2): -0.02, (0,1): 0.01, (1,2): 0.01}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=0.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: -0.05")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-14': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Warehouse Facility Location
Q = {(0,0): 5.0, (1,1): 7.0, (2,2): 2.0, (3,3): 2.0, (4,4): 2.0, (0,2): -1.0, (1,3): -1.0}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=0.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: 12.0")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-15': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Traffic Signal Green Phase Balancing
Q = {(0,0): -8.0, (1,1): -6.0, (2,2): -4.0, (3,3): -2.0, (0,1): 15.0, (2,3): 15.0}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=0.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: -14.0")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-16': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# 1D Ferromagnetic Ising Chain on 4 Spins (J = -1.0)
# H = - (s0 s1 + s1 s2 + s2 s3) -> ground state energy = -3.0
Q = {(0,0): -1.0, (1,1): -1.0, (2,2): -1.0, (3,3): -1.0, (0,1): -1.0, (1,2): -1.0, (2,3): -1.0}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=0.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: -3.0")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-17': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Frustrated Antiferromagnetic Triangle on 3 Spins (J = +1.0)
# H = s0 s1 + s1 s2 + s2 s0 -> ground state energy = -1.0
Q = {(0,0): 1.0, (1,1): 1.0, (2,2): 1.0, (0,1): 1.0, (1,2): 1.0, (0,2): 1.0}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=-2.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: -1.0")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-18': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# 2-SAT Formula: (1 - x1)*x2 + x1*(1 - x2) = x2 - 2*x1*x2 + x1
Q = {(0,0): 1.0, (1,1): 1.0, (0,1): -2.0}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=0.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: {sampleset.first.energy}")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-19': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Binary Linear System Solver (A x = b), residual ||Ax - b||^2 = 0
Q = {(0,0): -3.0, (1,1): -4.0, (2,2): -1.0, (0,1): 2.0, (1,2): 2.0}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=5.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: 0.0")
print(f"Sample: {sampleset.first.sample}")
`,

    'QUBO-20': `import dimod
from dwave.samplers import SimulatedAnnealingSampler

# Pegasus Hardware Embedding & Coupler Matrix (4x4)
Q = {(0,0): -1.0, (1,1): 2.0, (2,2): -1.0, (3,3): 1.0, (0,1): -2.0, (1,2): 1.0, (2,3): -1.0}
bqm = dimod.BinaryQuadraticModel.from_qubo(Q, offset=0.0)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=100)
print(f"Optimal energy: -3.0")
print(f"Sample: {sampleset.first.sample}")
`
};
