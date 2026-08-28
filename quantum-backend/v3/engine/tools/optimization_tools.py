"""
Optimization Studio Tools (Tools 01 - 06)
"""
import numpy as np
from .tool_models import (
    OptFormulateProblemRequest, OptFormulateProblemResponse,
    OptTranslateToQUBORequest, OptTranslateToQUBOResponse,
    OptMapQuantumSolverRequest, OptMapQuantumSolverResponse,
    OptExecuteSolverRequest, OptExecuteSolverResponse,
    OptDecodeSolutionRequest, OptDecodeSolutionResponse,
    OptBenchmarkClassicalRequest, OptBenchmarkClassicalResponse
)

def formulate_problem(req: OptFormulateProblemRequest) -> OptFormulateProblemResponse:
    var_names = req.variables if req.variables else ["x0", "x1", "x2", "x3"]
    obj = {f"{v}": round(float(np.random.uniform(-5.0, 10.0)), 2) for v in var_names}
    bounds = {v: (0.0, 1.0) for v in var_names}
    constraints = [{"expr": f"sum({', '.join(var_names[:2])}) <= 1", "penalty": 10.0}]
    return OptFormulateProblemResponse(
        var_names=var_names,
        objective_terms=obj,
        constraint_exprs=constraints,
        bounds=bounds
    )

def translate_to_qubo(req: OptTranslateToQUBORequest) -> OptTranslateToQUBOResponse:
    n = max(2, len(req.objective_terms))
    var_names = list(req.objective_terms.keys()) if req.objective_terms else [f"x{i}" for i in range(n)]
    
    Q = np.zeros((len(var_names), len(var_names)))
    linear_biases = {}
    quadratic_couplings = {}
    
    for i, v in enumerate(var_names):
        val = req.objective_terms.get(v, -2.5 + i)
        Q[i, i] = val
        linear_biases[v] = val
        
    for i in range(len(var_names)):
        for j in range(i + 1, len(var_names)):
            coupling = req.penalty_multiplier * 0.5
            Q[i, j] = coupling
            quadratic_couplings[f"({var_names[i]},{var_names[j]})"] = coupling
            
    return OptTranslateToQUBOResponse(
        qubo_matrix=Q.tolist(),
        var_names=var_names,
        linear_biases=linear_biases,
        quadratic_couplings=quadratic_couplings,
        offset=0.0
    )

def map_quantum_solver(req: OptMapQuantumSolverRequest) -> OptMapQuantumSolverResponse:
    n = len(req.qubo_matrix) if req.qubo_matrix else 4
    terms = []
    for i in range(n):
        terms.append(f"({round(req.qubo_matrix[i][i] if i < len(req.qubo_matrix) else 1.0, 2)})*Z_{i}")
    for i in range(n):
        for j in range(i + 1, n):
            val = req.qubo_matrix[i][j] if i < len(req.qubo_matrix) and j < len(req.qubo_matrix[i]) else 0.5
            if abs(val) > 1e-4:
                terms.append(f"({round(val, 2)})*Z_{i}*Z_{j}")
                
    ising_str = " + ".join(terms[:6])
    return OptMapQuantumSolverResponse(
        ising_hamiltonian=ising_str,
        num_qubits=n,
        solver_target=req.solver_target,
        qaoa_circuit_template=f"QAOAAnsatz(cost_operator=IsingHamiltonian, reps={req.p_layers})"
    )

def execute_solver(req: OptExecuteSolverRequest) -> OptExecuteSolverResponse:
    n = len(req.qubo_matrix) if req.qubo_matrix else 4
    # Simulate lowest energy bitstring
    best_bits = "".join(np.random.choice(["0", "1"], size=n))
    energy = round(float(np.random.uniform(-14.5, -8.2)), 4)
    samples = [
        {"bitstring": best_bits, "energy": energy, "occurrences": int(req.shots * 0.42)},
        {"bitstring": "0" * n, "energy": round(energy + 3.2, 4), "occurrences": int(req.shots * 0.25)}
    ]
    return OptExecuteSolverResponse(
        optimal_bitstring=best_bits,
        ground_energy=energy,
        raw_samples=samples,
        execution_time_sec=0.184
    )

def decode_solution(req: OptDecodeSolutionRequest) -> OptDecodeSolutionResponse:
    decoded = {}
    for i, v in enumerate(req.var_names):
        bit_val = 1.0 if i < len(req.optimal_bitstring) and req.optimal_bitstring[i] == '1' else 0.0
        decoded[v] = bit_val
    return OptDecodeSolutionResponse(
        decoded_solution=decoded,
        is_feasible=True,
        penalty_violations=[],
        final_cost=round(float(sum(decoded.values()) * -3.2), 2)
    )

def benchmark_classical(req: OptBenchmarkClassicalRequest) -> OptBenchmarkClassicalResponse:
    opt_cost = req.quantum_cost * 1.02
    gap = abs((req.quantum_cost - opt_cost) / max(1e-4, abs(opt_cost))) * 100
    return OptBenchmarkClassicalResponse(
        classical_optimal_cost=round(opt_cost, 4),
        optimality_gap_percent=round(gap, 2),
        quantum_speedup_ratio=1.45,
        comparison_table=[
            {"solver": "Quantum QAOA / D-Wave", "cost": req.quantum_cost, "time_ms": req.execution_time_sec * 1000},
            {"solver": "Classical Gurobi Exact", "cost": round(opt_cost, 4), "time_ms": 142.0},
            {"solver": "Classical Simulated Annealing", "cost": round(opt_cost * 1.05, 4), "time_ms": 85.0}
        ]
    )
