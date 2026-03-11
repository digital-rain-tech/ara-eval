# ADR-002: Experimental Design Review

**Status:** Accepted
**Date:** 2026-03-11

## Honest Assessment

This document reviews the ARA-Eval experimental design critically — what's strong, what's weak, what's missing, and what we should do about it.

---

## What's Strong

### 1. Separation of LLM judgment from deterministic policy
The core design decision — LLM classifies dimensions, gating rules are applied programmatically — is the right call. It means the gating logic is testable, auditable, and not subject to LLM variance. This is the most important architectural choice in the project.

### 2. Full provenance logging
Every request/response is logged with model, provider, tokens, cost, latency, and the raw content. This makes every experiment reproducible and auditable. Good.

### 3. Modular prompt composition
Mustache templates with swappable jurisdictions, personalities, rubrics, and output formats mean each experimental variable is isolated. A new experiment is a new combination of existing files, not new code.

### 4. Reference fingerprints in scenarios
Each scenario has a hand-crafted reference fingerprint. This gives a baseline to measure LLM judge accuracy against human expert judgment, which is the ground truth question.

---

## What's Weak

### 1. No repeated measurements (N=1 per cell)
**This is the most critical gap.** Lab 01 runs each scenario × personality exactly once. Lab 02 runs each condition exactly once. With N=1, you cannot distinguish signal from noise. An LLM at temperature > 0 (even the default) can produce different classifications on the same input. Without repetition, every observed difference could be stochastic.

**Fix:** Every experiment should run each cell at least 3 times (ideally 5). Report the modal classification per dimension and the agreement rate. A dimension that's "B" three out of five times is meaningfully different from one that's "B" five out of five times.

### 2. No statistical framework for comparison
Lab 02 computes shifts (hk vs hk-grounded) but has no way to say whether a shift is meaningful. If you observe 4/18 dimensions shift, is that significant? With ordinal A-B-C-D data, you need something like Cohen's kappa (inter-rater agreement) or Krippendorff's alpha, not just counts.

**Fix:** Add agreement metrics. At minimum, compute:
- **Exact match rate**: % of dimensions where two conditions agree
- **Cohen's kappa**: Agreement corrected for chance
- **Per-dimension stability**: how often each dimension gives the same level across repeated runs

### 3. Shift direction is confusingly defined
In `compare_fingerprints()`, `shift = LEVEL_ORDER[level_a] - LEVEL_ORDER[level_b]` where LEVEL_ORDER is `{"A": 0, "B": 1, "C": 2, "D": 3}`. So a shift from B→A is `1 - 0 = 1`, which `print_comparison()` labels "STRICTER". But the comment says "negative = grounded is stricter". The comment contradicts the code. When hk=B and hk-grounded=A, shift=1, which is correctly "STRICTER" (grounded made it higher risk). But the comment says the opposite.

**Fix:** Remove the misleading comment. Better yet, make the semantics explicit: shift > 0 means condition A was *lower risk* than condition B (i.e., grounding made it stricter).

### 4. The "minimal" rubric isn't minimal enough
`rubric-minimal.md` still names the dimensions and the A-D scale. A truly minimal rubric would test whether the LLM can classify risk with *zero* framework-specific guidance — just "evaluate the risk of this scenario on 7 dimensions." The current "minimal" is more like "rubric without examples."

**Fix:** Consider three rubric levels:
- `rubric.md` — full definitions with A/B/C/D anchors per dimension
- `rubric-compact.md` — dimension names + one-line definitions (current rubric-minimal)
- `rubric-bare.md` — just "classify this scenario's risk on a 4-level scale across 7 dimensions" with dimension names only and no definitions at all

### 5. Personality prompts may be too directive
The compliance officer prompt says "When in doubt, you classify toward higher risk (Level A or B)." The CRO prompt says "you lean toward lower risk classifications (Level C or D)." This *instructs* the LLM to bias its output, so observing bias in the output doesn't test whether stakeholder perspectives naturally diverge — it tests whether the LLM follows instructions.

**Fix:** Consider a "soft" personality variant that describes the stakeholder's priorities without explicitly instructing classification direction. E.g., "You weight regulatory exposure and accountability chain heavily. You demand audit trails." without "you classify toward higher risk."

### 6. Only 6 scenarios
The scenario library is narrow: 4 high-risk scenarios with cross-border elements, 1 medium-risk, 1 low-risk. The "easy" scenario (banking-customer-service-001) is almost trivially D-D-D-D-D-D-D. This means most of the signal comes from differentiating between A, B, and C in high-risk domains. There's no coverage of:
- Mid-range scenarios where reasonable people genuinely disagree
- Non-financial domains (healthcare, legal, HR, supply chain)
- Scenarios where different dimensions pull in opposite directions (high data confidence but high regulatory exposure)

