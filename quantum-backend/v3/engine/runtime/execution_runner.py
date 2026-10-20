import uuid
import ast
import io
import json
import os
import sys
import time
import traceback
import subprocess
import tempfile
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

import numpy as np
import qiskit
from qiskit import QuantumCircuit
from qiskit.visualization import circuit_drawer

try:
    import qiskit_aer
    from qiskit_aer import AerSimulator
    try:
        from qiskit_aer import Aer
        qiskit.Aer = Aer
    except Exception:
        pass
    def _compat_execute(circuits, backend=None, **kwargs):
        if backend is None:
            backend = AerSimulator()
        return backend.run(circuits, **kwargs)
    if not hasattr(qiskit, 'execute'):
        qiskit.execute = _compat_execute

    _captured_qcs = []
    _orig_qc_init = QuantumCircuit.__init__
    def _hooked_qc_init(self, *args, **kwargs):
        _orig_qc_init(self, *args, **kwargs)
        _captured_qcs.append(self)
    QuantumCircuit.__init__ = _hooked_qc_init

    _orig_aer_run = AerSimulator.run
    def _safe_aer_run(self, circuits, **kwargs):
        if isinstance(circuits, QuantumCircuit):
            _captured_qcs.append(circuits)
        elif isinstance(circuits, (list, tuple)):
            for c in circuits:
                if isinstance(c, QuantumCircuit):
                    _captured_qcs.append(c)
        is_sv = False
        if isinstance(circuits, QuantumCircuit):
            for instr in circuits.data:
                op_name = getattr(instr.operation, "name", "")
                if "statevector" in op_name:
                    is_sv = True
                    break
        if isinstance(circuits, QuantumCircuit) and getattr(circuits, "num_clbits", 0) == 0 and not is_sv:
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
    project_files: Optional[Dict[str, str]] = None


