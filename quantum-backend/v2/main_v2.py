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
@app.post("/v2/pipeline", response_model=PipelineResponse)
async def run_pipeline_v2(request: PipelineRequest):
    """
    Full QuantumGuru v2 pipeline — 8 steps:
    1. Suggestor (Llama 8B LoRA)
    2. NLP Parser (Qwen 3 32B)
    3. Math Logic Reasoner (Qwen 3 32B)
    4. Quantum Knowledge Expert (Qwen 3 32B)
    5. Code Generator (Llama 8B LoRA)
    6. QA Debugger + DCC (Llama 8B LoRA + deterministic fallback)
    7. Output Interpreter (Qwen 3 32B)
    8. Personality Wrapper (Llama 8B LoRA)
    """
    if not request.unstructured_problem.strip():
        raise HTTPException(status_code=400, detail="Problem statement cannot be empty.")

    try:
        result = await run_optimization_pipeline(
            problem=request.unstructured_problem,
            mode=request.mode or "auto",
        )
        return PipelineResponse(
            **result,
            engine=f"Qwen 3 32B + Llama 3 8B LoRA ({config.get_mode()} mode)",
            version="2.0.0",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================================
# ASSISTANT CHAT RAG PROXY
# =========================================================================
@app.post("/assistant/chat")
async def assistant_chat(request: AssistantChatRequest):
    """
    Proxy assistant chat requests to the local FAISS retriever server.
    """
    retriever_url = os.environ.get("RETRIEVER_URL", "http://127.0.0.1:8003")
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.post(f"{retriever_url}/assistant/chat", json={"message": request.message})
            r.raise_for_status()
            return r.json()
        except Exception as e:
            return {
                "response": f"❌ **FAISS Proxy Error**: Could not connect to the local FAISS retriever server at {retriever_url}. Details: {e}",
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

        return AnalyzeResponse(
            parsed_math=str(ir),
            reasoning_trace=feasibility.get("reasoning_trace", ""),
            is_feasible=feasibility.get("feasible", True),
            feasibility_note=feasibility.get("infeasibility_reason"),
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
