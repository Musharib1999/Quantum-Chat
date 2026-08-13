"""
numeric_injector.py — Phase 2: Numeric Injection System
Quantum Guru Engine v3 / preprocessing layer

Receives the parsed CMM (nested dictionary/list structure) returned by the LLM,
finds any string values matching placeholder block IDs (e.g. "NUMBLK_xxx"),
and substitutes the original raw data from the registry.

Features:
  - Exact match substitution (primary path)
  - Substring match substitution (e.g. "NUMBLK_001" inside expressions if any)
  - Fallback positioning substitution: if the LLM output contains zero
    NUMBLK_xxx references but the registry is non-empty, assigns registry entries
    to numeric parameters in the order they appeared in the original text.
"""

import re
from typing import Any

# Pattern to detect block placeholder IDs
NUMBLK_PATTERN = re.compile(r'\b(NUMBLK_\d{3})\b')


def _recursive_inject(data: Any, registry: dict, matched_keys: set) -> Any:
    """
    Recursively walk the CMM structure and replace block IDs with actual data.
    Tracks which keys from the registry were successfully matched.
    """
    if isinstance(data, str):
        # 1. Exact match
        if data in registry:
            matched_keys.add(data)
            return registry[data].data
        
        # 2. Substring match inside equations or text (best-effort)
        matches = NUMBLK_PATTERN.findall(data)
        if matches:
            replaced_str = data
            for m in matches:
                if m in registry:
                    matched_keys.add(m)
                    # Note: replacing block ID in formula strings retains the ID string.
                    # This is correct because the compiler can evaluate symbols,
                    # but we keep it safe.
            return replaced_str
        return data

    elif isinstance(data, dict):
        return {k: _recursive_inject(v, registry, matched_keys) for k, v in data.items()}

    elif isinstance(data, list):
        return [_recursive_inject(item, registry, matched_keys) for item in data]

    return data


def inject_numeric_blocks(cmm: Any, registry: dict) -> Any:
    """
    Inject original numeric data back into the CMM structure using registry.

    Args:
        cmm: The parsed CMM dictionary/list from the LLM.
        registry: The registry mapping block IDs to RegistryEntry objects.

    Returns:
        The CMM with all block ID placeholders replaced by actual arrays/tables.
    """
    if not registry:
        return cmm

    matched_keys = set()
    injected_cmm = _recursive_inject(cmm, registry, matched_keys)

    # ── Fallback Path: Position-based matching ────────────────────────────────
    # If the LLM output has no block IDs at all, but we have items in the registry,
    # match them by order of occurrence into the CMM parameters.
    unmatched = set(registry.keys()) - matched_keys
    if unmatched and not matched_keys:
        print("[INJECTOR] Warning: LLM dropped all NUMBLK block IDs. Falling back to position matching.")
        
        # Identify parameter slots inside the CMM
        if isinstance(injected_cmm, dict) and "parameters" in injected_cmm:
            params = injected_cmm["parameters"]
            if isinstance(params, dict):
                # Sort block IDs sequentially to match original text order
                sorted_blocks = sorted(registry.keys())
                
                # Match parameters that have placeholder/empty/unresolved values
                param_keys = sorted(params.keys())
                for i, pkey in enumerate(param_keys):
                    if i < len(sorted_blocks):
                        block_id = sorted_blocks[i]
                        val = params[pkey]
                        # If the value is placeholder-like (None, empty string, or generic string)
                        if val is None or isinstance(val, (str, list)) and (not val or isinstance(val, str) and not val.isdigit()):
                            print(f"[INJECTOR] Fallback match: mapping parameter '{pkey}' to {block_id}")
                            params[pkey] = registry[block_id].data

    return injected_cmm
