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

## Results After Reframing

Reran Arcee Trinity Lab 01 with updated rubric (2026-03-15). Compared dimension 4 old ("Human Override Latency") vs new ("Decision Time Pressure"):

| Scenario | Ref | Old rubric | New rubric | Verdict |
|---|---|---|---|---|
| algo-trading | A | C,A,A | **A,A,A** | Fixed — CO now correctly identifies sub-second window |
| banking-customer-service | D | C,D,C | C,**D,D** | Improved — two D's vs one |
| cross-border-model | D | C,C,B | C,C,**C** | Slight improvement |
| insurance-claims | D | C,C,C | C,B,B | Regression — CRO/Ops went stricter, still not D |
| claims-denial | C | C,C,C | B,B,C | Regression — CO/CRO went stricter |
| genai-data-leakage | C | C,C,C | C,C,B | Slight regression |

**The big win:** algo-trading went from 1/3 to 3/3 on Level A. The most safety-critical scenario is now correctly classified by all personalities.

**Open question:** The B/C boundary remains blurry. "Hours not days" vs "days are acceptable" is quantitative, but real scenarios have ambiguous time constraints (e.g., claims-denial: 3-day reviewer turnaround, but patient care continues during the wait — is the risk from delay about the patient or the process?). This may need domain expert input to resolve.

## Whose Clock Are You On?

The B/C boundary depends on **whose perspective** you measure delay from. Real cases illustrate this:

| Case | System operator's view | Affected party's view | Regulator's view |
|---|---|---|---|
| **UnitedHealth nH Predict** (claims-denial) | C — 3-day reviewer turnaround works fine | **B — patient health deteriorates during delay** (Gene Lokken's family paid $150K before he died) | B — delayed care creates liability |
| **Samsung ChatGPT leak** (DLP) | C — agent can block before submission | C — employee waits a few seconds | C — data hasn't left yet |
| **AIA AML screening** (insurance) | D — no deadline on screening | D — no immediate harm | D — failures went undetected 6 years |
| **Knight Capital** (algo-trading) | A — $10M/minute damage | A — market participants affected immediately | A — systemic risk |

For scenarios where **human life or wellbeing is at risk during the delay**, the affected party's perspective dominates. For scenarios where delay causes only operational inconvenience, the system operator's perspective is sufficient.

**Proposed principle:** When the affected party faces health, safety, or irreversible financial harm during the delay, rate Decision Time Pressure from their perspective. Otherwise, rate from the system operator's perspective.

This is intentionally opinionated — the framework serves risk governance, not process efficiency. The perspective choice may vary by vertical (healthcare vs banking vs insurance), which makes it a productive classroom discussion topic.

## Classroom Exercise: Perspective-Dependent Risk Classification

**Suggested assignment** (works for both MBA and undergraduate):

> For each of the following scenarios, rate Decision Time Pressure (A-D) from three perspectives:
>
> 1. **The system operator** (the company running the AI agent)
> 2. **The affected party** (the customer, patient, or market participant)
> 3. **The regulator** (the relevant supervisory authority)
>
> Then argue: which perspective should the framework adopt, and why? Does the answer change by industry?

This exercise surfaces the value judgment embedded in every risk framework — there is no "objective" rating, only a choice of whose interests to center. Students who discover this through the exercise understand governance frameworks more deeply than those who are told.

## Decision

Rubric updated 2026-03-15. JSON key remains `human_override_latency` for backward compatibility. The B/C boundary is perspective-dependent by design — the framework adopts a harm-weighted perspective where the affected party's experience dominates when health, safety, or irreversible harm is at risk during delay.
