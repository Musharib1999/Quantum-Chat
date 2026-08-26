"""
QuantumGuru Engine v3 — Central Configuration
Loads from OptiOS/.env automatically.
Inference: RunPod vLLM only (Qwen 3 32B + Llama 3 8B + LoRA adapters).
"""
import os
from dotenv import load_dotenv

# Load .env from OptiOS root
_ENV_PATH = os.path.join(os.path.dirname(__file__), '../../../.env')
load_dotenv(dotenv_path=_ENV_PATH)

# Also load from the local project root if exists
_LOCAL_ENV = os.path.join(os.path.dirname(__file__), '../.env')
if os.path.exists(_LOCAL_ENV):
    load_dotenv(dotenv_path=_LOCAL_ENV)

# ── Groq API (Variant 2) ────────────────────────────────────────────────────────
INFERENCE_PROVIDER   = os.environ.get("INFERENCE_PROVIDER", "groq")
FORCE_SOLVER         = os.environ.get("FORCE_SOLVER", None)
GROQ_API_KEY         = os.environ.get("GROQ_API_KEY", "")
GROQ_PRIMARY_MODEL   = os.environ.get("GROQ_PRIMARY_MODEL", "qwen/qwen3.6-27b")
GROQ_FAST_MODEL      = os.environ.get("GROQ_FAST_MODEL", "qwen/qwen3.6-27b")

# ── Qwen 3 32B (RunPod vllm, port 8000) ───────────────────────────────────────
QWEN_BASE_URL  = os.environ.get("QWEN_BASE_URL", "")   # e.g. https://<pod>-8000.proxy.runpod.net/v1
QWEN_API_KEY   = os.environ.get("QWEN_API_KEY", "none")
QWEN_MODEL     = os.environ.get("QWEN_MODEL", "Qwen/Qwen3-32B")

# ── Llama 3 8B + LoRA adapters (RunPod vllm, port 8001) ───────────────────────
LLAMA_BASE_URL = os.environ.get("LLAMA_BASE_URL", "")  # e.g. https://<pod>-8001.proxy.runpod.net/v1
LLAMA_API_KEY  = os.environ.get("LLAMA_API_KEY", "none")
LLAMA_MODEL    = os.environ.get("LLAMA_MODEL", "meta-llama/Meta-Llama-3-8B-Instruct")

# ── Adapter names as registered in vllm --lora-modules ────────────────────────
ADAPTER_SUGGESTOR    = "suggestor"
ADAPTER_CQM_CODER    = "cqm_coder"
ADAPTER_QUBO_CODER   = "qubo_coder"
ADAPTER_ORTOOLS_CODER= "ortools_coder"
ADAPTER_QA_DEBUGGER  = "qa_debugger"
ADAPTER_PERSONALITY  = "personality"

# ── HuggingFace ────────────────────────────────────────────────────────────────
HF_TOKEN       = os.environ.get("HF_TOKEN", "")
HF_REPO        = "musharibsubhani/OptGuruV2"

# ── Runtime mode detection ─────────────────────────────────────────────────────
USE_RUNPOD = bool(QWEN_BASE_URL and LLAMA_BASE_URL)

def get_mode() -> str:
    prov = os.environ.get("INFERENCE_PROVIDER", "runpod")
    if prov == "groq":
        return "groq"
    elif USE_RUNPOD:
        return "runpod"
    else:
        return "offline"
