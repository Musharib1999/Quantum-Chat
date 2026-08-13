"""
Qwen 3 32B Client — QuantumGuru Engine v3
Inference: RunPod vLLM (QWEN_BASE_URL) only. No fallback providers.
"""
import httpx
import asyncio
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
    user_id: str = None,
) -> str:
    """
    Call Qwen 3 32B on RunPod. No fallback — if RunPod is unavailable,
    raises a maintenance error immediately.
    """
    if not config.QWEN_BASE_URL:
        raise RuntimeError("AI engine is under maintenance — QWEN_BASE_URL not configured.")

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
            log_engagement("Qwen-32B", system, user, response, user_id=user_id)
            return response
        except Exception as e:
            last_error = e
            is_429 = hasattr(e, "response") and e.response is not None and getattr(e.response, "status_code", None) == 429
            print(f"[QWEN] Attempt {attempt + 1} failed: {e}")
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
                raise RuntimeError("AI engine is under maintenance, please try after few minutes") from e

    raise RuntimeError("AI engine is under maintenance, please try after few minutes")
