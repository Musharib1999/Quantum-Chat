"""
JSON Schema Validator — QuantumGuru Engine v3
Validates Qwen outputs for Steps 2 and 3.
Auto-retries with corrective prompt if output is malformed.
"""
import json
import re
from typing import Callable, Awaitable

# Required keys for NLP Parser output (Step 2)
NLP_PARSER_REQUIRED = {"entities_count", "entities_name", "slots_count", "slots_name"}

# Required keys for Reasoner output (Step 3)
REASONER_REQUIRED = {"feasible", "reasoning_trace", "verified_constraints"}


def _extract_json(text: str) -> dict:
    """Try to extract JSON from text, even if wrapped in markdown or prose."""
    # Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON block
    patterns = [
        r'```json\s*({.*?})\s*```',
        r'```\s*({.*?})\s*```',
        r'({\s*"[^"]+"\s*:.*})',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                continue

    raise ValueError(f"No valid JSON found in output: {text[:200]}")


def validate_nlp_parser(data: dict) -> list:
    """Returns list of missing/invalid fields. Empty list = valid."""
    errors = []
    for key in NLP_PARSER_REQUIRED:
        if key not in data:
            errors.append(f"Missing required key: {key}")
    if "entities_count" in data and not isinstance(data["entities_count"], int):
        errors.append("entities_count must be an integer")
    if "slots_count" in data and not isinstance(data["slots_count"], int):
        errors.append("slots_count must be an integer")
    return errors


def validate_reasoner(data: dict) -> list:
    """Returns list of missing/invalid fields. Empty list = valid."""
    errors = []
    for key in REASONER_REQUIRED:
        if key not in data:
            errors.append(f"Missing required key: {key}")
    if "feasible" in data and not isinstance(data["feasible"], bool):
        errors.append("feasible must be a boolean")
    return errors


async def parse_and_validate(
    raw_output: str,
    validator_fn: Callable[[dict], list],
    call_fn: Callable[..., Awaitable[str]],
    system: str,
    user: str,
    step_name: str = "Step",
    max_retries: int = 2,
    max_tokens: int = 4096,
) -> dict:
    """
    Parse JSON from LLM output, validate, and auto-retry if invalid.

    Args:
        raw_output: Initial LLM response text
        validator_fn: Function that returns list of errors (empty = valid)
        call_fn: Async function to call LLM again (qwen_client.call_qwen)
        system: System prompt for retry
        user: Original user prompt for retry
        step_name: Name for logging
        max_retries: Max retry attempts
    """
    attempt_output = raw_output

    for attempt in range(max_retries + 1):
        try:
            data = _extract_json(attempt_output)
            errors = validator_fn(data)

            if not errors:
                return data  # Valid

            print(f"[VALIDATOR] {step_name} attempt {attempt+1} invalid: {errors}")

            if attempt < max_retries:
                # Retry with corrective prompt
                corrective_user = (
                    f"{user}\n\n"
                    f"Your previous response had errors: {errors}\n"
                    f"Return ONLY valid JSON with these fixes applied. No markdown, no explanation."
                )
                attempt_output = await call_fn(system=system, user=corrective_user, temperature=0.1, max_tokens=max_tokens)

        except ValueError as e:
            print(f"[VALIDATOR] {step_name} attempt {attempt+1} parse error: {e}")
            if attempt < max_retries:
                corrective_user = (
                    f"{user}\n\n"
                    f"Return ONLY a raw JSON object. No markdown, no text, no code blocks. Just {{...}}"
                )
                attempt_output = await call_fn(system=system, user=corrective_user, temperature=0.05, max_tokens=max_tokens)

    # All retries exhausted — return safe fallback
    print(f"[VALIDATOR] {step_name} failed after {max_retries+1} attempts, using fallback")
    return {}

# Required keys for Pattern Classifier output (v3)
CLASSIFIER_REQUIRED = {"problem_pattern", "confidence"}

# Required keys for Selection Parser output (v3)
SELECTION_REQUIRED = {"entities_count", "entities_name", "objective"}


def validate_pattern_classifier(data: dict) -> list:
    errors = []
    for key in CLASSIFIER_REQUIRED:
        if key not in data:
            errors.append(f"Missing required key: {key}")
    if "problem_pattern" in data and data["problem_pattern"] not in {"selection", "assignment", "scheduling", "routing", "knapsack", "packing", "other"}:
        errors.append(f"Invalid problem_pattern: {data['problem_pattern']}")
    return errors


def validate_selection_parser(data: dict) -> list:
    errors = []
    for key in SELECTION_REQUIRED:
        if key not in data:
            errors.append(f"Missing required key: {key}")
    if "entities_count" in data and not isinstance(data["entities_count"], int):
        errors.append("entities_count must be an integer")
    return errors

# V6 Compositional schema validation
def validate_compositional_parser(data: dict) -> list:
    errors = []
    if "variable_registry" not in data or not isinstance(data["variable_registry"], list):
        errors.append("Missing or invalid variable_registry list")
    else:
        for i, var in enumerate(data["variable_registry"]):
            for key in ["id", "name", "domain", "dimensions"]:
                if key not in var:
                    errors.append(f"Variable {i} missing key: {key}")
            if "domain" in var and var["domain"] not in {"boolean", "integer", "continuous"}:
                errors.append(f"Variable {i} invalid domain: {var['domain']}")

    if "constraint_registry" not in data or not isinstance(data["constraint_registry"], list):
        errors.append("Missing or invalid constraint_registry list")
    else:
        for i, c in enumerate(data["constraint_registry"]):
            for key in ["id", "name", "family", "operator"]:
                if key not in c:
                    errors.append(f"Constraint {i} missing key: {key}")
            if "operator" in c:
                allowed_ops = {"<=", ">=", "=="}
                if "logical_relation" in c or c.get("family") in {"dependency", "mutual_exclusion"}:
                    allowed_ops.update({"AND", "OR", "IF_THEN", "XOR", "NOT"})
                if c["operator"] not in allowed_ops:
                    errors.append(f"Constraint {i} invalid operator: {c['operator']}")

    return errors
