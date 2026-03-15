# Recommended Models for ARA-Eval

LLM-as-judge evaluation requires models that reliably produce structured JSON, follow detailed rubrics, and reason about nuanced risk dimensions. This document lists recommended models by tier, with their OpenRouter model IDs and pricing.

> **Models change fast.** Check [OpenRouter Rankings](https://openrouter.ai/rankings) for current top models and [OpenRouter Models](https://openrouter.ai/models) for pricing before starting a new batch of runs.

## Selection Criteria

For ARA-Eval's risk fingerprinting pipeline, the judge model must:

1. **Follow structured output format** — return valid JSON matching the 7-dimension schema consistently
2. **Reason about regulatory nuance** — distinguish between HK-specific regulatory levels (HKMA, SFC, PCPD, PIPL)
3. **Maintain persona consistency** — produce meaningfully different classifications across ConFIRM personality variants
4. **Provide calibrated reasoning** — one-sentence justifications that align with the assigned level

## Model Tiers

### Tier 1: Premium (Best Judge Quality)

These models have the strongest instruction-following and reasoning for structured evaluation tasks. Use for establishing reference fingerprints and high-stakes evaluations.

| Model | OpenRouter ID | Input/1M | Output/1M | Context | Notes |
|-------|---------------|----------|-----------|---------|-------|
| Claude Opus 4.6 | `anthropic/claude-opus-4.6` | $5.00 | $25.00 | 1M | Most capable reasoning; reference fingerprint generation |
| Claude Sonnet 4.6 | `anthropic/claude-sonnet-4.6` | $3.00 | $15.00 | 1M | Strong balance of quality and cost; top-5 on OpenRouter by usage |
| GPT-5 | `openai/gpt-5` | $1.25 | $10.00 | 400K | OpenAI's latest flagship |
| Gemini 2.5 Pro | `google/gemini-2.5-pro` | $1.25 | $10.00 | 1M | Excellent reasoning at lower cost |
| Grok 4 | `x-ai/grok-4` | $3.00 | $15.00 | 256K | xAI flagship; strong structured output |

### Tier 2: Workhorse (Cost-Effective)

Solid judge quality at significantly lower cost. Good for iterating on scenarios and running batch evaluations.

| Model | OpenRouter ID | Input/1M | Output/1M | Context | Notes |
|-------|---------------|----------|-----------|---------|-------|
| **Qwen3 235B Instruct** | `qwen/qwen3-235b-a22b-2507` | **$0.07** | **$0.10** | 262K | **Recommended paid tier** — 235B MoE (22B active), extremely cheap for its capability |
| DeepSeek V3.2 | `deepseek/deepseek-v3.2` | $0.26 | $0.38 | 164K | Top-4 on OpenRouter by weekly usage |
| MiniMax M2.5 | `minimax/minimax-m2.5` | $0.27 | $0.95 | 197K | #1 on OpenRouter by weekly usage (2T tokens/week) |
| Gemini 2.5 Flash | `google/gemini-2.5-flash` | $0.30 | $2.50 | 1M | Fast; top-8 by usage; good for batch runs |
| Gemini 3 Flash Preview | `google/gemini-3-flash-preview` | $0.50 | $3.00 | 1M | Latest Gemini; top-3 by usage |
| Grok 4.1 Fast | `x-ai/grok-4.1-fast` | $0.20 | $0.50 | 2M | Top-9 by usage; 2M context window |
| GPT-4.1 | `openai/gpt-4.1` | $2.00 | $8.00 | 1M | Good structured output |
| Claude Haiku 4.5 | `anthropic/claude-haiku-4.5` | $1.00 | $5.00 | 200K | Fast and cheap from Anthropic |

### Tier 3: Budget (High Volume / Experimentation)

Use for rapid prototyping, testing pipeline changes, or running large scenario sweeps where per-call cost matters.

| Model | OpenRouter ID | Input/1M | Output/1M | Context | Notes |
|-------|---------------|----------|-----------|---------|-------|
| GPT-5 Nano | `openai/gpt-5-nano` | $0.05 | $0.40 | 400K | Smallest GPT-5 variant; very cheap |
| GPT-4.1 Nano | `openai/gpt-4.1-nano` | $0.10 | $0.40 | 1M | Good for pipeline testing |
| GPT-4.1 Mini | `openai/gpt-4.1-mini` | $0.40 | $1.60 | 1M | Mid-range budget option |
| DeepSeek V3 | `deepseek/deepseek-chat` | $0.32 | $0.89 | 164K | Previous DeepSeek generation; still capable |
| DeepSeek R1 | `deepseek/deepseek-r1` | $0.70 | $2.50 | 64K | Reasoning model; may over-think simple classifications |
| o4-mini | `openai/o4-mini` | $1.10 | $4.40 | 200K | OpenAI reasoning model |

### Free Tier

Several models are available for free on OpenRouter. Use a **specific** free model — avoid `openrouter/free` which routes randomly across models, producing unreproducible results.

| Model | OpenRouter ID | Notes |
|-------|---------------|-------|
| Qwen3 Next 80B | `qwen/qwen3-next-80b-a3b-instruct:free` | Best free option for structured output |
| GPT-OSS 120B | `openai/gpt-oss-120b:free` | Top-10 on OpenRouter; open-source GPT variant |
| Llama 3.3 70B | `meta-llama/llama-3.3-70b-instruct:free` | Solid general-purpose; test JSON compliance first |
| Mistral Small 3.1 24B | `mistralai/mistral-small-3.1-24b-instruct:free` | Smaller but fast |

**Important:** Free models are rate-limited and may change without notice. Run Lab 03 (reliability) to measure consistency before trusting results. In our testing, free models achieved ~47% reference accuracy vs ~54% for Qwen3 235B.

## Cost Estimates

Each ARA-Eval run evaluates 6 core scenarios x 3 personalities = 18 LLM calls.

| Model | Est. Cost per Run | Notes |
|-------|-------------------|-------|
| Free tier models | **$0.00** | Rate-limited; lower judge quality |
| **Qwen3 235B Instruct** | **~$0.003** | Recommended paid tier — best cost/quality ratio |
| DeepSeek V3.2 / MiniMax M2.5 | ~$0.005 | Good alternatives at similar price |
| Gemini 2.5 Flash | ~$0.03 | Good if Qwen output is inconsistent |
| Claude Sonnet 4.6 | ~$0.50 | Premium quality baseline |
| Claude Opus 4.6 | ~$0.90 | Use for establishing reference fingerprints |

## Changing the Model

Set the `ARA_MODEL` environment variable — no code changes needed:

```bash
# In .env.local (persistent)
ARA_MODEL=deepseek/deepseek-v3.2

# Or inline (one-off)
ARA_MODEL=google/gemini-2.5-flash python3 labs/lab-01-risk-fingerprinting.py
```

Default (if unset): `arcee-ai/trinity-large-preview:free` (defined in `ara_eval/core.py::DEFAULT_MODEL`)

## Multi-Model Comparison

A valuable lab exercise is running the same scenarios across multiple judge models to measure inter-model agreement — analogous to inter-annotator agreement in human evaluation. This surfaces which dimensions are most sensitive to model choice and which are robust.

## OpenRouter Rankings (as of March 2026)

Top 10 models by weekly usage on OpenRouter:

1. MiniMax M2.5 (2.01T tokens/week)
2. Step 3.5 Flash (1.07T)
3. Gemini 3 Flash Preview (994B)
4. DeepSeek V3.2 (939B)
5. Claude Sonnet 4.6 (794B)
6. Claude Opus 4.6 (769B)
7. Kimi K2.5 (568B)
8. Gemini 2.5 Flash (540B)
9. Grok 4.1 Fast (534B)
10. GPT-OSS 120B (517B)

Market share by provider: Google 18.1%, Anthropic 16.3%, OpenAI 14.0%, MiniMax 13.2%, StepFun 8.0%, DeepSeek 7.5%.

## Sources

- [OpenRouter Rankings](https://openrouter.ai/rankings) — real-time usage data
- [OpenRouter Models](https://openrouter.ai/models) — full model catalog with pricing
- [OpenRouter API](https://openrouter.ai/api/v1/models) — programmatic model/pricing data
