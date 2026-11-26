"""
groq_client.py — Groq Inference Client
Quantum Guru Engine v3

Sends requests to Groq Cloud API (api.groq.com/openai/v1) using standard
urllib.request library (zero dependencies, fully sandboxed compatible).

Patch v3.3: Use reasoning_format="hidden" for Qwen models on Groq.
- Qwen models emit extensive reasoning text by default, which can consume
  thousands of tokens and cause 429 Rate Limit issues.
- Setting "reasoning_format": "hidden" tells Groq to do the reasoning internally
  but only return the clean final content in the message.
"""

import os
import json
import re
import urllib.request
import urllib.error
from typing import Optional
from . import config


def _strip_think_tags(text: str) -> str:
    """Remove <think>...</think> blocks emitted by Qwen3 on Groq if any leak through."""
    return re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()


async def call_groq(
    system: str,
    user: str,
    max_tokens: int = 4096,
    temperature: float = 0.1,
    model: str = None,
    _tried_models: set = None,
) -> str:
    """
    Call Groq completions API with OpenAI-compatible payload.

    Args:
        system: System instructions
        user: User query / problem statement
        max_tokens: Maximum tokens in response (includes hidden reasoning tokens for reasoning models)
        temperature: Sampling temperature
        model: Optional model override (defaults to GROQ_PRIMARY_MODEL)

    Returns:
        Raw string response from the LLM.
    """
    api_key = config.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set.")

    model_name = model or config.GROQ_PRIMARY_MODEL or "qwen/qwen3.8-27b"
    tried = set(_tried_models) if _tried_models else set()
    tried.add(model_name)

    is_gpt_oss = "gpt-oss" in model_name.lower()
    # Reasoning models (gpt-oss) consume hidden thinking tokens inside max_tokens; give them
    # sufficient headroom + low reasoning effort so structured JSON is never truncated at 2048.
    if is_gpt_oss:
        effective_max_tokens = min(max(max_tokens, 6144), 8192) if max_tokens > 100 else max_tokens
    else:
        effective_max_tokens = min(max_tokens, 4096) if max_tokens > 100 else max_tokens

    # Ordered fallback chain: prefer non-reasoning llama-3.3-70b-versatile first on 429/truncation,
    # then openai/gpt-oss-120b with low reasoning effort.
    FALLBACK_ORDER = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"]

    def _next_fallback() -> Optional[str]:
        for candidate in FALLBACK_ORDER:
            if candidate not in tried:
                return candidate
        return None

    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system + "\n\n[CRITICAL DIRECTIVE: Always write complete, well-formed responses. Ensure all code blocks and explanations are fully closed and cleanly concluded without cutting off mid-sentence.]"},
            {"role": "user", "content": user}
        ],
        "max_tokens": effective_max_tokens,
        "temperature": max(temperature, 0.2),
        "frequency_penalty": 0.3,
        "presence_penalty": 0.1
    }

    # Suppress/minimize reasoning tokens on Groq to avoid JSON truncation and save rate-limit quota
    if "qwen" in model_name.lower():
        payload["reasoning_effort"] = "none"
    elif is_gpt_oss:
        payload["reasoning_effort"] = "low"
        payload["reasoning_format"] = "hidden"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )

    try:
        import asyncio
        loop = asyncio.get_event_loop()

        def do_request():
            import ssl
            context = ssl._create_unverified_context()
            with urllib.request.urlopen(req, context=context, timeout=30) as response:
                return response.read().decode("utf-8")

        response_json = await loop.run_in_executor(None, do_request)
        data = json.loads(response_json)
        choice = data["choices"][0]
        raw_content = choice["message"]["content"] or ""
        finish_reason = choice.get("finish_reason")
        
        if finish_reason == "length":
            print(f"[groq_client] ⚠️ WARNING: Response TRUNCATED on '{model_name}' by max_tokens={effective_max_tokens} limit! finish_reason='length'")
            # If a reasoning model still truncated, retry once on non-reasoning llama-3.3-70b-versatile if untried
            if is_gpt_oss and "llama-3.3-70b-versatile" not in tried:
                print(f"[groq_client] Retrying truncated reasoning output with 'llama-3.3-70b-versatile'...")
                return await call_groq(
                    system=system,
                    user=user,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    model="llama-3.3-70b-versatile",
                    _tried_models=tried,
                )
            cleaned = _strip_think_tags(raw_content)
            if cleaned.count("```") % 2 != 0:
                cleaned += "\n```"
            return cleaned
        else:
            print(f"[groq_client] Finish reason ({model_name}): {finish_reason} (tokens ok)")

        print(f"[groq_client] raw_content length: {len(raw_content)}")
        print(f"[groq_client] raw_content preview: {repr(raw_content[:200])}")

        # Double check and strip any Qwen3 <think>...</think> blocks if they leak through
        return _strip_think_tags(raw_content)

    except urllib.error.HTTPError as e:
        error_msg = e.read().decode("utf-8")
        try:
            parsed_error = json.loads(error_msg)
            message = parsed_error.get("error", {}).get("message", error_msg)
        except Exception:
            message = error_msg

        next_model = _next_fallback()
        # Fallback if rate limited (429) or model unavailable (400, 404)
        if e.code == 429 and next_model:
            print(f"[groq_client] Rate limited on '{model_name}'. Retrying with '{next_model}'...")
            import asyncio
            await asyncio.sleep(0.6)
            return await call_groq(
                system=system,
                user=user,
                max_tokens=max_tokens,
                temperature=temperature,
                model=next_model,
                _tried_models=tried,
            )

        if e.code in (400, 404) and next_model:
            print(f"[groq_client] Model '{model_name}' unavailable ({message}). Retrying with '{next_model}'...")
            return await call_groq(
                system=system,
                user=user,
                max_tokens=max_tokens,
                temperature=temperature,
                model=next_model,
                _tried_models=tried,
            )

        raise RuntimeError(f"Groq API Error {e.code}: {message}") from e
    except Exception as e:
        raise RuntimeError(f"Failed to communicate with Groq: {e}") from e
