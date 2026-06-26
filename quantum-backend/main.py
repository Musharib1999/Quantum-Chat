# =============================================================================
# QuantumGuru Multi-Adapter Pipeline Backend
# Local Testing Version — Apple Silicon / MLX
# Pipeline: Groq (Parser + Reasoner) -> MLX 4-bit (Suggestor + Coder)
# =============================================================================

import os
import re
import sys
import json
import time
import tempfile
import subprocess
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# =============================================================================
# MODEL & ADAPTER PATHS (Apple Silicon MLX 4-bit)
# =============================================================================
# Base model — matches what the adapters were trained on (unsloth = llama-3-8b-Instruct)
BASE_MODEL_4BIT = "mlx-community/Meta-Llama-3.1-8B-Instruct-4bit"

# Absolute paths to adapters (PEFT converted to safetensors)
_ADAPTERS_BASE    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "adapters")

SUGGESTOR_ADAPTER     = os.path.join(_ADAPTERS_BASE, "adapter_suggestor")
CODER_ADAPTER         = os.path.join(_ADAPTERS_BASE, "adapter_master_guru")   # CQM / general coder
QUBO_CODER_ADAPTER    = os.path.join(_ADAPTERS_BASE, "adapter_qubo_coder")
ORTOOLS_CODER_ADAPTER = os.path.join(_ADAPTERS_BASE, "adapter_ortools_coder")
QA_DEBUGGER_ADAPTER   = os.path.join(_ADAPTERS_BASE, "adapter_qa_debugger")

# =============================================================================
# ENV LOADING
# =============================================================================
def load_env_file():
    search_paths = [
        ".env", "../.env", "../../.env",
        "../prime-blazar/.env",
        os.path.expanduser("~/.env"),
    ]
    for path in search_paths:
        if os.path.exists(path):
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip().strip("'\"")
            print(f"[ENV] Loaded from: {path}")
            return True
    print("[ENV] WARNING: No .env file found. GROQ_API_KEY may not be set.")
    return False


load_env_file()
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

# =============================================================================
# FASTAPI APP
# =============================================================================
app = FastAPI(
    title="QuantumGuru Pipeline Backend",
    description="Local testing: Groq (Parser/Reasoner) + MLX 4-bit (Suggestor/Coder)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# REQUEST / RESPONSE MODELS
# =============================================================================
class CodeExecutionRequest(BaseModel):
    code: str


class ExecutionResponse(BaseModel):
    output: str
    error: Optional[str] = None
    success: bool = True


class PipelineRequest(BaseModel):
    unstructured_problem: str
    mode: Optional[str] = "auto"


class AnalyzeResponse(BaseModel):
    parsed_math: str
    reasoning_trace: str
    is_feasible: bool
    feasibility_note: Optional[str] = None


class PipelineResponse(BaseModel):
    parsed_math: str
    reasoning_trace: str
    final_code: str
    success: bool
    suggested_solver: str
    solver_rationale: str

# =============================================================================
# GROQ CLIENT
# =============================================================================
def query_groq(system_prompt: str, user_prompt: str) -> str:
    """Call Groq API with llama-3.3-70b-versatile. Auto-retries on rate limit."""
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not set. Add it to your .env: GROQ_API_KEY=gsk_...")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 1000,
    }

    for attempt in range(3):
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
            elif resp.status_code == 429:
                wait = 5 * (attempt + 1)
                print(f"[GROQ] Rate limit. Waiting {wait}s (attempt {attempt+1}/3)...")
                time.sleep(wait)
            else:
                print(f"[GROQ] Error {resp.status_code}: {resp.text}")
                return f"ERROR: Groq returned {resp.status_code}"
        except Exception as e:
            print(f"[GROQ] Network error: {e}")
            time.sleep(5)

    return "ERROR: Failed to reach Groq after 3 attempts."

# =============================================================================
# SYSTEM PROMPTS
# =============================================================================
_SCHEDULING_PARSER_PROMPT = (
    "You are the Quantum NLP Parser specializing in workforce scheduling.\n"
    "Convert the unstructured scheduling problem into strict mathematical parameters.\n\n"
    "You MUST output your response in EXACTLY this format (no markdown, no extra text):\n"
    "Entities: [number] [entity type, e.g. nurses]\n"
    "Slots: [number] [slot type, e.g. shifts]\n"
    "Constraints: Capacity Constraints: [details]. Uniqueness Constraints: [details]. "
    "Rest Constraints: [details]. Role Constraints: [details].\n"
    "Objective: [optimization goal]\n"
    "Clarifications: [list ambiguities, or None]\n"
)

