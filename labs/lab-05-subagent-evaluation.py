"""
ARA-Eval Lab 05: Subagent-Based Evaluation
===========================================

Run ARA evaluations using Claude Code subagents instead of OpenRouter API calls.
Each scenario x personality x variant is dispatched as an independent subagent
with curated context from the .claude/commands/ara-evaluate.md skill.

This produces results in the same format as Lab 01, so Lab 04 can score them
against gold references.

Usage:
    python labs/lab-05-subagent-evaluation.py                    # generate prompts for core scenarios
    python labs/lab-05-subagent-evaluation.py --all              # all 13 scenarios
    python labs/lab-05-subagent-evaluation.py --structured       # include structured context
    python labs/lab-05-subagent-evaluation.py --grounding        # run both hk and hk-grounded
    python labs/lab-05-subagent-evaluation.py --repetitions 3    # reliability testing (N runs each)
    python labs/lab-05-subagent-evaluation.py --assemble         # assemble results from completed subagents

How it works:
    1. Generates a dispatch manifest (JSON) listing all subagent calls to make
    2. Each entry contains the full prompt for one evaluation (scenario x personality x variant)
    3. You dispatch these as Claude Code subagents (manually or via script)
    4. Subagents write results to results/subagent-runs/<run-id>/
    5. --assemble collects results into lab-01 compatible format for lab-04 scoring

Output:
    results/subagent-runs/<run-id>/manifest.json     — dispatch manifest
    results/subagent-runs/<run-id>/eval-*.json        — individual evaluation results
    results/subagent-runs/<run-id>/lab-01-assembled.json — assembled results (after --assemble)
"""

from __future__ import annotations

import argparse
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from ara_eval.core import (
    DIMENSIONS,
    DIMENSION_LABELS,
    LEVEL_ORDER,
    PERSONALITIES,
    load_scenarios,
)

_root = Path(__file__).parent.parent
RESULTS_DIR = _root / "results" / "subagent-runs"

# Personality prompts — baked in to avoid file I/O in subagents
PERSONALITY_PROMPTS = {
    "compliance_officer": (
        "You are evaluating this scenario from the perspective of a risk-averse "
        "compliance officer at a Hong Kong financial institution. You weight "
        "regulatory exposure and accountability chain heavily. You demand audit "
        "trails for every autonomous decision. You are skeptical of autonomy claims "
        "and require exhaustive safeguards before approving any autonomous operation. "
        "When in doubt, you classify toward higher risk (Level A or B)."
    ),
    "cro": (
        "You are evaluating this scenario from the perspective of an aggressive "
        "Chief Revenue Officer at a Hong Kong financial institution. You weight "
        "speed, competitive advantage, and operational efficiency. You tolerate "
        "higher failure blast radius if the expected value is positive. You push "
        "for autonomy in revenue-generating domains first. When the data is strong, "
        "you lean toward lower risk classifications (Level C or D)."
    ),
    "operations_director": (
        "You are evaluating this scenario from the perspective of a neutral "
        "operations director at a Hong Kong financial institution. You weight "
        "graceful degradation and human override latency most heavily. You care "
        "about operational continuity above all. You approve autonomy only where "
        "fallback paths are proven and failure modes are contained. You classify "
        "based on operational reality, not regulatory theory or revenue pressure."
    ),
}

PERSONALITY_LABELS = {
    "compliance_officer": "Risk-Averse Compliance Officer",
    "cro": "Aggressive CRO",
    "operations_director": "Neutral Operations Director",
}

# Jurisdiction context — names only
JURISDICTION_HK = (
    "Consider Hong Kong-specific regulatory frameworks:\n"
    "- HKMA GenAI Circular (Nov 2024) and BDAI High-level Principles (Nov 2019) for banking\n"
    "- SFC Circular 24EC55 (Nov 2024) for securities/investment\n"
    "- PCPD AI Model Personal Data Protection Framework (Jun 2024) for data protection\n"
    "- PIPL (Nov 2021) for cross-border mainland data flows\n"
    "- CAC Algorithm Recommendation Provisions (Mar 2022) for mainland-facing services"
)

