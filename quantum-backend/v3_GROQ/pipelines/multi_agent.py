"""
Bit2Qubit Multi-Agent Orchestration Architecture (V7)
Enforces: LLMs decide, compiler modules compute.
Shared Workspace is the single source of truth.
"""
import os
import re
import json
import asyncio
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional

from .. import config
from ..qwen_client import call_groq_llama70b
from ..llama_client import call_adapter
from ..compiler.dcc import audit_cqm_code, audit_ortools_code, compile_compositional_ast, SandboxedVerifier
from ..compiler.ir import IRNormalizer, NumericalFeasibilityChecker
from ..validators.json_schema import (
    parse_and_validate,
    validate_compositional_parser,
    validate_reasoner
)
from ..prompts import compositional_parser as comp_prompt
from ..prompts import reasoner as reasoner_prompt


# ── Shared Workspace State Container ────────────────────────────────────
@dataclass
class Workspace:
    problem_text: str = ""
    problem_specification: Optional[Dict[str, Any]] = None
    normalized_model: Optional[Any] = None  # Holds OptimizationIR instance
    constraint_graph: Optional[Dict[str, Any]] = None
    expression_tree: Optional[Dict[str, Any]] = None
    bounded_ast: Optional[Dict[str, Any]] = None
    solver_strategy: Optional[str] = "OR-Tools"
    solver_rationale: Optional[str] = "Default strategy."
    generated_code: Optional[str] = None
    execution_result: Optional[Dict[str, Any]] = None
    verification: Optional[Dict[str, Any]] = None
    messages: List[Dict[str, Any]] = field(default_factory=list)
    confidence: Dict[str, float] = field(default_factory=dict)
    history: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if self.normalized_model:
            d["normalized_model"] = str(self.normalized_model)
        return d


# ── Agent Result Schema ─────────────────────────────────────────────────
@dataclass
class AgentResult:
    status: str  # PASS, FAIL, RETRY, ASK_USER
    confidence: float
    message: str


# ── Base Agent Class ────────────────────────────────────────────────────
class Agent:
    def __init__(self, name: str):
        self.name = name

    async def run(self, workspace: Workspace) -> AgentResult:
        raise NotImplementedError


# ── 1. Understanding Agent (NLP Parser) ──────────────────────────────────
class UnderstandingAgent(Agent):
    def __init__(self):
        super().__init__("UnderstandingAgent")

    async def run(self, workspace: Workspace) -> AgentResult:
        try:
            comp_user = comp_prompt.build_user_prompt(workspace.problem_text)
            comp_raw = await call_groq_llama70b(
                system=comp_prompt.SYSTEM_PROMPT,
                user=comp_user,
                max_tokens=2000,
                temperature=0.1,
            )
            comp_ir = await parse_and_validate(
                raw_output=comp_raw,
                validator_fn=validate_compositional_parser,
                call_fn=call_groq_llama70b,
                system=comp_prompt.SYSTEM_PROMPT,
                user=comp_user,
                step_name="Compositional Parser",
            )
            if comp_ir:
                workspace.problem_specification = comp_ir
                workspace.confidence["Understanding"] = 0.98
                return AgentResult("PASS", 0.98, "Parsed optimization variables and constraints successfully.")
            return AgentResult("FAIL", 0.0, "Parsing returned empty result.")
        except Exception as e:
            if "AI engine is under maintenance" in str(e):
                return AgentResult("FAIL", 0.0, "AI engine is under maintenance, please try after few minutes")
            return AgentResult("FAIL", 0.0, f"Parser failed: {e}")


