import ast
import io
import json
import os
import sys
import time
import traceback
import subprocess
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

import numpy as np
import qiskit
from qiskit import QuantumCircuit
from qiskit.visualization import circuit_drawer

try:
    import qiskit_aer
    from qiskit_aer import AerSimulator
    _orig_aer_run = AerSimulator.run
    def _safe_aer_run(self, circuits, **kwargs):
        if isinstance(circuits, QuantumCircuit) and getattr(circuits, "num_clbits", 0) == 0:
            c = circuits.copy()
            c.measure_all()
            return _orig_aer_run(self, c, **kwargs)
        return _orig_aer_run(self, circuits, **kwargs)
    AerSimulator.run = _safe_aer_run
    HAS_AER = True
except ImportError:
    HAS_AER = False

try:
    import dimod
    from dwave.samplers import SimulatedAnnealingSampler
    HAS_DWAVE = True
except ImportError:
    HAS_DWAVE = False


class CodeExecutionRequest(BaseModel):
    project_id: str = "default"
    file_name: str = "main.py"
    code: str
    target_backend: Optional[str] = "auto"
    shots: Optional[int] = 1024


class CodeExecutionResponse(BaseModel):
    success: bool
    stdout: str = ""
    stderr: str = ""
    execution_time_ms: float = 0.0
    backend_used: str = "local"
    circuit_ascii: Optional[str] = None
    circuit_gates: Optional[List[Dict[str, Any]]] = None
    active_qubits: int = 0
    circuit_depth: int = 0
    measurement_counts: Optional[Dict[str, int]] = None
    optimization_results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


def extract_circuit_gates(qc: QuantumCircuit) -> List[Dict[str, Any]]:
    """Extract ordered gate operations for the interactive UI canvas."""
    gates = []
    step_track = {i: 0 for i in range(qc.num_qubits)}

    for circuit_instruction in qc.data:
        op = circuit_instruction.operation
        name = op.name.lower()
        if name in ("barrier", "delay"):
            continue

        q_indices = [qc.find_bit(q).index for q in circuit_instruction.qubits]
        if not q_indices:
            continue

        current_step = max(step_track[q] for q in q_indices)

        gates.append({
            "name": name,
            "qubits": q_indices,
            "step": current_step,
            "params": [float(p) if isinstance(p, (int, float)) else str(p) for p in op.params]
        })

        for q in q_indices:
            step_track[q] = current_step + 1

    return gates


# 🛡️ DEFENSE LAYER 1: STRICT AST SECURITY & RESOURCE LIMITS
DISALLOWED_MODULES = {
    'os', 'sys', 'subprocess', 'shutil', 'socket', 'urllib', 'requests',
    'pty', 'ctypes', 'builtin', 'builtins', 'pathlib', 'importlib', 'commands',
    'multiprocessing', 'threading', 'signal', 'tempfile', 'http', 'ftplib',
    'webbrowser', 'posix', 'nt', 'inspect', 'pickle', 'shelve'
}

DISALLOWED_CALLS = {
    'eval', 'exec', 'compile', 'open', '__import__', 'getattr', 'setattr', 'delattr',
    'globals', 'locals', 'vars', 'memoryview'
}

MAX_SIMULATOR_QUBITS = 28
MAX_SIMULATOR_SHOTS = 10000
MAX_CIRCUIT_GATE_OPS = 5000


class SandboxSecurityError(Exception):
    pass


