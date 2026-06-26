"""
Optimization Pipeline — QuantumGuru Engine v2
Scenario 1: Business Problem → Solver Code

Full 8-step pipeline:
  1. Suggestor      (Llama 8B LoRA)
  2. NLP Parser     (Qwen 3 32B)
  3. Math Reasoner  (Qwen 3 32B)
  4. Knowledge      (Qwen 3 32B)
  5. Code Generator (Llama 8B LoRA — CQM / QUBO / OR-Tools branch)
  6. QA Debugger    (Llama 8B LoRA + DCC fallback)
  7. Interpreter    (Qwen 3 32B)
  8. Personality    (Llama 8B LoRA)
"""
import os
import asyncio
from typing import Optional

from .. import config
from ..qwen_client import call_qwen
from ..llama_client import call_adapter
from ..compiler.dcc import compile_to_cqm_code, audit_cqm_code, audit_ortools_code
from ..validators.json_schema import parse_and_validate, validate_nlp_parser, validate_reasoner
from ..prompts import nlp_parser as nlp_prompt
from ..prompts import reasoner as reasoner_prompt
from ..prompts import knowledge as knowledge_prompt
from ..prompts import interpreter as interpreter_prompt

# Adapter local paths (used as MLX fallback when LLAMA_BASE_URL not set)
_ADAPTERS_BASE = os.path.join(os.path.dirname(__file__), "../../../adapters")
_PATH = lambda name: os.path.join(_ADAPTERS_BASE, name)


async def run_optimization_pipeline(
    problem: str,
    mode: str = "auto",
) -> dict:
    """
    Full QuantumGuru v2 optimization pipeline.
    
    Args:
        problem: Unstructured business problem text
        mode: "auto" | "cqm" | "qubo" | "ortools"
    
    Returns:
        dict with keys: parsed_math, reasoning_trace, knowledge_context,
                        final_code, interpretation, personality_response,
                        suggested_solver, solver_rationale, success
    """
    result = {
        "parsed_math": "",
        "reasoning_trace": "",
        "knowledge_context": "",
        "final_code": "",
        "interpretation": "",
        "personality_response": "",
        "suggested_solver": "OR-Tools",
        "solver_rationale": "",
        "success": False,
    }

    # =========================================================================
    # STEP 1 ─ Solver Suggestor (Llama 8B + adapter_suggestor)
    # =========================================================================
    decision = "OR-Tools"
    rationale = "Default fallback."

    if mode == "auto":
        print("[v2] Step 1: Solver Suggestor (Llama 8B)...")
        s_prompt = (
            "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
            "You are the QuantumGuru Solver Suggestor. Analyze the optimization problem and decide the best solver.\n"
            "Output EXACTLY two lines:\n"
            "Decision: <CQM|QUBO|OR-Tools>\n"
            "Rationale: <one sentence why>\n"
            "<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
            f"{problem}"
            "<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
        )
        s_out = await call_adapter(
            adapter_name=config.ADAPTER_SUGGESTOR,
            prompt=s_prompt,
            max_tokens=80,
            temperature=0.1,
            mlx_adapter_path=_PATH("adapter_suggestor"),
        )
        for line in s_out.splitlines():
            if line.startswith("Decision:"):
                decision = line.split(":", 1)[1].strip()
            elif line.startswith("Rationale:"):
                rationale = line.split(":", 1)[1].strip()
        if not decision or "MLX_ERROR" in s_out:
            decision, rationale = "OR-Tools", "Suggestor unavailable — defaulting to OR-Tools."
        print(f"[v2] Suggestor decision: {decision} — {rationale}")
    elif mode in ("cqm", "CQM"):
        decision, rationale = "CQM", "User selected CQM mode."
    elif mode in ("qubo", "QUBO"):
        decision, rationale = "QUBO", "User selected QUBO mode."
    else:
        decision, rationale = "OR-Tools", "User selected OR-Tools mode."

    result["suggested_solver"] = decision
    result["solver_rationale"] = rationale

    # =========================================================================
    # STEP 2 ─ NLP Parser (Qwen 3 32B)
    # =========================================================================
    print("[v2] Step 2: NLP Parser (Qwen 3 32B)...")
    nlp_user = nlp_prompt.build_user_prompt(problem)
    nlp_raw = await call_qwen(
        system=nlp_prompt.SYSTEM_PROMPT,
        user=nlp_user,
        max_tokens=512,
        temperature=0.1,
    )
    ir = await parse_and_validate(
        raw_output=nlp_raw,
        validator_fn=validate_nlp_parser,
        call_fn=call_qwen,
        system=nlp_prompt.SYSTEM_PROMPT,
        user=nlp_user,
        step_name="NLP Parser",
    )
    # Fallback IR if validation failed
    if not ir:
        ir = {"entities_count": 5, "entities_name": "item", "slots_count": 3, "slots_name": "slot",
              "capacity_val": None, "capacity_type": "upper_bound", "uniqueness_val": 1}
    result["parsed_math"] = str(ir)
    print(f"[v2] IR extracted: {ir.get('entities_count')} {ir.get('entities_name')}s x {ir.get('slots_count')} {ir.get('slots_name')}s")

    # =========================================================================
    # STEP 3 ─ Math Logic Reasoner (Qwen 3 32B)
    # =========================================================================
    print("[v2] Step 3: Math Logic Reasoner (Qwen 3 32B)...")
    rsn_user = reasoner_prompt.build_user_prompt(problem, ir)
    rsn_raw = await call_qwen(
        system=reasoner_prompt.SYSTEM_PROMPT,
        user=rsn_user,
        max_tokens=512,
        temperature=0.1,
    )
    feasibility = await parse_and_validate(
        raw_output=rsn_raw,
        validator_fn=validate_reasoner,
        call_fn=call_qwen,
        system=reasoner_prompt.SYSTEM_PROMPT,
        user=rsn_user,
        step_name="Math Reasoner",
    )
    if not feasibility:
        feasibility = {"feasible": True, "reasoning_trace": "Feasibility check skipped.", "conflicts": [], "verified_constraints": []}

    result["reasoning_trace"] = feasibility.get("reasoning_trace", "")

    # ── HALT if infeasible ────────────────────────────────────────────────────────
    if not feasibility.get("feasible", True):
        reason = feasibility.get("infeasibility_reason", "Mathematical infeasibility detected.")
        result["final_code"] = f"# HALTED: Problem is mathematically infeasible.\n# Reason: {reason}"
        result["reasoning_trace"] += f"\n\n[SYSTEM HALT]: {reason}"
        result["success"] = False
        return result

    # =========================================================================
    # STEP 4 ─ Quantum Knowledge Expert (Qwen 3 32B)
    # =========================================================================
    print("[v2] Step 4: Quantum Knowledge Expert (Qwen 3 32B)...")
    knowledge_context = await call_qwen(
        system=knowledge_prompt.SYSTEM_PROMPT,
        user=knowledge_prompt.build_user_prompt(problem, decision, feasibility),
        max_tokens=400,
        temperature=0.2,
    )
    result["knowledge_context"] = knowledge_context

    # =========================================================================
    # STEP 5 ─ Code Generator (Llama 8B LoRA — branches by solver type)
    # =========================================================================
    print(f"[v2] Step 5: {decision} Code Generator (Llama 8B)...")

    code_system = (
        f"You are the QuantumGuru {decision} Code Generator. "
        "Generate complete, executable Python solver code. "
        "Include all imports, variables, constraints, and objective. "
        "Output ONLY Python code, no explanation."
    )
    code_user = (
        f"Business problem: {problem}\n\n"
        f"Extracted parameters: {result['parsed_math']}\n\n"
        f"Domain knowledge: {knowledge_context}\n\n"
        f"Generate complete {decision} Python solver code."
    )
    code_prompt = (
        f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{code_system}"
        f"<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{code_user}"
        f"<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
    )

    if decision == "CQM":
        adapter_name = config.ADAPTER_CQM_CODER
        adapter_path = _PATH("adapter_master_guru")
    elif decision == "QUBO":
        adapter_name = config.ADAPTER_QUBO_CODER
        adapter_path = _PATH("adapter_qubo_coder")
    else:
        adapter_name = config.ADAPTER_ORTOOLS_CODER
        adapter_path = _PATH("adapter_ortools_coder")

    final_code = await call_adapter(
        adapter_name=adapter_name,
        prompt=code_prompt,
        max_tokens=800,
        temperature=0.1,
        mlx_adapter_path=adapter_path,
    )

    # =========================================================================
    # STEP 6 ─ QA Debugger + DCC Fallback (Llama 8B LoRA)
    # =========================================================================
    print("[v2] Step 6: QA Debugger (Llama 8B)...")

    if decision == "CQM":
        audit_result = audit_cqm_code(final_code, feasibility.get("verified_constraints", []))
    else:
        audit_result = audit_ortools_code(final_code)

    if "FAIL:" in audit_result or "MLX_ERROR" in final_code:
        print("[v2] QA FAILED — DCC fallback activating...")
        if decision == "CQM":
            dcc_code = compile_to_cqm_code(ir)
            dcc_audit = audit_cqm_code(dcc_code, [])
            final_code = (
                "# ⚠️  GENERATIVE CODE REJECTED BY QA AUDIT\n"
                "# ✅ DCC DETERMINISTIC FALLBACK ACTIVE\n\n"
                + dcc_code
                + f"\n\n# QA TRACE: {dcc_audit}"
            )
        else:
            final_code = (
                "# ⚠️  GENERATIVE CODE REJECTED BY QA AUDIT\n"
                "# Fallback: OR-Tools basic template\n\n"
                "from ortools.sat.python import cp_model\n"
                "model = cp_model.CpModel()\n"
                "solver = cp_model.CpSolver()\n"
                "# TODO: Add variables and constraints based on problem\n"
                "status = solver.Solve(model)\n"
                "print(solver.StatusName(status))\n"
            )
    else:
        final_code = final_code + f"\n\n# QA TRACE: {audit_result}"

    result["final_code"] = final_code

    # =========================================================================
    # STEP 7 ─ Output Interpreter (Qwen 3 32B)
    # =========================================================================
    print("[v2] Step 7: Output Interpreter (Qwen 3 32B)...")
    interpretation = await call_qwen(
        system=interpreter_prompt.SYSTEM_PROMPT,
        user=interpreter_prompt.build_user_prompt(
            problem=problem,
            reasoning_trace=result["reasoning_trace"],
            solver_type=decision,
            final_code=final_code,
        ),
        max_tokens=350,
        temperature=0.3,
    )
    result["interpretation"] = interpretation

    # =========================================================================
    # STEP 8 ─ Personality Wrapper (Llama 8B + adapter_personality)
    # =========================================================================
    print("[v2] Step 8: Personality Wrapper (Llama 8B)...")
    personality_prompt = (
        "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
        "You are the Bit2Qubit Quantum Guru assistant. Rewrite the following summary in the "
        "professional, confident, and expert Bit2Qubit brand voice. Keep it under 220 words. "
        "Do not add new information — only reformat and refine the tone."
        "<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
        f"{interpretation}"
        "<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
    )
    personality_response = await call_adapter(
        adapter_name=config.ADAPTER_PERSONALITY,
        prompt=personality_prompt,
        max_tokens=300,
        temperature=0.2,
        mlx_adapter_path=_PATH("adapter_personality"),
    )
    if "MLX_ERROR" in personality_response or not personality_response.strip():
        personality_response = interpretation  # fallback to raw interpretation

    result["personality_response"] = personality_response
    result["success"] = True
    print("[v2] Pipeline complete ✅")
    return result