_SCHEDULING_REASONER_PROMPT = (
    "You are the Quantum Logic Reasoner for scheduling problems.\n"
    "Analyze the parsed mathematical parameters and check feasibility.\n\n"
    "You MUST output your response in EXACTLY this format (no markdown, no extra text):\n"
    "### Feasibility Analysis\n"
    "- Status: [FEASIBLE or INFEASIBLE]\n"
    "- Rationale: [brief math explanation]\n\n"
    "### Formulation Strategy\n"
    "Model using 2D binary variables x[worker, shift].\n"
    "[List key constraint types: capacity sums, uniqueness constraints, "
    "consecutive exclusion cuts, role bounds if applicable.]\n"
)

_GENERIC_PARSER_PROMPT = (
    "You are the Quantum NLP Parser. Convert unstructured optimization problems "
    "into strict mathematical parameters.\n\n"
    "You MUST output your response in EXACTLY this format (no markdown, no extra text):\n"
    "Entities: [number] [entity type]\n"
    "Slots: [number] [slot/variable type]\n"
    "Constraints: Capacity Constraints: [details]. Uniqueness Constraints: [details]. "
    "Rest Constraints: [details]. Role Constraints: [details].\n"
    "Objective: [optimization goal]\n"
    "Clarifications: [list ambiguities, or None]\n"
)

_GENERIC_REASONER_PROMPT = (
    "You are the Quantum Logic Reasoner. Check mathematical feasibility "
    "of the parsed optimization constraints.\n\n"
    "You MUST output your response in EXACTLY this format (no markdown, no extra text):\n"
    "### Feasibility Analysis\n"
    "- Status: [FEASIBLE or INFEASIBLE]\n"
    "- Rationale: [brief math explanation]\n\n"
    "### Formulation Strategy\n"
    "Model using appropriate variables. Apply resource and capacity constraints.\n"
)

_SCHEDULING_KEYWORDS = [
    "shift", "roster", "schedule", "scheduling", "nurse", "worker",
    "flight", "agent", "proctor", "employee", "cashier", "pilot",
    "attendant", "staff", "crew",
]


def get_groq_prompts(problem_text: str):
    if any(k in problem_text.lower() for k in _SCHEDULING_KEYWORDS):
        return _SCHEDULING_PARSER_PROMPT, _SCHEDULING_REASONER_PROMPT
    return _GENERIC_PARSER_PROMPT, _GENERIC_REASONER_PROMPT

# =============================================================================
# MLX LOCAL INFERENCE
# =============================================================================
def run_mlx_expert(
    prompt: str,
    adapter_path: str,
    max_tokens: int = 800,
    model_path: str = None,
) -> str:
    """Run MLX 4-bit local inference with a LoRA adapter on Apple Silicon."""
    base = model_path if model_path else BASE_MODEL_4BIT
    try:
        # Use 'mlx_lm generate' CLI directly to avoid sys.modules conflict
        # when mlx_lm is already imported inside the FastAPI process
        result = subprocess.run(
            [
                "mlx_lm", "generate",
                "--model", base,
                "--adapter-path", adapter_path,
                "--prompt", prompt,
                "--max-tokens", str(max_tokens),
                "--temp", "0.1",
            ],
            capture_output=True,
            text=True,
            timeout=180,
        )
        if result.returncode != 0:
            print(f"[MLX] Error (rc={result.returncode}): {result.stderr[:500]}")
            return f"MLX_ERROR: {result.stderr[:200]}"
        output = result.stdout.strip()
        # Strip the prompt echo that mlx_lm prepends
        if "==========" in output:
            output = output.split("==========")[-1].strip()
        return output
    except subprocess.TimeoutExpired:
        return "MLX_ERROR: Timed out after 180s"
    except FileNotFoundError:
        return "MLX_ERROR: mlx_lm CLI not found. Run: pip install mlx-lm"
    except Exception as e:
        print(f"[MLX] Exception: {e}")
        return f"MLX_ERROR: {str(e)}"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================
