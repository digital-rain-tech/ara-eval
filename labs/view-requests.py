"""
ARA-Eval Request Viewer
=======================

Browse eval runs and request logs stored in results/ara-eval.db.

Usage:
    python labs/view-requests.py                  # list all runs
    python labs/view-requests.py <run_id>          # show requests for a run
    python labs/view-requests.py --last            # show requests for most recent run
    python labs/view-requests.py --stats           # aggregate stats across all runs
    python labs/view-requests.py detail <id>       # show full detail for one request (partial ID ok)
"""

from __future__ import annotations

import json
import sqlite3
import sys
import textwrap
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "results" / "ara-eval.db"


def connect():
    if not DB_PATH.exists():
        print(f"No database found at {DB_PATH}")
        print("Run lab-01-risk-fingerprinting.py first.")
        sys.exit(1)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


# ---------------------------------------------------------------------------
# List runs
# ---------------------------------------------------------------------------

def list_runs(conn: sqlite3.Connection):
    rows = conn.execute("""
        SELECT run_id, started_at, finished_at, model_requested,
               scenario_count, personality_count, total_calls,
               successful_calls, failed_calls,
               total_input_tokens, total_output_tokens,
               total_cost_usd, total_duration_ms
        FROM eval_runs
        ORDER BY started_at DESC
    """).fetchall()

    if not rows:
        print("No runs found.")
        return

    print(f"\n{'='*90}")
    print(f"  {'RUN ID':<38} {'MODEL':<32} {'CALLS':>7} {'TOKENS':>10} {'COST':>10} {'TIME':>8}")
    print(f"{'='*90}")

    for r in rows:
        ok = r["successful_calls"] or 0
        fail = r["failed_calls"] or 0
        calls = f"{ok}/{ok+fail}"
        tokens = f"{(r['total_input_tokens'] or 0) + (r['total_output_tokens'] or 0):,}"
        cost = f"${r['total_cost_usd'] or 0:.6f}"
        duration = f"{(r['total_duration_ms'] or 0)/1000:.1f}s"
        model = (r["model_requested"] or "")[:31]

        print(f"  {r['run_id']:<38} {model:<32} {calls:>7} {tokens:>10} {cost:>10} {duration:>8}")
        print(f"    Started: {r['started_at'] or '?'}")

    print()


# ---------------------------------------------------------------------------
# Show requests for a run
# ---------------------------------------------------------------------------

def show_run(conn: sqlite3.Connection, run_id: str):
    # Run summary
    run = conn.execute("SELECT * FROM eval_runs WHERE run_id = ?", (run_id,)).fetchone()
    if not run:
        print(f"Run {run_id} not found.")
        return

    print(f"\n{'='*100}")
    print(f"  RUN: {run_id}")
    print(f"  Model: {run['model_requested']}")
    print(f"  Started: {run['started_at']}  Finished: {run['finished_at'] or 'in progress'}")
    print(f"  Calls: {run['successful_calls']}/{run['total_calls']}  "
          f"Tokens: {(run['total_input_tokens'] or 0):,} in / {(run['total_output_tokens'] or 0):,} out  "
          f"Cost: ${run['total_cost_usd'] or 0:.6f}  "
          f"Time: {(run['total_duration_ms'] or 0)/1000:.1f}s")
    print(f"{'='*100}")

    # Requests
    rows = conn.execute("""
        SELECT id, scenario_id, personality, model_used, actual_provider,
               input_tokens, output_tokens, cost_usd, response_time_ms,
               fingerprint_string, gating_classification,
               response_status, error_message
        FROM ai_provider_requests
        WHERE run_id = ?
        ORDER BY created_at
    """, (run_id,)).fetchall()

    if not rows:
        print("  No requests found for this run.")
        return

    print(f"\n  {'#':<3} {'SCENARIO':<35} {'PERSONALITY':<22} {'FINGERPRINT':<16} {'CLASSIFICATION':<28} {'TOKENS':>7} {'COST':>10} {'MS':>6} {'PROVIDER':<12}")
    print(f"  {'-'*3} {'-'*35} {'-'*22} {'-'*16} {'-'*28} {'-'*7} {'-'*10} {'-'*6} {'-'*12}")

    for i, r in enumerate(rows, 1):
        if r["error_message"]:
            fp = "ERROR"
            cls = r["error_message"][:27]
        else:
            fp = r["fingerprint_string"] or "?"
            cls = (r["gating_classification"] or "?").replace("_", " ")

        tokens = f"{(r['input_tokens'] or 0) + (r['output_tokens'] or 0):,}"
        cost = f"${r['cost_usd']:.6f}" if r["cost_usd"] is not None else "-"
        ms = str(r["response_time_ms"] or "-")
        provider = (r["actual_provider"] or "-")[:11]
        scenario = (r["scenario_id"] or "?")[:34]
        personality = (r["personality"] or "?")[:21]

        print(f"  {i:<3} {scenario:<35} {personality:<22} {fp:<16} {cls:<28} {tokens:>7} {cost:>10} {ms:>6} {provider:<12}")

    # Per-scenario summary
    print(f"\n  PER-SCENARIO FINGERPRINTS:")
    scenarios = {}
    for r in rows:
        sid = r["scenario_id"]
        if sid not in scenarios:
            scenarios[sid] = {}
        scenarios[sid][r["personality"]] = r["fingerprint_string"] or "ERROR"

    for sid, personalities in scenarios.items():
        print(f"\n    {sid}:")
        for p, fp in personalities.items():
            print(f"      {p:<22} {fp}")

    print()


