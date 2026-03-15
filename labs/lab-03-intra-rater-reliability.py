"""
ARA-Eval Lab 03: Intra-Rater Reliability
=========================================

Does the LLM judge agree with itself? Run each scenario x personality
multiple times and measure classification stability per dimension.

If the instrument isn't reliable, nothing else we test matters.

Prerequisites:
    pip install -r requirements.txt

Usage:
    python labs/lab-03-intra-rater-reliability.py              # core scenarios only (6)
    python labs/lab-03-intra-rater-reliability.py --all         # all 13 scenarios
    python labs/lab-03-intra-rater-reliability.py --repetitions 5
    python labs/lab-03-intra-rater-reliability.py --scenarios banking-fraud-001,banking-customer-service-001

Output:
    results/lab-03-reliability.json — per-dimension agreement rates
    results/ara-eval.db — all requests logged
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import httpx

from ara_eval.core import (
    DIMENSIONS,
    DIMENSION_LABELS,
    LEVEL_ORDER,
    MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_HEADERS,
    PERSONALITIES,
    evaluate_scenario,
    get_run_dir,
    init_db,
    load_scenarios,
    update_run,
)

_root = Path(__file__).parent.parent


def compute_agreement(classifications: list[str]) -> dict:
    """Compute agreement metrics for a list of classifications."""
    counter = Counter(classifications)
    n = len(classifications)
    mode = counter.most_common(1)[0][0]
    mode_count = counter[mode]

    return {
        "n": n,
        "mode": mode,
        "mode_count": mode_count,
        "agreement_rate": mode_count / n,
        "distribution": dict(counter),
        "unanimous": mode_count == n,
    }


def compute_cohens_kappa_self(classifications: list[str]) -> float:
    """
    Compute a self-agreement metric analogous to Cohen's kappa.
    Compares all pairs of runs to measure agreement beyond chance.
    """
    if len(classifications) < 2:
        return 1.0

    n = len(classifications)
    pairs = 0
    agreements = 0

    # Count pairwise agreements
    for i in range(n):
        for j in range(i + 1, n):
            pairs += 1
            if classifications[i] == classifications[j]:
                agreements += 1

    observed = agreements / pairs if pairs else 1.0

    # Expected agreement by chance (based on marginal distribution)
    counter = Counter(classifications)
    expected = sum((count / n) ** 2 for count in counter.values())

    if expected >= 1.0:
        return 1.0
    return (observed - expected) / (1 - expected)


def main():
    if not OPENROUTER_API_KEY:
        raise SystemExit("OPENROUTER_API_KEY not set. Add it to .env.local or export it.")

    parser = argparse.ArgumentParser(description="ARA-Eval Lab 03: Intra-Rater Reliability")
    parser.add_argument("--all", action="store_true", help="Run all scenarios (default: core only)")
    parser.add_argument("--repetitions", type=int, default=5, help="Number of repetitions per cell (default: 5)")
    parser.add_argument("--scenarios", type=str, default=None, help="Comma-separated scenario IDs to test (overrides --all)")
    parser.add_argument("--jurisdiction", type=str, default="hk", choices=["hk", "hk-grounded", "generic"], help="Jurisdiction to use (default: hk)")
    parser.add_argument("--structured", action="store_true", help="Include structured context in prompts")
    args = parser.parse_args()

    # Load scenarios
    if args.scenarios:
        all_scenarios = load_scenarios(use_all=True)
        selected_ids = set(args.scenarios.split(","))
        scenarios = [s for s in all_scenarios if s["id"] in selected_ids]
        if not scenarios:
            print(f"No matching scenarios found. Available: {[s['id'] for s in all_scenarios]}")
            sys.exit(1)
    else:
        scenarios = load_scenarios(use_all=args.all)

    reps = args.repetitions
    total_calls = len(scenarios) * len(PERSONALITIES) * reps

    # Init
    results_dir = _root / "results"
    results_dir.mkdir(exist_ok=True)
    db_path = results_dir / "ara-eval.db"
    db_conn = init_db(db_path)

    http_client = httpx.Client(headers=OPENROUTER_HEADERS, timeout=120.0)

    run_id = str(uuid.uuid4())
    run_started = datetime.now(timezone.utc).isoformat()

    db_conn.execute(
        """INSERT INTO eval_runs
           (run_id, started_at, model_requested, scenario_count,
            personality_count, total_calls, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (run_id, run_started, MODEL, len(scenarios),
         len(PERSONALITIES), total_calls,
         json.dumps({"experiment": "intra_rater_reliability", "repetitions": reps,
                      "jurisdiction": args.jurisdiction, "structured": args.structured})),
    )
    db_conn.commit()

    print(f"\n{'='*70}")
    print(f"  LAB 03: INTRA-RATER RELIABILITY")
    print(f"  Run: {run_id}")
    print(f"  Model: {MODEL}")
    print(f"  {len(scenarios)} scenarios x {len(PERSONALITIES)} personalities x {reps} reps = {total_calls} calls")
    print(f"{'='*70}")

    # Collect all results: {scenario_id: {personality: [list of results]}}
    all_results = {}
    run_start = time.monotonic()
    run_stats = {"successful": 0, "failed": 0, "input_tokens": 0,
                 "output_tokens": 0, "cost": 0.0}
    completed = 0

    for scenario in scenarios:
        sid = scenario["id"]
        all_results[sid] = {}

        for personality_id in PERSONALITIES:
            all_results[sid][personality_id] = []

            for rep in range(reps):
                completed += 1
                print(f"  [{completed}/{total_calls}] {sid} x {personality_id} rep {rep+1}/{reps}...", end=" ", flush=True)

                try:
                    max_retries = 2
                    for attempt in range(1 + max_retries):
                        try:
                            result = evaluate_scenario(
                                http_client, db_conn, run_id, scenario,
                                personality_id, jurisdiction=args.jurisdiction,
                                structured=args.structured,
                            )
                            break
                        except Exception as retry_err:
                            if attempt < max_retries:
                                print(f"attempt {attempt + 1} failed ({retry_err}), retrying...", end=" ", flush=True)
                            else:
                                raise
                    all_results[sid][personality_id].append(result)
                    fp = result["gating"]["fingerprint_string"]
                    cost = f"${result.get('cost', 0):.6f}" if result.get("cost") else ""
                    print(f"{fp} {cost}")

                    run_stats["successful"] += 1
                    usage = result.get("usage", {})
                    run_stats["input_tokens"] += usage.get("input_tokens") or 0
                    run_stats["output_tokens"] += usage.get("output_tokens") or 0
                    run_stats["cost"] += result.get("cost") or 0.0

                except Exception as e:
                    print(f"ERROR: {e}")
                    all_results[sid][personality_id].append(None)
                    run_stats["failed"] += 1

    # Analyze reliability
    print(f"\n{'='*70}")
    print(f"  RELIABILITY ANALYSIS")
    print(f"  ({reps} repetitions per cell)")
    print(f"{'='*70}")

    # Per-dimension agreement across all cells
    dim_all_agreements = {dim: [] for dim in DIMENSIONS}
    cell_reports = {}

    for scenario in scenarios:
        sid = scenario["id"]
        cell_reports[sid] = {}

        print(f"\n  {sid}:")
        print(f"  {'-'*65}")

        for personality_id in PERSONALITIES:
            results = [r for r in all_results[sid][personality_id] if r is not None]
            if len(results) < 2:
                print(f"    {personality_id:<22} INSUFFICIENT DATA ({len(results)} runs)")
                continue

            cell_report = {}
            unstable_dims = []

            for dim in DIMENSIONS:
                levels = [r["parsed"]["dimensions"][dim]["level"] for r in results]
                agreement = compute_agreement(levels)
                kappa = compute_cohens_kappa_self(levels)
                agreement["kappa"] = kappa
                cell_report[DIMENSION_LABELS[dim]] = agreement
                dim_all_agreements[dim].append(agreement["agreement_rate"])

                if not agreement["unanimous"]:
                    unstable_dims.append(f"{DIMENSION_LABELS[dim]}({agreement['mode']}x{agreement['mode_count']}/{agreement['n']})")

            cell_reports[sid][personality_id] = cell_report

            # Print summary for this cell
            fingerprints = [r["gating"]["fingerprint_string"] for r in results]
            fp_counter = Counter(fingerprints)
            modal_fp = fp_counter.most_common(1)[0]

            if len(fp_counter) == 1:
                print(f"    {personality_id:<22} {modal_fp[0]}  STABLE ({reps}/{reps})")
            else:
                print(f"    {personality_id:<22} {modal_fp[0]}  ({modal_fp[1]}/{reps})")
                for fp, count in fp_counter.most_common():
                    if fp != modal_fp[0]:
                        print(f"    {'':>22} {fp}  ({count}/{reps})")
                if unstable_dims:
                    print(f"    {'':>22} Unstable: {', '.join(unstable_dims)}")

    # Overall dimension stability
    print(f"\n{'='*70}")
    print(f"  DIMENSION STABILITY SUMMARY")
    print(f"  (agreement rate = how often the modal classification appears)")
    print(f"{'='*70}")
    print(f"\n  {'DIMENSION':<28} {'MEAN AGREEMENT':>15} {'MIN':>6} {'PERFECT':>8}")
    print(f"  {'-'*28} {'-'*15} {'-'*6} {'-'*8}")

    overall_stability = {}
    for dim in DIMENSIONS:
        rates = dim_all_agreements[dim]
        if not rates:
            continue
        mean_rate = sum(rates) / len(rates)
        min_rate = min(rates)
        perfect = sum(1 for r in rates if r == 1.0)
        total = len(rates)

        label = DIMENSION_LABELS[dim]
        overall_stability[label] = {
            "mean_agreement": round(mean_rate, 3),
            "min_agreement": round(min_rate, 3),
            "perfect_cells": perfect,
            "total_cells": total,
            "perfect_rate": round(perfect / total, 3) if total else 0,
        }

        print(f"  {label:<28} {mean_rate:>14.1%} {min_rate:>5.1%} {perfect:>4}/{total:<3}")

    # Save
    elapsed = int((time.monotonic() - run_start) * 1000)

    # Finalize run
    update_run(
        db_conn, run_id,
        finished_at=datetime.now(timezone.utc).isoformat(),
        successful_calls=run_stats["successful"],
        failed_calls=run_stats["failed"],
        total_input_tokens=run_stats["input_tokens"],
        total_output_tokens=run_stats["output_tokens"],
        total_cost_usd=run_stats["cost"],
        total_duration_ms=elapsed,
        python_version=sys.version,
    )

    output = {
        "_experiment": {
            "name": "intra_rater_reliability",
            "model": MODEL,
            "jurisdiction": args.jurisdiction,
            "repetitions": reps,
            "scenarios": len(scenarios),
            "personalities": len(PERSONALITIES),
            "total_calls": total_calls,
            "structured": args.structured,
            "wall_time_ms": elapsed,
        },
        "dimension_stability": overall_stability,
        "cell_reports": cell_reports,
    }

    run_dir = get_run_dir(results_dir)
    model_slug = MODEL.replace("/", "_").replace(":", "_")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    output_filename = f"lab-03-{model_slug}-{timestamp}.json"
    output_path = run_dir / output_filename
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2, default=str)

    latest_path = results_dir / "lab-03-reliability.json"
    latest_path.unlink(missing_ok=True)
    latest_path.symlink_to(run_dir.name + "/" + output_filename)

    print(f"\n  Results: {output_path}")
    print(f"  Latest:  {latest_path} → {output_filename}")
    print(f"  Time: {elapsed/1000:.1f}s")

    http_client.close()
    db_conn.close()


if __name__ == "__main__":
    main()
