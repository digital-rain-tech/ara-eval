#!/usr/bin/env python3
"""
Single script to publish the leaderboard from scored results.

Reads results/reference/leaderboard.json (scores) and results/reference/*/lab-01-*.json
(raw results for wall time), then writes:
  1. shared/leaderboard.json — source of truth for ara-eval-site
  2. README.md — updates the table between LEADERBOARD markers

Usage:
    python labs/publish-leaderboard.py              # update both files
    python labs/publish-leaderboard.py --check      # exit 1 if either is stale
    python labs/publish-leaderboard.py --dry-run    # print shared/leaderboard.json to stdout

New models need a MODEL_MAP entry below. Models in shared/leaderboard.json
that aren't in results (e.g. subagent runs scored separately) are preserved.
"""

from __future__ import annotations

import glob
import json
import sys
from datetime import date
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
RESULTS = _root / "results" / "reference" / "leaderboard.json"
RESULTS_DIR = _root / "results" / "reference"
SHARED = _root / "shared" / "leaderboard.json"
README = _root / "README.md"

START_MARKER = "<!-- LEADERBOARD:START -->"
END_MARKER = "<!-- LEADERBOARD:END -->"

# Map from results model ID → shared leaderboard metadata.
# Models not listed here will be skipped with a warning.
MODEL_MAP: dict[str, dict] = {
    "claude-opus-subagent": {
        "id": "claude-opus-4.6-subagent",
        "label": "Claude Opus 4.6",
        "method": "subagent",
        "method_note": "18 isolated subagent evaluations via lab-05 pipeline (no cross-scenario anchoring)",
        "is_default": False,
    },
    "claude-opus-analysis": {
        "id": "claude-opus-4.6-manual",
        "label": "Claude Opus 4.6",
        "method": "manual",
        "method_note": "Single-pass expert analysis with full document context",
        "is_default": False,
    },
    "claude-sonnet-subagent": {
        "id": "claude-sonnet-4.6-subagent",
        "label": "Claude Sonnet 4.6",
        "method": "subagent",
        "method_note": "18 isolated subagent evaluations via Claude Code Agent tool (no cross-scenario anchoring)",
        "is_default": False,
    },
    "claude-haiku-subagent": {
        "id": "claude-haiku-4.5-subagent",
        "label": "Claude Haiku 4.5",
        "method": "subagent",
        "method_note": "18 isolated subagent evaluations via Claude Code Agent tool \u2014 used wrong dimension names in 14/18 responses, 1 refusal, 1 cheat (read source files). Scored with non-compliant outputs treated as all-missed.",
        "is_default": False,
    },
    "gemini-2.5-flash-lite": {
        "id": "google/gemini-2.5-flash-lite-preview-09-2025",
        "label": "Gemini 2.5 Flash Lite",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios",
        "is_default": False,
    },
    "qwen3-235b": {
        "id": "qwen/qwen3-235b-a22b-2507",
        "label": "Qwen3 235B",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios",
        "is_default": False,
    },
    "grok-4.1-fast": {
        "id": "x-ai/grok-4.1-fast",
        "label": "Grok 4.1 Fast",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios",
        "is_default": False,
    },
    "minimax-m2.7": {
        "id": "minimax/minimax-m2.7",
        "label": "MiniMax M2.7",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios. Required max_tokens bump to 4096.",
        "is_default": False,
    },
    "claude-haiku-4.5-api": {
        "id": "anthropic/claude-haiku-4.5",
        "label": "Claude Haiku 4.5 (api)",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios. 39/39 calls successful. Retested after subagent run showed 8% F2 — dimension name compliance issue was subagent-specific.",
        "is_default": False,
    },
    "claude-3.5-haiku": {
        "id": "anthropic/claude-3.5-haiku",
        "label": "Claude Haiku 3.5",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios. 39/39 calls successful.",
        "is_default": False,
    },
    "deepseek-v4-flash": {
        "id": "deepseek/deepseek-v4-flash",
        "label": "DeepSeek V4 Flash",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios. 38/39 calls successful (1 timeout retry).",
        "is_default": False,
    },
    "deepseek-v3.2": {
        "id": "deepseek/deepseek-v3.2",
        "label": "DeepSeek v3.2",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios. 1 eval failed (missing graceful_degradation).",
        "is_default": False,
    },
    "openrouter-hunter-alpha": {
        "id": "openrouter/hunter-alpha",
        "label": "Hunter Alpha (1T, stealth)",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline",
        "is_default": False,
    },
    "openrouter-healer-alpha": {
        "id": "openrouter/healer-alpha",
        "label": "Healer Alpha (omni, stealth)",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline",
        "is_default": False,
    },
    "arcee-trinity-free": {
        "id": "arcee-ai/trinity-large-preview:free",
        "label": "Arcee Trinity (free)",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline",
        "is_default": True,
    },
    "google-gemma-4-26b-a4b-it-free": {
        "id": "google/gemma-4-26b-a4b-it:free",
        "label": "Gemma 4 26B A4B",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, 8/18 calls completed (heavy rate limiting)",
        "is_default": False,
    },
    "nvidia_nemotron-3-nano-omni-30b-a3b-reasoning_free": {
        "id": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        "label": "Nvidia Nemotron 3 Nano Omni 30B",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, 17/18 calls completed",
        "is_default": False,
    },
    "poolside_laguna-xs.2_free": {
        "id": "poolside/laguna-xs.2:free",
        "label": "Poolside Laguna XS 2",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, 18/18 calls completed",
        "is_default": False,
    },
    "gpt-5.4-nano": {
        "id": "openai/gpt-5.4-nano",
        "label": "GPT-5.4 Nano",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios",
        "is_default": False,
    },
    "qwen-qwen3.6-plus": {
        "id": "qwen/qwen3.6-plus",
        "label": "Qwen3.6 Plus",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios; wall time inflated by free-tier rate limiting — not directly comparable to other models",
        "is_default": False,
    },
    "baidu-cobuddy": {
        "id": "baidu/cobuddy:free",
        "label": "Baidu CoBuddy",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios, 39/39 calls completed",
        "is_default": False,
    },
    "tencent-hy3-preview": {
        "id": "tencent/hy3-preview:free",
        "label": "Tencent Hunyuan T1",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios, 37/39 calls completed (2 read timeouts). Very verbose (~9.5k tokens/response), required removing max_tokens cap.",
        "is_default": False,
    },
    "inclusionai-ring-2.6-1t": {
        "id": "inclusionai/ring-2.6-1t:free",
        "label": "InclusionAI Ring 2.6 1T",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios, 39/39 calls completed",
        "is_default": False,
    },
    "poolside-laguna-m.1": {
        "id": "poolside/laguna-m.1:free",
        "label": "Poolside Laguna M.1",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios, 39/39 calls completed",
        "is_default": False,
    },
}


