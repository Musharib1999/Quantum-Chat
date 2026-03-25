export const DEV_TEMPLATES = {
    qiskit: `# Quantum Guru - Qiskit Starter Template
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

# Create a Quantum Circuit with 2 qubits
circuit = QuantumCircuit(2, 2)

# Add a H gate on qubit 0 (Superposition)
circuit.h(0)

# Add a CX (CNOT) gate on control qubit 0 and target qubit 1 (Entanglement)
circuit.cx(0, 1)

# Map the quantum measurement to the classical bits
circuit.measure([0,1], [0,1])

# Use AerSimulator
simulator = AerSimulator()
compiled_circuit = transpile(circuit, simulator)

# Execute the circuit on the simulator
job = simulator.run(compiled_circuit, shots=1024)

# Grab results from the job
result = job.result()

# Returns probabilities
counts = result.get_counts(compiled_circuit)
print(counts)`,

    dwave: `# Quantum Guru - D-Wave Annealer Template
import dimod

# Define a binary quadratic model (BQM)
# We want to minimize: -x - y + 2xy
bqm = dimod.BinaryQuadraticModel({'x': -1.0, 'y': -1.0}, {('x', 'y'): 2.0}, 0.0, dimod.BINARY)

# Use a local exact solver (for simulation)
# In production, this would use a D-Wave QPU
solver = dimod.ExactSolver()
response = solver.sample(bqm)

# Print the best solution found
for sample, energy in response.data(['sample', 'energy']):
    print(f"Sample: {sample}, Energy: {energy}")`,

    ortools: `# Quantum Guru - OR-Tools Optimization Template
from ortools.linear_solver import pywraplp

# Create the linear solver with the GLOP backend.
solver = pywraplp.Solver.CreateSolver('GLOP')

# Create the variables x and y.
x = solver.NumVar(0, 1, 'x')
y = solver.NumVar(0, 2, 'y')

# Create a linear constraint: x + y <= 2.
ct = solver.Constraint(-solver.infinity(), 2, 'ct')
ct.SetCoefficient(x, 1)
ct.SetCoefficient(y, 1)

# Create the objective function: 3x + y.
objective = solver.Objective()
objective.SetCoefficient(x, 3)
objective.SetCoefficient(y, 1)
objective.SetMaximization()

# Solve the problem and print the results.
solver.Solve()
print('Solution:')
print('x =', x.solution_value())
print('y =', y.solution_value())`
};
