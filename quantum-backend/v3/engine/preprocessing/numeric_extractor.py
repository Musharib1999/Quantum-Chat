"""
numeric_extractor.py — Phase 1: Numeric Extraction System
Quantum Guru Engine v3 / preprocessing layer

Extracts large numeric blobs from natural language optimization problems
BEFORE they are passed to the LLM. Replaces each blob with a compact
NUMBLK_xxx placeholder ID and stores the full data in a registry.
The LLM only sees shape-annotated hints — never the raw numbers.

Handles:
    1D flat lists:           [10, 20, 30, ...]
    2D nested lists:         [[1,2,3],[4,5,6],...]
    3D+ tensors:             [[[1,2],[3,4]],...]
    Space-separated tables:  multiple lines of whitespace-delimited numbers
    Inline CSV in prose:     "costs are: 1, 2, 3, 4, 5, 6, 7, 8, 9"
    NumPy notation:          np.array([1, 2, 3, ...])
    Scientific notation:     [1.5e-3, 2.7e+8, ...]

Does NOT extract (kept inline):
    Short lists  (<=MIN_ELEMENTS, default 6)
    Range pairs  ([0, 100])
    Mixed lists  (["A", 1, "B", 2])
    Bool lists   ([True, False])

NOTE: Standalone — imports nothing from the engine.
"""

import re
import ast
from dataclasses import dataclass
from typing import Any

__version__ = "1.0.0"

# ── Configuration ──────────────────────────────────────────────────────────────
MIN_ELEMENTS: int = 6
RANGE_SIZE: int = 2
INLINE_CSV_MIN: int = 8
SPACE_TABLE_MIN_ROWS: int = 2
SPACE_TABLE_MIN_COLS: int = 3


# ── Data Structures ────────────────────────────────────────────────────────────
@dataclass
class RegistryEntry:
    data: Any
    shape: tuple
    dtype: str
    ndim: int
    source_format: str
    position: tuple
    hint: str


@dataclass
class ExtractionResult:
    slim_text: str
    registry: dict
    num_blocks_extracted: int
    extraction_log: list


# ── Internal Helpers ───────────────────────────────────────────────────────────
def _find_balanced_bracket(text: str, start: int) -> int:
    if start >= len(text) or text[start] != '[':
        return -1
    depth = 0
    i = start
    in_string = False
    string_char = None
    while i < len(text):
        c = text[i]
        if in_string:
            if c == '\\' and i + 1 < len(text):
                i += 2
                continue
            if c == string_char:
                in_string = False
        else:
            if c in ('"', "'"):
                in_string = True
                string_char = c
            elif c == '[':
                depth += 1
            elif c == ']':
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    return -1


def _is_all_numeric(data: Any) -> bool:
    if isinstance(data, bool):
        return False
    if isinstance(data, (int, float)):
        return True
    if isinstance(data, list):
        return bool(data) and all(_is_all_numeric(item) for item in data)
    return False


def _flatten(data: Any) -> list:
    result = []
    if isinstance(data, bool):
        pass
    elif isinstance(data, (int, float)):
        result.append(data)
    elif isinstance(data, list):
        for item in data:
            result.extend(_flatten(item))
    return result


def _infer_shape(data: Any) -> tuple:
    if not isinstance(data, list) or not data:
        return (0,)
    if not isinstance(data[0], list):
        return (len(data),)
    return (len(data),) + _infer_shape(data[0])


def _infer_dtype(flat: list) -> str:
    for v in flat:
        if isinstance(v, float) and not v.is_integer():
            return "float"
    return "int"


def _is_range_like(data: Any) -> bool:
    return (
        isinstance(data, list)
        and len(data) == RANGE_SIZE
        and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in data)
    )


def _build_hint(data: Any, shape: tuple, dtype: str, ndim: int, flat: list) -> str:
    shape_str = "x".join(str(d) for d in shape)
    if ndim == 1:
        mn, mx = min(flat), max(flat)
        return f"{shape[0]}-element {dtype} list, range: [{mn} ... {mx}]"
    elif ndim == 2:
        tl, tr = data[0][0], data[0][-1]
        bl, br = data[-1][0], data[-1][-1]
        return f"{shape_str} {dtype} matrix, corners: [TL={tl}, TR={tr} / BL={bl}, BR={br}]"
    else:
        return f"{shape_str} {dtype} tensor, first={flat[0]}, last={flat[-1]}"


def _build_replacement(block_id: str, hint: str, data: Any, ndim: int, flat: list) -> str:
    shape_str = "x".join(str(d) for d in _infer_shape(data))
    if ndim == 1:
        return f"[{flat[0]}, ...{block_id} ({shape_str})..., {flat[-1]}]"
    elif ndim == 2:
        return f"[[{data[0][0]}, ...{block_id} ({shape_str})..., {data[-1][-1]}]]"
    else:
        return f"[[[{flat[0]}, ...{block_id} ({shape_str})..., {flat[-1]}]]]"


