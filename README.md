# ARA-Eval

**Agentic Readiness Assessment** — An open evaluation framework for determining when enterprises can safely deploy autonomous AI agents.

Developed by [IRAI Labs](https://irai.co) × [Digital Rain Technologies](https://digitalrain.studio) as part of the HKU MFFinTech capstone programme.

## What This Is

Most AI governance frameworks answer "should we use AI?" ARA answers a harder question: **"Under what conditions can we trust AI to act autonomously — without human approval?"**

The framework evaluates operational domains across 7 dimensions, producing a **risk fingerprint** — a pattern of level classifications (A–D) that preserves reasoning rather than collapsing it into a single score. Gating rules then determine readiness: which domains are ready now, which need prerequisites, which should stay human-in-loop.

## Repository Structure

```
docs/           # Framework specification, rubric definitions, gating rules
labs/           # Runnable Python labs for the eval pipeline
scenarios/      # Starter scenario library (JSON)
```

## The 7 Dimensions

| # | Dimension | Core Question |
|---|-----------|---------------|
| 01 | Decision Reversibility | Can the action be undone? |
| 02 | Failure Blast Radius | If the agent is wrong, how many people or dollars are affected? |
| 03 | Regulatory Exposure | Does this decision touch safety, privacy, or compliance? |
| 04 | Human Override Latency | How fast can a human intervene? Is that fast enough? |
| 05 | Data Confidence | Does the agent have enough signal to act? |
| 06 | Accountability Chain | When the agent acts, who is responsible? Can you audit the decision? |
| 07 | Graceful Degradation | When the agent fails, does it fail safely — or cascade? |

Each dimension uses a four-level classification (A–D) with narrative anchors:
- **Level A** — Highest risk / most restrictive
- **Level B** — Significant risk / requires safeguards
- **Level C** — Moderate risk / manageable with audit trails
- **Level D** — Low risk / suitable for autonomy

## Gating Rules

Certain dimensions override everything else — like aviation safety checklists:

- If **Regulatory Exposure = A** → autonomy not permitted
- If **Blast Radius = A** → human oversight required
- If **Reversibility ≥ C** AND **Blast Radius ≤ C** → autonomy possible with audit trail

## HK-Specific Context

The framework synthesizes international governance standards (NIST AI RMF, EU AI Act, Singapore Model AI Governance) with Hong Kong's unique regulatory landscape:

- HKMA GenAI Circular (Nov 2024)
- SFC Circular 24EC55 (Nov 2024)
- PCPD AI Framework (Jun 2024)
- Cross-border complexity: PIPL, GBA data flows, CAC algorithm registration

## Labs

See [`labs/`](labs/) for runnable evaluation exercises.

## Links

- [Capstone Proposal](https://digitalrain.studio/capstone)
- [Evaluation Methodology](https://digitalrain.studio/capstone/methodology)

## License

Framework and methodology: open.
Partner-specific data and findings: proprietary to each engagement.
