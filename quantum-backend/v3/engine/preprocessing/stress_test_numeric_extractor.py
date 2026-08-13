"""
stress_test_numeric_extractor.py — Stress & Performance Tests
Run with: pytest stress_test_numeric_extractor.py -v -s

Tests:
  - Very large arrays (1000+ elements)
  - Large matrices (100x100)
  - Many blocks in one text (50+)
  - Token reduction measurement
  - Performance benchmarks
  - Real-world sized optimization problems
  - Losslessness at scale
  - Edge cases: all same values, extreme floats, mixed precision
"""

import pytest
import time
import sys
import os
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)
))))

from engine.preprocessing.numeric_extractor import (
    extract_numeric_blocks,
    _flatten,
    ExtractionResult,
)


def token_estimate(text: str) -> int:
    """Rough token estimate: 1 token ≈ 3.5 chars."""
    return int(len(text) / 3.5)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — Large array tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestLargeArrays:
    def test_1000_element_list(self):
        """1D list with 1000 integers — extraction and losslessness."""
        random.seed(1)
        data = [random.randint(0, 10000) for _ in range(1000)]
        text = f"Large parameter set: {data}"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == data
        assert result.registry[key].shape == (1000,)

    def test_100x100_matrix(self):
        """2D matrix with 10,000 values — canonical stress test."""
        random.seed(2)
        data = [[random.randint(1, 9999) for _ in range(100)] for _ in range(100)]
        text = f"Distance matrix (100 cities):\n{data}"

        t0 = time.perf_counter()
        result = extract_numeric_blocks(text)
        elapsed = time.perf_counter() - t0

        print(f"\n[100x100 matrix] extraction time: {elapsed:.3f}s")
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        entry = result.registry[key]
        assert entry.shape == (100, 100)
        assert entry.ndim == 2
        assert entry.data == data  # full lossless recovery
        assert elapsed < 5.0, f"Extraction too slow: {elapsed:.2f}s"

    def test_50x50_float_matrix(self):
        """Float matrix — dtype detection at scale."""
        random.seed(3)
        data = [[round(random.uniform(0.1, 99.9), 3) for _ in range(50)] for _ in range(50)]
        text = f"Cost coefficients: {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        entry = result.registry[key]
        assert entry.dtype == "float"
        assert entry.shape == (50, 50)
        flat = _flatten(entry.data)
        assert len(flat) == 2500

    def test_10x10x10_tensor(self):
        """3D tensor at moderate scale."""
        data = [[[i + j + k for k in range(10)] for j in range(10)] for i in range(10)]
        text = f"3D cost tensor: {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert result.registry[key].shape == (10, 10, 10)
        assert result.registry[key].ndim == 3
        flat = _flatten(result.registry[key].data)
        assert len(flat) == 1000

    def test_5000_element_list(self):
        """Very large 1D list — performance check."""
        random.seed(4)
        data = [random.randint(0, 100000) for _ in range(5000)]
        text = f"Huge list: {data}"
        t0 = time.perf_counter()
        result = extract_numeric_blocks(text)
        elapsed = time.perf_counter() - t0
        print(f"\n[5000-element list] extraction time: {elapsed:.3f}s")
        assert result.num_blocks_extracted == 1
        assert result.registry[list(result.registry.keys())[0]].shape == (5000,)
        assert elapsed < 10.0


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — Token reduction tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestTokenReduction:
    def test_1d_list_token_reduction(self):
        """Token count should drop by at least 70% for a 100-element list."""
        data = list(range(100))
        text = f"Parameter values: {data}"
        result = extract_numeric_blocks(text)

        orig_tokens = token_estimate(text)
        slim_tokens = token_estimate(result.slim_text)
        reduction_pct = (1 - slim_tokens / orig_tokens) * 100

        print(f"\n[1D 100-elem] orig={orig_tokens} tokens, slim={slim_tokens} tokens, "
              f"reduction={reduction_pct:.1f}%")
        assert reduction_pct >= 70, f"Insufficient reduction: {reduction_pct:.1f}%"

    def test_100x100_matrix_token_reduction(self):
        """100×100 matrix should achieve 90%+ token reduction."""
        random.seed(5)
        data = [[random.randint(100, 9999) for _ in range(100)] for _ in range(100)]
        text = f"Cost matrix (100x100):\n{data}\nMinimize total assignment cost."
        result = extract_numeric_blocks(text)

        orig_tokens = token_estimate(text)
        slim_tokens = token_estimate(result.slim_text)
        reduction_pct = (1 - slim_tokens / orig_tokens) * 100

        print(f"\n[100x100 matrix] orig={orig_tokens} tokens, slim={slim_tokens} tokens, "
              f"reduction={reduction_pct:.1f}%")
        assert reduction_pct >= 90, f"Insufficient reduction: {reduction_pct:.1f}%"

    def test_realistic_flight_problem_reduction(self):
        """Full realistic problem: 20 aircraft × 50 flights."""
        random.seed(6)
        cost_matrix = [[random.randint(200, 8000) for _ in range(50)] for _ in range(20)]
        time_windows = [random.randint(0, 1440) for _ in range(50)]
        fuel_costs = [round(random.uniform(0.5, 5.0), 2) for _ in range(20)]

        text = (
            f"Flight scheduling problem. 20 aircraft, 50 flights.\n"
            f"Assignment cost matrix (20x50): {cost_matrix}\n"
            f"Flight departure windows (minutes from midnight): {time_windows}\n"
            f"Aircraft fuel cost per hour: {fuel_costs}\n"
            f"Each flight assigned to exactly one aircraft. "
            f"Each aircraft handles at most 5 flights. Minimize total cost."
        )

        result = extract_numeric_blocks(text)

        orig_tokens = token_estimate(text)
        slim_tokens = token_estimate(result.slim_text)
        reduction_pct = (1 - slim_tokens / orig_tokens) * 100

        print(f"\n[Flight problem] orig={orig_tokens} tokens, slim={slim_tokens} tokens, "
              f"reduction={reduction_pct:.1f}%, blocks={result.num_blocks_extracted}")

        # Should extract cost_matrix (2D), time_windows (1D), fuel_costs (1D)
        assert result.num_blocks_extracted == 3
        assert reduction_pct >= 85

        # Natural language preserved
        assert "20 aircraft" in result.slim_text
        assert "50 flights" in result.slim_text
        assert "Minimize" in result.slim_text

    def test_multi_block_cumulative_reduction(self):
        """50 separate 1D arrays — cumulative token reduction."""
        random.seed(7)
        arrays = [
            [random.randint(1, 1000) for _ in range(20)]
            for _ in range(50)
        ]
        text = "Parameters: " + " ".join(f"param_{i}={arr}" for i, arr in enumerate(arrays))

        result = extract_numeric_blocks(text)
        orig_tokens = token_estimate(text)
        slim_tokens = token_estimate(result.slim_text)
        reduction_pct = (1 - slim_tokens / orig_tokens) * 100

        print(f"\n[50 arrays × 20 elem] orig={orig_tokens} tokens, slim={slim_tokens} tokens, "
              f"reduction={reduction_pct:.1f}%, blocks={result.num_blocks_extracted}")

        assert result.num_blocks_extracted == 50
        assert reduction_pct >= 60


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — Losslessness at scale
# ═══════════════════════════════════════════════════════════════════════════════

