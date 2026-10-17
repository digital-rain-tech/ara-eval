"""Tests for labs/export-calls.py (DB -> committed calls.jsonl)."""

from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path

os.environ.setdefault("OPENROUTER_API_KEY", "test-key-for-testing")

from ara_eval.core import init_db, log_request  # noqa: E402

_root = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("export_calls", _root / "labs" / "export-calls.py")
export_calls = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(export_calls)


def _log(conn, run_id, error=None, request=None):
    log_request(
        conn, run_id=run_id, request_id=f"r-{error}", scenario_id="s1", personality="cro",
        response_status=429 if error else 200, error_message=error,
        input_tokens=None if error else 10, output_tokens=None if error else 5,
        total_tokens=None if error else 15, cost_usd=None if error else 0.001,
        response_time_ms=123, model_used=None if error else "m", actual_provider=None,
        fingerprint_string=None if error else "C-C-C-C-C-C-C", gating_classification=None,
        gating_rules_triggered=None, raw_request=request or {"model": "m", "messages": []},
        raw_response=None if error else {"choices": [{"message": {"content": "{}"}}]},
        parsed_result=None, openrouter_id=None, system_fingerprint=None,
        jurisdiction="hk", rubric="rubric.md",
    )


def _setup(tmp_path):
    db = tmp_path / "ara-eval.db"
    conn = init_db(db)
    conn.execute(
        "INSERT INTO eval_runs (run_id, started_at, model_requested, scenario_count, personality_count, total_calls) VALUES (?,?,?,?,?,?)",
        ("run-1", "2026-10-18T00:00:00Z", "m", 1, 1, 1),
    )
    _log(conn, "run-1", error="429 Too Many Requests")
    _log(conn, "run-1", request={"model": "m", "messages": [{"role": "user", "content": "key sk-or-v1-abcdef0123456789"}], "api_key": "x"})
    conn.commit()
    ref = tmp_path / "reference" / "m"
    ref.mkdir(parents=True)
    (ref / "lab-01-m-20261018-000000.json").write_text(json.dumps({"_run": {"run_id": "run-1", "wall_time_ms": 1}}))
    return db, ref


def test_exports_every_attempt_with_retry_numbering(tmp_path):
    db, ref = _setup(tmp_path)
    rc = export_calls.main(["--db", str(db), "--reference-dir", str(ref.parent)])
    assert rc == 0
    lines = [json.loads(line) for line in (ref / "calls.jsonl").read_text().splitlines()]
    assert len(lines) == 2
    failed, ok = lines
    assert failed["attempt"] == 1 and not failed["succeeded"] and failed["error_message"]
    assert ok["attempt"] == 2 and ok["succeeded"] and ok["retries_before_success"] == 1
    assert ok["raw_response"]["choices"][0]["message"]["content"] == "{}"
    assert ok["response_time_ms"] == 123 and ok["cost_usd"] == 0.001 and ok["input_tokens"] == 10


def test_scrubs_keys_and_key_shaped_strings(tmp_path):
    db, ref = _setup(tmp_path)
    export_calls.main(["--db", str(db), "--reference-dir", str(ref.parent)])
    text = (ref / "calls.jsonl").read_text()
    assert "sk-or-v1-abcdef" not in text
    assert "[REDACTED]" in text
    assert '"api_key"' not in text


def test_check_detects_stale(tmp_path):
    db, ref = _setup(tmp_path)
    args = ["--db", str(db), "--reference-dir", str(ref.parent)]
    assert export_calls.main(args + ["--check"]) == 1
    export_calls.main(args)
    assert export_calls.main(args + ["--check"]) == 0
