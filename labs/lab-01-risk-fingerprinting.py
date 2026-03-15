"""
ARA-Eval Lab 01: Risk Fingerprinting with LLM-Assisted Evaluation
=================================================================

Run scenarios through an LLM judge using the 7-dimension rubric,
then apply gating rules to determine autonomy readiness. ConFIRM-based
personality variants surface where stakeholder archetypes disagree.

Prerequisites:
    pip install -r requirements.txt

Usage:
    python labs/lab-01-risk-fingerprinting.py          # core scenarios only (6)
    python labs/lab-01-risk-fingerprinting.py --all     # all 13 scenarios

Output:
    results/lab-01-output.json — structured risk fingerprints per scenario x personality
    results/ara-eval.db — SQLite database with all request/response metadata
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx

from ara_eval.core import (
    DIMENSIONS,
    DIMENSION_LABELS,
    MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_HEADERS,
    PERSONALITIES,
    evaluate_with_retry,
    get_run_dir,
    init_db,
    load_scenarios,
    personality_delta,
    print_delta_report,
    print_fingerprint,
    print_run_summary,
    update_run,
)

_root = Path(__file__).parent.parent


def main():
    if not OPENROUTER_API_KEY:
        raise SystemExit("OPENROUTER_API_KEY not set. Add it to .env.local or export it.")

    parser = argparse.ArgumentParser(description="ARA-Eval Lab 01: Risk Fingerprinting")
    parser.add_argument("--all", action="store_true", help="Run all scenarios (default: core only)")
    parser.add_argument("--jurisdiction", type=str, default="hk", choices=["hk", "hk-grounded", "generic"], help="Jurisdiction to use (default: hk)")
    parser.add_argument("--rubric", type=str, default="rubric.md", help="Rubric file to use (default: rubric.md)")
    parser.add_argument("--structured", action="store_true", help="Include structured context (subject/object/action) in prompts")
    args = parser.parse_args()

    jurisdiction = args.jurisdiction
    rubric = args.rubric
    structured = args.structured

    # Load scenarios
    scenarios = load_scenarios(use_all=args.all)
    scenario_set = "all" if args.all else "core"

    # Init SQLite
    results_dir = _root / "results"
    results_dir.mkdir(exist_ok=True)
    db_path = results_dir / "ara-eval.db"
    db_conn = init_db(db_path)

    # Create run record
    run_id = str(uuid.uuid4())
    run_started = datetime.now(timezone.utc).isoformat()
    total_expected = len(scenarios) * len(PERSONALITIES)

    run_metadata = {
        "lab": "01-risk-fingerprinting",
        "jurisdiction": jurisdiction,
        "rubric": rubric,
        "scenario_set": scenario_set,
        "structured": structured,
    }

    db_conn.execute(
        """INSERT INTO eval_runs
           (run_id, started_at, model_requested, scenario_count,
            personality_count, total_calls, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (run_id, run_started, MODEL, len(scenarios), len(PERSONALITIES), total_expected,
         json.dumps(run_metadata)),
    )
    db_conn.commit()

    print(f"Run {run_id}")
    print(f"Model: {MODEL}")
    structured_label = " | Structured: yes" if structured else ""
    print(f"Jurisdiction: {jurisdiction} | Rubric: {rubric} | Scenarios: {scenario_set}{structured_label}")
    print(f"Scenarios: {len(scenarios)} × {len(PERSONALITIES)} personalities = {total_expected} calls\n")

    # Init HTTP client with OpenRouter headers
    http_client = httpx.Client(headers=OPENROUTER_HEADERS, timeout=120.0)

    # Run-level accumulators
    run_stats = {
        "run_id": run_id,
        "total": total_expected,
        "successful": 0,
        "failed": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "cost": 0.0,
        "duration_ms": 0,
    }

    all_results = {}
    run_start = time.monotonic()

    for scenario in scenarios:
        sid = scenario["id"]
        all_results[sid] = {"scenario": scenario, "evaluations": {}, "deltas": None}

        personality_results = {}

        for personality_id, personality_meta in PERSONALITIES.items():
            print(f"\nEvaluating {sid} as {personality_meta['label']}...")

            try:
                result = evaluate_with_retry(
                    http_client, db_conn, run_id, scenario, personality_id,
                    jurisdiction=jurisdiction, rubric=rubric, structured=structured,
                )

                personality_results[personality_id] = result
                all_results[sid]["evaluations"][personality_id] = {
                    "personality": personality_meta["label"],
                    "fingerprint": result["parsed"]["dimensions"],
                    "interpretation": result["parsed"].get("interpretation", ""),
                    "gating": result["gating"],
                    "model_used": result.get("model_used"),
                    "usage": result.get("usage"),
                    "cost_usd": result.get("cost"),
                    "response_time_ms": result.get("response_time_ms"),
                }

                print_fingerprint(sid, personality_meta["label"], result)

                # Accumulate run stats
                run_stats["successful"] += 1
                usage = result.get("usage", {})
                run_stats["input_tokens"] += usage.get("input_tokens") or 0
                run_stats["output_tokens"] += usage.get("output_tokens") or 0
                run_stats["cost"] += result.get("cost") or 0.0
                run_stats["duration_ms"] += result.get("response_time_ms") or 0

            except Exception as e:
                print(f"  ERROR: {e}")
                all_results[sid]["evaluations"][personality_id] = {
                    "personality": personality_meta["label"],
                    "error": str(e),
                }
                run_stats["failed"] += 1
                continue

        # Compute personality deltas (only if we got results)
        if personality_results:
            deltas = personality_delta(personality_results)
            all_results[sid]["deltas"] = deltas
            print_delta_report(sid, deltas)

        # Compare against reference fingerprint
        if "reference_fingerprint" in scenario:
            print(f"\n  REFERENCE COMPARISON:")
            ref = scenario["reference_fingerprint"]
            ref_str = "-".join(ref[d] for d in DIMENSIONS)
            print(f"    Reference fingerprint: {ref_str}")
            print(f"    Reference interpretation: {scenario.get('reference_interpretation', 'N/A')}")

    # Finalize run record
    run_wall_ms = int((time.monotonic() - run_start) * 1000)
    update_run(
        db_conn, run_id,
        finished_at=datetime.now(timezone.utc).isoformat(),
        successful_calls=run_stats["successful"],
        failed_calls=run_stats["failed"],
        total_input_tokens=run_stats["input_tokens"],
        total_output_tokens=run_stats["output_tokens"],
        total_cost_usd=run_stats["cost"],
        total_duration_ms=run_wall_ms,
        python_version=sys.version,
    )

    # Include run metadata in output JSON
    all_results["_run"] = {
        "run_id": run_id,
        "model_requested": MODEL,
        "jurisdiction": jurisdiction,
        "rubric": rubric,
        "scenario_set": scenario_set,
        "started_at": run_started,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "total_calls": total_expected,
        "successful_calls": run_stats["successful"],
        "failed_calls": run_stats["failed"],
        "total_input_tokens": run_stats["input_tokens"],
        "total_output_tokens": run_stats["output_tokens"],
        "total_cost_usd": run_stats["cost"],
        "wall_time_ms": run_wall_ms,
        "python_version": sys.version,
    }

    # Save results — dated folder, timestamped file, plus a latest symlink
    run_dir = get_run_dir(results_dir)
    model_slug = MODEL.replace("/", "_").replace(":", "_")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    output_filename = f"lab-01-{model_slug}-{timestamp}.json"
    output_path = run_dir / output_filename
    with open(output_path, "w") as f:
        json.dump(all_results, f, indent=2, default=str)

    # Symlink latest at results/ level for convenience
    latest_path = results_dir / "lab-01-output.json"
    latest_path.unlink(missing_ok=True)
    latest_path.symlink_to(run_dir.name + "/" + output_filename)

    print_run_summary(run_stats)
    print(f"\n  Results: {output_path}")
    print(f"  Latest:  {latest_path} → {output_filename}")
    print(f"  DB log:  {db_path}")

    http_client.close()
    db_conn.close()


if __name__ == "__main__":
    main()
