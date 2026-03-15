# ADR 009: Human Override Latency — Reframing as Decision Window

**Date:** 2026-03-15
**Status:** Accepted — rubric updated 2026-03-15. JSON key remains `human_override_latency` for backward compatibility with existing results.

## Context

The framework's purpose is to determine **whether a process is a candidate for autonomous agent deployment**. Dimension 4, "Human Override Latency," consistently produces the lowest inter-model accuracy (11-50%) across all tested judge models. Investigation reveals the name and rubric language are misleading LLMs — and humans — into answering the wrong question.

## The Problem

The current rubric asks about latency — how fast a human *can* respond. But the framework's actual question is: **how much time does the situation allow before a decision must be made?**

These are fundamentally different:

| Question | Insurance claim | Algo trading | Model deployment |
|---|---|---|---|
| How fast can a human respond? | Hours (queue) | Minutes (trading desk) | Days (legal review) |
| How much time does the situation allow? | Weeks (no deadline) | Sub-seconds (trades executing) | Indefinite (no deadline) |

The first question measures **operational capability** — an HR problem. The second measures **decision window** — a physics-of-the-domain problem. Only the second determines whether autonomous deployment is appropriate.

## Why This Matters

The framework asks: *can an AI agent handle this, or does it need a human?*

- If the decision window is **large** (days/weeks), there's no urgency for autonomy. A human can review. The question of agent deployment is about efficiency, not necessity.
- If the decision window is **small** (seconds/minutes), a human physically cannot be in the loop. The agent either acts autonomously or the opportunity/threat passes. This is where autonomy becomes a design requirement, not a preference.
- If the decision window is **zero** (real-time), human override is impossible. The agent must be pre-authorized or the function can't be automated at all.

The current name "Human Override Latency" focuses on the human's response speed. Models interpret this as "can a human be reached?" and rate it B-C for most scenarios, since reaching a human always takes *some* time. The actual discriminating question is whether the situation *allows* that time.

## Evidence

All 3 tested models rate insurance-claims and cross-border-model as B-C on this dimension (human takes hours/days to reach). The reference rates them D (no time pressure — decision can wait). The models are answering "how long does it take to get a human?" The reference is answering "does this need to happen fast?"

| Scenario | Reference | Arcee | Hunter | Healer | Situation |
|---|---|---|---|---|---|
| insurance-claims | D | C,C,C | B,B,A | B,C,B | No deadline on claim approval |
| banking-customer-service | D | C,D,C | C,B,B | C,D,B | Conversational, no urgency |
| algo-trading | A | C,A,A | B,A,A | B,A,A | Sub-second execution, damage accrues continuously |
| genai-data-leakage | C | C,C,C | B,B,B | B,C,B | Data hasn't left yet, agent can act before submission |
| claims-denial | C | C,C,C | B,A,B | B,B,B | 3-day reviewer turnaround, patient care continues |
| cross-border-model | D | C,C,B | C,C,B | C,C,C | Deployment can wait for legal review |

Models get algo-trading right (A) because the time pressure is extreme and explicit. They struggle with D (no pressure) because they default to rating operational response time instead.

## Proposed Change

### Rename the dimension

**From:** Human Override Latency
**To:** Decision Time Pressure

### Reframe the rubric levels

| Level | Current Label | Current Description | Proposed Label | Proposed Description |
|---|---|---|---|---|
| A | Override impossible in time | Decision window shorter than human response time | No time to decide | Situation demands immediate action — seconds or less. Human involvement is physically impossible. |
| B | Override difficult | Human available but response time creates risk | Hours, not days | Decision should be made within hours. Delay creates material risk but doesn't foreclose options. |
| C | Override straightforward | Human can intervene within normal workflows | Days are acceptable | Decision can wait days. Normal review workflows apply. Delay has minor operational cost. |
| D | No time pressure | Decision can wait indefinitely for human review | No deadline | Decision can wait weeks or indefinitely. No urgency. Time is not a factor in the autonomy question. |

### Key shift

The old framing asks: "How fast can a human override?" (operational capability)
The new framing asks: "How much time does the situation allow?" (domain constraint)

This makes the dimension about the **physics of the domain** rather than the **org chart of the company**. A trading desk with a 4-minute human response time doesn't change the fact that trades execute in sub-seconds.

## Impact

- Reference fingerprints stay the same — the levels were already assigned based on the intended meaning (time pressure), not the literal wording (response latency).
- Rubric text in `docs/framework.md` and `prompts/rubric.md` needs updating.
- Expect improved LLM accuracy on this dimension with clearer framing.
- Should be validated with domain expert review before implementation.

## Decision

Pending domain expert review. Present this reframing in the validation session and incorporate feedback before updating the rubric.
