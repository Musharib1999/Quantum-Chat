import re
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
    async with httpx.AsyncClient(timeout=_TIMEOUT, verify=False) as client:
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
    Call Qwen 3 32B on RunPod strictly with no fallback.
    If the endpoint is not set or fails, immediately raises a maintenance error.
    """
    if not config.QWEN_BASE_URL:
        print("[QWEN] RunPod QWEN_BASE_URL is not configured. Raising maintenance exception.")
        raise RuntimeError("AI engine is under maintenance, please try after few minutes")

    last_error = None
    for attempt in range(retries + 1):
        try:
            response = await _call_openai_compat(
                base_url=config.QWEN_BASE_URL,
                api_key=config.QWEN_API_KEY,
                model=config.QWEN_MODEL,
                system=system,
                user=user,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            from .execution_logger import log_engagement
            log_engagement("Qwen-32B", system, user, response)
            return response
        except Exception as e:
            last_error = e
            is_429 = False
            if hasattr(e, "response") and e.response is not None and getattr(e.response, "status_code", None) == 429:
                is_429 = True
                print("[QWEN] Rate limit detected (429). Will sleep and retry.")
            
            print(f"[QWEN] API call attempt {attempt+1} failed: {e}")
            if attempt < retries:
                sleep_seconds = 2 ** attempt
                if is_429:
                    retry_after = e.response.headers.get("retry-after")
                    if retry_after:
                        try:
                            sleep_seconds = float(retry_after) + 0.5
                            print(f"[QWEN] Rate limit (429). Sleeping for {sleep_seconds}s from headers.")
                        except ValueError:
                            pass
                await asyncio.sleep(sleep_seconds)
            else:
                print("[QWEN] All retries exhausted. Raising maintenance exception.")
                raise RuntimeError("AI engine is under maintenance, please try after few minutes") from e

    raise RuntimeError("AI engine is under maintenance, please try after few minutes")


async def call_groq_llama70b(
    system: str,
    user: str,
    max_tokens: int = 1024,
    temperature: float = 0.2,
    retries: int = 2,
) -> str:
    """Alias to call_qwen to ensure no legacy calls fall back to Groq."""
    return await call_qwen(
        system=system,
        user=user,
        max_tokens=max_tokens,
        temperature=temperature,
        retries=retries,
    )
