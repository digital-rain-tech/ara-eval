# ADR-006: The Deterministic–Interpretive Spectrum

**Status:** Accepted
**Date:** 2026-03-13

## Context

ADR-005 documents why gating rules are deterministic code rather than LLM output. But that decision is one instance of a broader design principle that runs through the entire framework: **every component sits somewhere on a spectrum from fully deterministic to fully interpretive, and the placement is deliberate.**

This document captures the spectrum, explains the design choices at each layer, and frames it as a teaching tool for students learning to build production AI systems.

## The Spectrum

```
fully deterministic ←—————————————————————→ fully interpretive

  gating       structured     rubric        personality      scenario
  rules        input fields   anchors       framing          narrative
  (code)       (JSON schema)  (prompt)      (system prompt)  (user prompt)
```

Everything to the left is auditable, reproducible, and debuggable. Everything to the right is where judgment, nuance, and contextual reasoning live. The design question at each layer is: **how far left can you push this piece without losing the nuance you need?**

### Layer by layer

**1. Gating rules (fully deterministic)**

`if levels["regulatory_exposure"] == "A"` — boolean logic on strings. No ambiguity, no interpretation, no model dependency. The same 7 letters always produce the same readiness classification. This is the rightmost boundary of what code should own.

See ADR-005 for the full rationale. The key insight: the gating rules don't add logic the rubric doesn't already contain. They enforce that the LLM's own structured output is taken seriously — the LLM can't talk itself out of its own ratings in the interpretation field.

**2. Structured input fields (mostly deterministic)**

The `--structured` flag decomposes a scenario narrative into explicit fields: subject, object, action, regulatory triggers, time pressure, confidence signal, reversibility, blast radius.

This is a deliberate leftward push. Instead of asking the LLM to extract "who is acting on what" from a paragraph of prose, we hand it the answer. The LLM still interprets — it must judge whether "payment recoverable but operationally costly" constitutes Level B or Level C reversibility — but it can no longer misidentify the subject or miss a regulatory trigger buried in the narrative.

Lab 01 results validate this: structured input improved hard-gate accuracy on algo-trading from 1/3 personalities to 3/3. The LLM wasn't reasoning differently — it was reasoning about the right things, because we removed the extraction step.

The pedagogical lesson: **structuring input is itself a form of moving work from the interpretive layer to the deterministic layer.** The tradeoff is that someone (or some other LLM) must do the structuring — you're not eliminating interpretation, you're relocating it to a place where it can be verified before it enters the pipeline.

**3. Rubric anchors (constrained interpretation)**

The rubric defines what each level means for each dimension: "Level A for Regulatory Exposure means direct regulatory mandate applies, breach would trigger enforcement action." These anchors attempt to narrow the space of reasonable disagreement — to make interpretation more reproducible without eliminating it.

Lab 02 tests the tightness of this constraint. When jurisdiction grounding is added (explicit regulatory citations vs just framework names), Regulatory Exposure classifications shift stricter in 6/16 cases. This tells us the rubric anchors aren't tight enough on their own — the LLM needs the actual regulatory text to classify reliably. The anchors constrain, but they don't determine.

Lab 03 tests whether the rubric produces consistency under repetition. At 76-86% modal agreement, the rubric is doing meaningful constraining work (pure chance across 4 levels would yield ~25%), but it's not tight enough to be deterministic. The remaining variance is genuine interpretive disagreement — the kind that exists between human experts too.

**4. Personality framing (structured interpretation)**

ConFIRM personality variants (compliance officer, CRO, operations director) are system-prompt instructions that shape how the LLM reasons. They're interpretive — different personalities produce different fingerprints for the same scenario — but they're structured interpretation. The personality is fixed per evaluation, explicitly labeled, and the disagreement between personalities is measured (personality deltas).

This is an important design choice: rather than asking "what's the right classification?" (which implies a single answer), the framework asks "what does a compliance officer think?" and "what does a CRO think?" and then surfaces the disagreement. The interpretive layer is not hidden — it's made visible and comparative.

