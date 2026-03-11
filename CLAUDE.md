# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ARA-Eval (Agentic Readiness Assessment) is an evaluation framework for determining when enterprises can safely deploy autonomous AI agents. It produces **risk fingerprints** — 7-dimension level classifications (A–D) — and applies deterministic gating rules to classify domains as "ready now", "ready with prerequisites", or "human-in-loop required".

Developed for the HKU MFFinTech capstone programme, focused on Hong Kong financial services regulation (HKMA, SFC, PCPD, PIPL).

## Commands

```bash
# Setup
pip install anthropic python-dotenv
export ANTHROPIC_API_KEY=your-key-here

# Run Lab 01 (risk fingerprinting pipeline)
python labs/lab-01-risk-fingerprinting.py
```

Output goes to `results/lab-01-output.json` (gitignored).

## Architecture

**Evaluation pipeline** (`labs/lab-01-risk-fingerprinting.py`):
1. Loads scenarios from `scenarios/starter-scenarios.json`
2. Evaluates each scenario × 3 ConFIRM personality variants (compliance officer, CRO, operations director) via Claude as LLM judge
3. LLM returns structured JSON with level classifications (A–D) and reasoning per dimension
4. Gating rules are applied **programmatically** (not by LLM) — hard gates on Regulatory Exposure=A and Blast Radius=A override everything
5. Personality deltas computed to surface stakeholder disagreement
6. Results compared against human-authored reference fingerprints

**Key design decisions:**
- Gating rules are deterministic code, never delegated to the LLM — this is intentional separation of probabilistic classification from deterministic policy
- Level A–D is ordinal (A=0 highest risk, D=3 lowest risk), defined in `LEVEL_ORDER`
- The 7 dimensions are ordered and the fingerprint string preserves that order (e.g., "C-B-A-A-C-B-C")
- Uses Claude Sonnet (`claude-sonnet-4-20250514`) as the judge model

**Scenario format** (`scenarios/starter-scenarios.json`): Each scenario has `id`, `domain`, `industry`, `risk_tier`, `scenario` (narrative), `reference_fingerprint` (human-authored ground truth), and `jurisdiction_notes`.

## Framework Specification

`docs/framework.md` defines the rubric: 7 dimensions with 4-level classifications, hard gates (Regulatory=A or Blast Radius=A blocks autonomy), and soft gates (any other A requires documented risk acceptance). The risk fingerprint is the ordered tuple across all dimensions.
