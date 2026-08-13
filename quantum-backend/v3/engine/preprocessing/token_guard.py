"""
token_guard.py — Phase 3: Token Guard
Quantum Guru Engine v3 / preprocessing layer

Ensures that the prompt sent to the LLM fits within safety token limits.
If a prompt is estimated to exceed the limit, it raises a clean ValueError
with a helpful user message, preventing context exhaustion or timeouts.
"""

def estimate_tokens(text: str) -> int:
    """
    Rough estimate of token count: 1 token ≈ 3.5 characters.
    This is standard and fast, avoiding heavy tokenizer imports.
    """
    if not text:
        return 0
    return int(len(text) / 3.5)


def check_token_budget(text: str, max_tokens: int = 20000, label: str = "prompt") -> int:
    """
    Check if estimated token count exceeds max_tokens.
    If it does, raises ValueError. Otherwise returns the estimated token count.

    Args:
        text: The string to check.
        max_tokens: The safety threshold (default 20,000).
        label: Name of the component for the error message.

    Returns:
        Estimated token count.
    """
    estimated = estimate_tokens(text)
    if estimated > max_tokens:
        raise ValueError(
            f"The input {label} is too large for the AI engine "
            f"(estimated {estimated:,} tokens, safety limit: {max_tokens:,} tokens). "
            f"Please reduce the numeric parameters, variables, or constraints "
            f"to stay within model context limits."
        )
    return estimated
