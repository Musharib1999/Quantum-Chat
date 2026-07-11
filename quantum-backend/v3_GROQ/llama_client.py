import re
"""
Llama 3 8B + LoRA Adapter Client — QuantumGuru Engine v3
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


def _parse_llama_prompt(prompt: str) -> list:
    """Parses a Llama 3 formatted prompt string into a list of OpenAI messages."""
    messages = []
    system_marker = "<|start_header_id|>system<|end_header_id|>"
    user_marker = "<|start_header_id|>user<|end_header_id|>"
    assistant_marker = "<|start_header_id|>assistant<|end_header_id|>"
    eot_marker = "<|eot_id|>"
    
    system_content = ""
    user_content = ""
    
    if system_marker in prompt:
        parts = prompt.split(system_marker, 1)[1].split(eot_marker, 1)
        system_content = parts[0].strip()
        remainder = parts[1] if len(parts) > 1 else ""
    else:
        remainder = prompt
        
    if user_marker in remainder:
        parts = remainder.split(user_marker, 1)[1].split(eot_marker, 1)
        user_content = parts[0].strip()
    else:
        user_content = remainder.replace(eot_marker, "").replace(assistant_marker, "").strip()
        
    if system_content:
        messages.append({"role": "system", "content": system_content})
    messages.append({"role": "user", "content": user_content})
    
    return messages


async def _call_groq_api(
    messages: list,
    max_tokens: int = 512,
    temperature: float = 0.1,
    retries: int = 3,
) -> str:
    headers = {
        "Authorization": f"Bearer {config.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": config.GROQ_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    last_error = None
    for attempt in range(retries + 1):
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                r = await client.post(f"{config.GROQ_BASE_URL}/chat/completions", headers=headers, json=payload)
                r.raise_for_status()
                res = r.json()["choices"][0]["message"]["content"].strip()
                await asyncio.sleep(15.0)
                return res
        except Exception as e:
            is_429 = False
            if hasattr(e, "response") and e.response is not None and getattr(e.response, "status_code", None) == 429:
                is_429 = True
                print("[GROQ] Rate limit detected (429). Will sleep and retry.")
            
            last_error = e
            print(f"[GROQ] API call attempt {attempt+1} failed: {e}")
            if attempt < retries:
                sleep_seconds = 2 ** (attempt + 1)
                if is_429:
                    retry_after = e.response.headers.get("retry-after")
                    if retry_after:
                        try:
                            sleep_seconds = float(retry_after) + 0.5
                            print(f"[GROQ] Rate limit detected (429). Sleeping for {sleep_seconds}s from headers.")
                        except ValueError:
                            pass
                    else:
                        body_text = e.response.text
                        match = re.search(r"retry in ([\d\.]+)s", body_text, re.IGNORECASE)
                        if match:
                            try:
                                sleep_seconds = float(match.group(1)) + 0.5
                                print(f"[GROQ] Rate limit detected (429). Sleeping for {sleep_seconds}s from body.")
                            except ValueError:
                                pass
                await asyncio.sleep(sleep_seconds)
            else:
                if is_429:
                    raise RuntimeError("AI engine is under maintenance, please try after few minutes") from e
    raise last_error


async def call_adapter(
    adapter_name: str,
    prompt: str,
    max_tokens: int = 512,
    temperature: float = 0.1,
    mlx_adapter_path: Optional[str] = None,
) -> str:
    """
    Call a LoRA adapter. 
    Primary: RunPod vllm
    Secondary: Groq API fallback
    """
    from .execution_logger import log_engagement
    system_ctx = f"Adapter Module: {adapter_name}"

    if config.LLAMA_BASE_URL:
        try:
            res = await _call_vllm_lora(adapter_name, prompt, max_tokens, temperature)
            log_engagement(f"Llama-8B (Adapter: {adapter_name})", system_ctx, prompt, res)
            return res
        except Exception as e:
            print(f"[LLAMA] vllm failed for {adapter_name}: {e}")

    if config.GROQ_API_KEY:
        try:
            messages = _parse_llama_prompt(prompt)
            res = await _call_groq_api(messages, max_tokens, temperature)
            log_engagement(f"Groq (Adapter: {adapter_name})", system_ctx, prompt, res)
            return res
        except Exception as e:
            print(f"[LLAMA] Groq fallback failed for {adapter_name}: {e}")
            raise e

    raise RuntimeError(f"No inference backend available for adapter: {adapter_name}")
