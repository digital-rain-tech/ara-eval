"""
Update the leaderboard table in README.md from shared/leaderboard.json.

Usage:
    python labs/update-readme-leaderboard.py          # update README.md in place
    python labs/update-readme-leaderboard.py --check   # exit 1 if README is stale

The script looks for markers in README.md:
    <!-- LEADERBOARD:START -->
    <!-- LEADERBOARD:END -->

Everything between them is replaced with the generated table.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
README = _root / "README.md"
LEADERBOARD = _root / "shared" / "leaderboard.json"

START_MARKER = "<!-- LEADERBOARD:START -->"
END_MARKER = "<!-- LEADERBOARD:END -->"


def generate_table(data: dict) -> str:
    models = data["models"]
    last_updated = data["last_updated"]

    lines = []
    lines.append(f"| # | Model | Method | F2 | HG Recall | HG Precision | FP Match | Diff | Bias | Time |")
    lines.append(f"|---|-------|--------|---:|----------:|-------------:|--------:|-----:|------|-----:|")

    for i, m in enumerate(models, 1):
        label = m["label"]
        method = m.get("method", "api")
        f2 = f"**{m['f2']:.0%}**" if m["f2"] >= 0.95 else f"{m['f2']:.0%}"
        hg_rec = f"**{m['hard_gate_recall']:.0%}**" if m["hard_gate_recall"] >= 1.0 else f"{m['hard_gate_recall']:.0%}"
        hg_pre = f"**{m['hard_gate_precision']:.0%}**" if m["hard_gate_precision"] >= 1.0 else f"{m['hard_gate_precision']:.0%}"
        fp_match = f"{m['fingerprint_match']:.0%}"
        diff = f"{m['differentiation']:.0%}"
        bias = m["bias"].capitalize()
        dur = m.get("eval_duration_seconds")
        if dur is not None:
            if dur < 120:
                time_str = f"{dur}s"
            else:
                time_str = f"{dur / 60:.1f}m"
        else:
            time_str = "—"
        lines.append(f"| {i} | {label} | {method} | {f2} | {hg_rec} | {hg_pre} | {fp_match} | {diff} | {bias} | {time_str} |")

    lines.append("")
    lines.append(f"*{len(models)} models evaluated against human-authored reference fingerprints (6 core scenarios). Last updated: {last_updated}.*")
    lines.append("")
    lines.append("**Metrics:** **F2** = F-beta (beta=2), weights recall 4x over precision. "
                 "**HG Recall/Precision** = hard gate recall/precision (Reg=A, Blast=A gates only). "
                 "**FP Match** = fingerprint match (exact dimension-level match vs reference). "
                 "**Diff** = personality differentiation. "
                 "**Bias** = Calibrated | Sleepy (misses risks) | Jittery (over-triggers) | Noisy (both). "
                 "**Time** = wall-clock benchmark duration (39 calls).")

    return "\n".join(lines)


def main():
    check_only = "--check" in sys.argv

    with open(LEADERBOARD) as f:
        data = json.load(f)

    table = generate_table(data)

    readme_text = README.read_text()

    if START_MARKER not in readme_text or END_MARKER not in readme_text:
        print(f"ERROR: README.md missing {START_MARKER} / {END_MARKER} markers")
        sys.exit(1)

    before = readme_text.split(START_MARKER)[0]
    after = readme_text.split(END_MARKER)[1]

    new_readme = f"{before}{START_MARKER}\n{table}\n{END_MARKER}{after}"

    if check_only:
        if new_readme != readme_text:
            print("README.md leaderboard is stale. Run: python labs/update-readme-leaderboard.py")
            sys.exit(1)
        else:
            print("README.md leaderboard is up to date.")
            sys.exit(0)

    README.write_text(new_readme)
    print(f"Updated README.md leaderboard ({len(data['models'])} models)")


if __name__ == "__main__":
    main()
