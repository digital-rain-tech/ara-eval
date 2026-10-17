#!/usr/bin/env python3
"""
Export every provider call of a lab-01 run from results/ara-eval.db to JSONL.

results/ara-eval.db is gitignored, so the raw prompts and responses behind a
leaderboard row would otherwise live only on the machine that ran it. This
writes them next to the reference result as results/reference/<model>/calls.jsonl
(commit with `git add -f`, like the reference JSON).

One line per HTTP attempt, oldest first. A retried eval shows up as several
lines for the same scenario/personality: failed attempts carry error_message,
and `attempt` / `retries_before_success` number them.

Secrets: the DB never stores headers, but every value is scrubbed anyway —
auth-like keys are dropped and anything shaped like an API key or bearer token
is redacted.

Usage:
    python labs/export-calls.py                      # every reference dir whose run is in the DB
    python labs/export-calls.py typesafe-jev-1.14    # just these reference dirs
    python labs/export-calls.py --check              # exit 1 if any calls.jsonl is missing or stale
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
DB_PATH = _root / "results" / "ara-eval.db"
REFERENCE_DIR = _root / "results" / "reference"
OUTPUT_NAME = "calls.jsonl"

JSON_COLUMNS = ("raw_request", "raw_response", "parsed_result", "gating_rules_triggered")
COLUMNS = (
    "created_at", "run_id", "request_id", "model_requested", "model_used", "actual_provider",
    "scenario_id", "personality", "jurisdiction", "rubric", "response_status", "error_message",
    "input_tokens", "output_tokens", "total_tokens", "cost_usd", "response_time_ms",
    "fingerprint_string", "gating_classification", "gating_rules_triggered",
    "openrouter_id", "system_fingerprint", "raw_request", "raw_response", "parsed_result",
)

_SECRET_KEY = re.compile(r"^(authorization|api[-_]?key|x-api-key|openrouter_api_key|token|access_token|bearer)$", re.I)
_SECRET_VALUE = re.compile(r"(sk-or-v1-[A-Za-z0-9]+|sk-[A-Za-z0-9_\-]{20,}|Bearer\s+[A-Za-z0-9._\-]{16,})")


def scrub(value):
    """Drop auth-like keys and redact key/token-shaped strings, recursively."""
    if isinstance(value, dict):
        return {k: scrub(v) for k, v in value.items() if not _SECRET_KEY.match(str(k))}
    if isinstance(value, list):
        return [scrub(v) for v in value]
    if isinstance(value, str):
        return _SECRET_VALUE.sub("[REDACTED]", value)
    return value


def _decode(text):
    if text is None:
        return None
    try:
        return json.loads(text)
    except (TypeError, ValueError):
        return text


def export_run(conn: sqlite3.Connection, run_id: str) -> list[dict]:
    """All attempts of one run, oldest first, with attempt numbering per eval."""
    rows = conn.execute(
        f"SELECT {', '.join(COLUMNS)} FROM ai_provider_requests WHERE run_id = ? ORDER BY created_at, rowid",
        (run_id,),
    ).fetchall()
    attempts: dict[tuple, int] = {}
    records = []
    for row in rows:
        rec = dict(zip(COLUMNS, row))
        for col in JSON_COLUMNS:
            rec[col] = _decode(rec[col])
        key = (rec["scenario_id"], rec["personality"])
        attempts[key] = attempts.get(key, 0) + 1
        rec["attempt"] = attempts[key]
        rec["succeeded"] = rec["error_message"] is None
        rec["retries_before_success"] = attempts[key] - 1 if rec["succeeded"] else None
        records.append(scrub(rec))
    return records


def run_id_for(model_dir: Path) -> str | None:
    """run_id of the newest lab-01 result in a reference dir."""
    files = sorted(list(model_dir.glob("lab-01-*.json")) + list(model_dir.glob("*-lab-01.json")), reverse=True)
    for f in files:
        try:
            run = json.loads(f.read_text()).get("_run", {})
        except (ValueError, OSError):
            continue
        if run.get("run_id"):
            return run["run_id"]
    return None


def render(records: list[dict]) -> str:
    return "".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n" for r in records)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("models", nargs="*", help="Reference dir names (default: all with a run in the DB)")
    parser.add_argument("--db", type=Path, default=DB_PATH)
    parser.add_argument("--reference-dir", type=Path, default=REFERENCE_DIR)
    parser.add_argument("--check", action="store_true", help="Exit 1 if any export is missing or stale")
    args = parser.parse_args(argv)

    if not args.db.exists():
        print(f"No DB at {args.db}", file=sys.stderr)
        return 1
    conn = sqlite3.connect(str(args.db))
    dirs = [args.reference_dir / m for m in args.models] if args.models else sorted(
        d for d in args.reference_dir.iterdir() if d.is_dir()
    )
    stale = 0
    for d in dirs:
        run_id = run_id_for(d)
        if not run_id:
            if args.models:
                print(f"{d.name}: no lab-01 result with a run_id", file=sys.stderr)
            continue
        records = export_run(conn, run_id)
        if not records:
            if args.models:
                print(f"{d.name}: run {run_id} not in {args.db.name}", file=sys.stderr)
            continue
        out = d / OUTPUT_NAME
        text = render(records)
        ok = sum(r["succeeded"] for r in records)
        if args.check:
            if not out.exists() or out.read_text() != text:
                print(f"{d.name}: {OUTPUT_NAME} missing or stale")
                stale += 1
            continue
        out.write_text(text)
        print(f"{d.name}: {len(records)} attempts ({ok} succeeded) -> {out.relative_to(_root) if out.is_relative_to(_root) else out}")
    return 1 if stale else 0


if __name__ == "__main__":
    sys.exit(main())
