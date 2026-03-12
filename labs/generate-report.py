"""
ARA-Eval Report Generator
=========================

Auto-generates markdown reports from ARA-Eval lab results.
Reads from both the SQLite DB (results/ara-eval.db) and JSON result files.

Usage:
    python labs/generate-report.py --last                    # most recent run
    python labs/generate-report.py <run_id>                  # specific run
    python labs/generate-report.py --compare <id1> <id2>     # side-by-side comparison

Output:
    results/report-<run_id_first8>.md
    results/report-compare-<id1_first8>-vs-<id2_first8>.md
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Constants (standalone — no imports from lab-01)
# ---------------------------------------------------------------------------

DIMENSIONS = [
    "decision_reversibility",
    "failure_blast_radius",
    "regulatory_exposure",
    "human_override_latency",
    "data_confidence",
    "accountability_chain",
    "graceful_degradation",
]

DIMENSION_LABELS = {
    "decision_reversibility": "Decision Reversibility",
    "failure_blast_radius": "Failure Blast Radius",
    "regulatory_exposure": "Regulatory Exposure",
    "human_override_latency": "Human Override Latency",
    "data_confidence": "Data Confidence",
    "accountability_chain": "Accountability Chain",
    "graceful_degradation": "Graceful Degradation",
}

LEVEL_ORDER = {"A": 0, "B": 1, "C": 2, "D": 3}
LEVEL_FROM_ORD = {0: "A", 1: "B", 2: "C", 3: "D"}

PERSONALITY_IDS = ["compliance_officer", "cro", "operations_director"]

GATING_LABELS = {
    "ready_now": "Ready Now",
    "ready_with_prerequisites": "Ready with Prerequisites",
    "human_in_loop_required": "Human-in-Loop Required",
}

_root = Path(__file__).resolve().parent.parent
RESULTS_DIR = _root / "results"
DB_PATH = RESULTS_DIR / "ara-eval.db"


def _get_report_dir() -> Path:
    """Create and return a date-stamped subdirectory under results/."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    report_dir = RESULTS_DIR / today
    report_dir.mkdir(parents=True, exist_ok=True)
    return report_dir


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_db() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise SystemExit(f"Database not found: {DB_PATH}")
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def get_run(conn: sqlite3.Connection, run_id: str) -> dict:
    row = conn.execute("SELECT * FROM eval_runs WHERE run_id = ?", (run_id,)).fetchone()
    if not row:
        raise SystemExit(f"Run not found: {run_id}")
    return dict(row)


def get_latest_run(conn: sqlite3.Connection) -> dict:
    row = conn.execute(
        "SELECT * FROM eval_runs ORDER BY started_at DESC LIMIT 1"
    ).fetchone()
    if not row:
        raise SystemExit("No runs found in database.")
    return dict(row)


def get_run_requests(conn: sqlite3.Connection, run_id: str) -> List[dict]:
    rows = conn.execute(
        "SELECT * FROM ai_provider_requests WHERE run_id = ? ORDER BY created_at",
        (run_id,),
    ).fetchall()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# JSON file discovery
# ---------------------------------------------------------------------------

def _lab_prefix_for_run(run: dict) -> str:
    """Determine which lab-NN prefix a run corresponds to."""
    meta = {}
    if run.get("metadata"):
        try:
            meta = json.loads(run["metadata"]) if isinstance(run["metadata"], str) else run["metadata"]
        except (json.JSONDecodeError, TypeError):
            pass
    experiment = meta.get("experiment", "lab01")
    if experiment == "grounding":
        return "lab-02"
    elif experiment == "intra_rater_reliability":
        return "lab-03"
    return "lab-01"


