"""
ARA-Eval Lab 02: Regulatory Grounding Experiment
=================================================

Does providing actual regulatory requirements (vs. just framework names)
change how the LLM judge classifies risk dimensions?

This experiment runs the same scenarios × personalities twice:
  - Condition A: "hk" jurisdiction (names only)
  - Condition B: "hk-grounded" jurisdiction (full regulatory requirements)

Then compares fingerprints to measure the effect of regulatory grounding
on each dimension.

Prerequisites:
    pip install -r requirements.txt

Usage:
    python labs/lab-02-grounding-experiment.py

Output:
    results/lab-02-grounding.json — side-by-side comparison
    results/ara-eval.db — all requests logged with jurisdiction metadata
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

# Import everything from lab-01
sys.path.insert(0, str(Path(__file__).parent))
from importlib.util import spec_from_file_location, module_from_spec

_lab01_path = Path(__file__).parent / "lab-01-risk-fingerprinting.py"
_spec = spec_from_file_location("lab01", _lab01_path)
lab01 = module_from_spec(_spec)
_spec.loader.exec_module(lab01)

_root = Path(__file__).parent.parent

JURISDICTIONS = ["hk", "hk-grounded"]
LEVEL_ORDER = lab01.LEVEL_ORDER
DIMENSIONS = lab01.DIMENSIONS
DIMENSION_LABELS = lab01.DIMENSION_LABELS


def compare_fingerprints(result_a: dict, result_b: dict, label_a: str, label_b: str) -> dict:
    """Compare two fingerprints and compute per-dimension shifts."""
    shifts = {}
    for dim in DIMENSIONS:
        level_a = result_a["parsed"]["dimensions"][dim]["level"]
        level_b = result_b["parsed"]["dimensions"][dim]["level"]
        shift = LEVEL_ORDER[level_a] - LEVEL_ORDER[level_b]
        shifts[DIMENSION_LABELS[dim]] = {
            label_a: level_a,
            label_b: level_b,
            "shift": shift,  # positive = grounded is stricter (higher risk), negative = grounded is looser
            "changed": level_a != level_b,
            "reasoning_a": result_a["parsed"]["dimensions"][dim]["reasoning"],
            "reasoning_b": result_b["parsed"]["dimensions"][dim]["reasoning"],
        }
    return shifts


def print_comparison(scenario_id: str, personality: str, shifts: dict):
    """Print a side-by-side comparison for one scenario × personality."""
    changed = {k: v for k, v in shifts.items() if v["changed"]}
    if not changed:
        print(f"  {personality:<22} No changes")
        return

    for dim, s in changed.items():
        direction = "STRICTER" if s["shift"] > 0 else "LOOSER"
        print(f"  {personality:<22} {dim:<25} {s['hk']} → {s['hk-grounded']}  ({direction})")


def main():
    # Load scenarios
    scenarios_path = _root / "scenarios" / "starter-scenarios.json"
    with open(scenarios_path) as f:
        scenarios = json.load(f)

    # Init DB and HTTP
    results_dir = _root / "results"
    results_dir.mkdir(exist_ok=True)
    db_path = results_dir / "ara-eval.db"
    db_conn = lab01.init_db(db_path)

    import httpx
    http_client = httpx.Client(headers=lab01.OPENROUTER_HEADERS, timeout=120.0)

    import uuid
    from datetime import datetime, timezone

    all_comparisons = {}
    total_shifts = {dim: {"stricter": 0, "looser": 0, "unchanged": 0} for dim in DIMENSION_LABELS.values()}
    run_start = time.monotonic()

    # Run both conditions
    condition_results = {}
    for jurisdiction in JURISDICTIONS:
        run_id = str(uuid.uuid4())
        run_started = datetime.now(timezone.utc).isoformat()
        total_expected = len(scenarios) * len(lab01.PERSONALITIES)

        db_conn.execute(
            """INSERT INTO eval_runs
               (run_id, started_at, model_requested, scenario_count,
                personality_count, total_calls, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (run_id, run_started, lab01.MODEL, len(scenarios),
             len(lab01.PERSONALITIES), total_expected,
             json.dumps({"experiment": "grounding", "jurisdiction": jurisdiction})),
        )
        db_conn.commit()

        print(f"\n{'='*70}")
        print(f"  CONDITION: {jurisdiction}")
        print(f"  Run: {run_id}")
        print(f"  Model: {lab01.MODEL}")
        print(f"{'='*70}")

        condition_results[jurisdiction] = {}
        run_stats = {"successful": 0, "failed": 0, "input_tokens": 0,
                     "output_tokens": 0, "cost": 0.0}
        condition_start = time.monotonic()

        for scenario in scenarios:
            sid = scenario["id"]
            condition_results[jurisdiction][sid] = {}

            for personality_id, personality_meta in lab01.PERSONALITIES.items():
                print(f"  [{jurisdiction}] {sid} × {personality_id}...", end=" ", flush=True)

                try:
                    result = lab01.evaluate_scenario(
                        http_client, db_conn, run_id, scenario,
                        personality_id, jurisdiction=jurisdiction
                    )
                    condition_results[jurisdiction][sid][personality_id] = result
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
                    condition_results[jurisdiction][sid][personality_id] = None
                    run_stats["failed"] += 1

        # Finalize run record
        lab01.update_run(
            db_conn, run_id,
            finished_at=datetime.now(timezone.utc).isoformat(),
            successful_calls=run_stats["successful"],
            failed_calls=run_stats["failed"],
            total_input_tokens=run_stats["input_tokens"],
            total_output_tokens=run_stats["output_tokens"],
            total_cost_usd=run_stats["cost"],
            total_duration_ms=int((time.monotonic() - condition_start) * 1000),
            python_version=sys.version,
        )

    # Compare conditions
    print(f"\n{'='*70}")
    print(f"  GROUNDING EFFECT ANALYSIS")
    print(f"  Comparing: hk (names only) vs hk-grounded (full requirements)")
    print(f"{'='*70}")

    for scenario in scenarios:
        sid = scenario["id"]
        all_comparisons[sid] = {}

        print(f"\n  {sid}:")
        print(f"  {'-'*65}")

        for personality_id, personality_meta in lab01.PERSONALITIES.items():
            result_a = condition_results["hk"].get(sid, {}).get(personality_id)
            result_b = condition_results["hk-grounded"].get(sid, {}).get(personality_id)

            if not result_a or not result_b:
                print(f"  {personality_id:<22} SKIPPED (missing data)")
                continue

            shifts = compare_fingerprints(result_a, result_b, "hk", "hk-grounded")
            all_comparisons[sid][personality_id] = shifts
            print_comparison(sid, personality_id, shifts)

            # Accumulate totals
            for dim_label, s in shifts.items():
                if s["shift"] > 0:
                    total_shifts[dim_label]["stricter"] += 1
                elif s["shift"] < 0:
                    total_shifts[dim_label]["looser"] += 1
                else:
                    total_shifts[dim_label]["unchanged"] += 1

    # Summary
    total_evals = len(scenarios) * len(lab01.PERSONALITIES)
    print(f"\n{'='*70}")
    print(f"  DIMENSION SENSITIVITY TO GROUNDING")
    print(f"  (across {total_evals} evaluations)")
    print(f"{'='*70}")
    print(f"\n  {'DIMENSION':<28} {'CHANGED':>8} {'STRICTER':>10} {'LOOSER':>8} {'SAME':>6}")
    print(f"  {'-'*28} {'-'*8} {'-'*10} {'-'*8} {'-'*6}")

    for dim_label in DIMENSION_LABELS.values():
        t = total_shifts[dim_label]
        changed = t["stricter"] + t["looser"]
        pct = f"({changed/total_evals*100:.0f}%)" if total_evals else ""
        print(f"  {dim_label:<28} {changed:>4} {pct:>4} {t['stricter']:>10} {t['looser']:>8} {t['unchanged']:>6}")

    # Save
    elapsed = int((time.monotonic() - run_start) * 1000)
    output = {
        "_experiment": {
            "name": "regulatory_grounding",
            "conditions": JURISDICTIONS,
            "model": lab01.MODEL,
            "scenarios": len(scenarios),
            "personalities": len(lab01.PERSONALITIES),
            "total_evals_per_condition": total_evals,
            "wall_time_ms": elapsed,
        },
        "comparisons": all_comparisons,
        "dimension_sensitivity": total_shifts,
    }

    output_path = results_dir / "lab-02-grounding.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2, default=str)

    print(f"\n  Results: {output_path}")
    print(f"  Time: {elapsed/1000:.1f}s")

    http_client.close()
    db_conn.close()


if __name__ == "__main__":
    main()