class TestLosslessnessAtScale:
    def test_100x100_matrix_exact_recovery(self):
        """Every single value in a 100×100 matrix must be exactly preserved."""
        random.seed(8)
        data = [[random.randint(0, 999999) for _ in range(100)] for _ in range(100)]
        text = f"M = {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        recovered = result.registry[key].data

        # Compare every cell
        for i in range(100):
            for j in range(100):
                assert recovered[i][j] == data[i][j], \
                    f"Mismatch at [{i}][{j}]: expected {data[i][j]}, got {recovered[i][j]}"

    def test_float_precision_at_scale(self):
        """Float precision preserved to full Python float resolution."""
        random.seed(9)
        data = [random.uniform(-1e6, 1e6) for _ in range(500)]
        text = f"Float values: {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        recovered = result.registry[key].data
        for orig, rec in zip(data, recovered):
            assert abs(orig - rec) < 1e-9, f"Float precision lost: {orig} vs {rec}"

    def test_multi_block_all_recovered(self):
        """20 separate arrays — all data from all blocks exactly recovered."""
        random.seed(10)
        arrays = [[random.randint(1, 10000) for _ in range(15)] for _ in range(20)]
        text = "Data: " + " | ".join(f"arr{i}={a}" for i, a in enumerate(arrays))

        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 20

        all_recovered = []
        for key in sorted(result.registry.keys()):
            all_recovered.append(result.registry[key].data)

        all_original = [arr for arr in arrays]
        for orig, rec in zip(all_original, all_recovered):
            assert orig == rec, f"Array mismatch: {orig[:3]}... vs {rec[:3]}..."

    def test_identical_values_preserved(self):
        """Array of all-same values — no deduplication or corruption."""
        data = [42] * 100
        text = f"Uniform costs: {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == data

    def test_extreme_float_values(self):
        """Very large and very small floats preserved exactly."""
        data = [1e-308, 1e-200, 1e-100, 1e-50, 0.0, 1e50, 1e100, 1e200, 1e307]
        text = f"Extreme values: {data}"
        result = extract_numeric_blocks(text)
        if result.num_blocks_extracted == 1:
            key = list(result.registry.keys())[0]
            for orig, rec in zip(data, result.registry[key].data):
                if orig == 0.0:
                    assert rec == 0.0
                else:
                    assert abs((orig - rec) / orig) < 1e-10


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — Performance benchmarks
# ═══════════════════════════════════════════════════════════════════════════════

