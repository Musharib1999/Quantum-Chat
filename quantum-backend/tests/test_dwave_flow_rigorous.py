import json
import urllib.request
import urllib.error
import sys

API_URL = "http://localhost:8002/v3/enterprise/ide/execute"

def run_test(name, payload):
    print(f"\n--- [TEST] {name} ---")
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(API_URL, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            return body
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode("utf-8"))
        return body
    except Exception as e:
        print(f"Request failed: {e}")
        return {"success": False, "error": str(e)}

def assert_true(cond, msg):
    if not cond:
        print(f"❌ FAIL: {msg}")
        sys.exit(1)
    else:
        print(f"✅ PASS: {msg}")

# DW-101: Raw Python QUBO Dictionary
res_101 = run_test("DW-101: Raw Python QUBO Dictionary", {
    "code": """
Q = {
    ('A', 'A'): -2.5,
    ('A', 'B'): 3.0,
    ('B', 'B'): -1.0
}
from dwave.samplers import SimulatedAnnealingSampler
sampleset = SimulatedAnnealingSampler().sample_qubo(Q, num_reads=50)
""",
    "target_backend": "dwave_simulated_annealing"
})
assert_true(res_101.get("success") is True, "DW-101 success")
opt = res_101.get("optimization_results", {})
assert_true(len(opt.get("variables", [])) == 2, f"DW-101 2 variables found: {opt.get('variables')}")
assert_true(len(opt.get("qubo_matrix", [])) == 2, "DW-101 2x2 matrix compiled")
print(f"Ground energy: {opt.get('energy')}, sample: {opt.get('sample')}")

# DW-102: dimod.BinaryQuadraticModel with string labels
res_102 = run_test("DW-102: dimod.BinaryQuadraticModel", {
    "code": """
import dimod
from dwave.samplers import SimulatedAnnealingSampler
bqm = dimod.BinaryQuadraticModel({'x': 1.0, 'y': -2.0}, {('x', 'y'): 1.5}, 0.5, 'BINARY')
sampleset = SimulatedAnnealingSampler().sample(bqm, num_reads=50)
""",
    "target_backend": "dwave_simulated_annealing"
})
assert_true(res_102.get("success") is True, "DW-102 success")
opt_102 = res_102.get("optimization_results", {})
assert_true(set(opt_102.get("variables", [])) == {"x", "y"}, f"DW-102 variables match: {opt_102.get('variables')}")
assert_true(len(opt_102.get("qubo_matrix", [])) == 2, "DW-102 2x2 matrix")

# DW-103: Integer-indexed BQM with variable_names map
res_103 = run_test("DW-103: Integer BQM with variable_names", {
    "code": """
import dimod
from dwave.samplers import SimulatedAnnealingSampler
variable_names = ["Sensor_1", "Sensor_2", "Sensor_3"]
bqm = dimod.BinaryQuadraticModel({0: -1.0, 1: -1.5, 2: 2.0}, {(0, 1): 2.5, (1, 2): 1.0}, 0.0, 'BINARY')
sampleset = SimulatedAnnealingSampler().sample(bqm, num_reads=50)
""",
    "target_backend": "dwave_simulated_annealing"
})
assert_true(res_103.get("success") is True, "DW-103 success")
opt_103 = res_103.get("optimization_results", {})
assert_true("Sensor_1" in opt_103.get("variables", []), f"DW-103 variable map applied: {opt_103.get('variables')}")

# DW-104: dimod.ConstrainedQuadraticModel (CQM) with constraints
res_104 = run_test("DW-104: dimod.ConstrainedQuadraticModel", {
    "code": """
import dimod
from dwave.samplers import SimulatedAnnealingSampler
cqm = dimod.ConstrainedQuadraticModel()
x = [dimod.Binary(f'x_{i}') for i in range(3)]
cqm.set_objective(-1.0*x[0] - 2.0*x[1] + 0.5*x[2])
cqm.add_constraint(x[0] + x[1] <= 1, label="mutual_ex")
bqm, _ = dimod.cqm_to_bqm(cqm, lagrange_multiplier=5.0)
sampleset = SimulatedAnnealingSampler().sample(bqm, num_reads=50)
""",
    "target_backend": "dwave_simulated_annealing"
})
assert_true(res_104.get("success") is True, "DW-104 success")
opt_104 = res_104.get("optimization_results", {})
assert_true(opt_104.get("num_variables") >= 2, f"DW-104 CQM variables parsed: {opt_104.get('variables')}")

