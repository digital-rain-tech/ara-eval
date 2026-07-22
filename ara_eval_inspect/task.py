"""
ARA-Eval as an Inspect task.
============================

Thin adapter exposing the risk-fingerprinting evaluation (lab-01) through
UK AISI's Inspect framework (https://inspect.aisi.org.uk). All prompt
composition, scenario loading, and gating logic is reused from
ara_eval.core — this module only maps it onto Task/Sample/solver/scorer.

Run (from repo root, with inspect-ai installed and OPENROUTER_API_KEY set):

    inspect eval ara_eval_inspect --model openrouter/<model-id>

Task parameters (pass with -T):

    inspect eval ara_eval_inspect --model openrouter/openai/gpt-4o \
        -T use_all=true -T structured=true -T jurisdiction=sg-grounded \
        -T scenarios_file=singapore-scenarios.json
"""

from inspect_ai import Task, task
from inspect_ai.dataset import MemoryDataset, Sample
from inspect_ai.model import ChatMessageSystem, ChatMessageUser, GenerateConfig
from inspect_ai.solver import generate

from ara_eval.core import (
    DIMENSIONS,
    build_system_prompt,
    build_user_prompt,
    load_scenarios,
)

# Absolute import: Inspect loads this file as a standalone module, where
# relative imports have no parent package. (ara_eval_inspect is installed
# by the existing "ara_eval*" glob in pyproject.)
from ara_eval_inspect.scorers import fingerprint_agreement, gate_match


def scenario_to_sample(scenario: dict, system: str, structured: bool) -> Sample:
    """Map one ARA-Eval scenario onto an Inspect Sample.

    The system prompt is embedded as a chat message rather than applied via
    the system_message() solver: that solver template-formats its argument,
    and the ARA prompt contains literal JSON braces (output_format.md).
    The reference fingerprint travels in metadata (scorers read it from
    there); target carries the compact fingerprint string for log display.
    """
    reference = scenario["reference_fingerprint"]
    return Sample(
        id=scenario["id"],
        input=[
            ChatMessageSystem(content=system),
            ChatMessageUser(content=build_user_prompt(scenario, structured=structured)),
        ],
        target="-".join(reference[d] for d in DIMENSIONS),
        metadata={
            "domain": scenario.get("domain"),
            "industry": scenario.get("industry"),
            "risk_tier": scenario.get("risk_tier"),
            "reference_fingerprint": reference,
            "reference_interpretation": scenario.get("reference_interpretation"),
            "jurisdiction_notes": scenario.get("jurisdiction_notes"),
        },
    )


@task
def ara_eval_fingerprint(
    scenarios_file: str = "starter-scenarios.json",
    use_all: bool = False,
    jurisdiction: str = "hk",
    personality: str = "operations_director",
    rubric: str = "rubric.md",
    structured: bool = False,
) -> Task:
    """Risk-fingerprint scenarios and score against human references.

    Parameters mirror labs/lab-01-risk-fingerprinting.py so results are
    comparable across the two harnesses.
    """
    scenarios = load_scenarios(use_all=use_all, scenarios_file=scenarios_file)
    system = build_system_prompt(personality, jurisdiction, rubric)
    return Task(
        dataset=MemoryDataset(
            [scenario_to_sample(s, system, structured) for s in scenarios],
            name=f"ara-eval:{scenarios_file}",
        ),
        solver=generate(),
        scorer=[fingerprint_agreement(), gate_match()],
        # Match lab-01's token budget (ara_eval.core, max_tokens=16384) so
        # truncation behaviour is comparable across the two harnesses. Retry
        # and rate-limit pacing intentionally differ: lab-01 hand-paces free
        # models at a fixed interval; here Inspect owns retry/concurrency.
        config=GenerateConfig(max_tokens=16384),
    )
