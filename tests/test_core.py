"""
Tests for core ARA-Eval functions.

Covers: JSON parsing, gating rules, prompt loading safety, DB schema migration,
and Lab 03 agreement metrics.

Run: pytest tests/
"""

from __future__ import annotations

import json
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest

import os
os.environ.setdefault("OPENROUTER_API_KEY", "test-key-for-testing")

from ara_eval.core import (
    DIMENSIONS,
    apply_gating_rules,
    init_db,
    load_prompt,
    parse_llm_json,
)

# Lab 03 still needs direct import for compute_agreement / compute_cohens_kappa_self
# These are Lab 03-specific functions, not shared core
from importlib.util import spec_from_file_location, module_from_spec

_lab03_path = Path(__file__).parent.parent / "labs" / "lab-03-intra-rater-reliability.py"
_spec3 = spec_from_file_location("lab03", _lab03_path)
lab03 = module_from_spec(_spec3)
_spec3.loader.exec_module(lab03)


# ---------------------------------------------------------------------------
# parse_llm_json
# ---------------------------------------------------------------------------

class TestParseLlmJson:
    def test_plain_json(self):
        result = parse_llm_json('{"dimensions": {"a": 1}}')
        assert result == {"dimensions": {"a": 1}}

    def test_markdown_fenced_json(self):
        text = '```json\n{"key": "value"}\n```'
        assert parse_llm_json(text) == {"key": "value"}

    def test_thinking_tags_stripped(self):
        text = '<think>some reasoning here</think>\n{"key": "value"}'
        assert parse_llm_json(text) == {"key": "value"}

    def test_thinking_tags_multiline(self):
        text = '<think>\nline 1\nline 2\n</think>\n{"key": "value"}'
        assert parse_llm_json(text) == {"key": "value"}

    def test_truncated_json_repaired(self):
        # Simulate truncated LLM output (missing closing braces)
        text = '{"dimensions": {"decision_reversibility": {"level": "B", "reasoning": "hard to reverse"}'
        result = parse_llm_json(text)
        assert result["dimensions"]["decision_reversibility"]["level"] == "B"

    def test_trailing_comma_fixed(self):
        text = '{"key": "value", "key2": "value2",}'
        result = parse_llm_json(text)
        assert result["key"] == "value"

    def test_preamble_text_extracted(self):
        text = 'Here is my analysis:\n\n{"key": "value"}\n\nI hope this helps!'
        result = parse_llm_json(text)
        assert result["key"] == "value"

    def test_double_commas_fixed(self):
        text = '{"key": "value",, "key2": "value2"}'
        result = parse_llm_json(text)
        assert result["key"] == "value"

    def test_invalid_json_raises(self):
        with pytest.raises(json.JSONDecodeError):
            parse_llm_json("not json at all")


# ---------------------------------------------------------------------------
# apply_gating_rules
# ---------------------------------------------------------------------------

class TestGatingRules:
    def _make_fingerprint(self, levels: str) -> dict:
        """Helper: 'A-B-C-D-C-B-A' -> fingerprint dict."""
        parts = levels.split("-")
        assert len(parts) == 7
        return {dim: {"level": level} for dim, level in zip(DIMENSIONS, parts)}

    def test_all_d_is_ready_now(self):
        fp = self._make_fingerprint("D-D-D-D-D-D-D")
        result = apply_gating_rules(fp)
        assert result["classification"] == "ready_now"
        assert result["triggered_rules"] == []

    def test_regulatory_a_triggers_hard_gate(self):
        fp = self._make_fingerprint("D-D-A-D-D-D-D")
        result = apply_gating_rules(fp)
        assert result["classification"] == "human_in_loop_required"
        assert any("HARD GATE" in r for r in result["triggered_rules"])

    def test_blast_radius_a_triggers_hard_gate(self):
        fp = self._make_fingerprint("D-A-D-D-D-D-D")
        result = apply_gating_rules(fp)
        assert result["classification"] == "human_in_loop_required"

    def test_other_a_triggers_soft_gate(self):
        fp = self._make_fingerprint("A-D-D-D-D-D-D")
        result = apply_gating_rules(fp)
        assert result["classification"] == "ready_with_prerequisites"
        assert any("SOFT GATE" in r for r in result["triggered_rules"])

    def test_mixed_bc_is_ready_with_prerequisites(self):
        fp = self._make_fingerprint("B-C-B-C-C-B-C")
        result = apply_gating_rules(fp)
        assert result["classification"] == "ready_with_prerequisites"

    def test_all_c_is_ready_now(self):
        fp = self._make_fingerprint("C-C-C-C-C-C-C")
        result = apply_gating_rules(fp)
        assert result["classification"] == "ready_now"

    def test_fingerprint_string_format(self):
        fp = self._make_fingerprint("A-B-C-D-C-B-A")
        result = apply_gating_rules(fp)
        assert result["fingerprint_string"] == "A-B-C-D-C-B-A"

    def test_shared_gating_fixtures(self):
        """Cross-runtime contract test: Python gating matches shared fixtures."""
        fixtures_path = Path(__file__).parent / "fixtures" / "gating-test-cases.json"
        with open(fixtures_path) as f:
            cases = json.load(f)

        for case in cases:
            fp = case["dimensions"]
            result = apply_gating_rules(fp)
            assert result["classification"] == case["expected_classification"], \
                f"Case {case['name']}: expected {case['expected_classification']}, got {result['classification']}"
            assert result["fingerprint_string"] == case["expected_fingerprint"], \
                f"Case {case['name']}: fingerprint mismatch"
            hard = sum(1 for r in result["triggered_rules"] if "HARD GATE" in r)
            soft = sum(1 for r in result["triggered_rules"] if "SOFT GATE" in r)
            assert hard == case["expected_hard_gates"], \
                f"Case {case['name']}: expected {case['expected_hard_gates']} hard gates, got {hard}"
            assert soft == case["expected_soft_gates"], \
                f"Case {case['name']}: expected {case['expected_soft_gates']} soft gates, got {soft}"