# ── NumPy Preprocessing ────────────────────────────────────────────────────────
def _strip_numpy_wrappers(text: str) -> str:
    text = re.sub(r'\bnp\.array\s*\(\s*(\[)', r'\1', text)
    text = re.sub(r'\bnumpy\.array\s*\(\s*(\[)', r'\1', text)
    text = re.sub(r'\barray\s*\(\s*(\[)', r'\1', text)
    text = re.sub(r'(\])\s*\)', r'\1', text)
    return text


# ── Space-Separated Table Extraction ──────────────────────────────────────────
def _extract_space_tables(text: str, registry: dict, counter: list, log: list) -> str:
    lines = text.split('\n')
    result_lines = list(lines)
    i = 0
    while i < len(lines):
        stripped = lines[i].strip()
        if not stripped:
            i += 1
            continue
        tokens = stripped.split()
        try:
            first_row = [float(t) for t in tokens]
        except ValueError:
            i += 1
            continue
        if len(first_row) < SPACE_TABLE_MIN_COLS:
            i += 1
            continue
        table_rows = [first_row]
        j = i + 1
        while j < len(lines):
            nxt = lines[j].strip()
            if not nxt:
                break
            nxt_tokens = nxt.split()
            try:
                nxt_row = [float(t) for t in nxt_tokens]
            except ValueError:
                break
            if len(nxt_row) != len(first_row):
                break
            table_rows.append(nxt_row)
            j += 1
        if len(table_rows) < SPACE_TABLE_MIN_ROWS:
            i += 1
            continue
        data = [
            [int(v) if isinstance(v, float) and v.is_integer() else v for v in row]
            for row in table_rows
        ]
        flat = _flatten(data)
        shape = (len(data), len(data[0]))
        dtype = _infer_dtype(flat)
        block_id = f"NUMBLK_{counter[0]:03d}"
        counter[0] += 1
        preview = str(data[0][:5]) + ("..." if len(data[0]) > 5 else "")
        hint = f"possible {shape[0]}x{shape[1]} {dtype} table (space-separated), first row: {preview}"
        entry = RegistryEntry(data=data, shape=shape, dtype=dtype, ndim=2,
                              source_format="space_table", position=(0, 0), hint=hint)
        registry[block_id] = entry
        log.append(f"{block_id}: space_table {shape[0]}x{shape[1]} {dtype} (lines {i+1}--{j})")
        repl = f"[space-table {shape[0]}x{shape[1]} {dtype}: ...{block_id} ({hint})...]"
        for k in range(i, j):
            result_lines[k] = repl if k == i else ""
        i = j
    return '\n'.join(result_lines)


# ── Vertical List Extraction ───────────────────────────────────────────────────
def _extract_vertical_lists(text: str, registry: dict, counter: list, log: list) -> str:
    lines = text.split('\n')
    result_lines = list(lines)
    i = 0
    while i < len(lines):
        stripped = lines[i].strip()
        if not stripped:
            i += 1
            continue
        if not re.match(r'^-?\d+\.?\d*(?:[eE][+-]?\d+)?$', stripped):
            i += 1
            continue
        start_idx = i
        elems = [
            int(stripped) if '.' not in stripped and 'e' not in stripped.lower()
            else float(stripped)
        ]
        line_indices = [i]
        j = i + 1
        while j < len(lines):
            nxt_stripped = lines[j].strip()
            if not nxt_stripped:
                j += 1
                continue
            if re.match(r'^-?\d+\.?\d*(?:[eE][+-]?\d+)?$', nxt_stripped):
                val = (
                    int(nxt_stripped) if '.' not in nxt_stripped and 'e' not in nxt_stripped.lower()
                    else float(nxt_stripped)
                )
                elems.append(val)
                line_indices.append(j)
                j += 1
            else:
                break
        if len(elems) > MIN_ELEMENTS:
            flat = elems
            shape = (len(elems),)
            dtype = _infer_dtype(flat)
            block_id = f"NUMBLK_{counter[0]:03d}"
            counter[0] += 1
            hint = _build_hint(elems, shape, dtype, 1, flat)
            repl = _build_replacement(block_id, hint, elems, 1, flat)
            entry = RegistryEntry(data=elems, shape=shape, dtype=dtype, ndim=1,
                                  source_format="vertical_list", position=(0, 0), hint=hint)
            registry[block_id] = entry
            log.append(f"{block_id}: vertical_list ({len(elems)} elements) lines {start_idx+1}--{j}")
            result_lines[start_idx] = repl
            for idx in line_indices[1:]:
                result_lines[idx] = ""
            i = j
        else:
            i = start_idx + 1
    return '\n'.join(result_lines)


