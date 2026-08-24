#!/usr/bin/env python3
"""
Export every judge prompt the leaderboard has ever used.

Each leaderboard row carries a `prompt_version` fingerprint. This writes the
prompt text behind those fingerprints to shared/prompt-versions.json so the
public site can show a reader exactly what the judge read before it scored a
scenario.

Historical versions are reconstructed from git. Every commit that touched
prompts/ is checked out into a temp directory, composed, and hashed. Commits
that produce a fingerprint already seen are skipped, so the output holds one
entry per distinct prompt rather than one per commit.

Usage:
    python labs/export-prompt-versions.py            # write shared/prompt-versions.json
    python labs/export-prompt-versions.py --check    # exit 1 if the file is stale
    python labs/export-prompt-versions.py --dry-run  # print to stdout
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root))

import ara_eval.core as core  # noqa: E402

OUT = _root / "shared" / "prompt-versions.json"

# The board is scored on the HK jurisdiction with the default rubric of the day.
JURISDICTION = "hk"

# Short notes for the versions we know about. Anything not listed falls back to
# the commit subject.
NOTES = {
    "0c6a1b25d5ec": "Adds the Regulatory Exposure scope note (rubric-v2.md). Grades the decision rather than the subject matter.",
    "13caa7a42563": "Rebrand only. 'Agentic Readiness Assessment' became 'Agentic Risk Assessment'. No grading semantics changed.",
    "58cc76bbead7": "Dimension 4 renamed from Human Override Latency to Decision Time Pressure.",
}


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=_root, capture_output=True, text=True).stdout


def compose_at(prompts_dir: Path, rubric: str) -> tuple[str, dict] | None:
    """Compose the judge prompts from a checked-out prompts/ directory."""
    if not (prompts_dir / rubric).exists():
        return None
    original = core.PROMPTS_DIR
    try:
        core.PROMPTS_DIR = prompts_dir
        personalities = core.load_index("personalities")
        prompts = {
            pid: core.build_system_prompt(pid, JURISDICTION, rubric)
            for pid in sorted(personalities)
        }
        fingerprint = core.prompt_fingerprint(JURISDICTION, rubric)
        return fingerprint, prompts
    except Exception:
        return None
    finally:
        core.PROMPTS_DIR = original


def collect() -> dict:
    versions: dict[str, dict] = {}

    history = git("log", "--reverse", "--format=%H %ad %s", "--date=short", "--", "prompts/")
    for line in history.strip().splitlines():
        sha, day, subject = line.split(" ", 2)
        with tempfile.TemporaryDirectory() as td:
            subprocess.run(f"git archive {sha} prompts | tar -x -C {td}",
                           shell=True, cwd=_root, capture_output=True)
            composed = compose_at(Path(td) / "prompts", "rubric.md")
        if composed is None:
            continue
        fingerprint, prompts = composed
        if fingerprint in versions:
            continue
        versions[fingerprint] = {
            "fingerprint": fingerprint,
            "effective_from": day,
            "commit": sha[:8],
            "rubric_file": "rubric.md",
            "jurisdiction": JURISDICTION,
            "note": NOTES.get(fingerprint, subject),
            "prompts": prompts,
        }

    # Rubric variants that live alongside the default rather than replacing it.
    for rubric in sorted(p.name for p in (_root / "prompts").glob("rubric-*.md")):
        composed = compose_at(_root / "prompts", rubric)
        if composed is None:
            continue
        fingerprint, prompts = composed
        if fingerprint in versions:
            continue
        versions[fingerprint] = {
            "fingerprint": fingerprint,
            "effective_from": date.today().isoformat(),
            "commit": git("rev-parse", "--short=8", "HEAD").strip(),
            "rubric_file": rubric,
            "jurisdiction": JURISDICTION,
            "note": NOTES.get(fingerprint, f"Rubric variant {rubric}"),
            "prompts": prompts,
        }

    ordered = dict(sorted(versions.items(), key=lambda kv: (kv[1]["effective_from"], kv[1]["commit"])))
    return {
        "description": (
            "Judge prompts behind every leaderboard score. Match a leaderboard row's "
            "prompt_version to a key here to read exactly what the judge saw. "
            "A rubric filename is not a version: rubric.md has held several different "
            "texts, so scores are grouped by a hash of the composed prompt instead."
        ),
        "jurisdiction": JURISDICTION,
        "personalities": ["compliance_officer", "cro", "operations_director"],
        "versions": ordered,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="exit 1 if the file is stale")
    parser.add_argument("--dry-run", action="store_true", help="print to stdout")
    args = parser.parse_args()

    output = json.dumps(collect(), indent=2, ensure_ascii=False) + "\n"

    if args.dry_run:
        print(output)
        return

    if args.check:
        current = OUT.read_text() if OUT.exists() else ""
        if current.strip() != output.strip():
            print("shared/prompt-versions.json is stale.")
            print("Run: python labs/export-prompt-versions.py")
            sys.exit(1)
        print("shared/prompt-versions.json is up to date.")
        return

    OUT.write_text(output)
    data = json.loads(output)
    print(f"Wrote {OUT} ({len(data['versions'])} prompt versions)")
    for fp, v in data["versions"].items():
        chars = sum(len(p) for p in v["prompts"].values())
        print(f"  {fp}  {v['effective_from']}  {v['rubric_file']:16} {chars:>6} chars  {v['note'][:52]}")


if __name__ == "__main__":
    main()
