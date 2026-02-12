import sys
import json
import traceback
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

def execute_quantum_code(circuit_source):
    try:
        # Create a clean environment for execution
        local_scope = {
            'QuantumCircuit': QuantumCircuit,
            'AerSimulator': AerSimulator,
            'transpile': transpile
        }
        
        # The LLM is expected to define a variable 'circuit' which is a QuantumCircuit
        exec(circuit_source, {}, local_scope)
        
        if 'circuit' not in local_scope:
            return {"error": "The generated code did not define a 'circuit' variable."}
            
        circuit = local_scope['circuit']
        if not isinstance(circuit, QuantumCircuit):
            return {"error": "'circuit' is not a valid Qiskit QuantumCircuit."}

        # Run Simulator
        simulator = AerSimulator()
        compiled_circuit = transpile(circuit, simulator)
        job = simulator.run(compiled_circuit, shots=1024)
        result = job.result()
        
        # Get counts
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

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No circuit code provided"}))
        sys.exit(1)
        
    code_input = sys.argv[1]
    output = execute_quantum_code(code_input)
    print(json.dumps(output))
鼓,Complexity:2,Description:
