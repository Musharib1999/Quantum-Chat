"""
Optimization Pipeline — QuantumGuru Engine v3 (Multi-Agent V7 Core)
Routes to SupervisorAgent orchestrator for E2E execution.
"""
import json
from .multi_agent import SupervisorAgent

async def run_optimization_pipeline(
    problem: str,
    mode: str = "auto",
    session_id: str = None,
) -> dict:
    """
    Full QuantumGuru v7 multi-agent optimization pipeline.
    """
    try:
        supervisor = SupervisorAgent()
        workspace = await supervisor.execute(problem, mode, session_id)

        # Determine backward-compatible pattern classification
        pattern = "selection"
        if workspace.problem_specification and "variable_registry" in workspace.problem_specification:
            for var in workspace.problem_specification["variable_registry"]:
                if len(var.get("dimensions", [])) == 2:
                    pattern = "assignment"

        # Map workspace back to legacy return format for UI compatibility
        success = False
        if workspace.generated_code and not workspace.generated_code.startswith("# HALTED"):
            success = True

        reasoning_trace = workspace.verification.get("reasoning_trace", "") if workspace.verification else ""
        if workspace.generated_code and "HALTED: AI engine is under maintenance" in workspace.generated_code:
            reasoning_trace = "AI engine is under maintenance, please try after few minutes"

        return {
            "parsed_math": json.dumps(workspace.problem_specification) if workspace.problem_specification else "",
            "reasoning_trace": reasoning_trace,
            "final_code": workspace.generated_code or "",
            "suggested_solver": workspace.solver_strategy or "OR-Tools",
            "solver_rationale": workspace.solver_rationale or "",
            "interpretation": workspace.execution_result.get("interpretation", "") if workspace.execution_result else "",
            "personality_response": workspace.execution_result.get("interpretation", "") if workspace.execution_result else "",
            "pattern": pattern,
            "success": success,
        }
    except Exception as e:
        print(f"[run_optimization_pipeline] Exception caught: {e}")
        is_maintenance = "under maintenance" in str(e)
        return {
            "parsed_math": "",
            "reasoning_trace": "AI engine is under maintenance, please try after few minutes" if is_maintenance else f"Error: {e}",
            "final_code": "# HALTED: AI engine is under maintenance, please try after few minutes" if is_maintenance else "",
            "suggested_solver": "none",
            "solver_rationale": "",
            "interpretation": "",
            "personality_response": "",
            "pattern": "unknown",
            "success": False,
        }
