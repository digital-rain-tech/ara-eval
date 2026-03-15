# ADR 007: Free Model Comparison Attempts

**Date:** 2026-03-15
**Status:** In progress

## Context

We want inter-model comparison data (Lab 04 candidate) using free-tier models on OpenRouter. Arcee Trinity is our default and works reliably. We need a second free model for comparison.

## Models Tested

All tests run on 2026-03-15.

| Model | OpenRouter ID | Result | Notes |
|-------|---------------|--------|-------|
| **Arcee Trinity Large** | `arcee-ai/trinity-large-preview:free` | **18/18** | Default model. All labs pass. Reliable. |
| **Hunter Alpha** | `openrouter/hunter-alpha` | **18/18** | OpenRouter stealth model. Most aggressive rater — hits more hard gates but also over-classifies. ~17min for 18 calls. |
| **Healer Alpha** | `openrouter/healer-alpha` | **18/18** | OpenRouter stealth model. Catches Reg=A on genai-data-leakage (over-classifies vs reference B). ~6.5min for 18 calls. |
| Step 3.5 Flash | `stepfun/step-3.5-flash:free` | **5/18** | 13/18 returned empty content (None). No pattern by scenario complexity. When it responds, rates much more aggressively (4 Level A's on claims-denial vs Arcee's 1). |
| Nemotron 3 Super 120B | `nvidia/nemotron-3-super-120b-a12b:free` | **2/18** (with pacing), **8/18** (without) | Truncates responses — consistently drops last 4-5 dimensions. Output length too short for 7-dimension JSON. Also rate-limited. Not a pacing problem. |
| Llama 3.3 70B | `meta-llama/llama-3.3-70b-instruct:free` | **0/18** | 429 on every call, even with exponential backoff up to 68s. |
| Qwen3 Next 80B | `qwen/qwen3-next-80b-a3b-instruct:free` | **0/18** | 429 rate-limited on every call, even after enabling "free endpoints" setting. |
| GPT-OSS 120B | `openai/gpt-oss-120b:free` | **0/18** | 429 (was 404 before enabling free endpoints — model exists but rate-limited). |
| Mistral Small 3.1 24B | `mistralai/mistral-small-3.1-24b-instruct:free` | Not yet tried | Last untested free option. |

## Stealth Model Metadata (captured 2026-03-15)

Hunter Alpha and Healer Alpha are OpenRouter's own models, routed through an opaque "Stealth" adapter. These are **temporary models** — they may be removed or replaced without notice. This metadata was captured from the OpenRouter API and model pages on 2026-03-15.

### Hunter Alpha

| Field | Value |
|-------|-------|
| **OpenRouter ID** | `openrouter/hunter-alpha` |
| **Released** | 2026-03-11 |
| **Parameters** | 1 Trillion |
| **Architecture** | Text→text, likely sparse/MoE (1T params). Tokenizer listed as "Other". |
| **Context window** | 1,048,576 tokens (1M) |
| **Max output** | 32,000 tokens |
| **Pricing** | Free ($0 input/output). Prompts and completions logged by provider. |
| **Rate limit** | 400 req/min |
| **Capabilities** | Reasoning ("reasoning-content"), tool/function calling |
| **Description** | "A frontier intelligence model built for agentic use. Excels at long-horizon planning, complex reasoning, and sustained multi-step task execution." |
| **Provider** | OpenRouter via Stealth adapter — underlying model undisclosed |

### Healer Alpha

| Field | Value |
|-------|-------|
| **OpenRouter ID** | `openrouter/healer-alpha` |
| **Released** | 2026-03-11 |
| **Parameters** | Not disclosed |
| **Architecture** | Omni-modal (text+image+audio+video→text). Tokenizer listed as "Other". |
| **Context window** | 262,144 tokens (256K) |
| **Max output** | 32,000 tokens |
| **Pricing** | Free ($0 input/output). Prompts and completions logged by provider. |
| **Capabilities** | Reasoning, tool/function calling, multimodal input (image, audio, video) |
| **Description** | "A frontier omni-modal model with vision, hearing, reasoning, and action capabilities. Natively perceiving visual and audio inputs, reasoning across modalities." |
| **Provider** | OpenRouter via Stealth adapter — underlying model undisclosed |

### Governance note

Both models have opaque architectures behind a "Stealth" adapter. The underlying base models are undisclosed. This raises an interesting question for the framework itself: **can you trust a risk assessment from a model you can't audit?** The inter-model comparison data is still valuable for measuring framework robustness, but the models themselves would not pass the Accountability Chain dimension at Level C or above.

## Inter-Model Hard Gate Comparison (Lab 01)

The safety-critical question: do different models trigger the same hard gates?

| Scenario | Reference | Arcee Trinity | Healer Alpha | Hunter Alpha |
|---|---|---|---|---|
| insurance-claims (Reg=A?) | Reg=A | CO hits | CO hits | CO+CRO hit |
| algo-trading (Reg=A, Blast=A?) | Reg=A, Blast=A | 3/3 Reg, 0/3 Blast | 3/3 Reg, 1/3 Blast | 3/3 Reg, 2/3 Blast |
| genai-data-leakage (Reg=B) | Reg=B | 1/3 over-flag A | **3/3 over-flag A** | **3/3 over-flag A** |
| claims-denial (Reg=A?) | Reg=A | 2/3 hit | 1/3 hit | 1/3 hit (CO=A) |
| cross-border (Reg=A?) | Reg=A | 3/3 hit | 3/3 hit | 3/3 hit |

**Key findings:**
- All 3 models agree on cross-border (Reg=A) and algo-trading (Reg=A) — these hard gates are robust across models.
- Hunter Alpha and Healer Alpha both over-classify genai-data-leakage as Reg=A (reference is B). This is a false positive hard gate — conservative but wrong.
- claims-denial Reg=A is the hardest to detect — no model catches it consistently. The CRO personality misses it across all 3 models.
- Hunter Alpha is the most aggressive overall — more Level A's, more hard gates, but also more false positives.

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
2. **Free model availability is volatile** — GPT-OSS 120B returned 404 despite being in our docs. Stealth models (Hunter/Healer Alpha) are explicitly temporary.
3. **Rate limits vary dramatically** — Qwen3 hit 429 on every call. Arcee Trinity handles 90+ sequential calls fine. OpenRouter's own models (Hunter/Healer) have generous 400 req/min limits.
4. **Empty responses are a reliability signal** — Step 3.5 Flash returns None on 72% of calls with no error code, making it unsuitable as a primary judge but interesting as a comparison data point.
5. **json_repair is safe but should be audited** — mostly fixing trailing text, not masking data loss.
6. **Opaque models are useful for testing framework robustness but raise their own governance questions** — you can't audit a model behind a "Stealth" adapter.

## Decision

Track all model attempts in this ADR with dates. Stealth/temporary models get full metadata snapshots since they may disappear. Reference results saved to `results/reference/<model-slug>/` for inter-model comparison.
