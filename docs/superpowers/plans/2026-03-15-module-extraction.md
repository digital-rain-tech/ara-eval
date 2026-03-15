# Module Extraction & Project Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract shared logic from Lab 01 into `ara_eval/core.py`, eliminate import hacks, add `--structured` to Labs 02/03, fix model default docs, add CI + dev deps.

**Architecture:** Create `ara_eval/` Python package with `core.py` containing all shared constants, utilities, and functions. Labs become thin scripts importing from the package. `generate-report.py` also imports shared constants instead of duplicating them.

**Tech Stack:** Python 3.11+, pytest, GitHub Actions

---

## File Structure

**Create:**
- `ara_eval/__init__.py` — package marker (empty aside from docstring)
- `ara_eval/core.py` — all shared logic extracted from Lab 01
- `requirements-dev.txt` — test dependencies
- `.github/workflows/ci.yml` — CI pipeline
- `tests/test_smoke.py` — import smoke tests

**Modify:**
- `labs/lab-01-risk-fingerprinting.py` — thin wrapper importing from `ara_eval.core`
- `labs/lab-02-grounding-experiment.py` — import from `ara_eval.core`, add `--structured`
- `labs/lab-03-intra-rater-reliability.py` — import from `ara_eval.core`, add `--structured`
- `labs/generate-report.py` — import constants from `ara_eval.core`
- `tests/test_core.py` — import from `ara_eval.core` instead of importlib hack
- `docs/models.md` — fix default model reference
- `CLAUDE.md` — update architecture section

---

## Chunk 1: Extract shared module and update Lab 01

### Task 1: Create `ara_eval/core.py` with all shared logic

**Files:**
- Create: `ara_eval/__init__.py`
- Create: `ara_eval/core.py`

- [ ] **Step 1: Create `ara_eval/__init__.py`**

```python
"""ARA-Eval: Agentic Readiness Assessment framework."""
```

- [ ] **Step 2: Create `ara_eval/core.py`**

Extract from `labs/lab-01-risk-fingerprinting.py` (lines 1-739). This is not a pure copy — it is a copy-plus-refactor. Key dependencies: `chevron` (for prompt templates), `json_repair` (for `parse_llm_json`), `httpx`, `dotenv`.

- Imports and env loading (lines 21-39) — move dotenv loading here, with `_root` pointing to repo root. Include `import chevron` and the `json_repair` import used by `parse_llm_json`.
- Configuration constants (lines 50-78): introduce **new** `DEFAULT_MODEL = "arcee-ai/trinity-large-preview:free"` constant (does not exist in Lab 01 — Lab 01 hardcodes the string in `os.environ.get`). Also: `OPENROUTER_URL`, `DIMENSIONS`, `DIMENSION_LABELS`, `LEVEL_ORDER`
- `MODEL` computed from `os.environ.get("ARA_MODEL", DEFAULT_MODEL)`
- `make_headers(api_key)` — new function that builds the `OPENROUTER_HEADERS` dict (currently module-level at line 53-58). Takes `api_key` as parameter so tests don't need a real key.
- `OPENROUTER_HEADERS` — computed at module level by calling `make_headers(OPENROUTER_API_KEY)` only if key exists, else `None`
- Prompt system (lines 85-154): `PROMPTS_DIR`, `load_prompt()`, `load_index()`, `build_system_prompt()`, `build_user_prompt()`, `PERSONALITIES`
- DB functions (lines 161-315): `init_db()`, `log_request()`, `update_run()`
- Gating rules (lines 322-356): `apply_gating_rules()`
- Response parsing (lines 363-471): `extract_usage()`, `extract_provider_info()`, `extract_cost()`, `parse_llm_json()`
- LLM evaluation (lines 478-612): `evaluate_scenario()`
- Analysis helpers (lines 619-724): `get_run_dir()`, `personality_delta()`, `print_fingerprint()`, `print_delta_report()`, `print_run_summary()`
- Scenario loading (lines 731-739): `load_scenarios()`

Key changes from Lab 01:
- `DEFAULT_MODEL = "arcee-ai/trinity-large-preview:free"` as a named constant
- `MODEL = os.environ.get("ARA_MODEL", DEFAULT_MODEL)` uses the constant
- `_root` computed as `Path(__file__).parent.parent` (from `ara_eval/` up to repo root)
- API key validation deferred: `OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")` without `raise SystemExit` — labs check this themselves before calling LLM functions
- `OPENROUTER_HEADERS` set to `None` if no API key (lets tests import without a key)

- [ ] **Step 3: Verify the module imports cleanly**