# ---------------------------------------------------------------------------
# load_prompt path traversal protection
# ---------------------------------------------------------------------------

class TestLoadPrompt:
    def test_valid_path_works(self):
        content = load_prompt("rubric.md")
        assert "evaluation judge" in content

    def test_traversal_rejected(self):
        with pytest.raises(ValueError, match="escapes prompts directory"):
            load_prompt("../labs/lab-01-risk-fingerprinting.py")

    def test_absolute_traversal_rejected(self):
        with pytest.raises((ValueError, OSError)):
            load_prompt("../../etc/passwd")


# ---------------------------------------------------------------------------
# DB schema and migration
# ---------------------------------------------------------------------------

class TestDatabase:
    def test_init_creates_tables(self):
        with tempfile.NamedTemporaryFile(suffix=".db") as f:
            conn = init_db(Path(f.name))
            # Check tables exist
            tables = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
            table_names = {t[0] for t in tables}
            assert "eval_runs" in table_names
            assert "ai_provider_requests" in table_names
            conn.close()

    def test_init_idempotent(self):
        with tempfile.NamedTemporaryFile(suffix=".db") as f:
            conn1 = init_db(Path(f.name))
            conn1.close()
            # Second init should not fail
            conn2 = init_db(Path(f.name))
            conn2.close()

    def test_jurisdiction_rubric_columns_exist(self):
        with tempfile.NamedTemporaryFile(suffix=".db") as f:
            conn = init_db(Path(f.name))
            # Check columns exist via pragma
            cols = conn.execute("PRAGMA table_info(ai_provider_requests)").fetchall()
            col_names = {c[1] for c in cols}
            assert "jurisdiction" in col_names
            assert "rubric" in col_names
            conn.close()


# ---------------------------------------------------------------------------
# Lab 03: agreement metrics
# ---------------------------------------------------------------------------

class TestAgreementMetrics:
    def test_unanimous_agreement(self):
        result = lab03.compute_agreement(["A", "A", "A", "A", "A"])
        assert result["unanimous"] is True
        assert result["agreement_rate"] == 1.0
        assert result["mode"] == "A"

    def test_majority_agreement(self):
        result = lab03.compute_agreement(["A", "A", "A", "B", "A"])
        assert result["unanimous"] is False
        assert result["agreement_rate"] == 0.8
        assert result["mode"] == "A"

    def test_split_agreement(self):
        result = lab03.compute_agreement(["A", "B", "A", "B"])
        assert result["agreement_rate"] == 0.5

    def test_kappa_perfect(self):
        k = lab03.compute_cohens_kappa_self(["A", "A", "A", "A"])
        assert k == 1.0

    def test_kappa_imperfect(self):
        k = lab03.compute_cohens_kappa_self(["A", "A", "B", "B"])
        # With 50/50 split: observed=2/6, expected=0.5, kappa should be negative
        assert k < 0.5

    def test_kappa_single_item(self):
        k = lab03.compute_cohens_kappa_self(["A"])
        assert k == 1.0


class TestLab05Validation:
    """Test Lab 05 scenario ID validation against path traversal."""

    @staticmethod
    def _get_validate():
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "lab05", str(Path(__file__).parent.parent / "labs" / "lab-05-build-your-own-scenario.py"),
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod._validate_scenario_id

    def test_valid_ids(self):
        validate = self._get_validate()
        for sid in ["my-scenario-001", "test", "a-b-c", "abc123"]:
            validate(sid)  # should not raise

    def test_path_traversal_rejected(self):
        validate = self._get_validate()
        for sid in ["../../etc/passwd", "../foo", "foo/bar"]:
            with pytest.raises(SystemExit):
                validate(sid)

    def test_invalid_chars_rejected(self):
        validate = self._get_validate()
        for sid in ["My Scenario", "test.json", "UPPER", "a_b"]:
            with pytest.raises(SystemExit):
                validate(sid)
