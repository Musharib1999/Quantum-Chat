"""
QuantumGuru Engine v2 — Central Configuration
Loads from prime-blazar/.env automatically.
Fallback chain: RunPod vllm → Groq (Qwen roles) / MLX (Llama roles)
"""
import os
from dotenv import load_dotenv

# Load .env from prime-blazar root
_ENV_PATH = os.path.join(os.path.dirname(__file__), '../../.env')
load_dotenv(dotenv_path=_ENV_PATH)

# ── Qwen 3 32B (RunPod vllm, port 8000) ───────────────────────────────────────
QWEN_BASE_URL  = os.environ.get("QWEN_BASE_URL", "")   # e.g. https://<pod>-8000.proxy.runpod.net/v1
QWEN_API_KEY   = os.environ.get("QWEN_API_KEY", "none")
QWEN_MODEL     = os.environ.get("QWEN_MODEL", "Qwen/Qwen3-32B")

# ── Llama 3 8B + LoRA adapters (RunPod vllm, port 8001) ───────────────────────
LLAMA_BASE_URL = os.environ.get("LLAMA_BASE_URL", "")  # e.g. https://<pod>-8001.proxy.runpod.net/v1
LLAMA_API_KEY  = os.environ.get("LLAMA_API_KEY", "none")
LLAMA_MODEL    = os.environ.get("LLAMA_MODEL", "mlx-community/Meta-Llama-3.1-8B-Instruct-4bit")

# ── Groq fallback (used when QWEN_BASE_URL is not set) ────────────────────────
GROQ_API_KEY   = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL     = "llama-3.3-70b-versatile"
GROQ_BASE_URL  = "https://api.groq.com/openai/v1"

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
USE_RUNPOD     = bool(QWEN_BASE_URL and LLAMA_BASE_URL)
USE_GROQ_FALLBACK = bool(GROQ_API_KEY) and not USE_RUNPOD

def get_mode() -> str:
    if USE_RUNPOD:
        return "runpod"   # Full v2: Qwen + Llama on RunPod
    elif USE_GROQ_FALLBACK:
        return "groq"     # Partial: Groq for Qwen roles, MLX for Llama roles
    else:
        return "offline"  # No LLM available