def parse_math_constraints_detailed(parsed_math: str) -> dict:
    """Parse Groq structured output into an IR dict."""
    entities = 1
    m = re.search(r"Entities:\s*(\d+)", parsed_math, re.IGNORECASE)
    if m:
        entities = int(m.group(1))

    slots = 1
    m = re.search(r"Slots:\s*(\d+)", parsed_math, re.IGNORECASE)
    if m:
        slots = int(m.group(1))

    cap_val = None
    m = re.search(r"Capacity Constraints:.*?(\d+)", parsed_math, re.IGNORECASE)
    if m:
        cap_val = int(m.group(1))

    uniq_val = None
    m = re.search(r"Uniqueness Constraints:.*?(\d+)", parsed_math, re.IGNORECASE)
    if m:
        uniq_val = int(m.group(1))

    cap_type = "equality" if "equality" in parsed_math.lower() else "inequality"

    entity_name = "worker"
    m = re.search(r"Entities:\s*\d+\s+(\w+)", parsed_math, re.IGNORECASE)
    if m:
        entity_name = m.group(1).rstrip("s").lower()

    slot_name = "shift"
    m = re.search(r"Slots:\s*\d+\s+(\w+)", parsed_math, re.IGNORECASE)
    if m:
        slot_name = m.group(1).rstrip("s").lower()

    return {
        "entities_count": entities,
        "entities_name":  entity_name,
        "slots_count":    slots,
        "slots_name":     slot_name,
        "capacity_val":   cap_val,
        "capacity_type":  cap_type,
        "uniqueness_val": uniq_val,
    }


def extract_typed_constraints(problem, e_cnt, e_name, s_cnt, s_name) -> list:
    constraints = [
        {"type": "assignment", "description": f"Assign {e_cnt} {e_name}s to {s_cnt} {s_name}s"},
        {"type": "capacity",   "description": "Respect per-slot capacity limits"},
        {"type": "uniqueness", "description": "Ensure valid assignment uniqueness"},
    ]
    lowered = problem.lower()
    if any(k in lowered for k in ["consecutive", "night shift", "back-to-back", "rest"]):
        constraints.append({"type": "rest", "description": "Apply consecutive shift / rest period exclusion cuts"})
    if any(k in lowered for k in ["senior", "expert", "skill", "role", "qualified"]):
        constraints.append({"type": "role", "description": "Enforce role / skill matching requirements"})
    if any(k in lowered for k in ["prefer", "preference", "maximize satisfaction"]):
        constraints.append({"type": "preference", "description": "Soft preference satisfaction objective"})
    if any(k in lowered for k in ["part-time", "overtime", "max hours", "hour limit"]):
        constraints.append({"type": "hours_cap", "description": "Enforce maximum working hours cap"})
    return constraints


def audit_cqm_code(code: str, requirements: list) -> str:
    issues = []
    if "ConstrainedQuadraticModel" not in code and "cqm" not in code.lower():
        issues.append("FAIL: Missing CQM initialization (dimod.ConstrainedQuadraticModel).")
    if "add_constraint" not in code:
        issues.append("FAIL: No constraints added (missing add_constraint calls).")
    if "set_objective" not in code and "minimize" not in code.lower():
        issues.append("FAIL: Objective function missing (set_objective or minimize).")
    if issues:
        return "\n".join(issues)
    return "PASS: Code passed QA audit - CQM structure valid."


def compile_to_cqm_code(ir: dict) -> str:
    """DCC fallback: deterministically compile IR into valid CQM Python code."""
    e_cnt  = ir.get("entities_count", 1)
    s_cnt  = ir.get("slots_count", 1)
    cap    = ir.get("capacity_val") or 1
    e_name = ir.get("entities_name", "worker")
    s_name = ir.get("slots_name", "shift")

    lines = [
        "import dimod",
        f"# DCC-generated CQM: {e_cnt} {e_name}s x {s_cnt} {s_name}s",
        "cqm = dimod.ConstrainedQuadraticModel()",
        f"x = {{(i, j): dimod.Binary(f'x_{{i}}_{{j}}') for i in range({e_cnt}) for j in range({s_cnt})}}",
        "",
        f"# Capacity: each {s_name} gets at most {cap} {e_name}(s)",
        f"for j in range({s_cnt}):",
        f"    cqm.add_constraint(sum(x[i, j] for i in range({e_cnt})) <= {cap}, label=f'{s_name}_cap_{{j}}')",
        "",
        f"# Uniqueness: each {e_name} assigned to exactly 1 {s_name}",
        f"for i in range({e_cnt}):",
        f"    cqm.add_constraint(sum(x[i, j] for j in range({s_cnt})) == 1, label=f'{e_name}_unique_{{i}}')",
        "",
        "# Objective: minimize total assignments",
        f"cqm.set_objective(sum(x[i, j] for i in range({e_cnt}) for j in range({s_cnt})))",
        "",
        'print("CQM built successfully.")',
        'print(f"Variables: {len(cqm.variables)}")',
        'print(f"Constraints: {len(cqm.constraints)}")',
    ]
    return "\n".join(lines)