# ── 2. Mathematical Modeling Agent (IR Builder) ─────────────────────────
class ModelingAgent(Agent):
    def __init__(self):
        super().__init__("ModelingAgent")

    async def run(self, workspace: Workspace) -> AgentResult:
        spec = workspace.problem_specification
        if not spec:
            return AgentResult("FAIL", 0.0, "No problem specification available in workspace.")

        try:
            # Deterministic IR conversion (No LLM inside the module)
            opt_ir = IRNormalizer.normalize(spec)
            workspace.normalized_model = opt_ir

            # Inline formulas back to spec dictionary so the user interface can render LaTeX
            for idx, c in enumerate(opt_ir.constraints):
                latex_formula = c.to_latex()
                if "constraint_registry" in spec and idx < len(spec["constraint_registry"]):
                    spec["constraint_registry"][idx]["formula"] = latex_formula

            # Save modified spec back to workspace
            workspace.problem_specification = spec
            workspace.confidence["Modeling"] = 1.0
            return AgentResult("PASS", 1.0, "Successfully constructed normalized OptimizationIR.")
        except Exception as e:
            return AgentResult("FAIL", 0.0, f"IR normalization failed: {e}")


# ── 3. Constraint Verification Agent (Feasibility Checker) ─────────────
class ConstraintVerificationAgent(Agent):
    def __init__(self):
        super().__init__("ConstraintVerificationAgent")

    async def run(self, workspace: Workspace) -> AgentResult:
        try:
            from v3.compiler.cmm import CanonicalMathematicalModel
            from v3.compiler.expander import parse_spec_to_cmm, expand_cmm_to_om, validate_optimization_model
            
            # 1. Parse CMM
            cmm = parse_spec_to_cmm(workspace.problem_specification or {})
            # 2. Expand CMM to OM
            om = expand_cmm_to_om(cmm, workspace.problem_text)
            # 3. Validate OM
            feasibility = validate_optimization_model(om, cmm)
            
            # 3b. Semantic Preservation Layer Verification
            c_registry = (workspace.problem_specification or {}).get("constraint_registry", [])
            for c in c_registry:
                c_name = c.get("name", "")
                if c_name:
                    # Verify that a constraint with this name prefix exists in the expanded OptimizationModel
                    found_in_om = any(c_name in ec.name for ec in om.constraints)
                    if not found_in_om:
                        return AgentResult(
                            "FAIL", 
                            1.0, 
                            f"Semantic Verification Failure: Constraint family '{c_name}' was lost during CMM compiler translation."
                        )
            
            trace = "Deterministic Feasibility Check: Model variables and constraint bounds validated successfully."
            if not feasibility["feasible"]:
                trace = f"Deterministic Feasibility Check: MATHEMATICAL INFEASIBILITY DETECTED. Reason: {feasibility['infeasibility_reason']}"
                
            workspace.verification = {
                "feasible": feasibility["feasible"],
                "reasoning_trace": trace,
                "infeasibility_reason": feasibility.get("infeasibility_reason"),
                "results": []
            }
            
            workspace.confidence["Verification"] = 1.0
            if not feasibility["feasible"]:
                return AgentResult("FAIL", 1.0, f"Mathematical infeasibility detected: {feasibility.get('infeasibility_reason')}")
                
            return AgentResult("PASS", 1.0, "Model verified to be feasible.")
        except Exception as e:
            import logging
            logging.error(f"[ConstraintVerificationAgent] Verification failed: {e}", exc_info=True)
            if "AI engine is under maintenance" in str(e):
                return AgentResult("FAIL", 0.0, "AI engine is under maintenance, please try after few minutes")
            return AgentResult("RETRY", 0.0, f"Verification failed: {e}")


