# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ARA-Eval (Agentic Readiness Assessment) is an evaluation framework for determining when enterprises can safely deploy autonomous AI agents. It produces **risk fingerprints** — 7-dimension level classifications (A–D) — and applies deterministic gating rules to classify domains as "ready now", "ready with prerequisites", or "human-in-loop required".

Focused on Hong Kong financial services regulation (HKMA, SFC, PCPD, PIPL).

## Commands

```bash
# Setup
pip install -r requirements.txt -r requirements-dev.txt
pip install -e .   # installs ara_eval package in dev mode
# Add OPENROUTER_API_KEY to .env.local

# Run labs (all support --structured for structured input decomposition)
python labs/lab-01-risk-fingerprinting.py          # core scenarios (6)
python labs/lab-01-risk-fingerprinting.py --all --structured  # all 13 with structured prompts
python labs/lab-02-grounding-experiment.py          # grounding A/B experiment
python labs/lab-03-intra-rater-reliability.py       # reliability testing
python labs/lab-03-intra-rater-reliability.py --repetitions 5 --scenarios banking-fraud-001

# Utilities
python labs/view-requests.py                        # inspect SQLite request log
python labs/generate-report.py --last               # report from most recent run
python labs/generate-report.py --compare <id1> <id2> # side-by-side comparison

# Tests
pytest tests/                                       # all tests
pytest tests/test_core.py::TestGatingRules          # single test class

# Override model (default defined in ara_eval/core.py::DEFAULT_MODEL)
ARA_MODEL=openai/gpt-4o python labs/lab-01-risk-fingerprinting.py
```

Output goes to `results/` (gitignored): JSON results, markdown reports, and `ara-eval.db` (SQLite request log).

## Architecture

**Shared module** (`ara_eval/core.py`): Single source of truth for all shared logic — constants (`DIMENSIONS`, `LEVEL_ORDER`, `DEFAULT_MODEL`), gating rules, LLM interaction, prompt template system, DB persistence, and scenario loading. Labs are thin scripts with their own `main()` that import from this module.

**Evaluation pipeline** (`labs/lab-01-risk-fingerprinting.py`):
1. Loads scenarios from `scenarios/starter-scenarios.json`
2. Evaluates each scenario × 3 ConFIRM personality variants (compliance officer, CRO, operations director) via LLM judge
3. LLM returns structured JSON with level classifications (A–D) and reasoning per dimension
4. Gating rules are applied **programmatically** (not by LLM) — hard gates on Regulatory Exposure=A and Blast Radius=A override everything
5. Personality deltas computed to surface stakeholder disagreement
6. Results compared against human-authored reference fingerprints

**Lab 02** (`lab-02-grounding-experiment.py`): A/B experiment — runs scenarios under `hk` (framework names only) vs `hk-grounded` (actual regulatory requirements) to measure grounding effects.

**Lab 03** (`lab-03-intra-rater-reliability.py`): Runs each scenario × personality N times to measure classification stability.

**Key design decisions:**
- Gating rules are deterministic code, never delegated to the LLM — this is intentional separation of probabilistic classification from deterministic policy
- Level A–D is ordinal (A=0 highest risk, D=3 lowest risk), defined in `LEVEL_ORDER`
- The 7 dimensions are ordered and the fingerprint string preserves that order (e.g., "C-B-A-A-C-B-C")
- LLM calls go through OpenRouter (default: `arcee-ai/trinity-large-preview:free`) with `httpx`; all request/response metadata persisted to SQLite (`results/ara-eval.db`)

**Prompt template system** (`prompts/`): System prompts are composed from Mustache templates via `chevron`. `build_system_prompt()` combines personality + rubric + jurisdiction + output format. Personalities and jurisdictions are registered in `_index.json` files. `load_prompt()` enforces path traversal protection.

**Scenario format** (`scenarios/starter-scenarios.json`): Each scenario has `id`, `domain`, `industry`, `risk_tier`, `scenario` (narrative), `reference_fingerprint` (human-authored ground truth), and `jurisdiction_notes`. Scenarios are split into `core: true` (6) and extended (13 total). All scenarios include `structured_context` fields for use with `--structured`.

## Framework Specification

`docs/framework.md` defines the rubric: 7 dimensions with 4-level classifications, hard gates (Regulatory=A or Blast Radius=A blocks autonomy), and soft gates (any other A requires documented risk acceptance). The risk fingerprint is the ordered tuple across all dimensions.
