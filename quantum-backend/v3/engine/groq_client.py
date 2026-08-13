"""
groq_client.py — Groq Inference Client (Variant 2)
Quantum Guru Engine v3 / scratch codebase

Sends requests to Groq Cloud API (api.groq.com/openai/v1) using standard
urllib.request library (zero dependencies, fully sandboxed compatible).
"""

import os
import json
import urllib.request
import urllib.error
from . import config

async def call_groq(
    system: str,
    user: str,
    max_tokens: int = 4096,
    temperature: float = 0.1,
    model: str = None
) -> str:
    """
    Call Groq completions API with OpenAI-compatible payload.

    Args:
        system: System instructions
        user: User query / problem statement
        max_tokens: Maximum tokens in response
        temperature: Sampling temperature
        model: Optional model override (defaults to GROQ_PRIMARY_MODEL)

    Returns:
        Raw string response from the LLM.
    """
    api_key = config.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set.")

    model_name = model or config.GROQ_PRIMARY_MODEL or "llama-3.3-70b-versatile"
    
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
        # Run blocking request inside executor to keep async loop responsive
        import asyncio
        loop = asyncio.get_event_loop()
        
        def do_request():
            import ssl
            context = ssl._create_unverified_context()
            with urllib.request.urlopen(req, context=context, timeout=30) as response:
                return response.read().decode("utf-8")
                
        response_json = await loop.run_in_executor(None, do_request)
        data = json.loads(response_json)
        return data["choices"][0]["message"]["content"]

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
