# ADR-001: Experimental Knobs for ARA-Eval

**Status:** Proposed
**Date:** 2026-03-11

## Context

ARA-Eval uses LLM-as-judge to produce 7-dimension risk fingerprints. The architecture (Mustache templates, OpenRouter routing, SQLite logging) already supports swapping components. We need to decide which experimental variables ("knobs") to prioritise for validating the framework's reliability and sensitivity.

## Knobs Identified

### Tier 1 — Config-only (no new code)

| Knob | What changes | Implementation |
|------|-------------|----------------|
| **Model** | Which LLM acts as judge | Change `MODEL` env var or constant. SQLite already logs `model_requested` vs `model_used`. |
| **Personality** | Stakeholder perspective | Add `.md` to `prompts/personalities/` + registry entry. Candidates: external auditor, product owner, end customer, board member. |
| **Jurisdiction** | Regulatory context | Add `.md` to `prompts/jurisdictions/` + registry entry. Candidates: `sg`, `eu-aia`, `us-fed`. |

### Tier 2 — One knob, one lab each

| Knob | What changes | Measures |
|------|-------------|----------|
| **Rubric granularity** | Swap `rubric.md` for `rubric-minimal.md` (dimension names + levels only, no detailed descriptions) | How much the LLM reasons from our rubric vs its priors |
| **Temperature** | Pass `temperature` to OpenRouter (0.0, 0.3, 0.7, 1.0) | Classification stability — if a scenario flips at different temps, the rubric boundary is ambiguous |
| **Scenario specificity** | "Vague" variant of each scenario (remove numbers, timelines, system details) | Whether the judge is sensitive to detail or pattern-matching on domain keywords |
| **Jurisdiction grounding** | Names-only vs full regulatory requirements | Already built as Lab 02 |

### Tier 3 — More ambitious

| Knob | What changes | Measures |
|------|-------------|----------|
| **Chain-of-thought ordering** | Classify-first-then-justify vs justify-then-classify | Output ordering effects on classification |
| **Few-shot anchoring** | Add 1-2 reference fingerprints as examples in system prompt | Whether example fingerprints bias the judge |
| **Adversarial scenarios** | Edge cases: low-risk on 6 dims, catastrophic on 1 | Gating rule robustness with asymmetric profiles |
| **Multi-turn deliberation** | Classify, present counter-argument, re-classify | Conviction stability under challenge |

## Priority Recommendation

1. **Model comparison** (Lab 03) — directly tests reproducibility, the core credibility question
2. **Temperature stability** (Lab 04) — tests whether classifications are noise or signal
3. **Rubric granularity** (Lab 05) — tests whether detailed dimension definitions actually matter

These three, combined with the existing jurisdiction grounding experiment (Lab 02), cover the main threats to LLM-as-judge validity: model dependence, stochastic variance, prompt sensitivity, and knowledge grounding.

## Decision

Proceed with rubric-minimal as the next immediate knob (Tier 2, lowest effort — just a new template file). Design Labs 03-05 incrementally.
