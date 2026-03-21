"""
ARA-Eval Lab 05: Subagent Dispatcher
=====================================

Reads a manifest from lab-05-subagent-evaluation.py and dispatches
evaluations as Claude Code subagents. Designed to be run from within
a Claude Code session.

This script outputs the Agent tool calls needed to dispatch all
evaluations in the manifest. It can be used in two ways:

1. Run it to print the dispatch commands:
   python labs/lab-05-dispatch.py <run-id>

2. Use it as a library from within Claude Code:
   from labs.lab_05_dispatch import load_manifest, dispatch_prompt

Usage from Claude Code session:
    The main workflow is:
    1. Generate manifest:  python labs/lab-05-subagent-evaluation.py [options]
    2. Dispatch subagents: Use this script's output or call dispatch functions
    3. Assemble results:   python labs/lab-05-subagent-evaluation.py --assemble <run-id>
    4. Score:              Copy assembled results and run lab-04
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_root = Path(__file__).parent.parent
RESULTS_DIR = _root / "results" / "subagent-runs"


def load_manifest(run_id: str) -> dict:
    """Load a dispatch manifest."""
    manifest_path = RESULTS_DIR / run_id / "manifest.json"
    with open(manifest_path) as f:
        return json.load(f)


def dispatch_prompt(entry: dict, run_dir: Path) -> str:
    """Build the full subagent dispatch prompt for one evaluation."""
    output_path = run_dir / entry["output_file"]

    return (
        f"You are an ARA-Eval judge. Evaluate the scenario below and write "
        f"ONLY the JSON result to: {output_path}\n\n"
        f"Use the /ara-evaluate command context. Here is your evaluation input:\n\n"
        f"{entry['prompt']}\n\n"
        f"Write the JSON result (dimensions + interpretation) to {output_path}. "
        f"No commentary, no markdown — just the JSON file."
    )


def main():
    if len(sys.argv) < 2:
        # Find most recent run
        if not RESULTS_DIR.exists():
            print("No subagent runs found. Run lab-05-subagent-evaluation.py first.")
            sys.exit(1)
        runs = sorted(RESULTS_DIR.iterdir())
        if not runs:
            print("No subagent runs found.")
            sys.exit(1)
        run_id = runs[-1].name
        print(f"Using most recent run: {run_id}")
    else:
        run_id = sys.argv[1]

    run_dir = RESULTS_DIR / run_id
    manifest = load_manifest(run_id)
    evaluations = manifest["evaluations"]

    print(f"\nManifest: {len(evaluations)} evaluations")
    print(f"Run dir: {run_dir}")
    print()

    # Check which are already completed
    completed = 0
    pending = []
    for entry in evaluations:
        result_path = run_dir / entry["output_file"]
        if result_path.exists():
            completed += 1
        else:
            pending.append(entry)

    print(f"Completed: {completed}/{len(evaluations)}")
    print(f"Pending: {len(pending)}")

    if not pending:
        print("\nAll evaluations complete! Run:")
        print(f"  python labs/lab-05-subagent-evaluation.py --assemble {run_id}")
        return

    # Print dispatch prompts for pending evaluations
    print(f"\n{'='*70}")
    print(f"  DISPATCH PROMPTS FOR PENDING EVALUATIONS")
    print(f"  Copy these as Agent tool prompts in Claude Code")
    print(f"{'='*70}")

    for i, entry in enumerate(pending):
        prompt = dispatch_prompt(entry, run_dir)
        print(f"\n--- [{i+1}/{len(pending)}] {entry['eval_id']} ---")
        print(prompt)
        print()


if __name__ == "__main__":
    main()
