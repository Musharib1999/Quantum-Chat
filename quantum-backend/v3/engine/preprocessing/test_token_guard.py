"""
test_token_guard.py — Unit Tests for token_guard.py
Run with: pytest test_token_guard.py -v
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)
))))

from engine.preprocessing.token_guard import check_token_budget, estimate_tokens


class TestTokenGuard:
    def test_estimate_empty(self):
        assert estimate_tokens("") == 0
        assert estimate_tokens(None) == 0

    def test_estimate_normal(self):
        # 35 characters -> ~10 tokens
        assert estimate_tokens("a" * 35) == 10

    def test_check_within_budget(self):
        text = "a" * 350  # ~100 tokens
        tokens = check_token_budget(text, max_tokens=200)
        assert tokens == 100

    def test_check_exceeds_budget(self):
        text = "a" * 70000  # ~20,000 tokens
        with pytest.raises(ValueError) as excinfo:
            check_token_budget(text, max_tokens=10000, label="problem description")
        
        assert "too large" in str(excinfo.value)
        assert "problem description" in str(excinfo.value)
        assert "10,000" in str(excinfo.value)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
