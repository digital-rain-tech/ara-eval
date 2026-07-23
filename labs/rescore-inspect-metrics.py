"""
ARA-Eval: Rescore existing Lab 01 outputs with the Inspect metric stack.
========================================================================

Applies the ara_eval_inspect scorers (fingerprint agreement, gate-verdict
match, hard-gate recall/precision/F2) to stored Lab 01 result JSON —
no API calls. One metric implementation, two data paths: live Inspect
runs score through ara_eval_inspect/scorers.py, and this script imports
the same functions over already-collected outputs.

Usage:
    python labs/rescore-inspect-metrics.py                       # newest results/<date>/ dir
    python labs/rescore-inspect-metrics.py results/2026-07-22/*.json
    python labs/rescore-inspect-metrics.py --all                 # include non-core scenarios

Default is core scenarios only, matching lab-04's leaderboard scope.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from ara_eval.core import DIMENSIONS, apply_gating_rules, load_scenarios
from ara_eval_inspect.scorers import gate_prf, hard_gate_counts, nest

_root = Path(__file__).parent.parent

PERSONALITIES = ["compliance_officer", "cro", "operations_director"]


def flat_levels(fingerprint: dict | None) -> dict | None:
    """Flatten a stored {dim: {level, reasoning}} fingerprint to {dim: level};
    None if the evaluation failed or is structurally unusable."""
    if not isinstance(fingerprint, dict):
        return None
    levels = {}
    for d in DIMENSIONS:
        entry = fingerprint.get(d)
        level = entry.get("level") if isinstance(entry, dict) else entry
        if not level:
            return None
        levels[d] = level
    return levels


def rescore_file(path: Path, core_only: bool) -> dict:
    """Score one Lab 01 result file; returns per-model pooled metrics."""
    data = json.loads(path.read_text())
    references = {
        s["id"]: s["reference_fingerprint"]
        for s in load_scenarios(use_all=True)
        if not core_only or s.get("core")
    }

    model = None
    dims_matched = dims_total = 0
    verdict_matched = verdict_total = 0
    gates = {"tp": 0, "fp": 0, "fn": 0, "tn": 0}
    evals_used = evals_failed = 0

    for sid, entry in data.items():
        reference = references.get(sid) or entry.get("scenario", {}).get(
            "reference_fingerprint"
        )
        if reference is None or (core_only and sid not in references):
            continue
        reference_verdict = apply_gating_rules(nest(reference))["classification"]
        for pid in PERSONALITIES:
            ev = entry.get("evaluations", {}).get(pid) or {}
            model = model or ev.get("model_used")
            levels = flat_levels(ev.get("fingerprint"))

            for k, v in hard_gate_counts(levels, reference).items():
                gates[k] += v
            if levels is None:
                evals_failed += 1
                continue
            evals_used += 1
            dims_total += len(DIMENSIONS)
            dims_matched += sum(levels[d] == reference[d] for d in DIMENSIONS)
            verdict_total += 1
            verdict_matched += (
                apply_gating_rules(nest(levels))["classification"] == reference_verdict
            )

    prf = gate_prf(gates["tp"], gates["fp"], gates["fn"])
    return {
        "file": path.name,
        "model": model or re.sub(r"^lab-01-|-\d{8}-\d{6}\.json$", "", path.name),
        "evals": evals_used,
        "failed": evals_failed,
        "fingerprint_agreement": dims_matched / dims_total if dims_total else 0.0,
        "gate_match": verdict_matched / verdict_total if verdict_total else 0.0,
        **prf,
        "gate_counts": gates,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("paths", nargs="*", help="Lab 01 result JSON files")
    parser.add_argument(
        "--all", action="store_true", help="include non-core scenarios"
    )
    args = parser.parse_args()

    if args.paths:
        paths = [Path(p) for p in args.paths]
    else:
        dated = sorted(
            d for d in (_root / "results").iterdir()
            if d.is_dir() and re.fullmatch(r"\d{4}-\d{2}-\d{2}", d.name)
        )
        if not dated:
            raise SystemExit("no dated results/ directory found")
        paths = sorted(dated[-1].glob("lab-01-*.json"))
        print(f"Rescoring newest run dir: {dated[-1].name}\n")

    scope = "all scenarios" if args.all else "core scenarios (lab-04 leaderboard scope)"
    print(f"Scope: {scope} × {len(PERSONALITIES)} personalities — no API calls\n")
    header = f"{'Model':<28} {'Evals':>5} {'Fail':>4} {'FP agree':>8} {'Gate match':>10} {'Recall':>7} {'Prec':>6} {'F2':>6}"
    print(header)
    print("-" * len(header))
    for path in paths:
        r = rescore_file(path, core_only=not args.all)
        print(
            f"{r['model'][:28]:<28} {r['evals']:>5} {r['failed']:>4} "
            f"{r['fingerprint_agreement']:>8.0%} {r['gate_match']:>10.0%} "
            f"{r['gate_recall']:>7.0%} {r['gate_precision']:>6.0%} {r['gate_f2']:>6.0%}"
        )


if __name__ == "__main__":
    main()