def validate_code_security(code_str: str) -> None:
    """Pre-execution AST static analysis to prevent RCE, network exfiltration, dunder escapes, and simulator bombs."""
    if not code_str:
        return
    try:
        tree = ast.parse(code_str)
    except SyntaxError:
        # Standard execution will catch and format syntax errors
        return

    gate_op_count = 0

    for node in ast.walk(tree):
        # 1. Prohibit dangerous module imports
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split('.')[0]
                if root in DISALLOWED_MODULES:
                    raise SandboxSecurityError(f"Security Violation: Import of '{root}' is prohibited in the quantum execution sandbox.")
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root = node.module.split('.')[0]
                if root in DISALLOWED_MODULES:
                    raise SandboxSecurityError(f"Security Violation: Import from '{root}' is prohibited in the quantum execution sandbox.")

        # 2. Prohibit dangerous function calls
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id in DISALLOWED_CALLS:
                    raise SandboxSecurityError(f"Security Violation: Direct invocation of '{node.func.id}()' is prohibited.")

                # QuantumCircuit(n) qubit safety check
                if node.func.id == "QuantumCircuit" and node.args:
                    first_arg = node.args[0]
                    if isinstance(first_arg, ast.Constant) and isinstance(first_arg.value, int):
                        if first_arg.value > MAX_SIMULATOR_QUBITS:
                            raise SandboxSecurityError(
                                f"Resource Limit Violation: Circuit allocation of {first_arg.value} qubits exceeds safe simulator threshold of {MAX_SIMULATOR_QUBITS} qubits (exponential statevector RAM explosion prevention)."
                            )

            # Check shots argument in sim.run(..., shots=N)
            for kw in node.keywords:
                if kw.arg == "shots" and isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, int):
                    if kw.value.value > MAX_SIMULATOR_SHOTS:
                        raise SandboxSecurityError(
                            f"Resource Limit Violation: Shot count {kw.value.value} exceeds maximum simulation budget of {MAX_SIMULATOR_SHOTS:,} shots."
                        )

            gate_op_count += 1
            if gate_op_count > MAX_CIRCUIT_GATE_OPS:
                raise SandboxSecurityError(
                    f"Resource Limit Violation: Total circuit operations exceed safety ceiling of {MAX_CIRCUIT_GATE_OPS:,} gates."
                )

        # 3. Prohibit dunder attribute access (sandbox escape chains like .__class__.__subclasses__())
        elif isinstance(node, ast.Attribute):
            if node.attr.startswith('__') and node.attr.endswith('__'):
                if node.attr in ('__class__', '__subclasses__', '__globals__', '__builtins__', '__bases__', '__mro__', '__dict__', '__code__'):
                    raise SandboxSecurityError(f"Security Violation: Access to dunder attribute '{node.attr}' is prohibited.")