def load_run_metadata() -> dict[str, dict]:
    """Extract wall_time_ms and total_cost_usd from raw lab-01 result files in results/reference/*/."""
    metadata: dict[str, dict] = {}
    for model_dir in RESULTS_DIR.iterdir():
        if not model_dir.is_dir():
            continue
        # Match both naming conventions: lab-01-*.json and *-lab-01.json
        result_files = list(model_dir.glob("lab-01-*.json")) + list(model_dir.glob("*-lab-01.json"))
        # Use the most recent file if multiple exist
        for result_file in sorted(result_files, reverse=True):
            try:
                data = json.loads(result_file.read_text())
                run = data.get("_run", {})
                wall_ms = run.get("wall_time_ms")
                cost = run.get("total_cost_usd")
                if wall_ms is not None or cost is not None:
                    metadata[model_dir.name] = {
                        "duration_seconds": round(wall_ms / 1000) if wall_ms is not None else None,
                        "cost_usd": cost,
                    }
                    break  # use most recent
            except (json.JSONDecodeError, KeyError):
                continue
    return metadata


def build_model_entry(score: dict, meta: dict, duration_seconds: int | None, cost_usd: float | None = None) -> dict:
    """Convert a results score entry + metadata into a shared leaderboard entry."""
    successful = score.get("successful", 0)
    total = score.get("total", 0)
    completion = f"{successful}/{total}" if total > 0 else "0/0"

    return {
        "id": meta["id"],
        "label": meta["label"],
        "method": meta["method"],
        "method_note": meta["method_note"],
        "completion": completion,
        "f2": round(score.get("gate_f2", 0), 2),
        "hard_gate_recall": round(score.get("hard_gate_recall", 0), 2),
        "hard_gate_precision": round(score.get("hard_gate_precision", 0), 2),
        "false_negatives": score.get("hard_gate_false_negatives", 0),
        "false_positives": score.get("hard_gate_false_positives", 0),
        "fingerprint_match": round(score.get("fingerprint_match_rate", 0), 2),
        "differentiation": round(score.get("personality_differentiation_rate", 0), 2),
        "bias": score.get("bias", "unknown"),
        "cost_per_eval": round(cost_usd, 4) if cost_usd is not None else None,
        "is_default": meta["is_default"],
        "eval_duration_seconds": duration_seconds,
    }


def sort_key(m: dict) -> tuple:
    """Sort: recall desc, precision desc, fingerprint desc."""
    return (
        -(m["hard_gate_recall"] or 0),
        -(m["hard_gate_precision"] or 0),
        -(m["fingerprint_match"] or 0),
    )


