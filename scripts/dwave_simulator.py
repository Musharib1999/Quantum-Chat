import sys
import json
import traceback

# Try to import D-Wave libraries, fallback if not present
try:
    import dimod
    import dwave.inspector
    HAS_DWAVE = True
except ImportError:
    HAS_DWAVE = False

def execute_dwave_code(code_source):
    if not HAS_DWAVE:
        return {
            "success": False,
            "error": "D-Wave libraries (dimod) not installed. Please install 'dimod' and 'dwave-ocean-sdk' to run D-Wave simulations.",
        }

    try:
        # Create a clean environment for execution
        local_scope = {
            'dimod': dimod,
        }
        
        # The LLM is expected to define a variable 'bqm' (BinaryQuadraticModel)
        # OR define a 'sampler' and run it, returning a 'sampleset'
        # For simplicity, we ask LLM to define 'bqm' and we run it with a simulated sampler here.
        
        exec(code_source, {}, local_scope)
        
        if 'bqm' not in local_scope:
            return {"error": "The generated code did not define a 'bqm' (BinaryQuadraticModel) variable."}
            
        bqm = local_scope['bqm']
        if not isinstance(bqm, dimod.BinaryQuadraticModel):
            return {"error": "'bqm' is not a valid dimod.BinaryQuadraticModel."}

        # Run Simulated Annealing (Local)
        # We use ExactSolver for small problems or SimulatedAnnealing for larger
        if len(bqm) < 20: 
             sampler = dimod.ExactSolver()
        else:
             from dimod import SimulatedAnnealingSampler
             sampler = SimulatedAnnealingSampler()

        sampleset = sampler.sample(bqm)
        
        # Get the best solution
        best_sample = sampleset.first.sample
        energy = sampleset.first.energy
        
        # Aggregate samples for "counts" (histogram)
        # Convert {0: 1, 1: 0} to "10" string format for consistency with Qiskit charts
        counts = {}
        for datum in sampleset.data(['sample', 'num_occurrences']):
            # Convert sample dict to bitstring key
            # key order depends on bqm variables, we sort them
            sorted_vars = sorted(bqm.variables)
            bitstring = "".join(str(int(datum.sample[v])) for v in sorted_vars)
            
            counts[bitstring] = counts.get(bitstring, 0) + datum.num_occurrences

        return {
            "success": True,
            "counts": counts,
            "best_solution": {str(k): int(v) for k, v in best_sample.items()},
            "energy": float(energy),
            "num_variables": len(bqm)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No code provided"}))
        sys.exit(1)
        
    code_input = sys.argv[1]
    output = execute_dwave_code(code_input)
    print(json.dumps(output))