Run: `python -c "from ara_eval.core import DIMENSIONS, DEFAULT_MODEL, apply_gating_rules; print('OK', DEFAULT_MODEL)"`
Expected: `OK arcee-ai/trinity-large-preview:free`

- [ ] **Step 4: Commit**

```bash
git add ara_eval/__init__.py ara_eval/core.py
git commit -m "Extract shared logic into ara_eval/core.py"
```

### Task 2: Refactor Lab 01 to import from `ara_eval.core`

**Files:**
- Modify: `labs/lab-01-risk-fingerprinting.py`

- [ ] **Step 1: Replace Lab 01 internals with imports**

Replace everything before `def main()` (lines 1-739) with:

```python
"""
ARA-Eval Lab 01: Risk Fingerprinting with LLM-Assisted Evaluation
=================================================================

Run scenarios through an LLM judge using the 7-dimension rubric,
then apply gating rules to determine autonomy readiness. ConFIRM-based
personality variants surface where stakeholder archetypes disagree.

Prerequisites:
    pip install -r requirements.txt

Usage:
    python labs/lab-01-risk-fingerprinting.py          # core scenarios only (6)
    python labs/lab-01-risk-fingerprinting.py --all     # all 13 scenarios

Output:
    results/lab-01-output.json — structured risk fingerprints per scenario x personality
    results/ara-eval.db — SQLite database with all request/response metadata
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx

from ara_eval.core import (
    DIMENSIONS,
    DIMENSION_LABELS,
    MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_HEADERS,
    PERSONALITIES,
    evaluate_scenario,
    get_run_dir,
    init_db,
    load_scenarios,
    personality_delta,
    print_delta_report,
    print_fingerprint,
    print_run_summary,
    update_run,
)

_root = Path(__file__).parent.parent
```

Keep `def main()` body as-is (lines 742-935) — it only references names that are now imported. Remove the `import argparse` that is currently inside `main()` (line 743) since it is now a top-level import.

Add an API key check at the top of `main()`:

```python
def main():
    if not OPENROUTER_API_KEY:
        raise SystemExit("OPENROUTER_API_KEY not set. Add it to .env.local or export it.")
    # ... rest of main unchanged
```

- [ ] **Step 2: Run Lab 01 help to verify it loads**

Run: `python labs/lab-01-risk-fingerprinting.py --help`
Expected: Shows argparse help text without errors

- [ ] **Step 3: Commit**

```bash
git add labs/lab-01-risk-fingerprinting.py
git commit -m "Refactor Lab 01 to import from ara_eval.core"
```

### Task 3: Update tests to import from `ara_eval.core`

**Files:**
- Modify: `tests/test_core.py`

- [ ] **Step 1: Replace importlib hack with direct imports**

Replace lines 10-36 (the `os.environ.setdefault` + `spec_from_file_location` block for both lab01 and lab03) with:

```python
import os
os.environ.setdefault("OPENROUTER_API_KEY", "test-key-for-testing")

from ara_eval.core import (
    DIMENSIONS,
    apply_gating_rules,
    load_prompt,
    init_db,
    parse_llm_json,
)
```

For Lab 03 imports, add:

```python
# Lab 03 still needs direct import for compute_agreement / compute_cohens_kappa_self
# These are Lab 03-specific functions, not shared core
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "labs"))
from importlib.util import spec_from_file_location, module_from_spec

_lab03_path = Path(__file__).parent.parent / "labs" / "lab-03-intra-rater-reliability.py"
_spec3 = spec_from_file_location("lab03", _lab03_path)
lab03 = module_from_spec(_spec3)
_spec3.loader.exec_module(lab03)
```

Update test classes to use direct imports instead of `lab01.` prefix:
- `lab01.parse_llm_json` → `parse_llm_json`
- `lab01.apply_gating_rules` → `apply_gating_rules`
- `lab01.DIMENSIONS` → `DIMENSIONS`
- `lab01.load_prompt` → `load_prompt`
- `lab01.init_db` → `init_db`
- Keep `lab03.compute_agreement` and `lab03.compute_cohens_kappa_self` as-is

- [ ] **Step 2: Run tests**

Run: `pytest tests/test_core.py -v`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/test_core.py
git commit -m "Update tests to import from ara_eval.core"
```

---

## Chunk 2: Refactor Labs 02/03 and generate-report.py

### Task 4: Refactor Lab 02 to import from `ara_eval.core` and add `--structured`

**Files:**
- Modify: `labs/lab-02-grounding-experiment.py`

- [ ] **Step 1: Replace importlib hack with ara_eval.core imports**

Replace lines 27-48 (the `sys.path` + `spec_from_file_location` block) with:

```python
import uuid
from datetime import datetime, timezone

import httpx

