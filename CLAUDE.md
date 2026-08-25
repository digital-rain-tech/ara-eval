# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ARA-Eval (Agentic Risk Assessment) is an evaluation framework for determining when enterprises can safely deploy autonomous AI agents. It produces **risk fingerprints** — 7-dimension level classifications (A–D) — and applies deterministic gating rules to classify domains as "ready now", "ready with prerequisites", or "human-in-loop required".

Focused on Hong Kong financial services regulation (HKMA, SFC, PCPD, PIPL).

**Naming:** the canonical expansion of ARA is "Agentic Risk Assessment" (not "Readiness", not "Agent") on all SEO/machine-facing surfaces; plain "AI agent risk assessment" is preferred in prose, and "readiness" is used only for verdict language ("ready now", readiness classification). See [ADR-017](docs/adr/ADR-017-naming-agentic-risk-assessment.md) — don't rename historical docs.

## Database & migrations

ARA-Eval shares the Supabase project `ezlyfsgpcahlnbqgdlxh` with photocritic and lantern.
**Schema changes are managed centrally in the `platform-db` repo** (the single canonical
`supabase/migrations/` history) — **not here**. The `supabase/migrations/` folder in this
repo is frozen/legacy (see `supabase/migrations/FROZEN.md`); do not run `supabase db push`
from this repo. ARA-Eval owns its `ara_*` tables (incl. `ara_ai_provider_requests`); to
change them, add a migration in `platform-db` and push from there.

## Commands

```bash
# Setup (use the project venv — system Python is PEP 668 locked)
source venv/bin/activate   # or use venv/bin/python directly
pip install -r requirements.txt -r requirements-dev.txt
pip install -e .   # installs ara_eval package in dev mode
# Add OPENROUTER_API_KEY to .env.local

# Run labs (all support --structured for structured input decomposition)
python labs/lab-01-risk-fingerprinting.py          # core scenarios (6)
python labs/lab-01-risk-fingerprinting.py --all --structured  # all 13 with structured prompts
python labs/lab-02-grounding-experiment.py          # grounding A/B experiment (hk vs hk-grounded)
python labs/lab-02-grounding-experiment.py --grounding sg  # sg vs sg-grounded
python labs/lab-03-intra-rater-reliability.py       # reliability testing
python labs/lab-03-intra-rater-reliability.py --repetitions 5 --scenarios banking-fraud-001

# Alternate scenario sets + jurisdictions (lab-01/02/03 take --scenarios-file; lab-01/03 take --jurisdiction)
python labs/lab-01-risk-fingerprinting.py --all --scenarios-file singapore-scenarios.json --jurisdiction sg-grounded
python labs/lab-01-risk-fingerprinting.py --all --scenarios-file rwa-scenarios.json --jurisdiction sg-grounded

# Subagent evaluation (no API key needed — uses Claude Code subagents)
python labs/lab-05-subagent-evaluation.py --structured           # generate manifest
python labs/lab-05-subagent-evaluation.py --structured --grounding  # with grounding variant
python labs/lab-05-subagent-evaluation.py --assemble <run-id>    # assemble results
python labs/lab-05-dispatch.py [run-id]                          # print dispatch prompts

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
- LLM calls go through OpenRouter (default: `deepseek/deepseek-v4-flash`) with `httpx`; all request/response metadata persisted to SQLite (`results/ara-eval.db`)

**Prompt template system** (`prompts/`): System prompts are composed from Mustache templates via `chevron`. `build_system_prompt()` combines personality + rubric + jurisdiction + output format. Personalities and jurisdictions are registered in `_index.json` files. `load_prompt()` enforces path traversal protection.

**Scenario format** (`scenarios/starter-scenarios.json`): Each scenario has `id`, `domain`, `industry`, `risk_tier`, `scenario` (narrative), `reference_fingerprint` (human-authored ground truth), and `jurisdiction_notes`. Scenarios are split into `core: true` (6) and extended (13 total). All scenarios include `structured_context` fields for use with `--structured`.

**Scenario sets** (`scenarios/*.json`, selected via `--scenarios-file`): `starter-scenarios.json` (HK, 13), `singapore-scenarios.json` (6 SG translations of the core HK scenarios), `rwa-scenarios.json` (6 RWA-tokenization scenarios anchored to the sister project `art-verify`/archelu). SG/RWA fingerprints carry a `reference_status` field marking them provisional/reviewed. Key cross-jurisdiction finding: SG has no statutory human-in-loop mandate, so activity-based gates match HK but `claims-denial` diverges (Reg A→B). `load_scenarios(scenarios_file=...)` is path-traversal protected.

**Jurisdictions** (`prompts/jurisdictions/`): `hk`, `hk-grounded`, `sg`, `sg-grounded`, `generic` — registered in `_index.json`, selectable via `--jurisdiction`. Grounded variants embed citation-grade regulatory requirements.

**Web app** (`web/`): Next.js 16 + React 19 interactive evaluator / red-teaming chat (app.ara-eval.org). Uses **pnpm** (single lockfile; no npm). Deployed on **Vercel** with **Supabase** (dual-driver `db.ts`: Supabase when `NEXT_PUBLIC_SUPABASE_URL` is set, else local SQLite for student dev; anonymous auth + optional Google sign-in). Scenarios/prompts (which live at the repo root, outside `web/`) are bundled at build via `web/scripts/generate-shared-data.mjs` → `src/generated/shared-data.ts` (gitignored) so request-time code never reads parent-dir files — required for Vercel serverless. The app exposes the scenario sets and jurisdictions above. Self-host Docker path stays behind `BUILD_STANDALONE=1`. See `docs/superpowers/specs/2026-04-20-supabase-vercel-migration-design.md`.

**Subagent evaluation** (`labs/lab-05-subagent-evaluation.py`): Dispatches isolated Claude Code subagents for each scenario × personality × variant. Uses `.claude/commands/ara-evaluate.md` as the skill (full rubric baked in). Supports `--structured`, `--grounding`, `--repetitions`. Run `--assemble <run-id>` to collect results into lab-01 format for lab-04 scoring.

**Shared data** (`shared/`): Structured JSON files consumed by the sister project `ara-eval-site` via GitHub raw URLs. **When leaderboard scores change, update `shared/leaderboard.json`** — this is the source of truth for the public site. Files:
- `leaderboard.json` — model scores (raw floats), metric descriptions, metadata
- `models.json` — model registry with labels and notes
- `dimensions.json` — dimension IDs, labels, level ordering
- `challenges.json` — adversarial challenge text per dimension × level

Lab 04 writes `results/reference/leaderboard.json` (gitignored, verbose). The `shared/leaderboard.json` is the curated public version — update it manually after significant leaderboard changes.

## Framework Specification

`docs/framework.md` defines the rubric: 7 dimensions with 4-level classifications, hard gates (Regulatory=A or Blast Radius=A blocks autonomy), and soft gates (any other A requires documented risk acceptance). The risk fingerprint is the ordered tuple across all dimensions.

## Running Evals — Operational Notes

**Before your first run:**
1. You need an OpenRouter API key in `.env.local`. Free models cost $0.
2. In your OpenRouter account settings, enable **"Allow free endpoints that may publish prompts"** — without this, most free models return 429 immediately.
3. Run `pip install -e .` so the `ara_eval` package is importable.

**Choosing a model:**
- Default is `deepseek/deepseek-v4-flash` (paid; set via `is_default` in `shared/models.json`; F2 0.79, 17/18 completion). The `:free` endpoint was pulled by OpenRouter (2026-07) and now 404s. `arcee-ai/trinity-large-preview:free` remains a reliable free 18/18 fallback.
- Free models on OpenRouter are volatile: they get removed, rate-limited, or return empty responses without warning. See `docs/adr/007-free-model-comparison.md` for tested models and results.
- Override with `ARA_MODEL=<openrouter-id> python labs/lab-01-risk-fingerprinting.py`. No code changes needed.
- See `docs/models.md` for the full model guide with pricing.

**Rate limiting and pacing:**
- All labs use `evaluate_with_retry()` from `ara_eval/core.py`, which enforces a minimum 17s interval between calls (based on Arcee Trinity's median response time across 387 calls). This prevents faster free models from outrunning rate limits.
- On 429 or empty responses, retries use exponential backoff: `2^attempt × 17s`.
- Arcee Trinity's natural latency (~17s median) means pacing adds zero overhead for the default model. Faster models get artificial delay.

**Interpreting results:**
- A run produces a JSON file in `results/<date>/` plus entries in `results/ara-eval.db`.
- Use `python labs/view-requests.py --last` to inspect the most recent run, or `--stats` for aggregate stats across all runs.
- Use `python labs/generate-report.py --last` to generate a markdown report with fingerprint matrices, gating summaries, and auto-generated homework questions.
- Reference results from known-good runs are committed in `results/reference/` for comparison.

**When things go wrong:**
- **All calls return 429:** Check that "free endpoints" is enabled in OpenRouter settings. If still failing, the model is genuinely rate-limited — try a different model.
- **Empty content (None):** The model responded but returned no content. This is a model reliability issue, not a bug. Some free models do this on 50-70% of calls. The result is logged as an error and skipped.
- **Missing dimensions:** The model returned JSON but omitted some of the 7 required dimensions. Usually means the response was truncated. `json_repair` handles minor truncation; severe cases are logged as errors.
- **Invalid level:** The model returned a dimension level outside A-D. Caught by validation and logged as an error.

**Saving reference results:**
- When a model run completes successfully (18/18 or close), copy the output to `results/reference/<model-slug>/` and commit it. This builds a library of baseline results for inter-model comparison.
- Update `docs/adr/007-free-model-comparison.md` with the model name, success rate, and any observations.

## Leaderboard Update Workflow

When adding new model evaluation results to the public leaderboard:

```bash
# 1. Run the eval
ARA_MODEL=<openrouter-id> python labs/lab-01-risk-fingerprinting.py --all --structured

# 2. Copy results to reference directory (used by lab-04 scoring)
mkdir -p results/reference/<model-slug>/
cp results/<date>/lab-01-<model>-<timestamp>.json results/reference/<model-slug>/

# 3. Score all models and regenerate results/reference/leaderboard.json
python labs/lab-04-inter-model-comparison.py

# 4. Generate individual run reports (optional)
python labs/generate-report.py <run-id>    # get run-id from eval output or view-requests.py

# 5. Publish: updates shared/leaderboard.json AND README.md in one step
python labs/publish-leaderboard.py            # update both files
python labs/publish-leaderboard.py --check    # CI: exits 1 if either is stale
python labs/publish-leaderboard.py --dry-run  # print shared/leaderboard.json to stdout
#    NOTE: New models need a MODEL_MAP entry in publish-leaderboard.py
#    Wall times are extracted from results/reference/<slug>/lab-01-*.json (_run.wall_time_ms)
#    Models only in shared/ (e.g. subagent runs) are preserved automatically
```

**Key files:**
- `shared/leaderboard.json` — curated public leaderboard (source of truth for ara-eval-site)
- `shared/models.json` — model registry with labels and notes
- `shared/archive/index.json` — index of all historical leaderboard snapshots
- `shared/archive/leaderboard-<date>-<label>.json` — frozen snapshots
- `results/reference/leaderboard.json` — auto-generated verbose leaderboard (gitignored)
- `results/reference/<model-slug>/` — raw lab-01 results per model (committed)
- `labs/publish-leaderboard.py` — single script: results → shared/leaderboard.json + README.md
- `shared/prompt-versions.json` — the judge prompt behind every score, keyed by fingerprint
- `labs/export-prompt-versions.py` — regenerates the above from git history

**Metric naming conventions:**
- `hard_gate_recall` / `hard_gate_precision` — specifically for A-level hard gates (Reg=A, Blast=A)
- `fingerprint_match` — exact dimension-level match vs human reference fingerprint
- `f2` — F-beta (beta=2), weights recall 4x over precision
- `differentiation` — personality spread across CO/CRO/Ops
- `bias` — even-keeled | sleepy | jittery | noisy | broken

## Judge prompt versions

A rubric filename is not a version. `prompts/rubric.md` has held four different
texts, so a result that records only `"rubric": "rubric.md"` cannot be grouped by
what the judge actually read. Runs therefore record `_run.prompt_fingerprint`, a
hash of the composed system prompt across all three personalities
(`ara_eval.core.prompt_fingerprint`).

**Scores are comparable within a prompt version, never across versions.** Two
kinds of change are not alike:

- **Scoring-side** (reference fingerprints, metric definitions) — rescore offline
  with `lab-04`. No API calls, so the whole board moves together.
- **Prompt-side** (rubric, personality, jurisdiction) — changes the judge's input.
  It cannot be rescored, only re-run. Most models on the board are delisted, so a
  full re-run is not possible. Add a new rubric file instead of editing an
  existing one in place, and let the board carry both versions.

`prompts/rubric-v2.md` adds the Regulatory Exposure scope note. Run it with
`--rubric rubric-v2.md`. After changing any prompt file, run
`python labs/export-prompt-versions.py` so the site can show readers the new text.
