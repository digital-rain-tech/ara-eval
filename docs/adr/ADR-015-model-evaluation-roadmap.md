# Model Evaluation Roadmap

**Status:** Accepted
**Date:** 2026-03-22
**Context:** With 7 models tested (Opus subagent/manual, Sonnet, Haiku, Hunter Alpha, Healer Alpha, Arcee Trinity), we need to expand the leaderboard to answer key open questions. This ADR documents which models to test next and why.

## Open Questions

1. **Is the dimension-match cliff Opus-specific?** Opus scores 87–89% dimension match. Everything else clusters at 39–49%. Do other frontier models bridge this gap, or is it unique to Opus?
2. **Is instruction-following the bottleneck for smaller models?** Haiku failed entirely on structured output compliance. Is this a small-model problem or a Haiku-specific one?
3. **Do Chinese frontier models handle HK/PIPL scenarios differently?** The benchmark is HK-focused with heavy PIPL cross-border content. Chinese models may have different regulatory priors.

## Priority 1 — Frontier Model Comparison (Budget: ~$10 total)

These answer question #1 and give us the three major commercial families + best open-weight.

| Model | OpenRouter ID | Cost (per 1M input) | Rationale |
|-------|--------------|---------------------|-----------|
| **GPT-5.4** | `openai/gpt-5.4` | ~$2.50 | OpenAI flagship. 1M context, computer use. The obvious comparison to Opus. |
| **Gemini 3.1 Pro** | `google/gemini-3.1-pro` | ~$2.00 | Led 13/16 benchmarks at release. 77.1% ARC-AGI-2 suggests strong reasoning. Best price-to-performance among closed frontier. |
| **DeepSeek V3.2** | `deepseek/deepseek-v3.2` | ~$0.27 | Best available DeepSeek (V4 not yet released as of 2026-03-22). Strong reasoning, very cheap. |

**Note on DeepSeek V4:** Repeatedly rumored for early March 2026 but has not launched. Multiple release windows have passed. When it becomes available, it should be tested as a priority addition. Track at `openrouter.ai/deepseek`.

## Priority 2 — Chinese Frontier Models (Free or cheap)

These answer question #3. Chinese models may have materially different regulatory intuitions on PIPL/cross-border scenarios — the most technically demanding content in the benchmark.

| Model | OpenRouter ID | Cost | Rationale |
|-------|--------------|------|-----------|
| **GLM-5 (744B)** | Check OpenRouter | TBD | S-tier on multiple leaderboards. Top-3 Chatbot Arena ELO. Chinese training data likely includes PIPL context. |
| **Kimi K2.5 (1T)** | Check OpenRouter | TBD | Also S-tier, 1T params. Strong contender for best open-source model globally. |
| **Qwen 3.5 (397B)** | `qwen/qwen-3.5` or similar | Free | S-tier open source. Tests whether latest Qwen generation follows structured output format (Haiku couldn't). |

## Priority 3 — Instruction-Following Hypothesis (Free)

These answer question #2. If GPT-4o-mini and other small models also fail on structured output, the problem is model size. If they succeed, it's Haiku-specific.

| Model | OpenRouter ID | Cost | Rationale |
|-------|--------------|------|-----------|
| **Qwen3 Coder 480B** | Free on OpenRouter | $0 | Coding models are often strongest at structured JSON compliance. |
| **Step 3.5 Flash** | Free on OpenRouter | $0 | S-tier open source, 256K context. Quick test. |

## Not Recommended

| Model | Why Skip |
|-------|----------|
| **Healer Alpha** | Already tested, no compelling advantage. |
| **DeepSeek V4** | Not available as of 2026-03-22. Revisit when released. |
| **GPT-5.4 Pro** | $30/M input is too expensive for 18 evals without clear justification. Test GPT-5.4 first. |

## Execution Plan

1. Run Priority 1 models through `lab-01` with `ARA_MODEL=<id>` override
2. Score against reference fingerprints using existing pipeline
3. Update `shared/leaderboard.json` and `shared/models.json`
4. Write versioned commentary for the new snapshot on ara-eval-site
5. If any Priority 1 model bridges the dimension-match gap, investigate why (rubric sensitivity? reasoning depth?)

## Cost Estimate

| Tier | Models | Evals | Est. Cost |
|------|--------|-------|-----------|
| Priority 1 | 3 | 54 (18 each) | ~$5–8 |
| Priority 2 | 2–3 | 36–54 | ~$0–3 (mostly free) |
| Priority 3 | 2 | 36 | $0 (free) |
| **Total** | **7–8** | **126–144** | **~$5–11** |

## References

- [LLM Leaderboard 2026](https://llm-stats.com/leaderboards/llm-leaderboard)
- [OpenRouter Models](https://openrouter.ai/models)
- [OpenRouter DeepSeek Models](https://openrouter.ai/deepseek)
- [DeepSeek V4 Status (March 2026)](https://www.promptzone.com/xi_ji_5529a8f31595759f429/deepseek-v4-status-report-march-2026-timeline-and-technical-specs-2hib)
- [GPT-5.4 vs Claude Opus 4.6 vs DeepSeek V4 vs Gemini 3.1](https://tech-insider.org/chatgpt-vs-claude-vs-deepseek-vs-gemini-2026/)
