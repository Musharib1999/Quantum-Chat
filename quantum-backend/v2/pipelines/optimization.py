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

        # Get interpretation from ExplanationAgent — fall back to reasoning_trace if it wasn't set
        # (happens when ExplanationAgent fails on the infeasible halt path)
        interpretation = (
            workspace.execution_result.get("interpretation", "") if workspace.execution_result else ""
        ) or reasoning_trace

        # If still empty and halted on infeasibility, build a user-friendly fallback
        if not interpretation and workspace.generated_code and workspace.generated_code.startswith("# HALTED"):
            infeasibility_reason = workspace.verification.get("infeasibility_reason", "") if workspace.verification else ""
            interpretation = (
                "This optimization problem was analyzed and found to be mathematically infeasible. "
                + (infeasibility_reason or reasoning_trace or "The constraints cannot all be satisfied simultaneously.")
            )

        # Generate pre-compiled LaTeX and math metadata from OptimizationIR
        math_rigor = {}
        if workspace.normalized_model:
            try:
                from ..compiler.formula_renderer import FormulaRenderer
                math_rigor = FormulaRenderer.to_math_rigor_dict(
                    workspace.normalized_model,
                    workspace.solver_strategy
                )
            except Exception as math_err:
                print(f"[optimization.py] Error rendering math rigor: {math_err}")

        # Determine pattern from math_rigor counts or fallback
        final_pattern = pattern
        if math_rigor and "constraint_counts" in math_rigor:
            # We can classify problem types based on variables and counts
            has_boolean = any(v.get("latex_def", "").find("\{0, 1\}") != -1 for v in math_rigor.get("variables", []))
            if has_boolean:
                final_pattern = "Selection Optimization"
            else:
                final_pattern = "General Optimization"

        return {
            "parsed_math": json.dumps(workspace.problem_specification) if workspace.problem_specification else "",
            "reasoning_trace": reasoning_trace,
            "final_code": workspace.generated_code or "",
            "suggested_solver": workspace.solver_strategy or "OR-Tools",
            "solver_rationale": workspace.solver_rationale or "",
            "interpretation": interpretation,
            "personality_response": interpretation,
            "pattern": final_pattern,
            "success": success,
            "math_rigor": math_rigor
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