# ── 4. Solver Strategy Agent (Suggestor Router) ──────────────────────────
class SolverStrategyAgent(Agent):
    def __init__(self, mode: str = "auto"):
        super().__init__("SolverStrategyAgent")
        self.mode = mode

    async def run(self, workspace: Workspace) -> AgentResult:
        if self.mode != "auto":
            strategy = "CQM" if self.mode.lower() == "cqm" else "QUBO" if self.mode.lower() == "qubo" else "OR-Tools"
            workspace.solver_strategy = strategy
            workspace.solver_rationale = f"User selected solver strategy: {strategy}."
            workspace.confidence["Strategy"] = 1.0
            return AgentResult("PASS", 1.0, f"Solver strategy set to user override: {strategy}")

        # Auto routing using suggestor LLM
        pattern = "selection"
        if workspace.problem_specification and "variable_registry" in workspace.problem_specification:
            for var in workspace.problem_specification["variable_registry"]:
                if len(var.get("dimensions", [])) == 2:
                    pattern = "assignment"

        s_prompt = (
            "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
            "You are the QuantumGuru Solver Suggestor. Analyze the optimization problem, pattern, variables, and feasibility reasoning, then decide the best solver.\n"
            "Output EXACTLY three lines:\n"
            "Decision: <CQM|QUBO|OR-Tools>\n"
            "Candidates: CP-SAT <score>%, CQM <score>%, MILP <score>% (Rank all three based on confidence percentage)\n"
            "Rationale: <one sentence why>\n"
            "<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
            f"Business Problem: {workspace.problem_text}\n"
            f"Problem Pattern: {pattern}\n"
            f"Parsed Parameters: {json.dumps(workspace.problem_specification)}\n"
            f"Feasibility Reasoning: {workspace.verification.get('reasoning_trace') if workspace.verification else ''}\n"
            "<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
        )
        
        decision = "OR-Tools"
        candidates = "CP-SAT 90%, CQM 80%, MILP 60%"
        rationale = "Default fallback."
        try:
            s_out = await call_adapter(
                adapter_name=config.ADAPTER_SUGGESTOR,
                prompt=s_prompt,
                max_tokens=150,
                temperature=0.1,
                mlx_adapter_path=os.path.join(os.path.dirname(__file__), "../../../adapters/adapter_suggestor"),
            )
            for line in s_out.splitlines():
                if line.startswith("Decision:"):
                    decision = line.split(":", 1)[1].strip()
                elif line.startswith("Candidates:"):
                    candidates = line.split(":", 1)[1].strip()
                elif line.startswith("Rationale:"):
                    rationale = line.split(":", 1)[1].strip()
            
            workspace.solver_strategy = decision
            workspace.solver_rationale = f"Candidates: {candidates}\nRationale: {rationale}"
            workspace.confidence["Strategy"] = 0.95
            return AgentResult("PASS", 0.95, f"Suggested solver strategy: {decision}")
        except Exception as e:
            if "AI engine is under maintenance" in str(e):
                return AgentResult("FAIL", 0.0, "AI engine is under maintenance, please try after few minutes")
            workspace.solver_strategy = decision
            workspace.solver_rationale = f"Candidates: {candidates}\nRationale: {rationale}"
            return AgentResult("PASS", 0.5, f"Suggestor failed, using fallback strategy: {decision}. Error: {e}")


# ── 5. Code Generation Agent ────────────────────────────────────────────
class CodeGenerationAgent(Agent):
    def __init__(self):
        super().__init__("CodeGenerationAgent")

    async def run(self, workspace: Workspace) -> AgentResult:
        ir = workspace.normalized_model
        if not ir:
            return AgentResult("FAIL", 0.0, "No normalized model available in workspace.")

        strategy = workspace.solver_strategy or "OR-Tools"
        
        pattern = "selection"
        if workspace.problem_specification and "variable_registry" in workspace.problem_specification:
            for var in workspace.problem_specification["variable_registry"]:
                if len(var.get("dimensions", [])) == 2:
                    pattern = "assignment"

        code_system = (
            f"You are the QuantumGuru {strategy} Code Generator. "
            "Generate complete, executable Python solver code. "
            "Include all imports, variables, constraints, and objective. "
            "If there are preferred selection terms or penalties, formulate them as quadratic objective terms (e.g. penalty * S3 * S9) instead of hard constraints. "
            "Output ONLY Python code, no explanation."
        )
        code_user = (
            f"Business problem: {workspace.problem_text}\n\n"
            f"Problem Pattern: {pattern}\n"
            f"Extracted parameters: {json.dumps(workspace.problem_specification)}\n\n"
            f"Feasibility trace: {workspace.verification.get('reasoning_trace') if workspace.verification else ''}\n\n"
            f"Generate complete {strategy} Python solver code."
        )
        code_prompt = (
            f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{code_system}"
            f"<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{code_user}"
            f"<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
        )

        adapters_base = os.path.join(os.path.dirname(__file__), "../../../adapters")
        if strategy == "CQM":
            adapter_name = config.ADAPTER_CQM_CODER
            adapter_path = os.path.join(adapters_base, "adapter_master_guru")
        elif strategy == "QUBO":
            adapter_name = config.ADAPTER_QUBO_CODER
            adapter_path = os.path.join(adapters_base, "adapter_qubo_coder")
        else:
            adapter_name = config.ADAPTER_ORTOOLS_CODER
            adapter_path = os.path.join(adapters_base, "adapter_ortools_coder")

        try:
            final_code = await call_adapter(
                adapter_name=adapter_name,
                prompt=code_prompt,
                max_tokens=800,
                temperature=0.1,
                mlx_adapter_path=adapter_path,
            )
            
            # Check code audit
            audit_result = audit_cqm_code(final_code, []) if strategy == "CQM" else audit_ortools_code(final_code)
            
            has_2d_variables = bool(re.search(r'\[\w+,\s*\w+\]|_\w+_\w+', final_code))
            if pattern in ("selection", "knapsack") and has_2d_variables:
                audit_result = "FAIL: 2D assignment variables detected in a selection problem pattern."
                
            workspace.generated_code = final_code
            
            if "FAIL:" in audit_result:
                return AgentResult("RETRY", 0.5, f"Generated code failed audit check: {audit_result}")
                
            workspace.confidence["CodeGen"] = 0.95
            return AgentResult("PASS", 0.95, "Generated solver code successfully.")
        except Exception as e:
            if "AI engine is under maintenance" in str(e):
                return AgentResult("FAIL", 0.0, "AI engine is under maintenance, please try after few minutes")
            return AgentResult("FAIL", 0.0, f"Code generation failed: {e}")