from ara_eval.core import (
    DIMENSIONS,
    DIMENSION_LABELS,
    LEVEL_ORDER,
    MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_HEADERS,
    PERSONALITIES,
    evaluate_scenario,
    get_run_dir,
    init_db,
    load_scenarios,
    update_run,
)

_root = Path(__file__).parent.parent
JURISDICTIONS = ["hk", "hk-grounded"]
```

Remove all `lab01.` prefixes from the rest of the file — replace with direct references to the imported names. Specifically:
- `lab01.LEVEL_ORDER` → `LEVEL_ORDER` (already assigned at old line 46)
- `lab01.DIMENSIONS` → `DIMENSIONS`
- `lab01.DIMENSION_LABELS` → `DIMENSION_LABELS`
- `lab01.load_scenarios` → `load_scenarios`
- `lab01.init_db` → `init_db`
- `lab01.OPENROUTER_HEADERS` → `OPENROUTER_HEADERS`
- `lab01.MODEL` → `MODEL`
- `lab01.PERSONALITIES` → `PERSONALITIES`
- `lab01.evaluate_scenario` → `evaluate_scenario`
- `lab01.update_run` → `update_run`
- `lab01.get_run_dir` → `get_run_dir`

- [ ] **Step 2: Add `--structured` flag**

Add to argparse in `main()`:

```python
parser.add_argument("--structured", action="store_true", help="Include structured context in prompts")
```

Add API key check at top of `main()`:

```python
if not OPENROUTER_API_KEY:
    raise SystemExit("OPENROUTER_API_KEY not set. Add it to .env.local or export it.")
```

Pass `structured=args.structured` to `evaluate_scenario()` call (currently at line 147):

```python
result = lab01.evaluate_scenario(
    http_client, db_conn, run_id, scenario,
    personality_id, jurisdiction=jurisdiction
)
```

becomes:

```python
result = evaluate_scenario(
    http_client, db_conn, run_id, scenario,
    personality_id, jurisdiction=jurisdiction,
    structured=args.structured,
)
```

Also remove the `import httpx` and `import uuid` / `from datetime import ...` that are inside `main()` (lines 96-100) — move them to the top-level imports.

- [ ] **Step 3: Verify Lab 02 loads**

Run: `python labs/lab-02-grounding-experiment.py --help`
Expected: Shows help including `--structured` flag

- [ ] **Step 4: Commit**

```bash
git add labs/lab-02-grounding-experiment.py
git commit -m "Refactor Lab 02 to use ara_eval.core, add --structured flag"
```

### Task 5: Refactor Lab 03 to import from `ara_eval.core` and add `--structured`

**Files:**
- Modify: `labs/lab-03-intra-rater-reliability.py`

- [ ] **Step 1: Replace importlib hack with ara_eval.core imports**

Replace lines 28-47 (the `sys.path` + `spec_from_file_location` block and constant re-assignments) with. Also move any `import httpx`, `import uuid`, `from datetime import ...` that are inside `main()` to the top-level imports:

```python
import uuid
from datetime import datetime, timezone

import httpx

