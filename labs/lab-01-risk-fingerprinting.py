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
    python labs/lab-01-risk-fingerprinting.py --retry results/2026-04-07/lab-01-*.json  # retry failed evals

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
    parser.add_argument("--retry", type=str, metavar="PATH", help="Retry failed/missing evals from a previous results JSON file")
    args = parser.parse_args()

    jurisdiction = args.jurisdiction
    rubric = args.rubric
    structured = args.structured

    # --retry: load previous results and identify failed/missing evals
    prior_results = None
    prior_path = None
    if args.retry:
        prior_path = Path(args.retry)
        if not prior_path.exists():
            # Try as relative to results/
            prior_path = _root / "results" / args.retry
        if not prior_path.exists():
            raise SystemExit(f"Retry file not found: {args.retry}")
        with open(prior_path) as f:
            prior_results = json.load(f)
        prior_run = prior_results.get("_run", {})
        # Inherit settings from prior run
        if prior_run.get("jurisdiction"):
            jurisdiction = prior_run["jurisdiction"]
        if prior_run.get("rubric"):
            rubric = prior_run["rubric"]
        if prior_run.get("structured") is not None:
            structured = prior_run["structured"]
        if prior_run.get("scenario_set") == "all":
            args.all = True

    # Load scenarios
    scenarios = load_scenarios(use_all=args.all)
    scenario_set = "all" if args.all else "core"

    # Init SQLite
    results_dir = _root / "results"
    results_dir.mkdir(exist_ok=True)
    db_path = results_dir / "ara-eval.db"
    db_conn = init_db(db_path)

    # Build skip set from prior results (successful evals to keep)
    skip_set = set()  # (scenario_id, personality_id) pairs to skip
    if prior_results:
        for sid, sdata in prior_results.items():
            if sid == "_run":
                continue
            evals = sdata.get("evaluations", {})
            for pid, ev in evals.items():
                if "fingerprint" in ev and "error" not in ev:
                    skip_set.add((sid, pid))

    # Create run record
    run_id = str(uuid.uuid4())
    run_started = datetime.now(timezone.utc).isoformat()
    total_expected = len(scenarios) * len(PERSONALITIES)
    retry_count = len(skip_set)
    calls_to_make = total_expected - retry_count

    run_metadata = {
        "lab": "01-risk-fingerprinting",
        "jurisdiction": jurisdiction,
        "rubric": rubric,
        "scenario_set": scenario_set,
        "structured": structured,
    }
    if prior_path:
        run_metadata["retry_of"] = str(prior_path)
        run_metadata["prior_successful"] = retry_count

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
    if prior_results:
        print(f"Retry mode: {retry_count} prior successes kept, {calls_to_make} calls to retry")
    else:
        print(f"Scenarios: {len(scenarios)} × {len(PERSONALITIES)} personalities = {total_expected} calls\n")

    # Init HTTP client with OpenRouter headers
    http_client = httpx.Client(headers=OPENROUTER_HEADERS, timeout=120.0)

    # Run-level accumulators — seed from prior successes
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

        # Seed from prior results if retrying
        if prior_results and sid in prior_results:
            all_results[sid] = prior_results[sid]
            # Re-attach scenario in case it was updated
            all_results[sid]["scenario"] = scenario
        else:
            all_results[sid] = {"scenario": scenario, "evaluations": {}, "deltas": None}

        personality_results = {}

        for personality_id, personality_meta in PERSONALITIES.items():
            # Skip if we already have a successful result from prior run
            if (sid, personality_id) in skip_set:
                ev = all_results[sid]["evaluations"][personality_id]
                # Reconstruct personality_results for delta computation
                personality_results[personality_id] = {
                    "parsed": {"dimensions": ev["fingerprint"]},
                    "gating": ev["gating"],
                }
                run_stats["successful"] += 1
                # Accumulate prior stats
                run_stats["input_tokens"] += (ev.get("usage") or {}).get("input_tokens") or 0
                run_stats["output_tokens"] += (ev.get("usage") or {}).get("output_tokens") or 0
                run_stats["cost"] += ev.get("cost_usd") or 0.0
                run_stats["duration_ms"] += ev.get("response_time_ms") or 0
                print(f"\n  Skipping {sid} / {personality_meta['label']} (prior success)")
                continue

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

        # Recompute personality deltas with all results (prior + new)
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
    if prior_path:
        all_results["_run"]["retry_of"] = str(prior_path)

    # Save results — overwrite prior file if retrying, otherwise new timestamped file
    if prior_path:
        output_path = prior_path.resolve()
    else:
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
    latest_path.symlink_to(output_path.relative_to(results_dir.resolve()))

    print_run_summary(run_stats)
    print(f"\n  Results: {output_path}")
    print(f"  Latest:  {latest_path} → {output_path.name}")
    print(f"  DB log:  {db_path}")

    http_client.close()
    db_conn.close()


if __name__ == "__main__":
    main()
