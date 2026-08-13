"""
llm_client.py — Unified LLM Abstraction Layer
Quantum Guru Engine v3 / scratch codebase

Routes reasoning/nlp and fast/coding requests to the configured provider:
  - RunPod vLLM (Qwen 3 32B + Llama 3 8B + LoRA)
  - Groq Cloud API (Llama 3.3 70B + Llama 3 8B)
"""

from . import config

async def call_primary(
    system: str,
    user: str,
    max_tokens: int = 4096,
    temperature: float = 0.1
) -> str:
    """
    Call the primary reasoning model (Qwen 32B on RunPod, or Llama 70B on Groq).
    """
    provider = getattr(config, "INFERENCE_PROVIDER", "runpod")
    
    if provider == "groq":
        from .groq_client import call_groq
        return await call_groq(
            system=system,
            user=user,
            max_tokens=max_tokens,
            temperature=temperature,
            model=config.GROQ_PRIMARY_MODEL
        )
    else:
        # Default fallback to original RunPod Qwen client
        from .qwen_client import call_qwen
        return await call_qwen(
            system=system,
            user=user,
            max_tokens=max_tokens,
            temperature=temperature
        )


async def call_fast(
    adapter_name: str,
    prompt: str,
    max_tokens: int = 400,
    temperature: float = 0.1,
    mlx_adapter_path: str = None
) -> str:
    """
    Call the fast/coder model (Llama 8B LoRA on RunPod, or Llama 8B on Groq).
    Maintains exact signature compatibility with original llama_client.call_adapter.
    """
    provider = getattr(config, "INFERENCE_PROVIDER", "runpod")
    
    if provider == "groq":
        from .groq_client import call_groq
        
        # ── Parse Prompt Template if present ──────────────────────────────────
        # Llama template prompts contain <|start_header_id|>system<|end_header_id|>
        # We extract them so we send correct roles to Groq.
        system_content = "You are a helpful coding assistant."
        user_content = prompt
        
        import re
        system_match = [m.start() for m in re.finditer(r'<\|start_header_id\|>system<\|end_header_id\|>', prompt)]
        
        if system_match:
            # Basic parsing of typical prompt templates
            import re
            sys_pat = r'<\|start_header_id\|>system<\|end_header_id\|>\n\n(.*?)\n\n<\|eot_id\|>'
            usr_pat = r'<\|start_header_id\|>user<\|end_header_id\|>\n\n(.*?)\n\n<\|eot_id\|>'
            
            sys_m = re.search(sys_pat, prompt, re.DOTALL)
            usr_m = re.search(usr_pat, prompt, re.DOTALL)
            
            if sys_m:
                system_content = sys_m.group(1).strip()
            if usr_m:
                user_content = usr_m.group(1).strip()
                
        return await call_groq(
            system=system_content,
            user=user_content,
            max_tokens=max_tokens,
            temperature=temperature,
            model=config.GROQ_FAST_MODEL
        )
    else:
        # Default fallback to original RunPod Llama adapter client
        from .llama_client import call_adapter
        return await call_adapter(
            adapter_name=adapter_name,
            prompt=prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            mlx_adapter_path=mlx_adapter_path
        )
