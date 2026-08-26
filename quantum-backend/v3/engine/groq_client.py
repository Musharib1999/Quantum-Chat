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
) -> str:
    """
    Call Groq completions API with OpenAI-compatible payload.

    Args:
        system: System instructions
        user: User query / problem statement
        max_tokens: Maximum tokens in response (includes hidden reasoning tokens)
        temperature: Sampling temperature
        model: Optional model override (defaults to GROQ_PRIMARY_MODEL)

    Returns:
        Raw string response from the LLM.
    """
    api_key = config.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set.")

    model_name = model or config.GROQ_PRIMARY_MODEL or "qwen/qwen3.6-27b"

    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ],
        "max_tokens": max_tokens,
        "temperature": temperature
    }

    # Suppress reasoning tokens for Qwen models on Groq to save output tokens and avoid rate limits
    if "qwen" in model_name.lower():
        payload["reasoning_effort"] = "none"
    elif "gpt-oss" in model_name.lower():
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
        raw_content = data["choices"][0]["message"]["content"]
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
        raise RuntimeError(f"Groq API Error {e.code}: {message}") from e
    except Exception as e:
        raise RuntimeError(f"Failed to communicate with Groq: {e}") from e
