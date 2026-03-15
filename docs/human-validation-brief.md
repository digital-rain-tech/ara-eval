# ARA-Eval: Human Validation Brief

**Date:** 2026-03-16
**Purpose:** Request domain expert review of reference fingerprints and framework calibration

---

## The Ask

We need domain expert validation of our **reference fingerprints** — the human-authored ground truth that every model is scored against. Current inter-model results show 43-49% dimension-level agreement with references across 3 models. Either the models are miscalibrated, the references need adjustment, or both. We can't tell without independent expert review.

## What We Have

**6 core scenarios** grounded in real HK financial services cases:

| Scenario | Based On | Reference Gate |
|---|---|---|
| Insurance claims processing | AIA cross-border claims | Reg=A (PIPL/PDPO) |
| Banking customer service | HSBC chatbot (low risk) | Ready Now (all D) |
| Algo trading deployment | Knight Capital $440M loss | Reg=A, Blast=A |
| GenAI data leakage | Samsung ChatGPT leak | Ready w/ prereqs (Reg=B) |
| Claims denial | UnitedHealth nH Predict | Reg=A (policyholder protection) |
| Cross-border model deployment | PIPL/PDPO model weights transfer | Reg=A (dual jurisdiction) |

**3 models tested**, all 18/18 completion:

| Model | Gate Accuracy | Dim Match | False Negatives | False Positives |
|---|---|---|---|---|
| Hunter Alpha (1T) | 81% | 43% | 4 | 3 |
| Healer Alpha (omni) | 75% | 49% | 6 | 3 |
| Arcee Trinity | 75% | 48% | 7 | 2 |

## What Validation Would Look Like

### Priority 1: Reference Fingerprint Review

For each of the 6 core scenarios, review the 7-dimension level assignments (A-D) and flag:

1. **Levels you disagree with** — e.g., "Regulatory Exposure should be B not A for insurance-claims because IA requirements don't explicitly prohibit autonomous processing"
2. **Levels where the LLM models agree with each other but disagree with the reference** — this may indicate the reference is wrong rather than the models
3. **Missing regulatory context** — jurisdiction notes that would change the assessment

### Priority 2: Dimension Calibration

The per-dimension accuracy varies significantly:

| Dimension | Best Model | Worst Model | Notes |
|---|---|---|---|
| Accountability Chain | 67% | 50% | Relatively well-calibrated |
| Failure Blast Radius | 61% | 39% | Wide model variance |
| Human Override Latency | 50% | 11% | **Models struggle here** |
| Data Confidence | 50% | 39% | Moderate |

**Human Override Latency** is the most problematic — models score 11-50%. Is our rubric definition clear enough, or does the temporal reasoning required make this inherently hard for LLMs?

### Priority 3: Scenario Gaps

Are there HK-specific regulatory scenarios we're missing? Candidates:
- Virtual bank operational resilience (HKMA)
- Insurance-linked securities (IA + SFC overlap)
- Wealth management suitability (SFC 24EC55)
- GBA data flow under Standard Contracts (Dec 2023)

## Key Discussion Questions

1. **Is 43-49% dimension match acceptable?** For governance, we care most about hard gate accuracy (75-81%). If the gates fire correctly, does exact dimension-level calibration matter, or is the ordinal ranking (A vs B vs C vs D) too granular?

2. **Should the framework tolerate model disagreement?** All 3 models agree on cross-border (Reg=A) and algo-trading (Reg=A). They disagree on claims-denial. Is this a framework problem or a feature — genuine ambiguity that different stakeholders would also disagree on?

3. **What's the minimum viable human validation process?** We want this to be reproducible. Could a 2-hour structured review session with 2-3 domain experts produce validated references? What expertise is needed — legal, compliance, operations?

## Materials Available

- Full scenario narratives with jurisdiction notes: `scenarios/starter-scenarios.json`
- Framework rubric with dimension definitions: `docs/framework.md`
- Test run report with detailed results: `docs/test-run-report.md`
- Inter-model comparison data: `results/reference/leaderboard.json`
- All ADRs documenting design decisions: `docs/adr/`
