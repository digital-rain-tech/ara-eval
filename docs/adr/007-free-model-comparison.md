# ADR 007: Free Model Comparison Attempts

**Date:** 2026-03-15
**Status:** In progress

## Context

We want inter-model comparison data (Lab 04 candidate) using free-tier models on OpenRouter. Arcee Trinity is our default and works reliably. We need a second free model for comparison.

## Models Tested

| Model | OpenRouter ID | Result | Notes |
|-------|---------------|--------|-------|
| **Arcee Trinity Large** | `arcee-ai/trinity-large-preview:free` | **18/18** | Default model. All labs pass. Reliable. |
| Step 3.5 Flash | `stepfun/step-3.5-flash:free` | **5/18** | 13/18 returned empty content (None). No pattern by scenario complexity. When it responds, rates much more aggressively (4 Level A's on claims-denial vs Arcee's 1). |
| Nemotron 3 Super 120B | `nvidia/nemotron-3-super-120b-a12b:free` | **2/18** (with pacing), **8/18** (without) | Truncates responses — consistently drops last 4-5 dimensions. Output length too short for 7-dimension JSON. Also rate-limited. Not a pacing problem. |
| Llama 3.3 70B | `meta-llama/llama-3.3-70b-instruct:free` | **0/18** | 429 on every call, even with exponential backoff up to 68s. |
| Qwen3 Next 80B | `qwen/qwen3-next-80b-a3b-instruct:free` | **0/18** | 429 rate-limited on every call, even after enabling "free endpoints" setting. |
| GPT-OSS 120B | `openai/gpt-oss-120b:free` | **0/18** | 429 (was 404 before enabling free endpoints — model exists but rate-limited). |
| Mistral Small 3.1 24B | `mistralai/mistral-small-3.1-24b-instruct:free` | Not yet tried | Last untested free option. |

## JSON Repair Audit

`json_repair` silently fixes malformed LLM output. Audit of 50 most recent successful responses:

| Model | Clean JSON | Needed Repair | Clean Rate |
|-------|-----------|---------------|-----------|
| Arcee Trinity | 33 | 6 | 85% |
| Nemotron 3 Super | 5 | 1 | 83% |
| Step 3.5 Flash | 5 | 0 | 100% |

**What json_repair is fixing:**
- **Trailing text after JSON** (8/9 cases, mostly Arcee): Model outputs valid JSON then appends a natural-language interpretation line. json_repair strips trailing text. No level/reasoning data lost.
- **Truncation** (1/9 cases, Nemotron): Response cut off mid-string. json_repair closes braces. Levels survive but last reasoning string is truncated. This is the only potentially lossy repair.

**Conclusion:** json_repair is handling output formatting quirks, not masking bad classifications. The truncation case is worth tracking but doesn't affect level assignments.

## Step 3.5 Flash: Aggressive Rating Pattern

When Step 3.5 Flash does respond (5/18), it rates significantly more aggressively than Arcee Trinity:

| Scenario | Step 3.5 Flash | Arcee Trinity (CO) | Reference |
|---|---|---|---|
| claims-denial-001 (CO) | A-B-A-B-C-A-A | B-B-A-C-B-B-B | B-C-A-C-B-B-B |
| claims-denial-001 (Ops) | B-C-A-B-A-A-A | B-C-A-C-B-B-C | B-C-A-C-B-B-B |
| cross-border-model-001 (Ops) | B-A-A-C-B-A-B | B-C-A-B-C-B-B | B-B-A-D-C-B-C |

Step 3.5 Flash assigns 3-4 Level A's per scenario where Arcee assigns 1. This over-classification would trigger more hard gates — conservative but potentially less calibrated.

## Lessons

1. **OpenRouter "Enable free endpoints" setting** must be toggled on in account settings for some free providers.
2. **Free model availability is volatile** — GPT-OSS 120B returned 404 despite being in our docs.
3. **Rate limits vary dramatically** — Qwen3 hit 429 on every call. Arcee Trinity handles 90+ sequential calls fine.
4. **Empty responses are a reliability signal** — Step 3.5 Flash returns None on 72% of calls with no error code, making it unsuitable as a primary judge but interesting as a comparison data point.
5. **json_repair is safe but should be audited** — mostly fixing trailing text, not masking data loss.

## Decision

Track all model attempts in this ADR. Once we find a working second model with 18/18 reliability, use it for inter-model comparison and save results to `results/reference/`.