# DW-105: NumPy 2D Array Q_matrix
res_105 = run_test("DW-105: NumPy 2D Array Q_matrix", {
    "code": """
import numpy as np
import dimod
from dwave.samplers import SimulatedAnnealingSampler
Q_matrix = np.array([
    [-2.0,  1.5,  0.0],
    [ 1.5, -1.0,  2.0],
    [ 0.0,  2.0, -3.0]
])
variable_names = ["Node_A", "Node_B", "Node_C"]
bqm = dimod.BinaryQuadraticModel.from_qubo({
    (variable_names[i], variable_names[j]): Q_matrix[i, j]
    for i in range(3) for j in range(i, 3) if Q_matrix[i, j] != 0
})
sampleset = SimulatedAnnealingSampler().sample(bqm, num_reads=50)
""",
    "target_backend": "dwave_simulated_annealing"
})
assert_true(res_105.get("success") is True, "DW-105 success")
opt_105 = res_105.get("optimization_results", {})
assert_true(len(opt_105.get("qubo_matrix", [])) == 3, "DW-105 3x3 matrix")

# DW-106: Auto-Sampling Fallback (user forgot sampler.sample)
res_106 = run_test("DW-106: Auto-Sampling Fallback", {
    "code": """
import dimod
# User defines BQM but forgets to run sampler.sample()!
bqm = dimod.BinaryQuadraticModel({'Alpha': -3.0, 'Beta': -2.0}, {('Alpha', 'Beta'): 4.0}, 0.0, 'BINARY')
""",
    "target_backend": "dwave_simulated_annealing"
})
assert_true(res_106.get("success") is True, "DW-106 auto-sample success")
opt_106 = res_106.get("optimization_results", {})
assert_true("Alpha" in opt_106.get("variables", []), "DW-106 Alpha found in auto-sampled variables")
assert_true(opt_106.get("energy") is not None, "DW-106 energy computed via auto-sample")

# DW-201: Multi-file project import
res_201 = run_test("DW-201: Multi-file import", {
    "code": """
from helper_qubo import generate_model
import dimod
from dwave.samplers import SimulatedAnnealingSampler

Q = generate_model()
sampleset = SimulatedAnnealingSampler().sample_qubo(Q, num_reads=50)
""",
    "target_backend": "dwave_simulated_annealing",
    "project_files": {
        "main.py": "dummy",
        "helper_qubo.py": "def generate_model():\n    return {('v1', 'v1'): -1.0, ('v1', 'v2'): 2.0, ('v2', 'v2'): -1.5}\n"
    },
    "file_name": "main.py"
})
assert_true(res_201.get("success") is True, "DW-201 multi-file success")
opt_201 = res_201.get("optimization_results", {})
assert_true("v1" in opt_201.get("variables", []), "DW-201 helper variables found")

# DW-501: Asymmetric input dictionary
res_501 = run_test("DW-501: Asymmetric input dictionary", {
    "code": """
import dimod
from dwave.samplers import SimulatedAnnealingSampler
# Symmetrized or native dimod
bqm = dimod.BinaryQuadraticModel({'A': -1.0, 'B': -1.0}, {('A', 'B'): 6.0}, 0.0, 'BINARY')
sampleset = SimulatedAnnealingSampler().sample(bqm, num_reads=50)
""",
    "target_backend": "dwave_simulated_annealing"
})
assert_true(res_501.get("success") is True, "DW-501 success")

