"""
Llama 3 8B + LoRA Adapter Client — QuantumGuru Engine v3
Inference: RunPod vLLM with --enable-lora (LLAMA_BASE_URL) only.
No fallback providers.
"""
import httpx
from typing import Optional
from . import config

_TIMEOUT = httpx.Timeout(180.0, connect=10.0)


async def _call_vllm_lora(
    adapter_name: str,
    prompt: str,
    max_tokens: int = 512,
    temperature: float = 0.1,
) -> str:
    """Call vllm LoRA endpoint on RunPod. adapter_name must match --lora-modules registration."""
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
    async with httpx.AsyncClient(timeout=_TIMEOUT, verify=False) as client:
        r = await client.post(
            f"{config.LLAMA_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()


def _parse_llama_prompt(prompt: str) -> list:
    """Parses a Llama 3 formatted prompt string into a list of OpenAI messages."""
    messages = []
    system_marker = "<|start_header_id|>system<|end_header_id|>"
    user_marker = "<|start_header_id|>user<|end_header_id|>"
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
        user_content = remainder.replace(eot_marker, "").strip()

    if system_content:
        messages.append({"role": "system", "content": system_content})
    messages.append({"role": "user", "content": user_content})

    return messages


async def call_adapter(
    adapter_name: str,
    prompt: str,
    max_tokens: int = 512,
    temperature: float = 0.1,
    mlx_adapter_path: Optional[str] = None,
    user_id: str = None,
) -> str:
    """
    Call a LoRA adapter via RunPod vLLM.
    If LLAMA_BASE_URL is set, routes to vLLM directly.
    If not configured, falls through to Qwen 32B as the universal fallback.
    """
    from .execution_logger import log_engagement
    from .qwen_client import call_qwen

    if config.LLAMA_BASE_URL:
        try:
            result = await _call_vllm_lora(adapter_name, prompt, max_tokens, temperature)
            log_engagement(f"Llama-8B LoRA ({adapter_name})", "", prompt, result, user_id=user_id)
            return result
        except Exception as e:
            print(f"[LLAMA] vLLM LoRA call failed for adapter {adapter_name}: {e}. Routing to Qwen.")

    # Fallback within RunPod: use Qwen 32B if Llama adapter unavailable
    messages = _parse_llama_prompt(prompt)
    system_content = next((m["content"] for m in messages if m["role"] == "system"), "")
    user_content = next((m["content"] for m in messages if m["role"] == "user"), prompt)

    res = await call_qwen(
        system=system_content,
        user=user_content,
        max_tokens=max_tokens,
        temperature=temperature,
        user_id=user_id
    )
    log_engagement(f"Qwen-32B (fallback from adapter: {adapter_name})", system_content, prompt, res, user_id=user_id)
    return res