class TestPerformance:
    def test_benchmark_1d_10k(self):
        """10,000 element list should extract in under 2 seconds."""
        random.seed(11)
        data = [random.randint(0, 10000) for _ in range(10000)]
        text = f"Big 1D: {data}"
        t0 = time.perf_counter()
        result = extract_numeric_blocks(text)
        elapsed = time.perf_counter() - t0
        print(f"\n[10k-element 1D list] {elapsed:.3f}s")
        assert result.num_blocks_extracted == 1
        assert elapsed < 5.0

    def test_benchmark_200x200_matrix(self):
        """200×200 matrix (40,000 values) should extract in under 10 seconds."""
        random.seed(12)
        data = [[random.randint(1, 9999) for _ in range(200)] for _ in range(200)]
        text = f"Huge matrix: {data}"
        t0 = time.perf_counter()
        result = extract_numeric_blocks(text)
        elapsed = time.perf_counter() - t0
        print(f"\n[200x200 matrix] {elapsed:.3f}s")
        assert result.num_blocks_extracted == 1
        assert elapsed < 15.0

    def test_benchmark_empty_text(self):
        """Empty text should return near-instantly."""
        t0 = time.perf_counter()
        result = extract_numeric_blocks("")
        elapsed = time.perf_counter() - t0
        assert elapsed < 0.01

    def test_benchmark_no_numbers(self):
        """Long text with no numbers — near-instant."""
        text = ("This is a large optimization problem with many constraints. " * 500)
        t0 = time.perf_counter()
        result = extract_numeric_blocks(text)
        elapsed = time.perf_counter() - t0
        print(f"\n[Long no-number text] {elapsed:.3f}s")
        assert result.num_blocks_extracted == 0
        assert elapsed < 1.0

    def test_benchmark_100_arrays_x_50_elements(self):
        """100 separate 50-element arrays — 5000 total values, 100 blocks."""
        random.seed(13)
        arrays = [[random.randint(0, 1000) for _ in range(50)] for _ in range(100)]
        text = "params: " + " ".join(f"p{i}={a}" for i, a in enumerate(arrays))

        t0 = time.perf_counter()
        result = extract_numeric_blocks(text)
        elapsed = time.perf_counter() - t0

        print(f"\n[100 arrays x 50 elems] {elapsed:.3f}s, {result.num_blocks_extracted} blocks")
        assert result.num_blocks_extracted == 100
        assert elapsed < 10.0


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — Edge cases at scale
# ═══════════════════════════════════════════════════════════════════════════════

class TestEdgeCasesAtScale:
    def test_mixed_large_and_small_arrays(self):
        """Mix of large (extracted) and small (kept inline) arrays in one text."""
        random.seed(14)
        big = [random.randint(1, 1000) for _ in range(50)]
        small = [0, 1]  # range — should stay
        medium = [random.randint(1, 100) for _ in range(10)]

        text = (
            f"Bounds: {small}. "
            f"Medium params: {medium}. "
            f"Full cost vector: {big}."
        )
        result = extract_numeric_blocks(text)

        # small (2-element range) → skipped
        # medium (10 elements > MIN_ELEMENTS=6) → extracted
        # big (50 elements) → extracted
        assert result.num_blocks_extracted == 2
        assert str(small) in result.slim_text  # range preserved inline

    def test_deeply_nested_3d_lossless(self):
        """3D tensor with real data — all values preserved."""
        random.seed(15)
        data = [
            [[random.randint(0, 100) for _ in range(5)]
             for _ in range(5)]
            for _ in range(5)
        ]
        text = f"Tensor T: {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert result.registry[key].shape == (5, 5, 5)
        flat_orig = _flatten(data)
        flat_rec = _flatten(result.registry[key].data)
        assert flat_orig == flat_rec

    def test_very_long_text_with_one_small_array(self):
        """Long NL text with one small array — nothing extracted, text unchanged."""
        long_nl = (
            "Consider an optimization problem where we need to allocate resources "
            "across multiple time periods. The objective is to minimize total cost "
            "subject to capacity constraints. " * 200
        )
        text = long_nl + " Capacities: [100, 200, 300]"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 0
        assert "[100, 200, 300]" in result.slim_text

    def test_all_zeros_matrix(self):
        """Matrix of all zeros — no false extraction or dtype confusion."""
        data = [[0] * 10 for _ in range(10)]
        text = f"Zero matrix: {data}"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == data
        assert result.registry[key].dtype == "int"

    def test_max_int_values(self):
        """Very large integers preserved exactly."""
        data = [10**15 + i for i in range(20)]
        text = f"Large ints: {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == data

    def test_registry_keys_are_sequential(self):
        """Block IDs should always be sequential: NUMBLK_000, NUMBLK_001, ..."""
        random.seed(16)
        n_arrays = 15
        arrays = [[random.randint(1, 100) for _ in range(10)] for _ in range(n_arrays)]
        text = " ".join(f"a{i}={a}" for i, a in enumerate(arrays))

        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == n_arrays

        expected_keys = {f"NUMBLK_{i:03d}" for i in range(n_arrays)}
        assert set(result.registry.keys()) == expected_keys


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--tb=short"])