def generate_readme_table(data: dict) -> str:
    """Generate the markdown leaderboard table for README.md."""
    models = data["models"]
    last_updated = data["last_updated"]

    lines = []
    lines.append("| # | Model | Method | F2 | HG Recall | HG Precision | FP Match | Diff | Bias | Time |")
    lines.append("|---|-------|--------|---:|----------:|-------------:|--------:|-----:|------|-----:|")

    for i, m in enumerate(models, 1):
        f2 = f"**{m['f2']:.0%}**" if m["f2"] >= 0.95 else f"{m['f2']:.0%}"
        hg_rec = f"**{m['hard_gate_recall']:.0%}**" if m["hard_gate_recall"] >= 1.0 else f"{m['hard_gate_recall']:.0%}"
        hg_pre = f"**{m['hard_gate_precision']:.0%}**" if m["hard_gate_precision"] >= 1.0 else f"{m['hard_gate_precision']:.0%}"
        fp_match = f"{m['fingerprint_match']:.0%}"
        diff = f"{m['differentiation']:.0%}"
        bias = m["bias"].capitalize()
        dur = m.get("eval_duration_seconds")
        if dur is not None:
            time_str = f"{dur}s" if dur < 120 else f"{dur / 60:.1f}m"
        else:
            time_str = "\u2014"
        lines.append(f"| {i} | {m['label']} | {m.get('method', 'api')} | {f2} | {hg_rec} | {hg_pre} | {fp_match} | {diff} | {bias} | {time_str} |")

    lines.append("")
    lines.append(f"*{len(models)} models evaluated against human-authored reference fingerprints (6 core scenarios). Last updated: {last_updated}.*")
    lines.append("")
    lines.append(
        "**Metrics:** **F2** = F-beta (beta=2), weights recall 4x over precision. "
        "**HG Recall/Precision** = hard gate recall/precision (Reg=A, Blast=A gates only). "
        "**FP Match** = fingerprint match (exact dimension-level match vs reference). "
        "**Diff** = personality differentiation. "
        "**Bias** = Calibrated | Sleepy (misses risks) | Jittery (over-triggers) | Noisy (both). "
        "**Time** = wall-clock benchmark duration (39 calls)."
    )

    return "\n".join(lines)


def main():
    check_mode = "--check" in sys.argv
    dry_run = "--dry-run" in sys.argv

    if not RESULTS.exists():
        print(f"Error: {RESULTS} not found", file=sys.stderr)
        sys.exit(1)

    results = json.loads(RESULTS.read_text())
    scores = results.get("scores", [])
    run_metadata = load_run_metadata()

    # Read existing shared to preserve header/metadata and manually-added entries
    if SHARED.exists():
        shared = json.loads(SHARED.read_text())
    else:
        shared = {
            "last_updated": "",
            "gold_standard": "human-authored reference fingerprints (6 core scenarios)",
            "metrics": {},
            "bias_labels": {},
            "models": [],
        }

    # Build model entries from results
    synced_ids = set()
    models = []
    for score in scores:
        model_key = score["model"]
        if model_key not in MODEL_MAP:
            print(f"Warning: no MODEL_MAP entry for '{model_key}', skipping", file=sys.stderr)
            continue
        meta = MODEL_MAP[model_key]
        run_meta = run_metadata.get(model_key, {})
        duration = run_meta.get("duration_seconds")
        cost_usd = run_meta.get("cost_usd")
        entry = build_model_entry(score, meta, duration, cost_usd)
        models.append(entry)
        synced_ids.add(entry["id"])

    # Preserve existing shared entries not in results (e.g. subagent/manual runs)
    for existing in shared.get("models", []):
        if existing["id"] not in synced_ids:
            print(f"Preserving existing entry: {existing['label']} ({existing['method']})", file=sys.stderr)
            models.append(existing)

    models.sort(key=sort_key)

    shared["last_updated"] = date.today().isoformat()
    shared["models"] = models

    output = json.dumps(shared, indent=2, ensure_ascii=False) + "\n"

    if dry_run:
        print(output)
        return

    if check_mode:
        stale = False
        current = SHARED.read_text() if SHARED.exists() else ""
        if current.strip() != output.strip():
            print("shared/leaderboard.json is stale.")
            stale = True
        readme_text = README.read_text()
        table = generate_readme_table(shared)
        before = readme_text.split(START_MARKER)[0]
        after = readme_text.split(END_MARKER)[1]
        new_readme = f"{before}{START_MARKER}\n{table}\n{END_MARKER}{after}"
        if new_readme != readme_text:
            print("README.md leaderboard is stale.")
            stale = True
        if stale:
            print("Run: python labs/publish-leaderboard.py")
            sys.exit(1)
        print("Leaderboard is up to date.")
        return

    # Write shared/leaderboard.json
    SHARED.write_text(output)
    print(f"Updated {SHARED} ({len(models)} models)")

    # Update README.md
    readme_text = README.read_text()
    if START_MARKER not in readme_text or END_MARKER not in readme_text:
        print(f"WARNING: README.md missing {START_MARKER} / {END_MARKER} markers, skipping", file=sys.stderr)
    else:
        table = generate_readme_table(shared)
        before = readme_text.split(START_MARKER)[0]
        after = readme_text.split(END_MARKER)[1]
        README.write_text(f"{before}{START_MARKER}\n{table}\n{END_MARKER}{after}")
        print(f"Updated {README} leaderboard")


if __name__ == "__main__":
    main()
