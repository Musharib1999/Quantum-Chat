"""
test_numeric_extractor.py — Unit Tests for numeric_extractor.py
Run with: pytest test_numeric_extractor.py -v

Covers all 8 extraction types + all skip cases + edge cases + losslessness.
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)
))))

from engine.preprocessing.numeric_extractor import (
    extract_numeric_blocks,
    _find_balanced_bracket,
    _is_all_numeric,
    _flatten,
    _infer_shape,
    _infer_dtype,
    _is_range_like,
    _strip_numpy_wrappers,
    MIN_ELEMENTS,
)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — Internal helper unit tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestFindBalancedBracket:
    def test_simple(self):
        assert _find_balanced_bracket("[1,2,3]", 0) == 6

    def test_nested(self):
        assert _find_balanced_bracket("[[1,2],[3,4]]", 0) == 12

    def test_deeply_nested(self):
        assert _find_balanced_bracket("[[[1]]]", 0) == 6

    def test_not_bracket(self):
        assert _find_balanced_bracket("hello", 0) == -1

    def test_unbalanced(self):
        assert _find_balanced_bracket("[1,2,3", 0) == -1

    def test_mid_string(self):
        text = "prefix [1,2,3] suffix"
        assert _find_balanced_bracket(text, 7) == 13

    def test_with_string_inside(self):
        # String containing bracket — should not confuse depth counter
        text = '["a[b]c", 1, 2]'
        assert _find_balanced_bracket(text, 0) == len(text) - 1


class TestIsAllNumeric:
    def test_int(self):           assert _is_all_numeric(42)
    def test_float(self):         assert _is_all_numeric(3.14)
    def test_1d_list(self):       assert _is_all_numeric([1, 2, 3])
    def test_2d_list(self):       assert _is_all_numeric([[1, 2], [3, 4]])
    def test_mixed_types(self):   assert not _is_all_numeric([1, "a", 3])
    def test_bool_rejected(self): assert not _is_all_numeric([True, False])
    def test_none_rejected(self): assert not _is_all_numeric([1, None, 3])
    def test_empty_list(self):    assert not _is_all_numeric([])
    def test_nested_empty(self):  assert not _is_all_numeric([[]])


class TestFlatten:
    def test_1d(self):
        assert _flatten([1, 2, 3]) == [1, 2, 3]

    def test_2d(self):
        assert _flatten([[1, 2], [3, 4]]) == [1, 2, 3, 4]

    def test_3d(self):
        assert _flatten([[[1, 2], [3, 4]], [[5, 6], [7, 8]]]) == [1, 2, 3, 4, 5, 6, 7, 8]

    def test_scalar(self):
        assert _flatten(5) == [5]

    def test_empty(self):
        assert _flatten([]) == []


class TestInferShape:
    def test_1d(self):    assert _infer_shape([1, 2, 3]) == (3,)
    def test_2d(self):    assert _infer_shape([[1,2],[3,4]]) == (2, 2)
    def test_3d(self):    assert _infer_shape([[[1,2],[3,4]],[[5,6],[7,8]]]) == (2, 2, 2)
    def test_rect(self):  assert _infer_shape([[1,2,3],[4,5,6]]) == (2, 3)
    def test_empty(self): assert _infer_shape([]) == (0,)


class TestInferDtype:
    def test_all_int(self):   assert _infer_dtype([1, 2, 3]) == "int"
    def test_has_float(self): assert _infer_dtype([1, 2.5, 3]) == "float"
    def test_whole_float(self): assert _infer_dtype([1.0, 2.0, 3.0]) == "int"
    def test_sci_int(self):   assert _infer_dtype([1e2, 2e3]) == "int"   # 100.0, 2000.0 → whole
    def test_sci_float(self): assert _infer_dtype([1.5e-2, 2.3e-1]) == "float"


class TestIsRangeLike:
    def test_int_range(self):   assert _is_range_like([0, 100])
    def test_float_range(self): assert _is_range_like([0.0, 1.0])
    def test_neg_range(self):   assert _is_range_like([-1, 1])
    def test_three_elem(self):  assert not _is_range_like([0, 50, 100])
    def test_one_elem(self):    assert not _is_range_like([42])
    def test_bool(self):        assert not _is_range_like([True, False])


class TestStripNumpyWrappers:
    def test_np_array(self):
        result = _strip_numpy_wrappers("np.array([1, 2, 3])")
        assert result.startswith("[")
        assert "np.array" not in result

    def test_numpy_array(self):
        result = _strip_numpy_wrappers("numpy.array([4, 5, 6])")
        assert "numpy.array" not in result

    def test_bare_array(self):
        result = _strip_numpy_wrappers("array([7, 8, 9])")
        assert "array(" not in result

    def test_no_wrapper(self):
        text = "[1, 2, 3]"
        assert _strip_numpy_wrappers(text) == text


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — Extraction type tests (what SHOULD be extracted)
# ═══════════════════════════════════════════════════════════════════════════════

class TestExtract1DList:
    def test_basic_extraction(self):
        text = "Costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        assert result.registry[key].ndim == 1
        assert result.registry[key].shape == (10,)
        assert result.registry[key].dtype == "int"
        assert result.registry[key].source_format == "flat_list"

    def test_lossless_data(self):
        data = list(range(20))
        text = f"Values: {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == data

    def test_float_list(self):
        text = "Weights: [1.1, 2.2, 3.3, 4.4, 5.5, 6.6, 7.7, 8.8, 9.9, 10.1]"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        assert result.registry[key].dtype == "float"

    def test_negative_values(self):
        data = [-5, -3, -1, 0, 1, 3, 5, 7, 9, 11]
        text = f"Offsets: {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == data

    def test_hint_contains_range(self):
        text = "[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        hint = result.registry[key].hint
        assert "10" in hint and "100" in hint  # min and max

    def test_replacement_shows_first_last(self):
        text = "[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]"
        result = extract_numeric_blocks(text)
        assert "10" in result.slim_text   # first value
        assert "100" in result.slim_text  # last value
        assert "NUMBLK_000" in result.slim_text


class TestExtract2DMatrix:
    def test_basic_2d(self):
        text = "Cost matrix: [[1,2,3,4,5],[6,7,8,9,10],[11,12,13,14,15]]"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        entry = result.registry[key]
        assert entry.ndim == 2
        assert entry.shape == (3, 5)

    def test_2d_lossless(self):
        data = [[i * 5 + j for j in range(5)] for i in range(4)]
        text = f"Matrix: {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == data

    def test_2d_corners_in_hint(self):
        data = [[100, 200, 300], [400, 500, 600], [700, 800, 999]]
        text = f"data = {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        hint = result.registry[key].hint
        assert "100" in hint  # TL
        assert "999" in hint  # BR

    def test_2d_replacement_bracket_notation(self):
        data = [[1,2,3,4,5],[6,7,8,9,10],[11,12,13,14,15]]
        text = f"M = {data}"
        result = extract_numeric_blocks(text)
        assert "[[" in result.slim_text   # 2D replacement uses [[...]]
        assert "NUMBLK" in result.slim_text

    def test_outer_extracted_not_inner(self):
        """2D list: the outer block should be extracted as one unit, not inner 1D lists separately."""
        data = [[10, 20, 30, 40, 50], [60, 70, 80, 90, 100]]
        text = f"Distances: {data}"
        result = extract_numeric_blocks(text)
        # Should be exactly 1 block (the outer 2D), not 2 blocks (inner 1D lists)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        assert result.registry[key].ndim == 2


class TestExtract3DTensor:
    def test_basic_3d(self):
        data = [[[1,2,3],[4,5,6]],[[7,8,9],[10,11,12]]]
        text = f"Tensor: {data}"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        entry = result.registry[key]
        assert entry.ndim == 3
        assert entry.shape == (2, 2, 3)

    def test_3d_lossless(self):
        data = [[[i+j+k for k in range(3)] for j in range(4)] for i in range(2)]
        text = f"Cost tensor: {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == data

    def test_3d_hint_format(self):
        data = [[[1,2],[3,4]],[[5,6],[7,8]]]
        text = f"T = {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        hint = result.registry[key].hint
        assert "tensor" in hint
        assert "2x2x2" in hint


class TestExtractNumpyNotation:
    def test_np_array_1d(self):
        text = "costs = np.array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        assert result.registry[key].ndim == 1

    def test_np_array_2d(self):
        data = [[1,2,3,4,5],[6,7,8,9,10],[11,12,13,14,15]]
        text = f"M = np.array({data})"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        assert result.registry[key].ndim == 2

    def test_numpy_full_name(self):
        text = "arr = numpy.array([1.1, 2.2, 3.3, 4.4, 5.5, 6.6, 7.7, 8.8, 9.9, 10.1])"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1


class TestExtractScientificNotation:
    def test_sci_float_list(self):
        data = [1.5e-3, 2.7e-3, 3.1e-3, 4.2e-3, 5.0e-3, 6.1e-3, 7.3e-3, 8.8e-3]
        text = f"Tolerances: {data}"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        assert result.registry[key].dtype == "float"

    def test_sci_int_like(self):
        # 1e2 = 100.0 — is_integer() == True → should be "int"
        text = "Big values: [1e2, 2e3, 3e4, 4e5, 5e6, 6e7, 7e8, 8e9]"
        result = extract_numeric_blocks(text)
        # ast.literal_eval should handle this
        if result.num_blocks_extracted == 1:
            key = list(result.registry.keys())[0]
            assert result.registry[key].dtype == "int"


class TestExtractSpaceTable:
    def test_basic_table(self):
        text = "Distance matrix:\n10 20 30 40 50\n60 70 80 90 100\n110 120 130 140 150"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        entry = result.registry[key]
        assert entry.ndim == 2
        assert entry.shape == (3, 5)
        assert entry.source_format == "space_table"

    def test_table_lossless(self):
        rows = [[10*i + j for j in range(5)] for i in range(4)]
        lines = "\n".join(" ".join(str(v) for v in row) for row in rows)
        text = f"Data:\n{lines}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == rows

    def test_float_table(self):
        text = "1.1 2.2 3.3 4.4 5.5\n6.6 7.7 8.8 9.9 10.1"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        assert result.registry[key].dtype == "float"


class TestExtractInlineCSV:
    def test_basic_inline(self):
        text = "The processing times are: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100 minutes."
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        assert result.registry[key].source_format == "inline_csv"

    def test_inline_lossless(self):
        values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
        text = "Costs: " + ", ".join(str(v) for v in values)
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == values


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — Skip tests (what should NOT be extracted)
# ═══════════════════════════════════════════════════════════════════════════════

class TestSkipCases:
    def test_skip_short_list(self):
        """Lists with <= MIN_ELEMENTS elements should NOT be extracted."""
        text = f"Small: {list(range(MIN_ELEMENTS))}"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 0

    def test_skip_one_over_threshold(self):
        """Lists with exactly MIN_ELEMENTS+1 elements SHOULD be extracted."""
        data = list(range(MIN_ELEMENTS + 1))
        text = f"data = {data}"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1

    def test_skip_range_pair(self):
        """[0, 100] should NOT be extracted — it's a range/bound."""
        text = "Variable bounds: [0, 100]"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 0

    def test_skip_range_float(self):
        text = "x in [0.0, 1.0]"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 0

    def test_skip_mixed_string_int(self):
        text = 'Categories: ["small", 1, "medium", 2, "large", 3, "xl", 4, "xxl", 5]'
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 0

    def test_skip_bool_list(self):
        text = "Flags: [True, False, True, False, True, False, True, False, True, False]"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 0

    def test_skip_empty_text(self):
        result = extract_numeric_blocks("")
        assert result.num_blocks_extracted == 0
        assert result.slim_text == ""

    def test_skip_no_numbers(self):
        text = "Assign aircraft to flights to minimize total cost."
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 0
        assert result.slim_text == text

    def test_skip_inline_csv_below_threshold(self):
        """7 inline numbers should NOT trigger inline CSV extraction."""
        text = "Small list: 1, 2, 3, 4, 5, 6, 7"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 0


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — Multi-block and structural tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestMultipleBlocks:
    def test_two_separate_1d_lists(self):
        """Two separate 1D lists should produce two separate blocks, NOT one 2D."""
        text = (
            "costs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]\n"
            "weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
        )
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 2
        for key, entry in result.registry.items():
            assert entry.ndim == 1, f"{key} should be 1D, not merged into 2D"

    def test_block_ids_sequential(self):
        text = (
            "A: [1,2,3,4,5,6,7,8,9,10] "
            "B: [11,12,13,14,15,16,17,18,19,20]"
        )
        result = extract_numeric_blocks(text)
        assert "NUMBLK_000" in result.registry
        assert "NUMBLK_001" in result.registry

    def test_slim_text_contains_all_ids(self):
        text = (
            "costs = [10,20,30,40,50,60,70,80,90,100] "
            "weights = [1,2,3,4,5,6,7,8,9,10]"
        )
        result = extract_numeric_blocks(text)
        assert "NUMBLK_000" in result.slim_text
        assert "NUMBLK_001" in result.slim_text

    def test_mixed_sizes_only_large_extracted(self):
        """Small list next to large list — only large should be extracted."""
        text = "bounds: [0, 1] costs: [10,20,30,40,50,60,70,80,90,100]"
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        assert "[0, 1]" in result.slim_text   # bounds kept inline

    def test_named_variable_preserved(self):
        """Variable name before = should remain in slim_text."""
        text = "cost_matrix = [[1,2,3,4,5],[6,7,8,9,10],[11,12,13,14,15]]"
        result = extract_numeric_blocks(text)
        assert "cost_matrix" in result.slim_text


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — Losslessness tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestLosslessness:
    def test_1d_all_values_preserved(self):
        data = list(range(50))
        text = f"{data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == data

    def test_2d_all_values_preserved(self):
        data = [[i * 10 + j for j in range(8)] for i in range(6)]
        text = f"matrix = {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == data

    def test_floats_preserved_exactly(self):
        data = [1.23456789, 2.34567890, 3.45678901, 4.56789012,
                5.67890123, 6.78901234, 7.89012345, 8.90123456]
        text = f"precision: {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        for orig, stored in zip(data, result.registry[key].data):
            assert abs(orig - stored) < 1e-12

    def test_negative_values_preserved(self):
        data = [-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100]
        text = f"offsets = {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == data

    def test_position_tracked(self):
        text = "prefix [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] suffix"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        start, end = result.registry[key].position
        assert start > 0  # not at beginning
        assert end < len(text) - 1  # not at end

    def test_total_elements_match_shape(self):
        data = [[i * j for j in range(1, 8)] for i in range(1, 6)]
        text = f"table = {data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        entry = result.registry[key]
        expected_total = entry.shape[0] * entry.shape[1]
        actual_total = len(_flatten(entry.data))
        assert actual_total == expected_total


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — Format and hint tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestHintFormat:
    def test_1d_hint_has_length(self):
        data = list(range(10, 110, 10))  # 10 elements
        text = f"{data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert "10-element" in result.registry[key].hint

    def test_1d_hint_has_range(self):
        data = list(range(5, 105, 10))
        text = f"{data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        hint = result.registry[key].hint
        assert "range" in hint
        assert str(min(data)) in hint
        assert str(max(data)) in hint

    def test_2d_hint_has_shape(self):
        data = [[i+j for j in range(6)] for i in range(4)]
        text = f"{data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        assert "4x6" in result.registry[key].hint

    def test_2d_hint_has_corners(self):
        data = [[10, 20, 30], [40, 50, 60], [70, 80, 99]]
        text = f"{data}"
        result = extract_numeric_blocks(text)
        key = list(result.registry.keys())[0]
        hint = result.registry[key].hint
        assert "TL=10" in hint
        assert "BR=99" in hint

    def test_extraction_log_not_empty(self):
        data = list(range(20))
        text = f"{data}"
        result = extract_numeric_blocks(text)
        assert len(result.extraction_log) > 0

    def test_extraction_log_contains_block_id(self):
        data = list(range(20))
        text = f"{data}"
        result = extract_numeric_blocks(text)
        assert any("NUMBLK_000" in entry for entry in result.extraction_log)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — Realistic problem tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestRealisticProblems:
    def test_flight_scheduling_cost_matrix(self):
        """Realistic: 5 aircraft × 8 flights cost matrix embedded in NL problem."""
        import random
        random.seed(42)
        cost_matrix = [[random.randint(100, 5000) for _ in range(8)] for _ in range(5)]
        text = (
            f"We have 5 aircraft and 8 flights. "
            f"The assignment cost matrix (aircraft × flight) is: {cost_matrix}. "
            f"Each flight must be assigned to exactly one aircraft. "
            f"Each aircraft can handle at most 3 flights. "
            f"Minimize total assignment cost."
        )
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        entry = result.registry[key]
        assert entry.ndim == 2
        assert entry.shape == (5, 8)
        assert entry.data == cost_matrix
        # Confirm natural language still present in slim_text
        assert "5 aircraft" in result.slim_text
        assert "8 flights" in result.slim_text
        assert "Minimize" in result.slim_text

    def test_knapsack_problem(self):
        """Realistic: knapsack with weights and values as separate 1D lists."""
        weights = [23, 31, 29, 44, 53, 38, 63, 85, 89, 82,
                   70, 80, 70, 65, 22, 58, 43, 32, 21, 11]
        values  = [92, 57, 49, 68, 60, 43, 67, 84, 87, 72,
                   96, 31, 41, 80, 22, 34, 56, 78, 43, 21]
        text = (
            f"Knapsack problem with 20 items. "
            f"Weights: {weights}. "
            f"Values: {values}. "
            f"Capacity: 500. Maximize total value."
        )
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 2
        keys = list(result.registry.keys())
        data_sets = {tuple(result.registry[k].data) for k in keys}
        assert tuple(weights) in data_sets
        assert tuple(values) in data_sets
        # Capacity (single value) and text preserved
        assert "Capacity: 500" in result.slim_text
        assert "Maximize" in result.slim_text

    def test_vehicle_routing_distances(self):
        """Realistic: distance matrix in vehicle routing."""
        n = 6
        import random
        random.seed(7)
        dist = [[0 if i == j else random.randint(10, 200) for j in range(n)] for i in range(n)]
        text = (
            f"Vehicle routing problem with {n} cities. "
            f"Distance matrix: {dist}. "
            f"Find shortest tour visiting all cities."
        )
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == dist
        assert result.registry[key].shape == (n, n)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])


class TestExtractVerticalLists:
    def test_basic_vertical_list(self):
        text = "Only warehouses\n3\n6\n9\n12\n17\n21\n24\ncan store frozen goods."
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        assert result.registry[key].source_format == "vertical_list"
        assert result.registry[key].data == [3, 6, 9, 12, 17, 21, 24]

    def test_vertical_list_blank_lines(self):
        text = "Only warehouses\n\n5\n\n7\n\n13\n\n15\n\n18\n\n22\n\n30\n\n35\nhave storage."
        result = extract_numeric_blocks(text)
        assert result.num_blocks_extracted == 1
        key = list(result.registry.keys())[0]
        assert result.registry[key].data == [5, 7, 13, 15, 18, 22, 30, 35]