The pedagogical lesson: **you can't eliminate perspective from risk assessment, but you can make it explicit and measurable.** The personality framing moves interpretation from an invisible bias into a named, trackable variable.

**5. Scenario narrative (fully interpretive)**

The scenario text is free-form prose describing a situation: "An AI claims processing agent is about to approve and disburse a HK$180,000 health insurance claim..." This is the rawest, most interpretive input. The LLM must read, comprehend, extract relevant facts, and map them to the rubric.

This is deliberately the rightmost layer. Real-world risk scenarios arrive as narratives — incident reports, regulatory filings, operational descriptions. The framework needs to handle them as-is, because that's what practitioners actually work with. Pushing scenarios further left (e.g., requiring all scenarios in structured format) would make the framework more deterministic but less realistic.

The `--structured` flag exists precisely to let students explore this tradeoff: same scenario, structured vs narrative, compare the results.

## The Design Principle

**Push each component as far left (deterministic) as you can without losing the nuance that component needs to provide.**

- Gating rules need no nuance — they're policy. Push them all the way left.
- Input structure reduces ambiguity without eliminating judgment. Push it left when you can verify the structure.
- Rubric anchors constrain interpretation. Make them as specific as possible, but accept they can't be exhaustive.
- Personality framing is intentionally interpretive — but make the interpretation named and measurable, not hidden.
- Scenario narratives must stay interpretive — that's the reality the framework exists to handle.

The mistake most teams make when building AI systems is leaving everything at the right end of the spectrum — one big prompt, one LLM call, one output. When something goes wrong, they can't tell which part failed. The framework's layered architecture lets students see exactly where interpretation lives, where determinism lives, and what happens when you move the boundary.

## Why This Matters Beyond the Classroom

This spectrum maps directly onto how production AI systems should be architected:

- **Retrieval-augmented generation (RAG):** The retrieval step (which documents to fetch) can be made mostly deterministic. The generation step (what to say about them) is interpretive. Systems that let the LLM decide what to retrieve conflate the two layers.
- **Agentic workflows:** Tool selection and execution are deterministic. Deciding *when* to use a tool and *what parameters* to pass involves interpretation. Guardrails belong in the deterministic layer.
- **Compliance automation:** Regulatory classification involves interpretation. The policy response to a classification ("block this transaction," "escalate to compliance") should be deterministic. This is exactly the ARA-Eval architecture.

The general principle: **wherever you have a boundary between "what the AI thinks" and "what the system does about it," that boundary should be an explicit, auditable seam — not a continuation of the same LLM call.**

## Consequences

- The framework's architecture is not incidental — the separation of layers is the curriculum. Students should be asked to identify where each layer sits on the spectrum and justify whether the placement is correct.
- New features should be evaluated against this spectrum: does the feature push a component leftward (more deterministic, more auditable) or rightward (more flexible, more nuanced)? Both are valid — but the choice should be conscious.
- The `--structured` flag is the most explicit teaching tool for this principle. Running Lab 01 with and without it demonstrates what happens when you move the input layer leftward.
- Future labs could explore moving other layers: What happens with a more specific rubric (tighter anchors)? What happens with more personality variants (more interpretive diversity)? Each experiment probes a different point on the spectrum.

## Related

- **ADR-005:** Deterministic gating — the leftmost point on the spectrum, and the detailed rationale for why policy lives in code.
- **ADR-004:** Recursive pedagogy — the recursion is visible *because* of the layered architecture. If the LLM did everything in one pass, the recursion would be opaque.
- **ADR-001:** Experimental knobs — each knob corresponds to a layer on the spectrum. The knobs are independent precisely because the layers are separated.
- **Lab 01 (`--structured` vs narrative):** Empirical test of moving the input layer leftward. Algo-trading hard-gate accuracy: 1/3 → 3/3.
- **Lab 02 (grounding):** Empirical test of tightening the rubric layer. Regulatory Exposure shifts stricter in 6/16 cases.
- **Lab 03 (reliability):** Measures how deterministic the interpretive layers actually are under repetition. 76-86% — constrained but not determined.