# =============================================================================
# BASIC ENDPOINTS
# =============================================================================
@app.get("/")
def read_root():
    return {
        "status": "QuantumGuru Pipeline Backend Running",
        "pipeline": "Groq (llama-3.3-70b) -> MLX 4-bit (Apple Silicon)",
        "groq_key_loaded": bool(GROQ_API_KEY),
        "endpoints": ["/enterprise/analyze", "/enterprise/pipeline", "/execute", "/validate"],
    }


@app.post("/validate")
def validate_code(request: CodeExecutionRequest):
    try:
        compile(request.code, "<string>", "exec")
        return {"valid": True, "error": None}
    except SyntaxError as e:
        return {"valid": False, "error": f"SyntaxError: {e}"}
    except Exception as e:
        return {"valid": False, "error": str(e)}


@app.post("/execute", response_model=ExecutionResponse)
async def execute_code(request: CodeExecutionRequest):
    """Execute Python code in an isolated subprocess. Timeout: 60s."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tmp:
        tmp.write("import sys\n")
        tmp.write("try:\n    from dimod import BinaryQuadraticModel, SimulatedAnnealingSampler\nexcept ImportError: pass\n")
        tmp.write("try:\n    import numpy as np\nexcept ImportError: pass\n")
        tmp.write(request.code)
        tmp_path = tmp.name

    try:
        result = subprocess.run([sys.executable, tmp_path], capture_output=True, text=True, timeout=60)
        output    = result.stdout
        error_msg = None
        success   = True
        if result.returncode != 0:
            error_msg = f"RuntimeError (exit {result.returncode}):\n{result.stderr}"
            success   = False
        elif result.stderr:
            output += "\n--- Warnings ---\n" + result.stderr
    except subprocess.TimeoutExpired:
        output, error_msg, success = "", "Execution timed out (60s).", False
    except Exception as e:
        output, error_msg, success = "", f"Unexpected error: {e}", False
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    return ExecutionResponse(output=output or "", error=error_msg, success=success)

# =============================================================================
# ENTERPRISE ANALYZE — Groq Parser + Reasoner + Feasibility Check
# =============================================================================
@app.post("/enterprise/analyze", response_model=AnalyzeResponse)
async def analyze_problem(request: PipelineRequest):
    """
    Steps 1-3 only: NLP Parser -> Logic Reasoner -> Feasibility Check.
    Both use Groq llama-3.3-70b-versatile. No code generation.
    """
    try:
        print("[ANALYZE] Step 1: NLP Parser (Groq)...")
        parser_sys, reasoner_sys = get_groq_prompts(request.unstructured_problem)
        parsed_math = query_groq(parser_sys, request.unstructured_problem)

        print("[ANALYZE] Step 2: Logic Reasoner (Groq)...")
        reasoning_trace = query_groq(reasoner_sys, parsed_math)

        print("[ANALYZE] Step 3: Feasibility check...")
        ir       = parse_math_constraints_detailed(parsed_math)
        ent_lim  = ir["uniqueness_val"] if ir["uniqueness_val"] is not None else 1
        slot_lim = ir["capacity_val"] if ir["capacity_val"] else 1

        if ir["capacity_type"] == "equality" and ir["capacity_val"]:
            is_feasible = (ir["entities_count"] * ent_lim) >= (ir["slots_count"] * slot_lim)
        else:
            is_feasible = True

        if not is_feasible and "INFEASIBLE" not in reasoning_trace:
            reasoning_trace += "\n\n[SYSTEM: Override -> INFEASIBLE (supply cannot meet demand).]"

        note = None
        if not is_feasible:
            note = "Mathematically infeasible: supply cannot meet demand under hard equality constraints."

        return AnalyzeResponse(
            parsed_math=parsed_math,
            reasoning_trace=reasoning_trace,
            is_feasible=is_feasible,
            feasibility_note=note,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# ENTERPRISE PIPELINE — Full Pipeline
# Groq (Parser + Reasoner) -> MLX 4-bit (Suggestor -> Coder + DCC fallback)
# =============================================================================
@app.post("/enterprise/pipeline", response_model=PipelineResponse)
async def run_pipeline(request: PipelineRequest):
    """
    Full QuantumGuru pipeline (local test version):
    0. MLX 4-bit Suggestor: decides CQM / QUBO / OR-Tools (auto mode)
    1. Groq Parser: llama-3.3-70b-versatile
    2. Groq Reasoner: llama-3.3-70b-versatile
    3. MLX 4-bit Coder: matching adapter (CQM / QUBO / OR-Tools)
    4. QA Audit + DCC deterministic fallback (CQM path)
    """
    try:
        mode     = (request.mode or "auto").strip().lower()
        decision = "CQM"
        rationale = "Default CQM fallback."

        # ── Step 0: Solver Suggestor (MLX local) ──────────────────────────────
        if mode == "auto":
            print("[PIPELINE] Step 0: Solver Suggestor (MLX 4-bit)...")
            s_prompt = (
                "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
                "You are the Quantum Solver Suggestor. "
                "Decide which solver to use: CQM, QUBO, or OR-Tools.\n"
                "Output ONLY two lines in this format:\n"
                "Decision: <CQM|QUBO|OR-Tools>\n"
                "Rationale: <one sentence>\n"
                "<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
                f"{request.unstructured_problem}"
                "<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
            )
            s_out = run_mlx_expert(s_prompt, SUGGESTOR_ADAPTER, max_tokens=80)
            print(f"[PIPELINE] Suggestor output: {s_out[:200]}")

            for line in s_out.splitlines():
                if line.startswith("Decision:"):
                    decision = line.split(":", 1)[1].strip()
                elif line.startswith("Rationale:"):
                    rationale = line.split(":", 1)[1].strip()

            if "MLX_ERROR" in s_out or not decision:
                print("[PIPELINE] Suggestor unavailable. Falling back to OR-Tools.")
                decision  = "OR-Tools"
                rationale = "Suggestor adapter unavailable; defaulting to OR-Tools."

        elif mode == "qubo":
            decision, rationale = "QUBO", "User forced QUBO mode."
        elif mode in ("ortools", "or-tools"):
            decision, rationale = "OR-Tools", "User forced OR-Tools mode."
        else:
            decision, rationale = "CQM", "User forced CQM mode."

        print(f"[PIPELINE] Decision: {decision} | {rationale}")

        # ── Step 1: NLP Parser (Groq) ──────────────────────────────────────────
        print("[PIPELINE] Step 1: NLP Parser (Groq)...")
        parser_sys, reasoner_sys = get_groq_prompts(request.unstructured_problem)
        parsed_math = query_groq(parser_sys, request.unstructured_problem)

        # ── Step 2: Logic Reasoner (Groq) ─────────────────────────────────────
        print("[PIPELINE] Step 2: Logic Reasoner (Groq)...")
        reasoning_trace = query_groq(reasoner_sys, parsed_math)

        # ── CQM PATH ──────────────────────────────────────────────────────────
        if decision == "CQM":
            ir = parse_math_constraints_detailed(parsed_math)
            ir["constraints"] = extract_typed_constraints(
                request.unstructured_problem,
                ir["entities_count"], ir["entities_name"],
                ir["slots_count"], ir["slots_name"],
            )

            ent_lim  = ir["uniqueness_val"] if ir["uniqueness_val"] is not None else 1
            slot_lim = ir["capacity_val"] if ir["capacity_val"] else 1
            if ir["capacity_type"] == "equality" and ir["capacity_val"]:
                is_feasible = (ir["entities_count"] * ent_lim) >= (ir["slots_count"] * slot_lim)
            else:
                is_feasible = True

            if not is_feasible:
                reasoning_trace += "\n\n[SYSTEM: INFEASIBLE - supply/demand mismatch.]"
                return PipelineResponse(
                    parsed_math=parsed_math,
                    reasoning_trace=reasoning_trace,
                    final_code="# HALTED: Mathematically infeasible problem.",
                    success=False,
                    suggested_solver="CQM",
                    solver_rationale=rationale,
                )

            print("[PIPELINE] Step 3: CQM Coder (MLX 4-bit)...")
            c_prompt = (
                "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
                "You are the Quantum Guru CQM Coder. "
                "Generate complete Python code using dimod.ConstrainedQuadraticModel "
                "including all variables, constraints, and objective function."
                "<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
                f"Problem: {request.unstructured_problem}\n\nMath IR:\n{parsed_math}"
                "<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
            )
            final_code = run_mlx_expert(c_prompt, CODER_ADAPTER, max_tokens=800)

            print("[PIPELINE] Step 4: QA Audit...")
            audit_result = audit_cqm_code(final_code, ir.get("constraints", []))

            if "FAIL:" in audit_result or "MLX_ERROR" in final_code:
                print("[PIPELINE] QA FAILED - DCC fallback activating...")
                dcc_code  = compile_to_cqm_code(ir)
                dcc_audit = audit_cqm_code(dcc_code, ir.get("constraints", []))
                out_code  = (
                    "# GENERATIVE CODE REJECTED BY QA AUDIT\n"
                    "# DCC DETERMINISTIC FALLBACK ACTIVE\n\n"
                    + dcc_code
                    + f"\n\n# QA TRACE:\n# {dcc_audit}"
                )
            else:
                out_code = final_code + f"\n\n# QA TRACE:\n# {audit_result}"

            return PipelineResponse(
                parsed_math=parsed_math,
                reasoning_trace=reasoning_trace,
                final_code=out_code,
                success=True,
                suggested_solver="CQM",
                solver_rationale=rationale,
            )

        # ── QUBO PATH ──────────────────────────────────────────────────────────
        elif decision == "QUBO":
            print("[PIPELINE] Step 3: QUBO Coder (MLX 4-bit)...")
            c_prompt = (
                "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
                "You are the Quantum Guru QUBO Coder. "
                "Generate complete Python QUBO code using dimod BinaryQuadraticModel."
                "<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
                f"{request.unstructured_problem}"
                "<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
            )
            final_code = run_mlx_expert(c_prompt, QUBO_CODER_ADAPTER, max_tokens=800)
            return PipelineResponse(
                parsed_math=parsed_math,
                reasoning_trace=reasoning_trace,
                final_code=final_code,
                success="MLX_ERROR" not in final_code,
                suggested_solver="QUBO",
                solver_rationale=rationale,
            )

        # ── OR-TOOLS PATH ──────────────────────────────────────────────────────
        else:
            ir = parse_math_constraints_detailed(parsed_math)
            ir["constraints"] = extract_typed_constraints(
                request.unstructured_problem,
                ir["entities_count"], ir["entities_name"],
                ir["slots_count"], ir["slots_name"],
            )
            ortools_ir = {
                "dimensions": {
                    "entities_count": ir["entities_count"],
                    "entities_name":  ir["entities_name"],
                    "slots_count":    ir["slots_count"],
                    "slots_name":     ir["slots_name"],
                },
                "capacity":      {"type": ir["capacity_type"] or "inequality", "value": ir["capacity_val"] or 1},
                "uniqueness_val": ir["uniqueness_val"] if ir["uniqueness_val"] is not None else 1,
                "constraints":    ir["constraints"],
            }
            if any(t in request.unstructured_problem.lower() for t in ["maximize", "optimize", "highest"]):
                ortools_ir["objective"] = "maximize_coverage"

            print("[PIPELINE] Step 3: OR-Tools Coder (MLX 4-bit)...")
            c_prompt = (
                "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
                "You are the Quantum Guru OR-Tools Coder. "
                "Generate complete Python code using ortools.sat.python.cp_model (CP-SAT) "
                "based on the JSON IR provided."
                "<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
                f"{json.dumps(ortools_ir, indent=2)}"
                "<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
            )
            final_code = run_mlx_expert(c_prompt, ORTOOLS_CODER_ADAPTER, max_tokens=800)
            return PipelineResponse(
                parsed_math=parsed_math,
                reasoning_trace=reasoning_trace,
                final_code=final_code,
                success="MLX_ERROR" not in final_code,
                suggested_solver="OR-Tools",
                solver_rationale=rationale,
            )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# ENTRY POINT
# =============================================================================
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8002))
    print(f"[STARTUP] QuantumGuru backend on port {port}")
    print(f"[STARTUP] BASE_MODEL_4BIT : {BASE_MODEL_4BIT}")
    print(f"[STARTUP] GROQ_API_KEY    : {'SET' if GROQ_API_KEY else 'NOT SET - check .env!'}")
    uvicorn.run(app, host="0.0.0.0", port=port)
