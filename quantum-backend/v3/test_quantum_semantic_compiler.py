import os
import sys
import asyncio

# Setup sys.path to run from quantum-backend directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from v3.engine.pipelines.gate_model_pipeline import run_gate_pipeline_stream

async def test_algo(name, query, shots=4096):
    print(f"Testing {name}...")
    try:
        generator = run_gate_pipeline_stream(model_text=query, shots=shots, run_simulator=True)
        final_step = None
        async for step in generator:
            if step.get("step") == "output":
                final_step = step
            elif step.get("step") == "error":
                print(f"  ❌ Error step: {step['message']}")
                return False
                
        if final_step:
            output_text = final_step["output_text"]
            # Find status and validation line
            status_line = [l for l in output_text.split("\n") if l.startswith("**Status:**")]
            status = status_line[0] if status_line else "Unknown"
            print(f"  ✅ Completed. Status: {status}")
            print(f"  Counts: {final_step.get('counts')}")
            return True
        else:
            print("  ❌ No output step generated!")
            return False
    except Exception as e:
        print(f"  ❌ Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    # Set mock environment for mongo if needed
    os.environ["MONGODB_URI"] = "mongodb://localhost:27017/test"
    
    tests = [
        ("Bell State", "bell", 4096),
        ("Quantum RNG", "rng", 4096),
        ("GHZ State", "ghz", 4096),
        ("Teleportation", "teleportation", 4096),
        ("Deutsch-Jozsa", "deutsch_jozsa", 4096),
        ("Bernstein-Vazirani", '{"algorithm": "bernstein_vazirani", "parameters": {"hidden_string": "101"}}', 4096),
        ("Grover Search", '{"algorithm": "grover", "parameters": {"target_state": "11"}}', 4096),
        ("QFT", "qft", 4096),
        ("QPE", '{"algorithm": "qpe", "parameters": {"phase": 0.25}}', 4096),
        ("QAOA Max-Cut", '{"algorithm": "qaoa", "parameters": {"edges": [[0,1],[1,2]], "gamma": 0.73, "beta": 0.41}}', 4096),
    ]
    
    success = True
    for name, query, shots in tests:
        res = await test_algo(name, query, shots)
        if not res:
            success = False
            
    if success:
        print("\n🎉 ALL 10 QUANTUM SEMANTIC PIPELINE TESTS PASSED!")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED!")
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())