# Jurisdiction context — grounded with actual requirements
JURISDICTION_HK_GROUNDED = """\
Apply the following regulatory requirements when evaluating this scenario.

### HKMA — Banking (GenAI Circular, Nov 2024 + BDAI Principles, 2019)
- Fully autonomous AI decision-making is prohibited in banking. Human oversight must be maintained.
- Customer-facing GenAI applications must allow customers to opt out or request human intervention.
- Institutions must implement continuous monitoring of GenAI output for quality, harmful, or misleading results.
- Three internal control mechanisms required: (i) AI ethics committee, (ii) designated oversight body, (iii) separate privacy risk management system.
- Board and senior management are personally accountable for AI application outcomes.
- AI applications must demonstrate fairness in customer outcomes.
- Transparency and disclosure required: customers must know when AI is being used.

### SFC — Securities & Investment (Circular 24EC55, Nov 2024)
- Applies to all licensed corporations using AI language models in regulated activities.
- Four core principles: (i) Senior Management Oversight, (ii) AI Model Risk Management, (iii) Cybersecurity & Data Protection, (iv) Third-Party Risk Management.
- High-risk applications (investment advice, recommendations) require: rigorous output validation, human oversight, and disclosure of AI limitations to clients.
- Licensed corporations must segregate roles related to AI development and validation.

### PCPD — Data Protection (AI Framework, Jun 2024)
- Applies to all organisations that procure, implement, and use AI systems involving personal data.
- Adopts a risk-based approach aligned with the PDPO.
- Not legally binding but represents PCPD's interpretation of PDPO compliance for AI.

### PIPL — Cross-Border Data (Mainland China)
- Personal data transfer from mainland to Hong Kong requires: security assessment, certification, or standard contractual clauses (Articles 38-43).
- GBA Standard Contracts available for Guangdong-HK transfers.
- Sensitive personal data and large-volume transfers still require security assessment.

### CAC — Algorithm Registration
- AI services using algorithms to recommend content, make decisions, or generate synthetic content for mainland-facing users must register with the CAC.\
"""


def build_subagent_prompt(
    scenario: dict,
    personality_id: str,
    jurisdiction: str = "hk",
    structured: bool = False,
) -> str:
    """Build the complete prompt for a single subagent evaluation."""
    parts = []

    # Personality
    parts.append("## Personality Perspective\n")
    parts.append(PERSONALITY_PROMPTS[personality_id])

    # Jurisdiction
    parts.append("\n\n## Jurisdiction Context\n")
    if jurisdiction == "hk-grounded":
        parts.append(JURISDICTION_HK_GROUNDED)
    else:
        parts.append(JURISDICTION_HK)

    # Scenario
    parts.append("\n\n## Scenario to Evaluate\n")
    parts.append(f"**Domain:** {scenario.get('domain', '')}\n")
    parts.append(f"**Industry:** {scenario.get('industry', '')}\n")
    parts.append(f"**Jurisdiction notes:** {scenario.get('jurisdiction_notes', 'N/A')}\n\n")
    parts.append(scenario.get("scenario", ""))

    # Structured context (if available and requested)
    sc = scenario.get("structured_context", {})
    if structured and sc:
        parts.append("\n\n### Structured Context\n")
        parts.append(f"- **Subject:** {sc.get('subject', '')}\n")
        parts.append(f"- **Object:** {sc.get('object', '')}\n")
        parts.append(f"- **Action:** {sc.get('action', '')}\n")
        triggers = sc.get("regulatory_triggers", [])
        parts.append(f"- **Regulatory triggers:** {', '.join(triggers)}\n")
        parts.append(f"- **Time pressure:** {sc.get('time_pressure', '')}\n")
        parts.append(f"- **Confidence signal:** {sc.get('confidence_signal', '')}\n")
        parts.append(f"- **Reversibility:** {sc.get('reversibility', '')}\n")
        parts.append(f"- **Blast radius:** {sc.get('blast_radius', '')}\n")

    return "".join(parts)


def generate_manifest(
    scenarios: list[dict],
    jurisdictions: list[str],
    structured: bool,
    repetitions: int,
    run_id: str,
) -> list[dict]:
    """Generate the full dispatch manifest."""
    manifest = []

    for scenario in scenarios:
        sid = scenario["id"]
        for jurisdiction in jurisdictions:
            for personality_id in PERSONALITY_PROMPTS:
                for rep in range(repetitions):
                    prompt = build_subagent_prompt(
                        scenario, personality_id,
                        jurisdiction=jurisdiction,
                        structured=structured,
                    )

                    eval_id = f"{sid}__{personality_id}__{jurisdiction}"
                    if repetitions > 1:
                        eval_id += f"__rep{rep + 1}"

                    manifest.append({
                        "eval_id": eval_id,
                        "scenario_id": sid,
                        "personality_id": personality_id,
                        "personality_label": PERSONALITY_LABELS[personality_id],
                        "jurisdiction": jurisdiction,
                        "structured": structured,
                        "repetition": rep + 1 if repetitions > 1 else None,
                        "prompt": prompt,
                        "output_file": f"eval-{eval_id}.json",
                    })

    return manifest