from ara_eval.core import (
    DIMENSIONS,
    DIMENSION_LABELS,
    LEVEL_ORDER,
    MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_HEADERS,
    PERSONALITIES,
    evaluate_scenario,
    get_run_dir,
    init_db,
    load_scenarios,
    update_run,
)
```

Remove all `lab01.` prefixes from the rest of the file.

- [ ] **Step 2: Read the rest of Lab 03 to find the evaluate_scenario call**

Read `labs/lab-03-intra-rater-reliability.py` from line 50 onward to find where `evaluate_scenario` is called and add `structured` parameter.

- [ ] **Step 3: Add `--structured` flag**

Add to argparse in `main()`:

```python
parser.add_argument("--structured", action="store_true", help="Include structured context in prompts")
```

Add API key check at top of `main()`.

Pass `structured=args.structured` to the `evaluate_scenario()` call.

- [ ] **Step 4: Verify Lab 03 loads**

Run: `python labs/lab-03-intra-rater-reliability.py --help`
Expected: Shows help including `--structured` flag

- [ ] **Step 5: Commit**

```bash
git add labs/lab-03-intra-rater-reliability.py
git commit -m "Refactor Lab 03 to use ara_eval.core, add --structured flag"
```

### Task 6: Update `generate-report.py` to import shared constants

**Files:**
- Modify: `labs/generate-report.py`

- [ ] **Step 1: Replace duplicated constants with imports**

Replace lines 34-54 (the duplicated `DIMENSIONS`, `DIMENSION_LABELS`, `LEVEL_ORDER`) with:

```python
from ara_eval.core import DIMENSIONS, DIMENSION_LABELS, LEVEL_ORDER
```

Keep `LEVEL_FROM_ORD`, `PERSONALITY_IDS`, and `GATING_LABELS` in `generate-report.py` — these are report-specific and not used elsewhere.

- [ ] **Step 2: Verify report tool loads**

Run: `python labs/generate-report.py --help`
Expected: Shows help without errors

- [ ] **Step 3: Commit**

```bash
git add labs/generate-report.py
git commit -m "Import shared constants from ara_eval.core in generate-report.py"
```

---

## Chunk 3: Docs, dev deps, CI, smoke tests

### Task 7: Fix model default in docs

**Files:**
- Modify: `docs/models.md`

- [ ] **Step 1: Update Qwen3 235B row**

In the Tier 2 table (line 36), change:

```
| **Qwen3 235B Instruct** | `qwen/qwen3-235b-a22b-2507` | **$0.07** | **$0.10** | 262K | **Current default** — 235B MoE (22B active), extremely cheap for its capability |
```

to:

```
| **Qwen3 235B Instruct** | `qwen/qwen3-235b-a22b-2507` | **$0.07** | **$0.10** | 262K | **Recommended paid tier** — 235B MoE (22B active), extremely cheap for its capability |
```

- [ ] **Step 2: Update cost estimates table**

In the cost estimates table (line 78), change:

```
| **Qwen3 235B Instruct** | **~$0.003** | Current default — best cost/quality ratio |
```

to:

```
| **Qwen3 235B Instruct** | **~$0.003** | Recommended paid tier — best cost/quality ratio |
```

- [ ] **Step 3: Update the "Changing the Model" section**

At line 96, change:

```
Default (if unset): `arcee-ai/trinity-large-preview:free`
```

to:

```
Default (if unset): `arcee-ai/trinity-large-preview:free` (defined in `ara_eval/core.py::DEFAULT_MODEL`)
```

- [ ] **Step 4: Commit**

```bash
git add docs/models.md
git commit -m "Fix model default references in docs — Arcee Trinity is default, Qwen3 is recommended paid tier"
```

### Task 8: Add `requirements-dev.txt`

**Files:**
- Create: `requirements-dev.txt`

- [ ] **Step 1: Create the file**

```
pytest>=7.0
```

- [ ] **Step 2: Commit**

```bash
git add requirements-dev.txt
git commit -m "Add requirements-dev.txt with pytest"
```

### Task 9: Add smoke tests

**Files:**
- Create: `tests/test_smoke.py`

- [ ] **Step 1: Write smoke tests**

```python
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


def test_view_requests_imports():
    """view-requests.py should import without errors (uses sys.argv, not argparse)."""
    result = subprocess.run(
        [sys.executable, "-c", "import importlib.util; "
         "s = importlib.util.spec_from_file_location('vr', 'labs/view-requests.py'); "
         "print('OK')"],
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert result.returncode == 0, f"view-requests.py import failed:\n{result.stderr}"


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
```

- [ ] **Step 2: Run smoke tests**

Run: `pytest tests/test_smoke.py -v`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add tests/test_smoke.py
git commit -m "Add smoke tests for lab imports and --help"
```

### Task 10: Add GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: |
          pip install -r requirements.txt -r requirements-dev.txt
      - name: Run tests
        run: pytest tests/ -v
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "Add GitHub Actions CI — pytest + smoke tests on push/PR"
```

### Task 11: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update architecture section**

Update the Architecture section to reflect the new structure:
- `ara_eval/core.py` is the shared module with constants, gating rules, LLM calls, prompt system, DB
- Labs are thin scripts with their own `main()`
- `DEFAULT_MODEL` in `ara_eval/core.py` is the single source of truth for the default model
- Remove mention of `spec_from_file_location` hack (no longer used for Labs 02/03)

Add to Commands section:
- `--structured` flag now available on all three labs

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "Update CLAUDE.md for module extraction"
```

---

## Verification

After all tasks complete:

- [ ] `pytest tests/ -v` — all tests pass (core + smoke)
- [ ] `python labs/lab-01-risk-fingerprinting.py --help` — exits 0
- [ ] `python labs/lab-02-grounding-experiment.py --help` — shows `--structured`
- [ ] `python labs/lab-03-intra-rater-reliability.py --help` — shows `--structured`
- [ ] `python labs/generate-report.py --help` — exits 0
- [ ] `python -c "from ara_eval.core import DEFAULT_MODEL; print(DEFAULT_MODEL)"` — prints `arcee-ai/trinity-large-preview:free`
- [ ] `grep -c "spec_from_file_location" labs/*.py` — returns 0 for labs 02/03 (only test_core.py still uses it for lab03-specific functions)
