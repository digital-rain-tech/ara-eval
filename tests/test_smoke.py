"""
Smoke tests — verify all labs import and parse args without an API key.

These catch import breakage from module extraction without needing
a real OPENROUTER_API_KEY.

Run: pytest tests/test_smoke.py -v
"""

import subprocess
import sys

import pytest


# Labs with argparse that support --help
LABS_WITH_HELP = [
    "labs/lab-01-risk-fingerprinting.py",
    "labs/lab-02-grounding-experiment.py",
    "labs/lab-03-intra-rater-reliability.py",
    "labs/lab-05-build-your-own-scenario.py",
    "labs/generate-report.py",
]


@pytest.mark.parametrize("lab", LABS_WITH_HELP)
def test_lab_help(lab):
    """Each lab script should print help and exit 0."""
    result = subprocess.run(
        [sys.executable, lab, "--help"],
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert result.returncode == 0, f"{lab} --help failed:\n{result.stderr}"


def test_core_imports():
    """Core module should import without an API key."""
    result = subprocess.run(
        [sys.executable, "-c",
         "from ara_eval.core import DIMENSIONS, DEFAULT_MODEL, apply_gating_rules, parse_llm_json; "
         "print(len(DIMENSIONS), DEFAULT_MODEL)"],
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert result.returncode == 0, f"Core import failed:\n{result.stderr}"
    assert "7" in result.stdout
