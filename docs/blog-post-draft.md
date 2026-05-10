# Newer Isn't Better: What 25 LLMs Taught Us About Structured Output Regression

We've been running a structured evaluation framework across 25 major LLMs — 13 regulatory scenarios, 39 API calls per model, against a fixed rubric with 7 risk dimensions and an exact JSON output format. The task: classify a Hong Kong financial services scenario (loan approvals, AML screening, algorithmic trading, claims denial) and return a valid, correctly-named JSON structure. No tools. No multi-turn. Read the rubric, reason about the scenario, return the structure.

The results surprised us.

## The Headline Finding

**Gemini 2.5 Flash Lite scores 99% F2 — essentially matching Claude Opus 4.6.** At $0.10/M input and $0.40/M output, it's one of the cheapest models we tested, and it nearly matches Anthropic's flagship on a nuanced regulatory reasoning task. For context: that's roughly $0.006 per full evaluation run. If you'd told us six months ago that a budget-tier model would nearly match Opus on this kind of task, we wouldn't have believed you.

That's the good news. The bad news is what we found when we looked at model generations.

## The Regression Pattern

| Model | Release | F2 Score |
|---|---|---|
| Claude Haiku 3.5 | Oct 2024 | 92% |
| Claude Haiku 4.5 | Oct 2025 | 79% |
| DeepSeek v3.2 | Dec 2025 | 82% |
| DeepSeek V4 Flash | Apr 2026 | 79% |
| Gemini 2.5 Flash Lite | Jul 2025 | 99% |
| Gemini 3.1 Flash Lite | Mar 2026 | 92% |

Across two labs, newer models are worse at following structured output instructions. Haiku 3.5 → 4.5 drops 13 points. DeepSeek v3.2 → V4 Flash drops 3 points. Google is the counterexample — 3.1 Flash Lite holds up well at 92% — but even there, it drops 7 points from an exceptional baseline.

Worth noting: Haiku 4.5 at $0.22 per run scores identically to DeepSeek V4 Flash at $0.015. You're paying 15x more for the same result.

## Why This Is Happening

### The SOTA benchmark metagame shifted

MMLU is saturated. By late 2025, frontier models were hitting 88–94%, making it useless for differentiation. The benchmark community — and the labs — pivoted hard toward harder targets: Humanity's Last Exam, ARC-AGI 2, SWE-bench Pro, GPQA Diamond. These benchmarks reward multi-step reasoning, mathematical intuition, and agentic tool use. They don't reward "output exactly this JSON structure with exactly these field names."

When labs allocate post-training compute, they chase the benchmarks that differentiate their models in public rankings. Structured output compliance isn't on that list.

### Flash-tier models pay an efficiency tax

DeepSeek V4 Flash is a 284B total / 13B active MoE architecture, optimised for 1M-token context at ~10% of the FLOPs of v3.2. Their own technical report acknowledges that "alignment-sensitive behaviours might regress" under on-policy distillation — where the model is trained to match domain specialists rather than being directly RLHF-aligned. Instruction following gets one specialist slot; the merge dilutes it.

Haiku 4.5 added extended thinking, computer use, and a 200K context window. Something had to give, and format compliance in the chat-completion API path is apparently what gave.

### Google explicitly invested in the other direction

Gemini 3.1 Flash Lite is a distillation of Gemini 3 Pro, which included explicit instruction tuning data and RLHF in the post-training mix. Google's GA blog specifically called out "instruction-heavy chatbot workflows" and structured output as design targets, citing ~97% compliance in production labelling pipelines. That's not an accident — it's a deliberate prioritisation decision most other labs didn't make at the flash/lite tier.

Notably, Gemini 2.5 Flash Lite was released in July 2025 — before the agentic benchmark pivot fully took hold. Its exceptional 99% score may partly reflect a training window where instruction-following data was still a primary training signal rather than an afterthought.

## The Subagent Trap

One of our more revealing findings: Claude Haiku 4.5 scored 8% when evaluated as a Claude Code subagent, then 79% when evaluated directly via the API. Same model. Same rubric. Ten times different result.

The subagent version hallucinated dimension names — it understood the task conceptually but substituted its own field names for the ones specified in the rubric. This is an instruction-following failure in an *agentic* context, where the model is reasoning about what to do rather than parsing a tight prompt.

This matters for enterprise deployments. If your production system uses an orchestrator that passes tasks to subagents, you may be seeing a completely different capability profile than your direct API benchmarks suggested. The agentic instruction surface is harder, and not all models handle it equally.

## The Calibration Problem

Of our 25 models, only 4 were "calibrated" — meaning their personality-variant spread was working correctly and they weren't systematically over- or under-triggering risk gates:

- Claude Opus 4.6 (both API variants)
- Gemini 2.5 Flash Lite
- Qwen3 235B

Ten models were "sleepy" — systematically missing hard gates that should block autonomous action. For a regulatory risk framework, a sleepy model isn't just less accurate; it's actively dangerous. It will classify scenarios as safe for autonomy when they aren't.

The distinction matters in production. A jittery model (over-triggers) creates friction but is recoverable — humans override false positives. A sleepy model creates liability.

## What This Means If You're Deploying These Models

**Don't assume newer is better.** Version numbers are marketing. For structured output tasks — data extraction, classification, rubric scoring, form completion — always benchmark the specific version you plan to use against the predecessor. We found multiple cases where the newer model was measurably worse.

**Budget tier is not a proxy for quality.** Gemini 2.5 Flash Lite at ~$0.006 per run outperforms Claude Haiku 4.5 at $0.22 and GPT-5.4 Nano at $0.029. The cost-performance frontier has moved; paid tier is no longer a reliable signal.

**Test your actual integration path.** Direct API, proxy endpoint, and subagent can produce wildly different results from the same model. We saw a 10x swing on Haiku 4.5 between API and subagent paths. Benchmark in the configuration you'll deploy, not the cleanest possible harness.

**Watch for sleepy models in high-stakes workflows.** If your use case involves classifying risk or triggering human review, a model that systematically under-triggers is worse than a lower-ranked model that's calibrated. F2 score alone doesn't tell the full story — look at the false negative count.

## The Leaderboard

Full results, methodology, and all reference fingerprints are open-source at [ara-eval](https://github.com/digital-rain-tech/ara-eval). Every result is reproducible with an OpenRouter account and approximately $0.05–$0.25 depending on the model.

The framework — ARA-Eval — is designed specifically for Hong Kong financial services regulation (HKMA, SFC, PCPD, PIPL), but the core finding generalises: **if your production workload depends on structured output compliance, you need to run your own eval. Public benchmark rankings won't tell you what you need to know.**

---

*Evaluated: May 2026. Models tested via OpenRouter API using lab-01-risk-fingerprinting pipeline with structured prompts across 13 scenarios × 3 personality archetypes. F2 (beta=2) weights recall 4× over precision — appropriate for risk classification where false negatives (missed gates) are more dangerous than false positives.*