# ---------------------------------------------------------------------------
# Show full detail for one request
# ---------------------------------------------------------------------------

def show_detail(conn: sqlite3.Connection, request_id: str):
    # Support partial ID match
    row = conn.execute(
        "SELECT * FROM ai_provider_requests WHERE id = ? OR id LIKE ?",
        (request_id, f"{request_id}%"),
    ).fetchone()

    if not row:
        print(f"Request {request_id} not found.")
        return

    print(f"\n{'='*80}")
    print(f"  REQUEST DETAIL")
    print(f"{'='*80}")
    print(f"  ID:              {row['id']}")
    print(f"  Run ID:          {row['run_id']}")
    print(f"  Created:         {row['created_at']}")
    print(f"  Scenario:        {row['scenario_id']}")
    print(f"  Personality:     {row['personality']}")
    print(f"  Model requested: {row['model_requested']}")
    print(f"  Model used:      {row['model_used'] or '-'}")
    print(f"  Provider:        {row['actual_provider'] or '-'}")
    print(f"  OpenRouter ID:   {row['openrouter_id'] or '-'}")
    print(f"  Status:          {row['response_status'] or '-'}")
    print(f"  Latency:         {row['response_time_ms']}ms")
    print(f"  Tokens:          {row['input_tokens'] or '-'} in / {row['output_tokens'] or '-'} out / {row['total_tokens'] or '-'} total")
    print(f"  Cost:            ${row['cost_usd']:.6f}" if row['cost_usd'] is not None else "  Cost:            -")
    print(f"  Fingerprint:     {row['fingerprint_string'] or '-'}")
    print(f"  Classification:  {(row['gating_classification'] or '-').replace('_', ' ')}")

    if row["gating_rules_triggered"]:
        rules = json.loads(row["gating_rules_triggered"])
        if rules:
            print(f"  Gating rules:")
            for rule in rules:
                print(f"    -> {rule}")

    if row["error_message"]:
        print(f"\n  ERROR: {row['error_message']}")

    if row["parsed_result"]:
        parsed = json.loads(row["parsed_result"])
        print(f"\n  PARSED RESULT:")
        print(textwrap.indent(json.dumps(parsed, indent=2), "    "))

    if row["raw_request"]:
        req = json.loads(row["raw_request"])
        # Show messages without the full rubric (too long)
        print(f"\n  REQUEST MESSAGES:")
        for msg in req.get("messages", []):
            role = msg["role"]
            content = msg["content"]
            if len(content) > 200:
                content = content[:200] + f"... ({len(content)} chars)"
            print(f"    [{role}] {content}")

    if row["raw_response"]:
        resp = json.loads(row["raw_response"])
        # Show response content and usage, skip the full structure
        content = resp.get("choices", [{}])[0].get("message", {}).get("content", "")
        print(f"\n  RESPONSE CONTENT:")
        print(textwrap.indent(content, "    "))

        usage = resp.get("usage", {})
        if usage:
            print(f"\n  USAGE (raw):")
            print(textwrap.indent(json.dumps(usage, indent=2), "    "))

    print()


