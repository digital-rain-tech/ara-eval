# ADR-005: Deterministic Gating — Separating Judgment from Policy

**Status:** Accepted
**Date:** 2026-03-13

## Context

ARA-Eval uses an LLM judge to classify scenarios across 7 risk dimensions (A-D levels). Those classifications then feed into gating rules that determine readiness: Ready Now, Ready with Prerequisites, or Human-in-Loop Required.

A natural question arises: why not let the LLM make the readiness determination directly? It already has the scenario context, the rubric, and the personality framing. Adding one more output field ("readiness_classification") would be trivial.

## Decision

**Gating rules are deterministic code, never delegated to the LLM.**

The function `apply_gating_rules()` takes 7 letters (the dimension levels) and applies boolean logic:

- Regulatory Exposure = A → hard gate → human-in-loop required
- Failure Blast Radius = A → hard gate → human-in-loop required
- Any other dimension = A → soft gate → requires documented risk acceptance
- All dimensions C or D → ready now
- Otherwise → ready with prerequisites

The scenario narrative is not an input to this function. It operates entirely on the LLM's structured output.

## Rationale

**1. Separation of probabilistic judgment from deterministic policy.**

The LLM's job is classification: "given this scenario, is Regulatory Exposure high or low?" That's a judgment call — inherently probabilistic, sensitive to framing (ADR-001, Lab 02), and stochastic across runs (Lab 03). Reasonable people (and LLMs) disagree.

But the policy response to that classification should not be debatable. If Regulatory Exposure is Level A, autonomy is not permitted. Full stop. That's a business rule, not an inference. Encoding it as `if levels["regulatory_exposure"] == "A"` makes it auditable, testable, and immune to prompt variation.

This is the same pattern used in production risk systems:
- A credit model estimates probability of default (probabilistic). The approval threshold is a business rule (deterministic).
- A fraud model scores transactions (probabilistic). The block/allow cutoff is policy (deterministic).
- A medical diagnostic model classifies findings (probabilistic). The treatment protocol given that classification is clinical guidelines (deterministic).

**2. Hard gates must be incorruptible.**

If gating were delegated to the LLM, a sufficiently persuasive scenario narrative could talk the model out of blocking autonomy — even when it correctly identified Regulatory Exposure as Level A. This is not hypothetical. Lab 02 demonstrates that adding jurisdiction grounding shifts classifications. A model that can be shifted toward "stricter" can also be shifted toward "looser."

Deterministic gating means the hard gates cannot be circumvented by prompt engineering, model choice, or narrative framing. The only way to change the policy is to change the code — which requires a code review, not a prompt tweak.

**3. Pedagogical clarity.**

Students can reason about two distinct questions separately:

- "Is the LLM *right* that this is Level A?" — This is the interesting, debatable question. It's where personality variants disagree, where structured inputs improve accuracy, where model choice matters.
- "Given that it's Level A, what happens?" — This is not debatable. It's just code. Students can read the function and verify the logic in 30 seconds.

Conflating these two questions (by letting the LLM do both) would make it impossible to isolate whether a wrong readiness classification came from bad judgment or bad policy application. Separation makes the framework's failure modes legible.

**4. Reproducibility across models.**

Lab 03 shows 76-86% intra-rater reliability on dimension classifications with the free-tier model. If the gating decision were also probabilistic, the overall reliability of the readiness classification would compound that noise. With deterministic gating, the readiness classification is as reliable as the weakest hard-gate dimension — and Lab 03 shows that Regulatory Exposure = A fires at 80%+ consistency even on a free model.

## Consequences

- Gating rules must be maintained as code, not as part of the LLM prompt. Changes to policy require a code change and commit.
- The LLM is never asked to produce a readiness classification. If it volunteers one (in the `interpretation` field), that's informational only — the code overrides it.
- New gating rules (e.g., for new jurisdictions or industries) are added to `apply_gating_rules()`, not to the rubric prompt.
- Students analyzing results should always distinguish between "the LLM classified wrong" and "the gate logic is wrong" — these are different failure modes with different fixes.

## Related

- **ADR-001:** Experimental knobs — gating rules are intentionally *not* a knob. They are fixed policy.
- **ADR-004:** Recursive pedagogy — the separation makes the recursion legible. Students can see exactly where AI judgment ends and human-authored policy begins.
- **Lab 02 findings:** Jurisdiction grounding shifts Regulatory Exposure classifications, demonstrating that the LLM's judgment is malleable. This is precisely why gating must not be.
- **Lab 03 findings:** 76-86% intra-rater reliability on classifications. Deterministic gating prevents this noise from compounding into the readiness decision.
