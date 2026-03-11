# ADR-004: The Recursive Pedagogy — Using AI to Teach Judgment About AI

**Status:** Accepted
**Date:** 2026-03-11

## Context

ARA-Eval uses an LLM judge to evaluate whether AI agents should be trusted with autonomous decisions. This is deliberately recursive: an AI system evaluates AI autonomy readiness. This document captures why the recursion is a feature, not a bug, and how it serves the course's pedagogical goals.

## The Recursion

Students use an LLM to produce 7-dimension risk fingerprints for scenarios involving autonomous AI agents. Along the way, they discover:

- **Lab 03 (Intra-Rater Reliability):** The LLM disagrees with itself across runs. The instrument is stochastic. If the judge can't produce stable classifications, what does that say about trusting AI judgment in the scenarios it's evaluating?
- **Lab 02 (Grounding):** Showing the LLM the actual regulation (vs just the name) changes its classifications — even though the information is likely in its training data. The judge is sensitive to framing, not just facts.
- **Lab 01 (Personalities):** The same scenario gets different risk fingerprints depending on which stakeholder perspective the LLM adopts. The "right" classification depends on who's asking.

Each of these findings *is the lesson*. Students don't just read that AI systems are unreliable, framing-sensitive, and perspective-dependent — they measure it.

## What This Teaches

### 1. Taste

The 7 dimensions aren't a formula. They're a vocabulary for articulating *why* something feels risky. The ConFIRM personality variants force students to inhabit different stakeholder perspectives (compliance officer, CRO, operations director) and realize that risk classification depends on what you're optimizing for. There is no answer key — there's a reference fingerprint and then there's the argument you make.

### 2. Calibration

The gating rules are deliberately non-negotiable. Regulatory Exposure = A means human-in-loop, period. Students will encounter scenarios where everything else looks fine but one hard gate kills autonomy. Risk isn't an average — it's a veto. This mirrors how aviation, nuclear safety, and medicine handle automation decisions.

### 3. Skepticism About Your Own Tools

When students see the LLM flip a dimension between runs, or get stricter when given a citation it could have found in its training data, they learn to distrust LLM confidence. They're learning this *by using an LLM*, which hits differently than being told "don't trust LLMs."

### 4. The Industry Reality

The recursion isn't just pedagogical — it reflects where the industry is heading:

- Regulators are going to use AI to audit AI
- Compliance teams already use LLMs to interpret regulations about LLMs
- The HKMA GenA.I. Sandbox report (Oct 2025) explicitly validates LLM-as-Judge methodology for evaluating GenAI outputs — regulators endorsing the recursion
- The students are practicing the exact critical thinking they'll need when they're the ones deciding whether to trust the AI that's evaluating the AI

## The Pedagogical Bet

The best courses don't teach students what to think — they teach them what to notice. ARA-Eval gives students a structured way to notice the things that matter (irreversibility, blast radius, regulatory exposure, override latency) while simultaneously demonstrating why structured-but-automated judgment isn't enough on its own.

The framework is the scaffold. The taste is what they build on it.

## Why This Works Better Than a Lecture

| Traditional Approach | ARA-Eval Approach |
|---------------------|-------------------|
| "AI systems can be inconsistent" | Students measure the inconsistency themselves (Lab 03) |
| "Context matters for AI judgment" | Students see classifications shift when they add regulatory detail (Lab 02) |
| "Different stakeholders see risk differently" | Students compare fingerprints across personality variants (Lab 01) |
| "Don't blindly trust AI output" | Students are forced to evaluate AI output *about AI trustworthiness* |
| "Hard rules exist for a reason" | Students see gating rules override nuanced multi-dimensional profiles |

## Decision

Lean into the recursion. Don't hide it — make it explicit in course materials. The moment students laugh at the absurdity of using AI to judge AI autonomy is the moment they've internalized the lesson about the limits of automated judgment.
