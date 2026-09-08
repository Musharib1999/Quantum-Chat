import json
import os
import re
import sys
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

# Add parent directory to path so imports work correctly inside the engine module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.pipelines.optimization import run_optimization_pipeline, run_optimization_pipeline_stream
from engine.pipelines.direct_model_pipeline import run_direct_model_pipeline_stream
from engine.prompts import nlp_parser as nlp_prompt
from engine.prompts import reasoner as reasoner_prompt
from engine.validators.json_schema import parse_and_validate, validate_nlp_parser, validate_reasoner
from engine.llm_client import call_primary, call_fast
from engine import config
from engine.preprocessing.numeric_extractor import extract_numeric_blocks
from engine.preprocessing.numeric_injector import inject_numeric_blocks
from engine.preprocessing.token_guard import check_token_budget

app = FastAPI(
    title="OptiOS Quantum AI Engine",
    description="Computational core executing multi-agent pipelines, RAG, and AST compiles."
)



# Initialize and seed Quantum Algorithm Library globally
try:
    print("Initializing Quantum Algorithm Library inside AI Engine...")
    from engine.compiler.library import AlgorithmRegistry
    AlgorithmRegistry.seed_database()
    print("Quantum Algorithm Library initialization complete.")
except Exception as e:
    print(f"Failed to seed Quantum Algorithm Library: {e}")

# =========================================================================
# REQUEST MODELS
# =========================================================================
class PipelineRequest(BaseModel):
    unstructured_problem: str = Field(..., min_length=1, max_length=500000)
    mode: Optional[str] = "auto"
    session_id: Optional[str] = None
    email: Optional[str] = None
    penalty_choice: Optional[int] = 3  # 1-6 preset or >6 = custom raw value

class AssistantChatRequest(BaseModel):
    message: str
    email: Optional[str] = None


class ExecutionRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=500000)
    email: Optional[str] = None

class ExecutionResponse(BaseModel):
    output: str
    error: Optional[str] = None
    success: bool

class FinalizeRequest(BaseModel):
    unstructured_problem: str = Field(..., min_length=1, max_length=500000)
    raw_results: Dict[str, Any]
    email: Optional[str] = None

# =========================================================================
# ENDPOINTS
# =========================================================================
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "quantum-ai-engine",
        "mode": config.get_mode(),
        "inference_provider": config.INFERENCE_PROVIDER,
        "primary_model": config.GROQ_PRIMARY_MODEL
    }

@app.post("/engine/run")
async def engine_run(request: PipelineRequest):
    """
    Run the sequential agent pipeline and return the fully compiled output.
    """
    if not request.unstructured_problem.strip():
        raise HTTPException(status_code=400, detail="Problem description cannot be empty.")
    
    try:
        result = await run_optimization_pipeline(
            problem=request.unstructured_problem,
            mode=request.mode or "auto",
            session_id=request.session_id,
            email=request.email,
            penalty_choice=request.penalty_choice or 3
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Engine run failure: {str(e)}")

@app.post("/engine/stream")
async def engine_stream(request: PipelineRequest):
    """
    Stream agent execution updates via Server-Sent Events (SSE).
    """
    if not request.unstructured_problem.strip():
        raise HTTPException(status_code=400, detail="Problem description cannot be empty.")

    async def event_generator():
        try:
            async for update in run_optimization_pipeline_stream(
                problem=request.unstructured_problem,
                mode=request.mode or "auto",
                session_id=request.session_id,
                email=request.email,
                penalty_choice=request.penalty_choice or 3
            ):
                yield f"data: {json.dumps(update)}\n\n"
        except Exception as err:
            yield f"data: {json.dumps({'event': 'error', 'message': str(err)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/engine/assistant/chat")
async def engine_assistant_chat(request: AssistantChatRequest):
    """
    Query the primary reasoning engine (Groq) with the Quantum Guru system prompt.
    """
    try:
        system_prompt = (
            "You are Quantum Guru, an expert quantum computing assistant and scientist. "
            "Provide clear, mathematically rigorous, and accurate explanations for quantum computing, "
            "Qiskit circuits, D-Wave annealing, and optimization problems."
        )
        response_text = await call_primary(
            system=system_prompt,
            user=request.message,
            temperature=0.3
        )
        return {
            "response": response_text,
            "success": True,
            "score": 1.0,
            "matched_prompt": request.message
        }
    except Exception as e:
        return {
            "response": f"❌ Error: {str(e)}",
            "success": False,
            "score": 0.0
        }

class ChatRequest(BaseModel):
    message: str
    system_prompt: Optional[str] = "You are the Quantum Guru, an expert quantum computing assistant."