# ── Inline CSV Extraction ──────────────────────────────────────────────────────
_NUM_PAT = r'-?\d+\.?\d*(?:[eE][+-]?\d+)?'
_INLINE_CSV_RE = re.compile(
    r'(?<!\[)(?<!\w)'
    + _NUM_PAT
    + r'(?:\s*,\s*' + _NUM_PAT + r'){' + str(INLINE_CSV_MIN - 1) + r',}'
    + r'(?!\s*[\],])'
)


def _extract_inline_csv(text: str, registry: dict, counter: list, log: list) -> str:
    replacements = []
    for match in _INLINE_CSV_RE.finditer(text):
        raw = match.group(0)
        num_strs = re.findall(_NUM_PAT, raw)
        try:
            data = [
                int(n) if '.' not in n and 'e' not in n.lower() else float(n)
                for n in num_strs
            ]
        except ValueError:
            continue
        if len(data) < INLINE_CSV_MIN:
            continue
        flat = data
        dtype = _infer_dtype(flat)
        shape = (len(flat),)
        hint = _build_hint(data, shape, dtype, 1, flat)
        block_id = f"NUMBLK_{counter[0]:03d}"
        counter[0] += 1
        entry = RegistryEntry(data=data, shape=shape, dtype=dtype, ndim=1,
                              source_format="inline_csv",
                              position=(match.start(), match.end()), hint=hint)
        registry[block_id] = entry
        log.append(f"{block_id}: inline_csv ({len(data)} elements) chars [{match.start()}--{match.end()}]")
        replacements.append((match.start(), match.end(), _build_replacement(block_id, hint, data, 1, flat)))
    for start, end, repl in sorted(replacements, key=lambda x: -x[0]):
        text = text[:start] + repl + text[end:]
    return text


# ── Main Entry Point ───────────────────────────────────────────────────────────
def extract_numeric_blocks(text: str) -> ExtractionResult:
    """
    Extract all large numeric blobs from `text` and replace with NUMBLK_xxx IDs.

    Processing passes:
        0. Strip numpy wrappers
        1. Bracket-delimited lists (1D, 2D, 3D+) — outermost first
        2. Space-separated tables
        3. Inline CSV in prose

    Returns ExtractionResult with slim_text, registry, count, and debug log.
    """
    if not text or not text.strip():
        return ExtractionResult(slim_text=text or "", registry={},
                                num_blocks_extracted=0, extraction_log=[])

    registry: dict = {}
    counter = [0]
    log: list = []

    # Pass 0
    working = _strip_numpy_wrappers(text)

    # Pass 1: bracket-delimited
    replacements = []
    i = 0
    while i < len(working):
        if working[i] != '[':
            i += 1
            continue
        end = _find_balanced_bracket(working, i)
        if end == -1:
            i += 1
            continue
        candidate = working[i:end + 1]
        try:
            data = ast.literal_eval(candidate)
        except Exception:
            i += 1
            continue
        if not isinstance(data, list) or not _is_all_numeric(data):
            i = end + 1
            continue
        flat = _flatten(data)
        if len(flat) <= MIN_ELEMENTS or _is_range_like(data):
            i = end + 1
            continue
        shape = _infer_shape(data)
        dtype = _infer_dtype(flat)
        ndim = len(shape)
        block_id = f"NUMBLK_{counter[0]:03d}"
        counter[0] += 1
        hint = _build_hint(data, shape, dtype, ndim, flat)
        repl = _build_replacement(block_id, hint, data, ndim, flat)
        entry = RegistryEntry(data=data, shape=shape, dtype=dtype, ndim=ndim,
                              source_format="nested_list" if ndim > 1 else "flat_list",
                              position=(i, end), hint=hint)
        registry[block_id] = entry
        replacements.append((i, end + 1, repl))
        log.append(f"{block_id}: {ndim}D {dtype} shape={shape} ({len(flat)} elements) chars [{i}-{end}]")
        i = end + 1

    slim = working
    for start, end_excl, repl in sorted(replacements, key=lambda x: -x[0]):
        slim = slim[:start] + repl + slim[end_excl:]

    # Pass 2
    slim = _extract_space_tables(slim, registry, counter, log)

    # Pass 2.5: vertical lists
    slim = _extract_vertical_lists(slim, registry, counter, log)

    # Pass 3
    slim = _extract_inline_csv(slim, registry, counter, log)

    return ExtractionResult(slim_text=slim, registry=registry,
                            num_blocks_extracted=counter[0], extraction_log=log)
