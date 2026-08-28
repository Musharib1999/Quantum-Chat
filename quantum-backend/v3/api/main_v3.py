"""
OptiOS Web Backend Gateway — FastAPI Server
Exposes route gateways and proxies computational/AI jobs to the Quantum AI Engine.
"""
import os
import sys
import httpx
import json
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Union, Dict, Any

# Add parent directory to path so config imports resolve properly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
# =========================================================================
# DATABASE / LOGGING SETUP
# =========================================================================
import motor.motor_asyncio
from datetime import datetime

MONGODB_URI = os.environ.get("MONGODB_URI", "")
db_client = None
db = None

if MONGODB_URI:
    try:
        db_client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
        db = db_client.get_default_database()
        if db is None:
            db = db_client["test"]
        print("[Gateway DB] Connected to MongoDB Atlas successfully")
    except Exception as e:
        print(f"[Gateway DB] MongoDB connection failed: {e}")

async def write_system_log(log_type: str, user_id: Optional[str], message: str, metadata: dict):
    if db is not None:
        try:
            log_doc = {
                "service": "backend",
                "logType": log_type,
                "userId": user_id,
                "message": message,
                "metadata": metadata,
                "timestamp": datetime.utcnow()
            }
            await db["systemlogs"].insert_one(log_doc)
        except Exception as e:
            print(f"[Gateway Logger] Error writing system log: {e}")


# =========================================================================
# CONCURRENCY CONFIG
# =========================================================================
import asyncio as _asyncio

# Limits simultaneous optimization pipeline executions to prevent RunPod
# VRAM saturation. Tune via MAX_PIPELINE_SLOTS env var.
# A100 80GB (FP8): 8 slots. A100 40GB (FP8): 4 slots. L40S: 3 slots.
_MAX_SLOTS = int(os.environ.get("MAX_PIPELINE_SLOTS", "1"))
pipeline_semaphore = _asyncio.Semaphore(_MAX_SLOTS)

# Engine URL for internal proxying
ENGINE_URL = os.environ.get("QUANTUM_ENGINE_URL", "http://localhost:8003")

# =========================================================================
# APP SETUP
# =========================================================================
app = FastAPI(
    title="OptiOS API Gateway",
    description="Decoupled API gateway routing user requests to the local services.",
    version="2.0.0",
)

# CORS: restricted to known frontend origins.
# Add additional origins via ALLOWED_ORIGINS env var (comma-separated).
_default_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://optios.vercel.app",
]
_extra = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
_allowed_origins = _default_origins + _extra

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Session-ID"],
)

# =========================================================================
# REQUEST / RESPONSE MODELS
# =========================================================================
class PipelineRequest(BaseModel):
    unstructured_problem: str = Field(..., min_length=1, max_length=5000)
    email: Optional[str] = None
    mode: Optional[str] = "auto"   # auto | cqm | qubo | ortools
    session_id: Optional[str] = None
    penalty_choice: Optional[int] = 3  # 1-6 preset or >6 = custom raw value


class PipelineResponse(BaseModel):
    parsed_math: str
    reasoning_trace: str
    knowledge_context: str
    final_code: str
    interpretation: str
    personality_response: str
    suggested_solver: str
    solver_rationale: str
    success: bool
    engine: str
    version: str


class AssistantChatRequest(BaseModel):
    message: str
    email: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    system_prompt: Optional[str] = "You are the Quantum Guru, an expert quantum computing assistant."
    email: Optional[str] = None

class AnalyzeRequest(BaseModel):
    unstructured_problem: str
    email: Optional[str] = None


class AnalyzeResponse(BaseModel):
    parsed_math: str
    reasoning_trace: str
    is_feasible: bool
    feasibility_note: Optional[str] = None
    suggested_solver: Optional[str] = None


class ExecutionRequest(BaseModel):
    code: str
    hardware_id: Optional[str] = None
    email: Optional[str] = None


class ExecutionResponse(BaseModel):
    output: str
    error: Optional[str] = None
    success: bool