def assemble_results(run_dir: Path) -> dict:
    """Assemble individual evaluation results into lab-01 compatible format."""
    manifest_path = run_dir / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"No manifest found in {run_dir}")

    with open(manifest_path) as f:
        meta = json.load(f)

    manifest = meta["evaluations"]
    assembled = {}
    stats = {"total": 0, "successful": 0, "failed": 0, "missing": 0}

    for entry in manifest:
        stats["total"] += 1
        sid = entry["scenario_id"]
        pid = entry["personality_id"]
        result_path = run_dir / entry["output_file"]

        if sid not in assembled:
            assembled[sid] = {"evaluations": {}}

        if not result_path.exists():
            stats["missing"] += 1
            assembled[sid]["evaluations"][pid] = {
                "personality": entry["personality_label"],
                "error": "result file not found",
            }
            continue

        try:
            with open(result_path) as f:
                result = json.load(f)

            # Validate dimensions
            dims = result.get("dimensions", {})
            if not dims:
                raise ValueError("No dimensions in result")

            for dim in DIMENSIONS:
                if dim not in dims:
                    raise ValueError(f"Missing dimension: {dim}")
                level = dims[dim].get("level", "")
                if level not in LEVEL_ORDER:
                    raise ValueError(f"Invalid level '{level}' for {dim}")

            assembled[sid]["evaluations"][pid] = {
                "personality": entry["personality_label"],
                "fingerprint": dims,
                "interpretation": result.get("interpretation", ""),
            }
            stats["successful"] += 1

        except Exception as e:
            stats["failed"] += 1
            assembled[sid]["evaluations"][pid] = {
                "personality": entry["personality_label"],
                "error": str(e),
            }

    assembled["_run"] = {
        "model": "claude-code-subagent",
        "stats": stats,
        "assembled_at": datetime.now(timezone.utc).isoformat(),
    }

    return assembled


def main():
    parser = argparse.ArgumentParser(description="ARA-Eval Lab 05: Subagent Evaluation")
    parser.add_argument("--all", action="store_true", help="Run all scenarios (default: core only)")
    parser.add_argument("--structured", action="store_true", help="Include structured context")
    parser.add_argument("--grounding", action="store_true", help="Run both hk and hk-grounded jurisdictions")
    parser.add_argument("--repetitions", type=int, default=1, help="Repetitions per cell (for reliability)")
    parser.add_argument("--assemble", type=str, metavar="RUN_DIR", help="Assemble results from a completed run directory")
    args = parser.parse_args()

    # Assemble mode
    if args.assemble:
        run_dir = Path(args.assemble)
        if not run_dir.is_absolute():
            run_dir = RESULTS_DIR / run_dir

        print(f"Assembling results from {run_dir}...")
        assembled = assemble_results(run_dir)

        output_path = run_dir / "lab-01-assembled.json"
        with open(output_path, "w") as f:
            json.dump(assembled, f, indent=2)

        stats = assembled["_run"]["stats"]
        print(f"  Assembled: {stats['successful']}/{stats['total']} successful")
        if stats["missing"]:
            print(f"  Missing: {stats['missing']} result files")
        if stats["failed"]:
            print(f"  Failed: {stats['failed']} invalid results")
        print(f"  Output: {output_path}")
        print(f"\n  To score against gold references, copy to results/reference/<model-name>/")
        print(f"  and run: python labs/lab-04-inter-model-comparison.py")
        return

    # Generate mode
    scenarios = load_scenarios(use_all=args.all)
    jurisdictions = ["hk", "hk-grounded"] if args.grounding else ["hk"]

    run_id = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    run_dir = RESULTS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    manifest = generate_manifest(
        scenarios, jurisdictions,
        structured=args.structured,
        repetitions=args.repetitions,
        run_id=run_id,
    )

    total = len(manifest)
    n_scenarios = len(scenarios)
    n_jurisdictions = len(jurisdictions)
    n_personalities = len(PERSONALITY_PROMPTS)

    meta = {
        "run_id": run_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "config": {
            "scenarios": n_scenarios,
            "jurisdictions": jurisdictions,
            "personalities": n_personalities,
            "structured": args.structured,
            "repetitions": args.repetitions,
            "total_evaluations": total,
        },
        "evaluations": manifest,
    }

    manifest_path = run_dir / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\n{'='*70}")
    print(f"  LAB 05: SUBAGENT EVALUATION — DISPATCH MANIFEST")
    print(f"{'='*70}")
    print(f"  Run ID: {run_id}")
    print(f"  Scenarios: {n_scenarios} {'(all)' if args.all else '(core)'}")
    print(f"  Personalities: {n_personalities}")
    print(f"  Jurisdictions: {', '.join(jurisdictions)}")
    print(f"  Structured: {args.structured}")
    print(f"  Repetitions: {args.repetitions}")
    print(f"  Total evaluations: {total}")
    print(f"  Manifest: {manifest_path}")
    print(f"{'='*70}")

    # Print dispatch instructions
    print(f"\n  To run evaluations, dispatch subagents using Claude Code:")
    print(f"")
    print(f"  Each subagent should:")
    print(f"    1. Use the /ara-evaluate command with the prompt from the manifest")
    print(f"    2. Write the JSON result to {run_dir}/eval-<eval_id>.json")
    print(f"")
    print(f"  Example for a single evaluation:")
    print(f"    Agent prompt: /ara-evaluate <prompt from manifest>")
    print(f"    Output file:  {run_dir}/{manifest[0]['output_file']}")
    print(f"")
    print(f"  After all subagents complete:")
    print(f"    python labs/lab-05-subagent-evaluation.py --assemble {run_id}")
    print(f"")

    # Print quick-dispatch summary
    print(f"  Evaluations to dispatch:")
    for entry in manifest:
        print(f"    {entry['eval_id']}")

    print()


if __name__ == "__main__":
    main()
