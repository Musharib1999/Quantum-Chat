"""
test_numeric_injector.py — Unit Tests for numeric_injector.py
Run with: pytest test_numeric_injector.py -v

Covers:
  - Exact match substitution (flat & nested)
  - Dict parameters substitution
  - List of parameters substitution
  - Missing registry keys (no corruption)
  - Fallback positioning when LLM drops block IDs
  - Empty or invalid input handling
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)
))))

from engine.preprocessing.numeric_injector import inject_numeric_blocks
from engine.preprocessing.numeric_extractor import RegistryEntry


# Mock RegistryEntry creation
def make_entry(data, shape=(10,), dtype="int", ndim=1):
    return RegistryEntry(
        data=data,
        shape=shape,
        dtype=dtype,
        ndim=ndim,
        source_format="flat_list",
        position=(0, 0),
        hint="mock",
    )


class TestExactMatch:
    def test_flat_substitution(self):
        cmm = {
            "parameters": {
                "costs": "NUMBLK_000",
                "weights": "NUMBLK_001"
            }
        }
        registry = {
            "NUMBLK_000": make_entry([10, 20, 30]),
            "NUMBLK_001": make_entry([1, 2, 3])
        }
        res = inject_numeric_blocks(cmm, registry)
        assert res["parameters"]["costs"] == [10, 20, 30]
        assert res["parameters"]["weights"] == [1, 2, 3]

    def test_2d_substitution(self):
        cmm = {
            "parameters": {
                "matrix": "NUMBLK_000"
            }
        }
        matrix_data = [[1, 2], [3, 4]]
        registry = {
            "NUMBLK_000": make_entry(matrix_data, shape=(2, 2), ndim=2)
        }
        res = inject_numeric_blocks(cmm, registry)
        assert res["parameters"]["matrix"] == matrix_data

    def test_nested_list_substitution(self):
        cmm = [
            {"name": "a", "val": "NUMBLK_000"},
            {"name": "b", "val": "NUMBLK_001"}
        ]
        registry = {
            "NUMBLK_000": make_entry([100]),
            "NUMBLK_001": make_entry([200])
        }
        res = inject_numeric_blocks(cmm, registry)
        assert res[0]["val"] == [100]
        assert res[1]["val"] == [200]


class TestEdgeCases:
    def test_missing_registry_key(self):
        """If LLM outputs an ID not in registry, do not crash; keep it as-is."""
        cmm = {"param": "NUMBLK_999"}
        registry = {"NUMBLK_000": make_entry([1, 2, 3])}
        res = inject_numeric_blocks(cmm, registry)
        assert res["param"] == "NUMBLK_999"

    def test_empty_registry(self):
        cmm = {"param": "NUMBLK_000"}
        res = inject_numeric_blocks(cmm, {})
        assert res == cmm

    def test_non_string_values(self):
        cmm = {"integer": 42, "float": 3.14, "bool": True, "none": None}
        registry = {"NUMBLK_000": make_entry([1, 2])}
        res = inject_numeric_blocks(cmm, registry)
        assert res == cmm


class TestFallbackPositionMatching:
    def test_fallback_when_ids_dropped(self):
        """
        If CMM contains no block IDs at all, but the parameters dict is present,
        assign the registry arrays sequentially to unmatched parameters.
        """
        cmm = {
            "parameters": {
                "costs": None,
                "weights": ""
            }
        }
        registry = {
            "NUMBLK_000": make_entry([10, 20, 30]),
            "NUMBLK_001": make_entry([1, 2, 3])
        }
        res = inject_numeric_blocks(cmm, registry)
        assert res["parameters"]["costs"] == [10, 20, 30]
        assert res["parameters"]["weights"] == [1, 2, 3]

    def test_no_fallback_if_any_match_exists(self):
        """If even one block matches, do NOT run position fallback."""
        cmm = {
            "parameters": {
                "costs": "NUMBLK_000",
                "weights": None
            }
        }
        registry = {
            "NUMBLK_000": make_entry([10, 20, 30]),
            "NUMBLK_001": make_entry([1, 2, 3])
        }
        res = inject_numeric_blocks(cmm, registry)
        assert res["parameters"]["costs"] == [10, 20, 30]
        assert res["parameters"]["weights"] is None  # no fallback applied because costs matched


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
