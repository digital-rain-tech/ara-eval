# ADR 008: LLM Response Robustness

**Date:** 2026-03-15
**Status:** Accepted

## Context

Different LLM models return varying response structures. Our pipeline validates that all 7 dimensions exist with valid A-D levels, but optional fields like `reasoning` and `interpretation` may be missing. When testing free-tier models (Nemotron, Step 3.5 Flash), we discovered:

1. **Nemotron truncates responses** — consistently drops the last 4-5 dimensions due to output length limits, and omits `reasoning` keys even on successful dimensions.
2. **Step 3.5 Flash returns empty content** — 72% of calls return `None` content with no error code.
3. **Arcee Trinity adds trailing text** — appends natural-language interpretation after the JSON closing brace, which `json_repair` strips.

## Failure Modes

| Issue | Frequency | Impact | Mitigation |
|-------|-----------|--------|------------|
| Missing `reasoning` key | Nemotron ~50% | KeyError crash in `print_fingerprint` and `compare_fingerprints` | Use `.get("reasoning", "")` |
| Empty content (None) | Step Flash ~72%, Nemotron ~30% | Logged as error, call skipped | `evaluate_with_retry` treats as rate-limit for backoff |
| Truncated JSON (missing dimensions) | Nemotron ~40% | Validation catches it, logged as error | Correct behavior — strict validation is right |
| Trailing text after JSON | Arcee ~15% | `json_repair` handles transparently | Working as designed |
| Invalid level (not A-D) | Not observed yet | Would corrupt gating rules | Validation added — raises ValueError |

## Decision

1. **Strict validation for levels and dimensions** — these are safety-critical for gating rules. Missing dimensions or invalid levels are errors, not things to paper over.
2. **Graceful handling for optional fields** — `reasoning` and `interpretation` are informational. Use `.get()` with empty-string defaults. Never crash on missing informational fields.
3. **`json_repair` is acceptable** — audit shows it fixes formatting issues (trailing text, minor truncation) without masking classification data. Audit results in `docs/adr/007-free-model-comparison.md`.
4. **Empty responses treated as rate-limiting** — `evaluate_with_retry` applies exponential backoff on empty content, since free models use empty responses as de facto rate limiting.

## Changes Made

- `ara_eval/core.py:print_fingerprint()` — `d['reasoning']` → `d.get('reasoning', '')`
- `labs/lab-02-grounding-experiment.py:compare_fingerprints()` — same fix for `reasoning_a`/`reasoning_b`
- `ara_eval/core.py:evaluate_scenario()` — level enum validation (A-D) added
