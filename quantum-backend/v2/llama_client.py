"""
Llama 3 8B + LoRA Adapter Client — QuantumGuru Engine v2
Primary: RunPod vllm with --enable-lora (LLAMA_BASE_URL)
Fallback: Local MLX subprocess (Apple Silicon)
"""
import httpx
import asyncio
import subprocess
import shutil
from typing import Optional
from . import config

_TIMEOUT = httpx.Timeout(180.0, connect=10.0)


async def _call_vllm_lora(
    adapter_name: str,
    prompt: str,
    max_tokens: int = 512,
    temperature: float = 0.1,
) -> str:
    """Call vllm LoRA endpoint. adapter_name must match --lora-modules registration."""
    headers = {
        "Authorization": f"Bearer {config.LLAMA_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": adapter_name,   # vllm uses adapter name as model ID
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.post(
            f"{config.LLAMA_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()


def _call_mlx_local(adapter_path: str, prompt: str, max_tokens: int = 512) -> str:
    """Fallback: run mlx_lm CLI subprocess on Apple Silicon."""
    mlx_bin = shutil.which("mlx_lm")
    if not mlx_bin:
        return "MLX_ERROR: mlx_lm not found"
    cmd = [
        mlx_bin, "generate",
        "--model", config.LLAMA_MODEL,
        "--adapter-path", adapter_path,
        "--prompt", prompt,
        "--max-tokens", str(max_tokens),
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            return f"MLX_ERROR: {result.stderr[:300]}"
        # Strip prompt echo from output
        output = result.stdout
        if prompt in output:
            output = output.split(prompt, 1)[-1]
        return output.strip()
    except subprocess.TimeoutExpired:
        return "MLX_ERROR: timeout"
    except Exception as e:
        return f"MLX_ERROR: {e}"


async def call_adapter(
    adapter_name: str,
    prompt: str,
    max_tokens: int = 512,
    temperature: float = 0.1,
    mlx_adapter_path: Optional[str] = None,
) -> str:
    """
    Call a LoRA adapter. 
    Primary: RunPod vllm (adapter_name = registered name)
    Fallback: Local MLX (mlx_adapter_path = local folder path)
    """
    # ── Primary: RunPod vllm ───────────────────────────────────────────────────
    if config.LLAMA_BASE_URL:
        try:
            return await _call_vllm_lora(adapter_name, prompt, max_tokens, temperature)
        except Exception as e:
            print(f"[LLAMA] vllm failed for {adapter_name}: {e}")
            if not mlx_adapter_path:
                raise RuntimeError(f"vllm failed and no MLX fallback path: {e}")

    # ── Fallback: Local MLX ────────────────────────────────────────────────────
    if mlx_adapter_path:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, _call_mlx_local, mlx_adapter_path, prompt, max_tokens
        )
        return result

    raise RuntimeError(f"No inference backend available for adapter: {adapter_name}")
