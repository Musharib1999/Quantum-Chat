"""
QuantumGuru Engine v2 — Main FastAPI Server
Exposes /v2/pipeline (Scenario 1: Business Problem → Solver Code)

Designed to be backward-compatible with v1 frontend.
Same endpoint format, richer response payload.
"""
import os
import sys
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# Add parent to path so v2 imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from v2 import config
from v2.pipelines.optimization import run_optimization_pipeline
from v2.retriever import VectorRetriever

# =========================================================================
# APP SETUP
# =========================================================================
app = FastAPI(
    title="QuantumGuru Engine v2",
    description=(
        "Hybrid pipeline: Qwen 3 32B (reasoning) + Llama 3 8B LoRA (specialized)\n"
        "Scenarios: Business Optimization | Quantum Q&A | Code Generation"
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Vector Retriever globally
print("Initializing Vector Retriever globally...")
retriever = VectorRetriever()
print("Retriever initialization complete.")

# =========================================================================
# REQUEST / RESPONSE MODELS
# =========================================================================
class PipelineRequest(BaseModel):
    unstructured_problem: str
    mode: Optional[str] = "auto"   # auto | cqm | qubo | ortools


class PipelineResponse(BaseModel):
    # Core pipeline outputs
    parsed_math: str
    reasoning_trace: str
    knowledge_context: str
    final_code: str
    interpretation: str
    personality_response: str
    # Metadata
    suggested_solver: str
    solver_rationale: str
    success: bool
    # Runtime info
    engine: str
    version: str


class AssistantChatRequest(BaseModel):
    message: str


class AnalyzeRequest(BaseModel):
    unstructured_problem: str


class AnalyzeResponse(BaseModel):
    parsed_math: str
    reasoning_trace: str
    is_feasible: bool
    feasibility_note: Optional[str] = None
    suggested_solver: Optional[str] = None


class ExecutionRequest(BaseModel):
    code: str
    hardware_id: Optional[str] = None


class ExecutionResponse(BaseModel):
    output: str
    error: Optional[str] = None
    success: bool


# ── New Integration Specs Models ──────────────────────────────────────────
class CodeGenRequest(BaseModel):
    unstructured_problem: str
    mode: Optional[str] = "auto"  # auto | cqm | qubo | ortools


class CodeGenResponse(BaseModel):
    suggested_solver: str         # "dwave" | "qiskit" | "ortools"
    final_code: str               # The executable python script block
    success: bool
    error_message: Optional[str] = None


class FinalizeRequest(BaseModel):
    unstructured_problem: str
    raw_results: list             # The raw sample data array returned from simulator


class FinalizeResponse(BaseModel):
    final_interpretation: str     # Polished business insights explanation
    variables_assigned: dict      # E.g., {"route_A": 100, "route_B": 0}
    success: bool


# =========================================================================
# HEALTH + ROOT
# =========================================================================
@app.get("/")
def root():
    return {
        "status": "QuantumGuru Engine v2 Running",
        "version": "2.0.0",
        "mode": config.get_mode(),
        "qwen_connected": bool(config.QWEN_BASE_URL),
        "llama_connected": bool(config.LLAMA_BASE_URL),
        "groq_fallback": bool(config.GROQ_API_KEY),
        "hf_repo": config.HF_REPO,
        "endpoints": {
            "pipeline": "/v2/pipeline",
            "finalize": "/v2/finalize",
            "health": "/v2/health",
            "v1_compat": "/enterprise/pipeline",
            "analyze": "/enterprise/analyze",
            "chat": "/assistant/chat",
        }
    }


@app.get("/v2/health")
def health():
    return {
        "status": "ok",
        "qwen_base_url": config.QWEN_BASE_URL or "NOT SET (using Groq fallback)",
        "llama_base_url": config.LLAMA_BASE_URL or "NOT SET (using MLX fallback)",
        "groq_key_set": bool(config.GROQ_API_KEY),
        "runtime_mode": config.get_mode(),
    }


# =========================================================================
# SCENARIO 1 ─ Business Problem to Optimization Pipeline
# =========================================================================
@app.post("/v2/pipeline", response_model=CodeGenResponse)
async def run_pipeline_v2(request: CodeGenRequest):
    """
    Full QuantumGuru v2 pipeline conforming to the new integration contract.
    """
    if not request.unstructured_problem or not request.unstructured_problem.strip():
        return CodeGenResponse(
            suggested_solver="none",
            final_code="",
            success=False,
            error_message="Problem statement cannot be empty."
        )

    try:
        result = await run_optimization_pipeline(
            problem=request.unstructured_problem,
            mode=request.mode or "auto",
        )
        
        # Check if mathematically infeasible
        if not result.get("success", False):
            error_msg = result.get("reasoning_trace", "")
            if "[SYSTEM HALT]:" in error_msg:
                error_msg = error_msg.split("[SYSTEM HALT]:")[-1].strip()
            if not error_msg:
                error_msg = "Mathematical infeasibility detected."
                
            return CodeGenResponse(
                suggested_solver="none",
                final_code=result.get("final_code", ""),
                success=False,
                error_message=error_msg
            )
            
        decision = result.get("suggested_solver", "OR-Tools").lower()
        if "cqm" in decision or "qubo" in decision or "dwave" in decision:
            solver_mapped = "dwave"
        elif "qiskit" in decision:
            solver_mapped = "qiskit"
        else:
            solver_mapped = "ortools"
            
        return CodeGenResponse(
            suggested_solver=solver_mapped,
            final_code=result.get("final_code", ""),
            success=True,
            error_message=None
        )
    except Exception as e:
        return CodeGenResponse(
            suggested_solver="none",
            final_code="",
            success=False,
            error_message=f"Pipeline generation failed: {str(e)}"
        )


# =========================================================================
# RESULTS FINALIZE AND INTERPRETATION (POST /v2/finalize)
# =========================================================================
def validate_finalize(data: dict) -> list:
    """Validate parser/interpreter output for finalization."""
    errors = []
    if "final_interpretation" not in data:
        errors.append("Missing required key: final_interpretation")
    if "variables_assigned" not in data:
        errors.append("Missing required key: variables_assigned")
    elif not isinstance(data["variables_assigned"], dict):
        errors.append("variables_assigned must be a JSON object (dictionary)")
    return errors


@app.post("/v2/finalize", response_model=FinalizeResponse)
async def finalize_results(request: FinalizeRequest):
    """
    Interpret simulator results in context of the original business problem.
    """
    if not request.unstructured_problem or not request.unstructured_problem.strip():
        return FinalizeResponse(
            final_interpretation="Problem description is empty.",
            variables_assigned={},
            success=False
        )
        
    try:
        from v2.validators.json_schema import parse_and_validate
        from v2.qwen_client import call_qwen
        import json
        
        system_prompt = (
            "You are the QuantumGuru Results Finalizer. Your task is to interpret the raw solver/simulator "
            "output in the context of the original business problem.\n\n"
            "You MUST return ONLY a valid JSON object. No explanation. No markdown. No code blocks. Just raw JSON.\n\n"
            "JSON Schema (use EXACTLY these key names):\n"
            "{\n"
            "  \"final_interpretation\": \"Polished plain English explanation of the optimization results, including what was assigned and the overall business insights (max 150 words)\",\n"
            "  \"variables_assigned\": {\"variable_name\": value, ...}\n"
            "}\n\n"
            "Example response:\n"
            "{\n"
            "  \"final_interpretation\": \"The solver successfully optimized the driver shifts. All 5 routes have been covered with zero conflicts, minimizing total overtime cost to $450.\",\n"
            "  \"variables_assigned\": {\"x_0_0\": 1, \"x_1_1\": 1, \"x_2_2\": 1}\n"
            "}"
        )
        
        user_prompt = (
            f"Original Business Problem:\n{request.unstructured_problem}\n\n"
            f"Raw Simulator/Solver Results:\n{json.dumps(request.raw_results, indent=2)}\n\n"
            "Interpret the results, extract variable assignments, and return JSON."
        )
        
        raw_output = await call_qwen(
            system=system_prompt,
            user=user_prompt,
            max_tokens=600,
            temperature=0.1
        )
        
        final_data = await parse_and_validate(
            raw_output=raw_output,
            validator_fn=validate_finalize,
            call_fn=call_qwen,
            system=system_prompt,
            user=user_prompt,
            step_name="Results Finalizer"
        )
        
        if not final_data:
            raise ValueError("Failed to obtain valid JSON from Qwen.")
            
        return FinalizeResponse(
            final_interpretation=final_data["final_interpretation"],
            variables_assigned=final_data["variables_assigned"],
            success=True
        )
    except Exception as e:
        return FinalizeResponse(
            final_interpretation=f"Error finalizing results: {str(e)}",
            variables_assigned={},
            success=False
        )


# =========================================================================
# NATIVE ASSISTANT CHAT RAG
# =========================================================================
@app.post("/assistant/chat")
async def assistant_chat(request: AssistantChatRequest):
    """
    Query the local FAISS retriever directly.
    """
    try:
        # Perform retrieval
        hits = retriever.retrieve(request.message, k=3)
        if "error" in hits:
            return {
                "response": f"❌ **Retriever Error**: {hits['error']}",
                "success": False,
                "score": 0.0
            }
            
        if not hits:
            return {
                "response": "❌ No matching concepts or identity entries found in the database.",
                "success": False,
                "score": 0.0
            }
            
        # Apply 85% similarity threshold gate
        top_hit = hits[0]
        similarity = top_hit['score']
        if similarity < 0.85:
            return {
                "response": f"❌ No high-confidence match found in the local database (similarity: {similarity*100:.1f}%).",
                "success": False,
                "score": similarity
            }
            
        return {
            "response": top_hit['response'],
            "success": True,
            "score": similarity,
            "matched_prompt": top_hit['prompt']
        }
    except Exception as e:
        return {
            "response": f"❌ **FAISS Error**: {e}",
            "success": False,
            "score": 0.0
        }


# =========================================================================
# V1 COMPATIBILITY ─ Optimization coach analyze endpoint
# =========================================================================
@app.post("/enterprise/analyze", response_model=AnalyzeResponse)
async def enterprise_analyze(request: AnalyzeRequest):
    """
    Extract math parameters and verify mathematical feasibility (Steps 2 and 3).
    Used by OptimizationCoach frontend.
    """
    if not request.unstructured_problem.strip():
        raise HTTPException(status_code=400, detail="Problem statement cannot be empty.")

    try:
        from v2.prompts import nlp_parser as nlp_prompt
        from v2.prompts import reasoner as reasoner_prompt
        from v2.validators.json_schema import parse_and_validate, validate_nlp_parser, validate_reasoner
        from v2.qwen_client import call_qwen

        problem = request.unstructured_problem

        # ── Step 2: NLP Parser ────────────────────────────────────────────────
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
        if not ir:
            ir = {"entities_count": 5, "entities_name": "item", "slots_count": 3, "slots_name": "slot",
                  "capacity_val": None, "capacity_type": "upper_bound", "uniqueness_val": 1}

        # ── Step 3: Math Reasoner ─────────────────────────────────────────────
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

        # ── Step 1: Solver Suggestor ──────────────────────────────────────────
        suggestor_prompt = (
            "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
            "You are the QuantumGuru Solver Suggestor. Analyze the optimization problem "
            "and select the optimal solver. Options: CQM (D-Wave Leap Hybrid), "
            "QUBO (Quantum Annealer QPU), OR-Tools (Classical solver). "
            "Output ONLY the solver key name: CQM, QUBO, or OR-Tools."
            "<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
            f"Problem: {problem}\n\nSelect solver:"
            "<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
        )
        from v2.llama_client import call_adapter
        from v2 import config
        import os
        _ADAPTERS_BASE = os.path.join(os.path.dirname(__file__), "../../adapters")
        _PATH = lambda name: os.path.join(_ADAPTERS_BASE, name)
        
        try:
            suggestor_raw = await call_adapter(
                adapter_name=config.ADAPTER_SUGGESTOR,
                prompt=suggestor_prompt,
                max_tokens=20,
                temperature=0.1,
                mlx_adapter_path=_PATH("adapter_suggestor"),
            )
            suggestor_raw = suggestor_raw.strip().upper()
            if "CQM" in suggestor_raw:
                suggested = "CQM"
            elif "QUBO" in suggestor_raw:
                suggested = "QUBO"
            else:
                suggested = "OR-Tools"
        except Exception:
            suggested = "OR-Tools"

        return AnalyzeResponse(
            parsed_math=str(ir),
            reasoning_trace=feasibility.get("reasoning_trace", ""),
            is_feasible=feasibility.get("feasible", True),
            feasibility_note=feasibility.get("infeasibility_reason"),
            suggested_solver=suggested,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================================
# V1 COMPATIBILITY ─ Same endpoint as main.py for zero frontend changes
# =========================================================================
@app.post("/enterprise/pipeline")
async def run_pipeline_v1_compat(request: PipelineRequest):
    """
    Backward-compatible v1 endpoint. Routes to v2 pipeline internally.
    Frontend code pointing to /enterprise/pipeline works without changes.
    """
    result = await run_pipeline_v2(request)
    # Return v1-compatible format
    return {
        "parsed_math": result.parsed_math,
        "reasoning_trace": result.reasoning_trace,
        "final_code": result.final_code,
        "success": result.success,
        "suggested_solver": result.suggested_solver,
        "solver_rationale": result.solver_rationale,
        # v2 bonus fields
        "interpretation": result.interpretation,
        "personality_response": result.personality_response,
        "knowledge_context": result.knowledge_context,
        "engine": result.engine,
        "version": result.version,
    }


# =========================================================================
# CODE EXECUTION (POST /v2/execute)
# =========================================================================
@app.post("/v2/execute", response_model=ExecutionResponse)
async def execute_code(request: ExecutionRequest):
    """
    Execute Python solver code in an isolated subprocess.
    """
    if not request.code.strip():
        return ExecutionResponse(
            output="",
            error="No code provided for execution.",
            success=False
        )

    import tempfile
    import subprocess
    import sys
    
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tmp:
        tmp.write(request.code)
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            [sys.executable, tmp_path],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        output = result.stdout
        error_msg = None
        success = True

        if result.returncode != 0:
            error_msg = f"Runtime Error (Exit {result.returncode}):\n{result.stderr}"
            success = False
        elif result.stderr:
            output += "\n--- Warnings/Info ---\n" + result.stderr

    except subprocess.TimeoutExpired:
        error_msg = "Execution timed out (60s limit)."
        output = ""
        success = False
    except Exception as e:
        error_msg = f"Execution failed: {str(e)}"
        output = ""
        success = False
    finally:
        import os
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
    
    return ExecutionResponse(
        output=output if output else "",
        error=error_msg,
        success=success
    )


# =========================================================================
# RUN (for local testing: python main_v2.py)
# =========================================================================
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8002))
    print(f"\nQuantumGuru Engine v2 starting on port {port}")
    print(f"Mode: {config.get_mode()}")
    print(f"Qwen: {config.QWEN_BASE_URL or 'Groq fallback'}")
    print(f"Llama: {config.LLAMA_BASE_URL or 'MLX fallback'}\n")
    uvicorn.run("main_v2:app", host="0.0.0.0", port=port, reload=False)
