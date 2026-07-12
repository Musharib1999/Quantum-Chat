import re
"""
Qwen 3 32B Client — QuantumGuru Engine v2
Primary: RunPod vllm (QWEN_BASE_URL)
Fallback 1: Groq llama-3.3-70b (when RunPod not available)
Fallback 2: Local Ollama llama3.1 (when Groq hits rate limit/offline)
"""
import httpx
import json
import asyncio
from typing import Optional
from . import config

_TIMEOUT = httpx.Timeout(200.0, connect=10.0)

OLLAMA_URL = "http://127.0.0.1:11434/v1"
OLLAMA_MODEL = "llama3.1"


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


async def _call_ollama(system: str, user: str) -> str:
    """Fallback call to local Ollama server."""
    try:
        print(f"[OLLAMA] Attempting local Llama3.1 fallback call...")
        return await _call_openai_compat(
            base_url=OLLAMA_URL,
            api_key="none",
            model=OLLAMA_MODEL,
            system=system,
            user=user,
            max_tokens=1024,
            temperature=0.2
        )
    except Exception as e:
        print(f"[OLLAMA] Local fallback failed: {e}")
        raise e


async def call_qwen(
    system: str,
    user: str,
    max_tokens: int = 1024,
    temperature: float = 0.2,
    retries: int = 2,
) -> str:
    """
    Call Qwen 3 32B on RunPod, falling back to Groq.
    """
    last_error = None
    if config.QWEN_BASE_URL:
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
                is_429 = False
                if hasattr(e, "response") and e.response is not None and getattr(e.response, "status_code", None) == 429:
                    is_429 = True
                    print("[QWEN] Rate limit detected (429). Will sleep and retry.")
                
                last_error = e
                print(f"[GROQ-QWEN] API call attempt {attempt+1} failed: {e}")
                if attempt < retries:
                    sleep_seconds = 2 ** attempt
                    if is_429:
                        retry_after = e.response.headers.get("retry-after")
                        if retry_after:
                            try:
                                sleep_seconds = float(retry_after) + 0.5
                                print(f"[GROQ-QWEN] Rate limit (429). Sleeping for {sleep_seconds}s from headers.")
                            except ValueError:
                                pass
                        else:
                            body_text = e.response.text
                            match = re.search(r"retry in ([\d\.]+)s", body_text, re.IGNORECASE)
                            if match:
                                try:
                                    sleep_seconds = float(match.group(1)) + 0.5
                                    print(f"[GROQ-QWEN] Rate limit (429). Sleeping for {sleep_seconds}s from body.")
                                except ValueError:
                                    pass
                    await asyncio.sleep(sleep_seconds)
                else:
                    if is_429:
                        raise RuntimeError("AI engine is under maintenance, please try after few minutes") from e
    if config.GROQ_API_KEY:
        for attempt in range(retries + 1):
            try:
                response = await _call_openai_compat(
                    base_url=config.GROQ_BASE_URL,
                    api_key=config.GROQ_API_KEY,
                    model=config.GROQ_MODEL,
                    system=system,
                    user=user,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
                from .execution_logger import log_engagement
                log_engagement("Groq (Llama-3.3-70b)", system, user, response)
                await asyncio.sleep(15.0)
                return response
            except Exception as e:
                is_429 = False
                if hasattr(e, "response") and e.response is not None and getattr(e.response, "status_code", None) == 429:
                    is_429 = True
                    print("[GROQ-QWEN-FALLBACK] Rate limit detected (429). Will sleep and retry.")
                last_error = e
                if attempt < retries:
                    sleep_seconds = 2 ** attempt
                    if is_429:
                        retry_after = e.response.headers.get("retry-after")
                        if retry_after:
                            try:
                                sleep_seconds = float(retry_after) + 0.5
                            except ValueError:
                                pass
                    await asyncio.sleep(sleep_seconds)
                else:
                    if is_429:
                        raise RuntimeError("AI engine is under maintenance, please try after few minutes") from e
    raise RuntimeError("AI failed")


async def call_groq_llama70b(
    system: str,
    user: str,
    max_tokens: int = 1024,
    temperature: float = 0.2,
    retries: int = 2,
) -> str:
    """Force call Groq Llama 70B directly."""
    last_error = None
    if config.GROQ_API_KEY:
        for attempt in range(retries + 1):
            try:
                response = await _call_openai_compat(
                    base_url=config.GROQ_BASE_URL,
                    api_key=config.GROQ_API_KEY,
                    model=config.GROQ_MODEL,
                    system=system,
                    user=user,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
                from .execution_logger import log_engagement
                log_engagement("Groq (Llama-3.3-70b)", system, user, response)
                await asyncio.sleep(15.0)
                return response
            except Exception as e:
                is_429 = False
                if hasattr(e, "response") and e.response is not None and getattr(e.response, "status_code", None) == 429:
                    is_429 = True
                    print("[GROQ-70B] Rate limit detected (429). Will sleep and retry.")
                last_error = e
                if attempt < retries:
                    sleep_seconds = 2 ** attempt
                    if is_429:
                        retry_after = e.response.headers.get("retry-after")
                        if retry_after:
                            try:
                                sleep_seconds = float(retry_after) + 0.5
                            except ValueError:
                                pass
                    await asyncio.sleep(sleep_seconds)
                else:
                    if is_429:
                        raise RuntimeError("AI engine is under maintenance, please try after few minutes") from e
        raise RuntimeError("AI failed")
    raise RuntimeError("Groq API key not configured.")
