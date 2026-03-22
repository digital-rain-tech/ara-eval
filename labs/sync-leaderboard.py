#!/usr/bin/env python3
"""
Sync results/reference/leaderboard.json → shared/leaderboard.json.

Reads scored results, maps them to the shared leaderboard format using
MODEL_MAP for display labels and metadata, and writes the sorted output.

Usage:
    python labs/sync-leaderboard.py              # update shared/leaderboard.json
    python labs/sync-leaderboard.py --check      # exit 1 if shared is stale
    python labs/sync-leaderboard.py --dry-run    # print to stdout without writing

After running, also run:
    python labs/update-readme-leaderboard.py     # update README.md table
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
RESULTS = _root / "results" / "reference" / "leaderboard.json"
SHARED = _root / "shared" / "leaderboard.json"

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
    "gpt-5.4-nano": {
        "id": "openai/gpt-5.4-nano",
        "label": "GPT-5.4 Nano",
        "method": "api",
        "method_note": "OpenRouter API via lab-01 pipeline, structured prompts, 13 scenarios",
        "is_default": False,
    },
}


def build_model_entry(score: dict, meta: dict) -> dict:
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
        "cost_per_eval": score.get("cost_per_eval", None),
        "is_default": meta["is_default"],
        "eval_duration_seconds": score.get("eval_duration_seconds", None),
    }


def sort_key(m: dict) -> tuple:
    """Sort: recall desc, precision desc, fingerprint desc."""
    return (
        -(m["hard_gate_recall"] or 0),
        -(m["hard_gate_precision"] or 0),
        -(m["fingerprint_match"] or 0),
    )


def main():
    check_mode = "--check" in sys.argv
    dry_run = "--dry-run" in sys.argv

    if not RESULTS.exists():
        print(f"Error: {RESULTS} not found", file=sys.stderr)
        sys.exit(1)

    results = json.loads(RESULTS.read_text())
    scores = results.get("scores", [])

    # Read existing shared to preserve header/metadata
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
        entry = build_model_entry(score, meta)
        models.append(entry)
        synced_ids.add(entry["id"])

    # Preserve existing shared entries not in results (e.g. subagent/manual runs
    # scored separately and added directly to shared/leaderboard.json)
    for existing in shared.get("models", []):
        if existing["id"] not in synced_ids:
            print(f"Preserving existing entry: {existing['label']} ({existing['method']})", file=sys.stderr)
            models.append(existing)

    models.sort(key=sort_key)

    # Update shared
    from datetime import date
    shared["last_updated"] = date.today().isoformat()
    shared["models"] = models

    output = json.dumps(shared, indent=2, ensure_ascii=False) + "\n"

    if dry_run:
        print(output)
        return

    if check_mode:
        current = SHARED.read_text() if SHARED.exists() else ""
        if current.strip() != output.strip():
            print("shared/leaderboard.json is stale. Run: python labs/sync-leaderboard.py")
            sys.exit(1)
        else:
            print("shared/leaderboard.json is up to date.")
            return

    SHARED.write_text(output)
    print(f"Updated {SHARED} with {len(models)} models.")


if __name__ == "__main__":
    main()