# ── 6. Execution Agent (Sandbox Verifier) ───────────────────────────────
class ExecutionAgent(Agent):
    def __init__(self):
        super().__init__("ExecutionAgent")

    async def run(self, workspace: Workspace) -> AgentResult:
        code = workspace.generated_code
        ir = workspace.normalized_model
        if not code:
            return AgentResult("FAIL", 0.0, "No generated code available to execute.")

        try:
            # Run sandbox verification directly (DCC compiler executor module)
            inspect_res = SandboxedVerifier.verify(code, ir)
            workspace.execution_result = inspect_res
            
            if inspect_res.get("errors"):
                return AgentResult("FAIL", 0.8, f"Sandbox verification errors: {inspect_res.get('errors')}")
                
            workspace.confidence["Execution"] = 1.0
            return AgentResult("PASS", 1.0, "Sandbox execution verified successfully.")
        except Exception as e:
            return AgentResult("FAIL", 0.0, f"Sandbox execution crash: {e}")


# ── 7. Repair Agent (Self-Correction debugger) ──────────────────────────
class RepairAgent(Agent):
    def __init__(self):
        super().__init__("RepairAgent")

    async def run(self, workspace: Workspace) -> AgentResult:
        code = workspace.generated_code
        if not code:
            return AgentResult("FAIL", 0.0, "No generated code to repair.")
            
        pattern = "selection"
        if workspace.problem_specification and "variable_registry" in workspace.problem_specification:
            for var in workspace.problem_specification["variable_registry"]:
                if len(var.get("dimensions", [])) == 2:
                    pattern = "assignment"

        # Read failure trace from workspace history
        last_failure = "Execution audit failed."
        for hist in reversed(workspace.history):
            if hist.get("result") and hist["result"]["status"] in ("FAIL", "RETRY"):
                last_failure = hist["result"]["message"]
                break

        fixer_system = (
            "You are the QuantumGuru QA Code Fixer. Your ONLY job is to repair compilation, syntax, "
            "or structural issues in the provided Python optimization solver code.\n"
            "If the pattern is 'selection', do NOT use 2D variables like x[i, j] or x_i_j; use 1D variables x[i] instead.\n"
            "Keep the original decision variables, constraints, and objective logic intact. "
            "Output ONLY valid, complete, executable Python code. No markdown formatting outside of python comments."
        )
        fixer_user = (
            f"Failing Python Code:\n```python\n{code}\n```\n\n"
            f"QA Audit Failure Reason:\n{last_failure}\n\n"
            f"Problem Pattern: {pattern}\n"
            f"Please repair the syntax/structural error and return the complete, corrected Python script."
        )

        try:
            repaired_code = await call_adapter(
                adapter_name=config.ADAPTER_QA_DEBUGGER,
                prompt=f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{fixer_system}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{fixer_user}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
                max_tokens=850,
                temperature=0.1,
                mlx_adapter_path=os.path.join(os.path.dirname(__file__), "../../../adapters/adapter_qa_debugger")
            )
            
            workspace.generated_code = repaired_code
            return AgentResult("PASS", 0.8, "Repaired code script generated.")
        except Exception as e:
            if "AI engine is under maintenance" in str(e):
                return AgentResult("FAIL", 0.0, "AI engine is under maintenance, please try after few minutes")
            return AgentResult("FAIL", 0.0, f"Repair agent failed: {e}")


