# ADR-005: Deterministic Gating — Why the Code Holds the LLM to Its Own Words

**Status:** Accepted
**Date:** 2026-03-13

## Context

ARA-Eval uses an LLM judge to classify scenarios across 7 risk dimensions (A-D levels). Those classifications then feed into gating rules that determine readiness: Ready Now, Ready with Prerequisites, or Human-in-Loop Required.

A natural question arises: why not let the LLM make the readiness determination directly? It already has the scenario context, the rubric, and the personality framing. Adding one more output field ("readiness_classification") would be trivial.

A harder question follows: **the rubric the LLM uses to assign Level A already encodes the same logic as the gating rules.** The rubric says "Level A for Regulatory Exposure means direct regulatory mandate applies." The code says "if Regulatory Exposure = A, block autonomy." Aren't these the same thing? Is the deterministic gating actually adding anything, or is it just re-implementing what the rubric already told the LLM?

## Decision

**Gating rules are deterministic code, never delegated to the LLM.**

The function `apply_gating_rules()` takes 7 letters (the dimension levels) and applies boolean logic:

- Regulatory Exposure = A → hard gate → human-in-loop required
- Failure Blast Radius = A → hard gate → human-in-loop required
- Any other dimension = A → soft gate → requires documented risk acceptance
- All dimensions C or D → ready now
- Otherwise → ready with prerequisites

The scenario narrative is not an input to this function. It operates entirely on the LLM's structured output.

## What the separation is — and isn't

**Let's be honest about what this doesn't do.** The gating code does not apply different logic than the rubric. The criteria for "what counts as Level A" live in the prompt. The LLM is doing the real work — reading a scenario, interpreting regulatory context, and deciding whether it rises to Level A. The deterministic code downstream is just `if` statements on the LLM's output. If the LLM gets the classification wrong, the gating rules faithfully enforce the wrong classification.

**What the separation actually provides is an audit seam.** By forcing the LLM to show its work (7 explicit dimension levels) before the policy kicks in, we get three things that an end-to-end LLM approach would not:

### 1. Observability — you can see where the judgment went wrong

If the LLM does everything end-to-end and outputs "READY NOW" for algo-trading, you can't tell whether:
- It thought Regulatory Exposure was Level C (classification error)
- It correctly identified Level A but decided autonomy was still fine (policy error)
- It hallucinated a readiness label that contradicts its own dimension ratings

By requiring structured dimension-level output, then applying gating in code, you can look at the fingerprint and immediately see: "The LLM said Regulatory Exposure = B — *that's* the mistake. The gating logic was fine, it just got the wrong input."

This is the same decomposition used in production risk systems — not because the threshold logic is complex, but because you need to know which part failed:
- A credit model estimates probability of default. The approval threshold is a business rule. When a bad loan is approved, you can ask: was the score wrong, or was the threshold wrong?
- A fraud model scores transactions. The block/allow cutoff is policy. Same diagnostic question.

### 2. Consistency — the LLM can't talk itself out of its own ratings

LLMs routinely contradict themselves within a single response. An LLM might rate Regulatory Exposure as Level A in the dimensions block, then write in its interpretation: "Despite the regulatory complexity, the strong data confidence and clear accountability chain suggest this scenario is suitable for autonomy with monitoring."

This actually happened in our test runs — the `interpretation` field sometimes softened conclusions that the dimension ratings didn't support. Deterministic gating means the LLM's dimension-level classifications are taken seriously, even when the LLM's own narrative summary would walk them back.

The code enforces: **you said A, so A it is.** The LLM doesn't get to argue with its own structured output.

### 3. Composability — the knobs stay independent

If the LLM produces the final readiness classification, then model choice, rubric detail, jurisdiction grounding, and personality framing all affect the policy decision in entangled ways. You can't tell whether switching from Qwen to Claude changed the *classification* or changed the *policy application*.

With the separation, you can swap any experimental knob (model, rubric, jurisdiction, personality) and know that the gating logic is constant. The only thing that changes is the LLM's dimension-level input to the gates. This is what makes Lab 02 (grounding) and Lab 03 (reliability) interpretable — you're measuring classification sensitivity, not policy sensitivity.

### 4. Pedagogical clarity

Students can reason about two questions separately:

- "Is the LLM *right* that this is Level A?" — The interesting, debatable question. Where personality variants disagree, where structured inputs improve accuracy, where model choice matters.
- "Given that it's Level A, what happens?" — Not debatable. Just code. Students can read the function in 30 seconds.

Conflating these (by letting the LLM do both) would make it impossible to isolate whether a wrong readiness classification came from bad judgment or bad policy application. The separation makes failure modes legible.

## What this means for the framework's reliability

The real reliability bottleneck is the LLM's classification accuracy, not the gating logic. Lab 03 shows 76-86% intra-rater reliability on dimension classifications with the free-tier model. The gating code is 100% reliable by construction — `"A" == "A"` doesn't have a failure rate.

This means the framework is exactly as good as the LLM's ability to assign the right level. Deterministic gating doesn't make a bad classification better. What it does is make a bad classification *visible* — so you can diagnose it, discuss it, and decide whether to trust it.

That's the honest framing: the gating rules are not a safety net against LLM errors. They're a **legibility mechanism** that makes the LLM's errors auditable and the framework's failure modes decomposable.

## Consequences

- Gating rules must be maintained as code, not as part of the LLM prompt. Changes to policy require a code change and commit.
- The LLM is never asked to produce a readiness classification. If it volunteers one (in the `interpretation` field), that's informational only — the code overrides it.
- New gating rules (e.g., for new jurisdictions or industries) are added to `apply_gating_rules()`, not to the rubric prompt.
- Students analyzing results should always distinguish between "the LLM classified wrong" and "the gate logic is wrong" — these are different failure modes with different fixes.
- The framework's accuracy ceiling is set by the LLM's classification quality, not the gating logic. Improving accuracy means improving prompts, models, or input structure — not changing the gates.

## Related

- **ADR-001:** Experimental knobs — gating rules are intentionally *not* a knob. They are fixed policy. The rubric that *drives* gating classifications is a knob.
- **ADR-004:** Recursive pedagogy — the separation makes the recursion legible. Students can see exactly where AI judgment ends and human-authored policy begins.
- **Lab 02 findings:** Jurisdiction grounding shifts Regulatory Exposure classifications, demonstrating that the LLM's judgment is malleable. Deterministic gating ensures that *given* a classification, the policy response is constant — but it cannot prevent a bad classification from happening.
- **Lab 03 findings:** 76-86% intra-rater reliability on classifications. The gating code doesn't improve this number — it makes the number meaningful by decomposing where the noise is.
