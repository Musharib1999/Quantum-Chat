from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Tuple
import traceback
from dwave.samplers import SimulatedAnnealingSampler
import ast

app = FastAPI(title="D-Wave Simulator Service")
sampler = SimulatedAnnealingSampler()

class QuboRequest(BaseModel):
    Q: Dict[str, float]
    num_reads: int = 1000

@app.post("/solve/qubo")
async def solve_qubo(request: QuboRequest):
    try:
        # Convert string keys back to tuples if necessary
        # Often JSON keys come as "('a', 'b')" instead of actual tuples
        parsed_Q = {}
        for k, v in request.Q.items():
            if isinstance(k, str) and k.startswith("(") and k.endswith(")"):
                parsed_k = ast.literal_eval(k)
                parsed_Q[parsed_k] = v
            else:
                parsed_Q[k] = v

        # Run the CPU-based solver
        sampleset = sampler.sample_qubo(parsed_Q, num_reads=request.num_reads)
        best = sampleset.first

        return {
            "status": "success",
            "best_energy": best.energy,
            "best_sample": best.sample
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "online", "hardware": "CPU (Simulated Annealing)"}