# ── 8. Explanation Agent (Business Result Interpreter) ──────────────────
class ExplanationAgent(Agent):
    def __init__(self):
        super().__init__("ExplanationAgent")

    async def run(self, workspace: Workspace) -> AgentResult:
        try:
            analysis_system = (
                "You are the Bit2Qubit Quantum Guru assistant. Analyze the optimization problem, selected solver, feasibility details, and generated solver code.\n"
                "Provide a professional, confident, and expert explanation in the Bit2Qubit brand voice. Keep it under 220 words. Focus on the mathematical formulation structure and the expected business outcome."
            )
            # V7.0: Truncate extremely large generated fallback code to prevent context window / timeout errors on Groq
            code_summary = workspace.generated_code or ""
            if len(code_summary) > 2000:
                code_summary = code_summary[:1000] + "\n\n... [TRUNCATED FOR BREVITY] ...\n\n" + code_summary[-1000:]

            analysis_user = (
                f"Business problem: {workspace.problem_text}\n"
                f"Selected solver: {workspace.solver_strategy}\n"
                f"Feasibility trace: {workspace.verification.get('reasoning_trace') if workspace.verification else ''}\n"
                f"Generated code:\n{code_summary}"
            )
            
            explanation = await call_groq_llama70b(
                system=analysis_system,
                user=analysis_user,
                max_tokens=400,
                temperature=0.3,
            )
            
            if not workspace.execution_result:
                workspace.execution_result = {}
            workspace.execution_result["interpretation"] = explanation
            workspace.confidence["Explanation"] = 0.95
            return AgentResult("PASS", 0.95, "Generated business explanation successfully.")
        except Exception as e:
            if "AI engine is under maintenance" in str(e):
                return AgentResult("FAIL", 0.0, "AI engine is under maintenance, please try after few minutes")
            return AgentResult("FAIL", 0.0, f"Explanation failed: {e}")


