"""Tests for labs/publish-leaderboard.py timing derivation."""

import importlib.util
import json
from pathlib import Path

_path = Path(__file__).resolve().parent.parent / "labs" / "publish-leaderboard.py"
_spec = importlib.util.spec_from_file_location("publish_leaderboard", _path)
pl = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pl)


def _write(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data))


def test_orchestration_window_from_manifest_and_assembly(tmp_path):
    _write(tmp_path / "manifest.json", {"created_at": "2026-03-21T15:35:24.761947+00:00"})
    _write(tmp_path / "2026-03-21-lab-01-subagent.json",
           {"_run": {"assembled_at": "2026-03-21T15:38:24.024589+00:00"}})
    assert pl.subagent_orchestration_window(tmp_path) == 179


def test_orchestration_window_none_without_manifest(tmp_path):
    _write(tmp_path / "2026-03-21-lab-01-manual.json", {"_run": {"date": "2026-03-21"}})
    assert pl.subagent_orchestration_window(tmp_path) is None


def test_orchestration_window_rejects_assembly_before_dispatch(tmp_path):
    _write(tmp_path / "manifest.json", {"created_at": "2026-03-21T15:38:00+00:00"})
    _write(tmp_path / "2026-03-21-lab-01-subagent.json",
           {"_run": {"assembled_at": "2026-03-21T15:00:00+00:00"}})
    assert pl.subagent_orchestration_window(tmp_path) is None


def test_window_never_lands_in_eval_duration():
    meta = {"id": "x", "label": "X", "method": "subagent", "method_note": "", "is_default": False}
    entry = pl.build_model_entry({"total": 18, "successful": 18}, meta, None,
                                 orchestration_window_seconds=179)
    assert entry["eval_duration_seconds"] is None
    assert entry["orchestration_window_seconds"] == 179
    plain = pl.build_model_entry({"total": 39, "successful": 39}, meta, 8)
    assert "orchestration_window_seconds" not in plain