**Fix:** Add 4-6 scenarios in the "messy middle" — scenarios designed to be ambiguous, where the "right" classification is genuinely arguable. These are the scenarios where personality variants and rubric detail should matter most.

### 7. No control condition
There's no "no jurisdiction" or "generic" jurisdiction baseline. The hk vs hk-grounded comparison tells you whether grounding changes things, but not whether *any* jurisdiction context changes things relative to a neutral prompt. The LLM may already know about HKMA regulations from training data, making the "hk" condition less "names only" than intended.

**Fix:** Add a `generic.md` jurisdiction that says something like "Consider the regulatory environment applicable to this scenario" with no jurisdiction-specific references at all.

### 8. The `ai_provider_requests` table doesn't log the rubric or jurisdiction used
Lab 02 logs jurisdiction in the `eval_runs.metadata` field, but individual requests don't record which rubric template or jurisdiction was used. This makes cross-experiment comparison in the DB harder than it needs to be.

**Fix:** Add `jurisdiction` and `rubric` columns to `ai_provider_requests`, or at minimum include them in the `metadata` field of `eval_runs`.

---

## New Experimental Ideas

### 1. Intra-rater reliability (most important next experiment)
Run the same scenario × personality × jurisdiction 5 times with the same model and prompt. If the LLM doesn't agree with itself, nothing else we test matters.

**Design:** 6 scenarios × 3 personalities × 5 repetitions = 90 calls. Report:
- Per-dimension agreement rate (how often the same level across 5 runs)
- Modal classification vs minority classifications
- Which dimensions are most unstable
- Cost: ~$0.01 at Qwen3 prices

This should be **Lab 03**, not model comparison. You need to know if your instrument is reliable before you compare instruments.

### 2. Inter-rater agreement (human vs LLM)
Compare LLM fingerprints against the 6 reference fingerprints. Compute per-dimension exact match rate and Cohen's kappa. This is the ground truth validation that makes or breaks the framework's credibility.

### 3. Calibration curve
For each dimension, plot the distribution of classifications across all scenarios and personalities. If Regulatory Exposure is always "A" and Data Confidence is always "C", those dimensions aren't discriminating — they're just reflecting the scenario selection bias (mostly financial, mostly HK-regulated).

### 4. Prompt ablation study
Remove one component at a time from the system prompt and measure the effect:
- No personality → does it default to some implicit perspective?
- No jurisdiction → how much does it rely on training data vs prompt context?
- No rubric → can it still produce meaningful A-D classifications?
- No output format → does it produce structured output anyway?

This is more informative than just "full vs minimal" because it isolates each component's contribution.

### 5. Adversarial consistency
Take a scenario and make small perturbations that shouldn't change the classification:
- Change $2M to $2.1M (same category)
- Change "2:47 AM" to "3:15 AM" (same situation)
- Rephrase without changing meaning

If the LLM gives different fingerprints for semantically equivalent scenarios, that's a reliability problem the framework needs to acknowledge.

### 6. Cross-jurisdiction transfer
Write the same scenario in two jurisdictions (e.g., HK and Singapore). Test whether the framework produces meaningfully different fingerprints that reflect actual regulatory differences, or whether it just relabels the same assessment.

---

## Revised Priority

Given these findings, the recommended experiment order is:

| Lab | Experiment | Why |
|-----|-----------|-----|
| 01 | Risk fingerprinting (baseline) | Already built. Get a baseline. |
| 02 | Grounding experiment | Already built. Interesting question. |
| **03** | **Intra-rater reliability** | **Must prove the instrument is stable before testing anything else.** |
| 04 | Human vs LLM agreement | Ground truth validation. |
| 05 | Model comparison | Only meaningful after establishing single-model reliability. |
| 06 | Temperature stability | Subsumable into Lab 03 if you vary temperature there. |
| 07 | Rubric ablation | Interesting but lower priority than reliability. |

---

## Immediate Actions

1. Add `repetitions` parameter to `evaluate_scenario` calls and aggregate across runs
2. Add `jurisdiction` and `rubric` columns to request logging
3. Fix the shift direction comment in Lab 02
4. Write 4-6 ambiguous "messy middle" scenarios
5. Create `generic.md` jurisdiction as a control condition
6. Build Lab 03: intra-rater reliability