def find_json_for_run(run: dict) -> Optional[Path]:
    """Find the JSON result file corresponding to a run.

    Tries several strategies:
    1. Match by run_id inside _run or _experiment key in JSON
    2. Match by lab prefix + model slug + filename timestamp proximity
    """
    import re

    model = run.get("model_requested", "")
    model_slug = model.replace("/", "_").replace(":", "_")
    started_at = run.get("started_at", "")
    run_id = run["run_id"]
    lab_prefix = _lab_prefix_for_run(run)

    # Collect candidate files: search both results/ and results/YYYY-MM-DD/ subdirs
    patterns = [
        str(RESULTS_DIR / f"{lab_prefix}-{model_slug}-*.json"),
        str(RESULTS_DIR / f"{lab_prefix}-*.json"),
        str(RESULTS_DIR / f"*/{lab_prefix}-{model_slug}-*.json"),
        str(RESULTS_DIR / f"*/{lab_prefix}-*.json"),
    ]

    candidates = []
    for pattern in patterns:
        candidates.extend(glob.glob(pattern))

    # Exclude symlinks (they're "latest" pointers)
    candidates = [c for c in candidates if not os.path.islink(c)]
    # De-duplicate and sort by modification time (newest first)
    candidates = sorted(set(candidates), key=os.path.getmtime, reverse=True)

    # Strategy 1: check _run.run_id or _experiment.run_id inside JSON
    for path_str in candidates:
        try:
            with open(path_str) as f:
                data = json.load(f)
            for meta_key in ("_run", "_experiment"):
                run_meta = data.get(meta_key, {})
                if run_meta.get("run_id") == run_id:
                    return Path(path_str)
        except (json.JSONDecodeError, OSError):
            continue

    # Strategy 2: extract timestamp from filename and match to run started_at
    # Filenames look like: lab-01-model_slug-20260312-073600.json
    ts_pattern = re.compile(r"(\d{8})-(\d{6})\.json$")
    if started_at:
        try:
            run_dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
        except ValueError:
            run_dt = None

        if run_dt:
            best_match = None
            best_delta = float("inf")
            for path_str in candidates:
                m = ts_pattern.search(path_str)
                if not m:
                    continue
                try:
                    file_dt = datetime.strptime(
                        f"{m.group(1)}-{m.group(2)}", "%Y%m%d-%H%M%S"
                    )
                    # Compare naive (both as UTC)
                    run_naive = run_dt.replace(tzinfo=None)
                    delta = abs((run_naive - file_dt).total_seconds())
                    if delta < best_delta:
                        best_delta = delta
                        best_match = path_str
                except ValueError:
                    continue
            # Accept if within 30 minutes (runs can take a while)
            if best_match and best_delta < 1800:
                return Path(best_match)

    return None


