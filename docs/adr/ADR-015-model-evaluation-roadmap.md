# Model Evaluation Roadmap

**Status:** Accepted (updated 2026-03-22)
**Date:** 2026-03-22
**Context:** Tracking which models have been tested, results, and what to test next. Updated after running Gemini 2.5 Flash Lite, Qwen3 235B, Grok 4.1 Fast, and DeepSeek v3.2 through lab-01.

## Current Leaderboard (11 models, as of 2026-03-22)

| Rank | Model | Method | A-Gate Recall | Calibration | Bias |
|------|-------|--------|--------------|-------------|------|
| 1 | Claude Opus 4.6 | subagent | 100% | 87% | calibrated |
| 2 | Gemini 2.5 Flash Lite | api | 100% | 60% | calibrated |
| 3 | Qwen3 235B | api | 100% | 66% | calibrated |
| 4 | Claude Opus 4.6 | manual | 87% | 89% | calibrated |
| 5 | Claude Sonnet 4.6 | subagent | 92% | 39% | jittery |
| 6 | Grok 4.1 Fast | api | 87% | 67% | noisy |
| 7 | DeepSeek v3.2 | api | 80% | 61% | sleepy |
| 8 | Hunter Alpha | api | 73% | 43% | noisy |
| 9 | Healer Alpha | api | 60% | 49% | sleepy |
| 10 | Arcee Trinity | api | 53% | 48% | sleepy |
| 11 | Claude Haiku 4.5 | subagent | 7% | 6% | broken |

## Questions Answered

1. **Is the calibration cliff Opus-specific?** Partially answered. Gemini (60%), Qwen3 (66%), and Grok (67%) narrow the gap from the previous 43–49% cluster but don't close it. Opus manual (89%) still leads by 22+ points. The cliff is narrowing but Opus-level calibration remains unique.

2. **Is instruction-following the bottleneck for smaller models?** Yes, for Haiku specifically. Qwen3 235B (a large but open-weight model) followed the structured output format perfectly with 18/18 completion. Haiku's failure is model-specific, not a size-class problem.

3. **Do Chinese models handle HK/PIPL differently?** Qwen3 235B achieved perfect gate recall with the lowest differentiation (19%) — its personas almost always agree. This could mean genuine convergence or lack of engagement with stakeholder perspectives. More Chinese models needed to separate the signal.

## Next Priority — Models Still Worth Testing

### Tier 1: Fill remaining frontier gaps

| Model | OpenRouter ID | Cost | Rationale | Status |
|-------|--------------|------|-----------|--------|
| **GPT-5.4** | `openai/gpt-5.4` | ~$2.50/M in | Only major frontier family not yet tested. Does OpenAI match Opus on calibration? | **Not yet tested** |
| **Gemini 3.1 Pro** | `google/gemini-3.1-pro` | ~$2.00/M in | We tested Flash Lite (60% calibration). Does the full Pro model do better? Led 13/16 benchmarks at release. | **Not yet tested** |

### Tier 2: Chinese frontier models (answer question #3 more fully)

| Model | Rationale | Status |
|-------|-----------|--------|
| **GLM-5 (744B)** | S-tier leaderboards, top-3 Chatbot Arena ELO. Chinese training data likely includes PIPL context. | **Not yet tested** |
| **Kimi K2.5 (1T)** | S-tier, 1T params. Another Chinese frontier contender. | **Not yet tested** |
| **Qwen 3.5 (397B)** | Newer than the Qwen3 235B we tested. May improve calibration. | **Not yet tested** |

### Tier 3: Free/cheap models to expand the middle tier

| Model | Rationale | Status |
|-------|-----------|--------|
| **Step 3.5 Flash** | Free, S-tier open source. Quick test to fill the middle. | **Not yet tested** |
| **DeepSeek V3.2 Speciale** | High-compute variant of V3.2 we already tested. Does more compute help? | **Not yet tested** |

## Completed (already on leaderboard)

| Model | When Tested | Key Finding |
|-------|------------|-------------|
| Claude Opus 4.6 (subagent) | 2026-03-21 | Perfect gate detection, 87% calibration |
| Claude Opus 4.6 (manual) | 2026-03-21 | Best calibration (89%), missed 2 gates |
| Hunter Alpha | 2026-03-21 | Best free API model at launch, noisy |
| Healer Alpha | 2026-03-21 | No compelling advantage |
| Arcee Trinity | 2026-03-21 | Stable baseline, sleepy bias |
| Claude Sonnet 4.6 | 2026-03-22 | Strong gates (92% recall), poor calibration (39%) |
| Claude Haiku 4.5 | 2026-03-22 | Instruction-following failure, F2 0.08 |
| Gemini 2.5 Flash Lite | 2026-03-22 | Perfect gate recall, 60% calibration, fastest model (71s) |
| Qwen3 235B | 2026-03-22 | Perfect gate recall, 66% calibration, lowest differentiation (19%) |
| Grok 4.1 Fast | 2026-03-22 | Solid mid-tier, best API calibration (67%), noisy bias |
| DeepSeek v3.2 | 2026-03-22 | Sleepy bias, 1 eval failure, 61% calibration |

## Not Recommended

| Model | Why Skip |
|-------|----------|
| **Healer Alpha** | Already tested, no advantage. |
| **DeepSeek V4** | Not available as of 2026-03-22. Multiple release windows passed. Revisit when released. |
| **GPT-5.4 Pro** | $30/M input. Test GPT-5.4 standard first. |

## Key Remaining Question

**Can any model close the calibration gap to Opus manual (89%)?** Grok at 67% is the closest API model. GPT-5.4 and Gemini 3.1 Pro are the most likely candidates to push higher. If neither breaks 75%, calibration may require qualitatively different reasoning that only Opus-tier models provide.

## References

- [LLM Leaderboard 2026](https://llm-stats.com/leaderboards/llm-leaderboard)
- [OpenRouter Models](https://openrouter.ai/models)
- [OpenRouter DeepSeek Models](https://openrouter.ai/deepseek)
- [DeepSeek V4 Status (March 2026)](https://www.promptzone.com/xi_ji_5529a8f31595759f429/deepseek-v4-status-report-march-2026-timeline-and-technical-specs-2hib)