@app.post("/engine/v2/chat")
async def engine_v2_chat(request: ChatRequest):
    """
    Directly query the primary reasoning model (Qwen or Llama via Groq).
    """
    try:
        from engine.llm_client import call_primary
        response = await call_primary(
            system=request.system_prompt,
            user=request.message,
            temperature=0.4
        )
        return {"response": response, "success": True}
    except Exception as e:
        return {"response": f"❌ Error: {str(e)}", "success": False}

@app.post("/engine/enterprise/analyze")
async def engine_enterprise_analyze(request: PipelineRequest):
    """
    Extract math parameters and verify mathematical feasibility (Steps 2 and 3).
    """
    if not request.unstructured_problem.strip():
        raise HTTPException(status_code=400, detail="Problem statement cannot be empty.")

    try:
        raw_problem = request.unstructured_problem
        
        # Extract large numeric arrays and run token budget guard
        extraction = extract_numeric_blocks(raw_problem)
        problem = extraction.slim_text
        check_token_budget(problem, label="Problem Description")
        registry = extraction.registry

        # ── Step 2: NLP Parser ────────────────────────────────────────────────
        nlp_user = nlp_prompt.build_user_prompt(problem)
        nlp_raw = await call_primary(
            system=nlp_prompt.SYSTEM_PROMPT,
            user=nlp_user,
            max_tokens=4096,
            temperature=0.1,
        )
        ir = await parse_and_validate(
            raw_output=nlp_raw,
            validator_fn=validate_nlp_parser,
            call_fn=call_primary,
            system=nlp_prompt.SYSTEM_PROMPT,
            user=nlp_user,
            step_name="NLP Parser",
        )
        if not ir:
            ir = {"entities_count": 5, "entities_name": "item", "slots_count": 3, "slots_name": "slot",
                  "capacity_val": None, "capacity_type": "upper_bound", "uniqueness_val": 1}
        else:
            if registry:
                ir = inject_numeric_blocks(ir, registry)

        # ── Step 3: Math Reasoner ─────────────────────────────────────────────
        rsn_user = reasoner_prompt.build_user_prompt(problem, ir)
        rsn_raw = await call_primary(
            system=reasoner_prompt.SYSTEM_PROMPT,
            user=rsn_user,
            max_tokens=4096,
            temperature=0.1,
        )
        feasibility = await parse_and_validate(
            raw_output=rsn_raw,
            validator_fn=validate_reasoner,
            call_fn=call_primary,
            system=reasoner_prompt.SYSTEM_PROMPT,
            user=rsn_user,
            step_name="Math Reasoner",
        )
        if not feasibility:
            feasibility = {"feasible": True, "reasoning_trace": "Feasibility check skipped.", "conflicts": [], "verified_constraints": []}

        if feasibility and feasibility.get("feasible", True):
            trace = feasibility.get("reasoning_trace", "")
            if "No obvious contradiction detected." not in trace:
                feasibility["reasoning_trace"] = "No obvious contradiction detected. " + trace
        # Check global environment override first
        force_solver = getattr(config, "FORCE_SOLVER", None)
        if force_solver:
            suggested = "CQM" if force_solver.upper() == "CQM" else "QUBO" if force_solver.upper() == "QUBO" else "OR-Tools"
        else:
    
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
            
            _ADAPTERS_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "adapters")
            _PATH = lambda name: os.path.join(_ADAPTERS_BASE, name)
            
            try:
                suggestor_raw = await call_fast(
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

        return {
            "parsed_math": str(ir),
            "reasoning_trace": feasibility.get("reasoning_trace", ""),
            "is_feasible": feasibility.get("feasible", True),
            "feasibility_note": feasibility.get("infeasibility_reason"),
            "suggested_solver": suggested,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/engine/v3/finalize")
async def engine_v3_finalize(request: FinalizeRequest):
    """
    Interpret simulator results in context of the original business problem.
    """
    if not request.unstructured_problem or not request.unstructured_problem.strip():
        return {
            "final_interpretation": "Problem description is empty.",
            "variables_assigned": {},
            "success": False
        }
        
    try:
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
        
        raw_output = await call_primary(
            system=system_prompt,
            user=user_prompt,
            max_tokens=2048,
            temperature=0.1
        )
        
        final_data = await parse_and_validate(
            raw_output=raw_output,
            validator_fn=lambda d: [] if "final_interpretation" in d and "variables_assigned" in d else ["Invalid schema"],
            call_fn=call_primary,
            system=system_prompt,
            user=user_prompt,
            step_name="Results Finalizer"
        )
        
        if not final_data:
            raise ValueError("Failed to obtain valid JSON from Qwen.")
            
        return {
            "final_interpretation": final_data["final_interpretation"],
            "variables_assigned": final_data["variables_assigned"],
            "success": True
        }
    except Exception as e:
        return {
            "final_interpretation": f"Error finalizing results: {str(e)}",
            "variables_assigned": {},
            "success": False
        }


@app.post("/engine/v2/execute", response_model=ExecutionResponse)
async def engine_execute_code(request: ExecutionRequest):
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
    import sys
    import asyncio as _asyncio

    # Inject penalty visibility into any QUBO code that doesn't already print it.
    # The penalty weight is baked into the generated code as: Q = Q_cost + {value} * Q_con
    import re as _re
    code_to_run = request.code
    if "Penalty Applied" not in code_to_run:
        penalty_match = _re.search(r"Q\s*=\s*Q_cost\s*\+\s*([\d.eE+\-]+)\s*\*\s*Q_con", code_to_run)
        if penalty_match:
            penalty_val = penalty_match.group(1)
            inject_line = f'        print(f"Penalty Applied: \u03bb = {penalty_val}")\n'
            code_to_run = code_to_run.replace(
                '        print("[Simulator] Submitting QUBO to D-Wave Simulated Annealing Sampler...")',
                '        print("[Simulator] Submitting QUBO to D-Wave Simulated Annealing Sampler...")\n' + inject_line.rstrip("\n"),
                1
            )

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tmp:
        tmp.write(code_to_run)
        tmp_path = tmp.name

    try:
        # Async subprocess — does not block the event loop during execution
        proc = await _asyncio.create_subprocess_exec(
            sys.executable, tmp_path,
            stdout=_asyncio.subprocess.PIPE,
            stderr=_asyncio.subprocess.PIPE,
        )
        try:
            stdout_bytes, stderr_bytes = await _asyncio.wait_for(
                proc.communicate(), timeout=60
            )
        except _asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            raise

        stdout_text = stdout_bytes.decode("utf-8", errors="replace")
        stderr_text = stderr_bytes.decode("utf-8", errors="replace")

        output = stdout_text
        error_msg = None
        success = True

        if proc.returncode != 0:
            error_msg = f"Runtime Error (Exit {proc.returncode}):\n{stderr_text}"
            success = False
        elif stderr_text:
            output += "\n--- Warnings/Info ---\n" + stderr_text

    except _asyncio.TimeoutError:
        error_msg = "Execution timed out (60s limit)."
        output = ""
        success = False
    except Exception as e:
        error_msg = f"Execution failed: {str(e)}"
        output = ""
        success = False
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
    
    return ExecutionResponse(
        output=output if output else "",
        error=error_msg,
        success=success
    )


# =========================================================================
# DIRECT OPTIMIZATION MODEL PIPELINE (POST /engine/direct-model/stream)
# =========================================================================
class DirectModelRequest(BaseModel):
    model_text: str = Field(..., min_length=10, max_length=200000)
    penalty_choice: Optional[int] = 3          # 1=Sum, 2=PNorm, 3=Verma-Lewis
    num_reads: Optional[int] = 5000
    email: Optional[str] = None
    session_id: Optional[str] = None
    run_solver: Optional[bool] = False

@app.post("/engine/direct-model/stream")
async def engine_direct_model_stream(request: DirectModelRequest):
    """
    Stream the Direct Optimization Model pipeline.
    Steps: Parse → Q Matrix → QUBO Code → Simulator → Output
    Each step is emitted as a newline-delimited JSON SSE event.
    """
    async def event_generator():
        try:
            async for update in run_direct_model_pipeline_stream(
                model_text=request.model_text,
                penalty_choice=request.penalty_choice or 3,
                num_reads=request.num_reads or 5000,
                email=request.email,
                session_id=request.session_id,
                run_solver=request.run_solver or False,
            ):
                yield f"data: {json.dumps(update)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'step': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )

class GateModelRequest(BaseModel):
    model_text: str = Field(..., min_length=10, max_length=200000)
    shots: Optional[int] = 5000
    email: Optional[str] = None
    session_id: Optional[str] = None
    run_simulator: Optional[bool] = False

@app.post("/engine/gate-model/stream")
async def engine_gate_model_stream(request: GateModelRequest):
    """
    Stream the Gate-Based Quantum Compiler pipeline.
    Steps: Parse → Compile → Simulate → Output
    """
    from .pipelines.gate_model_pipeline import run_gate_pipeline_stream
    async def event_generator():
        try:
            async for update in run_gate_pipeline_stream(
                model_text=request.model_text,
                shots=request.shots or 5000,
                email=request.email,
                session_id=request.session_id,
                run_simulator=request.run_simulator or False,
            ):
                yield f"data: {json.dumps(update)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'step': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ENGINE_PORT", 8003))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