def load_json_results(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Data extraction helpers
# ---------------------------------------------------------------------------

def get_scenario_ids(data: dict) -> List[str]:
    """Return scenario IDs from JSON data, preserving order, excluding meta keys."""
    return [k for k in data if not k.startswith("_")]


def get_fingerprint_string(evaluation: dict) -> Optional[str]:
    gating = evaluation.get("gating", {})
    return gating.get("fingerprint_string")


def get_gating_classification(evaluation: dict) -> Optional[str]:
    gating = evaluation.get("gating", {})
    return gating.get("classification")


def get_dimension_level(evaluation: dict, dim: str) -> Optional[str]:
    fp = evaluation.get("fingerprint", {})
    dim_data = fp.get(dim, {})
    if isinstance(dim_data, dict):
        return dim_data.get("level")
    return None


def parse_metadata(run: dict) -> dict:
    raw = run.get("metadata")
    if raw and isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
    return {}


# ---------------------------------------------------------------------------
# Homework question detectors
# ---------------------------------------------------------------------------

def detect_hard_gate_questions(
    scenario_id: str, evaluations: dict
) -> List[str]:
    """Detector 1: Hard gate triggered — ask about regulatory requirements."""
    questions = []
    for pid, ev in evaluations.items():
        rules = ev.get("gating", {}).get("triggered_rules", [])
        hard_gates = [r for r in rules if "HARD GATE" in r]
        if hard_gates:
            gate_text = hard_gates[0].split(":")[1].strip() if ":" in hard_gates[0] else hard_gates[0]
            questions.append(
                f"**{scenario_id}**: A hard gate was triggered ({gate_text}). "
                f"What specific regulatory requirements drive this classification, "
                f"and could any exemptions or safe harbors apply?"
            )
            return questions[:2]
    return questions[:2]


def detect_consensus_questions(
    scenario_id: str, evaluations: dict
) -> List[str]:
    """Detector 2: All personalities agree — ask about consensus validity."""
    if len(evaluations) < 2:
        return []

    valid_evals = {
        pid: ev for pid, ev in evaluations.items()
        if "error" not in ev and ev.get("gating", {}).get("fingerprint_string")
    }
    if len(valid_evals) < 2:
        return []

    fps = [ev["gating"]["fingerprint_string"] for ev in valid_evals.values()]
    if len(set(fps)) == 1:
        return [
            f"**{scenario_id}**: All three stakeholder archetypes produced the same "
            f"fingerprint ({fps[0]}). Does this consensus increase confidence in "
            f"the classification, or could it indicate a shared blind spot?"
        ]
    return []


def detect_personality_split_questions(
    scenario_id: str, evaluations: dict
) -> List[str]:
    """Detector 3: Personality split (delta >= 2 levels) — ask about stakeholder optimization."""
    questions = []
    valid_evals = {
        pid: ev for pid, ev in evaluations.items()
        if "error" not in ev and ev.get("fingerprint")
    }
    if len(valid_evals) < 2:
        return []

    for dim in DIMENSIONS:
        levels = {}
        for pid, ev in valid_evals.items():
            lvl = get_dimension_level(ev, dim)
            if lvl and lvl in LEVEL_ORDER:
                levels[pid] = lvl

        if len(levels) < 2:
            continue

        ordinals = [LEVEL_ORDER[l] for l in levels.values()]
        spread = max(ordinals) - min(ordinals)
        if spread >= 2:
            dim_label = DIMENSION_LABELS.get(dim, dim)
            level_strs = [f"{pid}={lvl}" for pid, lvl in levels.items()]
            questions.append(
                f"**{scenario_id}**: Stakeholders disagree on {dim_label} "
                f"by {spread} levels ({', '.join(level_strs)}). "
                f"Which perspective should drive the gating decision, "
                f"and what would change each stakeholder's assessment?"
            )
            if len(questions) >= 2:
                return questions

    return questions[:2]


def detect_reference_mismatch_questions(
    scenario_id: str, evaluations: dict, scenario_data: dict
) -> List[str]:
    """Detector 4: Reference mismatch — ask which to trust."""
    ref_fp = scenario_data.get("scenario", {}).get("reference_fingerprint")
    if not ref_fp:
        return []

    ref_string = "-".join(ref_fp.get(d, "?") for d in DIMENSIONS)
    questions = []

    for pid, ev in evaluations.items():
        if "error" in ev:
            continue
        eval_string = get_fingerprint_string(ev)
        if eval_string and eval_string != ref_string:
            # Count mismatched dimensions
            ref_levels = ref_string.split("-")
            eval_levels = eval_string.split("-")
            mismatches = []
            for i, dim in enumerate(DIMENSIONS):
                if i < len(ref_levels) and i < len(eval_levels):
                    if ref_levels[i] != eval_levels[i]:
                        mismatches.append(DIMENSION_LABELS[dim])

            if mismatches:
                questions.append(
                    f"**{scenario_id}**: LLM evaluation differs from the "
                    f"reference fingerprint on {len(mismatches)} dimension(s) "
                    f"({', '.join(mismatches[:3])}{'...' if len(mismatches) > 3 else ''}). "
                    f"The reference was produced via Opus 4.6 + professor review + "
                    f"industry partner validation. Which should you trust, and why?"
                )
                return questions[:2]

    return questions[:2]


def detect_grounding_shift_questions(
    scenario_id: str, comp_data: dict
) -> List[str]:
    """Detector 5 (compare mode): Grounding shift — ask why citation changes judgment."""
    questions = []
    for pid, dims in comp_data.items():
        if not isinstance(dims, dict):
            continue
        for dim_label, detail in dims.items():
            if not isinstance(detail, dict):
                continue
            if detail.get("changed") and abs(detail.get("shift", 0)) >= 1:
                cond_keys = [k for k in detail if k not in (
                    "shift", "changed", "reasoning_a", "reasoning_b"
                )]
                if len(cond_keys) >= 2:
                    val_a = detail.get(cond_keys[0], "?")
                    val_b = detail.get(cond_keys[1], "?")
                    questions.append(
                        f"**{scenario_id}** ({pid}, {dim_label}): "
                        f"Level shifted from {val_a} to {val_b}. "
                        f"What specific regulatory citation or grounding material "
                        f"caused this change in judgment?"
                    )
                    if len(questions) >= 2:
                        return questions

    return questions[:2]


def detect_reliability_questions(
    scenario_id: str, evaluations: dict
) -> List[str]:
    """Detector 6: Reliability concern — ask what makes dimension hard to classify."""
    questions = []
    valid_evals = {
        pid: ev for pid, ev in evaluations.items()
        if "error" not in ev and ev.get("fingerprint")
    }
    if len(valid_evals) < 2:
        return []

    # Find dimensions where personalities vary (even by 1 level) — these are
    # harder to classify. Focus on the ones with most variance.
    dim_variance = {}
    for dim in DIMENSIONS:
        levels = []
        for pid, ev in valid_evals.items():
            lvl = get_dimension_level(ev, dim)
            if lvl and lvl in LEVEL_ORDER:
                levels.append(LEVEL_ORDER[lvl])
        if len(levels) >= 2:
            dim_variance[dim] = max(levels) - min(levels)

    # Only flag dimensions with variance
    noisy_dims = [d for d, v in dim_variance.items() if v >= 1]
    if noisy_dims:
        worst = max(noisy_dims, key=lambda d: dim_variance[d])
        dim_label = DIMENSION_LABELS.get(worst, worst)
        questions.append(
            f"**{scenario_id}**: {dim_label} shows the most classification "
            f"variance across personalities (spread={dim_variance[worst]}). "
            f"What makes this dimension inherently hard to classify for this scenario?"
        )

    return questions[:2]


# ---------------------------------------------------------------------------
# Single-run report generation
# ---------------------------------------------------------------------------

def generate_single_report(run: dict, data: dict) -> str:
    """Generate a complete markdown report for a single run."""
    lines: List[str] = []
    meta = parse_metadata(run)
    scenario_ids = get_scenario_ids(data)

    # ---- Section 1: Header ----
    lines.append(f"# ARA-Eval Report")
    lines.append("")
    run_id = run["run_id"]
    lines.append(f"| Field | Value |")
    lines.append(f"|-------|-------|")
    lines.append(f"| **Run ID** | `{run_id}` |")
    lines.append(f"| **Model** | {run.get('model_requested', 'unknown')} |")
    lines.append(f"| **Jurisdiction** | {meta.get('jurisdiction', 'N/A')} |")
    lines.append(f"| **Rubric** | {meta.get('rubric', 'N/A')} |")
    lines.append(f"| **Scenario Set** | {meta.get('scenario_set', 'N/A')} |")
    lines.append(f"| **Started** | {run.get('started_at', 'N/A')} |")
    lines.append(f"| **Finished** | {run.get('finished_at', 'N/A')} |")

    total_cost = run.get("total_cost_usd", 0) or 0
    lines.append(f"| **Total Cost** | ${total_cost:.6f} |")

    total_tokens = (run.get("total_input_tokens") or 0) + (run.get("total_output_tokens") or 0)
    lines.append(f"| **Total Tokens** | {total_tokens:,} ({run.get('total_input_tokens', 0):,} in / {run.get('total_output_tokens', 0):,} out) |")

    successful = run.get("successful_calls", 0)
    total_calls = run.get("total_calls", 0)
    rate = f"{successful}/{total_calls}" if total_calls else "N/A"
    pct = f" ({successful/total_calls*100:.0f}%)" if total_calls else ""
    lines.append(f"| **Success Rate** | {rate}{pct} |")

    duration_ms = run.get("total_duration_ms", 0) or 0
    lines.append(f"| **Duration** | {duration_ms:,}ms ({duration_ms/1000:.1f}s) |")
    lines.append("")

    # ---- Section 2: Fingerprint Matrix ----
    lines.append("## Fingerprint Matrix")
    lines.append("")

    # Collect personality labels from the data
    personality_labels = {}
    for sid in scenario_ids:
        evals = data[sid].get("evaluations", {})
        for pid, ev in evals.items():
            if pid not in personality_labels and "personality" in ev:
                personality_labels[pid] = ev["personality"]

    ordered_pids = [p for p in PERSONALITY_IDS if p in personality_labels]
    if not ordered_pids:
        ordered_pids = list(personality_labels.keys())

    header = "| Scenario |"
    separator = "|----------|"
    for pid in ordered_pids:
        label = personality_labels.get(pid, pid)
        header += f" {label} |"
        separator += "------|"

    lines.append(header)
    lines.append(separator)

    for sid in scenario_ids:
        evals = data[sid].get("evaluations", {})
        row = f"| **{sid}** |"
        for pid in ordered_pids:
            ev = evals.get(pid, {})
            if "error" in ev:
                row += " ERROR |"
            else:
                fp_str = get_fingerprint_string(ev) or "N/A"
                gating = get_gating_classification(ev) or ""
                gating_short = {
                    "ready_now": "RN",
                    "ready_with_prerequisites": "RP",
                    "human_in_loop_required": "HIL",
                }.get(gating, "")
                row += f" `{fp_str}` ({gating_short}) |"
        lines.append(row)

    lines.append("")
    lines.append("*Gating: RN = Ready Now, RP = Ready with Prerequisites, HIL = Human-in-Loop Required*")
    lines.append("")

    # ---- Section 3: Gating Summary ----
    lines.append("## Gating Summary")
    lines.append("")

    gating_counts = {"ready_now": 0, "ready_with_prerequisites": 0, "human_in_loop_required": 0}
    total_evals = 0
    for sid in scenario_ids:
        evals = data[sid].get("evaluations", {})
        for pid, ev in evals.items():
            if "error" not in ev:
                gc = get_gating_classification(ev)
                if gc in gating_counts:
                    gating_counts[gc] += 1
                total_evals += 1

    lines.append("| Classification | Count | Percentage |")
    lines.append("|----------------|-------|------------|")
    for gc, label in GATING_LABELS.items():
        count = gating_counts[gc]
        pct = f"{count/total_evals*100:.1f}%" if total_evals else "0%"
        lines.append(f"| {label} | {count} | {pct} |")
    lines.append(f"| **Total** | **{total_evals}** | |")
    lines.append("")

    # ---- Section 4: Dimension Heatmap ----
    lines.append("## Dimension Heatmap")
    lines.append("")
    lines.append("Distribution of level classifications across all evaluations:")
    lines.append("")
    lines.append("| Dimension | A | B | C | D |")
    lines.append("|-----------|---|---|---|---|")

    for dim in DIMENSIONS:
        counts = {"A": 0, "B": 0, "C": 0, "D": 0}
        for sid in scenario_ids:
            evals = data[sid].get("evaluations", {})
            for pid, ev in evals.items():
                if "error" not in ev:
                    lvl = get_dimension_level(ev, dim)
                    if lvl in counts:
                        counts[lvl] += 1
        dim_label = DIMENSION_LABELS[dim]
        total_dim = sum(counts.values())
        cells = []
        for lvl in ["A", "B", "C", "D"]:
            c = counts[lvl]
            pct = f"{c/total_dim*100:.0f}%" if total_dim else "0%"
            cells.append(f"{c} ({pct})")
        lines.append(f"| {dim_label} | {' | '.join(cells)} |")

    lines.append("")

    # ---- Section 5: Personality Delta Analysis ----
    lines.append("## Personality Delta Analysis")
    lines.append("")
    lines.append("Dimensions where stakeholder archetypes disagree:")
    lines.append("")

    any_disagreements = False
    for sid in scenario_ids:
        deltas = data[sid].get("deltas")
        if not deltas:
            continue

        disagreements = {k: v for k, v in deltas.items() if not v.get("consensus", True)}
        if not disagreements:
            continue

        any_disagreements = True
        lines.append(f"### {sid}")
        lines.append("")
        lines.append("| Dimension | " + " | ".join(
            personality_labels.get(p, p) for p in ordered_pids
        ) + " | Spread |")
        lines.append("|-----------|" + "".join("------|" for _ in ordered_pids) + "--------|")

        for dim_label, delta in sorted(disagreements.items(), key=lambda x: -x[1].get("spread", 0)):
            levels = delta.get("levels", {})
            spread = delta.get("spread", 0)
            row = f"| {dim_label} |"
            for pid in ordered_pids:
                plabel = personality_labels.get(pid, pid)
                lvl = levels.get(plabel, "?")
                row += f" {lvl} |"
            row += f" {spread} |"
            lines.append(row)

        lines.append("")

    if not any_disagreements:
        lines.append("All stakeholder archetypes agree on all dimensions across all scenarios.")
        lines.append("")

    # ---- Section 6: Reference Comparison ----
    lines.append("## Reference Comparison")
    lines.append("")
    lines.append("Accuracy of LLM evaluations vs. human-authored reference fingerprints:")
    lines.append("")

    total_dim_comparisons = 0
    total_dim_matches = 0
    ref_rows = []

    for sid in scenario_ids:
        scenario_obj = data[sid].get("scenario", {})
        ref_fp = scenario_obj.get("reference_fingerprint")
        if not ref_fp:
            continue

        ref_string = "-".join(ref_fp.get(d, "?") for d in DIMENSIONS)
        evals = data[sid].get("evaluations", {})

        for pid in ordered_pids:
            ev = evals.get(pid, {})
            if "error" in ev:
                continue
            eval_string = get_fingerprint_string(ev)
            if not eval_string:
                continue

            ref_levels = [ref_fp.get(d, "?") for d in DIMENSIONS]
            eval_levels = eval_string.split("-")

            matches = 0
            for i in range(min(len(ref_levels), len(eval_levels))):
                if ref_levels[i] == eval_levels[i]:
                    matches += 1
            total_compared = min(len(ref_levels), len(eval_levels))

            total_dim_comparisons += total_compared
            total_dim_matches += matches

            match_rate = f"{matches}/{total_compared}"
            pct = f"{matches/total_compared*100:.0f}%" if total_compared else "N/A"
            plabel = personality_labels.get(pid, pid)
            ref_rows.append((sid, plabel, ref_string, eval_string, match_rate, pct))

    if ref_rows:
        lines.append("| Scenario | Personality | Reference | Evaluated | Match | Rate |")
        lines.append("|----------|-------------|-----------|-----------|-------|------|")
        for sid, plabel, ref_s, eval_s, match, pct in ref_rows:
            lines.append(f"| {sid} | {plabel} | `{ref_s}` | `{eval_s}` | {match} | {pct} |")
        lines.append("")

        overall_pct = f"{total_dim_matches/total_dim_comparisons*100:.1f}%" if total_dim_comparisons else "N/A"
        lines.append(f"**Overall dimension match rate: {total_dim_matches}/{total_dim_comparisons} ({overall_pct})**")
        lines.append("")
    else:
        lines.append("No reference fingerprints available for comparison.")
        lines.append("")

    # ---- Section 7: Homework Questions ----
    lines.append("## Homework Questions")
    lines.append("")
    lines.append("Auto-generated questions based on patterns detected in the results:")
    lines.append("")

    all_questions: List[str] = []
    for sid in scenario_ids:
        evals = data[sid].get("evaluations", {})
        scenario_data = data[sid]

        all_questions.extend(detect_hard_gate_questions(sid, evals))
        all_questions.extend(detect_consensus_questions(sid, evals))
        all_questions.extend(detect_personality_split_questions(sid, evals))
        all_questions.extend(detect_reference_mismatch_questions(sid, evals, scenario_data))
        all_questions.extend(detect_reliability_questions(sid, evals))

    # Deduplicate while preserving order
    seen = set()
    unique_questions = []
    for q in all_questions:
        if q not in seen:
            seen.add(q)
            unique_questions.append(q)

    if unique_questions:
        for i, q in enumerate(unique_questions, 1):
            lines.append(f"{i}. {q}")
            lines.append("")
    else:
        lines.append("No homework questions triggered by the detected patterns.")
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Comparison report generation
# ---------------------------------------------------------------------------

def generate_comparison_report(
    run_a: dict, data_a: dict,
    run_b: dict, data_b: dict,
) -> str:
    """Generate a comparison markdown report between two runs."""
    lines: List[str] = []
    meta_a = parse_metadata(run_a)
    meta_b = parse_metadata(run_b)

    id_a = run_a["run_id"]
    id_b = run_b["run_id"]
    short_a = id_a[:8]
    short_b = id_b[:8]

    # ---- Header ----
    lines.append(f"# ARA-Eval Comparison Report")
    lines.append("")
    lines.append(f"Comparing run `{short_a}` vs `{short_b}`")
    lines.append("")
    lines.append("| Field | Run A | Run B |")
    lines.append("|-------|-------|-------|")
    lines.append(f"| **Run ID** | `{id_a}` | `{id_b}` |")
    lines.append(f"| **Model** | {run_a.get('model_requested', '?')} | {run_b.get('model_requested', '?')} |")
    lines.append(f"| **Jurisdiction** | {meta_a.get('jurisdiction', 'N/A')} | {meta_b.get('jurisdiction', 'N/A')} |")
    lines.append(f"| **Rubric** | {meta_a.get('rubric', 'N/A')} | {meta_b.get('rubric', 'N/A')} |")
    lines.append(f"| **Scenario Set** | {meta_a.get('scenario_set', 'N/A')} | {meta_b.get('scenario_set', 'N/A')} |")
    lines.append(f"| **Started** | {run_a.get('started_at', 'N/A')} | {run_b.get('started_at', 'N/A')} |")

    cost_a = run_a.get("total_cost_usd") or 0
    cost_b = run_b.get("total_cost_usd") or 0
    lines.append(f"| **Total Cost** | ${cost_a:.6f} | ${cost_b:.6f} |")

    tokens_a = (run_a.get("total_input_tokens") or 0) + (run_a.get("total_output_tokens") or 0)
    tokens_b = (run_b.get("total_input_tokens") or 0) + (run_b.get("total_output_tokens") or 0)
    lines.append(f"| **Total Tokens** | {tokens_a:,} | {tokens_b:,} |")

    succ_a = run_a.get("successful_calls", 0)
    total_a = run_a.get("total_calls", 0)
    succ_b = run_b.get("successful_calls", 0)
    total_b = run_b.get("total_calls", 0)
    lines.append(f"| **Success Rate** | {succ_a}/{total_a} | {succ_b}/{total_b} |")

    dur_a = run_a.get("total_duration_ms") or 0
    dur_b = run_b.get("total_duration_ms") or 0
    lines.append(f"| **Duration** | {dur_a:,}ms | {dur_b:,}ms |")
    lines.append("")

    # ---- Side-by-side Fingerprint Diff ----
    lines.append("## Fingerprint Diff")
    lines.append("")

    scenario_ids_a = set(get_scenario_ids(data_a))
    scenario_ids_b = set(get_scenario_ids(data_b))
    common_scenarios = sorted(scenario_ids_a & scenario_ids_b)

    # Collect personality labels
    personality_labels = {}
    for d in [data_a, data_b]:
        for sid in get_scenario_ids(d):
            for pid, ev in d[sid].get("evaluations", {}).items():
                if pid not in personality_labels and "personality" in ev:
                    personality_labels[pid] = ev["personality"]

    ordered_pids = [p for p in PERSONALITY_IDS if p in personality_labels]
    if not ordered_pids:
        ordered_pids = list(personality_labels.keys())

    lines.append(f"| Scenario | Personality | Run A ({short_a}) | Run B ({short_b}) | Changed? |")
    lines.append("|----------|-------------|---------|---------|----------|")

    total_shifts = 0
    total_comparisons = 0
    dim_shift_summary: Dict[str, Dict[str, int]] = {
        dim: {"stricter": 0, "looser": 0, "unchanged": 0} for dim in DIMENSIONS
    }

    for sid in common_scenarios:
        evals_a = data_a[sid].get("evaluations", {})
        evals_b = data_b[sid].get("evaluations", {})

        for pid in ordered_pids:
            ev_a = evals_a.get(pid, {})
            ev_b = evals_b.get(pid, {})

            if "error" in ev_a or "error" in ev_b:
                continue

            fp_a = get_fingerprint_string(ev_a) or "N/A"
            fp_b = get_fingerprint_string(ev_b) or "N/A"

            changed = fp_a != fp_b
            marker = "**YES**" if changed else ""
            plabel = personality_labels.get(pid, pid)

            # Build diff-highlighted fingerprints
            if changed and fp_a != "N/A" and fp_b != "N/A":
                levels_a = fp_a.split("-")
                levels_b = fp_b.split("-")
                diff_parts = []
                for i, (la, lb) in enumerate(zip(levels_a, levels_b)):
                    if la != lb:
                        diff_parts.append(f"**{la}>{lb}**")
                    else:
                        diff_parts.append(la)
                diff_str = "-".join(diff_parts)
                lines.append(f"| {sid} | {plabel} | `{fp_a}` | `{fp_b}` | {diff_str} |")
            else:
                lines.append(f"| {sid} | {plabel} | `{fp_a}` | `{fp_b}` | {marker} |")

            # Track per-dimension shifts
            if fp_a != "N/A" and fp_b != "N/A":
                levels_a = fp_a.split("-")
                levels_b = fp_b.split("-")
                for i, dim in enumerate(DIMENSIONS):
                    if i < len(levels_a) and i < len(levels_b):
                        la = levels_a[i]
                        lb = levels_b[i]
                        total_comparisons += 1
                        if la != lb:
                            total_shifts += 1
                        ord_a = LEVEL_ORDER.get(la, -1)
                        ord_b = LEVEL_ORDER.get(lb, -1)
                        if ord_a >= 0 and ord_b >= 0:
                            if ord_b < ord_a:
                                dim_shift_summary[dim]["stricter"] += 1
                            elif ord_b > ord_a:
                                dim_shift_summary[dim]["looser"] += 1
                            else:
                                dim_shift_summary[dim]["unchanged"] += 1

    lines.append("")

    if total_comparisons:
        pct_changed = total_shifts / total_comparisons * 100
        lines.append(
            f"**Overall: {total_shifts}/{total_comparisons} dimension-level "
            f"classifications changed ({pct_changed:.1f}%)**"
        )
        lines.append("")

    # ---- Per-dimension shift summary ----
    lines.append("## Per-Dimension Shift Summary")
    lines.append("")
    lines.append("How each dimension moved between Run A and Run B:")
    lines.append("")
    lines.append("| Dimension | Stricter (A-ward) | Looser (D-ward) | Unchanged |")
    lines.append("|-----------|-------------------|-----------------|-----------|")

    for dim in DIMENSIONS:
        s = dim_shift_summary[dim]
        dim_label = DIMENSION_LABELS[dim]
        lines.append(
            f"| {dim_label} | {s['stricter']} | {s['looser']} | {s['unchanged']} |"
        )

    lines.append("")

    # ---- Cost/Token Comparison ----
    lines.append("## Cost and Token Comparison")
    lines.append("")
    lines.append("| Metric | Run A | Run B | Delta |")
    lines.append("|--------|-------|-------|-------|")

    cost_delta = cost_b - cost_a
    sign = "+" if cost_delta >= 0 else ""
    lines.append(f"| Cost (USD) | ${cost_a:.6f} | ${cost_b:.6f} | {sign}${cost_delta:.6f} |")

    token_delta = tokens_b - tokens_a
    sign = "+" if token_delta >= 0 else ""
    lines.append(f"| Tokens | {tokens_a:,} | {tokens_b:,} | {sign}{token_delta:,} |")

    dur_delta = dur_b - dur_a
    sign = "+" if dur_delta >= 0 else ""
    lines.append(f"| Duration (ms) | {dur_a:,} | {dur_b:,} | {sign}{dur_delta:,} |")
    lines.append("")

    # ---- Homework Questions (comparison-specific) ----
    lines.append("## Homework Questions")
    lines.append("")
    lines.append("Auto-generated questions based on patterns detected in the comparison:")
    lines.append("")

    all_questions: List[str] = []

    # Run standard detectors on both runs
    for sid in common_scenarios:
        evals_a = data_a[sid].get("evaluations", {})
        evals_b = data_b[sid].get("evaluations", {})

        all_questions.extend(detect_hard_gate_questions(sid, evals_b))
        all_questions.extend(detect_consensus_questions(sid, evals_b))
        all_questions.extend(detect_personality_split_questions(sid, evals_b))
        all_questions.extend(
            detect_reference_mismatch_questions(sid, evals_b, data_b[sid])
        )

        # Comparison-specific: grounding shift detector
        # Build a comparison structure from the two runs
        comp_data: Dict[str, Dict[str, dict]] = {}
        for pid in ordered_pids:
            ev_a = evals_a.get(pid, {})
            ev_b = evals_b.get(pid, {})
            if "error" in ev_a or "error" in ev_b:
                continue

            pid_comp: Dict[str, dict] = {}
            for dim in DIMENSIONS:
                dim_label = DIMENSION_LABELS[dim]
                lvl_a = get_dimension_level(ev_a, dim)
                lvl_b = get_dimension_level(ev_b, dim)
                if lvl_a and lvl_b:
                    ord_a = LEVEL_ORDER.get(lvl_a, -1)
                    ord_b = LEVEL_ORDER.get(lvl_b, -1)
                    shift = ord_b - ord_a if ord_a >= 0 and ord_b >= 0 else 0
                    pid_comp[dim_label] = {
                        "run_a": lvl_a,
                        "run_b": lvl_b,
                        "shift": shift,
                        "changed": lvl_a != lvl_b,
                    }
            comp_data[pid] = pid_comp

        all_questions.extend(detect_grounding_shift_questions(sid, comp_data))

        # Reliability detector
        all_questions.extend(detect_reliability_questions(sid, evals_b))

    # Deduplicate
    seen = set()
    unique_questions = []
    for q in all_questions:
        if q not in seen:
            seen.add(q)
            unique_questions.append(q)

    if unique_questions:
        for i, q in enumerate(unique_questions, 1):
            lines.append(f"{i}. {q}")
            lines.append("")
    else:
        lines.append("No homework questions triggered by the detected patterns.")
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def resolve_run_id(conn: sqlite3.Connection, partial: str) -> str:
    """Resolve a partial run ID (prefix match) to a full run ID."""
    # Try exact match first
    row = conn.execute(
        "SELECT run_id FROM eval_runs WHERE run_id = ?", (partial,)
    ).fetchone()
    if row:
        return row["run_id"]

    # Try prefix match
    rows = conn.execute(
        "SELECT run_id FROM eval_runs WHERE run_id LIKE ?", (partial + "%",)
    ).fetchall()
    if len(rows) == 1:
        return rows[0]["run_id"]
    if len(rows) > 1:
        ids = [r["run_id"] for r in rows]
        raise SystemExit(
            f"Ambiguous run ID prefix '{partial}'. Matches:\n"
            + "\n".join(f"  {rid}" for rid in ids)
        )
    raise SystemExit(f"No run found matching: {partial}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate markdown reports from ARA-Eval results"
    )
    parser.add_argument(
        "run_id", nargs="?", help="Run ID (or prefix) to generate report for"
    )
    parser.add_argument(
        "--last", action="store_true", help="Use the most recent run"
    )
    parser.add_argument(
        "--compare", nargs=2, metavar=("ID1", "ID2"),
        help="Compare two runs side-by-side"
    )
    args = parser.parse_args()

    # Validate arguments
    if not args.last and not args.run_id and not args.compare:
        parser.print_help()
        raise SystemExit("\nError: specify --last, a run ID, or --compare <id1> <id2>")

    conn = get_db()

    if args.compare:
        # Comparison mode
        id1 = resolve_run_id(conn, args.compare[0])
        id2 = resolve_run_id(conn, args.compare[1])

        run_a = get_run(conn, id1)
        run_b = get_run(conn, id2)

        json_path_a = find_json_for_run(run_a)
        json_path_b = find_json_for_run(run_b)

        if not json_path_a:
            raise SystemExit(f"Could not find JSON result file for run {id1}")
        if not json_path_b:
            raise SystemExit(f"Could not find JSON result file for run {id2}")

        data_a = load_json_results(json_path_a)
        data_b = load_json_results(json_path_b)

        print(f"Run A: {id1}")
        print(f"  JSON: {json_path_a}")
        print(f"Run B: {id2}")
        print(f"  JSON: {json_path_b}")

        report = generate_comparison_report(run_a, data_a, run_b, data_b)

        short_a = id1[:8]
        short_b = id2[:8]
        report_dir = _get_report_dir()
        output_path = report_dir / f"report-compare-{short_a}-vs-{short_b}.md"

    else:
        # Single-run mode
        if args.last:
            run = get_latest_run(conn)
        else:
            rid = resolve_run_id(conn, args.run_id)
            run = get_run(conn, rid)

        run_id = run["run_id"]
        json_path = find_json_for_run(run)

        if not json_path:
            raise SystemExit(
                f"Could not find JSON result file for run {run_id}.\n"
                f"Looked in: {RESULTS_DIR}"
            )

        data = load_json_results(json_path)
        print(f"Run: {run_id}")
        print(f"JSON: {json_path}")

        report = generate_single_report(run, data)
        report_dir = _get_report_dir()
        output_path = report_dir / f"report-{run_id[:8]}.md"

    # Write report
    with open(output_path, "w") as f:
        f.write(report)

    print(f"\nReport written to: {output_path}")
    conn.close()


if __name__ == "__main__":
    main()
