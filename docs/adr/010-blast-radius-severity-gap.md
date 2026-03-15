# ADR 010: Failure Blast Radius — Severity Gap

**Date:** 2026-03-15
**Status:** Proposed

## Context

The Failure Blast Radius dimension currently measures **breadth of impact** — how many users, accounts, or markets are affected if the agent is wrong. This works for financial services, where "systemic" means market contagion (Knight Capital disrupting 154 stocks, a surveillance halt freezing trading for all participants).

But the framework has no way to express **severity of impact** — how bad the outcome is for each affected person. Under the current rubric, a batch processing error affecting 50 accounts (Level B) outranks an AI decision that kills a patient (Level C, single-customer). That's the wrong ordering.

## The Problem

The current A/B boundary is about contagion:

| Level | Current definition | What it captures |
|---|---|---|
| A | Systemic — many users/markets | Failure propagates beyond your customers into shared infrastructure |
| B | Multi-customer | Multiple customers affected but failure stays within your relationships |
| C | Single-customer | One person affected |
| D | Internal/test | No external impact |

This works when all outcomes are financial. It breaks when outcomes include death, serious injury, or irreversible health harm. Examples the current rubric misclassifies:

- **Hospital AI escalation agent** decides not to escalate a deteriorating patient → patient dies. Current rating: C (single customer). Should be: A (hard gate — human oversight required).
- **Drug interaction checker** misses a lethal combination for one patient → current: C. Should be: A.
- **Autonomous vehicle fleet** makes a routing decision that causes an accident → one pedestrian harmed. Current: C. Should be: A.
- **Insurance claims denial** delays rehabilitation for an elderly patient who deteriorates → current: C. This is the closest scenario in our starter set, and it's already a borderline case.

## Evidence from Existing Scenarios

Only 2 of 13 scenarios rate Blast Radius = A:

| Scenario | Blast Radius | Why A? |
|---|---|---|
| algo-trading-deployment-001 | A | 80+ equities, market-wide impact, all participants affected |
| capital-markets-surveillance-001 | A | Potential market-wide trading halt |

Both are A because of **contagion into shared systems**, not because of severity to individuals. No scenario in the starter set involves direct risk to human life.

## Proposed Change

Add severity as an alternative path to Level A:

| Level | Current | Proposed |
|---|---|---|
| A | Systemic — many users/markets | Systemic impact **OR** risk of death or serious irreversible harm to any person |
| B | Multi-customer | Group of customers affected, no life-safety risk |
| C | Single-customer | One person affected, no life-safety risk |
| D | Internal/test | No external impact |

The **OR** is the key change. It means:
- A financial decision affecting 1 million accounts → A (breadth)
- A medical decision that could kill 1 patient → A (severity)
- A billing error affecting 1 customer → C (neither breadth nor severity)

This mirrors how other safety-critical domains handle it. Aviation doesn't rate a single-fatality crash as "contained to one passenger" — any potential fatality triggers the highest level of review.

## Impact on the Framework

- **Hard gate behavior:** Blast Radius = A triggers "human oversight required." Adding severity to Level A means any life-safety decision automatically requires human oversight. This is the correct outcome.
- **Existing scenarios:** No change to current ratings. All existing A ratings are breadth-based. No existing scenario involves life-safety risk.
- **New scenarios needed:** The starter set should include at least one scenario with direct life-safety implications to test this dimension properly. Candidates:
  - Hospital patient escalation (AI triage)
  - Insurance prior authorization for urgent medical procedure
  - Autonomous vehicle fleet management
  - Workplace safety monitoring (construction, mining)

## Interaction with Decision Time Pressure

ADR 009 established that Decision Time Pressure adopts a harm-weighted perspective when human life is at risk during delay. This ADR extends the same principle to Blast Radius: when human life is at risk from the agent's decision, the severity dominates the breadth measure.

The two dimensions interact:
- **Decision Time Pressure = A** + **Blast Radius = A (severity)**: The worst case. No time for humans AND someone could die. Only pre-programmed deterministic safety systems can operate here (e.g., automated drug interaction blockers, dead man's switches).
- **Decision Time Pressure = D** + **Blast Radius = A (severity)**: Plenty of time, but the stakes are lethal. Human-in-loop is both possible and required. (e.g., surgical AI recommending a procedure — no rush, but get it wrong and someone dies.)

## Decision

Pending domain expert review. This change should be validated before updating the rubric, particularly:
1. Does the "OR" framing create ambiguity in financial-services-only deployments?
2. Should severity be a separate dimension rather than folded into Blast Radius?
3. What healthcare/safety scenarios should be added to the starter set?