# ── Supervisor Agent (Orchestration Loop) ──────────────────────────────
class SupervisorAgent:
    def __init__(self):
        self.retry_limits = {
            "UnderstandingAgent": 3,
            "ConstraintVerificationAgent": 3,
            "CodeGenerationAgent": 3,
            "RepairAgent": 5,
            "ExecutionAgent": 2
        }

    async def execute(self, problem_text: str, mode: str = "auto", session_id: str = None) -> Workspace:
        print(f"[Supervisor] Initializing shared workspace for new run...")
        workspace = Workspace(problem_text=problem_text)

        def update_session_steps(steps: dict):
            if not session_id or session_id in ("null", "undefined", "None"):
                return
            try:
                from pymongo import MongoClient
                from bson.objectid import ObjectId
                import os
                mongo_uri = os.environ.get("MONGODB_URI")
                if not mongo_uri:
                    return
                client = MongoClient(mongo_uri)
                db = client["test"]
                update_fields = {}
                for k, v in steps.items():
                    update_fields[f"workflowSteps.{k}"] = v
                db.chatsessions.update_one({"_id": ObjectId(session_id)}, {"$set": update_fields})
                client.close()
            except Exception as e:
                print(f"[MongoDB Update Error] Failed to update session {session_id}: {e}")

        def check_maintenance(res) -> bool:
            if getattr(res, "status", None) == "FAIL" and res.message and "AI engine is under maintenance" in res.message:
                workspace.generated_code = "# HALTED: AI engine is under maintenance, please try after few minutes"
                workspace.verification = {
                    "feasible": False,
                    "infeasibility_reason": "AI engine is under maintenance, please try after few minutes",
                    "reasoning_trace": "AI engine is under maintenance, please try after few minutes"
                }
                workspace.messages.append({"role": "system", "content": "AI engine is under maintenance, please try after few minutes"})
                return True
            return False

        understanding = UnderstandingAgent()
        modeling = ModelingAgent()
        verification = ConstraintVerificationAgent()
        strategy = SolverStrategyAgent(mode=mode)
        codegen = CodeGenerationAgent()
        execution = ExecutionAgent()
        repair = RepairAgent()
        explanation = ExplanationAgent()

        # Step 1: Understanding Agent
        attempt = 0
        while attempt < self.retry_limits["UnderstandingAgent"]:
            attempt += 1
            print(f"[Supervisor] Triggering UnderstandingAgent (Attempt {attempt})...")
            res = await understanding.run(workspace)
            workspace.history.append({"agent": "UnderstandingAgent", "attempt": attempt, "result": asdict(res)})
            if check_maintenance(res):
                return workspace
            if res.status == "PASS":
                break
        else:
            workspace.messages.append({"role": "system", "content": "Understanding Agent failed parsing specs."})
            return workspace

        parsed_math = json.dumps(workspace.problem_specification) if workspace.problem_specification else ""
        pat = workspace.problem_specification.get("problem_pattern", "unknown") if workspace.problem_specification else "unknown"
        update_session_steps({"nlp": parsed_math, "classifier": "Pattern: " + pat})

        # Step 2: Modeling Agent
        print(f"[Supervisor] Triggering ModelingAgent...")
        res = await modeling.run(workspace)
        workspace.history.append({"agent": "ModelingAgent", "attempt": 1, "result": asdict(res)})
        if check_maintenance(res):
            return workspace
        if res.status != "PASS":
            workspace.messages.append({"role": "system", "content": "Modeling Agent failed IR mapping."})
            return workspace

        parsed_math = json.dumps(workspace.problem_specification) if workspace.problem_specification else ""
        update_session_steps({"nlp": parsed_math})

        # Step 3: Constraint Verification Agent
        attempt = 0
        is_feasible = True
        while attempt < self.retry_limits["ConstraintVerificationAgent"]:
            attempt += 1
            print(f"[Supervisor] Triggering ConstraintVerificationAgent (Attempt {attempt})...")
            res = await verification.run(workspace)
            workspace.history.append({"agent": "ConstraintVerificationAgent", "attempt": attempt, "result": asdict(res)})
            if check_maintenance(res):
                return workspace
            if res.status == "PASS":
                break
            elif res.status == "FAIL":
                is_feasible = False
                break
        else:
            workspace.messages.append({"role": "system", "content": "Verification Agent failed feasibility checks."})
            return workspace

        # Halt on mathematical infeasibility
        if not is_feasible:
            print("[Supervisor] Constraint Verification Agent detected mathematical infeasibility. Halting execution.")
            reason = workspace.verification.get("infeasibility_reason", "Mathematical infeasibility detected.") if workspace.verification else "Mathematical infeasibility detected."
            workspace.generated_code = f"# HALTED: Problem is mathematically infeasible.\n# Reason: {reason}"
            workspace.messages.append({"role": "system", "content": f"Execution halted: {reason}"})
            # Trigger explanation directly
            await explanation.run(workspace)
            update_session_steps({
                "reasoner": workspace.verification.get("reasoning_trace", "") if workspace.verification else "",
                "solver": "none",
                "verifier": f"Verification: Problem is mathematically infeasible\nReason: {reason}"
            })
            return workspace

        update_session_steps({"reasoner": workspace.verification.get("reasoning_trace", "") if workspace.verification else ""})

        # Step 4: Solver Strategy Agent
        print(f"[Supervisor] Triggering SolverStrategyAgent...")
        res = await strategy.run(workspace)
        workspace.history.append({"agent": "SolverStrategyAgent", "attempt": 1, "result": asdict(res)})
        if check_maintenance(res):
            return workspace

        update_session_steps({"suggestor": "Decision: " + (workspace.solver_strategy or "OR-Tools")})

        # Step 5: Code Generation Agent & Repair loop
        codegen_attempt = 0
        code_ok = False
        while codegen_attempt < self.retry_limits["CodeGenerationAgent"]:
            codegen_attempt += 1
            print(f"[Supervisor] Triggering CodeGenerationAgent (Attempt {codegen_attempt})...")
            res = await codegen.run(workspace)
            workspace.history.append({"agent": "CodeGenerationAgent", "attempt": codegen_attempt, "result": asdict(res)})
            if check_maintenance(res):
                return workspace

            if res.status == "PASS":
                # Verify generated code using ExecutionAgent
                print(f"[Supervisor] Triggering ExecutionAgent (Sandbox check)...")
                exec_res = await execution.run(workspace)
                workspace.history.append({"agent": "ExecutionAgent", "attempt": 1, "result": asdict(exec_res)})

                if exec_res.status == "PASS":
                    code_ok = True
                    break
                else:
                    # Fail/Retry path -> trigger RepairAgent loop
                    repair_attempt = 0
                    while repair_attempt < self.retry_limits["RepairAgent"]:
                        repair_attempt += 1
                        print(f"[Supervisor] Triggering RepairAgent (Attempt {repair_attempt})...")
                        rep_res = await repair.run(workspace)
                        workspace.history.append({"agent": "RepairAgent", "attempt": repair_attempt, "result": asdict(rep_res)})
                        if check_maintenance(rep_res):
                            return workspace

                        if rep_res.status == "PASS":
                            # Re-verify code
                            print(f"[Supervisor] Re-triggering ExecutionAgent (Sandbox verify)...")
                            exec_res = await execution.run(workspace)
                            workspace.history.append({"agent": "ExecutionAgent", "attempt": repair_attempt + 1, "result": asdict(exec_res)})
                            if exec_res.status == "PASS":
                                code_ok = True
                                break
                    if code_ok:
                        break

        # Fallback compiler logic using compile_compositional_ast
        if not code_ok:
            print("[Supervisor] Code generation/repair failed. Invoking deterministic DCC fallback...")
            active_ir = workspace.problem_specification if workspace.problem_specification else {}
            active_ir["problem_text"] = workspace.problem_text
            try:
                dcc_code = compile_compositional_ast(active_ir, force_solver=workspace.solver_strategy)
            except Exception as compile_err:
                dcc_code = f"# Fallback compiler failed: {compile_err}"

            audit_res = audit_cqm_code(dcc_code, []) if workspace.solver_strategy == "CQM" else audit_ortools_code(dcc_code)
            final_code = (
                "# ⚠️  GENERATIVE CODE REJECTED BY QA AUDIT\n"
                f"# ✅ DCC DETERMINISTIC FALLBACK ACTIVE ({workspace.solver_strategy} V7.0)\n\n"
                + dcc_code
                + f"\n\n# QA TRACE: {audit_res}"
            )
            workspace.generated_code = final_code
        else:
            # Append audit result trace to generated code
            audit_res = audit_cqm_code(workspace.generated_code, []) if workspace.solver_strategy == "CQM" else audit_ortools_code(workspace.generated_code)
            workspace.generated_code += f"\n\n# QA TRACE: {audit_res}"

        verifier_text = "Verification: Code passed QA audit" if (workspace.generated_code and "QA TRACE: PASS" in workspace.generated_code) else "Verification: Deterministic fallback applied"
        update_session_steps({
            "solver": (workspace.solver_strategy or "OR-Tools") + " Solver",
            "verifier": verifier_text
        })

        # Step 6: Explanation Agent
        print(f"[Supervisor] Triggering ExplanationAgent...")
        res = await explanation.run(workspace)
        workspace.history.append({"agent": "ExplanationAgent", "attempt": 1, "result": asdict(res)})
        if check_maintenance(res):
            return workspace

        return workspace