class CodeGenRequest(BaseModel):
    unstructured_problem: str
    mode: Optional[str] = "auto"
    email: Optional[str] = None  # auto | cqm | qubo | ortools


class CodeGenResponse(BaseModel):
    suggested_solver: str         # "dwave" | "qiskit" | "ortools"
    final_code: str               # The executable python script block
    success: bool
    error_message: Optional[str] = None


class FinalizeRequest(BaseModel):
    unstructured_problem: str
    raw_results: Union[list, dict]
    email: Optional[str] = None  # Accepts simulator output array/object


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
        "status": "OptiOS API Gateway Running",
        "version": "2.0.0",
        "mode": config.get_mode(),
        "qwen_connected": bool(config.QWEN_BASE_URL),
        "llama_connected": bool(config.LLAMA_BASE_URL),
        "hf_repo": config.HF_REPO,
        "endpoints": {
            "pipeline": "/v3/pipeline",
            "finalize": "/v3/finalize",
            "health": "/v3/health",
            "v1_compat": "/enterprise/pipeline",
            "analyze": "/enterprise/analyze",
            "chat": "/assistant/chat",
            "execute": "/v2/execute"
        }
    }


@app.get("/v3/health")
def health():
    return {
        "status": "ok",
        "qwen_base_url": config.QWEN_BASE_URL or "NOT SET",
        "llama_base_url": config.LLAMA_BASE_URL or "NOT SET",
        "runtime_mode": config.get_mode(),
    }