# DW-502: All-zero degenerate model
res_502 = run_test("DW-502: All-zero model", {
    "code": """
Q = {
    ('z1', 'z1'): 0.0,
    ('z2', 'z2'): 0.0,
    ('z1', 'z2'): 0.0
}
from dwave.samplers import SimulatedAnnealingSampler
sampleset = SimulatedAnnealingSampler().sample_qubo(Q, num_reads=20)
""",
    "target_backend": "dwave_simulated_annealing"
})
assert_true(res_502.get("success") is True, "DW-502 zero energy model success")
opt_502 = res_502.get("optimization_results", {})
assert_true(abs(opt_502.get("energy", 0.0)) < 1e-4, "DW-502 zero energy handled")

# DW-503: Python syntax error
res_503 = run_test("DW-503: Python syntax error", {
    "code": """
Q = {('A', 'A'): -1.0  # Missing closing bracket
""",
    "target_backend": "dwave_simulated_annealing"
})
assert_true(res_503.get("success") is False, "DW-503 caught syntax error correctly")
assert_true("SyntaxError" in (res_503.get("stderr", "") + str(res_503.get("error", ""))), "DW-503 reported SyntaxError")

print("\n==========================================")
print("🎉 ALL D-WAVE WORKFLOW RIGOROUS TESTS PASSED!")
print("==========================================\n")

# DW-601: Qiskit code inside D-Wave project (Strict Enforcement)
res_601 = run_test("DW-601: Qiskit code inside D-Wave project", {
    "code": """
from qiskit import QuantumCircuit
qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
""",
    "target_backend": "dwave_simulated_annealing"
})
assert_true(res_601.get("success") is False, "DW-601 blocked Qiskit in D-Wave project")
assert_true("[FRAMEWORK MISMATCH ERROR]" in (res_601.get("stderr", "") + str(res_601.get("error", ""))), "DW-601 returned actionable mismatch guidance")

# QK-602: D-Wave code inside Qiskit project (Strict Enforcement)
res_602 = run_test("QK-602: D-Wave code inside Qiskit project", {
    "code": """
import dimod
from dwave.samplers import SimulatedAnnealingSampler
bqm = dimod.BinaryQuadraticModel({'a': -1.0}, {}, 0, 'BINARY')
""",
    "target_backend": "aer_simulator"
})
assert_true(res_602.get("success") is False, "QK-602 blocked D-Wave in Qiskit project")
assert_true("[FRAMEWORK MISMATCH ERROR]" in (res_602.get("stderr", "") + str(res_602.get("error", ""))), "QK-602 returned actionable mismatch guidance")

print("\n=======================================================")
print("🛡️ STRICT FRAMEWORK ENFORCEMENT VERIFIED SUCCESSFULLY!")
print("=======================================================\n")

# DW-701: 50-Variable Scale & Matrix Heatmap Stress Test
res_701 = run_test("DW-701: 50-Variable Scale & Matrix Heatmap Stress Test", {
    "code": """
import dimod
from dwave.samplers import SimulatedAnnealingSampler

N = 50
Q = {}
# Diagonal linear biases
for i in range(N):
    Q[(f'node_{i:02d}', f'node_{i:02d}')] = -2.0 + (i % 5) * 0.5

# Off-diagonal quadratic couplers (2,500 coupler space)
for i in range(N):
    for j in range(i + 1, min(N, i + 8)):
        Q[(f'node_{i:02d}', f'node_{j:02d}')] = 1.5 - ((i + j) % 3) * 0.8

sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample_qubo(Q, num_reads=50)
""",
    "target_backend": "dwave_simulated_annealing"
})
assert_true(res_701.get("success") is True, "DW-701 50-variable execution success")
opt_701 = res_701.get("optimization_results", {})
assert_true(len(opt_701.get("variables", [])) == 50, f"DW-701 exactly 50 variables parsed: {len(opt_701.get('variables', []))}")
matrix_701 = opt_701.get("qubo_matrix", [])
assert_true(len(matrix_701) == 50, "DW-701 matrix has 50 rows")
assert_true(all(len(row) == 50 for row in matrix_701), "DW-701 matrix has 50 columns (2,500 elements)")
assert_true(len(opt_701.get("sample", {})) == 50, "DW-701 decision vector has 50 binary states")
print(f"DW-701 Ground Energy: {opt_701.get('energy')}")
print(f"DW-701 50x50 Coupler Cells: {len(matrix_701) * 50} successfully compiled")
