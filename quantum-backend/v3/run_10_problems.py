import os
import sys
import asyncio
import json

# Setup sys.path to run from quantum-backend directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from v3.engine.pipelines.gate_model_pipeline import run_gate_pipeline_stream

async def run_problem(idx, name, query, shots=4096):
    print(f"[{idx}/10] Running: {name}...")
    try:
        generator = run_gate_pipeline_stream(model_text=query, shots=shots, run_simulator=True)
        final_step = None
        async for step in generator:
            if step.get("step") == "output":
                final_step = step
            elif step.get("step") == "error":
                print(f"  ❌ Error step in {name}: {step['message']}")
                return None
                
        if final_step:
            print(f"  ✅ Completed: {name}")
            return {
                "name": name,
                "qiskit_code": final_step.get("qiskit_code"),
                "ascii_circuit": final_step.get("ascii_circuit"),
                "counts": final_step.get("counts"),
                "output_text": final_step.get("output_text")
            }
        else:
            print(f"  ❌ No output generated for {name}")
            return None
    except Exception as e:
        print(f"  ❌ Exception in {name}: {e}")
        return None

async def main():
    os.environ["MONGODB_URI"] = "mongodb://localhost:27017/test"
    
    problems = [
        ("Quantum Superdense Coding", '{"algorithm": "superdense_coding", "parameters": {"message": "10"}}'),
        ("Quantum Teleportation (RY State)", '{"algorithm": "teleportation_arbitrary", "parameters": {"theta": "pi/3"}}'),
        ("Three-Qubit Quantum Error Correction", '{"algorithm": "three_qubit_qec"}'),
        ("Controlled Quantum Fourier Transform", '{"algorithm": "controlled_qft"}'),
        ("Quantum Phase Kickback Experiment", '{"algorithm": "phase_kickback"}'),
        ("Quantum Amplitude Amplification with Two Marked States", '{"algorithm": "grover_multi_target"}'),
        ("Quantum Ripple-Carry Adder", '{"algorithm": "ripple_carry_adder"}'),
        ("Quantum Comparator Circuit", '{"algorithm": "quantum_comparator"}'),
        ("Variational Quantum Eigensolver Circuit", '{"algorithm": "vqe", "parameters": {"theta": 0.5}}'),
        ("Quantum Walk on a Four-Node Cycle", '{"algorithm": "quantum_walk"}')
    ]
    
    results = []
    for i, (name, query) in enumerate(problems, 1):
        res = await run_problem(i, name, query, 4096)
        if res:
            results.append(res)
        
        # Apply 30-second delay between pipeline invocations to prevent Groq TPM limit hits
        if i < len(problems):
            print(f"Waiting 30 seconds before next problem to respect Groq rate limits...")
            await asyncio.sleep(30)
            
    # Write report
    report_path = "/Users/musharibsubhani/.gemini/antigravity/brain/4a10a474-c89a-4503-a4e0-68c2b2607d4b/10_problems_results.md"
    
    with open(report_path, "w") as f:
        f.write("# 10 Quantum Problems Execution Report\n\n")
        f.write("Executing 10 quantum studio problems sequentially on the compiler and simulator pipeline with a 30-second delay interval.\n\n")
        
        for idx, res in enumerate(results, 1):
            f.write(f"## {idx}. {res['name']}\n\n")
            
            f.write("### 1. Compiled Qiskit Code\n")
            f.write("```python\n" + res['qiskit_code'] + "\n```\n\n")
            
            f.write("### 2. Generated Circuit Diagram\n")
            f.write("```\n" + res['ascii_circuit'] + "\n```\n\n")
            
            f.write("### 3. Simulation Counts & Validation Output\n")
            f.write("```json\n" + json.dumps(res['counts'], indent=2) + "\n```\n\n")
            f.write(res['output_text'] + "\n\n")
            f.write("---\n\n")
            
    print(f"Report written successfully to: {report_path}")

if __name__ == '__main__':
    asyncio.run(main())