# =========================================================================
# SCENARIO 1 ─ Business Problem to Optimization Pipeline
# =========================================================================
@app.post("/v3/pipeline", response_model=CodeGenResponse)
async def run_pipeline_v2(request: CodeGenRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(write_system_log, "api_request", request.email, "POST /v3/pipeline - Received optimization request", {"mode": request.mode})
    """
    Full OptiOS v2 pipeline. Proxies call to isolated Quantum AI Engine.
    """
    if not request.unstructured_problem or not request.unstructured_problem.strip():
        return CodeGenResponse(
            suggested_solver="none",
            final_code="",
            success=False,
            error_message="Problem statement cannot be empty."
        )

    try:
        payload = request.model_dump() if hasattr(request, "model_dump") else request.dict()
        async with httpx.AsyncClient(timeout=180.0) as client:
            res = await client.post(f"{ENGINE_URL}/engine/run", json=payload)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
            result = res.json()
        
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
# RESULTS FINALIZE AND INTERPRETATION (POST /v3/finalize)
# =========================================================================
@app.post("/v3/finalize", response_model=FinalizeResponse)
async def finalize_results(request: FinalizeRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(write_system_log, "api_request", request.email, "POST /v3/finalize - Received optimization finalize request", {})
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
        payload = request.model_dump() if hasattr(request, "model_dump") else request.dict()
        async with httpx.AsyncClient(timeout=180.0) as client:
            res = await client.post(f"{ENGINE_URL}/engine/v3/finalize", json=payload)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
            data = res.json()
            
        return FinalizeResponse(
            final_interpretation=data.get("final_interpretation", ""),
            variables_assigned=data.get("variables_assigned", {}),
            success=data.get("success", False)
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
async def assistant_chat(request: AssistantChatRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(write_system_log, "api_request", request.email, f"POST /assistant/chat - RAG search: {request.message[:40]}...", {})
    """
    Query the local FAISS retriever in the AI Engine.
    """
    try:
        payload = request.model_dump() if hasattr(request, "model_dump") else request.dict()
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(f"{ENGINE_URL}/engine/assistant/chat", json=payload)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
            return res.json()
    except Exception as e:
        return {
            "response": f"❌ **Gateway Proxy Error**: {e}",
            "success": False,
            "score": 0.0
        }


@app.post("/v2/chat")
async def general_chat(request: ChatRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(write_system_log, "api_request", request.email, f"POST /v2/chat - General chat: {request.message[:40]}...", {})
    """
    Directly query the primary reasoning model (Qwen or Llama via Groq).
    """
    try:
        payload = request.model_dump() if hasattr(request, "model_dump") else request.dict()
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(f"{ENGINE_URL}/engine/v2/chat", json=payload)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
            return res.json()
    except Exception as e:
        return {
            "response": f"❌ **Gateway Proxy Error**: {e}",
            "success": False
        }

# =========================================================================
# V1 COMPATIBILITY ─ Optimization coach analyze endpoint
# =========================================================================
@app.post("/enterprise/analyze", response_model=AnalyzeResponse)
async def enterprise_analyze(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(write_system_log, "api_request", request.email, "POST /enterprise/analyze - Feasibility check request", {})
    """
    Extract math parameters and verify mathematical feasibility.
    Used by OptimizationCoach frontend.
    """
    if not request.unstructured_problem.strip():
        raise HTTPException(status_code=400, detail="Problem statement cannot be empty.")

    try:
        payload = request.model_dump() if hasattr(request, "model_dump") else request.dict()
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(f"{ENGINE_URL}/engine/enterprise/analyze", json=payload)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
            data = res.json()
            
        return AnalyzeResponse(
            parsed_math=data.get("parsed_math", ""),
            reasoning_trace=data.get("reasoning_trace", ""),
            is_feasible=data.get("is_feasible", True),
            feasibility_note=data.get("feasibility_note"),
            suggested_solver=data.get("suggested_solver", "OR-Tools"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================================
# STREAMING PIPELINE (POST /v3/enterprise/pipeline/stream)
# =========================================================================
@app.post("/v3/enterprise/pipeline/stream")
async def run_pipeline_stream(request: PipelineRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(write_system_log, "api_request", request.email, "POST /v3/enterprise/pipeline/stream - Started optimization stream", {"session_id": request.session_id})
    """
    Streamed pipeline execution. Proxies to the isolated Quantum AI Engine.
    Guarded by pipeline_semaphore to prevent VRAM exhaustion on RunPod.
    """
    async def event_generator():
        async with pipeline_semaphore:
            try:
                # Proxy the stream request to the engine
                payload = request.model_dump() if hasattr(request, "model_dump") else request.dict()
                async with httpx.AsyncClient(timeout=300.0) as client:
                    async with client.stream(
                        "POST", 
                        f"{ENGINE_URL}/engine/stream", 
                        json=payload
                    ) as response:
                        if response.status_code != 200:
                            yield f"data: {json.dumps({'event': 'error', 'message': f'Engine error status {response.status_code}'})}\n\n"
                            return
                        async for line in response.aiter_lines():
                            if line:
                                yield f"{line}\n\n"
            except Exception as err:
                yield f"data: {json.dumps({'event': 'error', 'message': f'Gateway proxy failure: {str(err)}'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# V1 COMPATIBILITY ─ Same endpoint as main.py for zero frontend changes
# =========================================================================
@app.post("/enterprise/pipeline")
async def run_pipeline_v1_compat(request: PipelineRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(write_system_log, "api_request", request.email, "POST /enterprise/pipeline - Received compat optimization request", {})
    """
    Backward-compatible v1 endpoint. Routes to the decoupled AI Engine internally.
    """
    async with pipeline_semaphore:
        payload = request.model_dump() if hasattr(request, "model_dump") else request.dict()
        async with httpx.AsyncClient(timeout=180.0) as client:
            res = await client.post(f"{ENGINE_URL}/engine/run", json=payload)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
            result = res.json()
            
    # Return v1-compatible format
    return {
        "latex_model": result.get("latex_model", ""),
        "parsed_math": result.get("parsed_math", ""),
        "reasoning_trace": result.get("reasoning_trace", ""),
        "final_code": result.get("final_code", ""),
        "success": result.get("success", False),
        "suggested_solver": result.get("suggested_solver", "OR-Tools"),
        "solver_rationale": result.get("solver_rationale", ""),
        "interpretation": result.get("interpretation", ""),
        "personality_response": result.get("personality_response", ""),
        "knowledge_context": result.get("knowledge_context", ""),
        "pattern": result.get("pattern", ""),
        "engine": "QuantumEngine-V5",
        "version": "5.0.0",
        "dcc": result.get("dcc", False),
        "optimization_stats": result.get("optimization_stats", {}),
        "solver_routing": result.get("solver_routing", {}),
        "qa_report": result.get("qa_report", {}),
        "compiler_metrics": result.get("compiler_metrics", {}),
        "q_matrix_preview": result.get("q_matrix_preview", ""),
    }


# =========================================================================
# CODE EXECUTION (POST /v2/execute)
# =========================================================================
@app.post("/v2/execute", response_model=ExecutionResponse)
async def execute_code(request: ExecutionRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(write_system_log, "api_request", request.email, "POST /v2/execute - Received sandbox code run request", {})
    """
    Execute Python solver code in the isolated engine.
    """
    if not request.code.strip():
        return ExecutionResponse(
            output="",
            error="No code provided for execution.",
            success=False
        )

    try:
        payload = request.model_dump() if hasattr(request, "model_dump") else request.dict()
        async with httpx.AsyncClient(timeout=90.0) as client:
            res = await client.post(f"{ENGINE_URL}/engine/v2/execute", json=payload)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
            data = res.json()
            
        return ExecutionResponse(
            output=data.get("output", ""),
            error=data.get("error"),
            success=data.get("success", False)
        )
    except Exception as e:
        return ExecutionResponse(
            output="",
            error=f"Execution proxy failed: {str(e)}",
            success=False
        )



# =========================================================================
# DIRECT OPTIMIZATION MODEL PIPELINE GATEWAY
# =========================================================================
class DirectModelRequest(BaseModel):
    model_text: str = Field(..., min_length=10, max_length=200000)
    penalty_choice: Optional[int] = 3
    num_reads: Optional[int] = 5000
    email: Optional[str] = None
    session_id: Optional[str] = None
    run_solver: Optional[bool] = False

@app.post("/v3/direct-model/stream")
async def direct_model_stream(request: DirectModelRequest, background_tasks: BackgroundTasks):
    """
    Gateway proxy for the Direct Optimization Model streaming pipeline.
    Forwards to engine /engine/direct-model/stream and relays SSE events.
    """
    background_tasks.add_task(
        write_system_log, "api_request", request.email,
        "POST /v3/direct-model/stream - Direct model pipeline started",
        {"penalty_choice": request.penalty_choice, "num_reads": request.num_reads}
    )

    async def event_generator():
        async with pipeline_semaphore:
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0), verify=False) as client:
                    async with client.stream(
                        "POST",
                        f"{ENGINE_URL}/engine/direct-model/stream",
                        json=request.model_dump(),
                        headers={"Content-Type": "application/json"},
                    ) as resp:
                        async for line in resp.aiter_lines():
                            if line.startswith("data: "):
                                yield f"{line}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'step': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

class GateModelRequest(BaseModel):
    model_text: str = Field(..., min_length=10, max_length=200000)
    shots: Optional[int] = 5000
    email: Optional[str] = None
    session_id: Optional[str] = None
    run_simulator: Optional[bool] = False

@app.post("/v3/gate-model/stream")
async def gate_model_stream(request: GateModelRequest, background_tasks: BackgroundTasks):
    """
    Gateway proxy for the Gate-Based Quantum Compiler streaming pipeline.
    """
    background_tasks.add_task(
        write_system_log, "api_request", request.email,
        "POST /v3/gate-model/stream - Gate-based model pipeline started",
        {"shots": request.shots}
    )

    async def event_generator():
        async with pipeline_semaphore:
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0), verify=False) as client:
                    async with client.stream(
                        "POST",
                        f"{ENGINE_URL}/engine/gate-model/stream",
                        json=request.model_dump(),
                        headers={"Content-Type": "application/json"},
                    ) as resp:
                        async for line in resp.aiter_lines():
                            if line.startswith("data: "):
                                yield f"{line}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'step': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )



# =========================================================================
# QUANTUM CHEMISTRY ENGINE ROUTE
# =========================================================================
class ChemistryRequest(BaseModel):
    user_prompt: Optional[str] = ""
    representation: Optional[str] = "explicit"
    smiles_string: Optional[str] = "[H][H]"
    atoms: Optional[list] = []
    basis: Optional[str] = "sto-3g"
    ansatz: Optional[str] = "realamplitudes"
    charge: Optional[int] = 0
    spin: Optional[int] = 0

@app.post("/v3/enterprise/chemistry/solve")
async def solve_chemistry_endpoint(req: ChemistryRequest):
    try:
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from engine.chemistry_engine import solve_quantum_chemistry
        manifest = solve_quantum_chemistry(req.model_dump())
        return {"success": True, "manifest": manifest}
    except Exception as e:
        print(f"[Chemistry Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

class QMLRequest(BaseModel):
    user_prompt: Optional[str] = "Iris"
    dataset_name: Optional[str] = "Iris"
    task: Optional[str] = "classification"
    max_qubits: Optional[int] = 4

@app.post("/v3/enterprise/qml/solve")
async def solve_qml_endpoint(req: QMLRequest):
    try:
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from engine.qml_engine import solve_qml_experiment
        manifest = solve_qml_experiment(req.model_dump())
        return {"success": True, "manifest": manifest}
    except Exception as e:
        print(f"[QML Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

class QMLPredictRequest(BaseModel):
    dataset_name: Optional[str] = "Iris"
    user_prompt: Optional[str] = None
    features: Optional[list[float]] = None
    feature_dict: Optional[dict[str, float]] = None
    weights: Optional[list[float]] = None

@app.post("/v3/enterprise/qml/predict")
async def predict_qml_endpoint(req: QMLPredictRequest):
    try:
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from engine.qml_engine import predict_qml_sample
        result = predict_qml_sample(req.model_dump())
        return {"success": True, "prediction": result}
    except Exception as e:
        print(f"[QML Predict Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================================
# RUN (for local testing)
# =========================================================================
if __name__ == "__main__":
    import argparse
    import uvicorn

    parser = argparse.ArgumentParser(description="OptiOS Backend Gateway")
    parser.add_argument("--workers", type=int, default=1,
                        help="Number of uvicorn worker processes (default: 1 for local dev)")
    args = parser.parse_args()

    port = int(os.environ.get("PORT", 8002))
    workers = int(os.environ.get("UVICORN_WORKERS", args.workers))

    print(f"\nOptiOS API Gateway starting on port {port} ({workers} worker(s))")
    print(f"Proxying Engine: {ENGINE_URL}\n")

    uvicorn.run(
        "main_v3:app",
        host="0.0.0.0",
        port=port,
        workers=workers,
        reload=False,
        log_level="info",
    )


# =====================================================================
# QUANTUM GURU IDE: 33-TOOL AGENT & DIRECT TOOL INVOCATION ENDPOINTS
# (Additive only - Existing 7 studio pipelines remain 100% frozen)
# =====================================================================
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from engine.tools.registry import invoke_quantum_tool, get_all_tool_schemas, TOOL_DISPATCH_TABLE

class IDEToolInvokeRequest(BaseModel):
    tool_name: str
    params: dict[str, Any] = Field(default_factory=dict)

@app.post("/v3/enterprise/ide/tools/invoke")
async def invoke_ide_tool_endpoint(req: IDEToolInvokeRequest):
    """
    Direct execution gateway for any of the 33 Quantum AI Tools.
    """
    try:
        result = invoke_quantum_tool(req.tool_name, req.params)
        return {
            "success": True,
            "tool_name": req.tool_name,
            "result": result
        }
    except Exception as e:
        logger.error(f"Tool execution failed for {req.tool_name}: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/v3/enterprise/ide/tools/schemas")
async def get_ide_tool_schemas_endpoint():
    """
    Returns OpenAI/Groq/RunPod function calling schemas for all 33 tools.
    """
    return {
        "total_tools": len(TOOL_DISPATCH_TABLE),
        "tools": get_all_tool_schemas()
    }
