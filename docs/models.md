# Recommended Models for ARA-Eval

LLM-as-judge evaluation requires models that reliably produce structured JSON, follow detailed rubrics, and reason about nuanced risk dimensions. This document lists recommended models by tier, with their OpenRouter model IDs and pricing.

## Selection Criteria

For ARA-Eval's risk fingerprinting pipeline, the judge model must:

1. **Follow structured output format** — return valid JSON matching the 7-dimension schema consistently
2. **Reason about regulatory nuance** — distinguish between HK-specific regulatory levels (HKMA, SFC, PCPD, PIPL)
3. **Maintain persona consistency** — produce meaningfully different classifications across ConFIRM personality variants
4. **Provide calibrated reasoning** — one-sentence justifications that align with the assigned level

## Model Tiers

### Tier 1: Recommended (Best Judge Quality)

These models have the strongest instruction-following and reasoning for structured evaluation tasks.

| Model | OpenRouter ID | Input/1M | Output/1M | Context | Notes |
|-------|---------------|----------|-----------|---------|-------|
| Claude Opus 4.6 | `anthropic/claude-opus-4.6` | $5.00 | $25.00 | 1M | Most capable reasoning; best for establishing reference fingerprints |
| Claude Sonnet 4.6 | `anthropic/claude-sonnet-4.6` | $3.00 | $15.00 | 1M | Strong balance of quality and cost; 128K max output |
| Gemini 2.5 Pro | `google/gemini-2.5-pro` | $1.25 | $10.00 | 1M | Excellent reasoning at lower cost; good structured output |

### Tier 2: Good (Cost-Effective)

Solid judge quality at significantly lower cost. Good for iterating on scenarios and running batch evaluations.

| Model | OpenRouter ID | Input/1M | Output/1M | Context | Notes |
|-------|---------------|----------|-----------|---------|-------|
| **Qwen3 235B Instruct** | `qwen/qwen3-235b-a22b-2507` | **$0.07** | **$0.10** | 262K | 235B MoE (22B active), strong instruction following, multilingual, tool-calling; extremely cheap for its capability class |
| Qwen3 235B | `qwen/qwen3-235b-a22b` | $0.46 | $1.82 | 131K | Base model with thinking/non-thinking modes; more expensive but supports reasoning chains |
| Claude Sonnet 4 | `anthropic/claude-sonnet-4` | $3.00 | $15.00 | 200K | Proven judge model; current default in lab-01 |
| GPT-4.1 | `openai/gpt-4.1` | $2.00 | $8.00 | 1M | Good structured output; competitive pricing |
| Gemini 2.5 Flash | `google/gemini-2.5-flash` | $0.30 | $2.50 | 1M | Fast; good for batch runs |
| Claude Haiku 4.5 | `anthropic/claude-haiku-4.5` | $1.00 | $5.00 | 200K | Fast and cheap; good for iteration |

### Tier 3: Budget (High Volume / Experimentation)

Use for rapid prototyping, testing pipeline changes, or running large scenario sweeps where per-call cost matters.

| Model | OpenRouter ID | Input/1M | Output/1M | Context | Notes |
|-------|---------------|----------|-----------|---------|-------|
| DeepSeek V3 | `deepseek/deepseek-chat` | $0.32 | $0.89 | 164K | Very cheap; test structured output compliance before relying on it |
| DeepSeek R1 | `deepseek/deepseek-r1` | $0.70 | $2.50 | 64K | Reasoning model; may over-think simple classifications |
| GPT-4.1 Mini | `openai/gpt-4.1-mini` | $0.40 | $1.60 | 1M | Good for pipeline testing |
| o4-mini | `openai/o4-mini` | $1.10 | $4.40 | 200K | Reasoning model; good for complex scenarios |

## Cost Estimates

Each ARA-Eval run evaluates 6 scenarios x 3 personalities = 18 LLM calls.

| Model | Est. Cost per Run | Notes |
|-------|-------------------|-------|
| **Qwen3 235B Instruct** | **~$0.003** | Current default — needs eval to confirm judge quality |
| Gemini 2.5 Flash | ~$0.03 | Good alternative if Qwen output is inconsistent |
| Claude Sonnet 4.6 | ~$0.50 | Premium quality baseline |
| Claude Opus 4.6 | ~$0.90 | Use for establishing reference fingerprints |

## Changing the Model

In `labs/lab-01-risk-fingerprinting.py`, update the `MODEL` constant:

```python
MODEL = "google/gemini-2.5-flash"  # or any OpenRouter model ID
```

## Multi-Model Comparison

A valuable lab exercise is running the same scenarios across multiple judge models to measure inter-model agreement — analogous to inter-annotator agreement in human evaluation. This surfaces which dimensions are most sensitive to model choice and which are robust.

## Sources

- [OpenRouter Rankings](https://openrouter.ai/rankings)
- [OpenRouter Models](https://openrouter.ai/models)
- [AI API Pricing Comparison 2026](https://dev.to/lemondata_dev/ai-api-pricing-comparison-2026-the-real-cost-of-gpt-41-claude-sonnet-46-and-gemini-25-11co)
- [LLM-as-a-Judge Guide (Label Your Data)](https://labelyourdata.com/articles/llm-as-a-judge)
- [LLM-as-a-Judge Guide (Evidently AI)](https://www.evidentlyai.com/llm-guide/llm-as-a-judge)
