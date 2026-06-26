"""
Qwen 3 32B Client — QuantumGuru Engine v2
Primary: RunPod vllm (QWEN_BASE_URL)
Fallback: Groq llama-3.3-70b (when RunPod not available)
"""
import httpx
import json
import asyncio
from typing import Optional
from . import config

_TIMEOUT = httpx.Timeout(120.0, connect=10.0)


async def _call_openai_compat(
    base_url: str,
    api_key: str,
    model: str,
    system: str,
    user: str,
    max_tokens: int = 1024,
    temperature: float = 0.2,
) -> str:
    """Generic OpenAI-compatible chat completion call."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()


async def call_qwen(
    system: str,
    user: str,
    max_tokens: int = 1024,
    temperature: float = 0.2,
    retries: int = 2,
) -> str:
    """
    Call Qwen 3 32B on RunPod.
    Falls back to Groq llama-3.3-70b if RunPod is unavailable.
    """
    last_error = None

    # ── Primary: RunPod Qwen 3 32B ─────────────────────────────────────────────
    if config.QWEN_BASE_URL:
        for attempt in range(retries + 1):
            try:
                return await _call_openai_compat(
                    base_url=config.QWEN_BASE_URL,
                    api_key=config.QWEN_API_KEY,
                    model=config.QWEN_MODEL,
                    system=system,
                    user=user,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            except Exception as e:
                last_error = e
                if attempt < retries:
                    await asyncio.sleep(2 ** attempt)
        print(f"[QWEN] RunPod failed ({last_error}), falling back to Groq")

    # ── Fallback: Groq llama-3.3-70b ───────────────────────────────────────────
    if config.GROQ_API_KEY:
        for attempt in range(retries + 1):
            try:
                return await _call_openai_compat(
                    base_url=config.GROQ_BASE_URL,
                    api_key=config.GROQ_API_KEY,
                    model=config.GROQ_MODEL,
                    system=system,
                    user=user,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            except Exception as e:
                last_error = e
                if attempt < retries:
                    await asyncio.sleep(2 ** attempt)
        raise RuntimeError(f"Both Qwen (RunPod) and Groq failed. Last error: {last_error}")

    raise RuntimeError("No LLM available. Set QWEN_BASE_URL or GROQ_API_KEY in .env")
