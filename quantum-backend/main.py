from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
import sys
import io
import contextlib
import traceback
import os

# Initialize FastAPI
app = FastAPI(title="Quantum Calculation Backend")

# Security
API_SECRET = os.getenv("API_SECRET_KEY", "default-dev-key")

async def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_SECRET:
        raise HTTPException(status_code=403, detail="Invalid API Key")

# Data Models
class QiskitRequest(BaseModel):
    code: str
    shots: int = 1024

class DWaveRequest(BaseModel):
    code: str

# -----------------
# Qiskit Execution
# -----------------
@app.post("/api/simulate/qiskit", dependencies=[Depends(verify_api_key)])
async def simulate_qiskit(request: QiskitRequest):
    try:
        # Import Qiskit libraries inside the function to ensure isolation
        from qiskit import QuantumCircuit, transpile
        from qiskit_aer import AerSimulator
        
        # Safe execution environment
        local_scope = {
            'QuantumCircuit': QuantumCircuit,
            'AerSimulator': AerSimulator,
            'transpile': transpile
        }
        
        # Execute the submitted code
        # The user's code must define a 'circuit' variable
        exec(request.code, {}, local_scope)
        
        if 'circuit' not in local_scope:
            return {"success": False, "error": "The code did not define a 'circuit' variable."}
            
        circuit = local_scope['circuit']
        
        # Basic validation
        if not isinstance(circuit, QuantumCircuit):
             return {"success": False, "error": "'circuit' is not a valid Qiskit QuantumCircuit."}

        # Run Simulation
        simulator = AerSimulator()
        compiled_circuit = transpile(circuit, simulator)
        job = simulator.run(compiled_circuit, shots=request.shots)
        result = job.result()
        counts = result.get_counts()
        
        return {
            "success": True,
            "counts": counts,
            "qubits": circuit.num_qubits,
            "depth": circuit.depth()
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

# -----------------
# D-Wave Execution
# -----------------
@app.post("/api/simulate/dwave", dependencies=[Depends(verify_api_key)])
async def simulate_dwave(request: DWaveRequest):
    try:
        import dimod
        # Check for imports
        
        local_scope = {'dimod': dimod}
        
        # Execute Code
        # Expected to define 'bqm'
        exec(request.code, {}, local_scope)
        
        if 'bqm' not in local_scope:
            return {"success": False, "error": "The code did not define a 'bqm' variable."}
            
        bqm = local_scope['bqm']
        
        # Run Simulated Annealing (Software)
        if len(bqm) < 20:
            sampler = dimod.ExactSolver()
        else:
            from dimod import SimulatedAnnealingSampler
            sampler = SimulatedAnnealingSampler()
            
        sampleset = sampler.sample(bqm)
        best_sample = sampleset.first.sample
        energy = sampleset.first.energy
        
        # Format counts
        counts = {}
        sorted_vars = sorted(bqm.variables)
        
        for datum in sampleset.data(['sample', 'num_occurrences']):
            bitstring = "".join(str(int(datum.sample[v])) for v in sorted_vars)
            counts[bitstring] = counts.get(bitstring, 0) + datum.num_occurrences

        return {
            "success": True,
            "counts": counts,
            "best_solution": {str(k): int(v) for k, v in best_sample.items()},
            "energy": float(energy)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Quantum Backend"}
