"""
Quantum Guru V4 - Sandbox Execution Runner
Direct, high-performance executor for Qiskit Aer Circuits & D-Wave Annealing Models.
"""
import sys
import io
import time
import traceback
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

import numpy as np

# Qiskit imports
import qiskit
from qiskit import QuantumCircuit
from qiskit.visualization import circuit_drawer

# Qiskit Aer
try:
    from qiskit_aer import AerSimulator
    HAS_AER = True
except ImportError:
    HAS_AER = False

# D-Wave / Dimod imports
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


def run_code_sandbox(req: CodeExecutionRequest) -> CodeExecutionResponse:
    """Execute code string and introspect quantum objects and simulator output."""
    t0 = time.time()
    code = req.code or ""
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()

    exec_globals: Dict[str, Any] = {
        "__name__": "__main__",
        "np": np,
        "numpy": np,
        "qiskit": qiskit,
        "QuantumCircuit": QuantumCircuit,
    }
    if HAS_AER:
        exec_globals["AerSimulator"] = AerSimulator
    if HAS_DWAVE:
        exec_globals["dimod"] = dimod
        exec_globals["SimulatedAnnealingSampler"] = SimulatedAnnealingSampler

    circuit_ascii = None
    circuit_gates = None
    counts = None
    opt_results = None
    backend_used = req.target_backend or "local"
    active_qubits = 0
    circuit_depth = 0

    old_stdout = sys.stdout
    old_stderr = sys.stderr

    try:
        sys.stdout = stdout_capture
        sys.stderr = stderr_capture

        exec(code, exec_globals)

    except Exception:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        err_msg = traceback.format_exc()
        exec_ms = round((time.time() - t0) * 1000, 2)
        return CodeExecutionResponse(
            success=False,
            stdout=stdout_capture.getvalue(),
            stderr=err_msg,
            execution_time_ms=exec_ms,
            backend_used=backend_used,
            error=str(sys.exc_info()[1])
        )
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr

    # 1. Look for QuantumCircuit instance in executed namespace
    target_qc: Optional[QuantumCircuit] = None
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
            circuit_gates = extract_circuit_gates(target_qc)
        except Exception as e:
            circuit_ascii = f"# Circuit drawing error: {e}"

        # Run on AerSimulator to get measurement sample distribution
        if HAS_AER and target_qc.num_qubits <= 28:
            try:
                meas_qc = target_qc.copy()
                if meas_qc.num_clbits == 0:
                    meas_qc.measure_all()
                sim = AerSimulator()
                result = sim.run(meas_qc, shots=req.shots or 1024).result()
                counts = result.get_counts()
            except Exception:
                pass

    # 2. Look for D-Wave BinaryQuadraticModel or Sampler instance
    if HAS_DWAVE:
        target_bqm = None
        for val in exec_globals.values():
            if isinstance(val, dimod.BinaryQuadraticModel):
                target_bqm = val
                break

        if target_bqm is not None:
            backend_used = "dwave_simulated_annealing"
            active_qubits = len(target_bqm.variables)
            try:
                sampler = SimulatedAnnealingSampler()
                sampleset = sampler.sample(target_bqm, num_reads=min(req.shots or 100, 200))
                best = sampleset.first
                opt_results = {
                    "energy": float(best.energy),
                    "sample": {str(k): int(v) for k, v in best.sample.items()},
                    "num_variables": len(target_bqm.variables),
                    "num_reads": len(sampleset)
                }
            except Exception as e:
                opt_results = {"error": str(e)}

    exec_ms = round((time.time() - t0) * 1000, 2)
    captured_stdout = stdout_capture.getvalue()
    captured_stderr = stderr_capture.getvalue()

    return CodeExecutionResponse(
        success=True,
        stdout=captured_stdout,
        stderr=captured_stderr,
        execution_time_ms=exec_ms,
        backend_used=backend_used,
        circuit_ascii=circuit_ascii,
        circuit_gates=circuit_gates,
        active_qubits=active_qubits,
        circuit_depth=circuit_depth,
        measurement_counts=counts,
        optimization_results=opt_results
    )