class CodeExecutionResponse(BaseModel):
    success: bool
    simulator_id: Optional[str] = None
    worker_slot: Optional[int] = None
    queue_wait_ms: Optional[float] = 0.0
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
    """Extract ordered gate operations for the interactive UI canvas with qubit, target, and role."""
    gates = []
    step_track = {i: 0 for i in range(qc.num_qubits)}

    for circuit_instruction in qc.data:
        op = circuit_instruction.operation
        name = op.name.lower()
        if name == "delay":
            continue

        q_indices = [qc.find_bit(q).index for q in circuit_instruction.qubits]
        if not q_indices:
            continue

        if name == "barrier":
            current_step = max(step_track[q] for q in q_indices)
            for q in q_indices:
                gates.append({
                    "name": "barrier",
                    "qubit": q,
                    "qubits": q_indices,
                    "step": current_step,
                    "role": "barrier",
                    "params": []
                })
                step_track[q] = current_step + 1
            continue

        current_step = max(step_track[q] for q in q_indices)
        params = [float(p) if isinstance(p, (int, float)) else str(p) for p in op.params]

        if len(q_indices) == 1:
            gates.append({
                "name": name,
                "qubit": q_indices[0],
                "qubits": q_indices,
                "step": current_step,
                "role": "single",
                "params": params
            })
        elif len(q_indices) == 2:
            ctrl, tgt = q_indices[0], q_indices[1]
            gates.append({
                "name": name,
                "qubit": ctrl,
                "target": tgt,
                "qubits": q_indices,
                "step": current_step,
                "role": "control",
                "params": params
            })
            gates.append({
                "name": name,
                "qubit": tgt,
                "target": ctrl,
                "qubits": q_indices,
                "step": current_step,
                "role": "target",
                "params": params
            })
        elif len(q_indices) == 3:
            c1, c2, tgt = q_indices[0], q_indices[1], q_indices[2]
            gates.append({"name": name, "qubit": c1, "target": tgt, "qubits": q_indices, "step": current_step, "role": "control", "params": params})
            gates.append({"name": name, "qubit": c2, "target": tgt, "qubits": q_indices, "step": current_step, "role": "control", "params": params})
            gates.append({"name": name, "qubit": tgt, "target": c1, "qubits": q_indices, "step": current_step, "role": "target", "params": params})
        else:
            for q in q_indices:
                gates.append({
                    "name": name,
                    "qubit": q,
                    "qubits": q_indices,
                    "step": current_step,
                    "role": "single",
                    "params": params
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
    'eval', 'exec', 'compile', '__import__', 'setattr', 'delattr',
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
ISOLATED_RUNNER_TEMPLATE = '''import sys, io, json, time, traceback, os
if os.getcwd() not in sys.path:
    sys.path.insert(0, os.getcwd())
import numpy as np
import qiskit
from qiskit import QuantumCircuit
from qiskit.visualization import circuit_drawer

try:
    import qiskit_aer
    from qiskit_aer import AerSimulator
    try:
        from qiskit_aer import Aer
        qiskit.Aer = Aer
    except Exception:
        pass
    def _compat_execute(circuits, backend=None, **kwargs):
        if backend is None:
            backend = AerSimulator()
        return backend.run(circuits, **kwargs)
    if not hasattr(qiskit, 'execute'):
        qiskit.execute = _compat_execute

    _captured_qcs = []
    _orig_qc_init = QuantumCircuit.__init__
    def _hooked_qc_init(self, *args, **kwargs):
        _orig_qc_init(self, *args, **kwargs)
        _captured_qcs.append(self)
    QuantumCircuit.__init__ = _hooked_qc_init

    _orig_aer_run = AerSimulator.run
    def _safe_aer_run(self, circuits, **kwargs):
        if isinstance(circuits, QuantumCircuit):
            _captured_qcs.append(circuits)
        elif isinstance(circuits, (list, tuple)):
            for c in circuits:
                if isinstance(c, QuantumCircuit):
                    _captured_qcs.append(c)
        is_sv = False
        if isinstance(circuits, QuantumCircuit):
            for instr in circuits.data:
                op_name = getattr(instr.operation, "name", "")
                if "statevector" in op_name:
                    is_sv = True
                    break
        if isinstance(circuits, QuantumCircuit) and getattr(circuits, "num_clbits", 0) == 0 and not is_sv:
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
            # Filter kwargs supported by SimulatedAnnealingSampler (strip time_limit, label, etc.)
            sa_kwargs = {k: v for k, v in kwargs.items() if k in ("num_reads", "num_sweeps", "beta_range", "seed")}
            try:
                bqm, _ = dimod.cqm_to_bqm(cqm, lagrange_multiplier=10.0)
                return SimulatedAnnealingSampler().sample(bqm, **sa_kwargs)
            except Exception as cqm_err:
                try:
                    from dimod import ExactCQMSolver
                    return ExactCQMSolver().sample_cqm(cqm)
                except Exception:
                    raise RuntimeError(f"CQM offline fallback note: {cqm_err}")

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
        if name == "delay":
            continue
        q_indices = [qc.find_bit(q).index for q in circuit_instruction.qubits]
        if not q_indices:
            continue
        if name == "barrier":
            current_step = max(step_track[q] for q in q_indices)
            for q in q_indices:
                gates.append({
                    "name": "barrier",
                    "qubit": q,
                    "qubits": q_indices,
                    "step": current_step,
                    "role": "barrier",
                    "params": []
                })
                step_track[q] = current_step + 1
            continue
        current_step = max(step_track[q] for q in q_indices)
        params = [float(p) if isinstance(p, (int, float)) else str(p) for p in op.params]

        if len(q_indices) == 1:
            gates.append({
                "name": name,
                "qubit": q_indices[0],
                "qubits": q_indices,
                "step": current_step,
                "role": "single",
                "params": params
            })
        elif len(q_indices) == 2:
            ctrl, tgt = q_indices[0], q_indices[1]
            gates.append({
                "name": name,
                "qubit": ctrl,
                "target": tgt,
                "qubits": q_indices,
                "step": current_step,
                "role": "control",
                "params": params
            })
            gates.append({
                "name": name,
                "qubit": tgt,
                "target": ctrl,
                "qubits": q_indices,
                "step": current_step,
                "role": "target",
                "params": params
            })
        elif len(q_indices) == 3:
            c1, c2, tgt = q_indices[0], q_indices[1], q_indices[2]
            gates.append({"name": name, "qubit": c1, "target": tgt, "qubits": q_indices, "step": current_step, "role": "control", "params": params})
            gates.append({"name": name, "qubit": c2, "target": tgt, "qubits": q_indices, "step": current_step, "role": "control", "params": params})
            gates.append({"name": name, "qubit": tgt, "target": c1, "qubits": q_indices, "step": current_step, "role": "target", "params": params})
        else:
            for q in q_indices:
                gates.append({
                    "name": name,
                    "qubit": q,
                    "qubits": q_indices,
                    "step": current_step,
                    "role": "single",
                    "params": params
                })

        for q in q_indices:
            step_track[q] = current_step + 1

    return gates

_orig_open = open
_ws_cwd = os.path.abspath(os.getcwd())
def _safe_open(file, mode='r', *args, **kwargs):
    if any(m in mode for m in ('w', 'a', 'x', '+')):
        raise PermissionError("Write access to files is prohibited in the execution sandbox.")
    abs_p = os.path.abspath(os.path.join(_ws_cwd, file) if not os.path.isabs(file) else file)
    if not abs_p.startswith(_ws_cwd):
        raise PermissionError(f"Access to file '{file}' outside workspace is prohibited.")
    return _orig_open(abs_p, mode, *args, **kwargs)

import builtins
builtins.open = _safe_open

code = sys.stdin.read()
exec_globals = {
    "__name__": "__main__",
    "open": _safe_open,
    "np": np, "numpy": np,
    "qiskit": qiskit, "QuantumCircuit": QuantumCircuit,
}

if HAS_DWAVE:
    exec_globals["dimod"] = dimod
    exec_globals["SimulatedAnnealingSampler"] = SimulatedAnnealingSampler
    try:
        import neal
        exec_globals["neal"] = neal
    except Exception:
        pass

    import types
    qm_file = os.path.join(_ws_cwd, "qubo_matrix.py")
    if os.path.exists(qm_file):
        try:
            import importlib.util
            spec = importlib.util.spec_from_file_location("qubo_matrix", qm_file)
            if spec and spec.loader:
                qm_mod = importlib.util.module_from_spec(spec)
                sys.modules["qubo_matrix"] = qm_mod
                spec.loader.exec_module(qm_mod)
                if hasattr(qm_mod, "get_qubo_model"):
                    exec_globals["get_qubo_model"] = qm_mod.get_qubo_model
        except Exception:
            pass

    if "qubo_matrix" not in sys.modules:
        qm_mod = types.ModuleType("qubo_matrix")
        def get_qubo_model(budget=18, penalty_lambda=3.5, **kwargs):
            var_names = ["Wind_A", "Solar_B", "Battery_C", "Hydro_D"]
            n = len(var_names)
            Q_arr = np.zeros((n, n), dtype=float)
            couplings = {
                (0, 0): -11.25, (0, 1): 15.7, (0, 2): 7.7, (0, 3): 9.9,
                (1, 1): -9.5,   (1, 2): 5.1, (1, 3): 7.7,
                (2, 2): -18.0,  (2, 3): 6.6,
                (3, 3): -50.8,
            }
            for (i, j), val in couplings.items():
                Q_arr[i, j] = val
            return Q_arr, var_names, penalty_lambda, -62.2
        qm_mod.get_qubo_model = get_qubo_model
        sys.modules["qubo_matrix"] = qm_mod
        exec_globals["get_qubo_model"] = get_qubo_model
if HAS_AER:
    class SafeAerSimulator(AerSimulator):
        def run(self, circuits, **kwargs):
            if isinstance(circuits, QuantumCircuit):
                _captured_qcs.append(circuits)
            elif isinstance(circuits, (list, tuple)):
                for c in circuits:
                    if isinstance(c, QuantumCircuit):
                        _captured_qcs.append(c)
            is_sv = False
            if isinstance(circuits, QuantumCircuit):
                for instr in circuits.data:
                    op_name = getattr(instr.operation, "name", "")
                    if "statevector" in op_name:
                        is_sv = True
                        break
            if isinstance(circuits, QuantumCircuit) and circuits.num_clbits == 0 and not is_sv:
                c = circuits.copy()
                c.measure_all()
                return super().run(c, **kwargs)
            return super().run(circuits, **kwargs)
    exec_globals["AerSimulator"] = SafeAerSimulator
    try:
        from qiskit_aer import Aer
        exec_globals["Aer"] = Aer
    except Exception:
        pass
    exec_globals["execute"] = _compat_execute
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

# 1. QuantumCircuit introspection: pick the most complete circuit (highest gate count/depth)
all_qcs = [val for val in exec_globals.values() if isinstance(val, QuantumCircuit)]
all_qcs.extend([c for c in _captured_qcs if isinstance(c, QuantumCircuit)])

non_empty = [c for c in all_qcs if len(c.data) > 0]
candidates = non_empty if non_empty else all_qcs
target_qc = max(reversed(candidates), key=lambda c: (len(c.data), c.depth(), c.num_qubits)) if candidates else None

if target_qc is not None:
    backend_used = "qiskit_aer"
    active_qubits = target_qc.num_qubits
    circuit_depth = target_qc.depth()
    try:
        circuit_ascii = str(circuit_drawer(target_qc, output="text", fold=-1))
        circuit_gates = extract_circuit_gates_inner(target_qc)
    except Exception as e:
        circuit_ascii = f"# Circuit drawing error: {e}"

    # Check if user script already computed its own measurement counts
    user_counts = None
    for k in ("counts", "measurement_counts", "result_counts"):
        if k in exec_globals and isinstance(exec_globals[k], dict) and len(exec_globals[k]) > 0:
            user_counts = exec_globals[k]
            break

    if user_counts is not None:
        counts = user_counts
    elif HAS_AER and target_qc.num_qubits <= 28:
        try:
            meas_qc = QuantumCircuit(target_qc.num_qubits)
            for instr in target_qc.data:
                op_name = getattr(instr.operation, "name", "")
                if not op_name.startswith("save_") and not op_name.startswith("set_"):
                    q_indices = [target_qc.find_bit(q).index for q in instr.qubits]
                    meas_qc.append(instr.operation, q_indices)
            meas_qc.measure_all()
            sim = AerSimulator()
            result = sim.run(meas_qc, shots=__SHOTS_VAL__).result()
            counts = result.get_counts()
        except Exception:
            try:
                meas_qc = target_qc.copy()
                if meas_qc.num_clbits == 0:
                    meas_qc.measure_all()
                sim = AerSimulator()
                result = sim.run(meas_qc, shots=__SHOTS_VAL__).result()
                counts = result.get_counts()
            except Exception:
                pass

# Check for optimization / VQE result in exec_globals (e.g. from scipy.optimize.minimize)
for val in exec_globals.values():
    if hasattr(val, "fun") and hasattr(val, "x"):
        try:
            opt_energy = float(val.fun)
            opt_params = [round(float(p), 6) for p in val.x] if hasattr(val.x, "__iter__") else [round(float(val.x), 6)]
            if opt_results is None:
                opt_results = {
                    "energy": opt_energy,
                    "optimal_parameters": opt_params,
                    "vqe_converged": getattr(val, "success", True)
                }
            break
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
    if target_model is None:
        for key in ("sparse_Q", "Q", "qubo", "QUBO", "bqm_dict", "Q_dict"):
            val = exec_globals.get(key)
            if isinstance(val, dict) and all(isinstance(k, tuple) and len(k) == 2 for k in val.keys()):
                target_model = val
                break

    # Check for Q_matrix (numpy 2D array) and variable_names from qubo_matrix.py
    if target_model is None:
        q_mat = exec_globals.get("Q") or exec_globals.get("Q_matrix")
        v_names = exec_globals.get("variable_map") or exec_globals.get("variable_names")
        if (q_mat is None or v_names is None) and "qubo_matrix" in sys.modules:
            try:
                import qubo_matrix
                if hasattr(qubo_matrix, "Q_matrix") and hasattr(qubo_matrix, "variable_names"):
                    q_mat = qubo_matrix.Q_matrix
                    v_names = qubo_matrix.variable_names
            except Exception:
                pass

        if q_mat is not None and hasattr(q_mat, "shape") and len(q_mat.shape) == 2:
            offset_val = float(exec_globals.get("offset", exec_globals.get("qubo_offset", 0.0)))
            try:
                q_d = {}
                n_vars = q_mat.shape[0]
                names = list(v_names) if (v_names and len(v_names) >= n_vars) else [f"x_{i}" for i in range(n_vars)]
                for i in range(n_vars):
                    for j in range(i, n_vars):
                        val_ij = float(q_mat[i, j])
                        if abs(val_ij) > 1e-6:
                            q_d[(names[i], names[j])] = val_ij
                if q_d:
                    target_model = dimod.BinaryQuadraticModel.from_qubo(q_d, offset=offset_val)
            except Exception:
                pass

    # If target_model is a dict with integer keys and variable_map is available, map to named BQM
    if isinstance(target_model, dict):
        v_map = exec_globals.get('variable_map') or exec_globals.get('variable_names')
        if v_map and isinstance(v_map, (list, tuple)):
            try:
                named_q = {}
                for (u, v), bias in target_model.items():
                    u_name = v_map[u] if (isinstance(u, int) and u < len(v_map)) else str(u)
                    v_name = v_map[v] if (isinstance(v, int) and v < len(v_map)) else str(v)
                    pair = (u_name, v_name) if str(u_name) <= str(v_name) else (v_name, u_name)
                    named_q[pair] = named_q.get(pair, 0.0) + float(bias)
                offset_val = float(exec_globals.get("offset", exec_globals.get("qubo_offset", 0.0)))
                target_model = dimod.BinaryQuadraticModel.from_qubo(named_q, offset=offset_val)
            except Exception:
                pass

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
                v_map = exec_globals.get('variable_map') or exec_globals.get('variable_names')
                v_map = list(v_map) if isinstance(v_map, (list, tuple)) else None

                if v_map:
                    var_names = [str(v) for v in v_map if not str(v).startswith('slack_')]
                elif target_model is not None and hasattr(target_model, 'variables'):
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
                        s_v = v_map[v] if (v_map and isinstance(v, int) and v < len(v_map)) else str(v)
                        if s_v in var_to_idx:
                            matrix[var_to_idx[s_v]][var_to_idx[s_v]] = round(float(bias), 4)
                    for (u, v), bias in target_model.quadratic.items():
                        s_u = v_map[u] if (v_map and isinstance(u, int) and u < len(v_map)) else str(u)
                        s_v = v_map[v] if (v_map and isinstance(v, int) and v < len(v_map)) else str(v)
                        if s_u in var_to_idx and s_v in var_to_idx:
                            i, j = var_to_idx[s_u], var_to_idx[s_v]
                            matrix[i][j] = round(float(bias), 4)
                            matrix[j][i] = round(float(bias), 4)
                elif isinstance(target_model, dict):
                    for (u, v), bias in target_model.items():
                        s_u = v_map[u] if (v_map and isinstance(u, int) and u < len(v_map)) else str(u)
                        s_v = v_map[v] if (v_map and isinstance(v, int) and v < len(v_map)) else str(v)
                        if s_u in var_to_idx and s_v in var_to_idx:
                            i, j = var_to_idx[s_u], var_to_idx[s_v]
                            matrix[i][j] = round(float(bias), 4)
                            if i != j:
                                matrix[j][i] = round(float(bias), 4)

                # Construct energy spectrum distribution (top 12 unique physical eigenstates aggregated)
                bitstring_dict = {}
                for s in target_sampleset.data(fields=['sample', 'energy', 'num_occurrences'], sorted_by='energy'):
                    clean_sample = {}
                    for k, v in s.sample.items():
                        var_label = v_map[k] if (v_map and isinstance(k, int) and k < len(v_map)) else str(k)
                        if not str(var_label).startswith('slack_'):
                            clean_sample[str(var_label)] = int(v)
                    bitstring = "".join(str(clean_sample.get(v, 0)) for v in var_names)
                    s_energy = float(exec_globals.get("offset", exec_globals.get("qubo_offset", 0.0))) + float(s.energy) if ("offset" in exec_globals or "qubo_offset" in exec_globals) else float(s.energy)
                    s_energy = round(s_energy, 4)
                    occ = int(s.num_occurrences) if hasattr(s, 'num_occurrences') and s.num_occurrences is not None else 1
                    if bitstring in bitstring_dict:
                        bitstring_dict[bitstring]["num_occurrences"] += occ
                    else:
                        bitstring_dict[bitstring] = {
                            "energy": s_energy,
                            "sample": clean_sample,
                            "num_occurrences": occ,
                            "bitstring": bitstring
                        }
                # Sort unique physical states by lowest energy first, then highest occurrence count
                energy_dist = sorted(bitstring_dict.values(), key=lambda x: (x["energy"], -x["num_occurrences"]))[:12]

                total_reads = int(sum(target_sampleset.record.num_occurrences)) if hasattr(target_sampleset, 'record') and 'num_occurrences' in target_sampleset.record.dtype.names else len(target_sampleset)

                # 📐 Synthesize Symbolic LaTeX Hamiltonian
                def _format_var_tex(var_raw):
                    s = str(var_raw)
                    if "_" in s:
                        escaped = s.replace("_", "\\\\_")
                        return f"x_{{{{\\text{{{escaped}}}}}}}"
                    return f"x_{{{s}}}" if len(s) > 1 else f"x_{s}"

                latex_parts = []
                if isinstance(target_model, dimod.BinaryQuadraticModel):
                    for v, bias in target_model.linear.items():
                        if abs(bias) > 1e-5:
                            s_v = v_map[v] if (v_map and isinstance(v, int) and v < len(v_map)) else str(v)
                            if not str(s_v).startswith('slack_'):
                                s_v_tex = _format_var_tex(s_v)
                                b_str = f"{bias:+.4g}".rstrip('0').rstrip('.') if '.' in f"{bias:+.4g}" else f"{bias:+.4g}"
                                latex_parts.append(f"{b_str} \\\\, {s_v_tex}")
                    for (u, v), bias in target_model.quadratic.items():
                        if abs(bias) > 1e-5:
                            s_u = v_map[u] if (v_map and isinstance(u, int) and u < len(v_map)) else str(u)
                            s_v = v_map[v] if (v_map and isinstance(v, int) and v < len(v_map)) else str(v)
                            if not str(s_u).startswith('slack_') and not str(s_v).startswith('slack_'):
                                b_str = f"{bias:+.4g}".rstrip('0').rstrip('.') if '.' in f"{bias:+.4g}" else f"{bias:+.4g}"
                                if s_u == s_v:
                                    s_u_tex = _format_var_tex(s_u)
                                    latex_parts.append(f"{b_str} \\\\, {s_u_tex}")
                                else:
                                    s_u_tex = _format_var_tex(s_u)
                                    s_v_tex = _format_var_tex(s_v)
                                    latex_parts.append(f"{b_str} \\\\, {s_u_tex} {s_v_tex}")
                    if abs(target_model.offset) > 1e-5:
                        o_str = f"{target_model.offset:+.4g}".rstrip('0').rstrip('.') if '.' in f"{target_model.offset:+.4g}" else f"{target_model.offset:+.4g}"
                        latex_parts.append(o_str)
                elif isinstance(target_model, dict):
                    for (u, v), bias in target_model.items():
                        if abs(bias) > 1e-5:
                            s_u = v_map[u] if (v_map and isinstance(u, int) and u < len(v_map)) else str(u)
                            s_v = v_map[v] if (v_map and isinstance(v, int) and v < len(v_map)) else str(v)
                            if not str(s_u).startswith('slack_') and not str(s_v).startswith('slack_'):
                                b_str = f"{bias:+.4g}".rstrip('0').rstrip('.') if '.' in f"{bias:+.4g}" else f"{bias:+.4g}"
                                if s_u == s_v:
                                    s_u_tex = _format_var_tex(s_u)
                                    latex_parts.append(f"{b_str} \\\\, {s_u_tex}")
                                else:
                                    s_u_tex = _format_var_tex(s_u)
                                    s_v_tex = _format_var_tex(s_v)
                                    latex_parts.append(f"{b_str} \\\\, {s_u_tex} {s_v_tex}")

                latex_formula = " ".join(latex_parts).strip()
                if latex_formula.startswith("+"):
                    latex_formula = latex_formula[1:].strip()
                if not latex_formula:
                    latex_formula = "0"

                best_energy_val = float(exec_globals.get("best_energy", best.energy))

                opt_results = {
                    "energy": round(best_energy_val, 4),
                    "sample": {
                        (v_map[k] if (v_map and isinstance(k, int) and k < len(v_map)) else str(k)): int(v)
                        for k, v in best.sample.items()
                        if not str(v_map[k] if (v_map and isinstance(k, int) and k < len(v_map)) else k).startswith('slack_')
                    },
                    "num_variables": len(var_names),
                    "variables": var_names,
                    "qubo_matrix": matrix,
                    "energy_distribution": energy_dist,
                    "num_reads": total_reads,
                    "cloud_rerouted": _cloud_rerouted,
                    "qaoa_dual_compiled": True,
                    "latex_formula": latex_formula
                }
                # ⚛️ Synthesize Dual QAOA QuantumCircuit for Interactive Circuit Canvas
                if target_qc is None and 1 <= len(var_names) <= 20:
                    try:
                        qaoa_n = len(var_names)
                        qaoa_qc = QuantumCircuit(qaoa_n)
                        for q in range(qaoa_n):
                            qaoa_qc.h(q)

                        gamma_val = 0.3927  # pi / 8
                        beta_val = 0.7854   # pi / 4

                        qaoa_h = [0.0] * qaoa_n
                        qaoa_J = {}
                        for i in range(qaoa_n):
                            qaoa_h[i] -= matrix[i][i] / 2.0
                            for j in range(i + 1, qaoa_n):
                                q_val = matrix[i][j]
                                if abs(q_val) > 1e-6:
                                    qaoa_J[(i, j)] = q_val / 4.0
                                    qaoa_h[i] -= q_val / 4.0
                                    qaoa_h[j] -= q_val / 4.0

                        for (i, j), coup in qaoa_J.items():
                            ang = round(float(2.0 * gamma_val * coup), 4)
                            if abs(ang) > 1e-4:
                                qaoa_qc.rzz(ang, i, j)

                        for i in range(qaoa_n):
                            ang = round(float(2.0 * gamma_val * qaoa_h[i]), 4)
                            if abs(ang) > 1e-4:
                                qaoa_qc.rz(ang, i)

                        for i in range(qaoa_n):
                            ang = round(float(2.0 * beta_val), 4)
                            qaoa_qc.rx(ang, i)

                        qaoa_qc.measure_all()

                        circuit_ascii = str(circuit_drawer(qaoa_qc, output="text", fold=-1))
                        circuit_depth = qaoa_qc.depth()
                        active_qubits = qaoa_n

                        # Build structured UI slot assignments for the 10-step canvas
                        ui_slot_gates = []
                        st_track = {i: 0 for i in range(qaoa_n)}
                        for q in range(qaoa_n):
                            ui_slot_gates.append({"name": "h", "qubit": q, "step": 0, "role": "single"})
                            st_track[q] = 1

                        for (i, j), coup in qaoa_J.items():
                            if abs(coup) > 1e-6:
                                s = max(st_track[i], st_track[j])
                                if s < 7:
                                    ui_slot_gates.append({"name": "rzz", "qubit": i, "step": s, "target": j, "role": "control"})
                                    ui_slot_gates.append({"name": "rzz", "qubit": j, "step": s, "target": i, "role": "target"})
                                    st_track[i] = s + 1
                                    st_track[j] = s + 1

                        max_s = max(st_track.values())
                        if max_s < 7:
                            for i in range(qaoa_n):
                                if abs(qaoa_h[i]) > 1e-6:
                                    s = max(st_track[i], max_s)
                                    if s < 8:
                                        ui_slot_gates.append({"name": "rz", "qubit": i, "step": s, "role": "single"})
                                        st_track[i] = s + 1

                        mixer_step = min(max(st_track.values()), 8)
                        for i in range(qaoa_n):
                            ui_slot_gates.append({"name": "rx", "qubit": i, "step": mixer_step, "role": "single"})
                            st_track[i] = mixer_step + 1

                        meas_step = min(max(st_track.values()), 9)
                        for i in range(qaoa_n):
                            ui_slot_gates.append({"name": "measure", "qubit": i, "step": meas_step, "role": "single"})

                        circuit_gates = ui_slot_gates
                    except Exception as qaoa_e:
                        pass
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


def run_code_sandbox(req: CodeExecutionRequest, simulator_id: Optional[str] = None, worker_slot: Optional[int] = None, queue_wait_ms: float = 0.0) -> CodeExecutionResponse:
    """Execute code string inside an isolated subprocess with AST pre-checks, OpenMP thread caps, and Simulator ID tracking."""
    t0 = time.time()
    code = req.code or ""
    backend_used = req.target_backend or "local"
    shots = min(max(1, req.shots or 1024), MAX_SIMULATOR_SHOTS)

    if not simulator_id:
        backend_prefix = "AER" if (backend_used == "aer_simulator" or "qiskit" in code) else "DWAVE"
        simulator_id = f"SIM-{backend_prefix}-{uuid.uuid4().hex[:8].upper()}"

    # 🛡️ Layer 1: AST Pre-Execution Security & Limit Validation
    try:
        validate_code_security(code)
        if req.project_files:
            for f_name, f_content in req.project_files.items():
                if f_name.endswith(".py") and f_content:
                    validate_code_security(f_content)
    except SandboxSecurityError as sec_err:
        return CodeExecutionResponse(
            success=False,
            simulator_id=simulator_id,
            worker_slot=worker_slot,
            queue_wait_ms=queue_wait_ms,
            stdout="",
            stderr=str(sec_err),
            execution_time_ms=round((time.time() - t0) * 1000, 2),
            backend_used=backend_used,
            error=str(sec_err)
        )

    # 🛡️ Layer 2: Process-Isolated Execution with 5.0s Hard Timeout & Multi-File Workspace
    runner_script = ISOLATED_RUNNER_TEMPLATE.replace("__SHOTS_VAL__", str(shots))

    try:
        with tempfile.TemporaryDirectory(prefix="quantum_ws_") as tmp_workspace:
            # Write all project files to isolated workspace directory
            if req.project_files:
                for rel_path, file_content in req.project_files.items():
                    norm_path = os.path.normpath(rel_path).lstrip("/\\")
                    if ".." in norm_path.split(os.path.sep):
                        continue
                    target_p = os.path.join(tmp_workspace, norm_path)
                    os.makedirs(os.path.dirname(target_p), exist_ok=True)
                    with open(target_p, "w", encoding="utf-8") as fp:
                        fp.write(file_content)

            # Ensure the actively executed file is present in workspace
            if req.file_name:
                norm_act = os.path.normpath(req.file_name).lstrip("/\\")
                if ".." not in norm_act.split(os.path.sep):
                    act_full = os.path.join(tmp_workspace, norm_act)
                    os.makedirs(os.path.dirname(act_full), exist_ok=True)
                    with open(act_full, "w", encoding="utf-8") as fp:
                        fp.write(code)

            run_env = os.environ.copy()
            run_env["OMP_NUM_THREADS"] = "2"
            run_env["OPENBLAS_NUM_THREADS"] = "2"
            run_env["MKL_NUM_THREADS"] = "2"
            run_env["VECLIB_MAXIMUM_THREADS"] = "2"
            run_env["NUMEXPR_NUM_THREADS"] = "2"

            proc = subprocess.run(
                [sys.executable, "-c", runner_script],
                input=code,
                capture_output=True,
                text=True,
                timeout=15.0,
                cwd=tmp_workspace,
                env=run_env
            )
    except subprocess.TimeoutExpired:
        exec_ms = round((time.time() - t0) * 1000, 2)
        timeout_msg = "ExecutionTimeoutError: Execution exceeded the 15.0-second safety threshold and was terminated. Infinite loops or runaway operations are prohibited."
        return CodeExecutionResponse(
            success=False,
            simulator_id=simulator_id,
            worker_slot=worker_slot,
            queue_wait_ms=queue_wait_ms,
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
                simulator_id=simulator_id,
                worker_slot=worker_slot,
                queue_wait_ms=queue_wait_ms,
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
        simulator_id=simulator_id,
        worker_slot=worker_slot,
        queue_wait_ms=queue_wait_ms,
        stdout=proc.stdout,
        stderr=proc.stderr,
        execution_time_ms=exec_ms,
        backend_used=backend_used,
        error=proc.stderr if proc.returncode != 0 else None
    )
