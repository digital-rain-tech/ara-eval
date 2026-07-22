"""
Scorers for the ARA-Eval Inspect task.
======================================

Two scorers, reported side by side:

- fingerprint_agreement — fraction of the 7 dimensions where the judge's
  level exactly matches the human reference (0.0–1.0). Per-dimension
  detail and mean level distance land in score metadata.
- gate_match — whether the deterministic gating verdict derived from the
  judge's fingerprint matches the verdict derived from the reference
  (both computed with ara_eval.core.apply_gating_rules, so the comparison
  is judgment-vs-judgment, never string-vs-string).

Parsing reuses ara_eval.core.parse_llm_json (json_repair fallback chain),
so models that emit slightly malformed JSON are scored, not zeroed.
"""

from inspect_ai.scorer import (
    CORRECT,
    INCORRECT,
    Score,
    Target,
    accuracy,
    mean,
    scorer,
    stderr,
)
from inspect_ai.solver import TaskState

from ara_eval.core import DIMENSIONS, LEVEL_ORDER, apply_gating_rules, parse_llm_json


def parse_fingerprint(completion: str) -> dict | None:
    """Parse model output into {dimension: level}; None if unusable."""
    try:
        parsed = parse_llm_json(completion.strip())
        dims = parsed["dimensions"]
        levels = {d: dims[d]["level"] for d in DIMENSIONS}
    except Exception:
        return None
    if any(lvl not in LEVEL_ORDER for lvl in levels.values()):
        return None
    return levels


def nest(levels: dict) -> dict:
    """Wrap flat {dim: level} into the {dim: {"level": ...}} shape
    apply_gating_rules expects."""
    return {d: {"level": lvl} for d, lvl in levels.items()}


@scorer(metrics=[mean(), stderr()])
def fingerprint_agreement():
    async def score(state: TaskState, target: Target) -> Score:
        reference = state.metadata["reference_fingerprint"]
        levels = parse_fingerprint(state.output.completion)
        if levels is None:
            return Score(
                value=0.0,
                answer=None,
                explanation="unparseable or invalid fingerprint output",
            )
        matches = {d: levels[d] == reference[d] for d in DIMENSIONS}
        distance = sum(
            abs(LEVEL_ORDER[levels[d]] - LEVEL_ORDER[reference[d]])
            for d in DIMENSIONS
        ) / len(DIMENSIONS)
        return Score(
            value=sum(matches.values()) / len(DIMENSIONS),
            answer="-".join(levels[d] for d in DIMENSIONS),
            explanation=f"reference {'-'.join(reference[d] for d in DIMENSIONS)}",
            metadata={"per_dimension_match": matches, "mean_level_distance": distance},
        )

    return score


@scorer(metrics=[accuracy(), stderr()])
def gate_match():
    async def score(state: TaskState, target: Target) -> Score:
        reference = state.metadata["reference_fingerprint"]
        reference_verdict = apply_gating_rules(nest(reference))["classification"]
        levels = parse_fingerprint(state.output.completion)
        if levels is None:
            return Score(
                value=INCORRECT,
                answer=None,
                explanation="unparseable or invalid fingerprint output",
            )
        candidate = apply_gating_rules(nest(levels))
        return Score(
            value=CORRECT if candidate["classification"] == reference_verdict else INCORRECT,
            answer=candidate["classification"],
            explanation=f"reference verdict: {reference_verdict}; "
            f"triggered: {candidate['triggered_rules'] or ['none']}",
        )

    return score
