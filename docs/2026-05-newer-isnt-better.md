# Newer Isn't Better: What 25 LLMs Taught Us About Structured Output Regression

Across three major AI labs, newer models are worse at following structured output instructions than their predecessors. We found this by accident while benchmarking 25 LLMs on a regulatory risk classification task — and the pattern held across Anthropic, DeepSeek, and (to a lesser degree) Google.

Here's what happened, why it's happening, and what it means if you depend on structured output in production.

## The Setup

We built [ARA-Eval](https://github.com/digital-rain-tech/ara-eval), a framework for classifying when enterprises can safely deploy autonomous AI agents in Hong Kong financial services. Each model reads 13 regulatory scenarios — loan approvals, AML screening, algorithmic trading, insurance claims denial — and classifies them across 7 risk dimensions, returning valid JSON with exact field names and A-D level ratings. No tools, no multi-turn, no hand-holding. Read the rubric, reason about the scenario, return the structure.

We score with F2 (F-beta, beta=2), which weights recall four times over precision. In a regulatory context, a missed risk gate — a false negative — is far more dangerous than a false alarm.

We tested 25 models via OpenRouter, each making 39 calls (13 scenarios across 3 evaluator personality archetypes). Total cost per model ranged from $0.002 to $0.22.

## The Headline

**Gemini 2.5 Flash Lite scores 99% F2 — matching Claude Opus 4.6** on nuanced regulatory reasoning. At $0.10/M input and $0.40/M output, it costs roughly a half-cent per full evaluation run. A budget-tier model, matching Anthropic's flagship. That was surprising enough.

Then we looked at what happened across model generations.

## The Regression Pattern

| Model | Release | F2 | Cost/Run |
|---|---|---|---|
| Claude Haiku 3.5 | Oct 2024 | 92% | $0.09 |
| Claude Haiku 4.5 | Oct 2025 | 79% | $0.22 |
| DeepSeek v3.2 | Dec 2025 | 82% | ~$0.01 |
| DeepSeek V4 Flash | Apr 2026 | 79% | $0.015 |
| Gemini 2.5 Flash Lite | Sep 2025 | 99% | ~$0.006 |
| Gemini 3.1 Flash Lite | Mar 2026 | 92% | $0.035 |

Anthropic: 13-point drop. DeepSeek: 3-point drop. Google: 7-point drop (from an exceptional baseline). In every case, the newer model costs more and scores lower on structured output compliance.

Haiku 4.5 at $0.22 per run scores identically to DeepSeek V4 Flash at $0.015. Fifteen times the cost, same result.

## Why This Is Happening

### The benchmark landscape shifted

MMLU is saturated — frontier models hit 88-94% by late 2025, making it useless for differentiation. Labs pivoted toward Humanity's Last Exam, ARC-AGI 2, SWE-bench Pro, and GPQA Diamond. These benchmarks reward multi-step reasoning, mathematical problem-solving, and agentic tool use. They don't reward "output exactly this JSON structure with exactly these field names."

Post-training compute follows the benchmarks that move public rankings. Structured output compliance doesn't move rankings, so it doesn't get the compute. The models get smarter at reasoning and worse at following format instructions.

### Flash-tier architecture trades compliance for efficiency

DeepSeek V4 Flash runs 284B total parameters but only 13B active (mixture-of-experts), optimised for 1M-token context at roughly 10% of v3.2's compute cost. Their technical report acknowledges that "alignment-sensitive behaviours might regress" under on-policy distillation, where the model learns from domain specialists (maths, coding, instruction-following) and merges their outputs. Instruction-following is one specialist among many; the merge dilutes its signal. The result: your JSON fields come back with slightly wrong names, or the model wraps output in markdown it wasn't asked for.

Haiku 4.5 added extended thinking, computer use, and a 200K context window. The new capabilities consumed capacity that previously went to rigid format compliance.

### Google made a different trade-off

Gemini 3.1 Flash Lite — distilled from Gemini 3 Pro — explicitly included instruction tuning data and reinforcement learning from human feedback in its post-training mix. Google's GA announcement specifically called out "instruction-heavy chatbot workflows" and structured output as design targets, citing approximately 97% compliance in production labelling pipelines. That's a deliberate prioritisation most other labs didn't make at the flash tier.

It shows: Google's regression is the smallest (7 points), from the highest baseline (99%).

## The Subagent Trap

Claude Haiku 4.5 scored **8%** when evaluated as a Claude Code subagent. Then **79%** via the direct API. Same model. Same rubric.

The subagent version understood the task but hallucinated its own dimension names — substituting "human_override_latency" for "decision_time_pressure," for example. The model reasoned correctly about the regulatory scenario but couldn't adhere to the field names in the rubric. This is instruction-following failure in an agentic context, where the model has more autonomy in how it interprets the task.

The implication for enterprise deployments: if your production system uses an orchestrator that passes tasks to subagents, your API benchmarks may be irrelevant. The agentic execution path surfaces different failure modes — ones that don't appear in direct API testing. Benchmark in the configuration you'll deploy, not the cleanest possible harness.

## The Calibration Problem

Of 25 models tested, only 4 were "calibrated" — personality-variant spread working correctly, no systematic over- or under-triggering of risk gates:

- Claude Opus 4.6 (both API variants)
- Gemini 2.5 Flash Lite
- Qwen3 235B

Ten models were "sleepy": they systematically missed hard gates that should block autonomous action. A sleepy model classifies scenarios as safe for autonomy when they aren't — it tells you the AML screening agent can run unsupervised when the HKMA mandate says otherwise.

A jittery model (over-triggers) creates friction. Humans override false positives and move on. A sleepy model creates liability. Nobody overrides a gate that never fired.

## What This Means for Production Deployments

**Don't assume newer is better.** For structured output tasks — data extraction, classification, rubric scoring, form completion — benchmark the specific version you plan to deploy against the predecessor. We found three cases across two labs where the newer model was measurably worse.

**Cost is not a proxy for quality.** Gemini 2.5 Flash Lite at roughly half a cent per run outperforms Claude Haiku 4.5 at $0.22 and GPT-5.4 Nano at $0.029. The cost-performance frontier has shifted; price tier no longer signals capability.

**Test your actual integration path.** Direct API, proxy endpoint, and subagent produce different results from the same model. We measured a 10x performance swing on Haiku 4.5 between two integration paths. The model isn't the only variable — the execution surface matters.

**Distinguish calibration from accuracy.** A 92% F2 model that's calibrated may be safer to deploy than a 95% model that's sleepy. False negatives in risk classification create exposure that no amount of accuracy on the happy path can offset.

## Reproduce It Yourself

Full results, methodology, scenarios, and reference fingerprints are open-source at [ara-eval](https://github.com/digital-rain-tech/ara-eval). A complete evaluation run takes 5-30 minutes per model and costs under $0.25 on OpenRouter.

The framework targets Hong Kong financial services regulation (HKMA, SFC, PCPD, PIPL), but the core finding generalises: **if your production workload depends on structured output compliance, public benchmark rankings won't tell you what you need to know. Run your own eval.**

---

*Evaluated May 2026. 25 models tested via OpenRouter API, 39 calls per model (13 scenarios x 3 personality archetypes). F2 (beta=2) weights recall 4x over precision — appropriate for risk classification where false negatives are more dangerous than false positives. All results and scoring code are [open-source](https://github.com/digital-rain-tech/ara-eval).*