# 🛡️ DEFENSE LAYER 2: PROCESS-ISOLATED RUNNER WITH 5.0S HARD TIMEOUT
ISOLATED_RUNNER_TEMPLATE = '''import sys, io, json, time, traceback
import numpy as np
import qiskit
from qiskit import QuantumCircuit
from qiskit.visualization import circuit_drawer

try:
    import qiskit_aer
    from qiskit_aer import AerSimulator
    _orig_aer_run = AerSimulator.run
    def _safe_aer_run(self, circuits, **kwargs):
        if isinstance(circuits, QuantumCircuit) and getattr(circuits, "num_clbits", 0) == 0:
            c = circuits.copy()
            c.measure_all()
            return _orig_aer_run(self, c, **kwargs)
        return _orig_aer_run(self, circuits, **kwargs)
    AerSimulator.run = _safe_aer_run
    HAS_AER = True
except ImportError:
    HAS_AER = False

try:
    import dimod
    from dwave.samplers import SimulatedAnnealingSampler
    HAS_DWAVE = True
    
    _CLOUD_NOTICE = "[INFO] Cloud QPU/Hybrid sampler detected without active Leap credentials. Gracefully rerouting to local SimulatedAnnealingSampler for Phase 2 offline simulation."
    _cloud_rerouted = False

    class FallbackDWaveSampler:
        def __init__(self, *args, **kwargs):
            global _cloud_rerouted
            _cloud_rerouted = True
            print(_CLOUD_NOTICE, file=sys.stdout)
            self._sampler = SimulatedAnnealingSampler()
            self.properties = {"chip_id": "SimulatedAnnealingSampler (Phase 2 Local Fallback)"}
            self.parameters = {"num_reads": []}

        def sample(self, bqm, **kwargs):
            return self._sampler.sample(bqm, **kwargs)

        def sample_qubo(self, Q, **kwargs):
            return self._sampler.sample_qubo(Q, **kwargs)

        def sample_ising(self, h, J, **kwargs):
            return self._sampler.sample_ising(h, J, **kwargs)

    class FallbackEmbeddingComposite:
        def __init__(self, child_sampler=None, *args, **kwargs):
            global _cloud_rerouted
            _cloud_rerouted = True
            self.child = child_sampler if child_sampler is not None else FallbackDWaveSampler()

        def sample(self, bqm, **kwargs):
            return self.child.sample(bqm, **kwargs)

        def sample_qubo(self, Q, **kwargs):
            return self.child.sample_qubo(Q, **kwargs)

        def sample_ising(self, h, J, **kwargs):
            return self.child.sample_ising(h, J, **kwargs)

    class FallbackLeapHybridCQMSampler:
        def __init__(self, *args, **kwargs):
            global _cloud_rerouted
            _cloud_rerouted = True
            print(_CLOUD_NOTICE, file=sys.stdout)

        def sample_cqm(self, cqm, **kwargs):
            try:
                from dimod import ExactCQMSolver
                if len(cqm.variables) <= 12:
                    return ExactCQMSolver().sample_cqm(cqm)
            except Exception:
                pass
            bqm, _ = dimod.cqm_to_bqm(cqm, lagrange_multiplier=10.0)
            return SimulatedAnnealingSampler().sample(bqm, **kwargs)

    try:
        import dwave.system
        import dwave.system.samplers
        import dwave.system.composites
        dwave.system.DWaveSampler = FallbackDWaveSampler
        dwave.system.samplers.DWaveSampler = FallbackDWaveSampler
        if hasattr(dwave.system.samplers, "dwave_sampler"):
            dwave.system.samplers.dwave_sampler.DWaveSampler = FallbackDWaveSampler
        dwave.system.EmbeddingComposite = FallbackEmbeddingComposite
        dwave.system.composites.EmbeddingComposite = FallbackEmbeddingComposite
        if hasattr(dwave.system.composites, "embedding"):
            dwave.system.composites.embedding.EmbeddingComposite = FallbackEmbeddingComposite
        dwave.system.LeapHybridCQMSampler = FallbackLeapHybridCQMSampler
        dwave.system.samplers.LeapHybridCQMSampler = FallbackLeapHybridCQMSampler
        if hasattr(dwave.system.samplers, "leap_hybrid_sampler"):
            dwave.system.samplers.leap_hybrid_sampler.LeapHybridCQMSampler = FallbackLeapHybridCQMSampler
            dwave.system.samplers.leap_hybrid_sampler.LeapHybridSampler = FallbackDWaveSampler
    except Exception:
        pass
except ImportError:
    HAS_DWAVE = False
    _cloud_rerouted = False

def extract_circuit_gates_inner(qc):
    gates = []
    step_track = {i: 0 for i in range(qc.num_qubits)}
    for circuit_instruction in qc.data:
        op = circuit_instruction.operation
        name = op.name.lower()
        if name in ("barrier", "delay"):
            continue
        q_indices = [qc.find_bit(q).index for q in circuit_instruction.qubits]
        if not q_indices:
            continue
        current_step = max(step_track[q] for q in q_indices)
        gates.append({
            "name": name,
            "qubits": q_indices,
            "step": current_step,
            "params": [float(p) if isinstance(p, (int, float)) else str(p) for p in op.params]
        })
        for q in q_indices:
            step_track[q] = current_step + 1
    return gates

code = sys.stdin.read()
exec_globals = {
    "__name__": "__main__",
    "np": np, "numpy": np,
    "qiskit": qiskit, "QuantumCircuit": QuantumCircuit,
}
if HAS_AER:
    class SafeAerSimulator(AerSimulator):
        def run(self, circuits, **kwargs):
            if isinstance(circuits, QuantumCircuit):
                if circuits.num_clbits == 0:
                    c = circuits.copy()
                    c.measure_all()
                    return super().run(c, **kwargs)
            return super().run(circuits, **kwargs)
    exec_globals["AerSimulator"] = SafeAerSimulator
if HAS_DWAVE:
    exec_globals["dimod"] = dimod
    exec_globals["SimulatedAnnealingSampler"] = SimulatedAnnealingSampler

old_stdout = sys.stdout
old_stderr = sys.stderr
sys.stdout = user_out = io.StringIO()
sys.stderr = user_err = io.StringIO()

success = True
runtime_error = None
t_sim_0 = time.time()

try:
    exec(code, exec_globals)
except Exception:
    success = False
    runtime_error = traceback.format_exc()
finally:
    sys.stdout = old_stdout
    sys.stderr = old_stderr

sim_exec_ms = round((time.time() - t_sim_0) * 1000, 2)

circuit_ascii = None
circuit_gates = None
counts = None
opt_results = None
active_qubits = 0
circuit_depth = 0
backend_used = "local"

# 1. QuantumCircuit introspection
target_qc = None
for val in exec_globals.values():
    if isinstance(val, QuantumCircuit):
        target_qc = val
        break

if target_qc is not None:
    backend_used = "qiskit_aer"
    active_qubits = target_qc.num_qubits
    circuit_depth = target_qc.depth()
    try:
        circuit_ascii = str(circuit_drawer(target_qc, output="text", fold=-1))
        circuit_gates = extract_circuit_gates_inner(target_qc)
    except Exception as e:
        circuit_ascii = f"# Circuit drawing error: {e}"

    if HAS_AER and target_qc.num_qubits <= 28:
        try:
            meas_qc = target_qc.copy()
            if meas_qc.num_clbits == 0:
                meas_qc.measure_all()
            sim = AerSimulator()
            result = sim.run(meas_qc, shots=__SHOTS_VAL__).result()
            counts = result.get_counts()
        except Exception:
            pass

# 2. D-Wave QUBO / BQM / CQM introspection
if HAS_DWAVE:
    target_sampleset = None
    target_model = None

    # Check for direct sampleset first
    for val in exec_globals.values():
        if isinstance(val, dimod.SampleSet):
            target_sampleset = val
            break

    # Check for models
    for val in exec_globals.values():
        if isinstance(val, (dimod.BinaryQuadraticModel, dimod.ConstrainedQuadraticModel)):
            target_model = val
            break
    
    # Check for raw QUBO dict if no model
    if target_model is None and target_sampleset is None:
        for key, val in exec_globals.items():
            if isinstance(val, dict) and key in ("Q", "qubo", "QUBO", "bqm_dict"):
                if all(isinstance(k, tuple) and len(k) == 2 for k in val.keys()):
                    target_model = val
                    break

    if target_sampleset is not None or target_model is not None:
        backend_used = "dwave_simulated_annealing"
        try:
            if target_sampleset is None:
                sampler = SimulatedAnnealingSampler()
                if isinstance(target_model, dimod.BinaryQuadraticModel):
                    target_sampleset = sampler.sample(target_model, num_reads=min(__SHOTS_VAL__, 500))
                elif isinstance(target_model, dimod.ConstrainedQuadraticModel):
                    try:
                        from dimod import ExactCQMSolver
                        if len(target_model.variables) <= 12:
                            target_sampleset = ExactCQMSolver().sample_cqm(target_model)
                        else:
                            converted_bqm, _ = dimod.cqm_to_bqm(target_model, lagrange_multiplier=10.0)
                            target_sampleset = sampler.sample(converted_bqm, num_reads=min(__SHOTS_VAL__, 500))
                    except Exception:
                        converted_bqm, _ = dimod.cqm_to_bqm(target_model, lagrange_multiplier=10.0)
                        target_sampleset = sampler.sample(converted_bqm, num_reads=min(__SHOTS_VAL__, 500))
                elif isinstance(target_model, dict):
                    target_sampleset = sampler.sample_qubo(target_model, num_reads=min(__SHOTS_VAL__, 500))

            if target_sampleset is not None and len(target_sampleset) > 0:
                best = target_sampleset.first
                
                # Determine variable names
                if target_model is not None and hasattr(target_model, 'variables'):
                    var_names = [str(v) for v in target_model.variables if not str(v).startswith('slack_')]
                elif hasattr(target_sampleset, 'variables'):
                    var_names = [str(v) for v in target_sampleset.variables if not str(v).startswith('slack_')]
                else:
                    var_names = [str(k) for k in best.sample.keys() if not str(k).startswith('slack_')]

                active_qubits = len(var_names)

                # Construct N x N Q-matrix
                n = len(var_names)
                var_to_idx = {v: i for i, v in enumerate(var_names)}
                matrix = [[0.0] * n for _ in range(n)]

                if isinstance(target_model, dimod.BinaryQuadraticModel):
                    for v, bias in target_model.linear.items():
                        s_v = str(v)
                        if s_v in var_to_idx:
                            matrix[var_to_idx[s_v]][var_to_idx[s_v]] = round(float(bias), 4)
                    for (u, v), bias in target_model.quadratic.items():
                        s_u, s_v = str(u), str(v)
                        if s_u in var_to_idx and s_v in var_to_idx:
                            i, j = var_to_idx[s_u], var_to_idx[s_v]
                            matrix[i][j] = round(float(bias), 4)
                            matrix[j][i] = round(float(bias), 4)
                elif isinstance(target_model, dict):
                    for (u, v), bias in target_model.items():
                        s_u, s_v = str(u), str(v)
                        if s_u in var_to_idx and s_v in var_to_idx:
                            i, j = var_to_idx[s_u], var_to_idx[s_v]
                            matrix[i][j] = round(float(bias), 4)
                            if i != j:
                                matrix[j][i] = round(float(bias), 4)

                # Construct energy spectrum distribution (top 12 samples)
                energy_dist = []
                for s in target_sampleset.data(fields=['sample', 'energy', 'num_occurrences'], sorted_by='energy'):
                    clean_sample = {str(k): int(v) for k, v in s.sample.items() if not str(k).startswith('slack_')}
                    bitstring = "".join(str(clean_sample.get(v, 0)) for v in var_names)
                    energy_dist.append({
                        "energy": round(float(s.energy), 4),
                        "sample": clean_sample,
                        "num_occurrences": int(s.num_occurrences),
                        "bitstring": bitstring
                    })
                    if len(energy_dist) >= 12:
                        break

                total_reads = int(sum(target_sampleset.record.num_occurrences)) if hasattr(target_sampleset, 'record') and 'num_occurrences' in target_sampleset.record.dtype.names else len(target_sampleset)

                opt_results = {
                    "energy": round(float(best.energy), 4),
                    "sample": {str(k): int(v) for k, v in best.sample.items() if not str(k).startswith('slack_')},
                    "num_variables": len(var_names),
                    "variables": var_names,
                    "qubo_matrix": matrix,
                    "energy_distribution": energy_dist,
                    "num_reads": total_reads,
                    "cloud_rerouted": _cloud_rerouted
                }
        except Exception as e:
            opt_results = {"error": str(e)}

meta = {
    "success": success,
    "stdout": user_out.getvalue(),
    "stderr": user_err.getvalue() + (runtime_error if runtime_error else ""),
    "sim_exec_ms": sim_exec_ms,
    "backend_used": backend_used,
    "circuit_ascii": circuit_ascii,
    "circuit_gates": circuit_gates,
    "active_qubits": active_qubits,
    "circuit_depth": circuit_depth,
    "measurement_counts": counts,
    "optimization_results": opt_results,
    "error": runtime_error.splitlines()[-1] if runtime_error else None
}

print("__QUANTUM_RESULT_START__")
print(json.dumps(meta))
print("__QUANTUM_RESULT_END__")
'''