# ---------------------------------------------------------------------------
# Aggregate stats
# ---------------------------------------------------------------------------

def show_stats(conn: sqlite3.Connection):
    runs = conn.execute("SELECT COUNT(*) as c FROM eval_runs").fetchone()["c"]
    reqs = conn.execute("SELECT COUNT(*) as c FROM ai_provider_requests").fetchone()["c"]

    print(f"\n{'='*70}")
    print(f"  AGGREGATE STATS")
    print(f"{'='*70}")
    print(f"  Total runs:     {runs}")
    print(f"  Total requests: {reqs}")

    # By model
    print(f"\n  BY MODEL:")
    for row in conn.execute("""
        SELECT model_used, COUNT(*) as calls,
               SUM(input_tokens) as inp, SUM(output_tokens) as out,
               SUM(cost_usd) as cost, AVG(response_time_ms) as avg_ms
        FROM ai_provider_requests
        WHERE error_message IS NULL
        GROUP BY model_used
        ORDER BY calls DESC
    """):
        print(f"    {row['model_used'] or '?':<40} {row['calls']:>4} calls  "
              f"{(row['inp'] or 0)+(row['out'] or 0):>8,} tokens  "
              f"${row['cost'] or 0:.6f}  "
              f"avg {row['avg_ms'] or 0:.0f}ms")

    # By provider
    print(f"\n  BY PROVIDER:")
    for row in conn.execute("""
        SELECT actual_provider, COUNT(*) as calls, AVG(response_time_ms) as avg_ms
        FROM ai_provider_requests
        WHERE error_message IS NULL
        GROUP BY actual_provider
        ORDER BY calls DESC
    """):
        print(f"    {row['actual_provider'] or '?':<25} {row['calls']:>4} calls  avg {row['avg_ms'] or 0:.0f}ms")

    # By scenario
    print(f"\n  BY SCENARIO:")
    for row in conn.execute("""
        SELECT scenario_id, COUNT(*) as calls,
               GROUP_CONCAT(DISTINCT gating_classification) as classifications
        FROM ai_provider_requests
        WHERE error_message IS NULL
        GROUP BY scenario_id
    """):
        cls = (row["classifications"] or "").replace("_", " ")
        print(f"    {row['scenario_id'] or '?':<40} {row['calls']:>3} calls  [{cls}]")

    # Errors
    errs = conn.execute(
        "SELECT COUNT(*) as c FROM ai_provider_requests WHERE error_message IS NOT NULL"
    ).fetchone()["c"]
    if errs:
        print(f"\n  ERRORS: {errs}")
        for row in conn.execute("""
            SELECT scenario_id, personality, error_message
            FROM ai_provider_requests
            WHERE error_message IS NOT NULL
            LIMIT 10
        """):
            print(f"    {row['scenario_id']}/{row['personality']}: {row['error_message'][:80]}")

    print()


# ---------------------------------------------------------------------------
# Resolve --last to most recent run_id
# ---------------------------------------------------------------------------

def get_last_run_id(conn: sqlite3.Connection) -> str:
    row = conn.execute(
        "SELECT run_id FROM eval_runs ORDER BY started_at DESC LIMIT 1"
    ).fetchone()
    if not row:
        print("No runs found.")
        sys.exit(1)
    return row["run_id"]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    conn = connect()
    args = sys.argv[1:]

    if not args:
        list_runs(conn)
    elif args[0] == "--stats":
        show_stats(conn)
    elif args[0] == "--last":
        run_id = get_last_run_id(conn)
        show_run(conn, run_id)
    elif args[0] == "detail" and len(args) > 1:
        show_detail(conn, args[1])
    elif len(args) == 1:
        show_run(conn, args[0])
    else:
        print(__doc__)

    conn.close()


if __name__ == "__main__":
    main()
