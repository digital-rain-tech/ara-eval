"""
Tests for the ara_eval_inspect adapter.

Covers the diff-relevant surface of the Inspect port: fingerprint parsing,
the two scorers (agreement + gate match), and sample construction — including
the regression that the target string follows canonical DIMENSIONS order
rather than JSON property order.

Run: pytest tests/test_inspect.py
"""

from __future__ import annotations

import asyncio
import json
import os
from types import SimpleNamespace

import pytest

os.environ.setdefault("OPENROUTER_API_KEY", "test-key-for-testing")

from inspect_ai.scorer import CORRECT, INCORRECT

from ara_eval.core import DIMENSIONS
from ara_eval_inspect.scorers import (
    fingerprint_agreement,
    gate_match,
    nest,
    parse_fingerprint,
)
from ara_eval_inspect.task import scenario_to_sample

# A reference fingerprint whose regulatory_exposure=A triggers a hard gate.
REFERENCE = {
    "decision_reversibility": "B",
    "failure_blast_radius": "C",
    "regulatory_exposure": "A",
    "human_override_latency": "D",
    "data_confidence": "C",
    "accountability_chain": "B",
    "graceful_degradation": "C",
}


def completion_for(levels: dict) -> str:
    """Build a model-style completion JSON from a {dim: level} mapping."""
    return json.dumps(
        {"dimensions": {d: {"level": lvl} for d, lvl in levels.items()}}
    )


def fake_state(reference: dict, completion: str):
    """Duck-typed stand-in for Inspect's TaskState — the scorers only read
    state.metadata['reference_fingerprint'] and state.output.completion."""
    return SimpleNamespace(
        metadata={"reference_fingerprint": reference},
        output=SimpleNamespace(completion=completion),
    )


def run_score(scorer_factory, reference, completion):
    score_fn = scorer_factory()
    return asyncio.run(score_fn(fake_state(reference, completion), None))


# --- parse_fingerprint -------------------------------------------------------


def test_parse_valid():
    assert parse_fingerprint(completion_for(REFERENCE)) == REFERENCE


def test_parse_repairs_trailing_comma():
    # json_repair fallback: trailing comma + unquoted whitespace still parses.
    malformed = '{"dimensions": {' + ", ".join(
        f'"{d}": {{"level": "{lvl}"}}' for d, lvl in REFERENCE.items()
    ) + ",}}"
    assert parse_fingerprint(malformed) == REFERENCE


def test_parse_missing_dimension_is_none():
    partial = dict(REFERENCE)
    partial.pop("graceful_degradation")
    assert parse_fingerprint(completion_for(partial)) is None


def test_parse_invalid_level_is_none():
    bad = dict(REFERENCE, regulatory_exposure="Z")
    assert parse_fingerprint(completion_for(bad)) is None


def test_parse_garbage_is_none():
    assert parse_fingerprint("not json at all") is None


# --- fingerprint_agreement ---------------------------------------------------


def test_agreement_perfect():
    score = run_score(fingerprint_agreement, REFERENCE, completion_for(REFERENCE))
    assert score.value == 1.0
    assert all(score.metadata["per_dimension_match"].values())
    assert score.metadata["mean_level_distance"] == 0.0


def test_agreement_one_dimension_off():
    # Shift data_confidence C -> D (level distance 1).
    candidate = dict(REFERENCE, data_confidence="D")
    score = run_score(fingerprint_agreement, REFERENCE, completion_for(candidate))
    assert score.value == pytest.approx(6 / 7)
    assert score.metadata["per_dimension_match"]["data_confidence"] is False
    assert score.metadata["mean_level_distance"] == pytest.approx(1 / 7)


def test_agreement_unparseable_is_zero():
    score = run_score(fingerprint_agreement, REFERENCE, "garbage")
    assert score.value == 0.0
    assert "unparseable" in score.explanation


# --- gate_match --------------------------------------------------------------


def test_gate_match_identical_verdict():
    score = run_score(gate_match, REFERENCE, completion_for(REFERENCE))
    assert score.value == CORRECT


def test_gate_match_flips_when_hard_gate_lost():
    # Reference has regulatory_exposure=A (hard gate). A candidate that scores
    # it C loses the gate -> different verdict -> INCORRECT, even though six of
    # seven dimensions still agree.
    candidate = dict(REFERENCE, regulatory_exposure="C")
    score = run_score(gate_match, REFERENCE, completion_for(candidate))
    assert score.value == INCORRECT


def test_gate_match_unparseable_is_incorrect():
    score = run_score(gate_match, REFERENCE, "garbage")
    assert score.value == INCORRECT


# --- nest + scenario_to_sample ----------------------------------------------


def test_nest_shape():
    assert nest({"regulatory_exposure": "A"}) == {
        "regulatory_exposure": {"level": "A"}
    }


def test_sample_target_follows_canonical_order_not_json_order():
    # Reference deliberately built in reversed dimension order. The target must
    # still be emitted in canonical DIMENSIONS order (regression for the fix
    # that iterated the reference dict's own key order).
    reordered = {d: REFERENCE[d] for d in reversed(DIMENSIONS)}
    scenario = {
        "id": "test-001",
        "scenario": "A test scenario narrative.",
        "reference_fingerprint": reordered,
    }
    sample = scenario_to_sample(scenario, system="sys", structured=False)
    expected = "-".join(REFERENCE[d] for d in DIMENSIONS)
    assert sample.target == expected
    assert sample.metadata["reference_fingerprint"] == reordered