def run_code_sandbox(req: CodeExecutionRequest) -> CodeExecutionResponse:
    """Execute code string inside an isolated subprocess with AST pre-checks and a 5.0-second hard timeout."""
    t0 = time.time()
    code = req.code or ""
    backend_used = req.target_backend or "local"
    shots = min(max(1, req.shots or 1024), MAX_SIMULATOR_SHOTS)

    # 🛡️ Layer 1: AST Pre-Execution Security & Limit Validation
    try:
        validate_code_security(code)
    except SandboxSecurityError as sec_err:
        return CodeExecutionResponse(
            success=False,
            stdout="",
            stderr=str(sec_err),
            execution_time_ms=round((time.time() - t0) * 1000, 2),
            backend_used=backend_used,
            error=str(sec_err)
        )

    # 🛡️ Layer 2: Process-Isolated Execution with 5.0s Hard Timeout
    runner_script = ISOLATED_RUNNER_TEMPLATE.replace("__SHOTS_VAL__", str(shots))

    try:
        proc = subprocess.run(
            [sys.executable, "-c", runner_script],
            input=code,
            capture_output=True,
            text=True,
            timeout=5.0
        )
    except subprocess.TimeoutExpired:
        exec_ms = round((time.time() - t0) * 1000, 2)
        timeout_msg = "ExecutionTimeoutError: Execution exceeded the 5.0-second safety threshold and was terminated. Infinite loops or runaway operations are prohibited."
        return CodeExecutionResponse(
            success=False,
            stdout="",
            stderr=timeout_msg,
            execution_time_ms=exec_ms,
            backend_used=backend_used,
            error=timeout_msg
        )
    except Exception as proc_err:
        exec_ms = round((time.time() - t0) * 1000, 2)
        return CodeExecutionResponse(
            success=False,
            stdout="",
            stderr=str(proc_err),
            execution_time_ms=exec_ms,
            backend_used=backend_used,
            error=str(proc_err)
        )

    exec_ms = round((time.time() - t0) * 1000, 2)
    output = proc.stdout or ""

    start_idx = output.find("__QUANTUM_RESULT_START__")
    end_idx = output.find("__QUANTUM_RESULT_END__")

    if start_idx != -1 and end_idx != -1:
        json_content = output[start_idx + len("__QUANTUM_RESULT_START__"):end_idx].strip()
        try:
            data = json.loads(json_content)
            return CodeExecutionResponse(
                success=data.get("success", True),
                stdout=data.get("stdout", ""),
                stderr=data.get("stderr", "") or proc.stderr or "",
                execution_time_ms=data.get("sim_exec_ms", exec_ms),
                backend_used=data.get("backend_used", backend_used),
                circuit_ascii=data.get("circuit_ascii"),
                circuit_gates=data.get("circuit_gates"),
                active_qubits=data.get("active_qubits", 0),
                circuit_depth=data.get("circuit_depth", 0),
                measurement_counts=data.get("measurement_counts"),
                optimization_results=data.get("optimization_results"),
                error=data.get("error")
            )
        except Exception:
            pass

    # Fallback if sentinel missing
    return CodeExecutionResponse(
        success=(proc.returncode == 0),
        stdout=proc.stdout,
        stderr=proc.stderr,
        execution_time_ms=exec_ms,
        backend_used=backend_used,
        error=proc.stderr if proc.returncode != 0 else None
    )
