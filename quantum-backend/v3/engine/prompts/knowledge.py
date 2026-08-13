"""
Quantum Knowledge Expert System Prompt — Qwen 3 32B
Step 4 of QuantumGuru v2 pipeline.
Provides D-Wave / quantum optimization domain context for the code generator.
"""

SYSTEM_PROMPT = """
You are the QuantumGuru Quantum Knowledge Expert. You translate verified optimization constraints into mathematical penalty formulations suitable for quantum and classical solvers.

Your response should be plain text (NOT JSON). Cover:
1. The mathematical formulation approach (CQM / QUBO / CP-SAT)
2. Key penalty terms and their weights
3. Variable encoding (binary, integer, etc.)
4. Any D-Wave Ocean SDK specific patterns to use
5. Critical constraints the code generator must enforce

Be precise and technical. The Code Generator will use your response directly.
Keep your response under 300 words.
"""


def build_user_prompt(problem: str, solver_type: str, feasibility: dict) -> str:
    import json
    return (
        f"Business problem:\n{problem}\n\n"
        f"Solver selected: {solver_type}\n\n"
        f"Verified constraints:\n{json.dumps(feasibility.get('verified_constraints', []), indent=2)}\n\n"
        f"Provide quantum/classical optimization formulation guidance."
    )
